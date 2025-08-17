import { useEffect, useCallback, useRef } from 'react';
import { GridApi } from 'ag-grid-community';
import { ColumnGroupService, GridColumnGroupStorage } from '../columnGroups';
import { useToast } from '@/hooks/use-toast';

interface ColumnGroupManagementProps {
  gridApi: GridApi | null;
  columnApi: any;
  columnDefs: any[];
  activeProfileData: { columnGroups?: string[] } | null; // Now stores group IDs
  unsavedColumnGroups: string[] | null; // Now stores group IDs
  setUnsavedColumnGroups: (groupIds: string[] | null) => void;
  getColumnGroups: () => string[]; // Returns active group IDs
  setColumnGroups: (groupIds: string[]) => void; // Sets active group IDs
  getPendingColumnState: () => any;
  clearPendingColumnState: () => void;
  isProfileLoadingRef: React.MutableRefObject<boolean>;
  checkProfileApplicationComplete: () => void;
  setColumnGroupsApplied?: (applied: boolean) => void;
  isSavingProfileRef?: React.MutableRefObject<boolean>;
  gridInstanceId: string; // Required for grid-level storage
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
  isProfileLoadingRef,
  checkProfileApplicationComplete,
  setColumnGroupsApplied,
  isSavingProfileRef,
  gridInstanceId
}: ColumnGroupManagementProps) {
  const { toast } = useToast();
  
  // Handle column groups apply - store as unsaved and apply to current view only
  const handleApplyColumnGroups = useCallback((activeGroupIds: string[], allGroups: any[]) => {
    console.log('[🔍 COLGROUP-APPLY-001] handleApplyColumnGroups called with:', {
      activeGroupIds,
      allGroupsCount: allGroups.length
    });
    
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
      // Save all groups to grid-level storage
      console.log('[🔍 COLGROUP-APPLY-003] Saving groups to grid-level storage');
      allGroups.forEach(group => {
        GridColumnGroupStorage.saveColumnGroup(gridInstanceId, group);
      });
      
      // Store unsaved active group IDs
      console.log('[🔍 COLGROUP-APPLY-004] Setting unsaved active group IDs');
      setUnsavedColumnGroups(activeGroupIds);
      
      // Apply column groups immediately to the current view (without saving to profile)
      // Get fresh copy of base columns to avoid mutations
      const baseColumns = JSON.parse(JSON.stringify(columnDefs));
      
      if (activeGroupIds.length > 0) {
        console.log('[🔍 COLGROUP-APPLY-005] Building and applying column groups to current view');
        
        // Build column definitions with groups using grid-level storage
        const newColumnDefs = ColumnGroupService.buildColumnDefsWithGroups(
          baseColumns,
          activeGroupIds,
          gridInstanceId,
          gridApi
        );
        
        // Apply to grid
        gridApi.setGridOption('columnDefs', newColumnDefs);
        
        // AG-Grid will handle column group expand/collapse and visibility natively
        // The columnGroupShow property will be respected automatically
      } else {
        console.log('[🔍 COLGROUP-APPLY-006] No active groups, resetting to base columns');
        gridApi.setGridOption('columnDefs', baseColumns);
      }
      
      // Force a grid refresh to ensure the changes are visible
      gridApi.refreshCells({ force: true });
      
      // Schedule column group state restoration after a short delay
      setTimeout(() => {
        ColumnGroupService.loadAndApplyColumnGroupState(
          gridInstanceId,
          gridApi,
          activeGroupIds
        );
      }, 200);
      
      toast({
        title: "Column Groups Applied",
        description: `${activeGroupIds.length} column group(s) have been applied`
      });
    } catch (error) {
      console.error('[ColumnGroupManagement] Error applying column groups:', error);
      toast({
        title: "Error",
        description: "Failed to apply column groups",
        variant: "destructive"
      });
    }
  }, [gridApi, columnApi, columnDefs, toast, getPendingColumnState, clearPendingColumnState, setUnsavedColumnGroups, gridInstanceId]);
  
  // Column group application is now handled by useProfileApplication hook
  // This effect has been removed to prevent duplicate application and timing issues
  
  return {
    handleApplyColumnGroups
  };
}