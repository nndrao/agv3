import { EventEmitter } from 'events';
import { 
  IDataSourceClient, 
  ConnectionStatus, 
  DataSourceMode, 
  ProviderType, 
  DataMetadata, 
  SnapshotStats,
  DataMessage 
} from './interfaces';
// Removed unused imports for RingBuffer, SequenceTracker, and PerformanceMonitor

export abstract class BaseDataSourceClient extends EventEmitter implements IDataSourceClient {
  // Abstract properties to be implemented by subclasses
  abstract readonly type: ProviderType;
  
  // Common properties
  protected _keyColumn: string = 'id';
  protected _mode: DataSourceMode = 'idle';
  protected _isConnected: boolean = false;
  protected _connectionStatus: ConnectionStatus = 'disconnected';
  
  // Processing state
  protected processingActive: boolean = false;
  protected processingPaused: boolean = false;
  protected sequenceNumber: number = 0;
  
  // Backpressure
  protected backpressureThreshold: number = 0.8; // 80% full
  protected backpressureActive: boolean = false;
  
  // Event handlers storage
  private dataHandlers: Array<(data: any[], metadata: DataMetadata) => void> = [];
  private statusHandlers: Array<(status: ConnectionStatus) => void> = [];
  private snapshotCompleteHandlers: Array<(stats: SnapshotStats) => void> = [];
  private errorHandlers: Array<(error: Error) => void> = [];
  
  constructor(config: any) {
    super();
    
    this._keyColumn = config.keyColumn || 'id';
  }
  
  // Getters
  get keyColumn(): string {
    return this._keyColumn;
  }
  
  get isConnected(): boolean {
    return this._isConnected;
  }
  
  get mode(): DataSourceMode {
    return this._mode;
  }
  
  // Abstract methods to be implemented by subclasses
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract refresh(): Promise<void>;
  
  // Event registration methods
  onData(handler: (data: any[], metadata: DataMetadata) => void): () => void {
    this.dataHandlers.push(handler);
    return () => {
      const index = this.dataHandlers.indexOf(handler);
      if (index > -1) {
        this.dataHandlers.splice(index, 1);
      }
    };
  }
  
  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.push(handler);
    return () => {
      const index = this.statusHandlers.indexOf(handler);
      if (index > -1) {
        this.statusHandlers.splice(index, 1);
      }
    };
  }
  
  onSnapshotComplete(handler: (stats: SnapshotStats) => void): () => void {
    this.snapshotCompleteHandlers.push(handler);
    return () => {
      const index = this.snapshotCompleteHandlers.indexOf(handler);
      if (index > -1) {
        this.snapshotCompleteHandlers.splice(index, 1);
      }
    };
  }
  
  onError(handler: (error: Error) => void): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }
  
  // Protected methods for subclasses
  
  protected enqueueMessage(data: any[], metadata: DataMetadata): void {
    // Process message directly without queuing
    this.emitData(data, metadata);
  }
  
  protected async startMessageProcessor(): Promise<void> {
    // No longer needed - processing messages directly
  }
  
  // private async processMessages(): Promise<void> {
  //   // No longer needed - processing messages directly
  // }
  
  protected async processBatch(_messages: DataMessage[]): Promise<void> {
    // No longer needed - processing messages directly
  }
  
  protected handleFailedMessage(_message: DataMessage, error: Error): void {
    this.emitError(new Error(`Message processing failed: ${error.message}`));
  }
  
  protected applyBackpressure(): void {
    if (!this.backpressureActive) {
      this.backpressureActive = true;
      this.processingPaused = true;
      
      // Notify subclass to slow down
      this.onBackpressureApplied();
    }
  }
  
  protected releaseBackpressure(): void {
    if (this.backpressureActive) {
      this.backpressureActive = false;
      this.processingPaused = false;
      
      // Notify subclass to resume normal operation
      this.onBackpressureReleased();
    }
  }
  
  // Hooks for subclasses
  protected onBackpressureApplied(): void {
    // Override in subclass if needed
  }
  
  protected onBackpressureReleased(): void {
    // Override in subclass if needed
  }
  
  // Event emission helpers
  protected emitData(data: any[], metadata: DataMetadata): void {
    for (const handler of this.dataHandlers) {
      try {
        handler(data, metadata);
      } catch (error) {
        // Error in data handler
      }
    }
  }
  
  protected emitStatusChange(status: ConnectionStatus): void {
    this._connectionStatus = status;
    this._isConnected = status === 'connected';
    
    for (const handler of this.statusHandlers) {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in status handler:', error);
      }
    }
  }
  
  protected emitSnapshotComplete(stats: SnapshotStats): void {
    this._mode = 'realtime';
    
    for (const handler of this.snapshotCompleteHandlers) {
      try {
        handler(stats);
      } catch (error) {
        console.error('Error in snapshot complete handler:', error);
      }
    }
  }
  
  protected emitError(error: Error): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    }
  }
  
  // Utility methods
  protected wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getStatistics(): any {
    return {
      connectionStatus: this._connectionStatus,
      mode: this._mode,
      backpressureActive: this.backpressureActive
    };
  }
}