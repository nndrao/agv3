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
  isProfileLoadingRef: React.MutableRefObject<boolean>;
  checkProfileApplicationComplete: () => void;
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
  isProfileLoadingRef,
  checkProfileApplicationComplete
}: ColumnGroupManagementProps) {
  const { toast } = useToast();
  const columnGroupsAppliedRef = useRef(false);
  
  // Handle column groups apply
  const handleApplyColumnGroups = useCallback((groups: any[]) => {
    if (!gridApi) {
      console.error('[ColumnGroupManagement] GridAPI not available');
      toast({
        title: "Error",
        description: "Grid API not available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Pass the original column definitions to preserve all column properties
      const gridStateManager = {
        getPendingColumnState,
        clearPendingColumnState,
        getPendingColumnGroupState,
        clearPendingColumnGroupState
      };
      
      ColumnGroupService.applyColumnGroups(gridApi, columnApi, groups, columnDefs, gridStateManager);
      
      // Store unsaved column groups
      setUnsavedColumnGroups(groups);
      
      // Force a grid refresh to ensure the changes are visible
      setTimeout(() => {
        gridApi.refreshCells({ force: true });
        
        // Test expanding/collapsing groups to verify columnGroupShow behavior
        const setGroupOpened = columnApi?.setColumnGroupOpened || gridApi?.setColumnGroupOpened;
        
        if (setGroupOpened) {
          groups.forEach(group => {
            setGroupOpened.call(columnApi || gridApi, group.groupId, true);
          });
        }
      }, 100);
      
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
  
  // Apply column groups after grid is ready and we have both columnDefs and groups
  useEffect(() => {
    // Only apply column groups when grid is ready and we have column definitions
    if (gridApi && columnDefs.length > 0) {
      // First check if there are column groups stored in the GridStateManager
      const storedGroups = getColumnGroups();
      
      // Use stored groups first, then unsaved, then profile
      const groups = storedGroups?.length > 0 ? storedGroups : (unsavedColumnGroups || activeProfileData?.columnGroups);
      
      // Update the state manager with current column groups
      setColumnGroups(groups || []);
      
      if (groups && groups.length > 0) {
        // Create gridStateManager-like object with methods for column state and group state
        const gridStateManager = {
          getPendingColumnState,
          clearPendingColumnState,
          getPendingColumnGroupState,
          clearPendingColumnGroupState
        };
        
        // Pass null for columnApi if not available - the service will handle it
        ColumnGroupService.applyColumnGroups(gridApi, columnApi || null, groups, columnDefs, gridStateManager);
        
        // Verify application after a short delay
        setTimeout(() => {
          gridApi.getColumnDefs();
          
          // Mark column groups as applied
          if (isProfileLoadingRef.current) {
            columnGroupsAppliedRef.current = true;
            checkProfileApplicationComplete();
          }
        }, 100);
      } else {
        // If we were switching profiles but have no column groups, mark as applied
        if (isProfileLoadingRef.current) {
          columnGroupsAppliedRef.current = true;
          checkProfileApplicationComplete();
        }
      }
    } else {
      // If grid is not ready but we're in the middle of switching and grid state was already applied,
      // mark column groups as applied (since there are no column defs to apply groups to yet)
      if (isProfileLoadingRef.current && !gridApi) {
        columnGroupsAppliedRef.current = true;
        checkProfileApplicationComplete();
      }
    }
  }, [gridApi, columnApi, columnDefs, activeProfileData?.columnGroups, unsavedColumnGroups, 
      setColumnGroups, getColumnGroups, checkProfileApplicationComplete, isProfileLoadingRef,
      getPendingColumnState, clearPendingColumnState, getPendingColumnGroupState, clearPendingColumnGroupState]);
  
  return {
    handleApplyColumnGroups,
    columnGroupsAppliedRef
  };
}