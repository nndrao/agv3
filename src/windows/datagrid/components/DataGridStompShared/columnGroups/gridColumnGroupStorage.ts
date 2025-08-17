import { ColumnGroupDefinition, ColumnGroupConfiguration } from './types';

/**
 * Grid-level column group storage service
 * Manages column groups that are shared across all profiles for a specific grid instance
 */
export class GridColumnGroupStorage {
  private static readonly STORAGE_KEY_PREFIX = 'grid_column_groups_';
  
  /**
   * Get the storage key for a specific grid instance
   */
  private static getStorageKey(gridInstanceId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${gridInstanceId}`;
  }
  
  /**
   * Load all column groups for a grid instance
   */
  static loadColumnGroups(gridInstanceId: string): ColumnGroupDefinition[] {
    try {
      const storageKey = this.getStorageKey(gridInstanceId);
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        console.log(`[GridColumnGroupStorage] No column groups found for grid: ${gridInstanceId}`);
        return [];
      }
      
      const config: ColumnGroupConfiguration = JSON.parse(stored);
      console.log(`[GridColumnGroupStorage] Loaded ${config.groups.length} column groups for grid: ${gridInstanceId}`);
      
      return config.groups || [];
    } catch (error) {
      console.error(`[GridColumnGroupStorage] Error loading column groups for grid ${gridInstanceId}:`, error);
      return [];
    }
  }
  
  /**
   * Save all column groups for a grid instance
   */
  static saveColumnGroups(gridInstanceId: string, groups: ColumnGroupDefinition[]): void {
    try {
      const config: ColumnGroupConfiguration = {
        version: '2.0.0', // Updated version for new architecture
        groups: groups,
        timestamp: Date.now()
      };
      
      const storageKey = this.getStorageKey(gridInstanceId);
      localStorage.setItem(storageKey, JSON.stringify(config, null, 2));
      
      console.log(`[GridColumnGroupStorage] Saved ${groups.length} column groups for grid: ${gridInstanceId}`);
    } catch (error) {
      console.error(`[GridColumnGroupStorage] Error saving column groups for grid ${gridInstanceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add or update a column group
   */
  static saveColumnGroup(gridInstanceId: string, group: ColumnGroupDefinition): void {
    const existingGroups = this.loadColumnGroups(gridInstanceId);
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
    
    this.saveColumnGroups(gridInstanceId, existingGroups);
  }
  
  /**
   * Delete a column group
   */
  static deleteColumnGroup(gridInstanceId: string, groupId: string): void {
    const existingGroups = this.loadColumnGroups(gridInstanceId);
    const filteredGroups = existingGroups.filter(g => g.groupId !== groupId);
    
    if (filteredGroups.length !== existingGroups.length) {
      this.saveColumnGroups(gridInstanceId, filteredGroups);
      console.log(`[GridColumnGroupStorage] Deleted column group: ${groupId}`);
    } else {
      console.warn(`[GridColumnGroupStorage] Column group not found for deletion: ${groupId}`);
    }
  }
  
  /**
   * Get a specific column group by ID
   */
  static getColumnGroup(gridInstanceId: string, groupId: string): ColumnGroupDefinition | null {
    const groups = this.loadColumnGroups(gridInstanceId);
    return groups.find(g => g.groupId === groupId) || null;
  }
  
  /**
   * Get multiple column groups by IDs
   */
  static getColumnGroups(gridInstanceId: string, groupIds: string[]): ColumnGroupDefinition[] {
    const allGroups = this.loadColumnGroups(gridInstanceId);
    return groupIds
      .map(id => allGroups.find(g => g.groupId === id))
      .filter((group): group is ColumnGroupDefinition => group !== undefined);
  }
  
  /**
   * Check if a column group exists
   */
  static hasColumnGroup(gridInstanceId: string, groupId: string): boolean {
    return this.getColumnGroup(gridInstanceId, groupId) !== null;
  }
  
  /**
   * Get all column group IDs
   */
  static getAllGroupIds(gridInstanceId: string): string[] {
    const groups = this.loadColumnGroups(gridInstanceId);
    return groups.map(g => g.groupId);
  }
  
  /**
   * Clear all column groups for a grid instance
   */
  static clearColumnGroups(gridInstanceId: string): void {
    const storageKey = this.getStorageKey(gridInstanceId);
    localStorage.removeItem(storageKey);
    console.log(`[GridColumnGroupStorage] Cleared all column groups for grid: ${gridInstanceId}`);
  }
  
  /**
   * Migrate old profile-based column groups to grid-level storage
   */
  static migrateFromProfileGroups(
    gridInstanceId: string, 
    profileGroups: any[]
  ): string[] {
    if (!profileGroups || profileGroups.length === 0) {
      return [];
    }
    
    console.log(`[GridColumnGroupStorage] Migrating ${profileGroups.length} column groups from profile to grid level`);
    
    const existingGroups = this.loadColumnGroups(gridInstanceId);
    const migratedGroupIds: string[] = [];
    
    profileGroups.forEach(profileGroup => {
      // Convert old format to new format
      const migratedGroup: ColumnGroupDefinition = {
        groupId: profileGroup.groupId || `migrated_${Date.now()}_${Math.random()}`,
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
      this.saveColumnGroups(gridInstanceId, existingGroups);
      console.log(`[GridColumnGroupStorage] Migration complete. Migrated group IDs:`, migratedGroupIds);
    }
    
    return migratedGroupIds;
  }
}