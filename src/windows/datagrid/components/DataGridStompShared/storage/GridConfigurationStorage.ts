import { StorageClient } from '@/services/storage/storageClient';
import { UnifiedConfig } from '@/services/storage/types';

/**
 * Base class for grid-level configuration storage
 * Uses the centralized Configuration Service via StorageClient
 * This replaces direct localStorage usage with IndexedDB storage
 */
export class GridConfigurationStorage {
  /**
   * Get a configuration key for a specific grid instance and configuration type
   */
  protected static getConfigId(gridInstanceId: string, configType: string): string {
    return `grid_${configType}_${gridInstanceId}`;
  }
  
  /**
   * Load configuration for a specific grid instance
   */
  protected static async loadConfig<T>(
    gridInstanceId: string, 
    configType: string,
    defaultValue: T
  ): Promise<T> {
    try {
      const configId = this.getConfigId(gridInstanceId, configType);
      const config = await StorageClient.get(configId);
      
      if (!config || !config.config) {
        console.log(`[GridConfigurationStorage] No ${configType} configuration found for grid: ${gridInstanceId}`);
        return defaultValue;
      }
      
      console.log(`[GridConfigurationStorage] Loaded ${configType} configuration for grid: ${gridInstanceId}`);
      return config.config as T;
    } catch (error) {
      console.error(`[GridConfigurationStorage] Error loading ${configType} for grid ${gridInstanceId}:`, error);
      return defaultValue;
    }
  }
  
  /**
   * Save configuration for a specific grid instance
   */
  protected static async saveConfig<T>(
    gridInstanceId: string,
    configType: string,
    data: T,
    name?: string
  ): Promise<void> {
    try {
      const configId = this.getConfigId(gridInstanceId, configType);
      
      // Check if config already exists
      const existingConfig = await StorageClient.get(configId);
      
      if (existingConfig) {
        // Update existing configuration
        await StorageClient.update(configId, {
          config: data,
          lastUpdated: new Date(),
          lastUpdatedBy: 'current-user'
        });
        console.log(`[GridConfigurationStorage] Updated ${configType} configuration for grid: ${gridInstanceId}`);
      } else {
        // Create new configuration
        const unifiedConfig: UnifiedConfig = {
          configId,
          appId: 'agv3',
          userId: 'current-user',
          componentType: 'grid',
          componentSubType: configType,
          name: name || `${configType} for ${gridInstanceId}`,
          description: `Grid-level ${configType} configuration`,
          config: data,
          settings: [],
          activeSetting: 'default',
          createdBy: 'current-user',
          lastUpdatedBy: 'current-user',
          creationTime: new Date(),
          lastUpdated: new Date()
        };
        
        await StorageClient.save(unifiedConfig);
        console.log(`[GridConfigurationStorage] Created ${configType} configuration for grid: ${gridInstanceId}`);
      }
    } catch (error) {
      console.error(`[GridConfigurationStorage] Error saving ${configType} for grid ${gridInstanceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete configuration for a specific grid instance
   */
  protected static async deleteConfig(
    gridInstanceId: string,
    configType: string
  ): Promise<void> {
    try {
      const configId = this.getConfigId(gridInstanceId, configType);
      await StorageClient.delete(configId);
      console.log(`[GridConfigurationStorage] Deleted ${configType} configuration for grid: ${gridInstanceId}`);
    } catch (error) {
      console.error(`[GridConfigurationStorage] Error deleting ${configType} for grid ${gridInstanceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if configuration exists for a specific grid instance
   */
  protected static async configExists(
    gridInstanceId: string,
    configType: string
  ): Promise<boolean> {
    try {
      const configId = this.getConfigId(gridInstanceId, configType);
      const config = await StorageClient.get(configId);
      return config !== null;
    } catch (error) {
      console.error(`[GridConfigurationStorage] Error checking ${configType} existence for grid ${gridInstanceId}:`, error);
      return false;
    }
  }
}