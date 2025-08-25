/**
 * Configuration Client
 * 
 * Client-side service that connects to the centralized Configuration Service
 * via OpenFin IAB channels.
 */

import { 
  ConfigurationClient as IConfigurationClient,
  ConfigurationRecord, 
  ConfigurationFilter, 
  ConfigurationEvent 
} from '../openfin/ServiceContext';

export class ConfigurationClient implements IConfigurationClient {
  private channel: any = null;
  private isConnected = false;
  private readonly channelName = 'agv3-configuration-service';
  private subscriptions: Map<string, (event: ConfigurationEvent) => void> = new Map();
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 2000;

  constructor() {
    console.log('[ConfigurationClient] Instance created');
  }

  /**
   * Connect to the Configuration Service
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('[ConfigurationClient] Already connected');
      return;
    }

    try {
      console.log('[ConfigurationClient] Connecting to Configuration Service...');
      
      if (typeof fin === 'undefined') {
        throw new Error('OpenFin API not available');
      }

      // Connect to the service channel
      this.channel = await this.connectWithRetry();
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Subscribe to configuration events
      this.subscribeToEvents();

      // Set up connection monitoring
      this.setupConnectionMonitoring();

      console.log('[ConfigurationClient] Connected to Configuration Service');
    } catch (error) {
      console.error('[ConfigurationClient] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Connect with retry logic
   */
  private async connectWithRetry(): Promise<any> {
    for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
      try {
        console.log(`[ConfigurationClient] Connection attempt ${attempt}/${this.maxReconnectAttempts}`);
        const channel = await fin.InterApplicationBus.Channel.connect(this.channelName);
        return channel;
      } catch (error) {
        if (attempt === this.maxReconnectAttempts) {
          throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: ${error}`);
        }
        
        console.log(`[ConfigurationClient] Attempt ${attempt} failed, retrying in ${this.reconnectDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
      }
    }
  }

  /**
   * Set up connection monitoring
   */
  private setupConnectionMonitoring(): void {
    if (!this.channel) return;

    // Monitor channel disconnection
    this.channel.onDisconnection(() => {
      console.warn('[ConfigurationClient] Disconnected from Configuration Service');
      this.isConnected = false;
      this.attemptReconnect();
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      try {
        console.log('[ConfigurationClient] Attempting to reconnect...');
        await this.connect();
        console.log('[ConfigurationClient] Reconnected successfully');
      } catch (error) {
        console.error('[ConfigurationClient] Reconnection failed:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          console.log(`[ConfigurationClient] Will retry in ${delay}ms`);
          this.attemptReconnect();
        } else {
          console.error('[ConfigurationClient] Max reconnection attempts reached');
        }
      }
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  /**
   * Subscribe to configuration events via IAB
   */
  private subscribeToEvents(): void {
    try {
      fin.InterApplicationBus.subscribe(
        { uuid: '*' },
        'configuration-events',
        (event: ConfigurationEvent) => {
          // Notify local subscribers
          this.subscriptions.forEach(callback => {
            try {
              callback(event);
            } catch (error) {
              console.error('[ConfigurationClient] Subscriber callback error:', error);
            }
          });
        }
      );
      
      console.log('[ConfigurationClient] Subscribed to configuration events');
    } catch (error) {
      console.warn('[ConfigurationClient] Failed to subscribe to events:', error);
    }
  }

  /**
   * Ensure connected before making requests
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected || !this.channel) {
      await this.connect();
    }
  }

  /**
   * Make a request to the service
   */
  private async request<T>(action: string, payload?: any): Promise<T> {
    await this.ensureConnected();

    try {
      const result = await this.channel.dispatch(action, payload);
      return result as T;
    } catch (error) {
      console.error(`[ConfigurationClient] Request failed for ${action}:`, error);
      
      // If disconnected, try to reconnect and retry once
      if (!this.isConnected) {
        console.log('[ConfigurationClient] Attempting reconnect and retry...');
        await this.connect();
        const result = await this.channel.dispatch(action, payload);
        return result as T;
      }
      
      throw error;
    }
  }

  // ============================================================================
  // ConfigurationClient Interface Implementation
  // ============================================================================

  async get(id: string): Promise<ConfigurationRecord | null> {
    console.log(`[ConfigurationClient] Getting configuration: ${id}`);
    return this.request<ConfigurationRecord | null>('read', { id });
  }
  
  async read(id: string): Promise<ConfigurationRecord | null> {
    return this.get(id);
  }

  async create(record: Omit<ConfigurationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfigurationRecord> {
    console.log('[ConfigurationClient] Creating configuration');
    return this.request<ConfigurationRecord>('create', { record });
  }

  async update(id: string, updates: Partial<ConfigurationRecord>): Promise<ConfigurationRecord> {
    console.log(`[ConfigurationClient] Updating configuration: ${id}`);
    return this.request<ConfigurationRecord>('update', { id, updates });
  }

  async delete(id: string): Promise<boolean> {
    console.log(`[ConfigurationClient] Deleting configuration: ${id}`);
    return this.request<boolean>('delete', { id });
  }

  async query(filter: ConfigurationFilter): Promise<ConfigurationRecord[]> {
    console.log('[ConfigurationClient] Querying configurations');
    return this.request<ConfigurationRecord[]>('query', { filter });
  }

  subscribe(filter: ConfigurationFilter, callback: (event: ConfigurationEvent) => void): () => void {
    const subscriptionId = `${Date.now()}-${Math.random()}`;
    
    // Store the subscription locally
    this.subscriptions.set(subscriptionId, (event: ConfigurationEvent) => {
      // Check if event matches filter
      if (this.eventMatchesFilter(event, filter)) {
        callback(event);
      }
    });
    
    console.log(`[ConfigurationClient] Added subscription: ${subscriptionId}`);
    
    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId);
      console.log(`[ConfigurationClient] Removed subscription: ${subscriptionId}`);
    };
  }

  /**
   * Check if an event matches a filter
   */
  private eventMatchesFilter(event: ConfigurationEvent, filter: ConfigurationFilter): boolean {
    const record = event.record;
    
    if (filter.componentType && record.componentType !== filter.componentType) return false;
    if (filter.componentSubType && record.componentSubType !== filter.componentSubType) return false;
    if (filter.componentId && record.componentId !== filter.componentId) return false;
    if (filter.viewId && record.viewId !== filter.viewId) return false;
    if (filter.userId && record.userId !== filter.userId) return false;
    if (filter.appId && record.appId !== filter.appId) return false;
    if (filter.name && record.name !== filter.name) return false;
    if (filter.isActive !== undefined && record.isActive !== filter.isActive) return false;
    if (!filter.includeDeleted && record.isDeleted) return false;
    
    return true;
  }

  /**
   * Disconnect from the service
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.channel) {
      try {
        await this.channel.disconnect();
      } catch (error) {
        console.warn('[ConfigurationClient] Error during disconnect:', error);
      }
      this.channel = null;
    }

    this.isConnected = false;
    this.subscriptions.clear();
    
    console.log('[ConfigurationClient] Disconnected');
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): { connected: boolean; attempts: number } {
    return {
      connected: this.isConnected,
      attempts: this.reconnectAttempts
    };
  }
}