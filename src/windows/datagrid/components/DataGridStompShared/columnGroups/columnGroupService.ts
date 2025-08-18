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
  static applyColumnGroups(
    gridApi: any,
    columnApi: any,
    activeGroupIds: string[],
    gridInstanceId: string,
    originalColumnDefs?: ColDef[],
    gridStateManager?: any
  ): any[] | null {
    
    // Load groups from grid-level storage
    const allGroups = GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
    const activeGroups = GridColumnGroupStorage.getColumnGroups(gridInstanceId, activeGroupIds);
    
    console.log('[🔍 COLGROUP-SERVICE-001] applyColumnGroups called:', {
      totalGroups: allGroups.length,
      activeGroupIds: activeGroupIds,
      activeGroups: activeGroups.length,
      groups: activeGroups.map(g => ({ 
        groupId: g.groupId, 
        headerName: g.headerName,
        childrenCount: g.children?.length || 0
      }))
    });
    
    if (!gridApi) {
      console.error('[🔍 COLGROUP-SERVICE-ERROR] Grid API not available');
      return;
    }
    
    // Verify that column definitions exist
    const currentDefs = gridApi.getColumnDefs();
    if (!currentDefs || currentDefs.length === 0) {
      console.warn('[🔍 COLGROUP-SERVICE-WARNING] No column definitions available yet, cannot apply column groups');
      return;
    }

    // Get the original column definitions if not provided
    let baseColumnDefs = originalColumnDefs;
    if (!baseColumnDefs) {
      // Try to get from grid state
      const gridState = gridApi.getColumnDefs();
      if (gridState && gridState.length > 0) {
        // Extract base columns from current state (flatten any existing groups)
        baseColumnDefs = this.extractBaseColumns(gridState);
      } else {
        console.error('No column definitions available');
        return;
      }
    }


    // Build new column definitions with groups (pass gridApi to preserve column state)
    // Only use active groups
    const newColumnDefs = this.buildColumnDefsWithGroups(baseColumnDefs, activeGroups, gridApi);
    
    // Store the current column group state before applying new definitions
    try {
      // Try to get column group state before changes
      if (typeof (gridApi as any).getColumnGroupState === 'function') {
        (gridApi as any).getColumnGroupState();
      }
    } catch (e) {
    }
    
    // Get the column state to restore after applying groups
    // Use pending state from GridStateManager if available, otherwise use current state
    let savedColumnState = null;
    if (gridStateManager && typeof gridStateManager.getPendingColumnState === 'function') {
      savedColumnState = gridStateManager.getPendingColumnState();
      // Clear the pending state after using it
      gridStateManager.clearPendingColumnState();
    }
    if (!savedColumnState) {
      savedColumnState = gridApi.getColumnState();
    }
    
    // Update grid state manager with active group IDs
    if (gridStateManager && typeof gridStateManager.setActiveColumnGroupIds === 'function') {
      gridStateManager.setActiveColumnGroupIds(activeGroupIds);
    }
    
    // Apply the new column definitions to the grid
    gridApi.setGridOption('columnDefs', newColumnDefs);
    
    // Get the initial column group state before setting up listeners
    const initialGroupState = gridApi.getColumnGroupState ? gridApi.getColumnGroupState() : [];
    console.log('[🔍 COLGROUP-SERVICE-008] Initial column group state after applying defs:', initialGroupState);
    
    // Let AG-Grid handle column group expand/collapse natively
    // The columnGroupShow property on columns will be respected automatically
    
    // Return the saved column state to be applied by the caller after groups are fully set
    console.log('[🔍 COLGROUP-SERVICE-009] Returning saved column state for later application:', {
      hasColumnState: !!savedColumnState,
      columnStateCount: savedColumnState?.length || 0
    });
    
    // Force grid to redraw columns
    if (columnApi) {
      try {
        columnApi.autoSizeAllColumns();
      } catch (e) {
      }
    }
    
    // Refresh the grid
    gridApi.refreshCells({ force: true });
    
    // AG-Grid will handle initial group state and column visibility automatically
    // based on openByDefault and columnGroupShow properties
    
    // Return the saved column state to be applied after column groups are fully configured
    return savedColumnState;
  }

  /**
   * Extract base column definitions from potentially grouped columns
   */
  private static extractBaseColumns(columnDefs: any[]): ColDef[] {
    const baseColumns: ColDef[] = [];
    
    const processColDef = (colDef: any) => {
      if (colDef.children) {
        // This is a group, process its children
        colDef.children.forEach((child: any) => processColDef(child));
      } else {
        // This is a base column, preserve all its properties
        const baseDef: ColDef = { ...colDef };
        // Ensure we have a colId
        if (!baseDef.colId && baseDef.field) {
          baseDef.colId = baseDef.field;
        }
        baseColumns.push(baseDef);
      }
    };
    
    columnDefs.forEach(colDef => processColDef(colDef));
    return baseColumns;
  }

  /**
   * Build column definitions with groups using grid-level storage
   * This is a pure function that returns new columnDefs without side effects
   */
  static buildColumnDefsWithGroups(
    baseColumns: ColDef[],
    activeGroupIds: string[],
    gridInstanceId: string,
    gridApi?: any
  ): (ColDef | ColGroupDef)[] {
    
    // Load active groups from grid-level storage
    const groups = GridColumnGroupStorage.getColumnGroups(gridInstanceId, activeGroupIds);
    
    // Get current column state to preserve widths and other properties
    let currentColumnState: any[] = [];
    if (gridApi) {
      currentColumnState = gridApi.getColumnState() || [];
    }
    
    // Create a map of column ID to current state
    const columnStateMap = new Map<string, any>();
    currentColumnState.forEach(state => {
      if (state.colId) {
        columnStateMap.set(state.colId, state);
      }
    });
    
    // Create a map of column ID to column definition
    const columnMap = new Map<string, ColDef>();
    baseColumns.forEach(col => {
      const colId = col.colId || col.field;
      if (colId) {
        // Preserve width and other state from current column state
        const currentState = columnStateMap.get(colId);
        if (currentState) {
          // Preserve width if it exists
          if (currentState.width !== undefined && currentState.width !== null) {
            col.width = currentState.width;
          }
          // Preserve hide state
          if (currentState.hide !== undefined) {
            col.hide = currentState.hide;
          }
          // Preserve pinned state
          if (currentState.pinned !== undefined && currentState.pinned !== null) {
            col.pinned = currentState.pinned;
          }
        }
        
        columnMap.set(colId, col);
        // Also add by field name if different from colId
        if (col.field && col.field !== colId) {
          columnMap.set(col.field, col);
        }
      }
    });

    // Create a set of grouped column IDs
    const groupedColumnIds = new Set<string>();
    groups.forEach(group => {
      group.children.forEach(colId => groupedColumnIds.add(colId));
    });

    // Build the final column definitions
    const finalColumnDefs: (ColDef | ColGroupDef)[] = [];

    // Add column groups
    groups.forEach(group => {
      const groupChildren: ColDef[] = [];
      
      group.children.forEach(colId => {
        const colDef = columnMap.get(colId);
        if (colDef) {
          // Apply columnGroupShow if defined in columnStates
          const columnState = group.columnStates?.[colId];
          // Create a new column definition with columnGroupShow
          let colDefWithGroupShow: any = { ...colDef };
          if (columnState !== undefined) {
            colDefWithGroupShow.columnGroupShow = columnState;
            console.log('[🔍 COLGROUP-SERVICE-002] Applied columnGroupShow:', {
              colId,
              columnGroupShow: columnState,
              groupId: group.groupId,
              groupHeaderName: group.headerName
            });
          } else {
            console.log('[🔍 COLGROUP-SERVICE-003] No columnGroupShow for:', colId);
          }
          groupChildren.push(colDefWithGroupShow);
        } else {
          console.warn(`  - Column "${colId}" not found in column map!`);
        }
      });

      if (groupChildren.length > 0) {
        const colGroupDef: ColGroupDef = {
          headerName: group.headerName,
          groupId: group.groupId,
          children: groupChildren,
          openByDefault: group.openByDefault ?? true,
          marryChildren: group.marryChildren || false
        };
        
        console.log('[🔍 COLGROUP-SERVICE-004] Created column group:', {
          groupId: colGroupDef.groupId,
          headerName: colGroupDef.headerName,
          openByDefault: colGroupDef.openByDefault,
          childrenCount: groupChildren.length,
          childrenWithGroupShow: groupChildren.filter((c: any) => c.columnGroupShow !== undefined).map((c: any) => ({
            field: c.field || c.colId,
            columnGroupShow: c.columnGroupShow
          }))
        });
        
        finalColumnDefs.push(colGroupDef);
      } else {
        console.warn(`- Skipping empty group "${group.headerName}"`);
      }
    });

    // Add ungrouped columns
    baseColumns.forEach(col => {
      const colId = col.colId || col.field;
      if (colId && !groupedColumnIds.has(colId)) {
        finalColumnDefs.push(col);
      }
    });

    console.log('[🔍 COLGROUP-BUILD-FINAL] Final column definitions structure:', {
      totalDefs: finalColumnDefs.length,
      groups: finalColumnDefs.filter((col: any) => col.children).map((col: any) => ({
        headerName: col.headerName,
        groupId: col.groupId,
        childrenCount: col.children?.length
      })),
      ungroupedColumns: finalColumnDefs.filter((col: any) => !col.children).length
    });
    
    return finalColumnDefs;
  }

  /**
   * Save column group configuration to grid-level storage
   */
  static saveConfiguration(gridInstanceId: string, groups: ColumnGroupDefinition[]): void {
    GridColumnGroupStorage.saveColumnGroups(gridInstanceId, groups);
  }

  /**
   * Load column group configuration from grid-level storage
   */
  static loadConfiguration(gridInstanceId: string): ColumnGroupDefinition[] {
    return GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
  }

  /**
   * Export column groups as JSON string
   */
  static exportConfiguration(gridInstanceId: string): string {
    const groups = GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
    const config = {
      version: '2.0.0',
      groups: groups,
      timestamp: Date.now()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import column groups from JSON string
   */
  static importConfiguration(gridInstanceId: string, configJson: string): ColumnGroupDefinition[] {
    try {
      const config = JSON.parse(configJson);
      const groups = config.groups || [];
      
      // Save imported groups to grid-level storage
      GridColumnGroupStorage.saveColumnGroups(gridInstanceId, groups);
      
      return groups;
    } catch (error) {
      console.error('Failed to parse column group configuration:', error);
      return [];
    }
  }

  /**
   * Extract current column groups from column definitions
   */
  static extractGroupsFromColumnDefs(columnDefs: any[]): ColumnGroupDefinition[] {
    const groups: ColumnGroupDefinition[] = [];
    
    if (!columnDefs || columnDefs.length === 0) return groups;
    
    columnDefs.forEach((colDef: any) => {
      if (colDef.children) {
        // This is a column group
        const childIds: string[] = [];
        const columnStates: Record<string, 'open' | 'closed' | undefined> = {};
        
        const extractChildData = (children: any[]) => {
          children.forEach((child: any) => {
            if (child.children) {
              // Nested group - extract its children
              extractChildData(child.children);
            } else {
              // Regular column
              const colId = child.colId || child.field;
              if (colId) {
                childIds.push(colId);
                // Extract columnGroupShow if present
                if (child.columnGroupShow) {
                  columnStates[colId] = child.columnGroupShow;
                }
              }
            }
          });
        };
        
        extractChildData(colDef.children);
        
        if (childIds.length > 0) {
          groups.push({
            groupId: colDef.groupId || `group_${Date.now()}_${Math.random()}`,
            headerName: colDef.headerName || 'Unnamed Group',
            children: childIds,
            openByDefault: colDef.openByDefault !== false,
            columnStates
          });
        }
      }
    });
    
    return groups;
  }

  /**
   * Create a new column group and save it to grid-level storage
   */
  static createColumnGroup(
    gridInstanceId: string,
    headerName: string,
    children: string[],
    columnStates?: Record<string, 'open' | 'closed' | undefined>,
    openByDefault: boolean = true
  ): ColumnGroupDefinition {
    const newGroup: ColumnGroupDefinition = {
      groupId: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      headerName,
      children,
      openByDefault,
      columnStates: columnStates || {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    GridColumnGroupStorage.saveColumnGroup(gridInstanceId, newGroup);
    return newGroup;
  }

  /**
   * Update an existing column group
   */
  static updateColumnGroup(
    gridInstanceId: string,
    groupId: string,
    updates: Partial<ColumnGroupDefinition>
  ): ColumnGroupDefinition | null {
    const existingGroup = GridColumnGroupStorage.getColumnGroup(gridInstanceId, groupId);
    if (!existingGroup) {
      console.warn(`Column group not found: ${groupId}`);
      return null;
    }

    const updatedGroup: ColumnGroupDefinition = {
      ...existingGroup,
      ...updates,
      groupId, // Ensure groupId cannot be changed
      updatedAt: Date.now()
    };

    GridColumnGroupStorage.saveColumnGroup(gridInstanceId, updatedGroup);
    return updatedGroup;
  }

  /**
   * Delete a column group from grid-level storage
   */
  static deleteColumnGroup(gridInstanceId: string, groupId: string): void {
    GridColumnGroupStorage.deleteColumnGroup(gridInstanceId, groupId);
  }

  /**
   * Get all available column groups for a grid
   */
  static getAllColumnGroups(gridInstanceId: string): ColumnGroupDefinition[] {
    return GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
  }

  /**
   * Migrate profile-based column groups to grid-level storage
   * Returns the active group IDs that should be stored in the profile
   */
  static migrateProfileColumnGroups(
    gridInstanceId: string,
    profileColumnGroups: any[]
  ): string[] {
    return GridColumnGroupStorage.migrateFromProfileGroups(gridInstanceId, profileColumnGroups);
  }

  /**
   * Extract column group state from AG-Grid using native API
   * Returns the current open/closed state of all column groups
   */
  static extractColumnGroupState(gridApi: any): Array<{ groupId: string; open: boolean }> {
    if (!gridApi) {
      console.warn('[ColumnGroupService] Grid API not available for state extraction');
      return [];
    }

    try {
      // Use AG-Grid's native getColumnGroupState API
      if (typeof gridApi.getColumnGroupState === 'function') {
        const groupState = gridApi.getColumnGroupState();
        console.log('[🔍 COLGROUP-EXTRACT-STATE] Extracted column group state using AG-Grid API:', groupState);
        return groupState || [];
      } else {
        console.warn('[ColumnGroupService] getColumnGroupState not available on grid API');
        return [];
      }
    } catch (error) {
      console.error('[ColumnGroupService] Error extracting column group state:', error);
      return [];
    }
  }

  /**
   * Apply column group state to AG-Grid using native API
   * Sets the open/closed state of column groups
   */
  static applyColumnGroupState(
    gridApi: any, 
    groupState: Array<{ groupId: string; open: boolean }>
  ): boolean {
    if (!gridApi) {
      console.warn('[ColumnGroupService] Grid API not available for state application');
      return false;
    }

    if (!groupState || groupState.length === 0) {
      console.log('[ColumnGroupService] No column group state to apply');
      return true;
    }

    try {
      console.log('[🔍 COLGROUP-APPLY-STATE] Applying column group state using AG-Grid API:', groupState);
      
      // Use AG-Grid's native setColumnGroupState API
      if (typeof gridApi.setColumnGroupState === 'function') {
        gridApi.setColumnGroupState(groupState);
        
        // Verify the state was applied
        const newState = gridApi.getColumnGroupState();
        console.log('[🔍 COLGROUP-APPLY-STATE-VERIFY] Column group state after application:', newState);
        
        return true;
      } else {
        console.warn('[ColumnGroupService] setColumnGroupState not available, using fallback');
        
        // Fallback to individual group operations
        if (typeof gridApi.setColumnGroupOpened === 'function') {
          groupState.forEach(state => {
            try {
              gridApi.setColumnGroupOpened(state.groupId, state.open);
            } catch (e) {
              console.warn(`[ColumnGroupService] Could not set state for group ${state.groupId}:`, e);
            }
          });
          return true;
        } else {
          console.error('[ColumnGroupService] No column group state methods available on grid API');
          return false;
        }
      }
    } catch (error) {
      console.error('[ColumnGroupService] Error applying column group state:', error);
      return false;
    }
  }

  /**
   * Save column group state to grid-level storage
   * Combines group definitions with their current open/closed state
   */
  static saveColumnGroupState(
    gridInstanceId: string,
    gridApi: any,
    activeGroupIds: string[]
  ): void {
    try {
      // Extract current column group state from AG-Grid
      const groupState = this.extractColumnGroupState(gridApi);
      
      // Load existing groups from storage
      const existingGroups = GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
      
      // Update groups with current state
      const updatedGroups = existingGroups.map(group => {
        const currentState = groupState.find(state => state.groupId === group.groupId);
        return {
          ...group,
          openByDefault: currentState ? currentState.open : group.openByDefault,
          updatedAt: Date.now()
        };
      });
      
      // Save updated groups back to storage
      GridColumnGroupStorage.saveColumnGroups(gridInstanceId, updatedGroups);
      
      console.log('[🔍 COLGROUP-SAVE-STATE] Saved column group state to storage:', {
        groupCount: updatedGroups.length,
        stateCount: groupState.length
      });
    } catch (error) {
      console.error('[ColumnGroupService] Error saving column group state:', error);
    }
  }

  /**
   * Load and apply column group state from grid-level storage
   * Restores both group definitions and their open/closed state
   */
  static loadAndApplyColumnGroupState(
    gridInstanceId: string,
    gridApi: any,
    activeGroupIds: string[]
  ): boolean {
    try {
      // Load groups from storage
      const allGroups = GridColumnGroupStorage.loadColumnGroups(gridInstanceId);
      const activeGroups = allGroups.filter(group => activeGroupIds.includes(group.groupId));
      
      if (activeGroups.length === 0) {
        console.log('[ColumnGroupService] No active groups to restore state for');
        return true;
      }
      
      // Build group state array from stored openByDefault values
      const groupState = activeGroups.map(group => ({
        groupId: group.groupId,
        open: group.openByDefault ?? true
      }));
      
      // Apply the state using AG-Grid API
      const success = this.applyColumnGroupState(gridApi, groupState);
      
      console.log('[🔍 COLGROUP-LOAD-STATE] Loaded and applied column group state:', {
        success,
        groupCount: activeGroups.length,
        groupState
      });
      
      return success;
    } catch (error) {
      console.error('[ColumnGroupService] Error loading and applying column group state:', error);
      return false;
    }
  }

  /**
   * Set up event listeners to automatically save column group state changes
   * This should be called after column groups are applied to the grid
   */
  static setupColumnGroupStateListeners(
    gridInstanceId: string,
    gridApi: any,
    activeGroupIds: string[]
  ): () => void {
    if (!gridApi) {
      console.warn('[ColumnGroupService] Grid API not available for setting up listeners');
      return () => {};
    }

    let debounceTimer: NodeJS.Timeout | null = null;

    const saveStateDebounced = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        this.saveColumnGroupState(gridInstanceId, gridApi, activeGroupIds);
      }, 500); // Debounce to avoid excessive saves
    };

    // Listen for column group opened/closed events
    const onColumnGroupOpened = (event: any) => {
      console.log('[🔍 COLGROUP-EVENT] Column group opened/closed:', event);
      saveStateDebounced();
    };

    // Add event listener
    if (typeof gridApi.addEventListener === 'function') {
      gridApi.addEventListener('columnGroupOpened', onColumnGroupOpened);
    }

    // Return cleanup function
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      if (typeof gridApi.removeEventListener === 'function') {
        gridApi.removeEventListener('columnGroupOpened', onColumnGroupOpened);
      }
    };
  }
}