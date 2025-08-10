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
    
    // Log detailed group information removed
    
    if (!gridApi) {
      console.error('Grid API not available');
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
    const newColumnDefs = this.buildColumnDefsWithGroups(baseColumnDefs, groups, gridApi);
    
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
    
    // Restore column state (widths, order, visibility) after applying column groups
    setTimeout(() => {
      if (savedColumnState && savedColumnState.length > 0) {
        
        gridApi.applyColumnState({
          state: savedColumnState,
          applyOrder: true,
          defaultState: { width: null }
        });
        
      }
      
      // Apply column group state if available
      setTimeout(() => {
        
        // Check if we have pending column group state from GridStateManager
        if (gridStateManager && typeof gridStateManager.getPendingColumnGroupState === 'function') {
          const pendingGroupState = gridStateManager.getPendingColumnGroupState();
          if (pendingGroupState && pendingGroupState.length > 0) {
            
            if (typeof (gridApi as any).setColumnGroupOpened === 'function') {
              pendingGroupState.forEach((groupState: any) => {
                try {
                  (gridApi as any).setColumnGroupOpened(groupState.groupId, groupState.open);
                  
                  // After setting group state, verify column visibility is correct
                  const columnDefs = gridApi.getColumnDefs();
                  if (columnDefs) {
                    columnDefs.forEach((def: any) => {
                      if (def.groupId === groupState.groupId && def.children) {
                        def.children.forEach((child: any) => {
                          const columnGroupShow = child.columnGroupShow;
                          
                          if (columnGroupShow) {
                            // Column visibility is handled by AG-Grid based on columnGroupShow
                          }
                        });
                      }
                    });
                  }
                } catch (e) {
                  console.warn(`[🔍][COLUMN_GROUP_SERVICE] Could not set state for group ${groupState.groupId}:`, e);
                }
              });
            }
            
            // Clear the pending state after applying
            gridStateManager.clearPendingColumnGroupState();
          } else {
          }
        }
        
        // Final verification of column visibility
        setTimeout(() => {
          const finalColumnState = gridApi.getColumnState();
          const columnsWithGroupShow = finalColumnState?.filter((col: any) => {
            const colDef = gridApi.getColumnDef(col.colId);
            return colDef && colDef.columnGroupShow;
          });
          
          if (columnsWithGroupShow && columnsWithGroupShow.length > 0) {
            columnsWithGroupShow.forEach((col: any) => {
              // Column group show verification
              gridApi.getColumnDef(col.colId);
            });
          }
        }, 100);
      }, 200); // Give time for column state to be fully applied
    }, 100); // Small delay to let grid apply new column defs first
    
    // Force grid to redraw columns
    if (columnApi) {
      try {
        columnApi.autoSizeAllColumns();
      } catch (e) {
      }
    }
    
    // Refresh the grid
    gridApi.refreshCells({ force: true });
    
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
   */
  private static buildColumnDefsWithGroups(
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

    
    // Log the structure of column groups removed
    
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