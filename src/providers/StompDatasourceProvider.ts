import { EventEmitter } from 'events';
import { Client, StompConfig as StompClientConfig, IMessage } from '@stomp/stompjs';
import { templateResolver } from '../services/template/templateResolver';
import { v4 as uuidv4 } from 'uuid';

export interface StompConnectionResult {
  success: boolean;
  data?: any[];
  error?: string;
  statistics?: StompStatistics;
}

export interface StompStatistics {
  snapshotRowsReceived: number;
  updateRowsReceived: number;
  connectionCount: number;
  disconnectionCount: number;
  snapshotDuration?: number;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  isConnected: boolean;
  snapshotStartTime?: number;
  snapshotEndTime?: number;
  bytesReceived: number;
  snapshotBytesReceived: number;
  updateBytesReceived: number;
  mode: 'idle' | 'snapshot' | 'realtime';
}

export interface FieldInfo {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  nullable: boolean;
  sample?: any;
  children?: Record<string, FieldInfo>;
}

export interface StompConfig {
  websocketUrl: string;
  listenerTopic: string;
  requestMessage?: string;  // Topic to send snapshot request
  requestBody?: string;     // Body of snapshot request
  
  // New fields for structured format
  dataType?: 'positions' | 'trades';
  messageRate?: number;
  batchSize?: number;
  
  snapshotEndToken?: string;
  keyColumn?: string;
  snapshotTimeoutMs?: number;
  
  // Template resolution
  manualTopics?: boolean;   // Whether topics are manually configured with templates
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

interface StompProviderStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  messageCount: number;
  lastMessageTime?: Date;
  startTime?: Date;
}

export class StompDatasourceProvider extends EventEmitter {
  private client: Client | null = null;
  private config: StompProviderConfig | null = null;
  private stompConfig: StompConfig | null = null;
  private sessionId: string | null = null;
  private resolvedListenerTopic: string | null = null;
  private resolvedRequestMessage: string | null = null;
  private status: StompProviderStatus = {
    connected: false,
    connecting: false,
    messageCount: 0
  };
  
  private snapshot: Map<string, any> = new Map();
  private updateBatch: any[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private conflationTimer: NodeJS.Timeout | null = null;
  
  private connectionPromise: Promise<void> | null = null;
  private isConnected = false;
  private activeSubscriptions: any[] = [];
  private snapshotSubscription: any = null;
  private realtimeSubscription: any = null;
  private statistics: StompStatistics = {
    snapshotRowsReceived: 0,
    updateRowsReceived: 0,
    connectionCount: 0,
    disconnectionCount: 0,
    isConnected: false,
    bytesReceived: 0,
    snapshotBytesReceived: 0,
    updateBytesReceived: 0,
    mode: 'idle'
  };
  
  constructor(stompConfig?: StompConfig) {
    super();
    if (stompConfig) {
      this.stompConfig = stompConfig;
    }
  }
  
  async start(config: StompProviderConfig): Promise<void> {
    if (this.client && this.status.connected) {
      await this.stop();
    }
    
    this.config = config;
    this.status = {
      connected: false,
      connecting: true,
      messageCount: 0,
      startTime: new Date()
    };
    
    try {
      // Get WebSocket URL
      const wsUrl = await this.getWebSocketUrl(config);
      
      // Configure STOMP client
      const stompConfig: StompClientConfig = {
        brokerURL: wsUrl,
        connectHeaders: {
          login: config.username || '',
          passcode: config.password || ''
        },
        heartbeatIncoming: config.heartbeatInterval,
        heartbeatOutgoing: config.heartbeatInterval,
        reconnectDelay: config.reconnectInterval,
        debug: (msg) => console.log('STOMP:', msg),
        
        onConnect: () => {
          console.log('✅ STOMP connected');
          this.status.connected = true;
          this.status.connecting = false;
          this.emit('connected');
          
          // Subscribe to topic
          this.client!.subscribe(config.topic, (message: IMessage) => {
            this.handleMessage(message);
          });
        },
        
        onStompError: (frame) => {
          console.error('❌ STOMP error:', frame);
          this.status.error = frame.headers['message'] || 'Unknown error';
          this.emit('error', new Error(this.status.error));
        },
        
        onWebSocketError: (event) => {
          console.error('❌ WebSocket error:', event);
          this.status.error = 'WebSocket connection failed';
          this.emit('error', new Error(this.status.error));
        },
        
        onDisconnect: () => {
          console.log('🔌 STOMP disconnected');
          this.status.connected = false;
          this.emit('disconnected');
        }
      };
      
      // Create and activate client
      this.client = new Client(stompConfig);
      this.client.activate();
      
    } catch (error) {
      this.status.connecting = false;
      this.status.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.conflationTimer) {
      clearTimeout(this.conflationTimer);
      this.conflationTimer = null;
    }
    
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    
    this.status.connected = false;
    this.status.connecting = false;
    this.snapshot.clear();
    this.updateBatch = [];
  }
  
  async checkConnection(config?: StompProviderConfig | StompConfig): Promise<boolean> {
    try {
      // Handle both config types
      if (config && 'websocketUrl' in config) {
        // StompConfig type - use new connection logic
        return this.checkConnectionWithStompConfig(config);
      } else if (config) {
        // StompProviderConfig type - use existing logic
        return this.checkConnectionWithProviderConfig(config);
      } else if (this.stompConfig) {
        // Use constructor config
        return this.checkConnectionWithStompConfig(this.stompConfig);
      }
      throw new Error('No configuration provided');
    } catch (error) {
      throw error;
    }
  }

  private async checkConnectionWithStompConfig(_config: StompConfig): Promise<boolean> {
    try {
      await this.connect();
      return this.isConnected;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }

  private async checkConnectionWithProviderConfig(config: StompProviderConfig): Promise<boolean> {
    try {
      const wsUrl = await this.getWebSocketUrl(config);
      
      // Create test client
      const testClient = new Client({
        brokerURL: wsUrl,
        connectHeaders: {
          login: config.username || '',
          passcode: config.password || ''
        },
        heartbeatIncoming: 5000,
        heartbeatOutgoing: 5000,
        connectionTimeout: 10000
      });
      
      return new Promise((resolve, reject) => {
        testClient.onConnect = () => {
          testClient.deactivate();
          resolve(true);
        };
        
        testClient.onStompError = (frame) => {
          testClient.deactivate();
          reject(new Error(frame.headers['message'] || 'Connection failed'));
        };
        
        testClient.onWebSocketError = () => {
          testClient.deactivate();
          reject(new Error('WebSocket connection failed'));
        };
        
        testClient.activate();
        
        // Timeout after 10 seconds
        setTimeout(() => {
          testClient.deactivate();
          reject(new Error('Connection timeout'));
        }, 10000);
      });
      
    } catch (error) {
      throw error;
    }
  }
  
  getSnapshot(): any[] {
    return Array.from(this.snapshot.values());
  }
  
  getStatus(): StompProviderStatus {
    return { ...this.status };
  }
  
  getStatistics(): any {
    const uptime = this.status.startTime 
      ? Date.now() - this.status.startTime.getTime() 
      : 0;
      
    return {
      connected: this.status.connected,
      messageCount: this.status.messageCount,
      snapshotSize: this.snapshot.size,
      uptime,
      lastMessageTime: this.status.lastMessageTime,
      error: this.status.error
    };
  }
  
  private async getWebSocketUrl(config: StompProviderConfig): Promise<string> {
    if (config.webSocketUrl) {
      return config.webSocketUrl;
    }
    
    if (config.httpUrl) {
      try {
        const response = await fetch(config.httpUrl);
        const data = await response.json();
        
        // Common patterns for WebSocket URL in response
        return data.websocketUrl || 
               data.webSocketUrl || 
               data.wsUrl || 
               data.url ||
               data.endpoint;
      } catch (error) {
        throw new Error(`Failed to fetch WebSocket URL: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    throw new Error('No WebSocket URL configured');
  }
  
  private handleMessage(message: IMessage): void {
    try {
      const data = JSON.parse(message.body);
      this.status.messageCount++;
      this.status.lastMessageTime = new Date();
      
      // Extract key value
      const key = data[this.config!.keyColumn];
      if (!key) {
        console.warn('Message missing key column:', this.config!.keyColumn);
        return;
      }
      
      // Check if this is an update
      const isUpdate = this.snapshot.has(key);
      
      // Update snapshot
      this.snapshot.set(key, data);
      
      // Add to update batch
      this.updateBatch.push({
        key,
        data,
        isUpdate,
        timestamp: new Date()
      });
      
      // Process batch if needed
      this.processBatch();
      
    } catch (error) {
      console.error('Failed to process message:', error);
      this.emit('error', error);
    }
  }
  
  private processBatch(): void {
    // Clear existing timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    if (this.conflationTimer) {
      clearTimeout(this.conflationTimer);
    }
    
    // Check if batch is full
    if (this.updateBatch.length >= this.config!.batchSize) {
      this.flushBatch();
      return;
    }
    
    // Set conflation timer
    this.conflationTimer = setTimeout(() => {
      this.flushBatch();
    }, this.config!.conflationWindow);
  }
  
  private flushBatch(): void {
    if (this.updateBatch.length === 0) {
      return;
    }
    
    // Group updates by key (conflation)
    const conflatedUpdates = new Map<string, any>();
    
    for (const update of this.updateBatch) {
      conflatedUpdates.set(update.key, update.data);
    }
    
    // Emit updates
    const updates = Array.from(conflatedUpdates.values());
    this.emit('update', updates);
    
    // Clear batch
    this.updateBatch = [];
    
    // Clear timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.conflationTimer) {
      clearTimeout(this.conflationTimer);
      this.conflationTimer = null;
    }
  }

  // New methods for StompConfig usage
  async connect(): Promise<void> {
    if (!this.stompConfig) {
      throw new Error('No STOMP configuration provided');
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    // Create session ID for consistent template resolution
    this.sessionId = uuidv4();

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.client = new Client({
          brokerURL: this.stompConfig!.websocketUrl,
          debug: (str) => {
            if (str.includes('ERROR') || str.includes('WARN')) {
              console.error('[STOMP Error]', str);
            }
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        this.client.onConnect = () => {
          this.isConnected = true;
          this.statistics.isConnected = true;
          this.statistics.connectionCount++;
          this.statistics.lastConnectedAt = Date.now();
          resolve();
        };

        this.client.onDisconnect = () => {
          this.isConnected = false;
          this.statistics.isConnected = false;
          this.statistics.disconnectionCount++;
          this.statistics.lastDisconnectedAt = Date.now();
        };

        this.client.onStompError = (frame) => {
          console.error('[STOMP] Error', frame.headers['message']);
          this.statistics.isConnected = false;
          reject(new Error(frame.headers['message'] || 'STOMP connection error'));
        };

        this.client.onWebSocketError = (event) => {
          console.error('[STOMP] WebSocket error', event);
          this.statistics.isConnected = false;
          reject(new Error('WebSocket connection error'));
        };

        this.client.activate();
      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    this.activeSubscriptions.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    this.activeSubscriptions = [];

    if (this.client) {
      try {
        this.client.deactivate();
      } catch (error) {
        console.error('Error deactivating client:', error);
      }
      this.client = null;
    }

    this.connectionPromise = null;
    this.isConnected = false;
    this.statistics.isConnected = false;
  }
  
  getIsConnected(): boolean {
    return this.isConnected;
  }

  async fetchSnapshot(
    maxRows: number = 100,
    onBatch?: (data: any[], totalRows: number) => void
  ): Promise<StompConnectionResult> {
    if (!this.stompConfig) {
      throw new Error('No STOMP configuration provided');
    }

    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = this.stompConfig!.snapshotTimeoutMs || 60000;
      const accumulatedData: any[] = [];
      let isComplete = false;
      let isReceivingSnapshot = true;
      let batchBuffer: any[] = [];
      
      this.statistics.snapshotStartTime = startTime;
      this.statistics.mode = 'snapshot';
      
      // Validate and log configuration
      console.log('📋 Snapshot configuration:', {
        listenerTopic: this.stompConfig!.listenerTopic,
        snapshotEndToken: this.stompConfig!.snapshotEndToken,
        timeout: timeout,
        maxRows: maxRows
      });
      
      if (!this.stompConfig!.snapshotEndToken) {
        console.warn('⚠️ No snapshotEndToken configured - will rely on maxRows limit or timeout');
      } else {
        console.log('✅ Will look for end token:', this.stompConfig!.snapshotEndToken);
      }

      const cleanup = () => {
        // Don't unsubscribe - we'll keep using the same subscription for real-time updates
        clearTimeout(timeoutId);
      };

      const completeSnapshot = (success: boolean, error?: string) => {
        if (isComplete) return;
        isComplete = true;

        this.statistics.snapshotEndTime = Date.now();
        this.statistics.snapshotDuration = this.statistics.snapshotEndTime - startTime;
        this.statistics.mode = 'idle';

        console.log('📊 Snapshot completion summary:', {
          success,
          totalRows: accumulatedData.length,
          duration: this.statistics.snapshotDuration,
          error,
          completionReason: error ? 'Error' : 
                           accumulatedData.length >= maxRows ? 'MaxRows reached' : 
                           'End token received',
          maxRows: maxRows,
          endToken: this.stompConfig!.snapshotEndToken
        });

        cleanup();
        clearTimeout(timeoutId);
        
        // Emit SNAPSHOT_COMPLETE event
        this.emit('SNAPSHOT_COMPLETE', {
          rowCount: accumulatedData.length,
          duration: this.statistics.snapshotDuration
        });
        
        resolve({
          success,
          data: accumulatedData,
          error,
          statistics: { ...this.statistics },
        });
      };

      // Set timeout
      const timeoutId = setTimeout(() => {
        console.log('⏰ Snapshot timeout reached after', timeout, 'ms');
        console.log('Total rows received before timeout:', accumulatedData.length);
        completeSnapshot(false, 'Snapshot timeout');
      }, timeout);

      // Emit REQUESTING_SNAPSHOT_DATA event
      this.emit('REQUESTING_SNAPSHOT_DATA');
      
      // Resolve templates in topics
      if (this.stompConfig!.manualTopics) {
        this.resolvedListenerTopic = templateResolver.resolveTemplate(this.stompConfig!.listenerTopic, this.sessionId!);
        if (this.stompConfig!.requestMessage) {
          this.resolvedRequestMessage = templateResolver.resolveTemplate(this.stompConfig!.requestMessage, this.sessionId!);
        }
        console.log('[STOMP] Resolved topics from templates:', {
          originalListener: this.stompConfig!.listenerTopic,
          resolvedListener: this.resolvedListenerTopic,
          originalRequest: this.stompConfig!.requestMessage,
          resolvedRequest: this.resolvedRequestMessage,
          sessionId: this.sessionId
        });
      } else {
        this.resolvedListenerTopic = this.stompConfig!.listenerTopic;
        this.resolvedRequestMessage = this.stompConfig!.requestMessage || null;
      }
      
      // Subscribe to the resolved listener topic
      this.snapshotSubscription = this.client!.subscribe(this.resolvedListenerTopic, (message: IMessage) => {
        try {
          const messageSize = new TextEncoder().encode(message.body).length;
          this.statistics.bytesReceived += messageSize;
          this.statistics.snapshotBytesReceived += messageSize;

          // Check for end token FIRST - before trying to parse JSON
          // The end token might be a plain text message
          if (this.stompConfig!.snapshotEndToken) {
            const endToken = this.stompConfig!.snapshotEndToken;
            const messageBody = message.body.trim();
            
            console.log('[SNAPSHOT] Checking message for end token:');
            console.log('  Expected token:', endToken);
            console.log('  Message body:', messageBody);
            console.log('  Message length:', message.body.length);
            console.log('  Contains match (case-insensitive):', messageBody.toLowerCase().includes(endToken.toLowerCase()));
            
            // Check if the raw message body contains the end token (case-insensitive)
            if (messageBody.toLowerCase().includes(endToken.toLowerCase())) {
              console.log('🏁 Snapshot complete - end token received (raw message):', messageBody);
              console.log('📊 Switching to real-time mode, isReceivingSnapshot will be:', false);
              
              // Process any buffered batch data before completing
              if (batchBuffer.length > 0) {
                accumulatedData.push(...batchBuffer);
                this.statistics.snapshotRowsReceived += batchBuffer.length;
                if (onBatch) {
                  onBatch([...accumulatedData], this.statistics.snapshotRowsReceived);
                }
              }
              
              // Mark snapshot as complete but continue processing messages
              isReceivingSnapshot = false;
              this.statistics.mode = 'realtime';
              completeSnapshot(true);
              console.log('✅ Snapshot complete, ready for real-time updates');
              // Don't return here - let the subscription continue for real-time updates
            } else {
              // If not end token, try to parse as JSON
              let data;
              try {
                data = JSON.parse(message.body);
              } catch (parseError) {
                // If JSON parsing fails and it's not the end token, skip this message
                console.warn('[SNAPSHOT] Non-JSON message received (not end token):', message.body);
                return;
              }

              // Process data based on mode
              console.log(`[STOMP] Processing message, isReceivingSnapshot: ${isReceivingSnapshot}, data type: ${typeof data}`);
              if (isReceivingSnapshot) {
                // During snapshot - accumulate data
                if (Array.isArray(data)) {
                  batchBuffer.push(...data);
                } else if (data && typeof data === 'object') {
                  batchBuffer.push(data);
                }
                
                // Process batch (could be configured batch size or immediate)
                if (batchBuffer.length > 0) {
                  accumulatedData.push(...batchBuffer);
                  this.statistics.snapshotRowsReceived += batchBuffer.length;
                  
                  // Call batch callback with current accumulated data
                  if (onBatch) {
                    onBatch([...accumulatedData], this.statistics.snapshotRowsReceived);
                  }
                  
                  console.log(`📦 Batch processed: ${batchBuffer.length} rows, Total: ${accumulatedData.length}`);
                  batchBuffer = [];
                }

                // Check max rows
                if (accumulatedData.length >= maxRows) {
                  console.log('⚠️ Snapshot complete - maxRows limit reached:', maxRows);
                  console.log('Total accumulated rows:', accumulatedData.length);
                  completeSnapshot(true);
                }
              } else {
                // Real-time mode - emit updates
                console.log('🔄 Real-time update received, mode:', this.statistics.mode);
                console.log('📊 Update data:', Array.isArray(data) ? `Array of ${data.length} items` : 'Single object');
                const updates = Array.isArray(data) ? data : [data];
                this.statistics.updateRowsReceived += updates.length;
                this.statistics.updateBytesReceived += messageSize;
                
                console.log(`📤 Emitting 'realtime-update' event with ${updates.length} items`);
                // Emit realtime-update event for real-time data
                this.emit('realtime-update', updates);
                console.log('✅ Real-time update event emitted successfully');
              }
            } // End of else block (not end token)
          } // End of if (this.stompConfig!.snapshotEndToken)
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      // No need to track in activeSubscriptions as we have dedicated snapshotSubscription

      // Send request message if configured
      if (this.resolvedRequestMessage && this.stompConfig!.requestBody) {
        try {
          console.log('🚀 Sending snapshot request to STOMP server:', {
            destination: this.resolvedRequestMessage,
            body: this.stompConfig!.requestBody
          });
          
          this.client!.publish({
            destination: this.resolvedRequestMessage,
            body: this.stompConfig!.requestBody,
          });
          
          console.log('✅ Snapshot request sent');
        } catch (error) {
          console.error('❌ Error sending snapshot request:', error);
          completeSnapshot(false, 'Failed to send request message');
        }
      } else {
        console.warn('⚠️ No request message configured - will only listen for existing data on topic:', this.resolvedListenerTopic);
      }
    });
  }
  

  static inferFields(data: any[]): Record<string, FieldInfo> {
    const fieldMap: Record<string, FieldInfo> = {};

    const getType = (value: any): FieldInfo['type'] => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      const type = typeof value;
      if (type === 'object') return 'object';
      if (type === 'string') return 'string';
      if (type === 'number') return 'number';
      if (type === 'boolean') return 'boolean';
      return 'string';
    };

    const processObject = (obj: any, path: string = '') => {
      Object.keys(obj).forEach(key => {
        const fullPath = path ? `${path}.${key}` : key;
        const value = obj[key];
        const type = getType(value);

        if (!fieldMap[fullPath]) {
          fieldMap[fullPath] = {
            path: fullPath,
            type,
            nullable: false,
            sample: value,
          };
        } else {
          // Update nullable if we've seen null
          if (value === null) {
            fieldMap[fullPath].nullable = true;
          }
          // Update type if it was null before
          if (fieldMap[fullPath].type === 'null' && type !== 'null') {
            fieldMap[fullPath].type = type;
            fieldMap[fullPath].sample = value;
          }
        }

        // Process nested objects
        if (type === 'object' && value !== null) {
          processObject(value, fullPath);
          // Add children reference
          const children: Record<string, FieldInfo> = {};
          Object.keys(value).forEach(childKey => {
            const childPath = `${fullPath}.${childKey}`;
            if (fieldMap[childPath]) {
              children[childKey] = fieldMap[childPath];
            }
          });
          fieldMap[fullPath].children = children;
        }
      });
    };

    // Process all data rows
    data.forEach(row => {
      if (row && typeof row === 'object') {
        processObject(row);
      }
    });

    return fieldMap;
  }
}