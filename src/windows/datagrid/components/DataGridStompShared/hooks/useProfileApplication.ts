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
 * Order of operations:
 * 1. Reset grid (if switching profiles)
 * 2. Apply grid options
 * 3. Build column definitions (base + calculated + conditional formatting)
 * 4. Apply column groups
 * 5. Set final columnDefs to grid
 * 6. Apply grid state (filters, sorts, column state)
 * 7. Apply column group expansion state
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
   * Reset grid to clean state
   */
  const resetGrid = useCallback(() => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    console.log('[ProfileApplication] Resetting grid to clean state');
    
    // 1. Clear all filters
    gridApi.setFilterModel(null);
    
    // 2. Clear all sorts
    gridApi.applyColumnState({
      defaultState: { sort: null }
    });
    
    // 3. Reset to original column definitions - deep copy to avoid mutations
    const resetColumnDefs = JSON.parse(JSON.stringify(originalColumnDefsRef.current)).map((col: any) => ({
      ...col,
      enableCellChangeFlash: true
    }));
    gridApi.setGridOption('columnDefs', resetColumnDefs);
    
    // 4. Clear any pinned columns
    gridApi.applyColumnState({
      defaultState: { pinned: null }
    });
    
    // 5. Clear row selection
    gridApi.deselectAll();
    
    // 6. Reset key grid options to defaults
    const defaultOptions = getDefaultGridOptions();
    Object.entries(defaultOptions).forEach(([key, value]) => {
      if (!INITIAL_GRID_OPTIONS.includes(key)) {
        gridApi.setGridOption(key as any, value);
      }
    });
    
    console.log('[ProfileApplication] Grid reset complete');
  }, [originalColumnDefsRef]);
  
  /**
   * Apply grid options from profile
   */
  const applyGridOptions = useCallback((gridOptions: Record<string, any> | undefined) => {
    const gridApi = gridApiRef.current;
    if (!gridApi) return;
    
    console.log('[ProfileApplication] Applying grid options');
    
    // Start with defaults
    const defaultOptions = getDefaultGridOptions();
    
    // Always ensure cell flashing is enabled
    defaultOptions.enableCellChangeFlash = true;
    defaultOptions.cellFlashDuration = 500;
    defaultOptions.cellFadeDuration = 1000;
    
    // Apply defaults first
    Object.entries(defaultOptions).forEach(([key, value]) => {
      if (!INITIAL_GRID_OPTIONS.includes(key)) {
        gridApi.setGridOption(key as any, value);
      }
    });
    
    // Then apply profile-specific options
    if (gridOptions) {
      Object.entries(gridOptions).forEach(([key, value]) => {
        if (!INITIAL_GRID_OPTIONS.includes(key)) {
          gridApi.setGridOption(key as any, value);
        }
      });
    }
    
    console.log('[ProfileApplication] Grid options applied');
  }, []);
  
  /**
   * Build column definitions with calculated columns and conditional formatting
   */
  const buildColumnDefs = useCallback((
    baseColumnDefs: ColDef[],
    calculatedColumns: CalculatedColumnDefinition[] | undefined
  ): ColDef[] => {
    console.log('[ProfileApplication] Building column definitions');
    
    // Start with base columns with conditional formatting
    let defs = applyConditionalFormattingToColumns(
      baseColumnDefs,
      conditionalFormattingRules,
      gridInstanceId
    );
    
    // Ensure cell flashing is enabled
    defs = defs.map(col => ({
      ...col,
      enableCellChangeFlash: true
    }));
    
    // Add calculated columns
    if (calculatedColumns && calculatedColumns.length > 0) {
      console.log('[ProfileApplication] Adding calculated columns:', calculatedColumns.length);
      
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
      
      defs = [...defs, ...calcColDefs];
    }
    
    console.log('[ProfileApplication] Column definitions built:', defs.length, 'columns');
    return defs;
  }, [conditionalFormattingRules, gridInstanceId]);
  
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
    
    console.log('[ProfileApplication] Starting profile application:', {
      profileName: profile.name,
      isProfileSwitch,
      hasColumnGroups: !!profile.columnGroups,
      hasCalculatedColumns: !!profile.calculatedColumns,
      hasGridState: !!profile.gridState
    });
    
    // Step 1: Reset grid if switching profiles
    if (isProfileSwitch) {
      resetGrid();
    }
    
    // Step 2: Apply grid options
    applyGridOptions(profile.gridOptions);
    
    // Step 3: Build column definitions - make a deep copy to avoid modifying the original
    const baseColumnDefs = JSON.parse(JSON.stringify(originalColumnDefsRef.current));
    let columnDefs = buildColumnDefs(baseColumnDefs, profile.calculatedColumns);
    
    // Step 4: Apply column groups (modifies columnDefs)
    if (profile.columnGroups && profile.columnGroups.length > 0) {
      console.log('[ProfileApplication] Column groups found in profile:', profile.columnGroups);
      
      // Store column groups in grid state manager for later retrieval
      gridStateManagerRef.current.setColumnGroups(profile.columnGroups);
      
      // Filter to only active groups
      const activeGroups = profile.columnGroups.filter(g => g.isActive !== false);
      console.log('[ProfileApplication] Active column groups:', activeGroups);
      
      if (activeGroups.length > 0) {
        console.log('[ProfileApplication] Building columnDefs with groups, current columns:', columnDefs.length);
        
        // Use ColumnGroupService to build columnDefs with groups
        const newColumnDefs = ColumnGroupService.buildColumnDefsWithGroups(
          columnDefs,
          activeGroups,
          gridApi
        );
        
        console.log('[ProfileApplication] Column defs after applying groups:', {
          before: columnDefs.length,
          after: newColumnDefs.length,
          hasGroups: newColumnDefs.some((col: any) => col.children)
        });
        
        columnDefs = newColumnDefs;
      } else {
        console.log('[ProfileApplication] No active column groups to apply');
      }
    } else {
      console.log('[ProfileApplication] No column groups in profile');
    }
    
    // Step 5: Set final columnDefs to grid (single update)
    console.log('[ProfileApplication] Setting final column definitions to grid:', {
      totalDefs: columnDefs.length,
      hasGroups: columnDefs.some((col: any) => col.children),
      groups: columnDefs.filter((col: any) => col.children).map((col: any) => ({
        headerName: col.headerName,
        groupId: col.groupId,
        childrenCount: col.children?.length
      }))
    });
    gridApi.setGridOption('columnDefs', columnDefs);
    
    // Verify what was actually set
    const verifyDefs = gridApi.getColumnDefs();
    console.log('[ProfileApplication] Verification - column defs after setting:', {
      totalDefs: verifyDefs?.length,
      hasGroups: verifyDefs?.some((col: any) => col.children),
      groups: verifyDefs?.filter((col: any) => col.children).map((col: any) => ({
        headerName: col.headerName,
        groupId: col.groupId,
        childrenCount: col.children?.length
      }))
    });
    
    // Step 6: Apply grid state (filters, sorts, column state, etc.)
    if (profile.gridState) {
      console.log('[ProfileApplication] Applying grid state');
      
      gridStateManagerRef.current.applyState(profile.gridState, {
        applyColumnState: true,
        applyFilters: true,
        applySorting: true,
        applyGrouping: true,
        applyPagination: true,
        applySelection: true,
        applyExpansion: true,
        applyGridOptions: false, // Already applied in step 2
        applySideBar: true,
        rowIdField: providerConfig?.keyColumn || 'id'
      });
    } else if (profile.columnState || profile.filterModel) {
      // Fallback to legacy properties
      console.log('[ProfileApplication] Applying legacy grid state');
      
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
    
    // Step 7: Apply column group expansion state
    if (profile.gridState?.columnGroupState || profile.columnGroups) {
      console.log('[ProfileApplication] Applying column group expansion state');
      
      let groupState = profile.gridState?.columnGroupState;
      
      // If no saved group state, create default from column groups
      if (!groupState && profile.columnGroups) {
        groupState = profile.columnGroups
          .filter(g => g.isActive !== false)
          .map(g => ({
            groupId: g.groupId,
            open: g.openByDefault ?? true
          }));
      }
      
      if (groupState && groupState.length > 0) {
        // Apply group state directly (no delay)
        if (gridApi.setColumnGroupState) {
          gridApi.setColumnGroupState(groupState);
          console.log('[ProfileApplication] Applied column group state:', groupState);
        } else {
          // Fallback to individual group opening
          groupState.forEach((state: any) => {
            if (typeof (gridApi as any).setColumnGroupOpened === 'function') {
              (gridApi as any).setColumnGroupOpened(state.groupId, state.open);
            }
          });
          console.log('[ProfileApplication] Applied column group state via fallback method');
        }
      }
      
      // AG-Grid will handle column visibility based on columnGroupShow property automatically
      // No need for manual visibility control or event listeners
    }
    
    // Final refresh
    gridApi.refreshCells({ force: true });
    
    console.log('[ProfileApplication] Profile application complete');
  }, [resetGrid, applyGridOptions, buildColumnDefs, originalColumnDefsRef, providerConfig]);
  
  return {
    applyProfile,
    resetGrid
  };
}