import { StorageAdapter, UnifiedConfig, ConfigQuery, ConfigVersion } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'agv3:';
  
  async create(config: UnifiedConfig): Promise<string> {
    if (!config.configId) {
      config.configId = uuidv4();
    }
    
    const key = this.getKey(config.componentType, config.configId);
    
    // Add timestamps
    config.creationTime = new Date();
    config.lastUpdated = new Date();
    
    localStorage.setItem(key, JSON.stringify(config));
    
    // Store the mapping for faster lookups
    const mappingKey = `${this.prefix}mapping:${config.configId}`;
    localStorage.setItem(mappingKey, config.componentType);
    
    this.updateIndex(config.componentType, config.configId);
    
    return config.configId;
  }
  
  async read(configId: string): Promise<UnifiedConfig | null> {
    // First check if we have a direct mapping stored
    const mappingKey = `${this.prefix}mapping:${configId}`;
    const componentType = localStorage.getItem(mappingKey);
    
    if (componentType) {
      // We know the component type, so directly fetch
      const key = this.getKey(componentType, configId);
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    }
    
    // Fallback: Search all known component types
    const types: string[] = ['datasource', 'profile', 'grid', 'workspace', 'theme', 'settings', 'DataGridStomp', 'DataTable'];
    
    for (const type of types) {
      const key = this.getKey(type, configId);
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    }
    
    return null;
  }
  
  async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    // First check mapping to avoid full search
    const mappingKey = `${this.prefix}mapping:${configId}`;
    const componentType = localStorage.getItem(mappingKey);
    
    if (!componentType) {
      throw new Error(`Config ${configId} not found`);
    }
    
    const key = this.getKey(componentType, configId);
    const existingData = localStorage.getItem(key);
    
    if (!existingData) {
      throw new Error(`Config ${configId} not found`);
    }
    
    // Parse existing data
    const existing = JSON.parse(existingData);
    
    // Merge updates efficiently
    const updated = {
      ...existing,
      ...updates,
      lastUpdated: new Date(),
      lastUpdatedBy: updates.lastUpdatedBy || existing.lastUpdatedBy
    };
    
    // Save back to localStorage
    localStorage.setItem(key, JSON.stringify(updated));
    
    // Update mapping only if componentType changed
    if (updates.componentType && updates.componentType !== componentType) {
      localStorage.setItem(mappingKey, updates.componentType);
    }
  }
  
  async delete(configId: string): Promise<void> {
    const config = await this.read(configId);
    if (config) {
      const key = this.getKey(config.componentType, configId);
      localStorage.removeItem(key);
      
      // Remove the mapping
      const mappingKey = `${this.prefix}mapping:${configId}`;
      localStorage.removeItem(mappingKey);
      
      this.removeFromIndex(config.componentType, configId);
    }
  }
  
  async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    const results: UnifiedConfig[] = [];
    const componentType = filter.componentType || '*';
    
    if (componentType === '*') {
      // Search all types
      const types: string[] = ['datasource', 'profile', 'grid', 'workspace', 'theme', 'settings'];
      for (const type of types) {
        results.push(...await this.queryByType(type, filter));
      }
    } else {
      results.push(...await this.queryByType(componentType, filter));
    }
    
    // Apply sorting
    if (filter.orderBy) {
      results.sort((a, b) => {
        const aVal = this.getNestedValue(a, filter.orderBy!);
        const bVal = this.getNestedValue(b, filter.orderBy!);
        const order = filter.orderDirection === 'desc' ? -1 : 1;
        return aVal > bVal ? order : -order;
      });
    }
    
    // Apply pagination
    const start = filter.offset || 0;
    const limit = filter.limit || results.length;
    return results.slice(start, start + limit);
  }
  
  async count(filter: ConfigQuery): Promise<number> {
    const results = await this.query({ ...filter, limit: undefined, offset: undefined });
    return results.length;
  }
  
  async bulkCreate(configs: UnifiedConfig[]): Promise<string[]> {
    const ids: string[] = [];
    for (const config of configs) {
      const id = await this.create(config);
      ids.push(id);
    }
    return ids;
  }
  
  async bulkUpdate(updates: Array<{id: string, changes: Partial<UnifiedConfig>}>): Promise<void> {
    for (const update of updates) {
      await this.update(update.id, update.changes);
    }
  }
  
  async bulkDelete(configIds: string[]): Promise<void> {
    for (const id of configIds) {
      await this.delete(id);
    }
  }
  
  async createVersion(configId: string, version: ConfigVersion): Promise<void> {
    const config = await this.read(configId);
    if (!config) {
      throw new Error(`Config ${configId} not found`);
    }
    
    config.settings.push(version);
    await this.update(configId, { settings: config.settings });
  }
  
  async activateVersion(configId: string, versionId: string): Promise<void> {
    const config = await this.read(configId);
    if (!config) {
      throw new Error(`Config ${configId} not found`);
    }
    
    const version = config.settings.find(v => v.versionId === versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    // Deactivate all versions
    config.settings.forEach(v => v.isActive = false);
    
    // Activate selected version
    version.isActive = true;
    config.activeSetting = versionId;
    config.config = version.config;
    
    await this.update(configId, { 
      settings: config.settings,
      activeSetting: versionId,
      config: version.config
    });
  }
  
  async deleteVersion(configId: string, versionId: string): Promise<void> {
    const config = await this.read(configId);
    if (!config) {
      throw new Error(`Config ${configId} not found`);
    }
    
    config.settings = config.settings.filter(v => v.versionId !== versionId);
    await this.update(configId, { settings: config.settings });
  }
  
  private async queryByType(type: string, filter: ConfigQuery): Promise<UnifiedConfig[]> {
    const results: UnifiedConfig[] = [];
    const indexKey = `${this.prefix}index:${type}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    for (const configId of index) {
      const config = await this.read(configId);
      if (config && this.matchesFilter(config, filter)) {
        results.push(config);
      }
    }
    
    return results;
  }
  
  private matchesFilter(config: UnifiedConfig, filter: ConfigQuery): boolean {
    if (filter.userId && config.userId !== filter.userId) return false;
    if (filter.appId && config.appId !== filter.appId) return false;
    if (filter.componentSubType && config.componentSubType !== filter.componentSubType) return false;
    if (filter.isShared !== undefined && config.isShared !== filter.isShared) return false;
    
    if (filter.tags && filter.tags.length > 0) {
      if (!config.tags || !filter.tags.every(tag => config.tags!.includes(tag))) {
        return false;
      }
    }
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const nameMatch = config.name.toLowerCase().includes(searchLower);
      const descMatch = config.description?.toLowerCase().includes(searchLower) || false;
      if (!nameMatch && !descMatch) return false;
    }
    
    if (filter.createdAfter && new Date(config.creationTime) < new Date(filter.createdAfter)) return false;
    if (filter.createdBefore && new Date(config.creationTime) > new Date(filter.createdBefore)) return false;
    
    return true;
  }
  
  private getKey(componentType: string, configId: string): string {
    return `${this.prefix}${componentType}:${configId}`;
  }
  
  private updateIndex(componentType: string, configId: string): void {
    const indexKey = `${this.prefix}index:${componentType}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    if (!index.includes(configId)) {
      index.push(configId);
      localStorage.setItem(indexKey, JSON.stringify(index));
    }
  }
  
  private removeFromIndex(componentType: string, configId: string): void {
    const indexKey = `${this.prefix}index:${componentType}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    const filtered = index.filter((id: string) => id !== configId);
    localStorage.setItem(indexKey, JSON.stringify(filtered));
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }
}