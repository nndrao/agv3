import { UnifiedConfig, ConfigQuery } from '../storage/types';
import { ConfigurationClient } from './ConfigurationClient';
import { ConfigurationMapper } from './configurationMapper';
import { ConfigurationFilter } from '../openfin/ServiceContext';
import { v4 as uuidv4 } from 'uuid';

/**
 * Adapter that provides StorageClient-like interface but uses Configuration Service
 * This allows components to gradually migrate from StorageClient to Configuration Service
 */
export class ConfigurationClientAdapter {
  private configClient: ConfigurationClient;
  private isConnected: boolean = false;
  
  constructor() {
    this.configClient = new ConfigurationClient();
  }
  
  /**
   * Initialize the configuration client
   */
  async initialize(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      await this.configClient.connect();
      this.isConnected = true;
      console.log('[ConfigurationClientAdapter] Connected to Configuration Service');
    } catch (error) {
      console.error('[ConfigurationClientAdapter] Failed to connect:', error);
      throw error;
    }
  }
  
  /**
   * Ensure client is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.initialize();
    }
  }
  
  /**
   * Save a configuration (create or update)
   */
  async save(config: UnifiedConfig): Promise<string> {
    await this.ensureConnected();
    
    if (!config.configId) {
      config.configId = uuidv4();
    }
    
    try {
      // Check if exists
      const existing = await this.configClient.get(config.configId);
      
      if (existing) {
        // Update existing
        const updates = ConfigurationMapper.createUpdatePayload(config);
        await this.configClient.update(config.configId, updates);
        console.log('[ConfigurationClientAdapter] Updated configuration:', config.configId);
        return config.configId;
      } else {
        // Create new
        const record = ConfigurationMapper.createConfigurationRecord(
          config,
          config.componentType,
          config.configId
        );
        
        const created = await this.configClient.create({
          ...record,
          id: config.configId
        } as any);
        
        console.log('[ConfigurationClientAdapter] Created configuration:', created.id);
        return created.id;
      }
    } catch (error) {
      console.error('[ConfigurationClientAdapter] Save failed:', error);
      throw error;
    }
  }
  
  /**
   * Get a configuration by ID
   */
  async get(configId: string): Promise<UnifiedConfig | null> {
    await this.ensureConnected();
    
    try {
      const record = await this.configClient.get(configId);
      
      if (!record) {
        return null;
      }
      
      return ConfigurationMapper.toUnifiedConfig(record);
    } catch (error) {
      console.error('[ConfigurationClientAdapter] Get failed:', error);
      return null;
    }
  }
  
  /**
   * Update a configuration
   */
  async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    await this.ensureConnected();
    
    try {
      const payload = ConfigurationMapper.createUpdatePayload(updates);
      await this.configClient.update(configId, payload);
      console.log('[ConfigurationClientAdapter] Updated configuration:', configId);
    } catch (error) {
      console.error('[ConfigurationClientAdapter] Update failed:', error);
      throw error;
    }
  }
  
  /**
   * Delete a configuration (soft delete)
   */
  async delete(configId: string): Promise<void> {
    await this.ensureConnected();
    
    try {
      await this.configClient.delete(configId);
      console.log('[ConfigurationClientAdapter] Deleted configuration:', configId);
    } catch (error) {
      console.error('[ConfigurationClientAdapter] Delete failed:', error);
      throw error;
    }
  }
  
  /**
   * Query configurations
   */
  async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    await this.ensureConnected();
    
    try {
      // Convert ConfigQuery to ConfigurationFilter
      const configFilter: ConfigurationFilter = {
        componentType: filter.componentType,
        componentSubType: filter.componentSubType,
        userId: filter.userId,
        appId: filter.appId,
        includeDeleted: filter.includeDeleted
      };
      
      const records = await this.configClient.query(configFilter);
      
      // Apply additional filtering for tags if needed
      let filtered = records;
      if (filter.tags && filter.tags.length > 0) {
        filtered = records.filter(record => 
          ConfigurationMapper.matchesQuery(record, filter)
        );
      }
      
      // Convert to UnifiedConfig format
      return ConfigurationMapper.toUnifiedConfigs(filtered);
    } catch (error) {
      console.error('[ConfigurationClientAdapter] Query failed:', error);
      return [];
    }
  }
  
  /**
   * Count configurations matching filter
   */
  async count(filter: ConfigQuery): Promise<number> {
    const results = await this.query(filter);
    return results.length;
  }
  
  /**
   * Disconnect from Configuration Service
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.configClient.disconnect();
      this.isConnected = false;
      console.log('[ConfigurationClientAdapter] Disconnected from Configuration Service');
    }
  }
}

/**
 * Singleton instance for easy migration from StorageClient
 */
export class CentralizedStorageClient {
  private static adapter: ConfigurationClientAdapter | null = null;
  private static initPromise: Promise<void> | null = null;
  
  /**
   * Get or create the adapter instance
   */
  private static async getAdapter(): Promise<ConfigurationClientAdapter> {
    if (this.adapter) {
      return this.adapter;
    }
    
    // If already initializing, wait for it
    if (this.initPromise) {
      await this.initPromise;
      return this.adapter!;
    }
    
    // Initialize the adapter
    this.initPromise = (async () => {
      this.adapter = new ConfigurationClientAdapter();
      await this.adapter.initialize();
      console.log('[CentralizedStorageClient] Adapter initialized');
    })();
    
    await this.initPromise;
    return this.adapter!;
  }
  
  /**
   * Save a configuration
   */
  static async save(config: UnifiedConfig): Promise<string> {
    const adapter = await this.getAdapter();
    return adapter.save(config);
  }
  
  /**
   * Get a configuration
   */
  static async get(configId: string): Promise<UnifiedConfig | null> {
    const adapter = await this.getAdapter();
    return adapter.get(configId);
  }
  
  /**
   * Update a configuration
   */
  static async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    const adapter = await this.getAdapter();
    return adapter.update(configId, updates);
  }
  
  /**
   * Delete a configuration
   */
  static async delete(configId: string): Promise<void> {
    const adapter = await this.getAdapter();
    return adapter.delete(configId);
  }
  
  /**
   * Query configurations
   */
  static async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    const adapter = await this.getAdapter();
    return adapter.query(filter);
  }
  
  /**
   * Count configurations
   */
  static async count(filter: ConfigQuery): Promise<number> {
    const adapter = await this.getAdapter();
    return adapter.count(filter);
  }
  
  /**
   * Clear the adapter cache (useful for testing)
   */
  static clearCache(): void {
    if (this.adapter) {
      this.adapter.disconnect();
    }
    this.adapter = null;
    this.initPromise = null;
  }
}