import { UnifiedConfig, StorageAdapter, ConfigQuery } from './types';
import { LocalStorageAdapter } from './adapters/localStorageAdapter';

export class StorageService {
  private static adapter: StorageAdapter;
  
  static async initialize(): Promise<void> {
    // Use localStorage adapter for now
    this.adapter = new LocalStorageAdapter();
    console.log('Storage service initialized with LocalStorage adapter');
  }
  
  static async save(config: UnifiedConfig): Promise<string> {
    const id = await this.adapter.create(config);
    
    // TODO: Broadcast update via channel when channel service is implemented
    console.log(`Saved config ${id} of type ${config.componentType}`);
    
    return id;
  }
  
  static async get(configId: string): Promise<UnifiedConfig | null> {
    return await this.adapter.read(configId);
  }
  
  static async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    await this.adapter.update(configId, updates);
    
    // TODO: Broadcast update via channel
    console.log(`Updated config ${configId}`);
  }
  
  static async delete(configId: string): Promise<void> {
    await this.adapter.delete(configId);
    
    // TODO: Broadcast update via channel
    console.log(`Deleted config ${configId}`);
  }
  
  static async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    return await this.adapter.query(filter);
  }
  
  static async count(filter: ConfigQuery): Promise<number> {
    return await this.adapter.count(filter);
  }
  
  static async bulkCreate(configs: UnifiedConfig[]): Promise<string[]> {
    return await this.adapter.bulkCreate(configs);
  }
  
  static async bulkUpdate(updates: Array<{id: string, changes: Partial<UnifiedConfig>}>): Promise<void> {
    await this.adapter.bulkUpdate(updates);
  }
  
  static async bulkDelete(configIds: string[]): Promise<void> {
    await this.adapter.bulkDelete(configIds);
  }
  
  static async createVersion(configId: string, version: any): Promise<void> {
    await this.adapter.createVersion(configId, version);
  }
  
  static async activateVersion(configId: string, versionId: string): Promise<void> {
    await this.adapter.activateVersion(configId, versionId);
  }
  
  static async deleteVersion(configId: string, versionId: string): Promise<void> {
    await this.adapter.deleteVersion(configId, versionId);
  }
}