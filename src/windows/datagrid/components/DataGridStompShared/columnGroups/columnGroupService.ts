import { ColumnGroupDefinition } from './types';
import { GridColumnGroupStorage } from './gridColumnGroupStorage';
import { ColDef, ColGroupDef } from 'ag-grid-community';

export class ColumnGroupService {
  /**
   * Apply column group state after a delay to ensure columnDefs are fully applied
   * This method should be called LAST after all other grid state has been applied
   */
  static applyColumnGroupStateDelayed(
    gridApi: any, 
    groupState: Array<{ groupId: string; open: boolean }>,
    delay: number = 500
  ): void {
    setTimeout(() => {
      console.log('[🔍 COLGROUP-STATE-001] Applying column group state (delayed):', groupState);
      
      // Use the official AG-Grid API to set column group state
      if (gridApi.setColumnGroupState) {
        try {
          gridApi.setColumnGroupState(groupState);
          console.log('[🔍 COLGROUP-STATE-002] Applied column group state using setColumnGroupState');
          
          // Verify the state was applied
          const newState = gridApi.getColumnGroupState();
          console.log('[🔍 COLGROUP-STATE-003] Column group state after application:', newState);
        } catch (e) {
          console.warn('[🔍 COLGROUP-STATE-004] Error applying column group state:', e);
        }
      } else if (typeof (gridApi as any).setColumnGroupOpened === 'function') {
        // Fallback to individual group opening
        console.log('[🔍 COLGROUP-STATE-005] Using fallback setColumnGroupOpened');
        groupState.forEach((state: any) => {
          try {
            (gridApi as any).setColumnGroupOpened(state.groupId, state.open);
          } catch (e) {
            console.warn(`[🔍 COLGROUP-STATE-006] Could not set state for group ${state.groupId}:`, e);
          }
        });
      }
    }, delay);
  }
  
  /**
   * Apply column groups to AG-Grid using grid-level storage
   * Returns the saved column state that should be applied after groups are set
   */
  static async applyColumnGroups(
    gridApi: any,
    columnApi: any,
    activeGroupIds: string[],
    gridInstanceId: string,
    originalColumnDefs?: ColDef[],
    gridStateManager?: any
  ): Promise<any[] | null> {
    
    // Load groups from grid-level storage
    const allGroups = await GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
    const activeGroups = await GridColumnGroupStorage.getColumnGroups(gridInstanceId, activeGroupIds);
    
    console.log('[ColumnGroupService] Applying column groups:', {
      gridInstanceId,
      activeGroupIds,
      totalGroups: allGroups.length,
      activeGroups: activeGroups.length
    });
    
    if (activeGroups.length === 0) {
      console.log('[ColumnGroupService] No active column groups to apply');
      
      // If we have original column defs, restore them
      if (originalColumnDefs && gridApi) {
        console.log('[ColumnGroupService] Restoring original column definitions');
        gridApi.setColumnDefs(originalColumnDefs);
      }
      
      return null;
    }
    
    // Get current column definitions from the grid
    const currentColumns = gridApi.getColumnDefs() || [];
    console.log('[ColumnGroupService] Current column definitions count:', currentColumns.length);
    
    // Create column groups hierarchy
    const columnGroups = activeGroups.map(group => createColumnGroupDef(group, currentColumns));
    
    // Collect all columns that are part of groups
    const groupedColumnIds = new Set<string>();
    activeGroups.forEach(group => {
      group.children.forEach(childId => groupedColumnIds.add(childId));
    });
    
    // Filter ungrouped columns
    const ungroupedColumns = currentColumns.filter((col: ColDef) => {
      const colId = col.colId || col.field;
      return colId && !groupedColumnIds.has(colId);
    });
    
    // Combine grouped and ungrouped columns
    const newColumnDefs = [...columnGroups, ...ungroupedColumns];
    
    console.log('[ColumnGroupService] Setting new column definitions:', {
      totalColumns: newColumnDefs.length,
      groupedColumns: columnGroups.length,
      ungroupedColumns: ungroupedColumns.length
    });
    
    // IMPORTANT: Save column state BEFORE applying new column defs
    let savedColumnState: any[] | null = null;
    try {
      if (gridStateManager && typeof gridStateManager.getCurrentGridState === 'function') {
        const currentState = gridStateManager.getCurrentGridState(gridApi, columnApi);
        savedColumnState = currentState?.columnState || null;
        console.log('[🔍 COLGROUP-PRESERVE-001] Saved column state before applying groups:', 
          savedColumnState?.map((s: any) => ({ colId: s.colId, width: s.width, hide: s.hide })));
      } else if (columnApi && typeof columnApi.getColumnState === 'function') {
        savedColumnState = columnApi.getColumnState();
        console.log('[🔍 COLGROUP-PRESERVE-002] Saved column state using columnApi');
      } else if (typeof gridApi.getColumnState === 'function') {
        savedColumnState = gridApi.getColumnState();
        console.log('[🔍 COLGROUP-PRESERVE-003] Saved column state using gridApi');
      }
    } catch (e) {
      console.warn('[🔍 COLGROUP-PRESERVE-004] Could not save column state:', e);
    }
    
    // Apply new column definitions with groups
    gridApi.setColumnDefs(newColumnDefs);
    
    console.log('[ColumnGroupService] Column groups applied successfully');
    
    // Test and set column group state immediately
    testColumnGroupShow(gridApi);
    
    // Return the saved column state for restoration
    return savedColumnState;
  }
  
  /**
   * Create a column group definition from storage
   */
  static createColumnGroupDefinitionFromStorage(
    group: ColumnGroupDefinition, 
    allColumns: ColDef[]
  ): ColGroupDef {
    return createColumnGroupDef(group, allColumns);
  }
  
  /**
   * Get column group definitions for active groups
   */
  static async getColumnGroupDefinitions(
    gridInstanceId: string,
    activeGroupIds: string[]
  ): Promise<ColGroupDef[]> {
    const groups = await GridColumnGroupStorage.getColumnGroups(gridInstanceId, activeGroupIds);
    return groups.map(group => ({
      groupId: group.groupId,
      headerName: group.headerName,
      children: group.children,
      openByDefault: group.openByDefault,
      marryChildren: group.marryChildren
    }));
  }
  
  /**
   * Save column groups to storage
   */
  static async saveColumnGroups(
    gridInstanceId: string,
    groups: ColumnGroupDefinition[]
  ): Promise<void> {
    await GridColumnGroupStorage.saveColumnGroups(gridInstanceId, groups);
  }
  
  /**
   * Load all column groups from storage
   */
  static async loadColumnGroups(gridInstanceId: string): Promise<ColumnGroupDefinition[]> {
    return await GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
  }
  
  /**
   * Import column groups from array (used for profile migration)
   */
  static async importColumnGroups(
    gridInstanceId: string,
    groups: ColumnGroupDefinition[]
  ): Promise<void> {
    const existingGroups = await GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
    
    // Merge with existing groups (avoid duplicates based on groupId)
    const existingIds = new Set(existingGroups.map(g => g.groupId));
    const newGroups = groups.filter(g => !existingIds.has(g.groupId));
    
    if (newGroups.length > 0) {
      const mergedGroups = [...existingGroups, ...newGroups];
      await GridColumnGroupStorage.saveColumnGroups(gridInstanceId, mergedGroups);
      console.log(`[ColumnGroupService] Imported ${newGroups.length} new column groups`);
    }
  }
  
  /**
   * Convert profile column groups to grid-level storage and return active group IDs
   */
  static async migrateProfileColumnGroups(
    gridInstanceId: string,
    profileColumnGroups: any[]
  ): Promise<string[]> {
    if (!profileColumnGroups || profileColumnGroups.length === 0) {
      return [];
    }
    
    // Convert old format to new format and save
    const convertedGroups: ColumnGroupDefinition[] = profileColumnGroups.map(group => ({
      groupId: group.groupId || `group_${Date.now()}_${Math.random()}`,
      headerName: group.headerName || 'Column Group',
      children: group.children || [],
      openByDefault: group.openByDefault ?? true,
      marryChildren: group.marryChildren || false,
      columnStates: group.columnStates || {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    
    // Save to grid-level storage
    await this.importColumnGroups(gridInstanceId, convertedGroups);
    
    // Return the IDs of the migrated groups (they should all be active)
    return convertedGroups.map(g => g.groupId);
  }
  
  /**
   * Create a new column group
   */
  static async createColumnGroup(
    gridInstanceId: string,
    group: Partial<ColumnGroupDefinition>
  ): Promise<ColumnGroupDefinition> {
    const newGroup: ColumnGroupDefinition = {
      groupId: group.groupId || `group_${Date.now()}_${Math.random()}`,
      headerName: group.headerName || 'New Group',
      children: group.children || [],
      openByDefault: group.openByDefault ?? true,
      marryChildren: group.marryChildren || false,
      columnStates: group.columnStates || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...group
    };
    
    await GridColumnGroupStorage.saveColumnGroup(gridInstanceId, newGroup);
    return newGroup;
  }
  
  /**
   * Update an existing column group
   */
  static async updateColumnGroup(
    gridInstanceId: string,
    groupId: string,
    updates: Partial<ColumnGroupDefinition>
  ): Promise<ColumnGroupDefinition> {
    const existingGroup = await GridColumnGroupStorage.getColumnGroup(gridInstanceId, groupId);
    if (!existingGroup) {
      throw new Error(`Column group ${groupId} not found`);
    }
    
    const updatedGroup: ColumnGroupDefinition = {
      ...existingGroup,
      ...updates,
      groupId: existingGroup.groupId, // Ensure ID doesn't change
      updatedAt: Date.now()
    };
    
    await GridColumnGroupStorage.saveColumnGroup(gridInstanceId, updatedGroup);
    return updatedGroup;
  }
  
  /**
   * Delete a column group
   */
  static async deleteColumnGroup(gridInstanceId: string, groupId: string): Promise<void> {
    await GridColumnGroupStorage.deleteColumnGroup(gridInstanceId, groupId);
  }
  
  /**
   * Get all available column groups
   */
  static async getAllColumnGroups(gridInstanceId: string): Promise<ColumnGroupDefinition[]> {
    return await GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
  }
  
  /**
   * Migrate from old profile-based column groups to grid-level storage
   * Returns the IDs of the migrated groups that should be active
   */
  static async migrateFromProfileGroups(
    gridInstanceId: string,
    profileColumnGroups: any[]
  ): Promise<string[]> {
    return await GridColumnGroupStorage.migrateFromProfileGroups(gridInstanceId, profileColumnGroups);
  }
}

// Helper function to create AG-Grid column group definition
function createColumnGroupDef(
  group: ColumnGroupDefinition, 
  allColumns: ColDef[]
): ColGroupDef {
  console.log('[🔍 COLGROUP-CREATE-001] Creating column group:', {
    groupId: group.groupId,
    headerName: group.headerName,
    children: group.children,
    columnStates: group.columnStates,
    openByDefault: group.openByDefault
  });
  
  // Map children IDs to actual column definitions
  const childColumns = group.children
    .map(childId => {
      const column = allColumns.find((col: ColDef) => 
        col.colId === childId || col.field === childId
      );
      
      if (!column) {
        console.warn(`[🔍 COLGROUP-CREATE-002] Column ${childId} not found for group ${group.groupId}`);
        return null;
      }
      
      // Apply columnGroupShow based on column states
      const columnState = group.columnStates?.[childId];
      console.log(`[🔍 COLGROUP-CREATE-003] Column ${childId} state:`, columnState);
      
      if (columnState === 'open' || columnState === 'closed') {
        const modifiedColumn = { 
          ...column, 
          columnGroupShow: columnState
        };
        console.log(`[🔍 COLGROUP-CREATE-004] Applied columnGroupShow '${columnState}' to column ${childId}`);
        return modifiedColumn;
      }
      
      return column;
    })
    .filter(col => col !== null) as ColDef[];
  
  const groupDef: ColGroupDef = {
    groupId: group.groupId,
    headerName: group.headerName,
    children: childColumns,
    openByDefault: group.openByDefault ?? true,
    marryChildren: group.marryChildren || false
  };
  
  console.log('[🔍 COLGROUP-CREATE-005] Created column group definition:', {
    groupId: groupDef.groupId,
    headerName: groupDef.headerName,
    childCount: groupDef.children.length,
    openByDefault: groupDef.openByDefault
  });
  
  return groupDef;
}

// Test function for column group show functionality
function testColumnGroupShow(gridApi: any): void {
  console.log('[🔍 COLGROUP-TEST-001] Testing column group show functionality...');
  
  // Try to expand/collapse groups to verify columnGroupShow works
  setTimeout(() => {
    const columnGroups = gridApi.getColumnDefs()?.filter((col: any) => col.children) || [];
    console.log('[🔍 COLGROUP-TEST-002] Found column groups:', columnGroups.map((g: any) => g.groupId));
    
    columnGroups.forEach((group: any) => {
      if (group.groupId) {
        // Try to toggle the group
        try {
          // First close it
          if (typeof gridApi.setColumnGroupOpened === 'function') {
            gridApi.setColumnGroupOpened(group.groupId, false);
            console.log(`[🔍 COLGROUP-TEST-003] Closed group: ${group.groupId}`);
            
            // Check which columns are visible
            setTimeout(() => {
              const visibleColumns = gridApi.getAllDisplayedColumns()?.map((c: any) => c.colId) || [];
              console.log(`[🔍 COLGROUP-TEST-004] Visible columns after closing ${group.groupId}:`, visibleColumns);
              
              // Now open it
              gridApi.setColumnGroupOpened(group.groupId, true);
              console.log(`[🔍 COLGROUP-TEST-005] Opened group: ${group.groupId}`);
              
              setTimeout(() => {
                const visibleColumnsAfter = gridApi.getAllDisplayedColumns()?.map((c: any) => c.colId) || [];
                console.log(`[🔍 COLGROUP-TEST-006] Visible columns after opening ${group.groupId}:`, visibleColumnsAfter);
              }, 100);
            }, 100);
          }
        } catch (e) {
          console.warn(`[🔍 COLGROUP-TEST-007] Could not test group ${group.groupId}:`, e);
        }
      }
    });
  }, 500);
}

/**
 * Re-import groups from array - used during testing/debugging
 * This will merge with existing groups (won't create duplicates)
 */
export async function reimportGroups(
  gridInstanceId: string, 
  groupsToImport: ColumnGroupDefinition[]
): Promise<void> {
  try {
    if (!gridInstanceId || !groupsToImport || groupsToImport.length === 0) {
      console.warn('[reimportGroups] Invalid parameters');
      return;
    }
    
    const existingGroups = await GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
    const existingIds = new Set(existingGroups.map(g => g.groupId));
    
    // Filter out duplicates
    const newGroups = groupsToImport.filter(g => !existingIds.has(g.groupId));
    
    if (newGroups.length > 0) {
      const updatedGroups = [...existingGroups, ...newGroups];
      await GridColumnGroupStorage.saveColumnGroups(gridInstanceId, updatedGroups);
      console.log(`[reimportGroups] Successfully imported ${newGroups.length} new groups`);
    } else {
      console.log('[reimportGroups] All groups already exist, no new imports');
    }
  } catch (error) {
    console.error('[reimportGroups] Error importing groups:', error);
  }
}

/**
 * Check and apply column groups from profile
 * This is called when a profile is loaded
 */
export async function checkAndApplyColumnGroups(
  gridApi: any,
  columnApi: any,
  gridInstanceId: string,
  profileColumnGroups?: any[],
  activeColumnGroupIds?: string[]
): Promise<void> {
  try {
    console.log('[checkAndApplyColumnGroups] Starting...', {
      gridInstanceId,
      hasProfileGroups: !!profileColumnGroups,
      profileGroupCount: profileColumnGroups?.length || 0,
      activeIds: activeColumnGroupIds
    });
    
    // First, check if we have any profile column groups that need migration
    if (profileColumnGroups && profileColumnGroups.length > 0) {
      console.log('[checkAndApplyColumnGroups] Migrating profile column groups...');
      const migratedIds = await ColumnGroupService.migrateFromProfileGroups(
        gridInstanceId,
        profileColumnGroups
      );
      console.log('[checkAndApplyColumnGroups] Migrated group IDs:', migratedIds);
      
      // Use migrated IDs as active if no active IDs provided
      if (!activeColumnGroupIds || activeColumnGroupIds.length === 0) {
        activeColumnGroupIds = migratedIds;
      }
    }
    
    // Load all available groups from grid storage
    const allGroups = await GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
    console.log('[checkAndApplyColumnGroups] All available groups:', allGroups.map(g => ({
      id: g.groupId,
      name: g.headerName
    })));
    
    // Apply active groups
    if (activeColumnGroupIds && activeColumnGroupIds.length > 0) {
      console.log('[checkAndApplyColumnGroups] Applying active column groups...');
      await ColumnGroupService.applyColumnGroups(
        gridApi,
        columnApi,
        activeColumnGroupIds,
        gridInstanceId
      );
    } else {
      console.log('[checkAndApplyColumnGroups] No active column groups to apply');
    }
  } catch (error) {
    console.error('[checkAndApplyColumnGroups] Error:', error);
  }
}