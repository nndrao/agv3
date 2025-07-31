import { useCallback, useRef, useEffect } from 'react';
import { GridApi, GridReadyEvent } from 'ag-grid-community';
import { DataGridStompSharedProfile, RowData } from '../types';

interface UseGridStateResult {
  gridApi: GridApi<RowData> | null;
  gridApiRef: React.MutableRefObject<GridApi<RowData> | null>;
  onGridReady: (params: GridReadyEvent<RowData>) => void;
  getRowId: (params: any) => string;
  applyProfileGridState: (profile: DataGridStompSharedProfile | null) => void;
  extractGridState: () => { columnState: any[]; filterModel: any; sortModel: any[] };
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

export function useGridState(
  providerConfig: any,
  activeProfileData: DataGridStompSharedProfile | null
): UseGridStateResult {
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  
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
    if (!profile || !gridApiRef.current || !validateGridApi(gridApiRef.current)) {
      return;
    }
    
    try {
      if (profile.columnState && profile.columnState.length > 0) {
        gridApiRef.current.applyColumnState({
          state: profile.columnState,
          applyOrder: true
        });
      }
      
      if (profile.filterModel && Object.keys(profile.filterModel).length > 0) {
        gridApiRef.current.setFilterModel(profile.filterModel);
      }
      
      // AG-Grid doesn't have setSortModel - sorting is handled via column state
      // Sort model is included in column state which is already applied above
    } catch (error) {
      console.warn('[useGridState] Error applying grid state:', error);
    }
  }, []);
  
  // Extract current grid state
  const extractGridState = useCallback(() => {
    let columnState: any[] = [];
    let filterModel = {};
    let sortModel: any[] = [];
    
    if (gridApiRef.current && validateGridApi(gridApiRef.current)) {
      try {
        columnState = gridApiRef.current.getColumnState();
        filterModel = gridApiRef.current.getFilterModel();
        // Extract sort model from column state
        sortModel = columnState
          .filter((col: any) => col.sort !== null && col.sort !== undefined)
          .map((col: any) => ({ colId: col.colId, sort: col.sort, sortIndex: col.sortIndex }))
          .sort((a: any, b: any) => (a.sortIndex || 0) - (b.sortIndex || 0));
      } catch (error) {
        console.warn('[useGridState] Error extracting grid state:', error);
      }
    }
    
    return { columnState, filterModel, sortModel };
  }, []);
  
  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent<RowData>) => {
    gridApiRef.current = params.api;
    
    // Apply saved state if available and valid
    applyProfileGridState(activeProfileData);
  }, [activeProfileData, applyProfileGridState]);
  
  // Apply profile state when it changes
  useEffect(() => {
    if (activeProfileData) {
      applyProfileGridState(activeProfileData);
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
    gridApiRef,
    onGridReady,
    getRowId,
    applyProfileGridState,
    extractGridState
  };
}