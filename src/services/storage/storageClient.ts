import { UnifiedConfig, ConfigQuery } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Client for accessing storage service from windows
 * This now uses the centralized Configuration Service via OpenFin IAB channels
 * Falls back to IndexedDB if Configuration Service is not available
 */
export class StorageClient {
  private static channel: any = null;
  private static isConnected = false;
  private static connectionPromise: Promise<void> | null = null;
  
  /**
   * Connect to the Configuration Service
   */
  private static async connect(): Promise<void> {
    if (this.isConnected && this.channel) {
      return;
    }
    
    // If already connecting, wait for that to complete
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.connectionPromise = this.doConnect();
    return this.connectionPromise;
  }
  
  private static async doConnect(): Promise<void> {
    try {
      if (typeof fin === 'undefined') {
        console.warn('[StorageClient] OpenFin not available, using IndexedDB directly');
        this.isConnected = false;
        return;
      }
      
      // Try to connect to the Configuration Service channel
      console.log('[StorageClient] Connecting to Configuration Service...');
      this.channel = await fin.InterApplicationBus.Channel.connect('agv3-configuration-service');
      this.isConnected = true;
      console.log('[StorageClient] Connected to Configuration Service');
      
      // Handle disconnection
      this.channel.onDisconnection(() => {
        console.warn('[StorageClient] Disconnected from Configuration Service');
        this.isConnected = false;
        this.channel = null;
      });
    } catch (error) {
      console.warn('[StorageClient] Could not connect to Configuration Service, using IndexedDB directly:', error);
      this.isConnected = false;
      this.channel = null;
    } finally {
      this.connectionPromise = null;
    }
  }
  
  /**
   * Get the appropriate adapter based on connection status
   */
  private static async getAdapter() {
    await this.connect();
    
    if (this.isConnected && this.channel) {
      // Use Configuration Service via IAB channel
      return this.channel;
    } else {
      // Fall back to IndexedDB directly
      const { IndexedDBAdapter } = await import('./adapters/IndexedDBAdapter');
      const adapter = new IndexedDBAdapter();
      await adapter.initialize();
      return adapter;
    }
  }
  
  static async save(config: UnifiedConfig): Promise<string> {
    const adapter = await this.getAdapter();
    
    if (!config.configId) {
      config.configId = uuidv4();
    }
    
    if (this.isConnected && this.channel) {
      // Use Configuration Service
      const result = await this.channel.dispatch('create', { 
        record: {
          id: config.configId,
          componentType: config.componentType,
          componentSubType: config.componentSubType,
          componentId: config.configId,
          appId: config.appId || 'agv3',
          userId: config.userId || 'current-user',
          name: config.name,
          description: config.description,
          config: config.config,
          settings: config.settings,
          metadata: {
            tags: config.tags,
            category: config.category,
            isShared: config.isShared,
            isDefault: config.isDefault,
            isLocked: config.isLocked
          },
          isActive: true,
          isDeleted: false
        }
      });
      return result.id;
    } else {
      // Use IndexedDB directly
      return await adapter.create(config);
    }
  }
  
  static async get(configId: string): Promise<UnifiedConfig | null> {
    const adapter = await this.getAdapter();
    
    if (this.isConnected && this.channel) {
      // Use Configuration Service
      const result = await this.channel.dispatch('get', { id: configId });
      if (!result) return null;
      
      // Convert from ConfigurationRecord to UnifiedConfig
      return {
        configId: result.id,
        appId: result.appId,
        userId: result.userId,
        componentType: result.componentType,
        componentSubType: result.componentSubType,
        name: result.name,
        description: result.description,
        config: result.config,
        settings: result.settings || [],
        activeSetting: result.metadata?.activeSetting || '',
        tags: result.metadata?.tags,
        category: result.metadata?.category,
        isShared: result.metadata?.isShared,
        isDefault: result.metadata?.isDefault,
        isLocked: result.metadata?.isLocked,
        createdBy: result.userId,
        lastUpdatedBy: result.userId,
        creationTime: result.createdAt,
        lastUpdated: result.updatedAt
      };
    } else {
      // Use IndexedDB directly
      return await adapter.read(configId);
    }
  }
  
  static async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    const adapter = await this.getAdapter();
    
    if (this.isConnected && this.channel) {
      // Use Configuration Service
      await this.channel.dispatch('update', { 
        id: configId,
        updates: {
          name: updates.name,
          description: updates.description,
          config: updates.config,
          settings: updates.settings,
          activeSetting: updates.activeSetting,
          lastUpdated: updates.lastUpdated,
          lastUpdatedBy: updates.lastUpdatedBy,
          metadata: {
            tags: updates.tags,
            category: updates.category,
            isShared: updates.isShared,
            isDefault: updates.isDefault,
            isLocked: updates.isLocked
          }
        }
      });
    } else {
      // Use IndexedDB directly
      await adapter.update(configId, updates);
    }
  }
  
  static async delete(configId: string): Promise<void> {
    const adapter = await this.getAdapter();
    
    if (this.isConnected && this.channel) {
      // Use Configuration Service
      await this.channel.dispatch('delete', { id: configId });
    } else {
      // Use IndexedDB directly
      await adapter.delete(configId);
    }
  }
  
  static async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    const adapter = await this.getAdapter();
    
    if (this.isConnected && this.channel) {
      // Use Configuration Service
      const results = await this.channel.dispatch('query', { 
        filter: {
          componentType: filter.componentType,
          componentSubType: filter.componentSubType,
          appId: filter.appId,
          userId: filter.userId,
          isActive: true,
          isDeleted: false
        }
      });
      
      // Convert results from ConfigurationRecord[] to UnifiedConfig[]
      return results.map((r: any) => ({
        configId: r.id,
        appId: r.appId,
        userId: r.userId,
        componentType: r.componentType,
        componentSubType: r.componentSubType,
        name: r.name,
        description: r.description,
        config: r.config,
        settings: r.settings || [],
        activeSetting: r.metadata?.activeSetting || '',
        tags: r.metadata?.tags,
        category: r.metadata?.category,
        isShared: r.metadata?.isShared,
        isDefault: r.metadata?.isDefault,
        isLocked: r.metadata?.isLocked,
        createdBy: r.userId,
        lastUpdatedBy: r.userId,
        creationTime: r.createdAt,
        lastUpdated: r.updatedAt
      }));
    } else {
      // Use IndexedDB directly
      return await adapter.query(filter);
    }
  }
  
  static async count(filter: ConfigQuery): Promise<number> {
    const adapter = await this.getAdapter();
    
    if (this.isConnected && this.channel) {
      // Use Configuration Service
      const results = await this.channel.dispatch('query', { filter });
      return results.length;
    } else {
      // Use IndexedDB directly
      return await adapter.count(filter);
    }
  }
}