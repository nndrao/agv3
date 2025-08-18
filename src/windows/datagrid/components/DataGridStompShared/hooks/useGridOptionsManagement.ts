import { useState, useCallback, useEffect, useMemo } from 'react';
import { GridApi } from 'ag-grid-community';
import { useToast } from '@/hooks/use-toast';
import { INITIAL_GRID_OPTIONS } from '../config/constants';
import { getDefaultGridOptions } from '../gridOptions/gridOptionsConfig';
import { createThemeWithFont } from '../config/gridConfig';
import { DataGridStompSharedProfile } from '../types';

interface GridOptionsManagementProps {
  gridApi: GridApi | null;
  activeProfileData: DataGridStompSharedProfile | null;
}

export function useGridOptionsManagement({
  gridApi,
  activeProfileData
}: GridOptionsManagementProps) {
  const { toast } = useToast();
  const [unsavedGridOptions, setUnsavedGridOptions] = useState<Record<string, any> | null>(null);
  
  // Handle grid options apply
  const handleApplyGridOptions = useCallback((newOptions: Record<string, any>) => {
    // Performance optimization: batch update grid options
    if (gridApi) {
      // First, identify which options have actually changed
      const currentOptions = unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
      const changedOptions: Record<string, any> = {};
      let hasChanges = false;
      
      Object.entries(newOptions).forEach(([key, value]) => {
        if (key !== 'font' && currentOptions[key] !== value) {
          changedOptions[key] = value;
          hasChanges = true;
        }
      });
      
      // Only update if there are actual changes
      if (hasChanges) {
        // Batch apply all changed options
        // Use requestAnimationFrame to batch DOM updates
        requestAnimationFrame(() => {
          // Apply all changed options
          Object.entries(changedOptions).forEach(([key, value]) => {
            // Skip initial-only properties that cannot be changed after initialization
            if (!INITIAL_GRID_OPTIONS.includes(key)) {
              gridApi.setGridOption(key as any, value);
            }
          });
          
          // Only refresh if visual options changed
          const visualOptions = ['rowHeight', 'headerHeight', 'animateRows', 'enableCellChangeFlash', 
                                'floatingFiltersHeight', 'groupHeaderHeight', 'pivotHeaderHeight'];
          const needsRefresh = Object.keys(changedOptions).some(key => visualOptions.includes(key));
          
          if (needsRefresh) {
            gridApi.refreshCells({ force: true });
          }
        });
      }
    }
    
    // Store the new options in memory only
    setUnsavedGridOptions(newOptions);
    
    toast({
      title: "Grid Options Applied",
      description: "Grid options applied to grid (not saved to profile)"
    });
  }, [gridApi, toast, unsavedGridOptions, activeProfileData?.gridOptions]);
  
  // Apply grid options when profile changes
  useEffect(() => {
    if (gridApi) {
      // First, reset to default options to prevent leaking from previous profile
      const defaultOptions = getDefaultGridOptions();
      
      // Always ensure cell flashing is enabled by default
      defaultOptions.enableCellChangeFlash = true;
      defaultOptions.cellFlashDuration = 500;
      defaultOptions.cellFadeDuration = 1000;
      
      Object.entries(defaultOptions).forEach(([key, value]) => {
        // Skip font and initial-only properties that cannot be changed after initialization
        if (key !== 'font' && !INITIAL_GRID_OPTIONS.includes(key)) {
          gridApi.setGridOption(key as any, value);
        }
      });
      
      // Then apply profile-specific options if they exist
      if (activeProfileData?.gridOptions) {
        Object.entries(activeProfileData.gridOptions).forEach(([key, value]) => {
          // Skip font and initial-only properties that cannot be changed after initialization
          if (key !== 'font' && !INITIAL_GRID_OPTIONS.includes(key)) {
            gridApi.setGridOption(key as any, value);
          }
        });
      }
      
      gridApi.refreshCells({ force: true });
    }
  }, [activeProfileData?.gridOptions, gridApi]);
  
  // Get current grid options (with unsaved changes if any)
  const getCurrentGridOptions = useCallback(() => {
    return unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
  }, [unsavedGridOptions, activeProfileData?.gridOptions]);
  
  // Clear unsaved options (used when profile is loaded or saved)
  const clearUnsavedOptions = useCallback(() => {
    setUnsavedGridOptions(null);
  }, []);
  
  // Create theme with dynamic font - use unsaved options if available
  const gridTheme = useMemo(() => {
    const fontFamily = unsavedGridOptions?.font || activeProfileData?.gridOptions?.font;
    return createThemeWithFont(fontFamily);
  }, [unsavedGridOptions?.font, activeProfileData?.gridOptions?.font]);
  
  return {
    unsavedGridOptions,
    setUnsavedGridOptions,
    handleApplyGridOptions,
    getCurrentGridOptions,
    clearUnsavedOptions,
    gridTheme
  };
}