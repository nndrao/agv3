import { useCallback, useRef, useEffect } from 'react';
import { GridApi, GridReadyEvent } from 'ag-grid-community';
import { DataGridStompSharedProfile, RowData } from '../types';
import { GridStateManager, GridState } from '../utils/gridStateManager';

interface UseGridStateResult {
  gridApi: GridApi<RowData> | null;
  columnApi: any | null; // Deprecated in v33, kept for compatibility
  gridApiRef: React.MutableRefObject<GridApi<RowData> | null>;
  columnApiRef: React.MutableRefObject<any | null>;
  onGridReady: (params: GridReadyEvent<RowData>) => void;
  getRowId: (params: any) => string;
  applyProfileGridState: (profile: DataGridStompSharedProfile | null) => void;
  extractGridState: () => Partial<GridState>;
  extractFullGridState: () => GridState | null;
  resetGridState: () => void;
  setColumnGroups: (groups: any[]) => void;
  getColumnGroups: () => any[];
  getPendingColumnState: () => any;
  clearPendingColumnState: () => void;
  getPendingColumnGroupState: () => any;
  clearPendingColumnGroupState: () => void;
  applyPendingColumnGroupState: () => void;
  gridStateManagerRef: React.MutableRefObject<GridStateManager>;
}

// Validate that GridApi is properly initialized
function validateGridApi(gridApi: GridApi | null): boolean {
  if (!gridApi) return false;
  
  // Check for essential methods
  const requiredMethods = [
    'getColumnState',
    'getFilterModel',
    'applyColumnState',
    'setFilterModel'
  ];
  
  return requiredMethods.every(method => typeof (gridApi as any)[method] === 'function');
}

interface ProfileStatusCallbacks {
  onProfileApplying?: (profileName: string) => void;
  onProfileApplied?: (profileName: string, success: boolean, error?: string) => void;
}

export function useGridState(
  providerConfig: any,
  activeProfileData: DataGridStompSharedProfile | null,
  profileStatusCallbacks?: ProfileStatusCallbacks,
  isSavingProfileRef?: React.MutableRefObject<boolean>
): UseGridStateResult {
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  const columnApiRef = useRef<any | null>(null);
  const stateManagerRef = useRef<GridStateManager>(new GridStateManager());
  const pendingProfileRef = useRef<DataGridStompSharedProfile | null>(null);
  
  // Memoized getRowId function
  const getRowId = useCallback((params: any) => {
    const keyColumn = providerConfig?.keyColumn || 'id';
    const rowId = params.data[keyColumn];
    
    if (!rowId) {
      console.warn(`[getRowId] Missing key value for column '${keyColumn}':`, params.data);
    }
    
    return rowId?.toString() || `missing-key-${Math.random()}`;
  }, [providerConfig?.keyColumn]);
  
  // Apply profile grid state
  const applyProfileGridState = useCallback((profile: DataGridStompSharedProfile | null) => {
    
    if (!profile) {
      return;
    }
    
    // Store column groups even if grid is not ready yet
    // They will be applied when the grid becomes ready
    if (profile.columnGroups && !gridApiRef.current) {
      stateManagerRef.current.setColumnGroups(profile.columnGroups);
    }
    
    if (!gridApiRef.current || !validateGridApi(gridApiRef.current)) {
      pendingProfileRef.current = profile;
      // Notify that profile is pending
      if (profileStatusCallbacks?.onProfileApplying) {
        profileStatusCallbacks.onProfileApplying(profile.name);
      }
      return;
    }
    
    try {
      // Set column groups in state manager if available
      if (profile.columnGroups) {
        stateManagerRef.current.setColumnGroups(profile.columnGroups);
      }
      
      // If profile contains full grid state, use it
      if (profile.gridState) {
        
        // If gridState has column groups, use those; otherwise use profile.columnGroups
        if (!profile.gridState.columnGroups && profile.columnGroups) {
          profile.gridState.columnGroups = profile.columnGroups;
        }
        
        
        stateManagerRef.current.applyState(profile.gridState, {
          applyColumnState: true,
          applyFilters: true,
          applySorting: true,
          applyGrouping: true,
          applyPagination: true,
          applySelection: true,
          applyExpansion: true,
          applyGridOptions: true,
          applySideBar: true,
          rowIdField: providerConfig?.keyColumn || 'id'
        });
        
        
        // After applying state, check if we have column groups to apply
        const storedGroups = stateManagerRef.current.getColumnGroups();
        
        // Return indication that column groups need to be applied
        // This will be handled by the column groups effect in the main component
        if (storedGroups && storedGroups.length > 0) {
        }
      } else {
        // Fallback to legacy properties
        if (profile.columnState && profile.columnState.length > 0) {
          gridApiRef.current.applyColumnState({
            state: profile.columnState,
            applyOrder: true
          });
        }
        
        if (profile.filterModel && Object.keys(profile.filterModel).length > 0) {
          gridApiRef.current.setFilterModel(profile.filterModel);
        }
      }
      
      // Always notify success when grid state is applied
      if (profileStatusCallbacks?.onProfileApplied) {
        profileStatusCallbacks.onProfileApplied(profile.name, true);
      }
    } catch (error) {
      console.error('[🔍][PROFILE_LOAD] Error applying grid state:', error);
      
      // Notify error
      if (profileStatusCallbacks?.onProfileApplied) {
        profileStatusCallbacks.onProfileApplied(profile.name, false, 'Failed to apply profile');
      }
    }
  }, [providerConfig?.keyColumn, profileStatusCallbacks]);
  
  // Extract current grid state (legacy format for backward compatibility)
  const extractGridState = useCallback(() => {
    const fullState = stateManagerRef.current.extractState({
      includeColumnDefs: false,
      rowIdField: providerConfig?.keyColumn || 'id'
    });
    
    if (!fullState) {
      return { columnState: [], filterModel: {}, sortModel: [] };
    }
    
    return {
      columnState: fullState.columnState,
      filterModel: fullState.filterModel,
      sortModel: fullState.sortModel
    };
  }, [providerConfig?.keyColumn]);
  
  // Extract full grid state
  const extractFullGridState = useCallback((): GridState | null => {
    return stateManagerRef.current.extractState({
      includeColumnDefs: true,
      includeCustomState: true,
      rowIdField: providerConfig?.keyColumn || 'id'
    });
  }, [providerConfig?.keyColumn]);
  
  // Reset grid state
  const resetGridState = useCallback(() => {
    stateManagerRef.current.resetToDefault();
  }, []);
  
  // Set column groups in state manager
  const setColumnGroups = useCallback((groups: any[]) => {
    stateManagerRef.current.setColumnGroups(groups);
  }, []);
  
  // Get column groups from state manager
  const getColumnGroups = useCallback(() => {
    return stateManagerRef.current.getColumnGroups();
  }, []);
  
  // Get pending column state from state manager
  const getPendingColumnState = useCallback(() => {
    return stateManagerRef.current.getPendingColumnState();
  }, []);
  
  // Clear pending column state
  const clearPendingColumnState = useCallback(() => {
    stateManagerRef.current.clearPendingColumnState();
  }, []);
  
  // Get pending column group state
  const getPendingColumnGroupState = useCallback(() => {
    return stateManagerRef.current.getPendingColumnGroupState();
  }, []);
  
  // Clear pending column group state
  const clearPendingColumnGroupState = useCallback(() => {
    stateManagerRef.current.clearPendingColumnGroupState();
  }, []);
  
  // Apply pending column group state
  const applyPendingColumnGroupState = useCallback(() => {
    stateManagerRef.current.applyPendingColumnGroupState();
  }, []);
  
  // Grid ready handler - simplified to just set references
  const onGridReady = useCallback((params: GridReadyEvent<RowData>) => {
    console.log('[useGridState] Grid ready');
    
    gridApiRef.current = params.api;
    columnApiRef.current = (params as any).columnApi || null;
    
    // Set GridApi in state manager
    stateManagerRef.current.setGridApi(params.api);
    
    // Listen for column state changes to track when they need to be saved
    // This helps debug column state persistence issues
    params.api.addEventListener('columnMoved', () => {
      if (!isSavingProfileRef?.current) {
        console.log('[useGridState] Column moved - column state changed');
      }
    });
    
    params.api.addEventListener('columnResized', () => {
      if (!isSavingProfileRef?.current) {
        console.log('[useGridState] Column resized - column state changed');
      }
    });
    
    params.api.addEventListener('columnVisible', () => {
      if (!isSavingProfileRef?.current) {
        console.log('[useGridState] Column visibility changed - column state changed');
      }
    });
    
    params.api.addEventListener('columnPinned', () => {
      if (!isSavingProfileRef?.current) {
        console.log('[useGridState] Column pinned - column state changed');
      }
    });
    
    // Profile application is now handled by useProfileApplication hook in the main component
    // No timeouts, no complex logic here
  }, [isSavingProfileRef]);
  
  // Profile application is now handled by useProfileApplication hook
  // This effect is no longer needed
  
  // Refresh grid when column definitions change
  useEffect(() => {
    if (gridApiRef.current && providerConfig?.columnDefinitions) {
      // Force grid to refresh after setting columns
      const timer = setTimeout(() => {
        gridApiRef.current?.refreshCells({ force: true });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [providerConfig?.columnDefinitions]);
  
  return {
    gridApi: gridApiRef.current,
    columnApi: columnApiRef.current,
    gridApiRef,
    columnApiRef,
    onGridReady,
    getRowId,
    applyProfileGridState,
    extractGridState,
    extractFullGridState,
    resetGridState,
    setColumnGroups,
    getColumnGroups,
    getPendingColumnState,
    clearPendingColumnState,
    getPendingColumnGroupState,
    clearPendingColumnGroupState,
    applyPendingColumnGroupState,
    gridStateManagerRef: stateManagerRef
  };
}