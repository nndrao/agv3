import { ColDef, GridApi, ColumnApi } from 'ag-grid-community';
import { DataGridStompSharedProfile } from '../types';

/**
 * GridStateManager - Manages AG-Grid state extraction and application
 * Extracted from DataGridStompShared to reduce component complexity
 */
export class GridStateManager {
  private gridApi: GridApi | null = null;
  private columnApi: ColumnApi | null = null;
  
  constructor() {}
  
  /**
   * Set the grid APIs for state management
   */
  setApis(gridApi: GridApi | null, columnApi?: ColumnApi | null) {
    this.gridApi = gridApi;
    this.columnApi = columnApi;
  }
  
  /**
   * Extract current grid state (legacy format for backward compatibility)
   */
  extractLegacyState() {
    if (!this.gridApi) {
      return {
        columnState: [],
        filterModel: {},
        sortModel: []
      };
    }
    
    try {
      // Get column state - handles both old and new API versions
      const columnState = this.columnApi?.getColumnState?.() || 
                         this.gridApi.getColumnState?.() || 
                         [];
      
      // Get filter and sort models
      const filterModel = this.gridApi.getFilterModel() || {};
      const sortModel = this.gridApi.getSortModel?.() || [];
      
      return {
        columnState,
        filterModel,
        sortModel
      };
    } catch (error) {
      console.error('[GridStateManager] Error extracting legacy state:', error);
      return {
        columnState: [],
        filterModel: {},
        sortModel: []
      };
    }
  }
  
  /**
   * Extract comprehensive grid state for full persistence
   */
  extractFullState() {
    if (!this.gridApi) {
      return null;
    }
    
    try {
      const state: any = {};
      
      // Column state (visibility, width, position, etc.)
      if (this.columnApi?.getColumnState) {
        state.columnState = this.columnApi.getColumnState();
      } else if (this.gridApi.getColumnState) {
        state.columnState = this.gridApi.getColumnState();
      }
      
      // Column group state
      if (this.columnApi?.getColumnGroupState) {
        state.columnGroupState = this.columnApi.getColumnGroupState();
      } else if (this.gridApi.getColumnGroupState) {
        state.columnGroupState = this.gridApi.getColumnGroupState();
      }
      
      // Filter state
      state.filterState = this.gridApi.getFilterModel();
      
      // Sort state
      if (this.gridApi.getSortModel) {
        state.sortState = this.gridApi.getSortModel();
      }
      
      // Range selection state (if enterprise features available)
      if (this.gridApi.getCellRanges) {
        state.rangeSelection = this.gridApi.getCellRanges();
      }
      
      // Focused cell
      const focusedCell = this.gridApi.getFocusedCell();
      if (focusedCell) {
        state.focusedCell = {
          rowIndex: focusedCell.rowIndex,
          column: focusedCell.column.getColId()
        };
      }
      
      // Scroll position
      if (this.gridApi.getVerticalPixelRange) {
        const range = this.gridApi.getVerticalPixelRange();
        state.scrollPosition = {
          top: range.top,
          bottom: range.bottom
        };
      }
      
      return state;
    } catch (error) {
      console.error('[GridStateManager] Error extracting full state:', error);
      return null;
    }
  }
  
  /**
   * Apply saved grid state
   */
  applyState(profile: DataGridStompSharedProfile) {
    if (!this.gridApi) {
      console.warn('[GridStateManager] Cannot apply state - grid API not available');
      return false;
    }
    
    try {
      // Apply comprehensive state if available
      if (profile.gridState) {
        this.applyFullState(profile.gridState);
      } else {
        // Fall back to legacy state application
        this.applyLegacyState(profile);
      }
      
      return true;
    } catch (error) {
      console.error('[GridStateManager] Error applying state:', error);
      return false;
    }
  }
  
  /**
   * Apply legacy grid state (backward compatibility)
   */
  private applyLegacyState(profile: DataGridStompSharedProfile) {
    if (!this.gridApi) return;
    
    // Apply column state
    if (profile.columnState && profile.columnState.length > 0) {
      if (this.columnApi?.applyColumnState) {
        this.columnApi.applyColumnState({
          state: profile.columnState,
          applyOrder: true
        });
      } else if (this.gridApi.applyColumnState) {
        this.gridApi.applyColumnState({
          state: profile.columnState,
          applyOrder: true
        });
      }
    }
    
    // Apply filter model
    if (profile.filterModel) {
      this.gridApi.setFilterModel(profile.filterModel);
    }
    
    // Apply sort model
    if (profile.sortModel && this.gridApi.setSortModel) {
      this.gridApi.setSortModel(profile.sortModel);
    }
  }
  
  /**
   * Apply comprehensive grid state
   */
  private applyFullState(gridState: any) {
    if (!this.gridApi || !gridState) return;
    
    // Apply column state
    if (gridState.columnState) {
      if (this.columnApi?.applyColumnState) {
        this.columnApi.applyColumnState({
          state: gridState.columnState,
          applyOrder: true
        });
      } else if (this.gridApi.applyColumnState) {
        this.gridApi.applyColumnState({
          state: gridState.columnState,
          applyOrder: true
        });
      }
    }
    
    // Apply column group state
    if (gridState.columnGroupState) {
      if (this.columnApi?.setColumnGroupState) {
        this.columnApi.setColumnGroupState(gridState.columnGroupState);
      } else if (this.gridApi.setColumnGroupState) {
        this.gridApi.setColumnGroupState(gridState.columnGroupState);
      }
    }
    
    // Apply filter state
    if (gridState.filterState) {
      this.gridApi.setFilterModel(gridState.filterState);
    }
    
    // Apply sort state
    if (gridState.sortState && this.gridApi.setSortModel) {
      this.gridApi.setSortModel(gridState.sortState);
    }
    
    // Restore focused cell
    if (gridState.focusedCell && this.gridApi.setFocusedCell) {
      this.gridApi.setFocusedCell(
        gridState.focusedCell.rowIndex,
        gridState.focusedCell.column
      );
    }
    
    // Restore scroll position
    if (gridState.scrollPosition && this.gridApi.ensureIndexVisible) {
      // Estimate row index from pixel position
      const rowHeight = 25; // Default row height
      const estimatedIndex = Math.floor(gridState.scrollPosition.top / rowHeight);
      this.gridApi.ensureIndexVisible(estimatedIndex);
    }
  }
  
  /**
   * Apply grid options
   */
  applyGridOptions(options: Record<string, any>) {
    if (!this.gridApi) {
      console.warn('[GridStateManager] Cannot apply options - grid API not available');
      return false;
    }
    
    try {
      // Apply each option individually for better control
      Object.entries(options).forEach(([key, value]) => {
        if (key !== 'font' && this.gridApi!.setGridOption) {
          this.gridApi!.setGridOption(key, value);
        }
      });
      
      // Refresh the grid to apply changes
      this.gridApi.refreshCells({ force: true });
      
      return true;
    } catch (error) {
      console.error('[GridStateManager] Error applying grid options:', error);
      return false;
    }
  }
  
  /**
   * Get current column definitions
   */
  getColumnDefs(): ColDef[] {
    if (!this.gridApi) return [];
    
    try {
      return this.gridApi.getColumnDefs() || [];
    } catch (error) {
      console.error('[GridStateManager] Error getting column defs:', error);
      return [];
    }
  }
  
  /**
   * Set column definitions
   */
  setColumnDefs(columnDefs: ColDef[]) {
    if (!this.gridApi) {
      console.warn('[GridStateManager] Cannot set column defs - grid API not available');
      return false;
    }
    
    try {
      this.gridApi.setColumnDefs(columnDefs);
      return true;
    } catch (error) {
      console.error('[GridStateManager] Error setting column defs:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gridStateManager = new GridStateManager();