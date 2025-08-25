import { ConfigurationRecord, ConfigurationFilter } from '../openfin/ServiceContext';
import { v4 as uuidv4 } from 'uuid';

/**
 * ConfigurationServiceAdapter - Dedicated adapter for centralized configuration storage
 * 
 * This adapter uses the 'agv3-configuration' database for centralized storage
 * across all windows, unlike IndexedDBAdapter which uses 'agv3-storage'.
 * 
 * All configuration operations should go through the Configuration Service
 * which uses this adapter to ensure data consistency.
 */
export class ConfigurationServiceAdapter {
  private dbName = 'agv3-configuration';  // Centralized configuration database
  private dbVersion = 1;
  private storeName = 'configurations';
  private db: IDBDatabase | null = null;
  
  /**
   * Initialize the centralized configuration database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('[ConfigurationServiceAdapter] Failed to open database:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ConfigurationServiceAdapter] Centralized database opened successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { 
            keyPath: 'id' 
          });
          
          // Create indexes for efficient querying - matching ConfigurationRecord structure
          objectStore.createIndex('componentType', 'componentType', { unique: false });
          objectStore.createIndex('componentSubType', 'componentSubType', { unique: false });
          objectStore.createIndex('componentId', 'componentId', { unique: false });
          objectStore.createIndex('viewId', 'viewId', { unique: false });
          objectStore.createIndex('userId', 'userId', { unique: false });
          objectStore.createIndex('appId', 'appId', { unique: false });
          objectStore.createIndex('name', 'name', { unique: false });
          objectStore.createIndex('isActive', 'isActive', { unique: false });
          objectStore.createIndex('isDeleted', 'isDeleted', { unique: false });
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
          objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          
          // Compound indexes for common queries
          objectStore.createIndex('component', ['componentType', 'componentId'], { unique: false });
          objectStore.createIndex('userComponent', ['userId', 'componentType'], { unique: false });
          
          console.log('[ConfigurationServiceAdapter] Object store and indexes created');
        }
      };
    });
  }
  
  /**
   * Ensure database is initialized
   */
  private ensureDb(): void {
    if (!this.db) {
      throw new Error('[ConfigurationServiceAdapter] Database not initialized');
    }
  }
  
  /**
   * Create a new configuration record
   */
  async create(record: ConfigurationRecord): Promise<string> {
    this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Ensure record has required fields
      const completeRecord: ConfigurationRecord = {
        ...record,
        id: record.id || uuidv4(),
        version: record.version || 1,
        isActive: record.isActive !== undefined ? record.isActive : true,
        isDeleted: record.isDeleted !== undefined ? record.isDeleted : false,
        createdAt: record.createdAt || new Date(),
        updatedAt: record.updatedAt || new Date()
      };
      
      const request = store.add(completeRecord);
      
      request.onsuccess = () => {
        console.log('[ConfigurationServiceAdapter] Configuration created:', completeRecord.id);
        resolve(completeRecord.id);
      };
      
      request.onerror = () => {
        console.error('[ConfigurationServiceAdapter] Failed to create configuration:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Read a configuration record by ID
   */
  async read(id: string): Promise<ConfigurationRecord | null> {
    this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const record = request.result as ConfigurationRecord | undefined;
        if (record && !record.isDeleted) {
          resolve(record);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('[ConfigurationServiceAdapter] Failed to read configuration:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Update an existing configuration record
   */
  async update(id: string, updates: Partial<ConfigurationRecord>): Promise<void> {
    this.ensureDb();
    
    return new Promise(async (resolve, reject) => {
      try {
        // First read the existing record
        const existing = await this.read(id);
        if (!existing) {
          reject(new Error(`Configuration ${id} not found`));
          return;
        }
        
        // Merge updates with existing record
        const updated: ConfigurationRecord = {
          ...existing,
          ...updates,
          id: existing.id, // Preserve original ID
          createdAt: existing.createdAt, // Preserve creation time
          updatedAt: new Date(), // Update modification time
          version: existing.version + 1 // Increment version
        };
        
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(updated);
        
        request.onsuccess = () => {
          console.log('[ConfigurationServiceAdapter] Configuration updated:', id);
          resolve();
        };
        
        request.onerror = () => {
          console.error('[ConfigurationServiceAdapter] Failed to update configuration:', request.error);
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Soft delete a configuration record
   */
  async delete(id: string): Promise<void> {
    // Soft delete - mark as deleted but keep the record
    await this.update(id, {
      isDeleted: true,
      deletedAt: new Date()
    });
  }
  
  /**
   * Query configuration records with filters
   */
  async query(filter: ConfigurationFilter): Promise<ConfigurationRecord[]> {
    this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const results: ConfigurationRecord[] = [];
      
      // Determine which index to use based on filter
      let cursor: IDBRequest<IDBCursorWithValue | null>;
      
      if (filter.componentType && filter.componentId) {
        const index = store.index('component');
        const range = IDBKeyRange.only([filter.componentType, filter.componentId]);
        cursor = index.openCursor(range);
      } else if (filter.componentType) {
        const index = store.index('componentType');
        const range = IDBKeyRange.only(filter.componentType);
        cursor = index.openCursor(range);
      } else if (filter.viewId) {
        const index = store.index('viewId');
        const range = IDBKeyRange.only(filter.viewId);
        cursor = index.openCursor(range);
      } else if (filter.userId) {
        const index = store.index('userId');
        const range = IDBKeyRange.only(filter.userId);
        cursor = index.openCursor(range);
      } else {
        cursor = store.openCursor();
      }
      
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value as ConfigurationRecord;
          
          // Apply additional filters
          let matches = true;
          
          // Check deleted status
          if (!filter.includeDeleted && record.isDeleted) {
            matches = false;
          }
          
          // Check other filter criteria
          if (matches && filter.componentSubType && record.componentSubType !== filter.componentSubType) {
            matches = false;
          }
          if (matches && filter.appId && record.appId !== filter.appId) {
            matches = false;
          }
          if (matches && filter.name && record.name !== filter.name) {
            matches = false;
          }
          if (matches && filter.isActive !== undefined && record.isActive !== filter.isActive) {
            matches = false;
          }
          
          if (matches) {
            results.push(record);
          }
          
          cursor.continue();
        } else {
          // Sort results by updatedAt descending (most recent first)
          results.sort((a, b) => {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return dateB - dateA;
          });
          
          resolve(results);
        }
      };
      
      cursor.onerror = () => {
        console.error('[ConfigurationServiceAdapter] Query failed:', cursor.error);
        reject(cursor.error);
      };
    });
  }
  
  /**
   * Count configuration records matching filter
   */
  async count(filter: ConfigurationFilter): Promise<number> {
    const results = await this.query(filter);
    return results.length;
  }
  
  /**
   * Bulk create configuration records
   */
  async bulkCreate(records: ConfigurationRecord[]): Promise<string[]> {
    const ids: string[] = [];
    for (const record of records) {
      const id = await this.create(record);
      ids.push(id);
    }
    return ids;
  }
  
  /**
   * Bulk update configuration records
   */
  async bulkUpdate(updates: Array<{id: string, changes: Partial<ConfigurationRecord>}>): Promise<void> {
    for (const update of updates) {
      await this.update(update.id, update.changes);
    }
  }
  
  /**
   * Bulk delete configuration records
   */
  async bulkDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }
  
  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    totalRecords: number;
    activeRecords: number;
    deletedRecords: number;
    byComponentType: Record<string, number>;
  }> {
    this.ensureDb();
    
    const allRecords = await this.query({ includeDeleted: true });
    
    const stats = {
      totalRecords: allRecords.length,
      activeRecords: allRecords.filter(r => !r.isDeleted).length,
      deletedRecords: allRecords.filter(r => r.isDeleted).length,
      byComponentType: {} as Record<string, number>
    };
    
    // Count by component type
    allRecords.forEach(record => {
      if (!record.isDeleted) {
        stats.byComponentType[record.componentType] = 
          (stats.byComponentType[record.componentType] || 0) + 1;
      }
    });
    
    return stats;
  }
  
  /**
   * Clear all configuration records (use with caution!)
   */
  async clearAll(): Promise<void> {
    this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.warn('[ConfigurationServiceAdapter] All configurations cleared');
        resolve();
      };
      
      request.onerror = () => {
        console.error('[ConfigurationServiceAdapter] Failed to clear configurations:', request.error);
        reject(request.error);
      };
    });
  }
}