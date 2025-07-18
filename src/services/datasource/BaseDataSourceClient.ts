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
import { RingBuffer } from './utils/RingBuffer';
import { SequenceTracker } from './utils/SequenceTracker';
import { PerformanceMonitor } from './utils/PerformanceMonitor';

export abstract class BaseDataSourceClient extends EventEmitter implements IDataSourceClient {
  // Abstract properties to be implemented by subclasses
  abstract readonly type: ProviderType;
  
  // Common properties
  protected _keyColumn: string = 'id';
  protected _mode: DataSourceMode = 'idle';
  protected _isConnected: boolean = false;
  protected _connectionStatus: ConnectionStatus = 'disconnected';
  
  // Message handling
  protected messageQueue: RingBuffer<DataMessage>;
  protected sequenceTracker: SequenceTracker;
  protected performanceMonitor: PerformanceMonitor;
  
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
    
    // Initialize message queue with configurable size
    const queueSize = config.queueSize || 10000;
    this.messageQueue = new RingBuffer<DataMessage>(queueSize);
    
    // Initialize sequence tracker
    this.sequenceTracker = new SequenceTracker(1, {
      maxBufferSize: config.maxOutOfOrderBuffer || 1000,
      gapTimeout: config.gapTimeout || 5000
    });
    
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor();
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
    console.log('BaseDataSourceClient.enqueueMessage:', { 
      dataLength: data.length, 
      metadata,
      queueSize: this.messageQueue.getSize() 
    });
    
    const message: DataMessage = {
      sequence: ++this.sequenceNumber,
      data,
      metadata: {
        ...metadata,
        timestamp: metadata.timestamp || Date.now()
      },
      timestamp: Date.now(),
      attempts: 0
    };
    
    if (!this.messageQueue.push(message)) {
      // Buffer full - apply backpressure
      console.log('Message queue full, applying backpressure');
      this.applyBackpressure();
      
      // Try one more time after backpressure
      if (!this.messageQueue.push(message)) {
        console.error('Failed to push message even after backpressure');
        this.emitError(new Error('Message queue full - dropping message'));
      }
    } else {
      console.log('Message queued successfully, new queue size:', this.messageQueue.getSize());
    }
    
    // Check if we should release backpressure
    if (this.backpressureActive && this.messageQueue.getFillPercentage() < 50) {
      this.releaseBackpressure();
    }
  }
  
  protected async startMessageProcessor(): Promise<void> {
    if (this.processingActive) return;
    
    console.log('Starting message processor');
    this.processingActive = true;
    
    // Start the processing loop in the background
    this.processMessages();
  }
  
  private async processMessages(): Promise<void> {
    while (this.processingActive && this._isConnected) {
      if (this.processingPaused) {
        await this.wait(10);
        continue;
      }
      
      const startTime = Date.now();
      const messages: DataMessage[] = [];
      const batchSize = this.performanceMonitor.getSuggestedBatchSize();
      
      // Collect batch of messages
      while (messages.length < batchSize) {
        const message = this.messageQueue.pop();
        if (!message) break;
        messages.push(message);
      }
      
      if (messages.length === 0) {
        await this.wait(1);
        continue;
      }
      
      try {
        // Process messages in batch
        await this.processBatch(messages);
        
        // Record performance metrics
        this.performanceMonitor.recordProcessing(
          startTime,
          messages.length,
          this.messageQueue.getSize()
        );
      } catch (error) {
        console.error('Error processing message batch:', error);
        
        // Re-queue messages for retry
        for (const message of messages) {
          message.attempts++;
          if (message.attempts < 3) {
            this.messageQueue.pushFront(message);
          } else {
            this.handleFailedMessage(message, error as Error);
          }
        }
      }
    }
    
    this.processingActive = false;
  }
  
  protected async processBatch(messages: DataMessage[]): Promise<void> {
    console.log('BaseDataSourceClient.processBatch:', { 
      messageCount: messages.length,
      firstMessage: messages[0]
    });
    
    // Group messages by metadata type for efficient processing
    const snapshotMessages: DataMessage[] = [];
    const realtimeMessages: DataMessage[] = [];
    
    for (const message of messages) {
      if (message.metadata.isSnapshot) {
        snapshotMessages.push(message);
      } else {
        realtimeMessages.push(message);
      }
    }
    
    // Process snapshot messages
    if (snapshotMessages.length > 0) {
      const allData = snapshotMessages.flatMap(m => m.data);
      const metadata: DataMetadata = {
        isSnapshot: true,
        batchNumber: snapshotMessages[0].metadata.batchNumber,
        isFirstBatch: snapshotMessages[0].metadata.isFirstBatch,
        totalRows: allData.length
      };
      
      this.emitData(allData, metadata);
    }
    
    // Process realtime messages
    if (realtimeMessages.length > 0) {
      const allData = realtimeMessages.flatMap(m => m.data);
      const metadata: DataMetadata = {
        isSnapshot: false,
        timestamp: Date.now()
      };
      
      this.emitData(allData, metadata);
    }
  }
  
  protected handleFailedMessage(message: DataMessage, error: Error): void {
    console.error(`Failed to process message after ${message.attempts} attempts:`, error);
    this.emitError(new Error(`Message processing failed: ${error.message}`));
  }
  
  protected applyBackpressure(): void {
    if (!this.backpressureActive) {
      console.warn('Applying backpressure - message queue is filling up');
      this.backpressureActive = true;
      this.processingPaused = true;
      
      // Notify subclass to slow down
      this.onBackpressureApplied();
    }
  }
  
  protected releaseBackpressure(): void {
    if (this.backpressureActive) {
      console.log('Releasing backpressure - queue has space');
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
    console.log('BaseDataSourceClient.emitData:', { 
      dataLength: data.length, 
      metadata,
      handlerCount: this.dataHandlers.length 
    });
    
    for (const handler of this.dataHandlers) {
      try {
        handler(data, metadata);
      } catch (error) {
        console.error('Error in data handler:', error);
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
      queueSize: this.messageQueue.getSize(),
      queueCapacity: this.messageQueue.getCapacity(),
      queueFillPercentage: this.messageQueue.getFillPercentage(),
      backpressureActive: this.backpressureActive,
      performance: this.performanceMonitor.getStatistics(),
      sequenceTracker: this.sequenceTracker.getStatistics()
    };
  }
}