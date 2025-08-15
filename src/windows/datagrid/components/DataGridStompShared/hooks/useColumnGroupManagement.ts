import { useEffect, useCallback, useRef } from 'react';
import { GridApi } from 'ag-grid-community';
import { ColumnGroupService } from '../columnGroups/columnGroupService';
import { useToast } from '@/hooks/use-toast';

interface ColumnGroupManagementProps {
  gridApi: GridApi | null;
  columnApi: any;
  columnDefs: any[];
  activeProfileData: { columnGroups?: any[] } | null;
  unsavedColumnGroups: any[] | null;
  setUnsavedColumnGroups: (groups: any[] | null) => void;
  getColumnGroups: () => any[];
  setColumnGroups: (groups: any[]) => void;
  getPendingColumnState: () => any;
  clearPendingColumnState: () => void;
  getPendingColumnGroupState: () => any;
  clearPendingColumnGroupState: () => void;
  applyPendingColumnGroupState: (delay?: number) => void;
  isProfileLoadingRef: React.MutableRefObject<boolean>;
  checkProfileApplicationComplete: () => void;
  setColumnGroupsApplied?: (applied: boolean) => void;
  isSavingProfileRef?: React.MutableRefObject<boolean>;
}

export function useColumnGroupManagement({
  gridApi,
  columnApi,
  columnDefs,
  activeProfileData,
  unsavedColumnGroups,
  setUnsavedColumnGroups,
  getColumnGroups,
  setColumnGroups,
  getPendingColumnState,
  clearPendingColumnState,
  getPendingColumnGroupState,
  clearPendingColumnGroupState,
  applyPendingColumnGroupState,
  isProfileLoadingRef,
  checkProfileApplicationComplete,
  setColumnGroupsApplied,
  isSavingProfileRef
}: ColumnGroupManagementProps) {
  const { toast } = useToast();
  
  // Handle column groups apply - store as unsaved and apply to current view only
  const handleApplyColumnGroups = useCallback((groups: any[]) => {
    console.log('[🔍 COLGROUP-APPLY-001] handleApplyColumnGroups called with:', JSON.stringify(groups, null, 2));
    
    if (!gridApi) {
      console.error('[🔍 COLGROUP-APPLY-002] GridAPI not available');
      toast({
        title: "Error",
        description: "Grid API not available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Store unsaved column groups
      console.log('[🔍 COLGROUP-APPLY-003] Setting unsaved column groups');
      setUnsavedColumnGroups(groups);
      
      // Apply column groups immediately to the current view (without saving to profile)
      // Get fresh copy of base columns to avoid mutations
      const baseColumns = JSON.parse(JSON.stringify(columnDefs));
      
      // Filter to only active groups
      const activeGroups = groups.filter(g => g.isActive !== false);
      
      if (activeGroups.length > 0) {
        console.log('[🔍 COLGROUP-APPLY-004] Building and applying column groups to current view');
        
        // Build column definitions with groups
        const newColumnDefs = ColumnGroupService.buildColumnDefsWithGroups(
          baseColumns,
          activeGroups,
          gridApi
        );
        
        // Apply to grid
        gridApi.setGridOption('columnDefs', newColumnDefs);
        
        // AG-Grid will handle column group expand/collapse and visibility natively
        // The columnGroupShow property will be respected automatically
      } else {
        console.log('[🔍 COLGROUP-APPLY-005] No active groups, resetting to base columns');
        gridApi.setGridOption('columnDefs', baseColumns);
      }
      
      // Force a grid refresh to ensure the changes are visible
      gridApi.refreshCells({ force: true });
      
      toast({
        title: "Column Groups Applied",
        description: `${groups.length} column group(s) have been applied`
      });
    } catch (error) {
      console.error('[ColumnGroupManagement] Error applying column groups:', error);
      toast({
        title: "Error",
        description: "Failed to apply column groups",
        variant: "destructive"
      });
    }
  }, [gridApi, columnApi, columnDefs, toast, getPendingColumnState, clearPendingColumnState, 
      getPendingColumnGroupState, clearPendingColumnGroupState, setUnsavedColumnGroups]);
  
  // Column group application is now handled by useProfileApplication hook
  // This effect has been removed to prevent duplicate application and timing issues
  
  return {
    handleApplyColumnGroups
  };
}