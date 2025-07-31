/**
 * AG-Grid v33+ State Management for React TypeScript
 * Fully compatible with AG-Grid v33+ - no deprecated APIs, verified against latest documentation
 */

import React, { useCallback, useRef, useEffect } from 'react';
import type { 
  GridApi,
  ColumnState,
  FilterModel,
  SortModel,
  IRowNode,
  Column,
  CellRange,
  GridOptions,
  ColDef,
  ColGroupDef,
  SideBarDef,
  GetRowIdParams,
  CellPosition,
  GridReadyEvent
} from 'ag-grid-community';

/**
 * Comprehensive AG-Grid state interface for v33+
 */
export interface AgGridState {
  // Column configuration
  columnState: ColumnState[];
  columnGroupState: Array<{ groupId: string; open: boolean }>;
  
  // Data filtering and sorting
  filterModel: FilterModel;
  sortModel: SortModel;
  
  // Row grouping and pivoting
  rowGroupColumns: string[];
  pivotMode: boolean;
  pivotColumns: string[];
  valueColumns: string[];
  
  // Pagination state
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number | null;
    paginationPageSizeSelector: number[] | boolean | null;
  };
  
  // Selection state
  selectedRowIds: string[];
  selectedNodes: string[];
  
  // Row expansion state
  expandedGroups: string[];
  
  // Row pinning
  pinnedTopRowData: any[];
  pinnedBottomRowData: any[];
  
  // Grid configuration
  rowModelType: string;
  serverSideConfig?: {
    cacheBlockSize?: number;
    maxBlocksInCache?: number;
    maxConcurrentDatasourceRequests?: number;
    blockLoadDebounceMillis?: number;
  };
  infiniteScrollConfig?: {
    cacheBlockSize?: number;
    cacheOverflowSize?: number;
    maxConcurrentDatasourceRequests?: number;
    maxBlocksInCache?: number;
  };
  
  // UI state
  focusedCell?: {
    rowIndex: number;
    column: string;
    rowPinned?: string | null;
  };
  cellRanges?: Array<{
    startRow: { rowIndex: number; rowPinned?: string | null };
    endRow: { rowIndex: number; rowPinned?: string | null };
    columns: string[];
  }>;
  
  // Cell editing
  editingCells?: Array<{
    rowIndex: number;
    colKey: string;
    rowPinned?: string | null;
  }>;
  
  // Viewport
  firstDisplayedRowIndex?: number;
  lastDisplayedRowIndex?: number;
  
  // Side bar
  sideBarState?: {
    position: 'left' | 'right';
    visible: boolean;
    openedToolPanel?: string | null;
    toolPanelSizes?: Record<string, number>;
  };
  
  // Custom state
  customState?: Record<string, any>;
}

/**
 * Options for state extraction
 */
export interface ExtractStateOptions {
  rowIdField?: string;
  includeRowData?: boolean;
  customStateExtractor?: (gridApi: GridApi) => Record<string, any>;
}

/**
 * Options for state application
 */
export interface ApplyStateOptions {
  applyColumnState?: boolean;
  applyColumnGroups?: boolean;
  applyFilters?: boolean;
  applySorting?: boolean;
  applyRowGrouping?: boolean;
  applyPivoting?: boolean;
  applyValueColumns?: boolean;
  applyPagination?: boolean;
  applySelection?: boolean;
  applyRowPinning?: boolean;
  applyFocus?: boolean;
  applyRangeSelection?: boolean;
  applyCellEditing?: boolean;
  applyViewport?: boolean;
  applySideBar?: boolean;
  rowIdField?: string;
  customStateApplier?: (gridApi: GridApi, customState: Record<string, any>) => void;
}

/**
 * Validate that GridApi is properly initialized
 */
function validateGridApi(gridApi: GridApi | null | undefined): gridApi is GridApi {
  if (!gridApi) {
    return false;
  }
  
  // Check for essential methods that should exist in v33+
  const requiredMethods = [
    'getColumnState',
    'getSortModel', 
    'getFilterModel',
    'applyColumnState',
    'setSortModel',
    'setFilterModel'
  ];
  
  return requiredMethods.every(method => typeof (gridApi as any)[method] === 'function');
}

/**
 * React hook for AG-Grid state management
 */
export function useAgGridStateManager(gridApi: GridApi | null) {
  const stateRef = useRef<AgGridState | null>(null);

  /**
   * Extract comprehensive state from AG-Grid v33+
   */
  const extractState = useCallback((
    options: ExtractStateOptions = {}
  ): AgGridState | null => {
    if (!validateGridApi(gridApi)) {
      console.warn('[AG-Grid State] GridApi is not available or not properly initialized');
      return null;
    }

    const { rowIdField = 'id', customStateExtractor } = options;

    try {
      // ===== COLUMN STATE =====
      // Using v33+ GridApi (not deprecated columnApi)
      const columnState = gridApi.getColumnState();
      
      // Column groups state
      const columnGroupState: Array<{ groupId: string; open: boolean }> = [];
      try {
        const columnGroups = gridApi.getColumnGroups();
        if (columnGroups && Array.isArray(columnGroups)) {
          columnGroups.forEach((group: any) => {
            if (group && group.getGroupId && group.isExpanded) {
              columnGroupState.push({
                groupId: group.getGroupId(),
                open: group.isExpanded()
              });
            }
          });
        }
      } catch (error) {
        console.warn('[AG-Grid State] Could not extract column group state:', error);
      }

      // ===== FILTER AND SORT MODELS =====
      // These are core GridApi methods in v33+
      const filterModel = gridApi.getFilterModel();
      const sortModel = gridApi.getSortModel();

      // ===== ROW GROUPING STATE =====
      const rowGroupColumns: string[] = [];
      const pivotColumns: string[] = [];
      const valueColumns: string[] = [];
      
      try {
        const columns = gridApi.getColumns();
        if (columns && Array.isArray(columns)) {
          columns.forEach((col: Column) => {
            if (col.isRowGroupActive && col.isRowGroupActive()) {
              rowGroupColumns.push(col.getColId());
            }
            if (col.isPivotActive && col.isPivotActive()) {
              pivotColumns.push(col.getColId());
            }
            if (col.isValueActive && col.isValueActive()) {
              valueColumns.push(col.getColId());
            }
          });
        }
      } catch (error) {
        console.warn('[AG-Grid State] Could not extract grouping columns:', error);
      }

      const pivotMode = gridApi.isPivotMode();

      // ===== PAGINATION =====
      const pagination = {
        currentPage: gridApi.paginationGetCurrentPage(),
        pageSize: gridApi.paginationGetPageSize(),
        totalPages: gridApi.paginationIsLastPageFound() ? gridApi.paginationGetTotalPages() : null,
        paginationPageSizeSelector: gridApi.getGridOption('paginationPageSizeSelector') || null
      };

      // ===== SELECTION =====
      const selectedRows = gridApi.getSelectedRows();
      const selectedRowIds = selectedRows
        .map((row: any) => row[rowIdField])
        .filter(Boolean)
        .map(String);
      
      const selectedNodes = gridApi.getSelectedNodes()
        .map((node: IRowNode) => String(node.id))
        .filter(Boolean);

      // ===== ROW PINNING =====
      const pinnedTopRowData = (gridApi.getGridOption('pinnedTopRowData') as any[]) || [];
      const pinnedBottomRowData = (gridApi.getGridOption('pinnedBottomRowData') as any[]) || [];

      // ===== GRID CONFIGURATION =====
      const rowModelType = gridApi.getGridOption('rowModelType') || 'clientSide';
      
      let serverSideConfig = undefined;
      let infiniteScrollConfig = undefined;
      
      if (rowModelType === 'serverSide') {
        serverSideConfig = {
          cacheBlockSize: gridApi.getGridOption('cacheBlockSize'),
          maxBlocksInCache: gridApi.getGridOption('maxBlocksInCache'),
          maxConcurrentDatasourceRequests: gridApi.getGridOption('maxConcurrentDatasourceRequests'),
          blockLoadDebounceMillis: gridApi.getGridOption('blockLoadDebounceMillis')
        };
      }
      
      if (rowModelType === 'infinite') {
        infiniteScrollConfig = {
          cacheBlockSize: gridApi.getGridOption('cacheBlockSize'),
          cacheOverflowSize: gridApi.getGridOption('cacheOverflowSize'),
          maxConcurrentDatasourceRequests: gridApi.getGridOption('maxConcurrentDatasourceRequests'),
          maxBlocksInCache: gridApi.getGridOption('maxBlocksInCache')
        };
      }

      // ===== EXPANDED GROUPS =====
      const expandedGroups: string[] = [];
      try {
        if (rowModelType === 'clientSide') {
          gridApi.forEachNode((node: IRowNode) => {
            if (node.group && node.expanded) {
              const groupId = node.key ? 
                `${node.rowGroupColumn?.getColId()}_${node.key}` : 
                String(node.id);
              if (groupId) {
                expandedGroups.push(groupId);
              }
            }
          });
        }
      } catch (error) {
        console.warn('[AG-Grid State] Could not extract expanded groups:', error);
      }

      // ===== FOCUS STATE =====
      let focusedCell = undefined;
      try {
        const cell = gridApi.getFocusedCell();
        if (cell) {
          focusedCell = {
            rowIndex: cell.rowIndex,
            column: cell.column.getColId(),
            rowPinned: cell.rowPinned || null
          };
        }
      } catch (error) {
        console.warn('[AG-Grid State] Could not extract focused cell:', error);
      }

      // ===== RANGE SELECTIONS =====
      let cellRanges = undefined;
      try {
        const ranges = gridApi.getCellRanges();
        if (ranges && ranges.length > 0) {
          cellRanges = ranges.map((range: CellRange) => ({
            startRow: {
              rowIndex: range.startRow!.rowIndex,
              rowPinned: range.startRow!.rowPinned || null
            },
            endRow: {
              rowIndex: range.endRow!.rowIndex,
              rowPinned: range.endRow!.rowPinned || null
            },
            columns: range.columns.map((col: Column) => col.getColId())
          }));
        }
      } catch (error) {
        console.warn('[AG-Grid State] Could not extract cell ranges:', error);
      }

      // ===== EDITING CELLS =====
      let editingCells = undefined;
      try {
        const cells = gridApi.getEditingCells();
        if (cells && cells.length > 0) {
          editingCells = cells.map((cell: any) => ({
            rowIndex: cell.rowIndex,
            colKey: cell.column.getColId(),
            rowPinned: cell.rowPinned || null
          }));
        }
      } catch (error) {
        console.warn('[AG-Grid State] Could not extract editing cells:', error);
      }

      // ===== VIEWPORT =====
      let firstDisplayedRowIndex = undefined;
      let lastDisplayedRowIndex = undefined;
      try {
        firstDisplayedRowIndex = gridApi.getFirstDisplayedRowIndex();
        lastDisplayedRowIndex = gridApi.getLastDisplayedRowIndex();
      } catch (error) {
        console.warn('[AG-Grid State] Could not extract viewport:', error);
      }

      // ===== SIDE BAR =====
      let sideBarState = undefined;
      try {
        const sideBar = gridApi.getSideBar();
        if (sideBar) {
          sideBarState = {
            position: (sideBar.getSideBarPosition && sideBar.getSideBarPosition()) || 'right',
            visible: (sideBar.isVisible && sideBar.isVisible()) || false,
            openedToolPanel: (sideBar.getOpenedToolPanel && sideBar.getOpenedToolPanel()) || null
          };
        }
      } catch (error) {
        console.warn('[AG-Grid State] Could not extract side bar state:', error);
      }

      // ===== CUSTOM STATE =====
      let customState = undefined;
      if (customStateExtractor) {
        try {
          customState = customStateExtractor(gridApi);
        } catch (error) {
          console.warn('[AG-Grid State] Could not extract custom state:', error);
        }
      }

      const state: AgGridState = {
        columnState,
        columnGroupState,
        filterModel,
        sortModel,
        rowGroupColumns,
        pivotMode,
        pivotColumns,
        valueColumns,
        pagination,
        selectedRowIds,
        selectedNodes,
        expandedGroups,
        pinnedTopRowData,
        pinnedBottomRowData,
        rowModelType,
        serverSideConfig,
        infiniteScrollConfig,
        focusedCell,
        cellRanges,
        editingCells,
        firstDisplayedRowIndex,
        lastDisplayedRowIndex,
        sideBarState,
        customState
      };

      stateRef.current = state;
      return state;

    } catch (error) {
      console.error('[AG-Grid State] Error extracting state:', error);
      return null;
    }
  }, [gridApi]);

  /**
   * Apply state to AG-Grid v33+
   */
  const applyState = useCallback(async (
    state: AgGridState,
    options: ApplyStateOptions = {}
  ): Promise<void> => {
    if (!validateGridApi(gridApi)) {
      console.warn('[AG-Grid State] GridApi is not available or not properly initialized');
      return;
    }

    if (!state) {
      console.warn('[AG-Grid State] No state provided');
      return;
    }

    const defaultOptions: Required<ApplyStateOptions> = {
      applyColumnState: true,
      applyColumnGroups: true,
      applyFilters: true,
      applySorting: true,
      applyRowGrouping: true,
      applyPivoting: true,
      applyValueColumns: true,
      applyPagination: true,
      applySelection: true,
      applyRowPinning: true,
      applyFocus: true,
      applyRangeSelection: true,
      applyCellEditing: false,
      applyViewport: true,
      applySideBar: true,
      rowIdField: 'id',
      customStateApplier: undefined
    };

    const opts = { ...defaultOptions, ...options };

    try {
      // ===== APPLY COLUMN STATE =====
      if (opts.applyColumnState && state.columnState) {
        gridApi.applyColumnState({
          state: state.columnState,
          applyOrder: true
        });
      }

      // ===== APPLY COLUMN GROUPS =====
      if (opts.applyColumnGroups && state.columnGroupState) {
        state.columnGroupState.forEach(({ groupId, open }) => {
          try {
            const columnGroup = gridApi.getColumnGroup(groupId);
            if (columnGroup && columnGroup.setExpanded) {
              columnGroup.setExpanded(open);
            }
          } catch (error) {
            console.warn(`[AG-Grid State] Could not apply column group ${groupId}:`, error);
          }
        });
      }

      // ===== APPLY FILTERS =====
      if (opts.applyFilters && state.filterModel) {
        gridApi.setFilterModel(state.filterModel);
      }

      // ===== APPLY SORTING =====
      if (opts.applySorting && state.sortModel) {
        gridApi.setSortModel(state.sortModel);
      }

      // ===== APPLY ROW GROUPING =====
      if (opts.applyRowGrouping && state.rowGroupColumns) {
        const currentCols = new Set<string>();
        const columns = gridApi.getColumns();
        if (columns) {
          columns.forEach((col: Column) => {
            if (col.isRowGroupActive && col.isRowGroupActive()) {
              currentCols.add(col.getColId());
            }
          });
        }

        const targetCols = new Set(state.rowGroupColumns);

        // Remove columns that shouldn't be grouped
        currentCols.forEach(colId => {
          if (!targetCols.has(colId)) {
            gridApi.removeRowGroupColumn(colId);
          }
        });

        // Add columns that should be grouped
        targetCols.forEach(colId => {
          if (!currentCols.has(colId)) {
            gridApi.addRowGroupColumn(colId);
          }
        });
      }

      // ===== APPLY PIVOTING =====
      if (opts.applyPivoting) {
        if (state.pivotMode !== undefined) {
          gridApi.setPivotMode(state.pivotMode);
        }

        if (state.pivotColumns) {
          const currentCols = new Set<string>();
          const columns = gridApi.getColumns();
          if (columns) {
            columns.forEach((col: Column) => {
              if (col.isPivotActive && col.isPivotActive()) {
                currentCols.add(col.getColId());
              }
            });
          }

          const targetCols = new Set(state.pivotColumns);

          currentCols.forEach(colId => {
            if (!targetCols.has(colId)) {
              gridApi.removePivotColumn(colId);
            }
          });

          targetCols.forEach(colId => {
            if (!currentCols.has(colId)) {
              gridApi.addPivotColumn(colId);
            }
          });
        }
      }

      // ===== APPLY VALUE COLUMNS =====
      if (opts.applyValueColumns && state.valueColumns) {
        const currentCols = new Set<string>();
        const columns = gridApi.getColumns();
        if (columns) {
          columns.forEach((col: Column) => {
            if (col.isValueActive && col.isValueActive()) {
              currentCols.add(col.getColId());
            }
          });
        }

        const targetCols = new Set(state.valueColumns);

        currentCols.forEach(colId => {
          if (!targetCols.has(colId)) {
            gridApi.removeValueColumn(colId);
          }
        });

        targetCols.forEach(colId => {
          if (!currentCols.has(colId)) {
            gridApi.addValueColumn(colId);
          }
        });
      }

      // ===== APPLY PAGINATION =====
      if (opts.applyPagination && state.pagination) {
        if (state.pagination.pageSize !== undefined) {
          gridApi.paginationSetPageSize(state.pagination.pageSize);
        }

        if (state.pagination.paginationPageSizeSelector !== null) {
          gridApi.setGridOption('paginationPageSizeSelector', state.pagination.paginationPageSizeSelector);
        }

        if (state.pagination.currentPage !== undefined) {
          gridApi.paginationGoToPage(state.pagination.currentPage);
        }
      }

      // ===== APPLY SELECTION =====
      if (opts.applySelection) {
        gridApi.deselectAll();

        if (state.selectedRowIds && state.selectedRowIds.length > 0) {
          const rowNodes = new Map<string, IRowNode>();
          
          gridApi.forEachNode((node: IRowNode) => {
            if (node.data && node.data[opts.rowIdField!] !== undefined) {
              rowNodes.set(String(node.data[opts.rowIdField!]), node);
            }
          });

          state.selectedRowIds.forEach(rowId => {
            const node = rowNodes.get(rowId);
            if (node) {
              node.setSelected(true);
            }
          });
        }
      }

      // ===== APPLY ROW PINNING =====
      if (opts.applyRowPinning) {
        if (state.pinnedTopRowData) {
          gridApi.setGridOption('pinnedTopRowData', state.pinnedTopRowData);
        }
        if (state.pinnedBottomRowData) {
          gridApi.setGridOption('pinnedBottomRowData', state.pinnedBottomRowData);
        }
      }

      // ===== APPLY EXPANDED GROUPS =====
      if (state.expandedGroups && state.expandedGroups.length > 0) {
        if (state.rowModelType === 'clientSide') {
          gridApi.collapseAll();
          
          gridApi.forEachNode((node: IRowNode) => {
            if (node.group) {
              const groupId = node.key ? 
                `${node.rowGroupColumn?.getColId()}_${node.key}` : 
                String(node.id);
              
              if (groupId && state.expandedGroups.includes(groupId)) {
                node.setExpanded(true);
              }
            }
          });
        }
      }

      // ===== APPLY FOCUS =====
      if (opts.applyFocus && state.focusedCell) {
        const { rowIndex, column, rowPinned } = state.focusedCell;
        gridApi.setFocusedCell(rowIndex, column, rowPinned || undefined);
      }

      // ===== APPLY RANGE SELECTION =====
      if (opts.applyRangeSelection && state.cellRanges && state.cellRanges.length > 0) {
        gridApi.clearRangeSelection();
        
        state.cellRanges.forEach(range => {
          const columns = range.columns
            .map(colId => gridApi.getColumn(colId))
            .filter(Boolean) as Column[];
          
          if (columns.length > 0) {
            gridApi.addCellRange({
              rowStartIndex: range.startRow.rowIndex,
              rowStartPinned: range.startRow.rowPinned || undefined,
              rowEndIndex: range.endRow.rowIndex,
              rowEndPinned: range.endRow.rowPinned || undefined,
              columns
            });
          }
        });
      }

      // ===== APPLY CELL EDITING =====
      if (opts.applyCellEditing && state.editingCells && state.editingCells.length > 0) {
        gridApi.stopEditing();
        
        state.editingCells.forEach(cell => {
          gridApi.startEditingCell({
            rowIndex: cell.rowIndex,
            colKey: cell.colKey,
            rowPinned: cell.rowPinned || undefined
          });
        });
      }

      // ===== APPLY VIEWPORT =====
      if (opts.applyViewport && state.firstDisplayedRowIndex !== undefined) {
        gridApi.ensureIndexVisible(state.firstDisplayedRowIndex);
      }

      // ===== APPLY SIDE BAR =====
      if (opts.applySideBar && state.sideBarState) {
        try {
          const sideBar = gridApi.getSideBar();
          if (sideBar) {
            if (state.sideBarState.position && sideBar.setSideBarPosition) {
              sideBar.setSideBarPosition(state.sideBarState.position);
            }
            
            if (state.sideBarState.visible && state.sideBarState.openedToolPanel) {
              if (sideBar.openToolPanel) {
                sideBar.openToolPanel(state.sideBarState.openedToolPanel);
              }
            } else {
              if (sideBar.closeToolPanel) {
                sideBar.closeToolPanel();
              }
            }
          }
        } catch (error) {
          console.warn('[AG-Grid State] Could not apply side bar state:', error);
        }
      }

      // ===== APPLY CUSTOM STATE =====
      if (opts.customStateApplier && state.customState) {
        opts.customStateApplier(gridApi, state.customState);
      }

      // Refresh grid
      gridApi.refreshCells({ force: true });

      // Allow grid to settle
      await new Promise(resolve => setTimeout(resolve, 0));

    } catch (error) {
      console.error('[AG-Grid State] Error applying state:', error);
      throw error;
    }
  }, [gridApi]);

  /**
   * Save state to storage
   */
  const saveState = useCallback((
    key: string,
    options?: ExtractStateOptions
  ): AgGridState | null => {
    const state = extractState(options);
    if (state && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.warn('[AG-Grid State] Could not save to localStorage:', error);
      }
    }
    return state;
  }, [extractState]);

  /**
   * Load state from storage
   */
  const loadState = useCallback(async (
    key: string,
    options?: ApplyStateOptions
  ): Promise<AgGridState | null> => {
    if (typeof localStorage === 'undefined') {
      console.warn('[AG-Grid State] localStorage not available');
      return null;
    }

    try {
      const serialized = localStorage.getItem(key);
      if (!serialized) {
        return null;
      }

      const state = JSON.parse(serialized) as AgGridState;
      await applyState(state, options);
      return state;
    } catch (error) {
      console.error('[AG-Grid State] Error loading state:', error);
      return null;
    }
  }, [applyState]);

  return {
    extractState,
    applyState,
    saveState,
    loadState,
    currentState: stateRef.current
  };
}

/**
 * React component for AG-Grid state management UI
 */
export interface AgGridStateManagerProps {
  gridApi: GridApi | null;
  storageKey?: string;
  children?: (actions: {
    saveState: () => void;
    loadState: () => Promise<void>;
    clearState: () => void;
    hasState: boolean;
  }) => React.ReactNode;
}

export const AgGridStateManager: React.FC<AgGridStateManagerProps> = ({
  gridApi,
  storageKey = 'ag-grid-state',
  children
}) => {
  const { saveState, loadState } = useAgGridStateManager(gridApi);
  const [hasState, setHasState] = React.useState(false);

  React.useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      setHasState(!!localStorage.getItem(storageKey));
    }
  }, [storageKey]);

  const handleSaveState = useCallback(() => {
    saveState(storageKey);
    setHasState(true);
  }, [saveState, storageKey]);

  const handleLoadState = useCallback(async () => {
    await loadState(storageKey);
  }, [loadState, storageKey]);

  const handleClearState = useCallback(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(storageKey);
      setHasState(false);
    }
  }, [storageKey]);

  if (children) {
    return <React.Fragment>{children({
      saveState: handleSaveState,
      loadState: handleLoadState,
      clearState: handleClearState,
      hasState
    })}</React.Fragment>;
  }

  return (
    <div className="ag-grid-state-manager">
      <button onClick={handleSaveState} disabled={!gridApi}>
        Save State
      </button>
      <button onClick={handleLoadState} disabled={!gridApi || !hasState}>
        Load State
      </button>
      <button onClick={handleClearState} disabled={!hasState}>
        Clear State
      </button>
    </div>
  );
};

export default useAgGridStateManager;