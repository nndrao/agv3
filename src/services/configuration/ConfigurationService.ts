/**
 * Configuration Service
 * 
 * Centralized configuration management service with IndexedDB storage.
 * Runs in the Service Manager window and provides IAB access to all clients.
 */

import { 
  ConfigurationRecord, 
  ConfigurationFilter, 
  ConfigurationEvent 
} from '../openfin/ServiceContext';
import { v4 as uuidv4 } from 'uuid';

export class ConfigurationService {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'agv3-configuration';
  private readonly storeName = 'configurations';
  private readonly dbVersion = 1;
  private subscribers: Map<string, Set<(event: ConfigurationEvent) => void>> = new Map();
  private cache: Map<string, ConfigurationRecord> = new Map();
  private cacheTimeout = 60000; // 1 minute
  private cacheTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    console.log('[ConfigurationService] Instance created');
  }

  /**
   * Initialize the service and IndexedDB
   */
  async initialize(): Promise<void> {
    console.log('[ConfigurationService] Initializing IndexedDB...');
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[ConfigurationService] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ConfigurationService] IndexedDB initialized');
        
        // Set up error handling for the database
        this.db.onerror = (event) => {
          console.error('[ConfigurationService] Database error:', event);
        };
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('[ConfigurationService] Upgrading database schema...');
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create configurations object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id',
            autoIncrement: false 
          });
          
          // Create indexes for efficient querying
          store.createIndex('componentType', 'componentType', { unique: false });
          store.createIndex('componentSubType', 'componentSubType', { unique: false });
          store.createIndex('componentId', 'componentId', { unique: false });
          store.createIndex('viewId', 'viewId', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('appId', 'appId', { unique: false });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('isActive', 'isActive', { unique: false });
          store.createIndex('isDeleted', 'isDeleted', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          
          // Compound indexes for common queries
          store.createIndex('componentType_componentId', ['componentType', 'componentId'], { unique: false });
          store.createIndex('appId_componentType', ['appId', 'componentType'], { unique: false });
          store.createIndex('userId_componentType', ['userId', 'componentType'], { unique: false });
          
          console.log('[ConfigurationService] Database schema created');
        }
      };
    });
  }

  /**
   * Get a configuration by ID
   */
  async get(id: string): Promise<ConfigurationRecord | null> {
    // Check cache first
    if (this.cache.has(id)) {
      console.log(`[ConfigurationService] Cache hit for ${id}`);
      return this.cache.get(id)!;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as ConfigurationRecord | undefined;
        
        if (record && !record.isDeleted) {
          // Convert dates from strings back to Date objects
          record.createdAt = new Date(record.createdAt);
          record.updatedAt = new Date(record.updatedAt);
          if (record.deletedAt) {
            record.deletedAt = new Date(record.deletedAt);
          }
          
          // Cache the record
          this.cacheRecord(record);
          
          resolve(record);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[ConfigurationService] Failed to get record:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Create a new configuration
   */
  async create(record: Omit<ConfigurationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfigurationRecord> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const newRecord: ConfigurationRecord = {
      ...record,
      id: uuidv4(),
      version: record.version || 1,
      isActive: record.isActive ?? true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(newRecord);

      request.onsuccess = () => {
        console.log(`[ConfigurationService] Created configuration: ${newRecord.id}`);
        
        // Cache the new record
        this.cacheRecord(newRecord);
        
        // Notify subscribers
        this.notifySubscribers({
          type: 'created',
          record: newRecord,
          timestamp: new Date()
        });
        
        resolve(newRecord);
      };

      request.onerror = () => {
        console.error('[ConfigurationService] Failed to create record:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update an existing configuration
   */
  async update(id: string, updates: Partial<ConfigurationRecord>): Promise<ConfigurationRecord> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Get existing record
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Configuration not found: ${id}`);
    }

    // Merge updates
    const updatedRecord: ConfigurationRecord = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID cannot be changed
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date(),
      version: (existing.version || 1) + 1
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updatedRecord);

      request.onsuccess = () => {
        console.log(`[ConfigurationService] Updated configuration: ${id}`);
        
        // Update cache
        this.cacheRecord(updatedRecord);
        
        // Notify subscribers
        this.notifySubscribers({
          type: 'updated',
          record: updatedRecord,
          timestamp: new Date()
        });
        
        resolve(updatedRecord);
      };

      request.onerror = () => {
        console.error('[ConfigurationService] Failed to update record:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a configuration (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Get existing record
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    // Soft delete
    const deletedRecord: ConfigurationRecord = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(deletedRecord);

      request.onsuccess = () => {
        console.log(`[ConfigurationService] Soft deleted configuration: ${id}`);
        
        // Remove from cache
        this.invalidateCache(id);
        
        // Notify subscribers
        this.notifySubscribers({
          type: 'deleted',
          record: deletedRecord,
          timestamp: new Date()
        });
        
        resolve(true);
      };

      request.onerror = () => {
        console.error('[ConfigurationService] Failed to delete record:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Query configurations with filters
   */
  async query(filter: ConfigurationFilter): Promise<ConfigurationRecord[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const results: ConfigurationRecord[] = [];

      // Determine which index to use based on filter
      let request: IDBRequest;
      
      if (filter.componentType && filter.componentId) {
        const index = store.index('componentType_componentId');
        const range = IDBKeyRange.only([filter.componentType, filter.componentId]);
        request = index.openCursor(range);
      } else if (filter.appId && filter.componentType) {
        const index = store.index('appId_componentType');
        const range = IDBKeyRange.only([filter.appId, filter.componentType]);
        request = index.openCursor(range);
      } else if (filter.componentType) {
        const index = store.index('componentType');
        const range = IDBKeyRange.only(filter.componentType);
        request = index.openCursor(range);
      } else if (filter.appId) {
        const index = store.index('appId');
        const range = IDBKeyRange.only(filter.appId);
        request = index.openCursor(range);
      } else {
        // Get all records
        request = store.openCursor();
      }

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const record = cursor.value as ConfigurationRecord;
          
          // Apply additional filters
          let include = true;
          
          // Skip deleted records unless explicitly requested
          if (!filter.includeDeleted && record.isDeleted) {
            include = false;
          }
          
          // Apply other filters
          if (include && filter.componentSubType && record.componentSubType !== filter.componentSubType) include = false;
          if (include && filter.viewId && record.viewId !== filter.viewId) include = false;
          if (include && filter.userId && record.userId !== filter.userId) include = false;
          if (include && filter.name && record.name !== filter.name) include = false;
          if (include && filter.isActive !== undefined && record.isActive !== filter.isActive) include = false;
          
          if (include) {
            // Convert dates
            record.createdAt = new Date(record.createdAt);
            record.updatedAt = new Date(record.updatedAt);
            if (record.deletedAt) {
              record.deletedAt = new Date(record.deletedAt);
            }
            
            results.push(record);
          }
          
          cursor.continue();
        } else {
          console.log(`[ConfigurationService] Query returned ${results.length} records`);
          resolve(results);
        }
      };

      request.onerror = () => {
        console.error('[ConfigurationService] Query failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(filter: ConfigurationFilter, callback: (event: ConfigurationEvent) => void): () => void {
    const filterKey = JSON.stringify(filter);
    
    if (!this.subscribers.has(filterKey)) {
      this.subscribers.set(filterKey, new Set());
    }
    
    this.subscribers.get(filterKey)!.add(callback);
    
    console.log(`[ConfigurationService] Subscriber added for filter: ${filterKey}`);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(filterKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(filterKey);
        }
      }
      console.log(`[ConfigurationService] Subscriber removed for filter: ${filterKey}`);
    };
  }

  /**
   * Notify subscribers of changes
   */
  private notifySubscribers(event: ConfigurationEvent): void {
    for (const [filterKey, callbacks] of this.subscribers) {
      const filter = JSON.parse(filterKey) as ConfigurationFilter;
      
      // Check if event matches filter
      if (this.eventMatchesFilter(event, filter)) {
        callbacks.forEach(callback => {
          try {
            callback(event);
          } catch (error) {
            console.error('[ConfigurationService] Subscriber callback error:', error);
          }
        });
      }
    }
    
    // Also broadcast via IAB for cross-window subscribers
    this.broadcastEvent(event);
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
   * Broadcast event via IAB
   */
  private async broadcastEvent(event: ConfigurationEvent): Promise<void> {
    try {
      if (typeof fin !== 'undefined') {
        await fin.InterApplicationBus.publish('configuration-events', event);
      }
    } catch (error) {
      console.warn('[ConfigurationService] Failed to broadcast event:', error);
    }
  }

  /**
   * Cache a record
   */
  private cacheRecord(record: ConfigurationRecord): void {
    const id = record.id;
    
    // Clear existing timer
    if (this.cacheTimers.has(id)) {
      clearTimeout(this.cacheTimers.get(id)!);
    }
    
    // Cache the record
    this.cache.set(id, record);
    
    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(id);
      this.cacheTimers.delete(id);
      console.log(`[ConfigurationService] Cache expired for ${id}`);
    }, this.cacheTimeout);
    
    this.cacheTimers.set(id, timer);
  }

  /**
   * Invalidate cache for a record
   */
  private invalidateCache(id: string): void {
    this.cache.delete(id);
    
    if (this.cacheTimers.has(id)) {
      clearTimeout(this.cacheTimers.get(id)!);
      this.cacheTimers.delete(id);
    }
  }

  /**
   * Get statistics about the service
   */
  async getStatistics(): Promise<any> {
    if (!this.db) {
      return { error: 'Database not initialized' };
    }

    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve) => {
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        resolve({
          totalRecords: countRequest.result,
          cacheSize: this.cache.size,
          subscriberCount: this.subscribers.size,
          dbName: this.dbName,
          storeName: this.storeName
        });
      };
      
      countRequest.onerror = () => {
        resolve({ error: 'Failed to get statistics' });
      };
    });
  }

  /**
   * Clear all configurations (dangerous!)
   */
  async clearAll(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Count before clearing
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          console.log(`[ConfigurationService] Cleared ${count} records`);
          
          // Clear cache
          this.cache.clear();
          this.cacheTimers.forEach(timer => clearTimeout(timer));
          this.cacheTimers.clear();
          
          resolve(count);
        };
        
        clearRequest.onerror = () => {
          reject(clearRequest.error);
        };
      };
      
      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  }

  /**
   * Destroy the service and clean up resources
   */
  async destroy(): Promise<void> {
    // Clear cache
    this.cache.clear();
    this.cacheTimers.forEach(timer => clearTimeout(timer));
    this.cacheTimers.clear();
    
    // Clear subscribers
    this.subscribers.clear();
    
    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    console.log('[ConfigurationService] Service destroyed');
  }
}