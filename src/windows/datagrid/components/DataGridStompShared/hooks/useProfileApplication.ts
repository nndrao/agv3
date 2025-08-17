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
    activeGroupIds: string[] | undefined
  ): ColDef[] => {
    if (!activeGroupIds?.length) return columnDefs;
    
    gridStateManagerRef.current.setActiveColumnGroupIds(activeGroupIds);
    
    // Build column definitions with groups
    const newColumnDefs = ColumnGroupService.buildColumnDefsWithGroups(
      columnDefs,
      activeGroupIds,
      gridInstanceId,
      gridApiRef.current
    );
    
    // Schedule column group state restoration and event listener setup after column definitions are applied
    if (gridApiRef.current) {
      setTimeout(() => {
        // Restore column group state
        ColumnGroupService.loadAndApplyColumnGroupState(
          gridInstanceId,
          gridApiRef.current,
          activeGroupIds
        );
        
        // Set up event listeners to save state changes
        const cleanup = ColumnGroupService.setupColumnGroupStateListeners(
          gridInstanceId,
          gridApiRef.current,
          activeGroupIds
        );
        
        // Store cleanup function for later use (could be stored in a ref if needed)
        // For now, we'll let it be garbage collected when the component unmounts
      }, 100); // Small delay to ensure column definitions are fully applied
    }
    
    return newColumnDefs;
  }, [gridInstanceId]);

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
      
      // 2. Build final column definitions in memory (all transformations at once)
      let finalColumnDefs = originalColumnDefsRef.current.map((col: any) => ({
        ...col,
        enableCellChangeFlash: true
      }));
      
      // Apply all column transformations in sequence (in memory only)
      if (profile.calculatedColumns?.length) {
        finalColumnDefs = applyCalculatedColumns(finalColumnDefs, profile.calculatedColumns);
      }
      
      if (profile.columnGroups?.length) {
        finalColumnDefs = applyColumnGroups(finalColumnDefs, profile.columnGroups);
      }
      
      // Always apply conditional formatting (lightweight operation)
      finalColumnDefs = applyConditionalFormatting(finalColumnDefs);
      
      // Single column definition update (most expensive operation - only done once)
      gridApi.setGridOption('columnDefs', finalColumnDefs);
      
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