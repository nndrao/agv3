import type { TradeRecord } from '../types';

export interface WebSocketMessage {
  type: 'initial' | 'update' | 'testStart' | 'testComplete' | 'status';
  records?: TradeRecord[];
  timestamp?: number;
  sequence?: number;
  totalSent?: number;
  duration?: number;
  actualRate?: number;
  testType?: string;
}

export type WebSocketCallback = (message: WebSocketMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: WebSocketCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;

  constructor(url: string = 'ws://localhost:8081') {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isIntentionallyClosed = false;
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.notifyCallbacks(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  startExtremeTest(): void {
    this.send({ type: 'start', testType: 'extreme' });
  }

  stopTest(): void {
    this.send({ type: 'stop' });
  }

  getStatus(): void {
    this.send({ type: 'status' });
  }

  onMessage(callback: WebSocketCallback): () => void {
    this.callbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private notifyCallbacks(message: WebSocketMessage): void {
    this.callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in WebSocket callback:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}