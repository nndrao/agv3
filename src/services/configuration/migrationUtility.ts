import { IndexedDBAdapter } from '../storage/adapters/IndexedDBAdapter';
import { ConfigurationServiceAdapter } from './ConfigurationServiceAdapter';
import { UnifiedConfig } from '../storage/types';
import { ConfigurationRecord } from '../openfin/ServiceContext';

/**
 * Migration utility to move configurations from local storage to centralized storage
 * 
 * This one-time migration moves all configurations from:
 * - Source: agv3-storage (local IndexedDB)
 * - Destination: agv3-configuration (centralized IndexedDB)
 */
export class ConfigurationMigrationUtility {
  private static MIGRATION_FLAG_KEY = 'agv3-config-migration-v1';
  
  /**
   * Check if migration has already been completed
   */
  private static isMigrationComplete(): boolean {
    try {
      const flag = localStorage.getItem(this.MIGRATION_FLAG_KEY);
      return flag === 'completed';
    } catch {
      // If localStorage is not available, check IndexedDB
      return false;
    }
  }
  
  /**
   * Mark migration as complete
   */
  private static markMigrationComplete(): void {
    try {
      localStorage.setItem(this.MIGRATION_FLAG_KEY, 'completed');
      console.log('[Migration] Migration marked as complete');
    } catch {
      console.warn('[Migration] Could not mark migration in localStorage');
    }
  }
  
  /**
   * Convert UnifiedConfig to ConfigurationRecord format
   */
  private static mapToConfigurationRecord(config: UnifiedConfig): ConfigurationRecord {
    return {
      id: config.configId,
      componentType: config.componentType,
      componentSubType: config.componentSubType,
      componentId: config.configId, // Using configId as componentId
      viewId: config.configId, // For view-specific configs
      userId: config.userId,
      appId: config.appId,
      name: config.name,
      description: config.description || '',
      config: config.config,
      settings: config.settings,
      metadata: {
        tags: config.tags,
        category: config.category,
        isShared: config.isShared,
        isDefault: config.isDefault,
        isLocked: config.isLocked,
        activeSetting: config.activeSetting
      },
      version: 1,
      isActive: true,
      isDeleted: false,
      createdAt: config.creationTime || new Date(),
      updatedAt: config.lastUpdated || new Date()
    };
  }
  
  /**
   * Run the migration
   */
  static async migrate(): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      migratedCount: 0,
      errors: [] as string[]
    };
    
    try {
      // Check if migration already completed
      if (this.isMigrationComplete()) {
        console.log('[Migration] Migration already completed, skipping');
        result.success = true;
        return result;
      }
      
      console.log('[Migration] Starting configuration migration...');
      
      // Initialize source adapter (old storage)
      const sourceAdapter = new IndexedDBAdapter();
      await sourceAdapter.initialize();
      console.log('[Migration] Source adapter initialized (agv3-storage)');
      
      // Initialize destination adapter (centralized storage)
      const destAdapter = new ConfigurationServiceAdapter();
      await destAdapter.initialize();
      console.log('[Migration] Destination adapter initialized (agv3-configuration)');
      
      // Query all configurations from source
      const sourceConfigs = await sourceAdapter.query({});
      console.log(`[Migration] Found ${sourceConfigs.length} configurations to migrate`);
      
      if (sourceConfigs.length === 0) {
        console.log('[Migration] No configurations to migrate');
        this.markMigrationComplete();
        result.success = true;
        return result;
      }
      
      // Migrate each configuration
      for (const sourceConfig of sourceConfigs) {
        try {
          // Check if already exists in destination
          const existing = await destAdapter.read(sourceConfig.configId);
          
          if (existing) {
            console.log(`[Migration] Config ${sourceConfig.configId} already exists in destination, skipping`);
            continue;
          }
          
          // Convert to ConfigurationRecord format
          const configRecord = this.mapToConfigurationRecord(sourceConfig);
          
          // Create in destination
          await destAdapter.create(configRecord);
          result.migratedCount++;
          
          console.log(`[Migration] Migrated config: ${sourceConfig.name} (${sourceConfig.configId})`);
        } catch (error) {
          const errorMsg = `Failed to migrate config ${sourceConfig.configId}: ${error}`;
          console.error(`[Migration] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
      
      // Mark migration as complete
      this.markMigrationComplete();
      result.success = true;
      
      console.log(`[Migration] Migration completed: ${result.migratedCount} configs migrated`);
      
      if (result.errors.length > 0) {
        console.warn(`[Migration] ${result.errors.length} errors occurred during migration`);
      }
      
    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      console.error(`[Migration] ${errorMsg}`);
      result.errors.push(errorMsg);
    }
    
    return result;
  }
  
  /**
   * Verify migration by comparing counts
   */
  static async verify(): Promise<{
    sourceCount: number;
    destCount: number;
    isValid: boolean;
  }> {
    try {
      // Count in source
      const sourceAdapter = new IndexedDBAdapter();
      await sourceAdapter.initialize();
      const sourceConfigs = await sourceAdapter.query({});
      const sourceCount = sourceConfigs.length;
      
      // Count in destination
      const destAdapter = new ConfigurationServiceAdapter();
      await destAdapter.initialize();
      const destConfigs = await destAdapter.query({ includeDeleted: false });
      const destCount = destConfigs.length;
      
      console.log(`[Migration] Verification: Source=${sourceCount}, Destination=${destCount}`);
      
      return {
        sourceCount,
        destCount,
        isValid: destCount >= sourceCount // Destination should have at least as many
      };
    } catch (error) {
      console.error('[Migration] Verification failed:', error);
      return {
        sourceCount: -1,
        destCount: -1,
        isValid: false
      };
    }
  }
  
  /**
   * Rollback migration (clear destination and reset flag)
   * USE WITH CAUTION - This will delete all centralized configurations!
   */
  static async rollback(): Promise<void> {
    if (!confirm('WARNING: This will delete all centralized configurations. Are you sure?')) {
      return;
    }
    
    try {
      console.log('[Migration] Starting rollback...');
      
      // Clear destination database
      const destAdapter = new ConfigurationServiceAdapter();
      await destAdapter.initialize();
      await destAdapter.clearAll();
      
      // Reset migration flag
      localStorage.removeItem(this.MIGRATION_FLAG_KEY);
      
      console.log('[Migration] Rollback completed');
    } catch (error) {
      console.error('[Migration] Rollback failed:', error);
      throw error;
    }
  }
}

// Export convenience function for automatic migration on app start
export async function runConfigurationMigration(): Promise<void> {
  try {
    const result = await ConfigurationMigrationUtility.migrate();
    
    if (result.success) {
      console.log(`[Migration] Auto-migration successful: ${result.migratedCount} configs migrated`);
    } else if (result.errors.length > 0) {
      console.error('[Migration] Auto-migration had errors:', result.errors);
    }
  } catch (error) {
    console.error('[Migration] Auto-migration failed:', error);
  }
}