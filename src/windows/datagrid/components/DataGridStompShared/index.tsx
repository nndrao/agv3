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
import { GridOptionsEditorContent } from './gridOptions/GridOptionsEditor';
import { OpenFinPortalDialog } from '@/components/ui/openfin-portal-dialog';

// Import types and config
import { DataGridStompSharedProfile, ProviderConfig } from './types';
import { 
  GRID_THEME, 
  DEFAULT_COL_DEF, 
  getStatusBarConfig 
} from './config/gridConfig';
import { DEFAULT_PROFILE } from './config/profileDefaults';
import { COMPONENT_TYPE } from './config/constants';
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

const DataGridStompSharedComponent = () => {
  const { toast } = useToast();
  
  // State
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showGridOptionsDialog, setShowGridOptionsDialog] = useState(false);
  const [gridOptionsForEditor, setGridOptionsForEditor] = useState<Record<string, any> | null>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [unsavedGridOptions, setUnsavedGridOptions] = useState<Record<string, any> | null>(null);
  
  // Stable refs for dialog state
  const gridOptionsDialogRef = useRef(false);
  
  // Refs for lifecycle management
  const isInitialMount = useRef(true);
  const hasAutoConnected = useRef(false);
  
  // Get view instance ID from query parameters
  const viewInstanceId = useMemo(() => getViewInstanceId(), []);
  
  // Custom hooks - order matters for dependencies
  const { providerConfig, columnDefs } = useProviderConfig(selectedProviderId);
  const { gridApi, onGridReady, getRowId, applyProfileGridState, extractGridState, gridApiRef } = useGridState(providerConfig, null);
  const { connectionState, workerClient, subscribe, unsubscribe } = useSharedWorkerConnection(selectedProviderId, gridApiRef);
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
  
  // Set up event listeners for SharedWorker messages
  useEffect(() => {
    if (!workerClient) return;
    
    const handleSnapshot = (data: { providerId: string; data: any[]; statistics?: any }) => {
      console.log(`[DataGridStompShared] Received snapshot for provider ${data.providerId}, current provider: ${selectedProviderId}`);
      if (data.providerId === selectedProviderId) {
        console.log(`[DataGridStompShared] Processing snapshot: ${data.data.length} rows`);
        handleSnapshotData(data.data);
      }
    };
    
    const handleUpdate = (data: { providerId: string; data: any[]; statistics?: any }) => {
      if (data.providerId === selectedProviderId) {
        console.log(`[DataGridStompShared] Processing update: ${data.data.length} rows`);
        handleRealtimeUpdate(data.data);
      }
    };
    
    const handleStatus = (data: { providerId: string; statistics: any }) => {
      if (data.providerId === selectedProviderId && data.statistics) {
        console.log('[DataGridStompShared] Processing status update:', data.statistics);
        const wasConnected = connectionState.isConnected;
        
        // Check if we just disconnected from STOMP server
        if (wasConnected && !data.statistics.isConnected) {
          console.log('[DataGridStompShared] STOMP provider disconnected!');
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
    console.log('[DataGridStompShared] Applying profile:', profile);
    
    // Clear any unsaved grid options when loading a profile
    setUnsavedGridOptions(null);
    
    // On initial mount, apply all settings including selectedProviderId
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('[DataGridStompShared] Initial mount - applying full profile');
      if (profile.selectedProviderId) {
        setSelectedProviderId(profile.selectedProviderId);
      }
      setSidebarVisible(profile.sidebarVisible ?? false);
      setShowColumnSettings(profile.showColumnSettings ?? false);
    } else {
      // After initial mount, NEVER update selectedProviderId from profile
      console.log('[DataGridStompShared] Subsequent profile application - skipping selectedProviderId');
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
    activeProfileData,
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
      console.log('[DataGridStompShared] Auto-connecting after provider config loaded');
      console.log('Provider config ready:', providerConfig);
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
    console.log('Connect button clicked');
    console.log('Current provider config:', providerConfig);
    
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
      
      // Subscribe to provider through SharedWorker
      await subscribe(selectedProviderId, providerConfig);
      
      console.log('✅ Subscribed to provider via SharedWorker');
      
      // Request snapshot explicitly
      await requestSnapshot(workerClient, selectedProviderId);
      
      // Request current status to sync UI state
      try {
        const status = await workerClient.getStatus(selectedProviderId);
        if (status) {
          console.log('[DataGridStompShared] Got status from SharedWorker:', status);
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
  }, [providerConfig, workerClient, selectedProviderId, toast, subscribe, resetSnapshot, requestSnapshot]);
  
  // Disconnect from SharedWorker
  const disconnectFromSharedWorker = useCallback(async () => {
    if (workerClient && selectedProviderId) {
      try {
        await unsubscribe(selectedProviderId);
        resetSnapshot();
        toast({
          title: "Disconnected",
          description: "Disconnected from provider",
        });
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  }, [workerClient, selectedProviderId, unsubscribe, resetSnapshot, toast]);
  
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
        console.log('[DataGridStompShared] Component unmounting, unsubscribing from provider');
        unsubscribe(selectedProviderId).catch(() => {});
      }
    };
  }, [workerClient, selectedProviderId, unsubscribe]);
  
  // Save current state to profile
  const saveCurrentState = useCallback(async (saveAsNew = false, name?: string) => {
    console.log('[DataGridStompShared] Saving profile:', { saveAsNew, name, selectedProviderId });
    
    // Extract grid state
    const { columnState, filterModel, sortModel } = extractGridState();
    
    // Use unsaved grid options if available, otherwise use current profile options
    const gridOptionsToSave = unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
    
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
      columnState,
      filterModel,
      sortModel,
      gridOptions: gridOptionsToSave
    };
    
    await saveProfile(currentState, saveAsNew, name);
    
    // Clear unsaved options after successful save
    setUnsavedGridOptions(null);
    
    console.log('[DataGridStompShared] Profile saved successfully');
    
    toast({
      title: "Profile Saved",
      description: saveAsNew ? "New profile created successfully" : "Profile updated successfully"
    });
  }, [activeProfileData, selectedProviderId, connectionState.isConnected, sidebarVisible, showColumnSettings, saveProfile, extractGridState, unsavedGridOptions, toast]);
  
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
  
  // Memoized callbacks
  const handleOpenSaveDialog = useCallback(() => setShowSaveDialog(true), []);
  const handleOpenProfileDialog = useCallback(() => setShowProfileDialog(true), []);
  const handleOpenGridOptions = useCallback(() => {
    // Capture current options when opening - use unsaved if available
    const currentOptions = unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
    setGridOptionsForEditor(currentOptions);
    gridOptionsDialogRef.current = true;
    setShowGridOptionsDialog(true);
  }, [unsavedGridOptions, activeProfileData?.gridOptions]);
  const handleSaveNewProfile = useCallback(async (name: string) => {
    await saveCurrentState(true, name);
    setShowSaveDialog(false);
  }, [saveCurrentState]);
  
  const handleProviderChange = useCallback((providerId: string | null) => {
    console.log('[DataGridStompShared] Provider changed to:', providerId);
    setSelectedProviderId(providerId);
    // Reset connection flags when provider changes
    hasAutoConnected.current = false;
  }, []);
  
  const handleThemeToggle = useCallback(() => {
    setTheme(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setTheme]);
  
  // Stable callback for dialog open/close
  const handleGridOptionsDialogChange = useCallback((open: boolean) => {
    gridOptionsDialogRef.current = open;
    setShowGridOptionsDialog(open);
    if (!open) {
      // Clear editor options when closing
      setGridOptionsForEditor(null);
    }
  }, []);
  
  // Handle grid options apply - only apply to grid, don't save to storage
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
        const startTime = performance.now();
        
        // Use requestAnimationFrame to batch DOM updates
        requestAnimationFrame(() => {
          // Apply all changed options
          Object.entries(changedOptions).forEach(([key, value]) => {
            gridApi.setGridOption(key, value);
          });
          
          // Only refresh if visual options changed
          const visualOptions = ['rowHeight', 'headerHeight', 'animateRows', 'enableCellChangeFlash', 
                                'floatingFiltersHeight', 'groupHeaderHeight', 'pivotHeaderHeight'];
          const needsRefresh = Object.keys(changedOptions).some(key => visualOptions.includes(key));
          
          if (needsRefresh) {
            gridApi.refreshCells({ force: true });
          }
          
          const endTime = performance.now();
          console.log(`Grid options applied in ${(endTime - startTime).toFixed(2)}ms (${Object.keys(changedOptions).length} options changed)`);
        });
      }
    }
    
    // Store the new options in memory only
    setUnsavedGridOptions(newOptions);
    
    toast({
      title: "Grid Options Applied",
      description: "Grid options applied to grid (not saved to profile)"
    });
    
    // Close the grid options dialog after successfully applying changes
    handleGridOptionsDialogChange(false);
  }, [gridApi, toast, handleGridOptionsDialogChange, unsavedGridOptions, activeProfileData?.gridOptions]);
  
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
        if (key !== 'font') {
          gridApi.setGridOption(key, value);
        }
      });
      gridApi.refreshCells({ force: true });
    }
  }, [activeProfileData?.gridOptions, gridApi]);
  
  // Memoize window options (must be before early return)
  const windowOptions = useMemo(() => ({
    defaultWidth: 500,
    defaultHeight: 750,
    defaultCentered: true,
    frame: true,
    resizable: true,
    maximizable: false,
    minimizable: true,
    alwaysOnTop: false,
    saveWindowState: true
  }), []);
  
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
        hasUnsavedChanges={!!unsavedGridOptions}
        onProfileLoad={loadProfile}
        onProfileSave={() => saveCurrentState()}
        onOpenSaveDialog={handleOpenSaveDialog}
        onOpenProfileDialog={handleOpenProfileDialog}
        sidebarVisible={sidebarVisible}
        onSidebarToggle={setSidebarVisible}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
        onOpenRenameDialog={handleOpenRenameDialog}
        onOpenGridOptions={handleOpenGridOptions}
        viewInstanceId={viewInstanceId}
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
      
      {/* Grid Options Editor in OpenFin Window */}
      <OpenFinPortalDialog
        open={showGridOptionsDialog}
        onOpenChange={handleGridOptionsDialogChange}
        windowName={`grid-options-${viewInstanceId}`}
        windowOptions={windowOptions}
      >
        <GridOptionsEditorContent
          currentOptions={gridOptionsForEditor || getDefaultGridOptions()}
          onApply={handleApplyGridOptions}
          onClose={() => handleGridOptionsDialogChange(false)}
          profileName={activeProfile?.name}
        />
      </OpenFinPortalDialog>
    </div>
  );
};

// Export with React.memo - since component has no props, it will only re-render on internal state changes
export const DataGridStompShared = React.memo(DataGridStompSharedComponent);