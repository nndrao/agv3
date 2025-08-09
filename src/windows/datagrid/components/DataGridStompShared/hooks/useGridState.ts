import { useCallback, useRef, useEffect } from 'react';
import { GridApi, GridReadyEvent, ColumnApi } from 'ag-grid-community';
import { DataGridStompSharedProfile, RowData } from '../types';
import { GridStateManager, GridState } from '../utils/gridStateManager';

interface UseGridStateResult {
  gridApi: GridApi<RowData> | null;
  columnApi: ColumnApi | null;
  gridApiRef: React.MutableRefObject<GridApi<RowData> | null>;
  columnApiRef: React.MutableRefObject<ColumnApi | null>;
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
  profileStatusCallbacks?: ProfileStatusCallbacks
): UseGridStateResult {
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  const columnApiRef = useRef<ColumnApi | null>(null);
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
    console.log('[🔍][PROFILE_LOAD] applyProfileGridState called with profile:', profile?.name);
    console.log('[🔍][PROFILE_LOAD] Profile columnGroups:', profile?.columnGroups);
    console.log('[🔍][PROFILE_LOAD] Profile gridState:', profile?.gridState);
    console.log('[🔍][PROFILE_LOAD] GridApi available:', !!gridApiRef.current);
    console.log('[🔍][PROFILE_LOAD] GridApi valid:', validateGridApi(gridApiRef.current));
    
    if (!profile) {
      console.log('[🔍][PROFILE_LOAD] No profile to apply');
      return;
    }
    
    // Store column groups even if grid is not ready yet
    // They will be applied when the grid becomes ready
    if (profile.columnGroups && !gridApiRef.current) {
      console.log('[🔍][PROFILE_LOAD] Grid not ready yet, storing column groups for later');
      stateManagerRef.current.setColumnGroups(profile.columnGroups);
    }
    
    if (!gridApiRef.current || !validateGridApi(gridApiRef.current)) {
      console.log('[🔍][PROFILE_LOAD] Grid not ready - storing profile for later application');
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
        console.log('[🔍][PROFILE_LOAD] Setting column groups in state manager:', profile.columnGroups);
        stateManagerRef.current.setColumnGroups(profile.columnGroups);
      }
      
      // If profile contains full grid state, use it
      if (profile.gridState) {
        console.log('[🔍][PROFILE_LOAD] Profile has gridState, applying...');
        console.log('[🔍][PROFILE_LOAD] GridState has columnGroups:', !!profile.gridState.columnGroups);
        console.log('[🔍][PROFILE_LOAD] Profile has separate columnGroups:', !!profile.columnGroups);
        
        // If gridState has column groups, use those; otherwise use profile.columnGroups
        if (!profile.gridState.columnGroups && profile.columnGroups) {
          console.log('[🔍][PROFILE_LOAD] Merging columnGroups into gridState');
          profile.gridState.columnGroups = profile.columnGroups;
        }
        
        console.log('[🔍][PROFILE_LOAD] Final gridState.columnGroups:', profile.gridState.columnGroups);
        
        const stateApplied = stateManagerRef.current.applyState(profile.gridState, {
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
        
        console.log('[🔍][PROFILE_LOAD] State applied successfully:', stateApplied);
        
        // After applying state, check if we have column groups to apply
        const storedGroups = stateManagerRef.current.getColumnGroups();
        console.log('[🔍][PROFILE_LOAD] Stored column groups after state apply:', storedGroups);
        
        // Return indication that column groups need to be applied
        // This will be handled by the column groups effect in the main component
        if (storedGroups && storedGroups.length > 0) {
          console.log('[🔍][PROFILE_LOAD] Column groups are ready to be applied by the main component');
        }
      } else {
        console.log('[🔍][PROFILE_LOAD] No gridState, using legacy properties');
        // Fallback to legacy properties
        if (profile.columnState && profile.columnState.length > 0) {
          console.log('[🔍][PROFILE_LOAD] Applying legacy columnState:', profile.columnState);
          gridApiRef.current.applyColumnState({
            state: profile.columnState,
            applyOrder: true
          });
        }
        
        if (profile.filterModel && Object.keys(profile.filterModel).length > 0) {
          console.log('[🔍][PROFILE_LOAD] Applying legacy filterModel:', profile.filterModel);
          gridApiRef.current.setFilterModel(profile.filterModel);
        }
      }
      console.log('[🔍][PROFILE_LOAD] Profile grid state applied successfully');
      
      // Notify success
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
  
  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent<RowData>) => {
    console.log('[🔍][GRID_READY] Grid ready event fired');
    console.log('[🔍][GRID_READY] Active profile data:', activeProfileData);
    console.log('[🔍][GRID_READY] Pending profile:', pendingProfileRef.current);
    console.log('[🔍][GRID_READY] Grid API initialized:', !!params.api);
    
    gridApiRef.current = params.api;
    columnApiRef.current = params.columnApi || null;
    
    // Set GridApi in state manager
    stateManagerRef.current.setGridApi(params.api);
    
    // Apply configuration in the correct order when grid is ready:
    // 1. Grid options are already applied via component props
    // 2. Column groups need to be applied FIRST (by the column groups effect)
    // 3. Grid state (column state, filters, sorts) is applied AFTER column groups
    
    // Check for pending profile first, then fall back to active profile
    const profileToApply = pendingProfileRef.current || activeProfileData;
    
    if (profileToApply) {
      console.log('[🔍][GRID_READY] Applying profile:', profileToApply.name);
      console.log('[🔍][GRID_READY] Profile source:', pendingProfileRef.current ? 'pending' : 'active');
      console.log('[🔍][GRID_READY] Profile has grid options:', !!profileToApply.gridOptions);
      console.log('[🔍][GRID_READY] Profile has column groups:', !!profileToApply.columnGroups);
      console.log('[🔍][GRID_READY] Profile has grid state:', !!profileToApply.gridState);
      
      // Store column groups in state manager for the column groups effect
      if (profileToApply.columnGroups) {
        console.log('[🔍][GRID_READY] Storing column groups for later application');
        stateManagerRef.current.setColumnGroups(profileToApply.columnGroups);
      }
      
      // We'll apply the grid state AFTER column groups are applied
      // This is handled by delaying the grid state application
      console.log('[🔍][GRID_READY] Delaying grid state application to allow column groups to be applied first');
      
      // Notify that we're applying the profile if this is a pending profile
      if (pendingProfileRef.current && profileStatusCallbacks?.onProfileApplying) {
        profileStatusCallbacks.onProfileApplying(profileToApply.name);
      }
      
      setTimeout(() => {
        console.log('[🔍][GRID_READY] Now applying grid state after column groups');
        applyProfileGridState(profileToApply);
        // Clear the pending profile after applying
        pendingProfileRef.current = null;
      }, 200); // Give column groups time to be applied
    } else {
      console.log('[🔍][GRID_READY] No profile data available to apply');
    }
  }, [activeProfileData, applyProfileGridState, profileStatusCallbacks]);
  
  // Apply profile state when it changes
  useEffect(() => {
    console.log('[🔍][PROFILE_CHANGE_EFFECT] Active profile data changed:', activeProfileData?.name);
    console.log('[🔍][PROFILE_CHANGE_EFFECT] Grid ready:', !!gridApiRef.current);
    
    if (activeProfileData) {
      console.log('[🔍][PROFILE_CHANGE_EFFECT] Attempting to apply profile grid state');
      applyProfileGridState(activeProfileData);
      
      // If the grid isn't ready, the profile will be stored as pending
      // and applied when the grid becomes ready
      if (!gridApiRef.current) {
        console.log('[🔍][PROFILE_CHANGE_EFFECT] Grid not ready, profile stored as pending');
      }
    } else {
      console.log('[🔍][PROFILE_CHANGE_EFFECT] No active profile data');
    }
  }, [activeProfileData, applyProfileGridState]);
  
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
    clearPendingColumnGroupState
  };
}