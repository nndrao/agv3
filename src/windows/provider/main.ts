import { StompDatasourceProviderSimplified } from '../../providers/StompDatasourceProviderSimplified';
import { ChannelPublisher } from '../../services/channels/channelPublisher';
import { StorageClient } from '../../services/storage/storageClient';
import { ConflatedDataStore } from '../../services/datasource/ConflatedDataStore';

class HeadlessProvider {
  private provider!: StompDatasourceProviderSimplified;
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
    
    // Handle status events (connected/disconnected)
    this.provider.on('status', async (status: any) => {
      console.log('📊 Provider status:', status);
      
      if (status.connected !== undefined) {
        await this.publisher.publish('status', {
          type: status.connected ? 'connected' : 'disconnected',
          connected: status.connected,
          error: status.error,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Handle data events (both snapshot and real-time)
    this.provider.on('data', async (event: any) => {
      const { data, isSnapshot, clearData } = event;
      
      if (clearData) {
        console.log('🧹 Clear data signal received');
        this.snapshot = [];
        return;
      }
      
      if (isSnapshot) {
        console.log(`📦 Snapshot batch: ${data.length} rows`);
        // During snapshot, accumulate data
        this.snapshot.push(...data);
        
        // Publish snapshot data
        await this.publisher.publish('data', {
          data,
          isSnapshot: true,
          timestamp: Date.now()
        });
      } else {
        console.log(`🔄 Real-time update: ${data.length} rows`);
        
        // Feed updates through the conflated store
        if (this.conflatedStore) {
          data.forEach((update: any) => {
            this.conflatedStore!.addUpdate({
              data: update,
              operation: 'update',
              timestamp: Date.now()
            });
          });
        } else {
          // If no conflated store, publish directly
          await this.publisher.publish('data', {
            data,
            isSnapshot: false,
            timestamp: Date.now()
          });
        }
      }
    });
    
    // Handle snapshot complete
    this.provider.on('snapshot-complete', async (stats: any) => {
      console.log('✅ Provider emitted snapshot-complete:', stats);
      await this.publisher.publish('snapshot-complete', stats);
      
      // Initialize ConflatedDataStore with snapshot data
      if (this.conflatedStore && this.snapshot.length > 0) {
        this.conflatedStore.setSnapshot(this.snapshot);
        console.log('✅ ConflatedDataStore initialized with snapshot data');
      }
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
    this.publisher.registerHandler('getSnapshot', async (request: any) => {
      console.log('📸 Snapshot requested from DataTable:', request);
      
      // Check if provider is initialized
      if (this.provider) {
        console.log('Provider exists, requesting snapshot...');
        
        try {
          // Clear existing snapshot data
          this.snapshot = [];
          
          // Request snapshot from simplified provider
          await this.provider.requestSnapshot();
          
          console.log('Snapshot request sent to provider');
          
          return {
            acknowledged: true,
            message: 'Snapshot request initiated',
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error requesting snapshot:', error);
          return {
            acknowledged: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          };
        }
      } else {
        console.log('Provider not initialized');
        return {
          acknowledged: false,
          error: 'Provider not initialized',
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // Handle refresh requests
    this.publisher.registerHandler('refresh-request', async () => {
      console.log('🔄 Refresh requested from client');
      
      if (this.provider) {
        try {
          await this.provider.refresh();
          return {
            acknowledged: true,
            message: 'Refresh initiated',
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error during refresh:', error);
          return {
            acknowledged: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          };
        }
      } else {
        return {
          acknowledged: false,
          error: 'Provider not initialized',
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
        hasWebSocketUrl: !!this.config.webSocketUrl,
        hasListenerTopic: !!this.config.listenerTopic,
        configKeys: Object.keys(this.config),
        config: this.config
      });
      
      // Check if this is the new StompConfig format or old StompProviderConfig
      if ((this.config.websocketUrl || this.config.webSocketUrl) && (this.config.listenerTopic || this.config.topic)) {
        console.log('Using new StompConfig format');
        console.log('Request configuration:', {
          requestMessage: this.config.requestMessage,
          requestBody: this.config.requestBody,
          listenerTopic: this.config.listenerTopic || this.config.topic
        });
        
        // Normalize configuration to handle field name variations
        const normalizedConfig = {
          websocketUrl: this.config.websocketUrl || this.config.webSocketUrl,
          listenerTopic: this.config.listenerTopic || this.config.topic,
          requestMessage: this.config.requestMessage,
          requestBody: this.config.requestBody,
          snapshotEndToken: this.config.snapshotEndToken,
          keyColumn: this.config.keyColumn,
          messageRate: this.config.messageRate,
          snapshotTimeoutMs: this.config.snapshotTimeoutMs
        };
        
        // New format - use the StompConfig constructor and methods
        this.provider = new StompDatasourceProviderSimplified();
        this.provider.initialize(normalizedConfig);
        
        // Setup event handlers BEFORE connecting and starting data collection
        this.setupEventHandlers();
        
        console.log('Provider created, starting...');
        try {
          await this.provider.start();
          console.log('Started! Starting data collection...');
          
          // Start listening for data
          await this.startDataCollection();
        } catch (connectError) {
          console.error('Failed to connect to STOMP server:', connectError);
          console.error('Config:', this.config);
          throw new Error(`STOMP connection failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
        }
      } else {
        console.log('Using old StompProviderConfig format');
        // Initialize with old format - still need to normalize
        this.provider = new StompDatasourceProviderSimplified();
        
        // The old format might also have field name variations
        const normalizedConfig = {
          id: this.config.id,
          name: this.config.name,
          webSocketUrl: this.config.webSocketUrl || this.config.websocketUrl,
          topic: this.config.topic || this.config.listenerTopic,
          username: this.config.username,
          password: this.config.password,
          heartbeatInterval: this.config.heartbeatInterval || 30000,
          reconnectInterval: this.config.reconnectInterval || 5000,
          batchSize: this.config.batchSize || 1000,
          conflationWindow: this.config.conflationWindow || 100,
          keyColumn: this.config.keyColumn || 'id'
        };
        
        this.provider.initialize(normalizedConfig);
        
        // Setup event handlers
        this.setupEventHandlers();
        
        await this.provider.start();
        await this.startDataCollection();
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
      await this.provider.stop();
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
      status: this.provider?.getStatistics ? this.provider.getStatistics() : { connected: false },
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