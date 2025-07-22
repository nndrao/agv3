import { EventEmitter } from 'events';
import { Client, IMessage } from '@stomp/stompjs';

export interface StompClientConfig {
  websocketUrl: string;
  dataType?: 'positions' | 'trades';
  messageRate?: number;
  batchSize?: number;
  snapshotEndToken?: string;
  keyColumn?: string;
  snapshotTimeoutMs?: number;
}

export interface StompClientEvents {
  connected: { clientId: string };
  disconnected: void;
  data: any[];
  'snapshot-complete': { rowCount: number; duration: number };
  error: Error;
}

export class StompClient extends EventEmitter {
  private client: Client | null = null;
  private clientId: string = '';
  private config: StompClientConfig;
  private subscription: any = null;
  private snapshotStartTime: number = 0;
  private rowCount: number = 0;
  private isReceivingSnapshot: boolean = true;

  constructor(config: StompClientConfig) {
    super();
    this.config = config;
  }

  // Generate unique client ID
  private generateClientId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    return `client-${timestamp}-${random}`;
  }

  // Build trigger destination from config
  private buildTriggerDestination(): string {
    const dataType = this.config.dataType || 'positions';
    const rate = this.config.messageRate || 1000;
    let destination = `/snapshot/${dataType}/${this.clientId}/${rate}`;
    
    if (this.config.batchSize) {
      destination += `/${this.config.batchSize}`;
    }
    
    return destination;
  }

  // Build listener topic
  private buildListenerTopic(): string {
    const dataType = this.config.dataType || 'positions';
    return `/snapshot/${dataType}/${this.clientId}`;
  }

  // Check if message is end token
  private isEndToken(messageBody: string): boolean {
    if (!this.config.snapshotEndToken) return false;
    
    const trimmedBody = messageBody.trim();
    const endToken = this.config.snapshotEndToken.toLowerCase();
    
    return trimmedBody.toLowerCase().includes(endToken);
  }

  // Connect to STOMP server
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.clientId = this.generateClientId();
        this.snapshotStartTime = Date.now();
        this.rowCount = 0;
        this.isReceivingSnapshot = true;

        const listenerTopic = this.buildListenerTopic();
        const triggerDestination = this.buildTriggerDestination();

        console.log(`[StompClient] Connecting with client ID: ${this.clientId}`);
        console.log(`[StompClient] Listener topic: ${listenerTopic}`);
        console.log(`[StompClient] Trigger destination: ${triggerDestination}`);

        // Create STOMP client
        this.client = new Client({
          brokerURL: this.config.websocketUrl,
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          debug: (str) => {
            // Only log errors to reduce console noise
            if (str.includes('ERROR') || str.includes('WARN')) {
              console.error('[StompClient Debug]', str);
            }
          }
        });

        // Set up connection handler
        this.client.onConnect = () => {
          console.log(`[StompClient] Connected successfully`);
          this.emit('connected', { clientId: this.clientId });

          // Subscribe to listener topic
          this.subscription = this.client!.subscribe(listenerTopic, (message) => {
            this.handleMessage(message);
          });

          // Send trigger message
          console.log(`[StompClient] Sending trigger to: ${triggerDestination}`);
          this.client!.publish({
            destination: triggerDestination,
            body: ''
          });

          resolve();
        };

        // Set up error handlers
        this.client.onStompError = (frame) => {
          const error = new Error(frame.headers['message'] || 'STOMP connection error');
          console.error('[StompClient] STOMP error:', error.message);
          this.emit('error', error);
          reject(error);
        };

        this.client.onWebSocketError = (event) => {
          const error = new Error('WebSocket connection error');
          console.error('[StompClient] WebSocket error:', event);
          this.emit('error', error);
          reject(error);
        };

        this.client.onDisconnect = () => {
          console.log('[StompClient] Disconnected');
          this.emit('disconnected');
        };

        // Activate the client
        this.client.activate();

        // Set timeout for connection
        setTimeout(() => {
          if (!this.client?.connected) {
            const error = new Error('Connection timeout');
            this.emit('error', error);
            reject(error);
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle incoming messages
  private handleMessage(message: IMessage): void {
    try {
      const messageBody = message.body.trim();

      // Check for end token first
      if (this.isReceivingSnapshot && this.isEndToken(messageBody)) {
        console.log(`[StompClient] Snapshot complete - end token received`);
        this.isReceivingSnapshot = false;
        
        const duration = Date.now() - this.snapshotStartTime;
        this.emit('snapshot-complete', { 
          rowCount: this.rowCount, 
          duration 
        });
        return;
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(messageBody);
      } catch (parseError) {
        // If not JSON and not end token, skip
        if (!this.isReceivingSnapshot) {
          console.log('[StompClient] Non-JSON message after snapshot:', messageBody.substring(0, 50));
        }
        return;
      }

      // Process data
      if (Array.isArray(data)) {
        this.rowCount += data.length;
        this.emit('data', data);
      } else if (data && typeof data === 'object') {
        this.rowCount += 1;
        this.emit('data', [data]);
      }

    } catch (error) {
      console.error('[StompClient] Error processing message:', error);
      this.emit('error', error as Error);
    }
  }

  // Disconnect from STOMP server
  disconnect(): void {
    console.log('[StompClient] Disconnecting...');
    
    if (this.subscription) {
      try {
        this.subscription.unsubscribe();
      } catch (error) {
        console.error('[StompClient] Error unsubscribing:', error);
      }
      this.subscription = null;
    }

    if (this.client) {
      try {
        this.client.deactivate();
      } catch (error) {
        console.error('[StompClient] Error deactivating client:', error);
      }
      this.client = null;
    }

    this.clientId = '';
    this.rowCount = 0;
    this.isReceivingSnapshot = true;
  }

  // Get current client ID
  getClientId(): string {
    return this.clientId;
  }

  // Check if connected
  isConnected(): boolean {
    return this.client?.connected || false;
  }
}