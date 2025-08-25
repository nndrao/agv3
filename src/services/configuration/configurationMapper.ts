import { UnifiedConfig, ConfigVersion } from '../storage/types';
import { ConfigurationRecord } from '../openfin/ServiceContext';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utility class to map between UnifiedConfig and ConfigurationRecord formats
 * 
 * UnifiedConfig: Used by components and StorageClient (legacy)
 * ConfigurationRecord: Used by Configuration Service (centralized)
 */
export class ConfigurationMapper {
  /**
   * Convert UnifiedConfig to ConfigurationRecord
   * Used when saving configurations to the centralized service
   */
  static toConfigurationRecord(config: UnifiedConfig): ConfigurationRecord {
    return {
      id: config.configId,
      componentType: config.componentType,
      componentSubType: config.componentSubType,
      componentId: config.configId, // Using configId as componentId
      viewId: config.configId, // For view-specific configs, this is the view instance ID
      userId: config.userId || 'default',
      appId: config.appId || 'agv3',
      name: config.name,
      description: config.description,
      config: config.config,
      settings: config.settings, // Array of ConfigVersion objects
      metadata: {
        tags: config.tags,
        category: config.category,
        isShared: config.isShared,
        isDefault: config.isDefault,
        isLocked: config.isLocked,
        activeSetting: config.activeSetting,
        createdBy: config.createdBy,
        lastUpdatedBy: config.lastUpdatedBy
      },
      version: 1, // Will be incremented by the service
      isActive: true,
      isDeleted: config.deletedAt ? true : false,
      createdAt: config.creationTime || new Date(),
      updatedAt: config.lastUpdated || new Date(),
      deletedAt: config.deletedAt
    };
  }
  
  /**
   * Convert ConfigurationRecord to UnifiedConfig
   * Used when reading configurations from the centralized service
   */
  static toUnifiedConfig(record: ConfigurationRecord): UnifiedConfig {
    return {
      configId: record.id,
      appId: record.appId,
      userId: record.userId || 'default',
      componentType: record.componentType as any,
      componentSubType: record.componentSubType,
      name: record.name,
      description: record.description,
      icon: undefined, // Not in ConfigurationRecord
      config: record.config || {},
      settings: record.settings || [],
      activeSetting: record.metadata?.activeSetting || 'default',
      tags: record.metadata?.tags,
      category: record.metadata?.category,
      isShared: record.metadata?.isShared,
      isDefault: record.metadata?.isDefault,
      isLocked: record.metadata?.isLocked,
      createdBy: record.metadata?.createdBy || record.userId || 'system',
      lastUpdatedBy: record.metadata?.lastUpdatedBy || record.userId || 'system',
      creationTime: record.createdAt || new Date(),
      lastUpdated: record.updatedAt || new Date(),
      deletedAt: record.deletedAt,
      deletedBy: record.isDeleted ? record.userId : undefined
    };
  }
  
  /**
   * Create a new ConfigurationRecord for creation
   * Omits fields that will be set by the service
   */
  static createConfigurationRecord(
    config: Partial<UnifiedConfig>,
    componentType: string,
    viewId?: string
  ): Omit<ConfigurationRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'> {
    const configId = config.configId || uuidv4();
    
    return {
      componentType: componentType,
      componentSubType: config.componentSubType,
      componentId: configId,
      viewId: viewId || configId,
      userId: config.userId || 'default',
      appId: config.appId || 'agv3',
      name: config.name || `${componentType} Configuration`,
      description: config.description,
      config: config.config || {},
      settings: config.settings || [],
      metadata: {
        tags: config.tags,
        category: config.category,
        isShared: config.isShared,
        isDefault: config.isDefault,
        isLocked: config.isLocked,
        activeSetting: config.activeSetting || 'default',
        createdBy: config.createdBy || 'system',
        lastUpdatedBy: config.lastUpdatedBy || 'system'
      },
      isActive: true,
      isDeleted: false
    };
  }
  
  /**
   * Create update payload for ConfigurationRecord
   * Only includes fields that should be updated
   */
  static createUpdatePayload(
    updates: Partial<UnifiedConfig>
  ): Partial<ConfigurationRecord> {
    const payload: Partial<ConfigurationRecord> = {};
    
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.config !== undefined) payload.config = updates.config;
    if (updates.settings !== undefined) payload.settings = updates.settings;
    
    // Build metadata updates
    const metadata: any = {};
    if (updates.tags !== undefined) metadata.tags = updates.tags;
    if (updates.category !== undefined) metadata.category = updates.category;
    if (updates.isShared !== undefined) metadata.isShared = updates.isShared;
    if (updates.isDefault !== undefined) metadata.isDefault = updates.isDefault;
    if (updates.isLocked !== undefined) metadata.isLocked = updates.isLocked;
    if (updates.activeSetting !== undefined) metadata.activeSetting = updates.activeSetting;
    if (updates.lastUpdatedBy !== undefined) metadata.lastUpdatedBy = updates.lastUpdatedBy;
    
    if (Object.keys(metadata).length > 0) {
      payload.metadata = metadata;
    }
    
    // Handle soft delete
    if (updates.deletedAt !== undefined) {
      payload.isDeleted = true;
      payload.deletedAt = updates.deletedAt;
    }
    
    return payload;
  }
  
  /**
   * Convert array of ConfigurationRecords to UnifiedConfigs
   */
  static toUnifiedConfigs(records: ConfigurationRecord[]): UnifiedConfig[] {
    return records.map(record => this.toUnifiedConfig(record));
  }
  
  /**
   * Convert array of UnifiedConfigs to ConfigurationRecords
   */
  static toConfigurationRecords(configs: UnifiedConfig[]): ConfigurationRecord[] {
    return configs.map(config => this.toConfigurationRecord(config));
  }
  
  /**
   * Check if a configuration record matches a UnifiedConfig query
   */
  static matchesQuery(record: ConfigurationRecord, query: {
    appId?: string;
    userId?: string;
    componentType?: string;
    componentSubType?: string;
    tags?: string[];
    isShared?: boolean;
  }): boolean {
    if (query.appId && record.appId !== query.appId) return false;
    if (query.userId && record.userId !== query.userId) return false;
    if (query.componentType && record.componentType !== query.componentType) return false;
    if (query.componentSubType && record.componentSubType !== query.componentSubType) return false;
    if (query.isShared !== undefined && record.metadata?.isShared !== query.isShared) return false;
    
    // Check tags
    if (query.tags && query.tags.length > 0) {
      const recordTags = record.metadata?.tags || [];
      const hasAllTags = query.tags.every(tag => recordTags.includes(tag));
      if (!hasAllTags) return false;
    }
    
    return true;
  }
}