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
  
  // Refs for tracking profile application
  const isProfileLoadingRef = useRef(false);
  const gridStateAppliedRef = useRef(false);
  const columnGroupsAppliedRef = useRef(false);
  
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
      gridStateAppliedRef.current = false;
      columnGroupsAppliedRef.current = false;
      
      try {
        await loadProfile(versionId);
        // Profile is loaded but not yet applied to grid
        // The actual application will happen via callbacks and column group effects
      } catch (error) {
        console.error('[handleProfileLoad] Error loading profile:', error);
        isProfileLoadingRef.current = false;
        setProfileLoadingState({ isLoading: false, profileName: '' });
        gridStateAppliedRef.current = false;
        columnGroupsAppliedRef.current = false;
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
    const columnGroupsToSave = unsavedColumnGroups || activeProfileData?.columnGroups || [];
    setColumnGroups(columnGroupsToSave);
    
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
      columnGroups: columnGroupsToSave
    };
    
    try {
      await saveProfile(currentState, saveAsNew, name);
      // Save completed successfully
      return true;
    } catch (error) {
      console.error('[saveCurrentState] Error saving profile:', error);
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
  
  // Update profile loading state when it completes
  useEffect(() => {
    const checkComplete = () => {
      if (isProfileLoadingRef.current && 
          gridStateAppliedRef.current && 
          columnGroupsAppliedRef.current) {
        isProfileLoadingRef.current = false;
        gridStateAppliedRef.current = false;
        columnGroupsAppliedRef.current = false;
        setProfileLoadingState({ isLoading: false, profileName: '' });
      }
    };
    
    checkComplete();
  }, []);
  
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