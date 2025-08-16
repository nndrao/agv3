import { ColumnGroupDefinition } from './types';
import { ColDef, ColGroupDef } from 'ag-grid-community';

export class ColumnGroupService {
  /**
   * Apply column groups to AG-Grid
   */
  static applyColumnGroups(
    gridApi: any,
    columnApi: any,
    groups: ColumnGroupDefinition[],
    originalColumnDefs?: ColDef[],
    gridStateManager?: any
  ): void {
    
    // Filter to only apply active groups
    const activeGroups = groups.filter(g => g.isActive !== false);
    console.log('[🔍 COLGROUP-SERVICE-001] applyColumnGroups called:', {
      totalGroups: groups.length,
      activeGroups: activeGroups.length,
      groups: groups.map(g => ({ 
        groupId: g.groupId, 
        headerName: g.headerName, 
        isActive: g.isActive,
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
    
    // Apply the new column definitions to the grid
    gridApi.setGridOption('columnDefs', newColumnDefs);
    
    // Get the initial column group state before setting up listeners
    const initialGroupState = gridApi.getColumnGroupState ? gridApi.getColumnGroupState() : [];
    console.log('[🔍 COLGROUP-SERVICE-008] Initial column group state after applying defs:', initialGroupState);
    
    // Let AG-Grid handle column group expand/collapse natively
    // The columnGroupShow property on columns will be respected automatically
    
    // Column state and group state are now handled by the profile application flow
    // No need for delays here - the new architecture handles this synchronously
    console.log('[🔍 COLGROUP-SERVICE-009] Column groups applied successfully');
    
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
    
    // Verify what AG-Grid actually has
    setTimeout(() => {
      gridApi.getColumnDefs();
      
      // Test column group expansion behavior
      if (columnApi) {
        try {
          // Try to get column group states
          const columnGroupStates = columnApi.getColumnGroupState?.();
          if (columnGroupStates) {
          }
        } catch (e) {
        }
      }
    }, 100);
    
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
   * Build column definitions with groups
   * This is a pure function that returns new columnDefs without side effects
   */
  static buildColumnDefsWithGroups(
    baseColumns: ColDef[],
    groups: ColumnGroupDefinition[],
    gridApi?: any
  ): (ColDef | ColGroupDef)[] {
    
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
   * Save column group configuration
   */
  static saveConfiguration(groups: ColumnGroupDefinition[]): string {
    const config = {
      version: '1.0.0',
      groups: groups,
      timestamp: Date.now()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Load column group configuration
   */
  static loadConfiguration(configJson: string): ColumnGroupDefinition[] {
    try {
      const config = JSON.parse(configJson);
      return config.groups || [];
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
}