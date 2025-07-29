import { v4 as uuidv4 } from 'uuid';
import { 
  WorkerRequest, 
  WorkerResponse, 
  WorkerRequestType 
} from '../../types/sharedWorker';
import { 
  SharedWorkerClientBase, 
  SharedWorkerClientConfig, 
  PendingRequest 
} from './types';

export class SharedWorkerClient extends SharedWorkerClientBase {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private portId: string;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private config: SharedWorkerClientConfig;
  private connected = false;
  private subscribedProviders: Set<string> = new Set();

  constructor(config: SharedWorkerClientConfig = {}) {
    super();
    this.config = {
      workerUrl: '/src/workers/stompSharedWorker.ts',
      reconnectInterval: 5000,
      requestTimeout: 30000,
      ...config
    };
    this.portId = `client-${uuidv4()}`;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      console.log('[SharedWorkerClient] Connecting to SharedWorker...');
      
      // Create SharedWorker
      this.worker = new SharedWorker(this.config.workerUrl!, { 
        type: 'module',
        name: 'stomp-shared-worker' 
      });
      
      this.port = this.worker.port;

      // Set up message handlers
      this.port.onmessage = this.handleMessage.bind(this);
      this.port.onmessageerror = this.handleMessageError.bind(this);

      // Start the port
      this.port.start();

      this.connected = true;
      console.log('[SharedWorkerClient] Connected to SharedWorker');
      this.emit('connected');
    } catch (error) {
      console.error('[SharedWorkerClient] Failed to connect:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  disconnect(): void {
    if (!this.connected) return;

    // Unsubscribe from all providers
    this.subscribedProviders.forEach(providerId => {
      this.sendRequest('unsubscribe', providerId).catch(() => {});
    });

    // Close port
    if (this.port) {
      this.port.close();
      this.port = null;
    }

    this.worker = null;
    this.connected = false;
    this.subscribedProviders.clear();
    this.pendingRequests.clear();

    console.log('[SharedWorkerClient] Disconnected');
    this.emit('disconnected');
  }

  async subscribe(providerId: string, config?: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SharedWorker');
    }

    console.log(`[SharedWorkerClient] Subscribing to provider ${providerId}`);
    
    const response = await this.sendRequest('subscribe', providerId, { config });
    
    if (response.type === 'error') {
      throw new Error(response.error || 'Subscribe failed');
    }

    this.subscribedProviders.add(providerId);
  }

  async unsubscribe(providerId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to SharedWorker');
    }

    console.log(`[SharedWorkerClient] Unsubscribing from provider ${providerId}`);
    
    await this.sendRequest('unsubscribe', providerId);
    this.subscribedProviders.delete(providerId);
  }

  async getSnapshot(providerId: string): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to SharedWorker');
    }

    const response = await this.sendRequest('getSnapshot', providerId);
    
    if (response.type === 'error') {
      throw new Error(response.error || 'Failed to get snapshot');
    }

    return response.data || [];
  }

  async getStatus(providerId: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to SharedWorker');
    }

    const response = await this.sendRequest('getStatus', providerId);
    
    if (response.type === 'error') {
      throw new Error(response.error || 'Failed to get status');
    }

    return response.statistics;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private sendRequest(
    type: WorkerRequestType, 
    providerId: string, 
    additionalData?: any
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${type} for ${providerId}`));
      }, this.config.requestTimeout!);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      const request: WorkerRequest = {
        type,
        providerId,
        requestId,
        portId: this.portId,
        ...additionalData
      };

      this.port!.postMessage(request);
    });
  }

  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const response = event.data;
    
    // Handle response to specific request
    if (response.requestId && this.pendingRequests.has(response.requestId)) {
      const pending = this.pendingRequests.get(response.requestId)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.requestId);
      pending.resolve(response);
      return;
    }

    // Handle broadcast messages
    switch (response.type) {
      case 'snapshot':
        console.log(`[SharedWorkerClient] Received snapshot for ${response.providerId}: ${response.data?.length} rows`);
        this.emit('snapshot', {
          providerId: response.providerId,
          data: response.data || [],
          statistics: response.statistics
        });
        break;

      case 'update':
        console.log(`[SharedWorkerClient] Received update for ${response.providerId}: ${response.data?.length} rows`);
        this.emit('update', {
          providerId: response.providerId,
          data: response.data || [],
          statistics: response.statistics
        });
        break;

      case 'status':
        console.log(`[SharedWorkerClient] Received status for ${response.providerId}`);
        this.emit('status', {
          providerId: response.providerId,
          statistics: response.statistics
        });
        break;

      case 'error':
        console.error(`[SharedWorkerClient] Received error for ${response.providerId}:`, response.error);
        this.emit('error', new Error(response.error || 'Unknown error'));
        break;

      default:
        console.log(`[SharedWorkerClient] Received unknown message type: ${response.type}`);
    }
  }

  private handleMessageError(event: MessageEvent) {
    console.error('[SharedWorkerClient] Message error:', event);
    this.emit('error', new Error('Message error'));
  }

  // Clean up on disconnect
  destroy() {
    this.disconnect();
    this.removeAllListeners();
  }
}