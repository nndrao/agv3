import { EventEmitter } from 'events';
import { Client, StompConfig as StompClientConfig, IMessage } from '@stomp/stompjs';
import { IDataSourceProvider, DataSourceMode, ProviderType } from '../services/datasource/interfaces';

export interface StompConfig {
  websocketUrl: string;
  listenerTopic: string;
  requestMessage?: string;
  requestBody?: string;
  snapshotEndToken?: string;
  keyColumn?: string;
  messageRate?: string;
  snapshotTimeoutMs?: number;
}

interface StompProviderConfig {
  id: string;
  name: string;
  httpUrl?: string;
  websocketUrl?: string;
  topic: string;
  username?: string;
  password?: string;
  heartbeatInterval: number;
  reconnectInterval: number;
  batchSize: number;
  conflationWindow: number;
  keyColumn: string;
}

export class StompDatasourceProviderSimplified extends EventEmitter implements IDataSourceProvider {
  readonly type: ProviderType = 'stomp';
  
  private client: Client | null = null;
  private config: StompProviderConfig | null = null;
  private stompConfig: StompConfig | null = null;
  
  // Cache for snapshot data
  private snapshotCache: Map<string, any> = new Map();
  private _mode: DataSourceMode = 'idle';
  
  // Batching
  private batchBuffer: any[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 1000;
  private readonly BATCH_TIMEOUT = 50;
  
  // Statistics
  private snapshotStartTime: number = 0;
  private snapshotRowCount: number = 0;
  
  // Removed conflation - emit real-time updates immediately
  private sequenceNumber: number = 0;
  
  // Refresh handling
  private isRefreshing: boolean = false;
  
  get id(): string {
    return this.config?.id || '';
  }
  
  get mode(): DataSourceMode {
    return this._mode;
  }
  
  constructor() {
    super();
  }
  
  async start(): Promise<void> {
    if (this.client?.connected) {
      console.log('Already connected');
      return;
    }
    
    await this.connect();
  }
  
  async stop(): Promise<void> {
    this.disconnect();
  }
  
  initialize(config: StompProviderConfig | StompConfig): void {
    if ('id' in config) {
      this.config = config as StompProviderConfig;
    } else {
      this.stompConfig = config as StompConfig;
      this.config = {
        id: 'stomp-provider',
        name: 'STOMP Provider',
        websocketUrl: config.websocketUrl,
        topic: config.listenerTopic,
        heartbeatInterval: 30000,
        reconnectInterval: 5000,
        batchSize: 1000,
        conflationWindow: 100,
        keyColumn: config.keyColumn || 'id'
      };
    }
  }
  
  private async connect(): Promise<void> {
    const url = this.config?.websocketUrl || this.stompConfig?.websocketUrl;
    if (!url) {
      throw new Error('WebSocket URL not configured');
    }
    
    const stompConfig: StompClientConfig = {
      brokerURL: url,
      heartbeatIncoming: this.config?.heartbeatInterval || 30000,
      heartbeatOutgoing: this.config?.heartbeatInterval || 30000,
      reconnectDelay: this.config?.reconnectInterval || 5000,
      
      onConnect: (frame) => {
        console.log('✅ STOMP connected:', frame);
        
        // Emit status event
        this.emit('status', { 
          connected: true, 
          error: null 
        });
        
        // Subscribe to topic
        this.subscribeToTopic();
      },
      
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame);
        const error = new Error(frame.headers['message'] || 'Unknown STOMP error');
        
        this.emit('status', { 
          connected: false, 
          error 
        });
      },
      
      onWebSocketError: (event) => {
        console.error('❌ WebSocket error:', event);
        const error = new Error('WebSocket connection failed');
        
        this.emit('status', { 
          connected: false, 
          error 
        });
      },
      
      onDisconnect: () => {
        console.log('🔌 STOMP disconnected');
        
        this.emit('status', { 
          connected: false, 
          error: null 
        });
      }
    };
    
    this.client = new Client(stompConfig);
    this.client.activate();
  }
  
  private disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.batchBuffer = [];
    this._mode = 'idle';
  }
  
  private subscribeToTopic(): void {
    if (!this.client?.connected) return;
    
    const topic = this.stompConfig?.listenerTopic || this.config?.topic;
    if (!topic) {
      console.error('No topic configured');
      return;
    }
    
    console.log(`📡 Subscribing to topic: ${topic}`);
    
    this.client.subscribe(topic, (message: IMessage) => {
      this.processMessage(message);
    });
  }
  
  private processMessage(message: IMessage): void {
    try {
      const messageBody = message.body;
      // const byteSize = new Blob([messageBody]).size;
      
      // Log every message in realtime mode
      if (this._mode === 'realtime') {
        console.log(`📨 STOMP message in realtime mode: ${messageBody.substring(0, 100)}...`);
      }
      
      // Check for end token
      if (this.isEndToken(messageBody)) {
        this.handleSnapshotComplete();
        return;
      }
      
      // Parse message
      const data = this.parseMessage(messageBody);
      if (!data || data.length === 0) return;
      
      // Process based on mode
      if (this._mode === 'snapshot') {
        this.handleSnapshotData(data);
      } else if (this._mode === 'realtime') {
        console.log(`🔄 Processing real-time STOMP data: ${data.length} items`);
        this.handleRealtimeData(data);
      } else {
        console.warn(`⚠️ Received data in unexpected mode: ${this._mode}`);
      }
      
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  }
  
  private isEndToken(messageBody: string): boolean {
    const endToken = this.stompConfig?.snapshotEndToken;
    if (!endToken) return false;
    
    return messageBody.toLowerCase().includes(endToken.toLowerCase());
  }
  
  private parseMessage(messageBody: string): any[] {
    try {
      const parsed = JSON.parse(messageBody);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  
  private handleSnapshotData(data: any[]): void {
    // Update cache
    const keyColumn = this.stompConfig?.keyColumn || this.config?.keyColumn || 'id';
    data.forEach(row => {
      const key = row[keyColumn];
      if (key !== undefined) {
        this.snapshotCache.set(String(key), row);
      }
    });
    
    this.snapshotRowCount += data.length;
    
    // Add to batch
    this.batchBuffer.push(...data);
    
    // Flush if batch is large enough
    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      this.flushBatch();
    } else {
      this.scheduleBatchFlush();
    }
  }
  
  private handleRealtimeData(data: any[]): void {
    // Update cache
    const keyColumn = this.stompConfig?.keyColumn || this.config?.keyColumn || 'id';
    data.forEach(row => {
      const key = row[keyColumn];
      if (key !== undefined) {
        this.snapshotCache.set(String(key), row);
      }
    });
    
    // Emit immediately without conflation
    console.log(`🔄 Emitting ${data.length} real-time updates immediately`);
    this.emit('data', {
      data,
      isSnapshot: false,
      sequence: ++this.sequenceNumber,
      timestamp: Date.now()
    });
  }
  
  
  private handleSnapshotComplete(): void {
    // Flush any remaining batched data
    this.flushBatch();
    
    const duration = Date.now() - this.snapshotStartTime;
    
    // Emit snapshot complete event
    this.emit('snapshot-complete', {
      rowCount: this.snapshotRowCount,
      duration,
      cacheSize: this.snapshotCache.size
    });
    
    // Switch to realtime mode
    this._mode = 'realtime';
    console.log(`✅ Snapshot complete: ${this.snapshotRowCount} rows in ${duration}ms`);
    console.log(`📊 Mode switched to: ${this._mode}`);
    console.log(`🔄 Ready to receive real-time updates`);
  }
  
  private flushBatch(): void {
    if (this.batchBuffer.length === 0) return;
    
    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Emit batched data
    this.emit('data', {
      data: [...this.batchBuffer],
      isSnapshot: true,
      batchNumber: Math.floor(this.snapshotRowCount / this.BATCH_SIZE),
      isFirstBatch: this.snapshotRowCount === this.batchBuffer.length,
      sequence: ++this.sequenceNumber,
      timestamp: Date.now()
    });
    
    this.batchBuffer = [];
  }
  
  private scheduleBatchFlush(): void {
    if (this.batchTimer) return;
    
    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.BATCH_TIMEOUT);
  }
  
  async requestSnapshot(): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('Not connected');
    }
    
    // Reset state
    this._mode = 'snapshot';
    this.snapshotCache.clear();
    this.snapshotRowCount = 0;
    this.snapshotStartTime = Date.now();
    this.batchBuffer = [];
    
    // Send snapshot request if configured
    if (this.stompConfig?.requestMessage) {
      console.log(`📸 Sending snapshot request to ${this.stompConfig.requestMessage}`);
      
      this.client.publish({
        destination: this.stompConfig.requestMessage,
        body: this.stompConfig.requestBody || JSON.stringify({ 
          action: 'snapshot',
          timestamp: Date.now() 
        })
      });
    }
  }
  
  async refresh(): Promise<void> {
    if (this.isRefreshing) {
      console.log('Refresh already in progress');
      return;
    }
    
    this.isRefreshing = true;
    
    try {
      // Notify all clients to clear data
      this.emit('data', {
        data: [],
        isSnapshot: false,
        clearData: true,
        timestamp: Date.now()
      });
      
      // Request new snapshot
      await this.requestSnapshot();
      
    } finally {
      this.isRefreshing = false;
    }
  }
  
  getCachedData(): any[] {
    return Array.from(this.snapshotCache.values());
  }
  
  getCacheSize(): number {
    return this.snapshotCache.size;
  }
  
  getStatistics(): any {
    return {
      mode: this._mode,
      cacheSize: this.snapshotCache.size,
      connected: this.client?.connected || false,
      snapshotRowCount: this.snapshotRowCount,
      sequenceNumber: this.sequenceNumber
    };
  }
}