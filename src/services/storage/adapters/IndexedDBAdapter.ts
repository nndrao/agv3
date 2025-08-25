import { StorageAdapter, UnifiedConfig, ConfigQuery, ConfigVersion } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * IndexedDB adapter for storage service
 * Uses a single table design for flexibility and MongoDB compatibility
 */
export class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'agv3-storage';
  private dbVersion = 1;
  private storeName = 'configurations';
  private db: IDBDatabase | null = null;
  
  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to open database:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDBAdapter] Database opened successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { 
            keyPath: 'configId' 
          });
          
          // Create indexes for efficient querying
          objectStore.createIndex('appId', 'appId', { unique: false });
          objectStore.createIndex('userId', 'userId', { unique: false });
          objectStore.createIndex('componentType', 'componentType', { unique: false });
          objectStore.createIndex('componentSubType', 'componentSubType', { unique: false });
          objectStore.createIndex('name', 'name', { unique: false });
          objectStore.createIndex('isShared', 'isShared', { unique: false });
          objectStore.createIndex('creationTime', 'creationTime', { unique: false });
          objectStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          
          // Compound indexes
          objectStore.createIndex('appId_componentType', ['appId', 'componentType'], { unique: false });
          objectStore.createIndex('userId_componentType', ['userId', 'componentType'], { unique: false });
          
          console.log('[IndexedDBAdapter] Object store created with indexes');
        }
      };
    });
  }
  
  /**
   * Ensure database is initialized
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
  
  async create(config: UnifiedConfig): Promise<string> {
    const db = await this.ensureDb();
    
    if (!config.configId) {
      config.configId = uuidv4();
    }
    
    // Add timestamps
    config.creationTime = config.creationTime || new Date();
    config.lastUpdated = new Date();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(config);
      
      request.onsuccess = () => {
        console.log('[IndexedDBAdapter] Config created:', config.configId);
        resolve(config.configId);
      };
      
      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to create config:', request.error);
        reject(request.error);
      };
    });
  }
  
  async read(configId: string): Promise<UnifiedConfig | null> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(configId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to read config:', request.error);
        reject(request.error);
      };
    });
  }
  
  async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    const db = await this.ensureDb();
    
    // First read the existing config
    const existing = await this.read(configId);
    if (!existing) {
      throw new Error(`Config ${configId} not found`);
    }
    
    // Merge updates
    const updated = {
      ...existing,
      ...updates,
      lastUpdated: new Date(),
      lastUpdatedBy: updates.lastUpdatedBy || existing.lastUpdatedBy
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updated);
      
      request.onsuccess = () => {
        console.log('[IndexedDBAdapter] Config updated:', configId);
        resolve();
      };
      
      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to update config:', request.error);
        reject(request.error);
      };
    });
  }
  
  async delete(configId: string): Promise<void> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(configId);
      
      request.onsuccess = () => {
        console.log('[IndexedDBAdapter] Config deleted:', configId);
        resolve();
      };
      
      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to delete config:', request.error);
        reject(request.error);
      };
    });
  }
  
  async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    const db = await this.ensureDb();
    const results: UnifiedConfig[] = [];
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      // Determine which index to use based on filter
      let cursor: IDBRequest<IDBCursorWithValue | null>;
      
      if (filter.appId && filter.componentType) {
        const index = store.index('appId_componentType');
        const range = IDBKeyRange.only([filter.appId, filter.componentType]);
        cursor = index.openCursor(range);
      } else if (filter.componentType) {
        const index = store.index('componentType');
        cursor = index.openCursor(IDBKeyRange.only(filter.componentType));
      } else if (filter.appId) {
        const index = store.index('appId');
        cursor = index.openCursor(IDBKeyRange.only(filter.appId));
      } else if (filter.userId) {
        const index = store.index('userId');
        cursor = index.openCursor(IDBKeyRange.only(filter.userId));
      } else {
        cursor = store.openCursor();
      }
      
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const config = cursor.value;
          
          // Apply additional filters
          if (this.matchesFilter(config, filter)) {
            results.push(config);
          }
          
          cursor.continue();
        } else {
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
          resolve(results.slice(start, start + limit));
        }
      };
      
      cursor.onerror = () => {
        console.error('[IndexedDBAdapter] Query failed:', cursor.error);
        reject(cursor.error);
      };
    });
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
  
  /**
   * Check if a config matches the filter criteria
   */
  private matchesFilter(config: UnifiedConfig, filter: ConfigQuery): boolean {
    if (filter.userId && config.userId !== filter.userId) return false;
    if (filter.appId && config.appId !== filter.appId) return false;
    if (filter.componentType && config.componentType !== filter.componentType) return false;
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
  
  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }
  
  /**
   * Clear all data (useful for testing)
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('[IndexedDBAdapter] All data cleared');
        resolve();
      };
      
      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to clear data:', request.error);
        reject(request.error);
      };
    });
  }
}