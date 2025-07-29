import { BaseDataSourceClient } from '../BaseDataSourceClient';
import { ChannelSubscriber } from '../../channels/channelSubscriber';
import { 
  ProviderType, 
  DataMetadata, 
  SnapshotStats,
  DataSourceConfig 
} from '../interfaces';

// interface StompConfig extends DataSourceConfig {
//   websocketUrl: string;
//   listenerTopic: string;
//   requestMessage?: string;
//   requestBody?: string;
//   snapshotEndToken?: string;
//   snapshotTimeoutMs?: number;
// }

export class StompDataSourceClient extends BaseDataSourceClient {
  readonly type: ProviderType = 'stomp';
  
  private channel: ChannelSubscriber;
  private providerId: string;
  
  // Snapshot tracking
  private snapshotStartTime: number = 0;
  private snapshotRowCount: number = 0;
  private isReceivingSnapshot: boolean = false;
  private batchNumber: number = 0;
  
  // Refresh state
  private isRefreshing: boolean = false;
  
  constructor(providerId: string, config: DataSourceConfig) {
    super(config);
    
    this.providerId = providerId;
    this.channel = new ChannelSubscriber(`data-provider-${providerId}`);
  }
  
  async connect(): Promise<void> {
    try {
      this.emitStatusChange('connecting');
      
      // Connect to channel
      await this.channel.connect();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Emit connected status BEFORE starting message processor
      this.emitStatusChange('connected');
      
      // Start message processor
      await this.startMessageProcessor();
      
      // Request initial snapshot
      await this.requestSnapshot();
      
    } catch (error) {
      this.emitStatusChange('error');
      this.emitError(error as Error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    try {
      this.processingActive = false;
      
      // Unsubscribe from all events
      this.channel.removeAllListeners();
      
      // Disconnect channel
      await this.channel.disconnect();
      
      this.emitStatusChange('disconnected');
      
    } catch (error) {
      this.emitError(error as Error);
      throw error;
    }
  }
  
  async refresh(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }
    
    this.isRefreshing = true;
    
    try {
      // Reset state
      // Reset internal state
      this.snapshotStartTime = 0;
      this.snapshotRowCount = 0;
      this.isReceivingSnapshot = false;
      this.batchNumber = 0;
      this._mode = 'idle';
      
      // Send refresh request to provider
      await this.channel.request('refresh-request', {
        clientId: this.providerId,
        timestamp: Date.now()
      });
      
      // Refresh request sent
      
    } finally {
      this.isRefreshing = false;
    }
  }
  
  private setupEventHandlers(): void {
    // Subscribe to provider events
    this.channel.subscribe('status');
    this.channel.subscribe('data');
    this.channel.subscribe('snapshot-complete');
    this.channel.subscribe('refresh-starting');
    this.channel.subscribe('refresh-complete');
    
    // Handle status changes
    this.channel.on('status', (event: any) => {
      if (event.connected !== undefined) {
        this.emitStatusChange(event.connected ? 'connected' : 'disconnected');
      }
      if (event.error) {
        this.emitError(new Error(event.error));
      }
    });
    
    // Handle data events
    this.channel.on('data', (event: any) => {
      this.handleDataEvent(event);
    });
    
    // Handle snapshot complete
    this.channel.on('snapshot-complete', (event: any) => {
      this.handleSnapshotComplete(event);
    });
    
    // Handle refresh events
    this.channel.on('refresh-starting', () => {
      // Clear local data when provider starts refresh
      this._mode = 'idle';
      this.batchNumber = 0;
    });
    
    this.channel.on('refresh-complete', () => {
      // Refresh complete
    });
  }
  
  private handleDataEvent(event: any): void {
    if (!event || !event.data) {
      return;
    }
    
    const data = Array.isArray(event.data) ? event.data : [event.data];
    
    // Process data based on mode
    
    // Check if this is snapshot data
    if (this._mode === 'snapshot' || event.isSnapshot) {
      this.handleSnapshotData(data, event);
    } else {
      this.handleRealtimeData(data, event);
    }
  }
  
  private handleSnapshotData(data: any[], event: any): void {
    if (!this.isReceivingSnapshot) {
      this.isReceivingSnapshot = true;
      this.snapshotStartTime = Date.now();
      this.snapshotRowCount = 0;
      this.batchNumber = 0;
      this._mode = 'snapshot';
    }
    
    this.batchNumber++;
    this.snapshotRowCount += data.length;
    
    const metadata: DataMetadata = {
      isSnapshot: true,
      batchNumber: this.batchNumber,
      isFirstBatch: this.batchNumber === 1,
      totalRows: data.length
    };
    
    // Check for sequence information
    if (event.sequence !== undefined) {
      metadata.sequence = event.sequence;
    }
    
    this.enqueueMessage(data, metadata);
  }
  
  private handleRealtimeData(data: any[], event: any): void {
    const metadata: DataMetadata = {
      isSnapshot: false,
      timestamp: event.timestamp || Date.now()
    };
    
    if (event.sequence !== undefined) {
      metadata.sequence = event.sequence;
    }
    
    this.enqueueMessage(data, metadata);
  }
  
  private handleSnapshotComplete(event: any): void {
    if (!this.isReceivingSnapshot) {
      return;
    }
    
    const duration = Date.now() - this.snapshotStartTime;
    
    const stats: SnapshotStats = {
      rowCount: event.rowCount || this.snapshotRowCount,
      duration: event.duration || duration,
      completedAt: Date.now()
    };
    
    this.isReceivingSnapshot = false;
    this._mode = 'realtime';
    
    this.emitSnapshotComplete(stats);
  }
  
  private async requestSnapshot(): Promise<void> {
    try {
      this._mode = 'snapshot';
      this.batchNumber = 0;
      
      // Send snapshot request to provider using the correct handler name
      await this.channel.request('getSnapshot', {
        clientId: this.providerId,
        timestamp: Date.now()
      });
      
      // Snapshot request sent
      
    } catch (error) {
      this.emitError(error as Error);
      throw error;
    }
  }
  
  // Override backpressure handlers
  protected onBackpressureApplied(): void {
    // Could notify provider to slow down if supported
  }
  
  protected onBackpressureReleased(): void {
    // Could notify provider to resume normal speed
  }
  
  getStatistics(): any {
    const baseStats = super.getStatistics();
    
    return {
      ...baseStats,
      providerId: this.providerId,
      channelConnected: this.channel.isConnected(),
      snapshotStats: {
        isReceiving: this.isReceivingSnapshot,
        batchNumber: this.batchNumber,
        rowCount: this.snapshotRowCount
      }
    };
  }
}