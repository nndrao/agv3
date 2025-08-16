import { useCallback } from 'react';
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
 * Strict Order of Operations:
 * 1. Reset grid to provider's original columnDefs (if switching profiles)
 * 2. Apply grid options
 * 3. Add calculated columns
 * 4. Apply column groups
 * 5. Apply custom column styles (future feature)
 * 6. Apply conditional formatting
 * 7. Set final columnDefs to grid (single update)
 * 8. Apply grid state (column state, filters, sorts) synchronously
 * 
 * This approach is performant, predictable, and avoids complex async patterns
 */
export function useProfileApplication({
  gridApiRef,
  originalColumnDefsRef,
  gridStateManagerRef,
  providerConfig,
  conditionalFormattingRules,
  gridInstanceId
}: UseProfileApplicationProps) {
  
  /**
   * Reset grid to clean state using provider's original columnDefs
   */
  const resetGrid = useCallback(() => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    console.log('[ProfileApplication] Resetting grid to provider\'s original columnDefs');
    
    // Clear all state
    gridApi.setFilterModel(null);
    gridApi.resetColumnState();
    gridApi.deselectAll();
    
    // Reset to provider's original column definitions
    const originalDefs = JSON.parse(JSON.stringify(originalColumnDefsRef.current));
    gridApi.setGridOption('columnDefs', originalDefs);
    
    // Reset to default grid options
    const defaultOptions = getDefaultGridOptions();
    Object.entries(defaultOptions).forEach(([key, value]) => {
      if (!INITIAL_GRID_OPTIONS.includes(key)) {
        gridApi.setGridOption(key as any, value);
      }
    });
    
    console.log('[ProfileApplication] Grid reset complete');
  }, [originalColumnDefsRef, gridApiRef]);
  
  /**
   * Step 1: Apply grid options
   */
  const applyGridOptions = useCallback((gridOptions: Record<string, any> | undefined) => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    console.log('[ProfileApplication] Step 1: Applying grid options');
    
    // Start with defaults
    const defaultOptions = getDefaultGridOptions();
    
    // Always ensure cell flashing is enabled
    const optionsToApply = {
      ...defaultOptions,
      enableCellChangeFlash: true,
      cellFlashDuration: 500,
      cellFadeDuration: 1000,
      ...gridOptions // Profile overrides defaults
    };
    
    // Apply all options at once
    Object.entries(optionsToApply).forEach(([key, value]) => {
      if (!INITIAL_GRID_OPTIONS.includes(key)) {
        gridApi.setGridOption(key as any, value);
      }
    });
    
    console.log('[ProfileApplication] Grid options applied');
  }, [gridApiRef]);
  
  /**
   * Step 2: Add calculated columns to columnDefs
   */
  const addCalculatedColumns = useCallback((
    columnDefs: ColDef[],
    calculatedColumns: CalculatedColumnDefinition[] | undefined
  ): ColDef[] => {
    if (!calculatedColumns || calculatedColumns.length === 0) {
      return columnDefs;
    }
    
    console.log('[ProfileApplication] Step 2: Adding calculated columns:', calculatedColumns.length);
    
    const calcColDefs = calculatedColumns.map(col => {
      const valueGetter = (params: any) => {
        try {
          // Convert [Field] to params.data.Field
          const expr = (col.expression || '').replace(/\[([^\]]+)\]/g, 'params.data.$1');
          // eslint-disable-next-line no-new-func
          const fn = new Function('params', `try { const data = params.data; const value = undefined; return (${expr}); } catch(e){ return undefined; }`);
          return fn(params);
        } catch {
          return undefined;
        }
      };
      
      const def: any = {
        field: col.field,
        headerName: col.headerName || col.field,
        valueGetter,
        cellDataType: col.cellDataType || 'text',
        pinned: col.pinned,
        width: col.width,
        enableCellChangeFlash: true
      };
      
      if (col.valueFormatter) {
        def.valueFormatter = col.valueFormatter;
      }
      
      return def;
    });
    
    return [...columnDefs, ...calcColDefs];
  }, []);
  
  /**
   * Step 3: Apply column groups
   */
  const applyColumnGroups = useCallback((
    columnDefs: ColDef[],
    columnGroups: any[] | undefined,
    gridApi: GridApi
  ): ColDef[] => {
    if (!columnGroups || columnGroups.length === 0) {
      return columnDefs;
    }
    
    console.log('[ProfileApplication] Step 3: Applying column groups');
    
    // Store column groups in grid state manager for later retrieval
    gridStateManagerRef.current.setColumnGroups(columnGroups);
    
    // Filter to only active groups
    const activeGroups = columnGroups.filter(g => g.isActive !== false);
    
    if (activeGroups.length === 0) {
      return columnDefs;
    }
    
    // Use ColumnGroupService to build columnDefs with groups
    return ColumnGroupService.buildColumnDefsWithGroups(columnDefs, activeGroups, gridApi);
  }, [gridStateManagerRef]);
  
  /**
   * Step 4: Apply custom column styles (future feature)
   */
  const applyCustomColumnStyles = useCallback((
    columnDefs: ColDef[],
    columnStyles: Record<string, any> | undefined
  ): ColDef[] => {
    if (!columnStyles || Object.keys(columnStyles).length === 0) {
      return columnDefs;
    }
    
    console.log('[ProfileApplication] Step 4: Applying custom column styles');
    
    // Future implementation: Apply custom CSS styles to specific columns
    // For now, just return the columnDefs unchanged
    return columnDefs;
  }, []);
  
  /**
   * Step 5: Apply conditional formatting
   */
  const applyConditionalFormatting = useCallback((
    columnDefs: ColDef[]
  ): ColDef[] => {
    console.log('[ProfileApplication] Step 5: Applying conditional formatting');
    
    return applyConditionalFormattingToColumns(
      columnDefs,
      conditionalFormattingRules,
      gridInstanceId
    );
  }, [conditionalFormattingRules, gridInstanceId]);
  
  /**
   * Step 6: Apply grid state synchronously
   */
  const applyGridStateSynchronously = useCallback((
    gridState: any,
    gridApi: GridApi
  ) => {
    console.log('[ProfileApplication] Step 6: Applying grid state synchronously');
    
    // Apply filters
    if (gridState.filterModel) {
      gridApi.setFilterModel(gridState.filterModel);
    }
    
    // Apply column state (width, order, visibility, sorting)
    if (gridState.columnState && gridState.columnState.length > 0) {
      gridApi.applyColumnState({
        state: gridState.columnState,
        applyOrder: true,
        defaultState: { width: null }
      });
    }
    
    // Apply column group state
    if (gridState.columnGroupState && gridState.columnGroupState.length > 0) {
      if (gridApi.setColumnGroupState) {
        gridApi.setColumnGroupState(gridState.columnGroupState);
      } else {
        // Fallback for older AG-Grid versions
        gridState.columnGroupState.forEach((state: any) => {
          if (typeof (gridApi as any).setColumnGroupOpened === 'function') {
            (gridApi as any).setColumnGroupOpened(state.groupId, state.open);
          }
        });
      }
    }
    
    // Apply other state properties
    if (gridState.quickFilter) {
      gridApi.setGridOption('quickFilterText', gridState.quickFilter);
    }
    
    console.log('[ProfileApplication] Grid state applied');
  }, []);
  
  /**
   * Main function to apply profile to grid
   * Follows strict order of operations for predictable, performant results
   */
  const applyProfile = useCallback((
    profile: DataGridStompSharedProfile,
    isProfileSwitch: boolean
  ) => {
    const gridApi = gridApiRef.current;
    if (!gridApi) {
      console.warn('[ProfileApplication] Cannot apply profile - Grid API not available');
      return;
    }
    
    console.log('[ProfileApplication] Starting profile application:', {
      profileName: profile.name,
      isProfileSwitch,
      hasColumnGroups: !!profile.columnGroups,
      hasCalculatedColumns: !!profile.calculatedColumns,
      hasGridState: !!profile.gridState
    });
    
    // Performance optimization: Suppress events during profile application
    gridApi.setGridOption('suppressColumnStateEvents', true);
    
    try {
      // Step 0: Reset grid if switching profiles
      if (isProfileSwitch) {
        resetGrid();
      }
      
      // Step 1: Apply grid options
      applyGridOptions(profile.gridOptions);
      
      // Build final columnDefs through transformation pipeline
      // Start with a fresh copy of provider's original columnDefs
      let columnDefs = JSON.parse(JSON.stringify(originalColumnDefsRef.current));
      
      // Step 2: Add calculated columns
      columnDefs = addCalculatedColumns(columnDefs, profile.calculatedColumns);
      
      // Step 3: Apply column groups
      columnDefs = applyColumnGroups(columnDefs, profile.columnGroups, gridApi);
      
      // Step 4: Apply custom column styles (future feature)
      columnDefs = applyCustomColumnStyles(columnDefs, profile.columnStyles);
      
      // Step 5: Apply conditional formatting
      columnDefs = applyConditionalFormatting(columnDefs);
      
      // Ensure cell flashing is enabled on all columns
      columnDefs = columnDefs.map(col => ({
        ...col,
        enableCellChangeFlash: true
      }));
      
      // Step 6: Set final columnDefs to grid (single update)
      console.log('[ProfileApplication] Setting final columnDefs to grid:', {
        totalColumns: columnDefs.length,
        hasGroups: columnDefs.some((col: any) => col.children)
      });
      gridApi.setGridOption('columnDefs', columnDefs);
      
      // Step 7: Apply grid state synchronously
      if (profile.gridState) {
        applyGridStateSynchronously(profile.gridState, gridApi);
      } else if (profile.columnState || profile.filterModel) {
        // Fallback to legacy properties
        if (profile.columnState && profile.columnState.length > 0) {
          gridApi.applyColumnState({
            state: profile.columnState,
            applyOrder: true
          });
        }
        if (profile.filterModel && Object.keys(profile.filterModel).length > 0) {
          gridApi.setFilterModel(profile.filterModel);
        }
      }
      
      // Apply column group expansion state if not already in gridState
      if (!profile.gridState?.columnGroupState && profile.columnGroups) {
        const groupState = profile.columnGroups
          .filter(g => g.isActive !== false)
          .map(g => ({
            groupId: g.groupId,
            open: g.openByDefault ?? true
          }));
        
        if (groupState.length > 0 && gridApi.setColumnGroupState) {
          gridApi.setColumnGroupState(groupState);
        }
      }
      
    } finally {
      // Re-enable events
      gridApi.setGridOption('suppressColumnStateEvents', false);
      
      // Final refresh
      gridApi.refreshCells({ force: true });
      
      console.log('[ProfileApplication] Profile application complete');
    }
  }, [
    resetGrid,
    applyGridOptions,
    addCalculatedColumns,
    applyColumnGroups,
    applyCustomColumnStyles,
    applyConditionalFormatting,
    applyGridStateSynchronously,
    originalColumnDefsRef,
    gridApiRef
  ]);
  
  return {
    applyProfile,
    resetGrid
  };
}