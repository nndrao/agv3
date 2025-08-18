import { useEffect } from 'react';
import { GridConfigurationBus } from '@/services/iab/GridConfigurationBus';
import { getDefaultGridOptions } from '../gridOptions/gridOptionsConfig';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { DataGridStompSharedProfile } from '../types';

interface IABManagementProps {
  viewInstanceId: string;
  unsavedGridOptions: Record<string, any> | null;
  activeProfileData: DataGridStompSharedProfile | null;
  columnDefs: any[];
  conditionalFormattingRules: ConditionalRule[];
}

export function useIABManagement({
  viewInstanceId,
  unsavedGridOptions,
  activeProfileData,
  columnDefs,
  conditionalFormattingRules
}: IABManagementProps) {
  
  // Initialize IAB configuration bus
  useEffect(() => {
    let isCleanedUp = false;
    
    const initIAB = async () => {
      if (isCleanedUp) return;
      
      try {
        const bus = GridConfigurationBus.getInstance();
        await bus.initializeAsProvider(viewInstanceId);
        
        // Register initial configuration only if we didn't clean up
        if (!isCleanedUp) {
          bus.registerGridConfiguration(viewInstanceId, {
            gridOptions: unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions(),
            columnDefs: columnDefs || [],
            profile: activeProfileData,
            conditionalFormatting: conditionalFormattingRules
          });
        }
        
        // Listen for conditional formatting updates (defined but not used yet - future feature)
        // Note: In a real implementation, we'd set up a listener for config changes
        // For now, the conditional formatting app will close after applying rules
      } catch (error) {
        // Log warning but don't throw - the grid should still work without IAB
        console.warn('[IABManagement] IAB initialization skipped:', error);
      }
    };
    
    initIAB();
    
    return () => {
      isCleanedUp = true;
      // Only destroy on unmount, not on every effect re-run
      GridConfigurationBus.getInstance().destroy().catch(err => 
        console.warn('[IABManagement] Error cleaning up IAB:', err)
      );
    };
  }, [viewInstanceId]); // Only depend on viewInstanceId for initialization
  
  // Update IAB configuration when relevant state changes
  useEffect(() => {
    const bus = GridConfigurationBus.getInstance();
    bus.updateGridConfiguration(viewInstanceId, {
      gridOptions: unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions(),
      columnDefs: columnDefs || [],
      profile: activeProfileData,
      conditionalFormatting: conditionalFormattingRules
    });
  }, [viewInstanceId, unsavedGridOptions, activeProfileData?.gridOptions, columnDefs, activeProfileData, conditionalFormattingRules]);
}