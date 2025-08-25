/**
 * Profile Registry - Maps view instances to profile storage
 * This allows profiles to persist even when view IDs change
 * Now uses Configuration Service for centralized storage
 */

import { StorageClient } from '../storage/storageClient';
import { UnifiedConfig } from '../storage/types';

interface ViewMapping {
  viewType: string;
  viewName: string;
  profileStorageId: string;
  createdAt: string;
  lastAccessed: string;
}

interface ProfileRegistryConfig {
  mappings: ViewMapping[];
  version: string;
}

export class ProfileRegistry {
  private static readonly CONFIG_ID = 'agv3-profile-registry';
  private static registryCache: ViewMapping[] | null = null;
  
  /**
   * Get or create a stable profile storage ID for a view
   */
  static async getProfileStorageId(viewType: string, viewName?: string): Promise<string> {
    const registry = await this.loadRegistry();
    
    // Look for existing mapping
    const existingMapping = registry.find(m => 
      m.viewType === viewType && 
      (!viewName || m.viewName === viewName)
    );
    
    if (existingMapping) {
      // Update last accessed time
      existingMapping.lastAccessed = new Date().toISOString();
      await this.saveRegistry(registry);
      return existingMapping.profileStorageId;
    }
    
    // Create new mapping with stable ID
    const newMapping: ViewMapping = {
      viewType,
      viewName: viewName || `${viewType}-default`,
      profileStorageId: `profile-${viewType}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    registry.push(newMapping);
    await this.saveRegistry(registry);
    
    return newMapping.profileStorageId;
  }
  
  /**
   * Get all mappings for a view type
   */
  static async getMappingsForType(viewType: string): Promise<ViewMapping[]> {
    const registry = await this.loadRegistry();
    return registry.filter(m => m.viewType === viewType);
  }
  
  /**
   * Clean up old unused mappings (optional)
   */
  static async cleanupOldMappings(daysToKeep: number = 30): Promise<void> {
    const registry = await this.loadRegistry();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const activeRegistry = registry.filter(m => 
      new Date(m.lastAccessed) > cutoffDate
    );
    
    await this.saveRegistry(activeRegistry);
  }
  
  private static async loadRegistry(): Promise<ViewMapping[]> {
    try {
      // Check cache first
      if (this.registryCache !== null) {
        return this.registryCache;
      }
      
      // Load from Configuration Service
      const config = await StorageClient.get(this.CONFIG_ID);
      
      if (config && config.config) {
        const registryConfig = config.config as ProfileRegistryConfig;
        this.registryCache = registryConfig.mappings || [];
        return this.registryCache;
      }
      
      // Migrate from localStorage if exists
      const legacyData = localStorage.getItem('agv3-profile-registry');
      if (legacyData) {
        try {
          const legacyRegistry = JSON.parse(legacyData);
          console.log('[ProfileRegistry] Migrating from localStorage to Configuration Service');
          
          // Save to Configuration Service
          await this.saveRegistry(legacyRegistry);
          
          // Remove from localStorage
          localStorage.removeItem('agv3-profile-registry');
          
          return legacyRegistry;
        } catch (error) {
          console.error('[ProfileRegistry] Failed to migrate legacy data:', error);
        }
      }
      
      return [];
    } catch (error) {
      console.error('[ProfileRegistry] Failed to load registry:', error);
      return [];
    }
  }
  
  private static async saveRegistry(registry: ViewMapping[]): Promise<void> {
    try {
      // Update cache
      this.registryCache = registry;
      
      const registryConfig: ProfileRegistryConfig = {
        mappings: registry,
        version: '2.0.0'
      };
      
      // Check if config exists
      const existing = await StorageClient.get(this.CONFIG_ID);
      
      if (existing) {
        // Update existing
        await StorageClient.update(this.CONFIG_ID, {
          config: registryConfig,
          lastUpdated: new Date(),
          lastUpdatedBy: 'system'
        });
      } else {
        // Create new
        const unifiedConfig: UnifiedConfig = {
          configId: this.CONFIG_ID,
          appId: 'agv3',
          userId: 'system',
          componentType: 'system',
          componentSubType: 'profile-registry',
          name: 'Profile Registry',
          description: 'Maps view instances to profile storage IDs',
          config: registryConfig,
          settings: [],
          activeSetting: 'default',
          createdBy: 'system',
          lastUpdatedBy: 'system',
          creationTime: new Date(),
          lastUpdated: new Date()
        };
        
        await StorageClient.save(unifiedConfig);
      }
    } catch (error) {
      console.error('[ProfileRegistry] Failed to save registry:', error);
      throw error;
    }
  }
  
  /**
   * Clear the cache (useful when profiles are updated externally)
   */
  static clearCache(): void {
    this.registryCache = null;
  }
}