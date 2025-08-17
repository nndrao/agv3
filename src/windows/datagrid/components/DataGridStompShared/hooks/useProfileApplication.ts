import { useCallback, useRef } from 'react';
import { GridApi, ColDef } from 'ag-grid-community';
import { DataGridStompSharedProfile, CalculatedColumnDefinition } from '../types';
import { ColumnGroupService } from '../columnGroups/columnGroupService';
import { GridStateManager } from '../utils/gridStateManager';
import { getDefaultGridOptions } from '../gridOptions/gridOptionsConfig';
import { INITIAL_GRID_OPTIONS } from '../config/constants';
import { 
  applyConditionalFormattingToColumns,
  ConditionalFormattingRule as ConditionalFormattingRuleRT
} from '@/utils/conditionalFormattingRuntime';

interface UseProfileApplicationProps {
  gridApiRef: React.MutableRefObject<GridApi | null>;
  originalColumnDefsRef: React.MutableRefObject<any[]>;
  gridStateManagerRef: React.MutableRefObject<GridStateManager>;
  providerConfig: any;
  conditionalFormattingRules: ConditionalFormattingRuleRT[];
  gridInstanceId: string;
}

/**
 * Hook that provides a centralized, deterministic way to apply profile settings to AG-Grid
 * 
 * CORRECT Order of operations (AG-Grid v33+ best practices):
 * 1. Reset AG-Grid's all states (using v33+ APIs)
 * 2. Apply columnDefs from data provider to grid
 * 3. Apply grid options from selected profile settings
 * 4. Apply calculated columns to columnDefs
 * 5. Apply column groups to columnDefs
 * 6. Apply column styles and settings (future)
 * 7. Apply conditional formatting rules to columnDefs
 * 8. Apply all grid states (column state FIRST, then column group state)
 */
export function useProfileApplication({
  gridApiRef,
  originalColumnDefsRef,
  gridStateManagerRef,
  providerConfig,
  conditionalFormattingRules,
  gridInstanceId
}: UseProfileApplicationProps) {
  

  
  const applyGridOptions = useCallback((gridOptions: Record<string, any> | undefined) => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    const defaultOptions = {
      ...getDefaultGridOptions(),
      enableCellChangeFlash: true,
      cellFlashDuration: 500,
      cellFadeDuration: 1000
    };
    
    const finalOptions = { ...defaultOptions, ...gridOptions };
    Object.entries(finalOptions).forEach(([key, value]) => {
      if (!INITIAL_GRID_OPTIONS.includes(key) && value !== undefined) {
        gridApi.setGridOption(key as any, value);
      }
    });
  }, []);
  
  const applyCalculatedColumns = useCallback((
    baseColumnDefs: ColDef[],
    calculatedColumns: CalculatedColumnDefinition[] | undefined
  ): ColDef[] => {
    if (!calculatedColumns?.length) return baseColumnDefs;
    
    // Pre-compile expressions for better performance
    const calcColDefs = calculatedColumns.map(col => {
      // Cache the compiled function
      const expr = (col.expression || '').replace(/\[([^\]]+)\]/g, 'params.data.$1');
      const compiledFn = new Function('params', `try { return (${expr}); } catch{ return undefined; }`);
      
      return {
        field: col.field,
        headerName: col.headerName || col.field,
        valueGetter: compiledFn,
        cellDataType: col.cellDataType || 'text',
        pinned: col.pinned,
        width: col.width,
        enableCellChangeFlash: true,
        ...(col.valueFormatter && { valueFormatter: col.valueFormatter })
      };
    });
    
    return baseColumnDefs.concat(calcColDefs); // concat is faster than spread
  }, []);

  const applyColumnGroups = useCallback((
    columnDefs: ColDef[],
    columnGroups: any[] | undefined
  ): ColDef[] => {
    if (!columnGroups?.length) return columnDefs;
    
    const activeGroups = columnGroups.filter(g => g.isActive !== false);
    if (!activeGroups.length) return columnDefs;
    
    gridStateManagerRef.current.setColumnGroups(columnGroups);
    return ColumnGroupService.buildColumnDefsWithGroups(
      columnDefs,
      activeGroups,
      gridApiRef.current
    );
  }, []);

  const applyConditionalFormatting = useCallback((columnDefs: ColDef[]): ColDef[] => {
    const formattedDefs = applyConditionalFormattingToColumns(
      columnDefs,
      conditionalFormattingRules,
      gridInstanceId
    );
    
    return formattedDefs.map(col => ({
      ...col,
      enableCellChangeFlash: true
    }));
  }, [conditionalFormattingRules, gridInstanceId]);

  const applyGridStates = useCallback((profile: DataGridStompSharedProfile) => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    // Fast state application - only essential operations
    const columnState = profile.gridState?.columnState || profile.columnState;
    const filterModel = profile.gridState?.filterModel || profile.filterModel;
    
    // Apply column state (most important for profile switching)
    if (columnState?.length) {
      gridApi.applyColumnState({ state: columnState, applyOrder: true });
    }
    
    // Apply filters (second most important)
    if (filterModel && Object.keys(filterModel).length) {
      gridApi.setFilterModel(filterModel);
    }
    
    // Skip other state applications for speed - they're less critical for profile switching
  }, []);
  
  const applyProfile = useCallback((profile: DataGridStompSharedProfile) => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    // Ultra-fast batch application - do everything in one transaction
    const columnState = profile.gridState?.columnState || profile.columnState;
    const filterModel = profile.gridState?.filterModel || profile.filterModel;
    const hasCustomColumns = profile.calculatedColumns?.length || profile.columnGroups?.length;
    
    // Batch all operations to minimize redraws
    gridApi.setGridOption('suppressAnimationFrame', true);
    
    try {
      // 1. Apply grid options (instant)
      if (profile.gridOptions) {
        const defaultOptions = {
          ...getDefaultGridOptions(),
          enableCellChangeFlash: true,
          cellFlashDuration: 500,
          cellFadeDuration: 1000,
          ...profile.gridOptions
        };
        
        Object.entries(defaultOptions).forEach(([key, value]) => {
          if (!INITIAL_GRID_OPTIONS.includes(key) && value !== undefined) {
            gridApi.setGridOption(key as any, value);
          }
        });
      }
      
      // 2. Update column definitions if needed (before applying state)
      if (hasCustomColumns) {
        let columnDefs = originalColumnDefsRef.current.map((col: any) => ({
          ...col,
          enableCellChangeFlash: true
        }));
        
        if (profile.calculatedColumns?.length) {
          columnDefs = applyCalculatedColumns(columnDefs, profile.calculatedColumns);
        }
        
        if (profile.columnGroups?.length) {
          columnDefs = applyColumnGroups(columnDefs, profile.columnGroups);
        }
        
        columnDefs = applyConditionalFormatting(columnDefs);
        gridApi.setGridOption('columnDefs', columnDefs);
      }
      
      // 3. Apply column state and filters in one batch (most critical)
      if (columnState?.length) {
        gridApi.applyColumnState({ state: columnState, applyOrder: true });
      }
      
      if (filterModel && Object.keys(filterModel).length) {
        gridApi.setFilterModel(filterModel);
      }
      
    } finally {
      // Re-enable animations
      gridApi.setGridOption('suppressAnimationFrame', false);
    }
  }, [applyCalculatedColumns, applyColumnGroups, applyConditionalFormatting, originalColumnDefsRef]);
  
  return {
    applyProfile
  };
}