import { UnifiedConfig, ConfigQuery } from './types';

/**
 * Client for accessing storage service from windows
 * This will use OpenFin channels when channel service is implemented
 */
export class StorageClient {
  
  static async save(config: UnifiedConfig): Promise<string> {
    // TODO: When channel service is ready, use channel communication
    // For now, directly use localStorage
    const { LocalStorageAdapter } = await import('./adapters/localStorageAdapter');
    const adapter = new LocalStorageAdapter();
    return await adapter.create(config);
  }
  
  static async get(configId: string): Promise<UnifiedConfig | null> {
    const { LocalStorageAdapter } = await import('./adapters/localStorageAdapter');
    const adapter = new LocalStorageAdapter();
    return await adapter.read(configId);
  }
  
  static async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    const { LocalStorageAdapter } = await import('./adapters/localStorageAdapter');
    const adapter = new LocalStorageAdapter();
    await adapter.update(configId, updates);
  }
  
  static async delete(configId: string): Promise<void> {
    const { LocalStorageAdapter } = await import('./adapters/localStorageAdapter');
    const adapter = new LocalStorageAdapter();
    await adapter.delete(configId);
  }
  
  static async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    const { LocalStorageAdapter } = await import('./adapters/localStorageAdapter');
    const adapter = new LocalStorageAdapter();
    return await adapter.query(filter);
  }
  
  static async count(filter: ConfigQuery): Promise<number> {
    const { LocalStorageAdapter } = await import('./adapters/localStorageAdapter');
    const adapter = new LocalStorageAdapter();
    return await adapter.count(filter);
  }
}