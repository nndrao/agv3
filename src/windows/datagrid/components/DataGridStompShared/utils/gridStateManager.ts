/**
 * AG-Grid State Management for DataGridStompShared
 * Comprehensive state persistence and restoration
 */

import type { 
  GridApi,
  ColumnState,
  FilterModel,
  SortModel,
  Column,
  ColDef,
  ColGroupDef,
  GridReadyEvent
} from 'ag-grid-community';

/**
 * Complete grid state interface
 */
export interface GridState {
  // Column configuration
  columnState: ColumnState[];
  columnGroupState: Array<{ groupId: string; open: boolean }>;
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
    rowSelection?: 'single' | 'multiple';
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
    console.log('[🔍][COLUMN_GROUPS_PERSIST] GridStateManager.setColumnGroups called with:', groups);
    this.columnGroups = groups || [];
  }
  
  /**
   * Get column groups
   */
  getColumnGroups(): any[] {
    console.log('[🔍][COLUMN_GROUPS_PERSIST] GridStateManager.getColumnGroups returning:', this.columnGroups);
    return this.columnGroups;
  }
  
  setPendingColumnState(columnState: ColumnState[]): void {
    console.log('[🔍][GRID_STATE_APPLY] Storing pending column state:', columnState?.length, 'columns');
    this.pendingColumnState = columnState;
  }
  
  getPendingColumnState(): ColumnState[] | null {
    return this.pendingColumnState;
  }
  
  clearPendingColumnState(): void {
    this.pendingColumnState = null;
  }
  
  setPendingColumnGroupState(groupState: Array<{ groupId: string; open: boolean }>): void {
    console.log('[🔍][GRID_STATE_APPLY] Storing pending column group state:', groupState);
    this.pendingColumnGroupState = groupState;
  }
  
  getPendingColumnGroupState(): Array<{ groupId: string; open: boolean }> | null {
    return this.pendingColumnGroupState;
  }
  
  clearPendingColumnGroupState(): void {
    this.pendingColumnGroupState = null;
  }
  
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
      includeCustomState = true,
      rowIdField = 'id'
    } = options;
    
    try {
      const state: GridState = {
        // Column state
        columnState: this.extractColumnState(),
        columnGroupState: this.extractColumnGroupState(),
        
        // Filter and sort
        filterModel: this.gridApi.getFilterModel() || {},
        sortModel: typeof this.gridApi.getSortModel === 'function' ? (this.gridApi.getSortModel() || []) : [],
        quickFilter: typeof (this.gridApi as any).getQuickFilter === 'function' ? ((this.gridApi as any).getQuickFilter() || undefined) : undefined,
        
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
        console.log('[🔍][COLUMN_GROUPS_PERSIST] Including column groups in extracted state:', this.columnGroups);
        state.columnGroups = this.columnGroups;
      } else {
        console.log('[🔍][COLUMN_GROUPS_PERSIST] No column groups to include in extracted state');
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
   * Apply grid state
   */
  applyState(state: GridState, options: ApplyStateOptions = {}): boolean {
    console.log('[🔍][GRID_STATE_APPLY] applyState called');
    console.log('[🔍][GRID_STATE_APPLY] State has columnGroups:', !!state.columnGroups, state.columnGroups?.length);
    
    if (!this.gridApi || !state) {
      console.warn('[🔍][GRID_STATE_APPLY] Cannot apply state - GridApi or state not available');
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
    
    console.log('[🔍][GRID_STATE_APPLY] Options:', options);
    
    try {
      // Apply column state (but delay if we have column groups to apply first)
      const hasColumnGroups = state.columnGroups && state.columnGroups.length > 0;
      
      if (applyColumnState && state.columnState) {
        if (hasColumnGroups) {
          console.log('[🔍][GRID_STATE_APPLY] Delaying column state application - column groups need to be applied first');
          // Store column state to be applied later by ColumnGroupService
          this.setPendingColumnState(state.columnState);
        } else {
          console.log('[🔍][GRID_STATE_APPLY] Applying column state directly (no column groups)');
          this.applyColumnState(state.columnState);
        }
      }
      
      // Store column group state to be applied after column groups are created
      if (state.columnGroupState && state.columnGroupState.length > 0) {
        console.log('[🔍][GRID_STATE_APPLY] Storing column group state to apply later:', state.columnGroupState);
        this.setPendingColumnGroupState(state.columnGroupState);
      }
      
      // Store column groups for later use (they need to be applied via ColumnGroupService)
      if (state.columnGroups && state.columnGroups.length > 0) {
        console.log('[🔍][COLUMN_GROUPS_RESTORE] Storing column groups from state:', state.columnGroups);
        this.columnGroups = state.columnGroups;
      } else {
        console.log('[🔍][COLUMN_GROUPS_RESTORE] No column groups in state to store');
      }
      
      // Apply filters
      if (applyFilters && state.filterModel) {
        this.gridApi.setFilterModel(state.filterModel);
        
        if (state.quickFilter) {
          this.gridApi.setQuickFilter(state.quickFilter);
        }
      }
      
      // Apply sorting
      // In AG-Grid v31+, sorting is part of column state, not a separate model
      // The sorting will be applied when we apply column state above
      if (applySorting && state.sortModel) {
        // Sort model is already applied via column state
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
      
      // Apply scroll position (after a delay to let grid render)
      if (applyScrollPosition && state.scrollPosition) {
        setTimeout(() => {
          this.applyScrollPosition(state.scrollPosition!);
        }, 100);
      }
      
      // Apply sidebar state
      if (applySideBar && state.sideBarState) {
        this.applySideBarState(state.sideBarState);
      }
      
      // Refresh the grid
      if (animateChanges) {
        this.gridApi.refreshCells({ force: true });
      }
      
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
      this.gridApi.setQuickFilter(null);
      
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
    return this.gridApi.getColumnState() || [];
  }
  
  private extractColumnGroupState(): Array<{ groupId: string; open: boolean }> {
    if (!this.gridApi) return [];
    
    const groups: Array<{ groupId: string; open: boolean }> = [];
    
    try {
      // Method 1: Try getColumnGroupState (newer versions)
      if (typeof (this.gridApi as any).getColumnGroupState === 'function') {
        const groupState = (this.gridApi as any).getColumnGroupState();
        console.log('[🔍][COLUMN_GROUP_STATE_EXTRACT] Got column group state from API:', groupState);
        if (Array.isArray(groupState)) {
          return groupState.map((state: any) => ({
            groupId: state.groupId,
            open: state.open || false
          }));
        }
      }
      
      // Method 2: Try traversing column definitions to find groups
      const columnDefs = this.gridApi.getColumnDefs();
      console.log('[🔍][COLUMN_GROUP_STATE_EXTRACT] Checking column defs for groups:', columnDefs?.length);
      if (columnDefs && Array.isArray(columnDefs)) {
        const extractGroups = (defs: any[], parentOpen = true) => {
          defs.forEach((def: any) => {
            if (def.children && def.groupId) {
              // This is a column group
              console.log('[🔍][COLUMN_GROUP_STATE_EXTRACT] Found group:', def.groupId, 'with openByDefault:', def.openByDefault);
              // Try to determine if it's open by checking if children are visible
              let isOpen = def.openByDefault !== false;
              
              // Try to check actual state using gridApi methods
              if (typeof (this.gridApi as any).isColumnGroupOpened === 'function') {
                try {
                  isOpen = (this.gridApi as any).isColumnGroupOpened(def.groupId);
                  console.log('[🔍][COLUMN_GROUP_STATE_EXTRACT] Group', def.groupId, 'isOpen from API:', isOpen);
                } catch (e) {
                  console.log('[🔍][COLUMN_GROUP_STATE_EXTRACT] Could not get state for group', def.groupId, '- using default');
                }
              }
              
              groups.push({
                groupId: def.groupId,
                open: isOpen
              });
              
              // Recursively check for nested groups
              if (def.children) {
                extractGroups(def.children, isOpen);
              }
            }
          });
        };
        
        extractGroups(columnDefs);
      }
      
      // Method 3: Try getColumnGroups (older versions)
      if (groups.length === 0 && typeof (this.gridApi as any).getColumnGroups === 'function') {
        const columnGroups = (this.gridApi as any).getColumnGroups();
        if (columnGroups && Array.isArray(columnGroups)) {
          columnGroups.forEach((group: any) => {
            if (group?.getGroupId) {
              groups.push({
                groupId: group.getGroupId(),
                open: group.isExpanded?.() || false
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn('[🔍][COLUMN_GROUP_STATE_EXTRACT] Could not extract column group state:', error);
    }
    
    console.log('[🔍][COLUMN_GROUP_STATE_EXTRACT] Final extracted column group state:', groups);
    return groups;
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
      enableCellChangeFlash: this.gridApi.getGridOption('enableCellChangeFlash'),
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
  
  private applyColumnGroupState(groupState: Array<{ groupId: string; open: boolean }>) {
    if (!this.gridApi) return;
    
    try {
      // Check if setColumnGroupOpened method exists
      if (typeof (this.gridApi as any).setColumnGroupOpened === 'function') {
        groupState.forEach(({ groupId, open }) => {
          try {
            (this.gridApi as any).setColumnGroupOpened(groupId, open);
          } catch (e) {
            console.warn(`[GridStateManager] Could not set column group state for ${groupId}:`, e);
          }
        });
      } else {
        // Method doesn't exist in this AG-Grid version
        console.debug('[GridStateManager] setColumnGroupOpened not available in this AG-Grid version');
      }
    } catch (error) {
      console.warn('[GridStateManager] Error applying column group state:', error);
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
    
    if (pagination.pageSize && this.gridApi.paginationSetPageSize) {
      this.gridApi.paginationSetPageSize(pagination.pageSize);
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
        this.gridApi!.setGridOption(key, value);
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