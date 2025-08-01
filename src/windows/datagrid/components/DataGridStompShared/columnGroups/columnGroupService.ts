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
    originalColumnDefs?: ColDef[]
  ): void {
    console.log('[ColumnGroupService.applyColumnGroups] Starting...');
    console.log('- gridApi:', !!gridApi);
    console.log('- columnApi:', !!columnApi); 
    console.log('- groups:', groups);
    console.log('- originalColumnDefs provided:', !!originalColumnDefs, originalColumnDefs?.length);
    
    // Log detailed group information
    groups.forEach((group, index) => {
      console.log(`[Group ${index}] ${group.headerName}:`);
      console.log('  - openByDefault:', group.openByDefault);
      console.log('  - columnStates:', group.columnStates);
      console.log('  - children:', group.children);
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

    // Build new column definitions with groups
    const newColumnDefs = this.buildColumnDefsWithGroups(baseColumnDefs, groups);
    console.log('[ColumnGroupService] Built new column defs:', newColumnDefs.length);
    console.log('- New column defs structure:', newColumnDefs.map(col => {
      if ('children' in col) {
        return { type: 'group', headerName: col.headerName, children: col.children?.length };
      } else {
        return { type: 'column', colId: col.colId, field: col.field };
      }
    }));
    
    // Apply the new column definitions to the grid
    console.log('[ColumnGroupService] Applying to grid...');
    console.log('[ColumnGroupService] Final columnDefs being applied:', JSON.stringify(newColumnDefs, null, 2));
    gridApi.setGridOption('columnDefs', newColumnDefs);
    
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
      console.log('[ColumnGroupService] Verifying applied column defs:');
      appliedDefs?.forEach((def: any, index: number) => {
        if (def.children) {
          console.log(`[${index}] Group: ${def.headerName}, openByDefault: ${def.openByDefault}`);
          def.children.forEach((child: any) => {
            console.log(`  - Child: ${child.field || child.colId}, columnGroupShow: ${child.columnGroupShow}`);
          });
        } else {
          console.log(`[${index}] Column: ${def.field || def.colId}`);
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
    groups: ColumnGroupDefinition[]
  ): (ColDef | ColGroupDef)[] {
    console.log('[buildColumnDefsWithGroups] Starting...');
    console.log('- Base columns:', baseColumns.length);
    console.log('- Groups:', groups.length);
    
    // Create a map of column ID to column definition
    const columnMap = new Map<string, ColDef>();
    baseColumns.forEach(col => {
      const colId = col.colId || col.field;
      if (colId) {
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
            columnGroupShow: colDefWithGroupShow.columnGroupShow
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