import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DataGridStompSharedProfile } from '../types';

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
  setColumnGroups: (groups: any[]) => void;
  checkProfileApplicationComplete: () => void;
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
  checkProfileApplicationComplete
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
    // Extract full grid state for comprehensive persistence
    const fullGridState = extractFullGridState();
    
    // Extract legacy grid state for backward compatibility
    const { columnState, filterModel, sortModel } = extractGridState();
    
    // Use unsaved grid options if available, otherwise use current profile options
    const gridOptionsToSave = unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
    
    // Use unsaved column groups if available, otherwise use current profile column groups
    // IMPORTANT: Preserve the isActive property when saving
    const columnGroupsToSave = unsavedColumnGroups || activeProfileData?.columnGroups || [];
    console.log('[🔍 SAVE-PROFILE-001] Column groups to save:', {
      source: unsavedColumnGroups ? 'unsaved' : activeProfileData?.columnGroups ? 'profile' : 'empty',
      count: columnGroupsToSave.length,
      groups: JSON.stringify(columnGroupsToSave, null, 2)
    });
    
    // Don't call setColumnGroups here as it may strip the isActive property
    // The column groups will be stored directly in the profile
    
    // Preserve calculated columns from the current profile
    const calculatedColumnsToSave = activeProfileData?.calculatedColumns || [];
    
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
      calculatedColumns: calculatedColumnsToSave
    };
    
    console.log('[🔍 SAVE-PROFILE-002] Calling saveProfile with currentState:', {
      columnGroups: currentState.columnGroups,
      calculatedColumns: currentState.calculatedColumns?.length || 0
    });
    
    try {
      await saveProfile(currentState, saveAsNew, name);
      console.log('[🔍 SAVE-PROFILE-003] saveProfile completed successfully');
      // Save completed successfully
      return true;
    } catch (error) {
      console.error('[🔍 SAVE-PROFILE-004] Error saving profile:', error);
      return false;
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