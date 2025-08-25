import { ColumnGroupDefinition, ColumnGroupConfiguration } from './types';
import { GridConfigurationStorage } from '../storage/GridConfigurationStorage';

/**
 * Grid-level column group storage service
 * Manages column groups that are shared across all profiles for a specific grid instance
 * Now uses the centralized Configuration Service via GridConfigurationStorage
 */
export class GridColumnGroupStorage extends GridConfigurationStorage {
  private static readonly CONFIG_TYPE = 'column_groups';
  
  /**
   * Load all column groups for a grid instance
   */
  static async loadColumnGroups(gridInstanceId: string): Promise<ColumnGroupDefinition[]> {
    const config = await this.loadConfig<ColumnGroupConfiguration>(
      gridInstanceId,
      this.CONFIG_TYPE,
      { version: '2.0.0', groups: [], timestamp: Date.now() }
    );
    
    console.log(`[GridColumnGroupStorage] Loaded ${config.groups.length} column groups for grid: ${gridInstanceId}`);
    return config.groups || [];
  }
  
  /**
   * Save all column groups for a grid instance
   */
  static async saveColumnGroups(gridInstanceId: string, groups: ColumnGroupDefinition[]): Promise<void> {
    const config: ColumnGroupConfiguration = {
      version: '2.0.0',
      groups: groups,
      timestamp: Date.now()
    };
    
    await this.saveConfig(
      gridInstanceId,
      this.CONFIG_TYPE,
      config,
      `Column Groups for ${gridInstanceId}`
    );
    
    console.log(`[GridColumnGroupStorage] Saved ${groups.length} column groups for grid: ${gridInstanceId}`);
  }
  
  /**
   * Add or update a column group
   */
  static async saveColumnGroup(gridInstanceId: string, group: ColumnGroupDefinition): Promise<void> {
    const existingGroups = await this.loadColumnGroups(gridInstanceId);
    const existingIndex = existingGroups.findIndex(g => g.groupId === group.groupId);
    
    const updatedGroup = {
      ...group,
      updatedAt: Date.now(),
      createdAt: group.createdAt || Date.now()
    };
    
    if (existingIndex >= 0) {
      // Update existing group
      existingGroups[existingIndex] = updatedGroup;
      console.log(`[GridColumnGroupStorage] Updated column group: ${group.groupId}`);
    } else {
      // Add new group
      existingGroups.push(updatedGroup);
      console.log(`[GridColumnGroupStorage] Added new column group: ${group.groupId}`);
    }
    
    await this.saveColumnGroups(gridInstanceId, existingGroups);
  }
  
  /**
   * Delete a column group
   */
  static async deleteColumnGroup(gridInstanceId: string, groupId: string): Promise<void> {
    const existingGroups = await this.loadColumnGroups(gridInstanceId);
    const filteredGroups = existingGroups.filter(g => g.groupId !== groupId);
    
    if (filteredGroups.length !== existingGroups.length) {
      await this.saveColumnGroups(gridInstanceId, filteredGroups);
      console.log(`[GridColumnGroupStorage] Deleted column group: ${groupId}`);
    } else {
      console.warn(`[GridColumnGroupStorage] Column group not found for deletion: ${groupId}`);
    }
  }
  
  /**
   * Get a specific column group by ID
   */
  static async getColumnGroup(gridInstanceId: string, groupId: string): Promise<ColumnGroupDefinition | null> {
    const groups = await this.loadColumnGroups(gridInstanceId);
    return groups.find(g => g.groupId === groupId) || null;
  }
  
  /**
   * Get multiple column groups by IDs
   */
  static async getColumnGroups(gridInstanceId: string, groupIds: string[]): Promise<ColumnGroupDefinition[]> {
    const allGroups = await this.loadColumnGroups(gridInstanceId);
    return groupIds
      .map(id => allGroups.find(g => g.groupId === id))
      .filter((group): group is ColumnGroupDefinition => group !== undefined);
  }
  
  /**
   * Check if a column group exists
   */
  static async hasColumnGroup(gridInstanceId: string, groupId: string): Promise<boolean> {
    const group = await this.getColumnGroup(gridInstanceId, groupId);
    return group !== null;
  }
  
  /**
   * Get all column group IDs
   */
  static async getAllGroupIds(gridInstanceId: string): Promise<string[]> {
    const groups = await this.loadColumnGroups(gridInstanceId);
    return groups.map(g => g.groupId);
  }
  
  /**
   * Clear all column groups for a grid instance
   */
  static async clearColumnGroups(gridInstanceId: string): Promise<void> {
    await this.deleteConfig(gridInstanceId, this.CONFIG_TYPE);
    console.log(`[GridColumnGroupStorage] Cleared all column groups for grid: ${gridInstanceId}`);
  }
  
  /**
   * Migrate old profile-based column groups to grid-level storage
   */
  static async migrateFromProfileGroups(
    gridInstanceId: string, 
    profileGroups: any[]
  ): Promise<string[]> {
    if (!profileGroups || profileGroups.length === 0) {
      return [];
    }
    
    console.log(`[GridColumnGroupStorage] Migrating ${profileGroups.length} column groups from profile to grid level`);
    
    const existingGroups = await this.loadColumnGroups(gridInstanceId);
    const migratedGroupIds: string[] = [];
    
    profileGroups.forEach(profileGroup => {
      // Convert old format to new format
      const migratedGroup: ColumnGroupDefinition = {
        groupId: profileGroup.groupId || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        headerName: profileGroup.headerName || 'Migrated Group',
        children: profileGroup.children || [],
        openByDefault: profileGroup.openByDefault ?? true,
        marryChildren: profileGroup.marryChildren || false,
        columnStates: profileGroup.columnStates || {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        description: 'Migrated from profile-based storage'
      };
      
      // Check if group already exists (avoid duplicates)
      if (!existingGroups.find(g => g.groupId === migratedGroup.groupId)) {
        existingGroups.push(migratedGroup);
        migratedGroupIds.push(migratedGroup.groupId);
      } else {
        // Group already exists, just add to active list
        migratedGroupIds.push(migratedGroup.groupId);
      }
    });
    
    if (migratedGroupIds.length > 0) {
      await this.saveColumnGroups(gridInstanceId, existingGroups);
      console.log(`[GridColumnGroupStorage] Migration complete. Migrated group IDs:`, migratedGroupIds);
    }
    
    return migratedGroupIds;
  }
}