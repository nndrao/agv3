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
    console.log('[🔍][COLUMN_GROUP_SERVICE] applyColumnGroups called');
    console.log('[🔍][COLUMN_GROUP_SERVICE] - gridApi:', !!gridApi);
    console.log('[🔍][COLUMN_GROUP_SERVICE] - columnApi:', !!columnApi); 
    console.log('[🔍][COLUMN_GROUP_SERVICE] - groups:', JSON.stringify(groups, null, 2));
    console.log('[🔍][COLUMN_GROUP_SERVICE] - originalColumnDefs provided:', !!originalColumnDefs, originalColumnDefs?.length);
    
    // Log detailed group information
    groups.forEach((group, index) => {
      console.log(`[🔍][COLUMN_GROUP_SERVICE] Group ${index} - ${group.headerName}:`);
      console.log('[🔍][COLUMN_GROUP_SERVICE]   - openByDefault:', group.openByDefault);
      console.log('[🔍][COLUMN_GROUP_SERVICE]   - columnStates:', group.columnStates);
      console.log('[🔍][COLUMN_GROUP_SERVICE]   - children:', group.children);
    });
    
    if (!gridApi) {
      console.error('Grid API not available');
      return;
    }

    // Get the original column definitions if not provided
    let baseColumnDefs = originalColumnDefs;
    if (!baseColumnDefs) {
      console.log('[ColumnGroupService] Getting column defs from grid...');
      // Try to get from grid state
      const gridState = gridApi.getColumnDefs();
      console.log('- Grid state column defs:', gridState?.length);
      if (gridState && gridState.length > 0) {
        // Extract base columns from current state (flatten any existing groups)
        baseColumnDefs = this.extractBaseColumns(gridState);
        console.log('- Extracted base columns:', baseColumnDefs.length);
      } else {
        console.error('No column definitions available');
        return;
      }
    }

    console.log('[ColumnGroupService] Base column defs:', baseColumnDefs.length);
    console.log('- Base columns:', baseColumnDefs.map(col => ({ colId: col.colId, field: col.field, headerName: col.headerName })));

    // Build new column definitions with groups (pass gridApi to preserve column state)
    const newColumnDefs = this.buildColumnDefsWithGroups(baseColumnDefs, groups, gridApi);
    console.log('[ColumnGroupService] Built new column defs:', newColumnDefs.length);
    console.log('- New column defs structure:', newColumnDefs.map(col => {
      if ('children' in col) {
        return { type: 'group', headerName: col.headerName, children: col.children?.length };
      } else {
        return { type: 'column', colId: col.colId, field: col.field };
      }
    }));
    
    // Store the current column group state before applying new definitions
    let currentGroupState: any[] = [];
    try {
      // Try to get column group state before changes
      if (typeof (gridApi as any).getColumnGroupState === 'function') {
        currentGroupState = (gridApi as any).getColumnGroupState() || [];
        console.log('[🔍][COLUMN_GROUP_SERVICE] Current group state before applying:', currentGroupState);
      }
    } catch (e) {
      console.log('[🔍][COLUMN_GROUP_SERVICE] Could not get column group state');
    }
    
    // Get the column state to restore after applying groups
    // Use pending state from GridStateManager if available, otherwise use current state
    let savedColumnState = null;
    if (gridStateManager && typeof gridStateManager.getPendingColumnState === 'function') {
      savedColumnState = gridStateManager.getPendingColumnState();
      console.log('[🔍][COLUMN_GROUP_SERVICE] Using pending column state from GridStateManager:', savedColumnState?.length, 'columns');
      // Clear the pending state after using it
      gridStateManager.clearPendingColumnState();
    }
    if (!savedColumnState) {
      savedColumnState = gridApi.getColumnState();
      console.log('[🔍][COLUMN_GROUP_SERVICE] Using current column state:', savedColumnState?.length, 'columns');
    }
    
    // Apply the new column definitions to the grid
    console.log('[🔍][COLUMN_GROUP_SERVICE] Applying to grid...');
    console.log('[🔍][COLUMN_GROUP_SERVICE] Final columnDefs being applied:', JSON.stringify(newColumnDefs, null, 2));
    gridApi.setGridOption('columnDefs', newColumnDefs);
    
    // Restore column state (widths, order, visibility) after applying column groups
    setTimeout(() => {
      if (savedColumnState && savedColumnState.length > 0) {
        console.log('[🔍][COLUMN_GROUP_SERVICE] Restoring column state (widths, order, visibility)...');
        console.log('[🔍][COLUMN_GROUP_SERVICE] Column state to apply:', JSON.stringify(savedColumnState, null, 2));
        
        // Check what columns have hide state
        const hiddenColumns = savedColumnState.filter((col: any) => col.hide === true);
        console.log('[🔍][COLUMN_GROUP_SERVICE] Hidden columns:', hiddenColumns.map((c: any) => c.colId));
        
        const result = gridApi.applyColumnState({
          state: savedColumnState,
          applyOrder: true,
          defaultState: { width: null }
        });
        
        console.log('[🔍][COLUMN_GROUP_SERVICE] Apply column state result:', result);
        console.log('[🔍][COLUMN_GROUP_SERVICE] Column state restored');
      }
      
      // Apply column group state if available
      setTimeout(() => {
        console.log('[🔍][COLUMN_GROUP_SERVICE] Checking for pending column group state...');
        
        // Check if we have pending column group state from GridStateManager
        if (gridStateManager && typeof gridStateManager.getPendingColumnGroupState === 'function') {
          const pendingGroupState = gridStateManager.getPendingColumnGroupState();
          if (pendingGroupState && pendingGroupState.length > 0) {
            console.log('[🔍][COLUMN_GROUP_SERVICE] Applying pending column group state:', pendingGroupState);
            
            if (typeof (gridApi as any).setColumnGroupOpened === 'function') {
              pendingGroupState.forEach((groupState: any) => {
                try {
                  (gridApi as any).setColumnGroupOpened(groupState.groupId, groupState.open);
                  console.log(`[🔍][COLUMN_GROUP_SERVICE] Set group ${groupState.groupId} to ${groupState.open ? 'expanded' : 'collapsed'}`);
                  
                  // After setting group state, verify column visibility is correct
                  const columnDefs = gridApi.getColumnDefs();
                  if (columnDefs) {
                    columnDefs.forEach((def: any) => {
                      if (def.groupId === groupState.groupId && def.children) {
                        def.children.forEach((child: any) => {
                          const colId = child.colId || child.field;
                          const columnGroupShow = child.columnGroupShow;
                          
                          if (columnGroupShow) {
                            const shouldBeVisible = 
                              (columnGroupShow === 'open' && groupState.open) ||
                              (columnGroupShow === 'closed' && !groupState.open);
                            
                            console.log(`[🔍][COLUMN_GROUP_SERVICE] Column ${colId} with columnGroupShow:'${columnGroupShow}' should be ${shouldBeVisible ? 'visible' : 'hidden'}`);
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
            console.log('[🔍][COLUMN_GROUP_SERVICE] No pending column group state to apply');
          }
        }
        
        // Final verification of column visibility
        setTimeout(() => {
          console.log('[🔍][COLUMN_GROUP_SERVICE] Final verification of column states:');
          const finalColumnState = gridApi.getColumnState();
          const columnsWithGroupShow = finalColumnState?.filter((col: any) => {
            const colDef = gridApi.getColumnDef(col.colId);
            return colDef && colDef.columnGroupShow;
          });
          
          if (columnsWithGroupShow && columnsWithGroupShow.length > 0) {
            columnsWithGroupShow.forEach((col: any) => {
              const colDef = gridApi.getColumnDef(col.colId);
              console.log(`[🔍][COLUMN_GROUP_SERVICE] Column ${col.colId} - columnGroupShow: ${colDef.columnGroupShow}, hidden: ${col.hide}`);
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
        console.log('[ColumnGroupService] autoSizeAllColumns not available');
      }
    }
    
    // Refresh the grid
    gridApi.refreshCells({ force: true });
    
    // Verify what AG-Grid actually has
    setTimeout(() => {
      const appliedDefs = gridApi.getColumnDefs();
      console.log('[🔍][COLUMN_GROUP_SERVICE] Verification - Applied column defs:');
      appliedDefs?.forEach((def: any, index: number) => {
        if (def.children) {
          console.log(`[🔍][COLUMN_GROUP_SERVICE] [${index}] Group: ${def.headerName}, openByDefault: ${def.openByDefault}`);
          def.children.forEach((child: any) => {
            console.log(`[🔍][COLUMN_GROUP_SERVICE]   - Child: ${child.field || child.colId}, columnGroupShow: ${child.columnGroupShow}`);
          });
        } else {
          console.log(`[🔍][COLUMN_GROUP_SERVICE] [${index}] Column: ${def.field || def.colId}`);
        }
      });
      
      // Test column group expansion behavior
      if (columnApi) {
        console.log('[ColumnGroupService] Testing column group states:');
        try {
          // Try to get column group states
          const columnGroupStates = columnApi.getColumnGroupState?.();
          if (columnGroupStates) {
            console.log('Column group states:', columnGroupStates);
          }
        } catch (e) {
          console.log('Could not get column group states:', e);
        }
      }
    }, 100);
    
    console.log('[ColumnGroupService] Column groups applied successfully');
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
    console.log('[buildColumnDefsWithGroups] Starting...');
    console.log('- Base columns:', baseColumns.length);
    console.log('- Groups:', groups.length);
    
    // Get current column state to preserve widths and other properties
    let currentColumnState: any[] = [];
    if (gridApi) {
      currentColumnState = gridApi.getColumnState() || [];
      console.log('- Current column state:', currentColumnState.length, 'columns');
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
    console.log('- Column map size:', columnMap.size);
    console.log('- Column map keys:', Array.from(columnMap.keys()));

    // Create a set of grouped column IDs
    const groupedColumnIds = new Set<string>();
    groups.forEach(group => {
      console.log(`- Processing group "${group.headerName}" with children:`, group.children);
      group.children.forEach(colId => groupedColumnIds.add(colId));
    });
    console.log('- Grouped column IDs:', Array.from(groupedColumnIds));

    // Build the final column definitions
    const finalColumnDefs: (ColDef | ColGroupDef)[] = [];

    // Add column groups
    groups.forEach(group => {
      console.log(`- Building group "${group.headerName}"`);
      const groupChildren: ColDef[] = [];
      
      group.children.forEach(colId => {
        const colDef = columnMap.get(colId);
        console.log(`  - Looking for column "${colId}":`, !!colDef);
        if (colDef) {
          // Apply columnGroupShow if defined in columnStates
          const columnState = group.columnStates?.[colId];
          // Create a new column definition with columnGroupShow
          let colDefWithGroupShow: any = { ...colDef };
          if (columnState !== undefined) {
            colDefWithGroupShow.columnGroupShow = columnState;
          }
          console.log(`  - Column "${colId}" columnGroupShow:`, columnState);
          console.log(`  - Full column def:`, {
            field: colDefWithGroupShow.field,
            headerName: colDefWithGroupShow.headerName,
            columnGroupShow: colDefWithGroupShow.columnGroupShow,
            width: colDefWithGroupShow.width
          });
          groupChildren.push(colDefWithGroupShow);
        } else {
          console.warn(`  - Column "${colId}" not found in column map!`);
        }
      });

      console.log(`- Group "${group.headerName}" has ${groupChildren.length} children`);
      if (groupChildren.length > 0) {
        const colGroupDef: ColGroupDef = {
          headerName: group.headerName,
          groupId: group.groupId,
          children: groupChildren,
          openByDefault: group.openByDefault ?? true,
          marryChildren: group.marryChildren || false
        };
        console.log(`- Group "${group.headerName}" openByDefault:`, colGroupDef.openByDefault);
        finalColumnDefs.push(colGroupDef);
        console.log(`- Added group "${group.headerName}" to final defs`);
      } else {
        console.warn(`- Skipping empty group "${group.headerName}"`);
      }
    });

    // Add ungrouped columns
    const ungroupedCount = baseColumns.filter(col => {
      const colId = col.colId || col.field;
      return colId && !groupedColumnIds.has(colId);
    }).length;
    
    console.log('- Ungrouped columns to add:', ungroupedCount);
    baseColumns.forEach(col => {
      const colId = col.colId || col.field;
      if (colId && !groupedColumnIds.has(colId)) {
        finalColumnDefs.push(col);
        console.log(`  - Added ungrouped column "${colId}"`);
      }
    });

    console.log('[buildColumnDefsWithGroups] Final result:', finalColumnDefs.length, 'definitions');
    
    // Log the structure of column groups
    finalColumnDefs.forEach((def, index) => {
      if ('children' in def) {
        console.log(`[${index}] Group: ${def.headerName}, openByDefault: ${def.openByDefault}`);
        def.children.forEach((child: any) => {
          console.log(`  - Child: ${child.headerName || child.field}, columnGroupShow: ${child.columnGroupShow}`);
        });
      } else {
        console.log(`[${index}] Column: ${def.headerName || def.field}`);
      }
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