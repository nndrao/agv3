/**
 * AG-Grid State Management for DataGridStompShared
 * Comprehensive state persistence and restoration
 */

import type { 
  GridApi,
  ColumnState,
  FilterModel,
  Column,
  ColDef
} from 'ag-grid-community';

// SortModel is not exported in v33, define it locally
type SortModel = {
  colId: string;
  sort: 'asc' | 'desc' | null;
}[];

/**
 * Complete grid state interface
 */
export interface GridState {
  // Column configuration
  columnState: ColumnState[];
  columnGroupState?: Array<{ groupId: string; open: boolean }>; // Track group expansion
  columnDefs?: ColDef[];
  columnGroups?: any[]; // Full column group definitions
  
  // Data filtering and sorting
  filterModel: FilterModel;
  sortModel: SortModel;
  quickFilter?: string;
  advancedFilter?: any;
  
  // Row grouping and aggregation
  rowGroupColumns: string[];
  pivotMode: boolean;
  pivotColumns: string[];
  valueColumns: string[];
  aggregationFunctions?: Record<string, string>;
  
  // Pagination state
  pagination: {
    enabled: boolean;
    currentPage: number;
    pageSize: number;
    totalPages?: number;
  };
  
  // Selection state
  selectedRowIds: string[];
  selectedRowRanges?: any[];
  
  // Row expansion state (for master/detail or tree data)
  expandedGroups: string[];
  expandedMasterRows?: string[];
  
  // Row pinning
  pinnedTopRowData?: any[];
  pinnedBottomRowData?: any[];
  
  // Grid display options
  gridOptions: {
    animateRows?: boolean;
    enableCellChangeFlash?: boolean;
    suppressRowHoverHighlight?: boolean;
    rowHeight?: number;
    headerHeight?: number;
    groupHeaderHeight?: number;
    floatingFiltersHeight?: number;
    pivotHeaderHeight?: number;
    pivotGroupHeaderHeight?: number;
    rowBuffer?: number;
    rowSelection?: 'single' | 'multiple' | any;
    suppressRowClickSelection?: boolean;
    suppressCellFocus?: boolean;
    enableRangeSelection?: boolean;
    enableFillHandle?: boolean;
    suppressCopyRowsToClipboard?: boolean;
    clipboardDelimiter?: string;
  };
  
  // UI state
  focusedCell?: {
    rowIndex: number;
    column: string;
    rowPinned?: string | null;
  };
  scrollPosition?: {
    top: number;
    left: number;
  };
  
  // Side bar
  sideBarState?: {
    visible: boolean;
    position?: 'left' | 'right';
    openedToolPanel?: string | null;
    width?: number;
  };
  
  // Status bar
  statusBarState?: {
    visible: boolean;
    panels?: string[];
  };
  
  // Custom state for extensions
  customState?: Record<string, any>;
  
  // Timestamp for state tracking
  timestamp?: number;
  version?: string;
}

/**
 * Options for extracting state
 */
export interface ExtractStateOptions {
  includeColumnDefs?: boolean;
  includeRowData?: boolean;
  includeCustomState?: boolean;
  rowIdField?: string;
}

/**
 * Options for applying state
 */
export interface ApplyStateOptions {
  applyColumnState?: boolean;
  applyFilters?: boolean;
  applySorting?: boolean;
  applyGrouping?: boolean;
  applyPagination?: boolean;
  applySelection?: boolean;
  applyExpansion?: boolean;
  applyPinning?: boolean;
  applyGridOptions?: boolean;
  applyScrollPosition?: boolean;
  applySideBar?: boolean;
  rowIdField?: string;
  animateChanges?: boolean;
}

/**
 * Grid State Manager Class
 */
export class GridStateManager {
  private gridApi: GridApi | null = null;
  private defaultState: Partial<GridState> = {};
  private columnGroups: any[] = [];
  private pendingColumnState: ColumnState[] | null = null;
  private pendingColumnGroupState: Array<{ groupId: string; open: boolean }> | null = null;
  
  constructor(gridApi?: GridApi) {
    if (gridApi) {
      this.setGridApi(gridApi);
    }
  }
  
  /**
   * Set or update the GridApi reference
   */
  setGridApi(gridApi: GridApi) {
    this.gridApi = gridApi;
  }
  
  /**
   * Set column groups for state extraction
   */
  setColumnGroups(groups: any[]) {
    this.columnGroups = groups || [];
  }
  
  /**
   * Get column groups
   */
  getColumnGroups(): any[] {
    return this.columnGroups;
  }
  
  setPendingColumnState(columnState: ColumnState[]): void {
    this.pendingColumnState = columnState;
  }
  
  getPendingColumnState(): ColumnState[] | null {
    return this.pendingColumnState;
  }
  
  clearPendingColumnState(): void {
    this.pendingColumnState = null;
  }
  
  // Removed pending column group state methods - now handled properly in profile application
  
  /**
   * Set default state for reset operations
   */
  setDefaultState(state: Partial<GridState>) {
    this.defaultState = state;
  }
  
  /**
   * Extract complete grid state
   */
  extractState(options: ExtractStateOptions = {}): GridState | null {
    if (!this.gridApi) {
      console.warn('[GridStateManager] GridApi not available');
      return null;
    }
    
    const {
      includeColumnDefs = true,
      rowIdField = 'id'
    } = options;
    
    try {
      const state: GridState = {
        // Column state (includes visibility that reflects group expansion)
        columnState: this.extractColumnState(),
        columnGroupState: this.extractColumnGroupState(),
        
        // Filter and sort
        filterModel: this.gridApi.getFilterModel() || {},
        sortModel: this.extractSortModel(),
        quickFilter: this.gridApi.getQuickFilter() || undefined,
        
        // Grouping
        rowGroupColumns: this.extractRowGroupColumns(),
        pivotMode: typeof (this.gridApi as any).isPivotMode === 'function' ? (this.gridApi as any).isPivotMode() : false,
        pivotColumns: this.extractPivotColumns(),
        valueColumns: this.extractValueColumns(),
        
        // Pagination
        pagination: this.extractPaginationState(),
        
        // Selection
        selectedRowIds: this.extractSelectedRowIds(rowIdField),
        
        // Expansion
        expandedGroups: this.extractExpandedGroups(),
        
        // Grid options
        gridOptions: this.extractGridOptions(),
        
        // UI state
        focusedCell: this.extractFocusedCell(),
        scrollPosition: this.extractScrollPosition(),
        
        // Sidebar
        sideBarState: this.extractSideBarState(),
        
        // Metadata
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      // Include column definitions if requested
      if (includeColumnDefs) {
        state.columnDefs = this.gridApi.getColumnDefs() || undefined;
      }
      
      // Include column groups if they exist
      if (this.columnGroups && this.columnGroups.length > 0) {
        state.columnGroups = this.columnGroups;
      } else {
      }
      
      // Include pinned rows if they exist
      if (typeof (this.gridApi as any).getPinnedTopRowData === 'function') {
        const pinnedTopRowData = (this.gridApi as any).getPinnedTopRowData();
        if (pinnedTopRowData && pinnedTopRowData.length > 0) {
          state.pinnedTopRowData = pinnedTopRowData;
        }
      }
      
      if (typeof (this.gridApi as any).getPinnedBottomRowData === 'function') {
        const pinnedBottomRowData = (this.gridApi as any).getPinnedBottomRowData();
        if (pinnedBottomRowData && pinnedBottomRowData.length > 0) {
          state.pinnedBottomRowData = pinnedBottomRowData;
        }
      }
      
      return state;
    } catch (error) {
      console.error('[GridStateManager] Error extracting state:', error);
      return null;
    }
  }
  
  /**
   * Apply grid state with proper sequencing (no delays)
   */
  applyState(state: GridState, options: ApplyStateOptions = {}): boolean {
    
    if (!this.gridApi || !state) {
      console.warn('[GridStateManager] Cannot apply state - GridApi or state not available');
      return false;
    }
    
    const {
      applyColumnState = true,
      applyFilters = true,
      applySorting = true,
      applyGrouping = true,
      applyPagination = true,
      applySelection = true,
      applyExpansion = true,
      applyPinning = true,
      applyGridOptions = true,
      applyScrollPosition = true,
      applySideBar = true,
      rowIdField = 'id',
      animateChanges = false
    } = options;
    
    console.log('[GridStateManager] Applying grid state with options:', {
      applyColumnState,
      applyFilters,
      applyGrouping,
      applyPagination
    });
    
    try {
      // Apply column state immediately (no delays)
      if (applyColumnState && state.columnState) {
        console.log('[GridStateManager] Applying column state');
        this.applyColumnState(state.columnState);
      }
      
      // Store column groups for reference (they are applied via ColumnGroupService in profile application)
      if (state.columnGroups && state.columnGroups.length > 0) {
        this.columnGroups = state.columnGroups;
        console.log('[GridStateManager] Stored column groups for reference');
      }
      
      // Apply filters
      if (applyFilters && state.filterModel) {
        console.log('[GridStateManager] Applying filter model');
        this.gridApi.setFilterModel(state.filterModel);
        
        if (state.quickFilter) {
          this.gridApi.setGridOption('quickFilterText', state.quickFilter);
        }
      }
      
      // Apply sorting (handled via column state in AG-Grid v33+)
      if (applySorting && state.sortModel) {
        console.debug('[GridStateManager] Sort model applied via column state');
      }
      
      // Apply grouping
      if (applyGrouping) {
        this.applyGroupingState(state);
      }
      
      // Apply pagination
      if (applyPagination && state.pagination) {
        this.applyPaginationState(state.pagination);
      }
      
      // Apply selection
      if (applySelection && state.selectedRowIds) {
        this.applySelectionState(state.selectedRowIds, rowIdField);
      }
      
      // Apply expansion
      if (applyExpansion && state.expandedGroups) {
        this.applyExpansionState(state.expandedGroups);
      }
      
      // Apply pinning
      if (applyPinning) {
        if (state.pinnedTopRowData && typeof (this.gridApi as any).setPinnedTopRowData === 'function') {
          (this.gridApi as any).setPinnedTopRowData(state.pinnedTopRowData);
        }
        if (state.pinnedBottomRowData && typeof (this.gridApi as any).setPinnedBottomRowData === 'function') {
          (this.gridApi as any).setPinnedBottomRowData(state.pinnedBottomRowData);
        }
      }
      
      // Apply grid options
      if (applyGridOptions && state.gridOptions) {
        this.applyGridOptions(state.gridOptions);
      }
      
      // Apply scroll position
      if (applyScrollPosition && state.scrollPosition) {
        this.applyScrollPosition(state.scrollPosition!);
      }
      
      // Apply sidebar state
      if (applySideBar && state.sideBarState) {
        this.applySideBarState(state.sideBarState);
      }
      
      // Refresh the grid if requested
      if (animateChanges) {
        this.gridApi.refreshCells({ force: true });
      }
      
      console.log('[GridStateManager] Grid state applied successfully');
      return true;
    } catch (error) {
      console.error('[GridStateManager] Error applying state:', error);
      return false;
    }
  }
  
  /**
   * Reset grid to default state
   */
  resetToDefault(): boolean {
    if (!this.gridApi) {
      return false;
    }
    
    try {
      // Reset column state (this includes sorting in modern AG-Grid)
      this.gridApi.resetColumnState();
      
      // Clear filters
      this.gridApi.setFilterModel(null);
      this.gridApi.setGridOption('quickFilterText', '');
      
      // Clear sorting (handled by resetColumnState above, but we can also explicitly clear it)
      // In AG-Grid v31+, sorting is part of column state
      // We don't call setSortModel as it doesn't exist in newer versions
      
      // Clear selection
      this.gridApi.deselectAll();
      
      // Reset pagination
      if (this.gridApi.paginationGoToFirstPage) {
        this.gridApi.paginationGoToFirstPage();
      }
      
      // Apply default state if available
      if (Object.keys(this.defaultState).length > 0) {
        this.applyState(this.defaultState as GridState);
      }
      
      return true;
    } catch (error) {
      console.error('[GridStateManager] Error resetting state:', error);
      return false;
    }
  }
  
  // === Private helper methods ===
  
  private extractColumnState(): ColumnState[] {
    if (!this.gridApi) return [];
    const columnState = this.gridApi.getColumnState() || [];
    
    // Debug: Log column state being extracted
    columnState.filter((col: any) => col.hide === true);
    
    // Check if we have columns with columnGroupShow
    const columnDefs = this.gridApi.getColumnDefs();
    if (columnDefs) {
      const columnsWithGroupShow: any[] = [];
      const checkForGroupShow = (defs: any[]) => {
        defs.forEach((def: any) => {
          if (def.children) {
            checkForGroupShow(def.children);
          } else if (def.columnGroupShow) {
            columnsWithGroupShow.push({ 
              colId: def.colId || def.field, 
              columnGroupShow: def.columnGroupShow,
              currentlyHidden: columnState.find((s: any) => s.colId === (def.colId || def.field))?.hide
            });
          }
        });
      };
      checkForGroupShow(columnDefs);
      if (columnsWithGroupShow.length > 0) {
      }
    }
    
    return columnState;
  }
  
  private extractColumnGroupState(): Array<{ groupId: string; open: boolean }> {
    if (!this.gridApi) return [];
    
    // Use the official AG-Grid API to get column group state
    if (this.gridApi.getColumnGroupState) {
      try {
        const groupState = this.gridApi.getColumnGroupState();
        console.log('[🔍 GRIDSTATE-001] Extracted column group state using getColumnGroupState:', groupState);
        return groupState || [];
      } catch (error) {
        console.warn('[🔍 GRIDSTATE-002] Error calling getColumnGroupState:', error);
      }
    }
    
    // Fallback: try to determine group states manually
    const groups: Array<{ groupId: string; open: boolean }> = [];
    
    try {
      // Check for setColumnGroupOpened method to determine group states
      if (typeof (this.gridApi as any).setColumnGroupOpened === 'function') {
        const columnDefs = this.gridApi.getColumnDefs();
        if (columnDefs) {
          const extractGroups = (defs: any[]) => {
            defs.forEach((def: any) => {
              if (def.children && def.groupId) {
                // Determine if group is open or collapsed based on column visibility
                let isOpen = true;
                
                // Analyze columns to determine group state:
                // If columns with columnGroupShow:'open' are hidden -> group is collapsed
                // If columns with columnGroupShow:'closed' are visible -> group is collapsed
                let hasOpenColumns = false;
                let hasClosedColumns = false;
                let openColumnsHidden = false;
                let closedColumnsVisible = false;
                
                def.children.forEach((child: any) => {
                  const colState = this.gridApi!.getColumnState()?.find((s: any) => 
                    s.colId === (child.colId || child.field)
                  );
                  
                  if (child.columnGroupShow === 'open') {
                    hasOpenColumns = true;
                    if (colState && colState.hide === true) {
                      openColumnsHidden = true;
                    }
                  } else if (child.columnGroupShow === 'closed') {
                    hasClosedColumns = true;
                    if (colState && colState.hide === false) {
                      closedColumnsVisible = true;
                    }
                  }
                  // Columns with undefined columnGroupShow are always visible
                });
                
                // Determine group state based on column visibility patterns
                if (hasOpenColumns && openColumnsHidden) {
                  isOpen = false; // Group is collapsed (open columns are hidden)
                } else if (hasClosedColumns && closedColumnsVisible) {
                  isOpen = false; // Group is collapsed (closed columns are visible)
                }
                
                groups.push({
                  groupId: def.groupId,
                  open: isOpen
                });
                
              }
            });
          };
          extractGroups(columnDefs);
        }
      }
    } catch (error) {
      console.warn('[🔍][COLUMN_GROUP_STATE_EXTRACT] Error extracting column group state:', error);
    }
    
    return groups;
  }
  
  private extractSortModel(): SortModel {
    if (!this.gridApi) return [];
    
    const columnState = this.gridApi.getColumnState() || [];
    const sortModel: SortModel = [];
    
    columnState.forEach((col: any) => {
      if (col.sort) {
        sortModel.push({
          colId: col.colId,
          sort: col.sort
        });
      }
    });
    
    // Sort by sortIndex if available
    sortModel.sort((a: any, b: any) => {
      const aState = columnState.find((c: any) => c.colId === a.colId);
      const bState = columnState.find((c: any) => c.colId === b.colId);
      const aIndex = aState?.sortIndex ?? Number.MAX_SAFE_INTEGER;
      const bIndex = bState?.sortIndex ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
    
    return sortModel;
  }
  
  private extractRowGroupColumns(): string[] {
    if (!this.gridApi) return [];
    
    try {
      const columns: string[] = [];
      
      // Try to get columns
      if (typeof this.gridApi.getColumns === 'function') {
        const allColumns = this.gridApi.getColumns();
        
        if (allColumns && Array.isArray(allColumns)) {
          allColumns.forEach((col: Column) => {
            if (typeof col.isRowGroupActive === 'function' && col.isRowGroupActive()) {
              columns.push(col.getColId());
            }
          });
        }
      }
      
      return columns;
    } catch (error) {
      console.warn('[GridStateManager] Could not extract row group columns:', error);
      return [];
    }
  }
  
  private extractPivotColumns(): string[] {
    if (!this.gridApi) return [];
    
    try {
      const columns: string[] = [];
      
      // Try to get columns
      if (typeof this.gridApi.getColumns === 'function') {
        const allColumns = this.gridApi.getColumns();
        
        if (allColumns && Array.isArray(allColumns)) {
          allColumns.forEach((col: Column) => {
            if (typeof col.isPivotActive === 'function' && col.isPivotActive()) {
              columns.push(col.getColId());
            }
          });
        }
      }
      
      return columns;
    } catch (error) {
      console.warn('[GridStateManager] Could not extract pivot columns:', error);
      return [];
    }
  }
  
  private extractValueColumns(): string[] {
    if (!this.gridApi) return [];
    
    try {
      const columns: string[] = [];
      
      // Try to get columns
      if (typeof this.gridApi.getColumns === 'function') {
        const allColumns = this.gridApi.getColumns();
        
        if (allColumns && Array.isArray(allColumns)) {
          allColumns.forEach((col: Column) => {
            if (typeof col.isValueActive === 'function' && col.isValueActive()) {
              columns.push(col.getColId());
            }
          });
        }
      }
      
      return columns;
    } catch (error) {
      console.warn('[GridStateManager] Could not extract value columns:', error);
      return [];
    }
  }
  
  private extractPaginationState() {
    if (!this.gridApi) {
      return {
        enabled: false,
        currentPage: 0,
        pageSize: 100
      };
    }
    
    return {
      enabled: this.gridApi.paginationIsLastPageFound !== undefined,
      currentPage: this.gridApi.paginationGetCurrentPage?.() || 0,
      pageSize: this.gridApi.paginationGetPageSize?.() || 100,
      totalPages: this.gridApi.paginationGetTotalPages?.() || undefined
    };
  }
  
  private extractSelectedRowIds(rowIdField: string): string[] {
    if (!this.gridApi) return [];
    
    const selectedRows = this.gridApi.getSelectedRows();
    return selectedRows
      .map((row: any) => row[rowIdField])
      .filter(Boolean);
  }
  
  private extractExpandedGroups(): string[] {
    if (!this.gridApi) return [];
    
    const expandedIds: string[] = [];
    
    this.gridApi.forEachNode((node: any) => {
      if (node.group && node.expanded && node.key) {
        expandedIds.push(node.key);
      }
    });
    
    return expandedIds;
  }
  
  private extractGridOptions() {
    if (!this.gridApi) return {};
    
    return {
      animateRows: this.gridApi.getGridOption('animateRows'),
      enableCellChangeFlash: (this.gridApi as any).getGridOption('enableCellChangeFlash'),
      suppressRowHoverHighlight: this.gridApi.getGridOption('suppressRowHoverHighlight'),
      rowHeight: this.gridApi.getGridOption('rowHeight'),
      headerHeight: this.gridApi.getGridOption('headerHeight'),
      rowBuffer: this.gridApi.getGridOption('rowBuffer'),
      rowSelection: this.gridApi.getGridOption('rowSelection'),
      suppressRowClickSelection: this.gridApi.getGridOption('suppressRowClickSelection'),
      enableRangeSelection: this.gridApi.getGridOption('enableRangeSelection')
    };
  }
  
  private extractFocusedCell() {
    if (!this.gridApi) return undefined;
    
    try {
      if (typeof this.gridApi.getFocusedCell === 'function') {
        const focusedCell = this.gridApi.getFocusedCell();
        if (!focusedCell) return undefined;
        
        return {
          rowIndex: focusedCell.rowIndex,
          column: focusedCell.column.getColId(),
          rowPinned: focusedCell.rowPinned || undefined
        };
      }
    } catch (error) {
      console.warn('[GridStateManager] Could not extract focused cell:', error);
    }
    
    return undefined;
  }
  
  private extractScrollPosition() {
    // This would need DOM access - simplified version
    return undefined;
  }
  
  private extractSideBarState() {
    if (!this.gridApi) return undefined;
    
    try {
      const sideBar = this.gridApi.getGridOption('sideBar');
      if (!sideBar) return undefined;
      
      return {
        visible: typeof (this.gridApi as any).isSideBarVisible === 'function' ? (this.gridApi as any).isSideBarVisible() : false,
        openedToolPanel: typeof (this.gridApi as any).getOpenedToolPanel === 'function' ? (this.gridApi as any).getOpenedToolPanel() : undefined
      };
    } catch (error) {
      console.warn('[GridStateManager] Could not extract sidebar state:', error);
      return undefined;
    }
  }
  
  private applyColumnState(columnState: ColumnState[]) {
    if (!this.gridApi) return;
    this.gridApi.applyColumnState({ state: columnState });
  }
  
  private applyColumnGroupState(state: GridState): boolean {
    if (!this.gridApi || !state.columnGroupState) return true;
    
    try {
      // Use the official AG-Grid API to set column group state
      if (this.gridApi.setColumnGroupState) {
        console.log('[🔍 GRIDSTATE-003] Applying column group state using setColumnGroupState:', state.columnGroupState);
        this.gridApi.setColumnGroupState(state.columnGroupState);
        return true;
      }
      
      // Fallback: use setColumnGroupOpened for each group
      if (typeof (this.gridApi as any).setColumnGroupOpened === 'function') {
        console.log('[🔍 GRIDSTATE-004] Applying column group state using setColumnGroupOpened');
        state.columnGroupState.forEach((groupState: any) => {
          try {
            (this.gridApi as any).setColumnGroupOpened(groupState.groupId, groupState.open);
          } catch (e) {
            console.warn(`[🔍 GRIDSTATE-005] Could not set state for group ${groupState.groupId}:`, e);
          }
        });
        return true;
      }
      
      console.warn('[🔍 GRIDSTATE-006] No method available to apply column group state');
      return false;
    } catch (error) {
      console.error('[🔍 GRIDSTATE-007] Error applying column group state:', error);
      return false;
    }
  }
  
  private applyGroupingState(state: GridState) {
    if (!this.gridApi) return;
    
    try {
      // Set pivot mode
      if (state.pivotMode !== undefined && typeof (this.gridApi as any).setPivotMode === 'function') {
        (this.gridApi as any).setPivotMode(state.pivotMode);
      }
      
      // Apply row grouping
      if (state.rowGroupColumns && typeof (this.gridApi as any).setRowGroupColumns === 'function') {
        (this.gridApi as any).setRowGroupColumns(state.rowGroupColumns);
      }
      
      // Apply pivot columns
      if (state.pivotColumns && typeof (this.gridApi as any).setPivotColumns === 'function') {
        (this.gridApi as any).setPivotColumns(state.pivotColumns);
      }
      
      // Apply value columns
      if (state.valueColumns && typeof (this.gridApi as any).setValueColumns === 'function') {
        (this.gridApi as any).setValueColumns(state.valueColumns);
      }
    } catch (error) {
      console.warn('[GridStateManager] Error applying grouping state:', error);
    }
  }
  
  private applyPaginationState(pagination: GridState['pagination']) {
    if (!this.gridApi) return;
    
    if (pagination.pageSize) {
      this.gridApi.setGridOption('paginationPageSize', pagination.pageSize);
    }
    
    if (pagination.currentPage !== undefined && this.gridApi.paginationGoToPage) {
      this.gridApi.paginationGoToPage(pagination.currentPage);
    }
  }
  
  private applySelectionState(selectedRowIds: string[], rowIdField: string) {
    if (!this.gridApi) return;
    
    // Clear existing selection
    this.gridApi.deselectAll();
    
    // Select rows by ID
    this.gridApi.forEachNode((node: any) => {
      if (node.data && selectedRowIds.includes(node.data[rowIdField])) {
        node.setSelected(true);
      }
    });
  }
  
  private applyExpansionState(expandedGroups: string[]) {
    if (!this.gridApi) return;
    
    try {
      // Collapse all groups first
      if (typeof (this.gridApi as any).collapseAll === 'function') {
        (this.gridApi as any).collapseAll();
      }
      
      // Expand specific groups
      this.gridApi.forEachNode((node: any) => {
        if (node.group && node.key && expandedGroups.includes(node.key)) {
          if (typeof node.setExpanded === 'function') {
            node.setExpanded(true);
          }
        }
      });
    } catch (error) {
      console.warn('[GridStateManager] Error applying expansion state:', error);
    }
  }
  
  private applyGridOptions(options: GridState['gridOptions']) {
    if (!this.gridApi || !options) return;
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        this.gridApi!.setGridOption(key as any, value);
      }
    });
  }
  
  private applyScrollPosition(position: { top: number; left: number }) {
    if (!this.gridApi) return;
    
    // This would need DOM access to scroll containers
    // Simplified implementation
    this.gridApi.ensureIndexVisible(Math.floor(position.top / 25)); // Assuming 25px row height
  }
  
  private applySideBarState(sideBarState: GridState['sideBarState']) {
    if (!this.gridApi || !sideBarState) return;
    
    if (sideBarState.visible !== undefined && typeof (this.gridApi as any).setSideBarVisible === 'function') {
      (this.gridApi as any).setSideBarVisible(sideBarState.visible);
    }
    
    if (sideBarState.openedToolPanel !== undefined && typeof (this.gridApi as any).openToolPanel === 'function') {
      (this.gridApi as any).openToolPanel(sideBarState.openedToolPanel);
    }
  }
}

// Export singleton instance
export const gridStateManager = new GridStateManager();