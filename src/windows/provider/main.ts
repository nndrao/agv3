import { StompDatasourceProvider } from '../../providers/StompDatasourceProvider';
import { ChannelPublisher } from '../../services/channels/channelPublisher';
import { StorageClient } from '../../services/storage/storageClient';
import { ConflatedDataStore } from '../../services/datasource/ConflatedDataStore';
import { IMessage } from '@stomp/stompjs';

class HeadlessProvider {
  private provider!: StompDatasourceProvider;
  private publisher!: ChannelPublisher;
  private config: any;
  private providerId!: string;
  private snapshot: any[] = [];
  private statistics: any = {};
  private startTime: number = Date.now();
  private conflatedStore: ConflatedDataStore<any> | null = null;
  
  async initialize() {
    console.log('🚀 Initializing headless provider...');
    console.log('Window location:', window.location.href);
    
    try {
      // Get config from window options
      const options = await fin.Window.getCurrentSync().getOptions();
      console.log('Window options:', options);
      this.providerId = options.customData?.providerId;
      this.config = options.customData?.config;
      
      if (!this.providerId || !this.config) {
        console.error('Missing data:', { providerId: this.providerId, config: this.config });
        throw new Error('Missing provider ID or configuration');
      }
      
      console.log('📋 Provider ID:', this.providerId);
      console.log('📋 Provider config loaded, fields:', Object.keys(this.config).length);
      
      // Check OpenFin API availability
      console.log('🔍 Checking OpenFin API...');
      console.log('fin available:', typeof fin !== 'undefined');
      console.log('fin.InterApplicationBus:', typeof fin?.InterApplicationBus);
      console.log('fin.InterApplicationBus.Channel:', typeof fin?.InterApplicationBus?.Channel);
      
      // Create channel for this provider
      const channelName = `data-provider-${this.providerId}`;
      console.log('📢 About to create channel:', channelName);
      
      // Check if channel already exists and destroy it first
      try {
        console.log('Checking for existing channel...');
        // Add a timeout to prevent hanging
        const connectPromise = fin.InterApplicationBus.Channel.connect(channelName);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Channel check timeout')), 2000)
        );
        
        const existingChannel = await Promise.race([connectPromise, timeoutPromise]);
        console.log('Found existing channel, disconnecting...');
        await existingChannel.disconnect();
      } catch (e: any) {
        // Channel doesn't exist, that's fine
        console.log('No existing channel found (this is normal):', e.message || e);
      }
      
      try {
        console.log('Creating channel publisher...');
        this.publisher = new ChannelPublisher(channelName);
        console.log('Publisher instance created, initializing...');
        await this.publisher.initialize();
        console.log('✅ Channel created:', channelName);
      } catch (error) {
        console.error('❌ Failed to create channel:', error);
        throw error;
      }
      
      // Verify channel is working
      try {
        console.log('Verifying channel...');
        const testClient = await fin.InterApplicationBus.Channel.connect(channelName);
        console.log('✅ Channel verified - successfully connected');
        await testClient.disconnect();
      } catch (error) {
        console.error('❌ Channel verification failed:', error);
      }
      
      // Register control handlers FIRST (including getSnapshot handler)
      await this.registerControlHandlers();
      
      // Start provider (which will set up event handlers)
      await this.start();
      
      // Update UI
      document.getElementById('status')!.textContent = `Provider ${this.providerId} running`;
      
      // Send initialization complete status
      await this.publisher.publish('status', {
        type: 'initialized',
        providerId: this.providerId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize provider:', error);
      document.getElementById('status')!.textContent = 'Provider initialization failed';
      throw error;
    }
  }
  
  private setupEventHandlers() {
    if (!this.provider) return;
    
    // Handle connection events
    this.provider.on('connected', () => {
      console.log('✅ Provider connected');
      this.publisher.publish('status', {
        type: 'connected',
        timestamp: new Date().toISOString()
      });
    });
    
    this.provider.on('disconnected', () => {
      console.log('🔌 Provider disconnected');
      this.publisher.publish('status', {
        type: 'disconnected',
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle snapshot lifecycle events
    this.provider.on('REQUESTING_SNAPSHOT_DATA', async () => {
      console.log('📋 Provider emitted REQUESTING_SNAPSHOT_DATA');
      await this.publisher.publish('REQUESTING_SNAPSHOT_DATA', {});
    });
    
    this.provider.on('SNAPSHOT_COMPLETE', async (data: any) => {
      console.log('✅ Provider emitted SNAPSHOT_COMPLETE:', data);
      await this.publisher.publish('SNAPSHOT_COMPLETE', data);
    });
    
    // Handle real-time updates - these come after snapshot completes
    this.provider.on('realtime-update', async (updates: any[]) => {
      console.log(`🔄 Real-time update from provider: ${updates.length} rows`);
      
      // Feed updates through the conflated store
      if (this.conflatedStore) {
        updates.forEach(update => {
          this.conflatedStore!.addUpdate({
            data: update,
            operation: 'update',
            timestamp: Date.now()
          });
        });
      } else {
        console.error('ConflatedStore not initialized, dropping updates');
      }
    });
    
    // Handle snapshot batch updates
    this.provider.on('update', async (updates: any[]) => {
      console.log(`📦 Snapshot batch update from provider: ${updates.length} rows`);
      // Snapshot updates are handled differently - they're sent directly during fetchSnapshot
    });
    
    // Handle errors
    this.provider.on('error', async (error: Error) => {
      console.error('❌ Provider error:', error);
      await this.publisher.publish('error', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  private async startDataCollection() {
    console.log('📊 Starting data collection...');
    
    // Don't fetch snapshot here - wait for getSnapshot request
    // Just initialize the ConflatedDataStore
    
    try {
      // Initialize ConflatedDataStore if we have a keyColumn
      if (this.config.keyColumn) {
        console.log('🔧 Initializing ConflatedDataStore with keyColumn:', this.config.keyColumn);
        this.conflatedStore = new ConflatedDataStore(this.config.keyColumn, {
          windowMs: 100, // Batch updates for 100ms
          maxBatchSize: 1000,
          enableMetrics: true
        });
        
        // Listen for conflated updates
        this.conflatedStore.on('updates', async (updates: any[]) => {
          console.log(`📦 Publishing ${updates.length} conflated real-time updates`);
          
          // Update local snapshot
          updates.forEach(update => {
            const key = update.data[this.config.keyColumn];
            if (key) {
              const index = this.snapshot.findIndex(
                (row: any) => row[this.config.keyColumn] === key
              );
              if (index >= 0) {
                this.snapshot[index] = update.data;
              } else if (update.operation === 'add') {
                this.snapshot.push(update.data);
              }
            }
          });
          
          // Publish real-time updates with 'realtime-update' event
          await this.publisher.publish('realtime-update', {
            updates: updates.map(u => u.data),
            timestamp: new Date().toISOString()
          });
          
          // Update statistics
          this.updateStatistics(updates.length);
        });
        
        // Listen for metrics updates
        this.conflatedStore.on('metrics', (metrics: any) => {
          console.log('📊 Conflation metrics:', {
            totalReceived: metrics.totalUpdatesReceived,
            applied: metrics.updatesApplied,
            conflated: metrics.updatesConflated,
            conflationRate: metrics.conflationRate + '%'
          });
        });
      } else {
        console.warn('⚠️ No keyColumn configured, ConflatedDataStore disabled');
      }
      
      console.log('✅ Provider ready to receive snapshot request');
    } catch (error) {
      console.error('Error in startDataCollection:', error);
      throw error;
    }
  }
  
  // Removed - now using provider.subscribeToRealtimeUpdates() instead
  
  private updateStatistics(updateCount: number) {
    if (!this.statistics) {
      this.statistics = {
        messageCount: 0,
        snapshotSize: this.snapshot.length,
        uptime: Date.now() - this.startTime,
        lastMessageTime: new Date()
      };
    }
    
    this.statistics.messageCount += updateCount;
    this.statistics.lastMessageTime = new Date();
    this.statistics.uptime = Date.now() - this.startTime;
    
    // Publish statistics periodically
    this.publisher.publish('statistics', this.statistics);
  }
  
  private async registerControlHandlers() {
    // Handle control commands
    this.publisher.registerHandler('control', async (command: any) => {
      console.log('📨 Control command:', command);
      
      switch (command.action) {
        case 'start':
          return await this.start();
        case 'stop':
          return await this.stop();
        case 'restart':
          return await this.restart();
        case 'getStatus':
          return this.getStatus();
        default:
          throw new Error(`Unknown command: ${command.action}`);
      }
    });
    
    // Handle snapshot requests - triggers a fresh snapshot fetch
    this.publisher.registerHandler('getSnapshot', async () => {
      console.log('📸 Snapshot requested from DataTable');
      
      // If provider is initialized and connected, fetch a fresh snapshot
      if (this.provider && this.provider.getIsConnected()) {
        console.log('Provider connected, fetching snapshot...');
        
        try {
          // Clear existing snapshot data
          this.snapshot = [];
          let previousLength = 0;
          
          // Fetch new snapshot
          const snapshotResult = await this.provider.fetchSnapshot(10000, async (batch, totalRows) => {
            console.log(`📦 Snapshot batch received: ${batch.length} rows, total so far: ${totalRows}`);
            
            // Store the entire accumulated data
            this.snapshot = batch;
            
            // Send only the new items in this batch
            const newItems = batch.slice(previousLength);
            previousLength = batch.length;
            
            if (newItems.length > 0) {
              console.log(`📤 Publishing ${newItems.length} new items as update event`);
              // Publish update event for snapshot data
              await this.publisher.publish('update', {
                updates: newItems,
                timestamp: new Date().toISOString()
              });
            }
          });
          
          console.log('Snapshot fetch completed:', {
            success: snapshotResult.success,
            totalRows: this.snapshot.length,
            error: snapshotResult.error
          });
          
          // Set snapshot in ConflatedDataStore for real-time updates
          if (this.conflatedStore && snapshotResult.success) {
            this.conflatedStore.setSnapshot(this.snapshot);
            console.log('✅ ConflatedDataStore initialized with snapshot data');
          }
          
          return {
            acknowledged: true,
            success: snapshotResult.success,
            rowCount: this.snapshot.length,
            error: snapshotResult.error,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error fetching snapshot:', error);
          return {
            acknowledged: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          };
        }
      } else {
        console.log('Provider not connected, returning error');
        return {
          acknowledged: false,
          error: 'Provider not connected',
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // Handle statistics requests
    this.publisher.registerHandler('getStatistics', async () => {
      return this.provider.getStatistics();
    });
  }
  
  private async start() {
    try {
      console.log('▶️ Starting provider...');
      console.log('Config type check:', {
        hasWebsocketUrl: !!this.config.websocketUrl,
        hasListenerTopic: !!this.config.listenerTopic,
        config: this.config
      });
      
      // Check if this is the new StompConfig format or old StompProviderConfig
      if (this.config.websocketUrl && this.config.listenerTopic) {
        console.log('Using new StompConfig format');
        console.log('Request configuration:', {
          requestMessage: this.config.requestMessage,
          requestBody: this.config.requestBody,
          listenerTopic: this.config.listenerTopic
        });
        
        // New format - use the StompConfig constructor and methods
        this.provider = new StompDatasourceProvider(this.config);
        
        // Setup event handlers BEFORE connecting and starting data collection
        this.setupEventHandlers();
        
        console.log('Provider created, connecting...');
        try {
          await this.provider.connect();
          console.log('Connected! Starting data collection...');
          
          // Start listening for data
          await this.startDataCollection();
        } catch (connectError) {
          console.error('Failed to connect to STOMP server:', connectError);
          console.error('Config:', this.config);
          throw new Error(`STOMP connection failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
        }
      } else {
        console.log('Using old StompProviderConfig format');
        // Old format - use the legacy start method
        await this.provider.start(this.config);
      }
      
      await this.updateStatus('running');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to start provider:', error);
      await this.updateStatus('error', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  private async stop() {
    console.log('⏹️ Stopping provider...');
    
    // Clean up ConflatedDataStore
    if (this.conflatedStore) {
      this.conflatedStore.destroy();
      this.conflatedStore = null;
    }
    
    if (this.provider) {
      this.provider.disconnect();
    }
    await this.updateStatus('stopped');
    return { success: true };
  }
  
  private async restart() {
    console.log('🔄 Restarting provider...');
    await this.stop();
    await this.start();
    return { success: true };
  }
  
  private getStatus() {
    return {
      providerId: this.providerId,
      status: this.provider?.getStatus ? this.provider.getStatus() : { connected: !!(this.provider as any)?.isConnected },
      statistics: this.statistics,
      config: this.config
    };
  }
  
  private async updateStatus(status: string, error?: string) {
    // Update status in storage
    try {
      const configId = this.config.configId || this.config.id;
      if (configId) {
        const existingConfig = await StorageClient.get(configId);
        if (existingConfig) {
          await StorageClient.update(configId, {
            config: {
              ...existingConfig.config,
              status: status,
              lastError: error,
              lastStatusUpdate: new Date().toISOString()
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to update status in storage:', err);
    }
  }
}

// Global variable to prevent double initialization
let providerInstance: HeadlessProvider | null = null;
let initializationStarted = false;

async function initializeProvider() {
  if (initializationStarted) {
    console.log('Provider initialization already started, skipping duplicate initialization');
    return;
  }
  
  initializationStarted = true;
  console.log('=== INITIALIZING PROVIDER ===');
  console.log('Window name:', fin.me.name);
  console.log('Window UUID:', fin.me.uuid);
  
  try {
    providerInstance = new HeadlessProvider();
    await providerInstance.initialize();
    console.log('✅ Provider initialization complete');
  } catch (error) {
    console.error('❌ FATAL: Provider initialization failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    if (document.getElementById('status')) {
      document.getElementById('status')!.textContent = `Error: ${error}`;
    }
    initializationStarted = false; // Reset on error
  }
}

// Initialize when window loads
window.addEventListener('DOMContentLoaded', async () => {
  console.log('=== PROVIDER WINDOW LOADED (DOMContentLoaded) ===');
  await initializeProvider();
});

// Also try immediate execution
console.log('=== PROVIDER SCRIPT LOADED ===');
console.log('Script execution time:', new Date().toISOString());
console.log('Current URL:', window.location.href);

// Try to initialize immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('DOM already loaded, initializing immediately...');
  initializeProvider().catch(error => {
    console.error('Immediate initialization failed:', error);
  });
}

// Handle window close
window.addEventListener('beforeunload', () => {
  console.log('👋 Provider window closing...');
});

// Log any unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error in provider window:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in provider window:', event.reason);
});