import { UnifiedConfig, ConfigQuery } from './types';
import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simplified Storage Client that uses IndexedDB directly
 * No fallbacks, no channels, just direct database access
 */
export class StorageClient {
  private static adapter: IndexedDBAdapter | null = null;
  private static initPromise: Promise<void> | null = null;
  
  /**
   * Initialize the adapter (singleton pattern)
   */
  private static async getAdapter(): Promise<IndexedDBAdapter> {
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
      this.adapter = new IndexedDBAdapter();
      await this.adapter.initialize();
      console.log('[StorageClient] IndexedDB adapter initialized');
    })();
    
    await this.initPromise;
    return this.adapter!;
  }
  
  static async save(config: UnifiedConfig): Promise<string> {
    const adapter = await this.getAdapter();
    
    if (!config.configId) {
      config.configId = uuidv4();
    }
    
    // Check if exists and update instead
    const existing = await adapter.read(config.configId);
    if (existing) {
      await adapter.update(config.configId, config);
      return config.configId;
    }
    
    return await adapter.create(config);
  }
  
  static async get(configId: string): Promise<UnifiedConfig | null> {
    const adapter = await this.getAdapter();
    return await adapter.read(configId);
  }
  
  static async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    const adapter = await this.getAdapter();
    await adapter.update(configId, updates);
  }
  
  static async delete(configId: string): Promise<void> {
    const adapter = await this.getAdapter();
    await adapter.delete(configId);
  }
  
  static async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    const adapter = await this.getAdapter();
    return await adapter.query(filter);
  }
  
  static async count(filter: ConfigQuery): Promise<number> {
    const adapter = await this.getAdapter();
    return await adapter.count(filter);
  }
  
  /**
   * Clear the adapter cache (useful for testing)
   */
  static clearCache(): void {
    this.adapter = null;
    this.initPromise = null;
  }
}