import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StorageClient } from '@/services/storage/storageClient';
import { UnifiedConfig, ConfigVersion, ComponentType } from '@/services/storage/types';
import { useToast } from '@/hooks/use-toast';

// Base profile interface that all component profiles must extend
export interface BaseProfile {
  // Identity
  name: string;
  description?: string;
  
  // Behavior
  autoLoad: boolean;
  isDefault?: boolean;
  
  // Metadata
  tags?: string[];
  category?: string;
}

// Hook options
export interface UseProfileManagementOptions<T extends BaseProfile> {
  viewInstanceId: string;
  componentType: string;
  componentSubType?: string;
  defaultProfile: T;
  autoSaveInterval?: number; // Auto-save every N seconds
  onProfileChange?: (profile: T) => void;
  debug?: boolean;
}

// Hook result
export interface UseProfileManagementResult<T extends BaseProfile> {
  // Profile data
  profiles: ConfigVersion[];
  activeProfile: ConfigVersion | null;
  activeProfileData: T | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  
  // Operations
  saveProfile: (data: T, saveAsNew?: boolean, name?: string) => Promise<void>;
  loadProfile: (versionId: string) => Promise<void>;
  deleteProfile: (versionId: string) => Promise<void>;
  createProfile: (name: string, data: T) => Promise<void>;
  setActiveProfile: (versionId: string) => Promise<void>;
  updateProfilePartial: (updates: Partial<T>) => Promise<void>;
  
  // Utilities
  exportProfile: (versionId: string) => Promise<string>;
  importProfile: (jsonData: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export function useProfileManagement<T extends BaseProfile>({
  viewInstanceId,
  componentType,
  componentSubType,
  defaultProfile,
  autoSaveInterval,
  onProfileChange,
  debug = false
}: UseProfileManagementOptions<T>): UseProfileManagementResult<T> {
  const { toast } = useToast();
  const [config, setConfig] = useState<UnifiedConfig | null>(null);
  const [profiles, setProfiles] = useState<ConfigVersion[]>([]);
  const [activeProfile, setActiveProfile] = useState<ConfigVersion | null>(null);
  const [activeProfileData, setActiveProfileData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debug logging helper
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[useProfileManagement]', ...args);
    }
  }, [debug]);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, [viewInstanceId]);
  
  // Debug log profiles
  useEffect(() => {
    log('Profiles updated:', profiles.length, 'profiles');
    log('Active profile:', activeProfile?.name);
  }, [profiles, activeProfile, log]);

  // Apply profile when active profile changes
  useEffect(() => {
    console.log('[🔍][APP_STARTUP_EFFECT] Active profile changed');
    console.log('[🔍][APP_STARTUP_EFFECT] - activeProfile:', activeProfile?.name);
    console.log('[🔍][APP_STARTUP_EFFECT] - activeProfile.config:', activeProfile?.config);
    if (activeProfile && onProfileChange) {
      const profileData = activeProfile.config as T;
      console.log('[🔍][APP_STARTUP_EFFECT] Calling onProfileChange with:', profileData);
      setActiveProfileData(profileData);
      onProfileChange(profileData);
    } else {
      console.log('[🔍][APP_STARTUP_EFFECT] Skipping - missing activeProfile or onProfileChange');
    }
  }, [activeProfile, onProfileChange]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveInterval && activeProfileData) {
      autoSaveTimerRef.current = setInterval(() => {
        saveProfile(activeProfileData, false);
      }, autoSaveInterval * 1000);

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [autoSaveInterval, activeProfileData]);

  const loadConfiguration = async () => {
    console.log('[🔍][APP_STARTUP] Loading configuration for view:', viewInstanceId);
    log('Loading configuration for view:', viewInstanceId);
    setIsLoading(true);
    setError(null);

    try {
      // Try to load existing configuration
      console.log('[🔍][APP_STARTUP] Attempting to load config for ID:', viewInstanceId);
      log('Attempting to load config for ID:', viewInstanceId);
      const existingConfig = await StorageClient.get(viewInstanceId);
      console.log('[🔍][APP_STARTUP] Loaded config from storage:', existingConfig);
      log('Loaded config from storage:', existingConfig);
      
      if (existingConfig) {
        console.log('[🔍][APP_STARTUP] Found existing configuration');
        log('Found existing configuration:', existingConfig);
        setConfig(existingConfig);
        const loadedProfiles = existingConfig.settings || [];
        setProfiles(loadedProfiles);
        console.log('[🔍][APP_STARTUP] Loaded profiles count:', loadedProfiles.length);
        log('Loaded profiles:', loadedProfiles.length);
        
        // Find and set active profile
        if (existingConfig.activeSetting && loadedProfiles.length > 0) {
          const active = loadedProfiles.find(
            s => s.versionId === existingConfig.activeSetting
          );
          if (active) {
            console.log('[🔍][APP_STARTUP] Setting active profile:', active.name);
            console.log('[🔍][APP_STARTUP] Active profile config:', active.config);
            setActiveProfile(active);
            setActiveProfileData(active.config as T);
            log('Set active profile:', active.name);
          } else {
            // Fallback to first profile if active not found
            console.log('[🔍][APP_STARTUP] Active profile not found, using first profile');
            setActiveProfile(loadedProfiles[0]);
            setActiveProfileData(loadedProfiles[0].config as T);
            log('Active profile not found, using first profile');
          }
        } else if (loadedProfiles.length > 0) {
          // No active setting, use first profile
          console.log('[🔍][APP_STARTUP] No active setting, using first profile');
          setActiveProfile(loadedProfiles[0]);
          setActiveProfileData(loadedProfiles[0].config as T);
          log('No active setting, using first profile');
        }
      } else {
        log('No existing configuration found, creating default');
        // Create default configuration
        const defaultVersion: ConfigVersion = {
          versionId: uuidv4(),
          versionNumber: 1,
          name: defaultProfile.name,
          config: defaultProfile,
          createdTime: new Date(),
          createdBy: 'system',
          isActive: true
        };

        const newConfig: UnifiedConfig = {
          configId: viewInstanceId,
          componentType: componentType as ComponentType,
          componentSubType: componentSubType || 'default',
          name: `${componentType} Configuration`,
          appId: 'agv3',
          config: {},
          settings: [defaultVersion],
          activeSetting: defaultVersion.versionId,
          createdBy: 'system',
          userId: 'default',
          lastUpdatedBy: 'system',
          creationTime: new Date(),
          lastUpdated: new Date()
        };

        await StorageClient.save(newConfig);
        setConfig(newConfig);
        setProfiles([defaultVersion]);
        setActiveProfile(defaultVersion);
        setActiveProfileData(defaultProfile);
      }
    } catch (err) {
      log('Error loading configuration:', err);
      setError(err as Error);
      
      // Still create default profile on error
      const defaultVersion: ConfigVersion = {
        versionId: uuidv4(),
        versionNumber: 1,
        name: defaultProfile.name,
        config: defaultProfile,
        createdTime: new Date(),
        createdBy: 'system',
        isActive: true
      };

      setConfig({
        configId: viewInstanceId,
        componentType: componentType as ComponentType,
        componentSubType: componentSubType || 'default',
        name: `${componentType} Configuration`,
        appId: 'agv3',
        config: {},
        settings: [defaultVersion],
        activeSetting: defaultVersion.versionId,
        createdBy: 'system',
        userId: 'default',
        lastUpdatedBy: 'system',
        creationTime: new Date(),
        lastUpdated: new Date()
      });
      setProfiles([defaultVersion]);
      setActiveProfile(defaultVersion);
      setActiveProfileData(defaultProfile);
      
      log('Created default profile due to error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (data: T, saveAsNew = false, name?: string): Promise<void> => {
    if (!config) return;
    
    log('Saving profile:', { data, saveAsNew, name });
    setIsSaving(true);

    try {
      let updatedConfig: UnifiedConfig;

      if (saveAsNew || !activeProfile) {
        // Create new profile version
        const newVersion: ConfigVersion = {
          versionId: uuidv4(),
          versionNumber: (profiles.length || 0) + 1,
          name: name || `Profile ${(profiles.length || 0) + 1}`,
          config: data,
          createdTime: new Date(),
          createdBy: 'user',
          isActive: true
        };

        // Deactivate other profiles
        const updatedSettings = profiles.map(p => ({ ...p, isActive: false }));
        updatedSettings.push(newVersion);

        updatedConfig = {
          ...config,
          settings: updatedSettings,
          activeSetting: newVersion.versionId,
          lastUpdated: new Date(),
          lastUpdatedBy: 'user'
        };

        setActiveProfile(newVersion);
        setActiveProfileData(data);
        
        // For new profiles, we need to save the full config
        await StorageClient.save(updatedConfig);
      } else {
        // Update existing profile - use partial update for better performance
        const updatedSettings = profiles.map(p => 
          p.versionId === activeProfile.versionId
            ? {
                ...p,
                config: data,
                lastUpdated: new Date(),
                lastUpdatedBy: 'user'
              }
            : p
        );

        // Use update method for partial updates instead of full save
        await StorageClient.update(config.configId, {
          settings: updatedSettings,
          lastUpdated: new Date(),
          lastUpdatedBy: 'user'
        });
        
        // Update local state to reflect changes
        updatedConfig = {
          ...config,
          settings: updatedSettings,
          lastUpdated: new Date(),
          lastUpdatedBy: 'user'
        };
      }
      
      // Batch state updates to reduce re-renders
      const updatedProfiles = updatedConfig.settings || [];
      
      if (saveAsNew) {
        // For new profiles, find the new profile
        const newProfile = updatedProfiles.find(s => s.versionId === updatedConfig.activeSetting);
        if (newProfile) {
          // Update all state in one go
          setConfig(updatedConfig);
          setProfiles(updatedProfiles);
          setActiveProfile(newProfile);
          setActiveProfileData(data);
          log('New profile created and set as active:', newProfile.name);
        }
      } else {
        // For updates, just update the necessary state
        setConfig(updatedConfig);
        setProfiles(updatedProfiles);
        setActiveProfileData(data);
      }
      
      // Log the updated state
      log('Profile saved. Total profiles:', updatedProfiles.length);
      log('Active profile:', updatedConfig.activeSetting);

      if (!autoSaveInterval) {
        toast({
          title: "Profile Saved",
          description: saveAsNew ? "New profile created successfully" : "Profile updated successfully"
        });
      }
    } catch (err) {
      log('Error saving profile:', err);
      setError(err as Error);
      toast({
        title: "Save Failed",
        description: "Failed to save profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadProfile = async (versionId: string): Promise<void> => {
    const profile = profiles.find(p => p.versionId === versionId);
    if (!profile || !config) return;

    log('Loading profile:', versionId);

    try {
      // Update active setting
      const updatedConfig = {
        ...config,
        activeSetting: versionId,
        lastUpdated: new Date(),
        modifiedBy: 'user'
      };

      await StorageClient.save(updatedConfig);
      setConfig(updatedConfig);
      setActiveProfile(profile);
      setActiveProfileData(profile.config as T);

      toast({
        title: "Profile Loaded",
        description: `Switched to profile: ${profile.name}`
      });
    } catch (err) {
      log('Error loading profile:', err);
      setError(err as Error);
      toast({
        title: "Load Failed",
        description: "Failed to load profile",
        variant: "destructive"
      });
    }
  };

  const deleteProfile = async (versionId: string): Promise<void> => {
    if (!config || profiles.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "Must have at least one profile",
        variant: "destructive"
      });
      return;
    }

    log('Deleting profile:', versionId);

    try {
      const updatedSettings = profiles.filter(p => p.versionId !== versionId);
      let newActiveId = config.activeSetting;

      // If deleting active profile, switch to first available
      if (config.activeSetting === versionId) {
        newActiveId = updatedSettings[0]?.versionId;
        setActiveProfile(updatedSettings[0]);
        setActiveProfileData(updatedSettings[0]?.config as T);
      }

      const updatedConfig = {
        ...config,
        settings: updatedSettings,
        activeSetting: newActiveId,
        lastUpdated: new Date(),
        modifiedBy: 'user'
      };

      await StorageClient.save(updatedConfig);
      setConfig(updatedConfig);
      setProfiles(updatedSettings);

      toast({
        title: "Profile Deleted",
        description: "Profile removed successfully"
      });
    } catch (err) {
      log('Error deleting profile:', err);
      setError(err as Error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete profile",
        variant: "destructive"
      });
    }
  };

  const createProfile = async (name: string, data: T): Promise<void> => {
    await saveProfile(data, true, name);
  };

  const setActiveProfileHandler = async (versionId: string): Promise<void> => {
    await loadProfile(versionId);
  };

  const exportProfile = async (versionId: string): Promise<string> => {
    const profile = profiles.find(p => p.versionId === versionId);
    if (!profile) throw new Error('Profile not found');

    const exportData = {
      componentType,
      componentSubType,
      profile: {
        name: profile.name,
        config: profile.config,
        exportedAt: new Date().toISOString()
      }
    };

    return JSON.stringify(exportData, null, 2);
  };

  const importProfile = async (jsonData: string): Promise<void> => {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.componentType !== componentType) {
        throw new Error('Profile type mismatch');
      }

      await createProfile(
        `${importData.profile.name} (Imported)`,
        importData.profile.config as T
      );

      toast({
        title: "Profile Imported",
        description: "Profile imported successfully"
      });
    } catch (err) {
      log('Error importing profile:', err);
      toast({
        title: "Import Failed",
        description: "Failed to import profile",
        variant: "destructive"
      });
      throw err;
    }
  };

  const resetToDefault = async (): Promise<void> => {
    await saveProfile(defaultProfile, true, 'Default (Reset)');
  };
  
  // New method for partial updates - much faster for small changes
  const updateProfilePartial = async (updates: Partial<T>): Promise<void> => {
    if (!config || !activeProfile || !activeProfileData) return;
    
    log('Updating profile partially:', updates);
    
    try {
      // Merge updates with current profile data
      const updatedData = {
        ...activeProfileData,
        ...updates
      } as T;
      
      // Update only the active profile in settings
      const updatedSettings = profiles.map(p => 
        p.versionId === activeProfile.versionId
          ? {
              ...p,
              config: updatedData,
              lastUpdated: new Date(),
              lastUpdatedBy: 'user'
            }
          : p
      );
      
      // Use StorageClient.update for partial update - much faster
      await StorageClient.update(config.configId, {
        settings: updatedSettings,
        lastUpdated: new Date(),
        lastUpdatedBy: 'user'
      });
      
      // Update local state
      setProfiles(updatedSettings);
      setActiveProfileData(updatedData);
      
      // Update active profile reference
      const updatedActiveProfile = updatedSettings.find(p => p.versionId === activeProfile.versionId);
      if (updatedActiveProfile) {
        setActiveProfile(updatedActiveProfile);
      }
      
      log('Profile partially updated');
    } catch (err) {
      log('Error updating profile partially:', err);
      throw err;
    }
  };

  return {
    profiles,
    activeProfile,
    activeProfileData,
    isLoading,
    isSaving,
    error,
    saveProfile,
    loadProfile,
    deleteProfile,
    createProfile,
    setActiveProfile: setActiveProfileHandler,
    updateProfilePartial,
    exportProfile,
    importProfile,
    resetToDefault
  };
}