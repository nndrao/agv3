import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfileManagement } from "@/hooks/useProfileManagement";
import { ProfileManagementDialog } from "@/components/ProfileManagementDialog";
import { SaveProfileDialog } from "@/components/SaveProfileDialog";
import { RenameViewDialog } from "@/components/RenameViewDialog";
import { WindowManager } from "@/services/window/windowManager";
import { debugStorage } from "@/utils/storageDebug";
import { getViewInstanceId } from "@/utils/viewUtils";

// Import all hooks
import {
  useSharedWorkerConnection,
  useSnapshotData,
  useProviderConfig,
  useGridState,
  useViewTitle,
  useThemeSync
} from './hooks';

// Import components
import { Toolbar } from './components/Toolbar';
import { BusyIndicator } from './components/BusyIndicator';
import { DataGrid } from './components/DataGrid';
import { ColumnGroupService } from './columnGroups/columnGroupService';
import { ExpressionEditorDialogControlled } from '@/components/expression-editor/ExpressionEditorDialogControlled';
import { GridConfigurationBus } from '@/services/iab/GridConfigurationBus';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { dialogService } from '@/services/openfin/OpenFinDialogService';

// Import types and config
import { DataGridStompSharedProfile, ProviderConfig } from './types';
import { 
  DEFAULT_COL_DEF, 
  getStatusBarConfig 
} from './config/gridConfig';
import { DEFAULT_PROFILE } from './config/profileDefaults';
import { COMPONENT_TYPE, INITIAL_GRID_OPTIONS } from './config/constants';
import { getDefaultGridOptions } from './gridOptions/gridOptionsConfig';
import { themeQuartz } from "ag-grid-community";

import "@/index.css";
import "./gridOptions/styles.css";

// Helper function to create theme with dynamic font
const createThemeWithFont = (fontFamily?: string) => {
  const baseFont = fontFamily || 'Inter';
  
  return themeQuartz
    .withParams(
      {
        accentColor: "#8AAAA7",
        backgroundColor: "#E6E6E6",
        borderColor: "#23202029",
        browserColorScheme: "light",
        buttonBorderRadius: 2,
        cellTextColor: "#000000",
        checkboxBorderRadius: 2,
        columnBorder: true,
        fontFamily: baseFont,
        fontSize: 14,
        headerBackgroundColor: "#D9D9D9D6",
        headerFontFamily: baseFont,
        headerFontSize: 14,
        headerFontWeight: 500,
        iconButtonBorderRadius: 1,
        iconSize: 12,
        inputBorderRadius: 2,
        oddRowBackgroundColor: "#DCDCDCE8",
        spacing: 6,
        wrapperBorderRadius: 2,
      },
      "light"
    )
    .withParams(
      {
        accentColor: "#8AAAA7",
        backgroundColor: "#171717",
        borderRadius: 2,
        checkboxBorderRadius: 2,
        columnBorder: true,
        fontFamily: baseFont,
        browserColorScheme: "dark",
        chromeBackgroundColor: {
          ref: "foregroundColor",
          mix: 0.07,
          onto: "backgroundColor",
        },
        fontSize: 14,
        foregroundColor: "#FFF",
        headerFontFamily: baseFont,
        headerFontSize: 14,
        iconSize: 12,
        inputBorderRadius: 2,
        oddRowBackgroundColor: "#1f1f1f",
        spacing: 6,
        wrapperBorderRadius: 2,
      },
      "dark"
    );
};

// Simple expression evaluator for conditional formatting
// Currently unused - will be used when conditional formatting is enabled
// Removed temporarily due to regex patterns in comments causing parse errors

const DataGridStompSharedComponent = () => {
  const { toast } = useToast();
  
  // State
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [profileLoadingState, setProfileLoadingState] = useState<{ isLoading: boolean; profileName: string }>({ 
    isLoading: false, 
    profileName: '' 
  });
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  // Removed dialog states as they're now managed by the dialog service
  const [showExpressionEditor, setShowExpressionEditor] = useState(false);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [unsavedGridOptions, setUnsavedGridOptions] = useState<Record<string, any> | null>(null);
  const [unsavedColumnGroups, setUnsavedColumnGroups] = useState<any[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [conditionalFormattingRules, setConditionalFormattingRules] = useState<ConditionalRule[]>([]);
  
  // Refs for lifecycle management
  const isInitialMount = useRef(true);
  const hasAutoConnected = useRef(false);
  // Removed isApplyingProfileRef - no longer needed with proper sequencing
  
  // Get view instance ID from query parameters
  const viewInstanceId = useMemo(() => getViewInstanceId(), []);
  
  // State for active profile data - needed before hooks
  const [activeProfileData, setActiveProfileData] = useState<DataGridStompSharedProfile | null>(null);
  
  // Simple ref variable to track if profile loading is in progress
  const isProfileLoadingRef = useRef(false);
  const gridStateAppliedRef = useRef(false);
  const columnGroupsAppliedRef = useRef(false);
  
  // Helper to check if profile application is complete
  const checkProfileApplicationComplete = useCallback(() => {
    
    if (isProfileLoadingRef.current && 
        gridStateAppliedRef.current && 
        columnGroupsAppliedRef.current) {
      isProfileLoadingRef.current = false;
      gridStateAppliedRef.current = false;
      columnGroupsAppliedRef.current = false;
      
      // Hide the loading indicator
      setProfileLoadingState({ isLoading: false, profileName: '' });
    }
  }, []);
  
  // Profile status callbacks for useGridState
  const profileStatusCallbacks = useMemo(() => ({
    onProfileApplying: (_profileName: string) => {
      // This is called when a profile is pending application (grid not ready)
    },
    onProfileApplied: (_profileName: string, _success: boolean, _error?: string) => {
      
      if (isProfileLoadingRef.current) {
        // Mark grid state as applied
        gridStateAppliedRef.current = true;
        checkProfileApplicationComplete();
      }
    }
  }), [checkProfileApplicationComplete]);
  
  // Custom hooks - order matters for dependencies
  const { providerConfig, columnDefs } = useProviderConfig(selectedProviderId);
  const { gridApi, columnApi, onGridReady, getRowId, applyProfileGridState, extractGridState, extractFullGridState, gridApiRef, setColumnGroups, getColumnGroups, getPendingColumnState, clearPendingColumnState, getPendingColumnGroupState, clearPendingColumnGroupState } = useGridState(providerConfig, activeProfileData, profileStatusCallbacks);
  const { connectionState, workerClient, connect, disconnect } = useSharedWorkerConnection(selectedProviderId, gridApiRef);
  const { snapshotData, handleSnapshotData, handleRealtimeUpdate, resetSnapshot, requestSnapshot } = useSnapshotData(gridApiRef);
  const { currentViewTitle, saveViewTitle } = useViewTitle(viewInstanceId);
  const { isDarkMode, className, setTheme } = useThemeSync();
  
  // Register this instance with WindowManager on mount
  useEffect(() => {
    // Debug storage context
    debugStorage('DataGridStompShared Mount');
    
    // Extract a readable name from the ID
    let instanceName = 'DataGrid STOMP (Shared)';
    if (viewInstanceId.includes('instance-')) {
      const match = viewInstanceId.match(/instance-(\d+)/);
      if (match) {
        instanceName = `DataGrid STOMP (Shared) ${match[1]}`;
      }
    } else if (viewInstanceId.includes('datagrid-stomp-shared-')) {
      // Extract custom name
      const customName = viewInstanceId.replace('datagrid-stomp-shared-', '').replace(/-/g, ' ');
      instanceName = customName.charAt(0).toUpperCase() + customName.slice(1);
    }
    
    WindowManager.registerViewInstance(viewInstanceId, instanceName, 'DataGridStompShared');
    
    // Restore saved title if available
    const savedTitle = localStorage.getItem(`viewTitle_${viewInstanceId}`);
    if (savedTitle) {
      document.title = savedTitle;
    } else {
      document.title = instanceName;
    }
  }, [viewInstanceId]);
  
  // Handle conditional formatting rules apply
  // Currently unused - will be implemented when conditional formatting dialog is added
  // Removed temporarily - contains references to evaluateExpression which was also removed
  
  // Set up event listeners for SharedWorker messages
  useEffect(() => {
    if (!workerClient) return;
    
    const handleSnapshot = (data: { providerId: string; data: any[]; statistics?: any }) => {
      //console.log(`[DataGridStompShared] Received snapshot for provider ${data.providerId}, current provider: ${selectedProviderId}`);
      if (data.providerId === selectedProviderId) {
        //console.log(`[DataGridStompShared] Processing snapshot: ${data.data.length} rows`);
        handleSnapshotData(data.data);
      }
    };
    
    const handleUpdate = (data: { providerId: string; data: any[]; statistics?: any }) => {
      if (data.providerId === selectedProviderId) {
        //console.log(`[DataGridStompShared] Processing update: ${data.data.length} rows`);
        handleRealtimeUpdate(data.data);
      }
    };
    
    const handleStatus = (data: { providerId: string; statistics: any }) => {
      if (data.providerId === selectedProviderId && data.statistics) {
        const wasConnected = connectionState.isConnected;
        
        // Check if we just disconnected from STOMP server
        if (wasConnected && !data.statistics.isConnected) {
          alert('STOMP provider has been disconnected from the server!');
          
          toast({
            title: "Connection Lost",
            description: "STOMP provider has been disconnected from the server",
            variant: "destructive",
          });
        }
      }
    };
    
    // Add event listeners
    workerClient.on('snapshot', handleSnapshot);
    workerClient.on('update', handleUpdate);
    workerClient.on('status', handleStatus);
    
    // Cleanup
    return () => {
      workerClient.removeListener('snapshot', handleSnapshot);
      workerClient.removeListener('update', handleUpdate);
      workerClient.removeListener('status', handleStatus);
    };
  }, [selectedProviderId, workerClient, connectionState.isConnected, toast, handleSnapshotData, handleRealtimeUpdate]);
  
  // Memoize the profile change handler to prevent re-renders
  const handleProfileChange = useCallback((profile: DataGridStompSharedProfile) => {
    // Apply profile settings
    
    // Clear any unsaved grid options and column groups when loading a profile
    setUnsavedGridOptions(null);
    setUnsavedColumnGroups(null);
    
    // On initial mount, we need to track this as a profile application
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // Start the loading indicator for initial profile load
      if (!isProfileLoadingRef.current) {
        isProfileLoadingRef.current = true;
        setProfileLoadingState({ isLoading: true, profileName: profile.name });
        gridStateAppliedRef.current = false;
        columnGroupsAppliedRef.current = false;
      }
      
      if (profile.selectedProviderId) {
        setSelectedProviderId(profile.selectedProviderId);
      }
      setSidebarVisible(profile.sidebarVisible ?? false);
      setShowColumnSettings(profile.showColumnSettings ?? false);
    } else {
      // After initial mount, NEVER update selectedProviderId from profile
      setSidebarVisible(profile.sidebarVisible ?? false);
      setShowColumnSettings(profile.showColumnSettings ?? false);
    }
    
    // Apply grid state if available
    applyProfileGridState(profile);
  }, [applyProfileGridState]);
  
  // Profile management
  const {
    profiles,
    activeProfile,
    activeProfileData: profileData, // Rename to avoid conflict with state
    isLoading: profilesLoading,
    isSaving,
    saveProfile,
    loadProfile,
    deleteProfile,
    setActiveProfile,
    exportProfile,
    importProfile
  } = useProfileManagement<DataGridStompSharedProfile>({
    viewInstanceId,
    componentType: COMPONENT_TYPE,
    defaultProfile: DEFAULT_PROFILE,
    onProfileChange: handleProfileChange,
    debug: false
  });
  
  // Sync profile data from hook to local state
  useEffect(() => {
    if (profileData) {
      setActiveProfileData(profileData);
    }
  }, [profileData]);
  
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
        console.warn('[DataGridStompShared] IAB initialization skipped:', error);
      }
    };
    
    initIAB();
    
    return () => {
      isCleanedUp = true;
      // Only destroy on unmount, not on every effect re-run
      GridConfigurationBus.getInstance().destroy().catch(err => 
        console.warn('[DataGridStompShared] Error cleaning up IAB:', err)
      );
    };
  }, [viewInstanceId]); // Remove handleApplyConditionalFormatting from deps to avoid re-init
  
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
  
  // Monitor columnDefs changes and update grid if ready
  useEffect(() => {
    if (columnDefs.length > 0 && gridApi) {
      
      // Update grid column definitions
      gridApi.setGridOption('columnDefs', columnDefs);
      
      // Force grid to refresh after setting columns
      setTimeout(() => {
        gridApi?.refreshCells({ force: true });
      }, 100);
    }
  }, [columnDefs, gridApi]);
  
  // Handle auto-connect when provider config is loaded
  useEffect(() => {
    if (!providerConfig || !selectedProviderId) {
      return;
    }
    
    // Auto-connect if profile has autoConnect enabled and we haven't already auto-connected
    // AND the user hasn't manually disconnected
    if (activeProfileData?.autoConnect && !hasAutoConnected.current && !connectionState.isConnected && !connectionState.wasManuallyDisconnected) {
      hasAutoConnected.current = true;
      
      // Small delay to ensure all state is settled
      const timer = setTimeout(() => {
        connectToSharedWorker();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [providerConfig, selectedProviderId, activeProfileData?.autoConnect, connectionState.isConnected, connectionState.wasManuallyDisconnected]);
  
  // Connect to SharedWorker
  const connectToSharedWorker = useCallback(async () => {
    
    if (!providerConfig || !workerClient || !selectedProviderId) {
      console.error('No provider config loaded or SharedWorker not initialized');
      toast({
        title: "Configuration Missing",
        description: "Please select a datasource provider first",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    const requiredFields: (keyof ProviderConfig)[] = ['websocketUrl', 'listenerTopic'];
    const missingFields = requiredFields.filter(field => !providerConfig[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      toast({
        title: "Invalid Configuration",
        description: `Missing required fields: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Reset state
      resetSnapshot();
      
      // Connect to provider through SharedWorker
      await connect(providerConfig);
      
      
      // Request snapshot explicitly
      await requestSnapshot(workerClient, selectedProviderId);
      
      // Request current status to sync UI state
      try {
        const status = await workerClient.getStatus(selectedProviderId);
        if (status) {
        }
      } catch (error) {
        console.error('[DataGridStompShared] Failed to get status:', error);
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect to SharedWorker',
        variant: "destructive"
      });
    }
  }, [providerConfig, workerClient, selectedProviderId, toast, connect, resetSnapshot, requestSnapshot]);
  
  // Disconnect from SharedWorker
  const disconnectFromSharedWorker = useCallback(async () => {
    if (workerClient && selectedProviderId) {
      try {
        await disconnect();
        resetSnapshot();
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  }, [workerClient, selectedProviderId, disconnect, resetSnapshot]);
  
  // Check if styles are loaded
  useEffect(() => {
    const timer = setTimeout(() => setStylesLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Handle view rename dialog open
  const handleOpenRenameDialog = useCallback(async () => {
    try {
      // Get current view title
      await fin.View.getCurrent();
      setShowRenameDialog(true);
    } catch (error) {
      console.error('Failed to get current view title:', error);
      setShowRenameDialog(true);
    }
  }, []);
  
  // Handle rename dialog request from context menu
  useEffect(() => {
    const checkRenameRequest = () => {
      if ((window as any).__requestRenameDialog) {
        delete (window as any).__requestRenameDialog;
        setShowRenameDialog(true);
      }
    };
    
    const interval = setInterval(checkRenameRequest, 100);
    return () => clearInterval(interval);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerClient && selectedProviderId) {
        disconnect().catch(() => {});
      }
    };
  }, [workerClient, selectedProviderId, disconnect]);
  
  // Save current state to profile
  const saveCurrentState = useCallback(async (saveAsNew = false, name?: string) => {
    
    // Show saving status
    // Note: Saving status is handled by the profile management hook's toast
    
    // Extract full grid state for comprehensive persistence
    const fullGridState = extractFullGridState();
    
    // Extract legacy grid state for backward compatibility
    const { columnState, filterModel, sortModel } = extractGridState();
    
    // Use unsaved grid options if available, otherwise use current profile options
    const gridOptionsToSave = unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
    
    // Use unsaved column groups if available, otherwise use current profile column groups
    // Also update the state manager before extracting full state
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
      
      // Clear unsaved options after successful save
      setUnsavedGridOptions(null);
      setUnsavedColumnGroups(null);
      
      
      // Save completed successfully
    } catch (error) {
      console.error('[DataGridStompShared] Error saving profile:', error);
      
      // Error already handled by saveProfile function
    }
  }, [activeProfileData, selectedProviderId, connectionState.isConnected, sidebarVisible, showColumnSettings, saveProfile, extractGridState, extractFullGridState, unsavedGridOptions, unsavedColumnGroups, setColumnGroups]);
  
  // Wrapped profile load handler with status indication
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
        // Don't complete here - wait for both grid state and column groups to be applied
      } catch (error) {
        console.error('[handleProfileLoad] Error loading profile:', error);
        isProfileLoadingRef.current = false;
        setProfileLoadingState({ isLoading: false, profileName: '' });
        gridStateAppliedRef.current = false;
        columnGroupsAppliedRef.current = false;
      }
    }
  }, [profiles, activeProfile, loadProfile]);
  
  // Profile management handlers
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
  
  const handleProfileRename = useCallback(async (versionId: string, newName: string) => {
    const profile = profiles.find(p => p.versionId === versionId);
    if (!profile) return;
    
    const updatedProfile = {
      ...(profile.config as DataGridStompSharedProfile),
      name: newName
    };
    
    await saveProfile(updatedProfile, false);
  }, [profiles, saveProfile]);
  
  const handleSetDefault = useCallback(async (versionId: string) => {
    await setActiveProfile(versionId);
  }, [setActiveProfile]);
  
  // Handle view rename
  const handleRenameView = useCallback(async (newTitle: string) => {
    try {
      saveViewTitle(newTitle);
      
      toast({
        title: "View Renamed",
        description: `View renamed to "${newTitle}"`
      });
      
      // If called from context menu, resolve the promise
      if ((window as any).__renameDialogResolve) {
        (window as any).__renameDialogResolve({ success: true, newTitle });
        delete (window as any).__renameDialogResolve;
      }
    } catch (error) {
      toast({
        title: "Rename Failed",
        description: "Failed to rename the view",
        variant: "destructive"
      });
      
      // If called from context menu, resolve with failure
      if ((window as any).__renameDialogResolve) {
        (window as any).__renameDialogResolve({ success: false });
        delete (window as any).__renameDialogResolve;
      }
    }
  }, [saveViewTitle, toast]);
  
  // Window options for dialogs (must be defined before callbacks that use it)
  const windowOptions = useMemo(() => ({
    defaultWidth: 800,
    defaultHeight: 700,
    defaultCentered: true,
    frame: true,
    resizable: true,
    maximizable: false,
    minimizable: true,
    alwaysOnTop: false,
    saveWindowState: false,
    autoShow: true
  }), []);
  
  // Handle grid options apply - must be defined before handleOpenGridOptions
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
  
  // Handle column groups apply - must be defined before handleOpenColumnGroups
  const handleApplyColumnGroups = useCallback((groups: any[]) => {
    
    if (!gridApi) {
      console.error('[handleApplyColumnGroups] GridAPI not available');
      toast({
        title: "Error",
        description: "Grid API not available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Pass the original column definitions to preserve all column properties
      // Note: columnApi can be null in newer AG-Grid versions, but ColumnGroupService handles this
      const gridStateManager = {
        getPendingColumnState,
        clearPendingColumnState
      };
      ColumnGroupService.applyColumnGroups(gridApi, columnApi, groups, columnDefs, gridStateManager);
      
      // Store unsaved column groups
      setUnsavedColumnGroups(groups);
      
      
      // Force a grid refresh to ensure the changes are visible
      setTimeout(() => {
        gridApi.refreshCells({ force: true });
        
        // Test expanding/collapsing groups to verify columnGroupShow behavior
        
        // Try to expand all groups first
        // In newer AG-Grid versions, column group methods might be on gridApi
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
      console.error('[handleApplyColumnGroups] Error applying column groups:', error);
      toast({
        title: "Error",
        description: "Failed to apply column groups",
        variant: "destructive"
      });
    }
  }, [gridApi, columnApi, columnDefs, toast, getPendingColumnState, clearPendingColumnState]);
  
  // Handle conditional formatting apply
  const handleApplyConditionalFormatting = useCallback((rules: ConditionalRule[]) => {
    setConditionalFormattingRules(rules);
    
    toast({
      title: "Conditional Formatting Applied",
      description: `${rules.length} rule(s) have been applied to the grid`
    });
    
    // Apply the rules to the grid if needed
    // This would typically involve updating cell styles based on the rules
  }, [toast]);
  
  // Memoized callbacks
  const handleOpenSaveDialog = useCallback(() => setShowSaveDialog(true), []);
  const handleOpenProfileDialog = useCallback(() => setShowProfileDialog(true), []);
  const handleOpenGridOptions = useCallback(async () => {
    // Capture current options when opening - use unsaved if available
    const currentOptions = unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
    
    // Open dialog using the new service
    await dialogService.openDialog({
      name: `grid-options-${viewInstanceId}`,
      route: '/grid-options',
      data: {
        options: currentOptions,
        profileName: activeProfile?.name
      },
      windowOptions: {
        ...windowOptions,
        defaultWidth: 900,
        defaultHeight: 700
      },
      onApply: (data) => {
        if (data?.options) {
          handleApplyGridOptions(data.options);
        }
      }
    });
  }, [unsavedGridOptions, activeProfileData?.gridOptions, activeProfile?.name, viewInstanceId, windowOptions, handleApplyGridOptions]);
  
  const handleOpenColumnGroups = useCallback(async () => {
    // Open dialog using the new service
    await dialogService.openDialog({
      name: `column-groups-${viewInstanceId}`,
      route: '/column-groups',
      data: {
        columnDefs: columnDefs,
        currentGroups: unsavedColumnGroups || activeProfileData?.columnGroups,
        profileName: activeProfile?.name
      },
      windowOptions: {
        ...windowOptions,
        defaultWidth: 1000,
        defaultHeight: 700
      },
      onApply: (data) => {
        if (data?.groups) {
          handleApplyColumnGroups(data.groups);
        }
      }
    });
  }, [columnDefs, unsavedColumnGroups, activeProfileData?.columnGroups, activeProfile?.name, viewInstanceId, windowOptions, handleApplyColumnGroups]);
  
  const handleOpenExpressionEditor = useCallback(() => {
    setShowExpressionEditor(true);
  }, []);
  
  const handleOpenConditionalFormatting = useCallback(async () => {
    // Open dialog using the new service
    await dialogService.openDialog({
      name: `conditional-formatting-${viewInstanceId}`,
      route: '/conditional-formatting',
      data: {
        columnDefs: columnDefs.map(col => ({
          field: col.field,
          headerName: col.headerName,
          type: col.type
        })),
        currentRules: conditionalFormattingRules,
        profileName: activeProfile?.name
      },
      windowOptions: {
        ...windowOptions,
        defaultWidth: 1200,
        defaultHeight: 800
      },
      onApply: (data) => {
        if (data?.rules) {
          handleApplyConditionalFormatting(data.rules);
        }
      }
    });
  }, [columnDefs, conditionalFormattingRules, activeProfile?.name, viewInstanceId, windowOptions, handleApplyConditionalFormatting]);
  
  const handleSaveNewProfile = useCallback(async (name: string) => {
    await saveCurrentState(true, name);
    setShowSaveDialog(false);
  }, [saveCurrentState]);
  
  const handleProviderChange = useCallback((providerId: string | null) => {
    setSelectedProviderId(providerId);
    // Reset connection flags when provider changes
    hasAutoConnected.current = false;
  }, []);
  
  const handleThemeToggle = useCallback(() => {
    setTheme(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setTheme]);
  
  
  // Apply theme changes to grid
  useEffect(() => {
    if (gridApi) {
      // Small delay to ensure theme classes are applied
      setTimeout(() => {
        gridApi?.refreshCells({ force: true });
      }, 50);
    }
  }, [isDarkMode, gridApi]);
  
  // Apply grid options when profile changes
  useEffect(() => {
    if (gridApi && activeProfileData?.gridOptions) {
      Object.entries(activeProfileData.gridOptions).forEach(([key, value]) => {
        // Skip font and initial-only properties that cannot be changed after initialization
        if (key !== 'font' && !INITIAL_GRID_OPTIONS.includes(key)) {
          gridApi.setGridOption(key as any, value);
        }
      });
      gridApi.refreshCells({ force: true });
    }
  }, [activeProfileData?.gridOptions, gridApi]);
  
  // Apply column groups after grid is ready and we have both columnDefs and groups
  // This runs AFTER grid state has been applied (column state, filters, sorts)
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
        
        // Apply column groups immediately since grid is ready
        
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
      if (isProfileLoadingRef.current && !gridApi && gridStateAppliedRef.current) {
        columnGroupsAppliedRef.current = true;
        checkProfileApplicationComplete();
      }
    }
  }, [gridApi, columnApi, columnDefs, activeProfileData?.columnGroups, unsavedColumnGroups, setColumnGroups, getColumnGroups, checkProfileApplicationComplete]);

  // Create theme with dynamic font - use unsaved options if available
  const gridTheme = useMemo(() => {
    const fontFamily = unsavedGridOptions?.font || activeProfileData?.gridOptions?.font;
    return createThemeWithFont(fontFamily);
  }, [unsavedGridOptions?.font, activeProfileData?.gridOptions?.font]);
  
  if (!stylesLoaded || profilesLoading) {
    return <div className="h-full flex items-center justify-center">Loading...</div>;
  }
  
  return (
    <div className={className} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Toolbar */}
      <Toolbar
        connectionState={connectionState}
        selectedProviderId={selectedProviderId}
        onProviderChange={handleProviderChange}
        onConnect={connectToSharedWorker}
        onDisconnect={disconnectFromSharedWorker}
        profiles={profiles}
        activeProfile={activeProfile}
        profilesLoading={profilesLoading}
        isSaving={isSaving}
        hasUnsavedChanges={!!unsavedGridOptions || !!unsavedColumnGroups}
        onProfileLoad={handleProfileLoad}
        onProfileSave={() => saveCurrentState()}
        onOpenSaveDialog={handleOpenSaveDialog}
        onOpenProfileDialog={handleOpenProfileDialog}
        sidebarVisible={sidebarVisible}
        onSidebarToggle={setSidebarVisible}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
        onOpenRenameDialog={handleOpenRenameDialog}
        onOpenGridOptions={handleOpenGridOptions}
        onOpenColumnGroups={handleOpenColumnGroups}
        onOpenExpressionEditor={handleOpenExpressionEditor}
        onOpenConditionalFormatting={handleOpenConditionalFormatting}
        viewInstanceId={viewInstanceId}
        profileOperation={profileLoadingState.isLoading ? 'loading' : 'idle'}
        profileName={profileLoadingState.profileName}
        profileError={''}
      />
      
      {/* Grid */}
      <div className="flex-1 overflow-hidden relative">
        {/* Busy indicator overlay */}
        <BusyIndicator mode={snapshotData.mode} messageCount={snapshotData.messageCount} />
        
        {/* AG-Grid */}
        <DataGrid
          theme={gridTheme}
          rowData={snapshotData.data}
          columnDefs={columnDefs}
          defaultColDef={DEFAULT_COL_DEF}
          sidebarVisible={sidebarVisible}
          onGridReady={onGridReady}
          getRowId={getRowId}
          statusBarConfig={getStatusBarConfig()}
          connectionState={connectionState}
          snapshotData={snapshotData}
          gridOptions={unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions()}
        />
      </div>
      
      {/* Profile Management Dialog */}
      <ProfileManagementDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        profiles={profiles}
        activeProfileId={activeProfile?.versionId}
        onSave={async (profile: any, name: string) => {
          const fullProfile: DataGridStompSharedProfile = {
            ...activeProfileData!,
            ...profile,
            name
          };
          await saveProfile(fullProfile, false, name);
        }}
        onDelete={deleteProfile}
        onRename={handleProfileRename}
        onSetDefault={handleSetDefault}
        onImport={handleProfileImport}
        onExport={handleProfileExport}
      />
      
      {/* Save Profile Dialog */}
      <SaveProfileDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveNewProfile}
        title='Create New Profile'
        initialName=''
      />
      
      {/* Rename View Dialog */}
      <RenameViewDialog
        open={showRenameDialog}
        onOpenChange={(open) => {
          setShowRenameDialog(open);
          // If closing and called from context menu, resolve with cancel
          if (!open && (window as any).__renameDialogResolve) {
            (window as any).__renameDialogResolve({ success: false });
            delete (window as any).__renameDialogResolve;
          }
        }}
        currentTitle={currentViewTitle}
        onRename={handleRenameView}
      />
      
      {/* Expression Editor Dialog */}
      <ExpressionEditorDialogControlled 
        open={showExpressionEditor}
        onOpenChange={setShowExpressionEditor}
        mode="conditional"
        availableColumns={columnDefs}
        onSave={(_expression, mode) => {
          // Handle expression save - apply to selected columns
          toast({
            title: "Expression Saved",
            description: `Expression saved in ${mode} mode`
          });
        }}
      />
    </div>
  );
};

// Export with React.memo - since component has no props, it will only re-render on internal state changes
export const DataGridStompShared = React.memo(DataGridStompSharedComponent);