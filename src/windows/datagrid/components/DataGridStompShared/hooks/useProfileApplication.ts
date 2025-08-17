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
  
  const lastAppliedProfileRef = useRef<string | null>(null);
  const resetGridCompletely = useCallback(() => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    console.log('[ProfileApplication] Resetting grid to clean state (AG-Grid v33+ method)');
    
    gridApi.resetColumnState();
    gridApi.setFilterModel(null);
    gridApi.setGridOption('quickFilterText', '');
    gridApi.deselectAll();
    
    if (typeof (gridApi as any).setRowGroupColumns === 'function') {
      (gridApi as any).setRowGroupColumns([]);
    }
    
    if (typeof (gridApi as any).setPivotMode === 'function') {
      (gridApi as any).setPivotMode(false);
    }
    
    if (gridApi.paginationGoToFirstPage) {
      gridApi.paginationGoToFirstPage();
    }
    
    if (gridApi.setColumnGroupState) {
      try {
        gridApi.setColumnGroupState([]);
      } catch (error) {
        console.debug('[ProfileApplication] Could not clear column group state:', error);
      }
    }
    
    const resetColumnDefs = JSON.parse(JSON.stringify(originalColumnDefsRef.current)).map((col: any) => ({
      ...col,
      enableCellChangeFlash: true
    }));
    gridApi.setGridOption('columnDefs', resetColumnDefs);
    
    gridStateManagerRef.current.setColumnGroups([]);
    const defaultOptions = getDefaultGridOptions();
    Object.entries(defaultOptions).forEach(([key, value]) => {
      if (!INITIAL_GRID_OPTIONS.includes(key)) {
        try {
          gridApi.setGridOption(key as any, value);
        } catch (error) {
          console.debug(`[ProfileApplication] Could not reset option ${key}:`, error);
        }
      }
    });
    
    console.log('[ProfileApplication] Complete grid reset finished');
  }, [originalColumnDefsRef, gridStateManagerRef]);
  
  const applyGridOptionsFromProfile = useCallback((gridOptions: Record<string, any> | undefined) => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    console.log('[ProfileApplication] Step 3: Applying grid options from profile');
    
    const defaultOptions = getDefaultGridOptions();
    
    defaultOptions.enableCellChangeFlash = true;
    defaultOptions.cellFlashDuration = 500;
    defaultOptions.cellFadeDuration = 1000;
    
    const finalOptions = { ...defaultOptions, ...gridOptions };
    Object.entries(finalOptions).forEach(([key, value]) => {
      if (!INITIAL_GRID_OPTIONS.includes(key) && value !== undefined) {
        try {
          gridApi.setGridOption(key as any, value);
        } catch (error) {
          console.debug(`[ProfileApplication] Could not set grid option ${key}:`, error);
        }
      }
    });
    
    console.log('[ProfileApplication] Grid options applied successfully');
  }, []);
  
  /**
   * Apply calculated columns to column definitions (Step 4)
   */
  const applyCalculatedColumns = useCallback((
    baseColumnDefs: ColDef[],
    calculatedColumns: CalculatedColumnDefinition[] | undefined
  ): ColDef[] => {
    console.log('[ProfileApplication] Step 4: Applying calculated columns');
    
    if (!calculatedColumns || calculatedColumns.length === 0) {
      console.log('[ProfileApplication] No calculated columns to apply');
      return baseColumnDefs;
    }
    
    console.log('[ProfileApplication] Adding calculated columns:', calculatedColumns.length);
    
    const calcColDefs = calculatedColumns.map(col => {
      const valueGetter = (params: any) => {
        try {
          const expr = (col.expression || '').replace(/\[([^\]]+)\]/g, 'params.data.$1');
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
    
    const result = [...baseColumnDefs, ...calcColDefs];
    console.log('[ProfileApplication] Calculated columns applied, total columns:', result.length);
    return result;
  }, []);

  /**
   * Apply column groups to column definitions (Step 5)
   */
  const applyColumnGroups = useCallback((
    columnDefs: ColDef[],
    columnGroups: any[] | undefined
  ): ColDef[] => {
    console.log('[ProfileApplication] Step 5: Applying column groups');
    
    if (!columnGroups || columnGroups.length === 0) {
      console.log('[ProfileApplication] No column groups to apply');
      return columnDefs;
    }
    
    const activeGroups = columnGroups.filter(g => g.isActive !== false);
    console.log('[ProfileApplication] Active column groups:', activeGroups.length, 'of', columnGroups.length);
    
    if (activeGroups.length === 0) {
      console.log('[ProfileApplication] No active column groups');
      return columnDefs;
    }
    
    gridStateManagerRef.current.setColumnGroups(columnGroups);
    const groupedColumnDefs = ColumnGroupService.buildColumnDefsWithGroups(
      columnDefs,
      activeGroups,
      gridApiRef.current
    );
    
    console.log('[ProfileApplication] Column groups applied:', {
      before: columnDefs.length,
      after: groupedColumnDefs.length,
      hasGroups: groupedColumnDefs.some((col: any) => col.children)
    });
    
    return groupedColumnDefs;
  }, []);

  /**
   * Apply conditional formatting to column definitions (Step 7)
   */
  const applyConditionalFormatting = useCallback((columnDefs: ColDef[]): ColDef[] => {
    console.log('[ProfileApplication] Step 7: Applying conditional formatting');
    
    const formattedDefs = applyConditionalFormattingToColumns(
      columnDefs,
      conditionalFormattingRules,
      gridInstanceId
    );
    
    const finalDefs = formattedDefs.map(col => ({
      ...col,
      enableCellChangeFlash: true
    }));
    
    console.log('[ProfileApplication] Conditional formatting applied');
    return finalDefs;
  }, [conditionalFormattingRules, gridInstanceId]);

  /**
   * Apply all grid states in correct order (Step 8)
   */
  const applyAllGridStates = useCallback((profile: DataGridStompSharedProfile) => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    console.log('[ProfileApplication] Step 8: Applying all grid states in correct order');
    
    const columnState = profile.gridState?.columnState || profile.columnState;
    if (columnState && columnState.length > 0) {
      console.log('[ProfileApplication] Step 8a: Applying column state');
      gridApi.applyColumnState({
        state: columnState,
        applyOrder: true
      });
      console.log('[ProfileApplication] Column state applied successfully');
    }
    
    const columnGroupState = profile.gridState?.columnGroupState;
    if (columnGroupState && columnGroupState.length > 0) {
      console.log('[ProfileApplication] Step 8b: Applying column group expansion state');
      if (gridApi.setColumnGroupState) {
        gridApi.setColumnGroupState(columnGroupState);
        console.log('[ProfileApplication] Column group state applied using setColumnGroupState');
      } else if (typeof (gridApi as any).setColumnGroupOpened === 'function') {
        columnGroupState.forEach((state: any) => {
          try {
            (gridApi as any).setColumnGroupOpened(state.groupId, state.open);
          } catch (e) {
            console.warn(`[ProfileApplication] Could not set group state for ${state.groupId}:`, e);
          }
        });
        console.log('[ProfileApplication] Column group state applied using fallback method');
      }
    } else if (profile.columnGroups) {
      const defaultGroupState = profile.columnGroups
        .filter(g => g.isActive !== false)
        .map(g => ({
          groupId: g.groupId,
          open: g.openByDefault ?? true
        }));
      
      if (defaultGroupState.length > 0) {
        console.log('[ProfileApplication] Applying default column group state');
        if (gridApi.setColumnGroupState) {
          gridApi.setColumnGroupState(defaultGroupState);
        }
      }
    }
    
    const filterModel = profile.gridState?.filterModel || profile.filterModel;
    if (filterModel && Object.keys(filterModel).length > 0) {
      console.log('[ProfileApplication] Step 8c: Applying filter model');
      gridApi.setFilterModel(filterModel);
    }
    if (profile.gridState) {
      console.log('[ProfileApplication] Step 8d: Applying remaining grid states');
      gridStateManagerRef.current.applyState(profile.gridState, {
        applyColumnState: false, // Already applied above
        applyFilters: false, // Already applied above
        applySorting: false, // Applied via column state
        applyGrouping: true,
        applyPagination: true,
        applySelection: true,
        applyExpansion: true,
        applyPinning: true,
        applyGridOptions: false, // Already applied in step 3
        applyScrollPosition: true,
        applySideBar: true,
        rowIdField: providerConfig?.keyColumn || 'id'
      });
    }
    
    console.log('[ProfileApplication] All grid states applied successfully');
  }, [providerConfig]);
  
  /**
   * Main function to apply profile to grid
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
    
    // Detect if this is actually a different profile
    const isActualProfileChange = lastAppliedProfileRef.current !== null && 
                                 lastAppliedProfileRef.current !== profile.name;
    
    console.log('[ProfileApplication] Starting profile application with CORRECT 8-step order:', {
      profileName: profile.name,
      lastAppliedProfile: lastAppliedProfileRef.current,
      isProfileSwitch,
      isActualProfileChange,
      hasColumnGroups: !!profile.columnGroups,
      hasCalculatedColumns: !!profile.calculatedColumns,
      hasGridState: !!profile.gridState
    });
    
    // STEP 1: Reset AG-Grid's all states (using v33+ APIs)
    // Always reset when switching profiles OR when it's an actual profile change
    if (isProfileSwitch || isActualProfileChange) {
      console.log('[ProfileApplication] Profile switch/change detected - performing complete reset');
      resetGridCompletely();
    } else {
      console.log('[ProfileApplication] Initial profile load - minimal reset');
      // Even for initial load, ensure we start with clean column definitions
      const resetColumnDefs = JSON.parse(JSON.stringify(originalColumnDefsRef.current)).map((col: any) => ({
        ...col,
        enableCellChangeFlash: true
      }));
      gridApi.setGridOption('columnDefs', resetColumnDefs);
    }
    
    // STEP 2: Apply columnDefs from data provider to grid
    console.log('[ProfileApplication] Step 2: Applying base column definitions from provider');
    const baseColumnDefs = JSON.parse(JSON.stringify(originalColumnDefsRef.current)).map((col: any) => ({
      ...col,
      enableCellChangeFlash: true
    }));
    gridApi.setGridOption('columnDefs', baseColumnDefs);
    
    // STEP 3: Apply grid options from selected profile settings
    applyGridOptionsFromProfile(profile.gridOptions);
    
    // STEP 4: Apply calculated columns to columnDefs
    const defsWithCalculated = applyCalculatedColumns(baseColumnDefs, profile.calculatedColumns);
    if (defsWithCalculated !== baseColumnDefs) {
      gridApi.setGridOption('columnDefs', defsWithCalculated);
    }
    
    // STEP 5: Apply column groups to columnDefs
    const groupedColumnDefs = applyColumnGroups(defsWithCalculated, profile.columnGroups);
    if (groupedColumnDefs !== defsWithCalculated) {
      gridApi.setGridOption('columnDefs', groupedColumnDefs);
    }
    
    // STEP 6: Apply column styles and settings (future implementation)
    // TODO: Implement column styles application
    console.log('[ProfileApplication] Step 6: Column styles (not yet implemented)');
    
    // STEP 7: Apply conditional formatting rules to columnDefs
    const finalColumnDefs = applyConditionalFormatting(groupedColumnDefs);
    if (finalColumnDefs !== groupedColumnDefs) {
      gridApi.setGridOption('columnDefs', finalColumnDefs);
    }
    
    // Verify final column definitions
    const verifyDefs = gridApi.getColumnDefs();
    console.log('[ProfileApplication] Final column definitions verification:', {
      totalDefs: verifyDefs?.length,
      hasGroups: verifyDefs?.some((col: any) => col.children),
      groups: verifyDefs?.filter((col: any) => col.children).map((col: any) => ({
        headerName: col.headerName,
        groupId: col.groupId,
        childrenCount: col.children?.length
      }))
    });
    
    // STEP 8: Apply all grid states (column state FIRST, then column group state)
    applyAllGridStates(profile);
    
    // Final refresh to ensure all changes are visible
    gridApi.refreshCells({ force: true });
    
    // Update the last applied profile reference
    lastAppliedProfileRef.current = profile.name;
    
    console.log('[ProfileApplication] Profile application complete - all 8 steps executed in correct order');
  }, [resetGridCompletely, applyGridOptionsFromProfile, applyCalculatedColumns, applyColumnGroups, applyConditionalFormatting, applyAllGridStates, originalColumnDefsRef]);
  
  return {
    applyProfile,
    resetGrid: resetGridCompletely
  };
}