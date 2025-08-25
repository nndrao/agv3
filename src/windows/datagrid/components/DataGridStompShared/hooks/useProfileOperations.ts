import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DataGridStompSharedProfile } from '../types';
import { ColumnGroupService } from '../columnGroups';

interface ProfileOperationsProps {
  profiles: any[];
  activeProfile: any;
  activeProfileData: DataGridStompSharedProfile | null;
  loadProfile: (versionId: string) => Promise<void>;
  saveProfile: (profile: DataGridStompSharedProfile, saveAsNew?: boolean, name?: string) => Promise<void>;
  deleteProfile: (versionId: string) => Promise<void>;
  setActiveProfile: (versionId: string) => Promise<void>;
  exportProfile: (versionId: string) => Promise<string>;
  importProfile: (data: string) => Promise<void>;
  extractGridState: () => any;
  extractFullGridState: () => any;
  setColumnGroups: (groupIds: string[]) => void; // Now handles group IDs
  checkProfileApplicationComplete: () => void;
  gridInstanceId: string; // Required for migration
  gridApiRef: React.MutableRefObject<any>; // Required for column group state saving
  isSavingProfileRef: React.MutableRefObject<boolean>; // Track saving state
}

interface ProfileLoadingState {
  isLoading: boolean;
  profileName: string;
}

export function useProfileOperations({
  profiles,
  activeProfile,
  activeProfileData,
  loadProfile,
  saveProfile,
  deleteProfile,
  setActiveProfile,
  exportProfile,
  importProfile,
  extractGridState,
  extractFullGridState,
  setColumnGroups,
  checkProfileApplicationComplete,
  gridInstanceId,
  gridApiRef,
  isSavingProfileRef
}: ProfileOperationsProps) {
  const { toast } = useToast();
  
  // Profile loading state
  const [profileLoadingState, setProfileLoadingState] = useState<ProfileLoadingState>({ 
    isLoading: false, 
    profileName: '' 
  });
  
  // Ref for tracking profile loading
  const isProfileLoadingRef = useRef(false);
  
  // Load profile with status indication
  const handleProfileLoad = useCallback(async (versionId: string) => {
    // Don't show indicator if selecting the already active profile
    if (activeProfile?.versionId === versionId) {
      return;
    }
    
    const profile = profiles.find(p => p.versionId === versionId);
    
    if (profile) {
      // Show "Loading profile..." immediately
      isProfileLoadingRef.current = true;
      setProfileLoadingState({ isLoading: true, profileName: profile.name });
      
      try {
        await loadProfile(versionId);
        // Profile is loaded, clear the loading state after a short delay
        // to allow the UI to update
        setTimeout(() => {
          isProfileLoadingRef.current = false;
          setProfileLoadingState({ isLoading: false, profileName: '' });
        }, 500);
      } catch (error) {
        console.error('[handleProfileLoad] Error loading profile:', error);
        isProfileLoadingRef.current = false;
        setProfileLoadingState({ isLoading: false, profileName: '' });
      }
    }
  }, [profiles, activeProfile, loadProfile]);
  
  // Save current state to profile
  const saveCurrentState = useCallback(async (
    selectedProviderId: string | null,
    connectionState: { isConnected: boolean },
    sidebarVisible: boolean,
    showColumnSettings: boolean,
    unsavedGridOptions: Record<string, any> | null,
    unsavedColumnGroups: any[] | null,
    getDefaultGridOptions: () => Record<string, any>,
    saveAsNew = false,
    name?: string
  ) => {
    console.log('[🔴 CF-SAVE-001] Starting saveCurrentState', {
      hasActiveProfileData: !!activeProfileData,
      existingConditionalRules: activeProfileData?.conditionalFormattingRules,
      existingConditionalRulesCount: activeProfileData?.conditionalFormattingRules?.length || 0
    });

    // Extract full grid state for comprehensive persistence
    const fullGridState = extractFullGridState();
    
    // Save current column group state before extracting grid state
    if (unsavedColumnGroups && unsavedColumnGroups.length > 0 && gridApiRef.current) {
      ColumnGroupService.saveColumnGroupState(gridInstanceId, gridApiRef.current, unsavedColumnGroups);
    }
    
    // Extract legacy grid state for backward compatibility
    const { columnState, filterModel, sortModel } = extractGridState();
    
    // Use unsaved grid options if available, otherwise use current profile options
    const gridOptionsToSave = unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
    
    // Handle column groups - migrate old format if needed
    let columnGroupsToSave: string[] = [];
    
    if (unsavedColumnGroups) {
      // Use unsaved column group IDs
      columnGroupsToSave = unsavedColumnGroups;
      console.log('[🔍 SAVE-PROFILE-001] Using unsaved column group IDs:', columnGroupsToSave);
    } else if (activeProfileData?.columnGroups) {
      // Check if we have old format (array of objects) or new format (array of strings)
      if (Array.isArray(activeProfileData.columnGroups) && activeProfileData.columnGroups.length > 0) {
        const firstItem = activeProfileData.columnGroups[0];
        if (typeof firstItem === 'string') {
          // New format - already group IDs
          columnGroupsToSave = activeProfileData.columnGroups as string[];
          console.log('[🔍 SAVE-PROFILE-002] Using existing column group IDs:', columnGroupsToSave);
        } else {
          // Old format - migrate to grid-level storage and get IDs
          console.log('[🔍 SAVE-PROFILE-003] Migrating old column group format to grid-level storage');
          columnGroupsToSave = ColumnGroupService.migrateProfileColumnGroups(
            gridInstanceId,
            activeProfileData.columnGroups as any[]
          );
          console.log('[🔍 SAVE-PROFILE-004] Migration complete, active group IDs:', columnGroupsToSave);
        }
      }
    }
    
    console.log('[🔍 SAVE-PROFILE-005] Final column groups to save:', {
      count: columnGroupsToSave.length,
      groupIds: columnGroupsToSave
    });
    
    // Preserve calculated columns from the current profile
    const calculatedColumnsToSave = activeProfileData?.calculatedColumns || [];
    console.log('[🔴 CF-SAVE-002] Preserving calculated columns:', {
      count: calculatedColumnsToSave.length,
      columnIds: calculatedColumnsToSave
    });
    
    // IMPORTANT: Preserve conditional formatting rules from the current profile
    const conditionalFormattingRulesToSave = activeProfileData?.conditionalFormattingRules || [];
    console.log('[🔴 CF-SAVE-003] Preserving conditional formatting rules:', {
      count: conditionalFormattingRulesToSave.length,
      ruleIds: conditionalFormattingRulesToSave
    });
    
    const currentState: DataGridStompSharedProfile = {
      name: name || activeProfileData?.name || 'Profile',
      autoLoad: true,
      selectedProviderId,
      autoConnect: connectionState.isConnected,
      sidebarVisible,
      theme: 'system',
      showColumnSettings,
      asyncTransactionWaitMillis: 50,
      rowBuffer: 10,
      // Legacy fields for backward compatibility
      columnState,
      filterModel,
      sortModel,
      // Full grid state for comprehensive persistence
      gridState: fullGridState || undefined,
      gridOptions: gridOptionsToSave,
      columnGroups: columnGroupsToSave,
      // Include calculated columns in the saved profile
      calculatedColumns: calculatedColumnsToSave,
      // CRITICAL: Include conditional formatting rules in the saved profile
      conditionalFormattingRules: conditionalFormattingRulesToSave
    };
    
    console.log('[🔴 CF-SAVE-004] Profile object prepared for saving:', {
      columnGroups: currentState.columnGroups?.length || 0,
      calculatedColumns: currentState.calculatedColumns?.length || 0,
      conditionalFormattingRules: currentState.conditionalFormattingRules?.length || 0,
      conditionalFormattingRuleIds: currentState.conditionalFormattingRules
    });
    
    try {
      // Set saving flag to prevent grid refresh during save
      isSavingProfileRef.current = true;
      
      await saveProfile(currentState, saveAsNew, name);
      console.log('[🔍 SAVE-PROFILE-003] saveProfile completed successfully');
      // Save completed successfully
      return true;
    } catch (error) {
      console.error('[🔍 SAVE-PROFILE-004] Error saving profile:', error);
      return false;
    } finally {
      // Clear saving flag after save completes
      setTimeout(() => {
        isSavingProfileRef.current = false;
      }, 100);
    }
  }, [activeProfileData, extractGridState, extractFullGridState, setColumnGroups, saveProfile]);
  
  // Export profile
  const handleProfileExport = useCallback(async () => {
    if (!activeProfile) return;
    
    try {
      const exportData = await exportProfile(activeProfile.versionId);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datagrid-profile-${activeProfile.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Profile Exported",
        description: `Profile "${activeProfile.name}" exported successfully`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export profile",
        variant: "destructive"
      });
    }
  }, [activeProfile, exportProfile, toast]);
  
  // Import profile
  const handleProfileImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      await importProfile(text);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import profile",
        variant: "destructive"
      });
    }
  }, [importProfile, toast]);
  
  // Rename profile
  const handleProfileRename = useCallback(async (versionId: string, newName: string) => {
    const profile = profiles.find(p => p.versionId === versionId);
    if (!profile) return;
    
    const updatedProfile = {
      ...(profile.config as DataGridStompSharedProfile),
      name: newName
    };
    
    await saveProfile(updatedProfile, false);
  }, [profiles, saveProfile]);
  
  // Set profile as default
  const handleSetDefault = useCallback(async (versionId: string) => {
    await setActiveProfile(versionId);
  }, [setActiveProfile]);
  
  // Remove the effect that was checking for gridStateAppliedRef and columnGroupsAppliedRef
  // since these refs are never actually set to true anywhere in the codebase
  
  return {
    profileLoadingState,
    isProfileLoadingRef,
    
    handleProfileLoad,
    saveCurrentState,
    handleProfileExport,
    handleProfileImport,
    handleProfileRename,
    handleSetDefault,
    handleDeleteProfile: deleteProfile
  };
}