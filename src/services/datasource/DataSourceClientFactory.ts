import { IDataSourceClient, DataSourceConfig } from './interfaces';
import { StorageClient } from '../storage/storageClient';
import { StompDataSourceClient } from './clients/StompDataSourceClient';

export class DataSourceClientFactory {
  private static clientCache: Map<string, IDataSourceClient> = new Map();
  
  /**
   * Create or get a cached data source client
   * @param providerId The provider ID
   * @param useCache Whether to use cached clients (default: true)
   */
  static async create(providerId: string, useCache: boolean = true): Promise<IDataSourceClient> {
    // Check cache first
    if (useCache) {
      const cached = this.clientCache.get(providerId);
      if (cached && cached.isConnected) {
        console.log(`Using cached client for provider: ${providerId}`);
        return cached;
      }
    }
    
    // Get provider configuration
    const config = await this.getProviderConfig(providerId);
    if (!config) {
      throw new Error(`Provider configuration not found for: ${providerId}`);
    }
    
    // Create appropriate client based on type
    let client: IDataSourceClient;
    
    switch (config.type) {
      case 'stomp':
        client = new StompDataSourceClient(providerId, config);
        break;
        
      case 'websocket':
        // TODO: Implement WebSocketDataSourceClient
        throw new Error('WebSocket provider not yet implemented');
        
      case 'rest':
        // TODO: Implement RestDataSourceClient
        throw new Error('REST provider not yet implemented');
        
      case 'socketio':
        // TODO: Implement SocketIODataSourceClient
        throw new Error('Socket.IO provider not yet implemented');
        
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
    
    // Cache the client
    if (useCache) {
      this.clientCache.set(providerId, client);
      
      // Remove from cache on disconnect
      client.onStatusChange((status) => {
        if (status === 'disconnected' || status === 'error') {
          this.clientCache.delete(providerId);
        }
      });
    }
    
    return client;
  }
  
  /**
   * Get provider configuration from storage
   */
  private static async getProviderConfig(providerId: string): Promise<DataSourceConfig | null> {
    try {
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      
      const config = configs.find(c => c.config.id === providerId);
      if (!config) {
        return null;
      }
      
      return {
        id: config.config.id,
        name: config.name,
        type: config.componentSubType as any,
        keyColumn: config.config.keyColumn || 'id',
        ...config.config
      };
    } catch (error) {
      console.error('Failed to load provider configuration:', error);
      return null;
    }
  }
  
  /**
   * Clear all cached clients
   */
  static async clearCache(): Promise<void> {
    for (const [id, client] of this.clientCache) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error(`Failed to disconnect client ${id}:`, error);
      }
    }
    this.clientCache.clear();
  }
  
  /**
   * Get statistics for all cached clients
   */
  static getCacheStatistics(): any {
    const stats: any = {};
    
    for (const [id, client] of this.clientCache) {
      stats[id] = {
        type: client.type,
        isConnected: client.isConnected,
        mode: client.mode,
        statistics: client.getStatistics ? client.getStatistics() : null
      };
    }
    
    return stats;
  }
}