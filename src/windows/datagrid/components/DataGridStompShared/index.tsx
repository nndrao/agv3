import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfileManagement } from "@/hooks/useProfileManagement";
import { ProfileManagementDialog } from "@/components/ProfileManagementDialog";
import { SaveProfileDialog } from "@/components/SaveProfileDialog";
import { RenameViewDialog } from "@/components/RenameViewDialog";
import { ExpressionEditorDialogControlled } from '@/components/expression-editor/ExpressionEditorDialogControlled';
import { WindowManager } from "@/services/window/windowManager";
import { debugStorage } from "@/utils/storageDebug";
import { getViewInstanceId } from "@/utils/viewUtils";
import { ConditionalRule } from '@/components/conditional-formatting/types';

// Import all hooks - modularized business logic
import {
  useSharedWorkerConnection,
  useSnapshotData,
  useProviderConfig,
  useGridState,
  useViewTitle,
  useThemeSync,
  useDialogManagement,
  useProfileOperations,
  useConnectionManagement,
  useIABManagement,
  useColumnGroupManagement,
  useGridOptionsManagement
} from './hooks';

// Import components
import { Toolbar } from './components/Toolbar';
import { BusyIndicator } from './components/BusyIndicator';
import { DataGrid } from './components/DataGrid';

// Import types and config
import { DataGridStompSharedProfile } from './types';
import { DEFAULT_COL_DEF, getStatusBarConfig } from './config/gridConfig';
import { DEFAULT_PROFILE } from './config/profileDefaults';
import { COMPONENT_TYPE } from './config/constants';
import { getDefaultGridOptions } from './gridOptions/gridOptionsConfig';

// Import styles
import "@/index.css";
import "./gridOptions/styles.css";

/**
 * DataGridStompShared Component
 * 
 * A modular, performant data grid component with:
 * - Shared worker connection management
 * - Profile management and persistence
 * - Grid options and column group configuration
 * - Conditional formatting support
 * - Theme synchronization
 * 
 * Refactored for better maintainability with extracted hooks
 */
const DataGridStompSharedComponent = () => {
  const { toast } = useToast();
  
  // ========== Core State ==========
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  const [activeProfileData, setActiveProfileData] = useState<DataGridStompSharedProfile | null>(null);
  const [conditionalFormattingRules, setConditionalFormattingRules] = useState<ConditionalRule[]>([]);
  const [unsavedColumnGroups, setUnsavedColumnGroups] = useState<any[] | null>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  
  // ========== Refs ==========
  const isInitialMount = useRef(true);
  const viewInstanceId = useMemo(() => getViewInstanceId(), []);
  
  // ========== Custom Hooks - Core Functionality ==========
  const { providerConfig, columnDefs } = useProviderConfig(selectedProviderId);
  
  // Grid state management with all grid-related operations
  const { 
    gridApi, 
    columnApi, 
    onGridReady, 
    getRowId, 
    applyProfileGridState, 
    extractGridState, 
    extractFullGridState, 
    gridApiRef,
    setColumnGroups,
    getColumnGroups,
    getPendingColumnState,
    clearPendingColumnState,
    getPendingColumnGroupState,
    clearPendingColumnGroupState
  } = useGridState(providerConfig, activeProfileData, null);
  
  // Connection management
  const { connectionState, workerClient, connect, disconnect } = useSharedWorkerConnection(selectedProviderId, gridApiRef);
  const { snapshotData, handleSnapshotData, handleRealtimeUpdate, resetSnapshot, requestSnapshot } = useSnapshotData(gridApiRef);
  
  // UI state management
  const { currentViewTitle, saveViewTitle } = useViewTitle(viewInstanceId);
  const { isDarkMode, className, setTheme } = useThemeSync();
  
  // Grid options management
  const {
    unsavedGridOptions,
    handleApplyGridOptions,
    getCurrentGridOptions,
    clearUnsavedOptions,
    gridTheme
  } = useGridOptionsManagement({ gridApi, activeProfileData });
  
  // ========== Profile Application Complete Helper ==========
  const checkProfileApplicationComplete = useCallback(() => {
    // This function is called by profile operations hook
    // to check if profile loading is complete
  }, []);
  
  // ========== Profile Management ==========
  const handleProfileChange = useCallback((profile: DataGridStompSharedProfile) => {
    // Clear unsaved changes when loading a profile
    clearUnsavedOptions();
    setUnsavedColumnGroups(null);
    
    // On initial mount, apply all settings
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (profile.selectedProviderId) {
        setSelectedProviderId(profile.selectedProviderId);
      }
    }
    
    // Apply UI settings
    setSidebarVisible(profile.sidebarVisible ?? false);
    setShowColumnSettings(profile.showColumnSettings ?? false);
    
    // Apply grid state
    applyProfileGridState(profile);
  }, [applyProfileGridState, clearUnsavedOptions]);
  
  // Profile management hook
  const {
    profiles,
    activeProfile,
    activeProfileData: profileData,
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
  
  // Sync profile data
  useEffect(() => {
    if (profileData) {
      setActiveProfileData(profileData);
    }
  }, [profileData]);
  
  // ========== Profile Operations Hook ==========
  const {
    profileLoadingState,
    isProfileLoadingRef,
    handleProfileLoad,
    saveCurrentState,
    handleProfileExport,
    handleProfileImport,
    handleProfileRename,
    handleSetDefault
  } = useProfileOperations({
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
  });
  
  // ========== Connection Management Hook ==========
  const {
    connectToSharedWorker,
    disconnectFromSharedWorker,
    handleProviderChange
  } = useConnectionManagement({
    providerConfig,
    workerClient,
    selectedProviderId,
    activeProfileData,
    connectionState,
    connect,
    disconnect,
    resetSnapshot,
    requestSnapshot,
    handleSnapshotData,
    handleRealtimeUpdate
  });
  
  // ========== Column Group Management Hook ==========
  const { handleApplyColumnGroups } = useColumnGroupManagement({
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
  });
  
  // ========== Conditional Formatting Handler ==========
  const handleApplyConditionalFormatting = useCallback((rules: ConditionalRule[]) => {
    setConditionalFormattingRules(rules);
    toast({
      title: "Conditional Formatting Applied",
      description: `${rules.length} rule(s) have been applied to the grid`
    });
  }, [toast]);
  
  // ========== Dialog Management Hook ==========
  const {
    showProfileDialog,
    setShowProfileDialog,
    showSaveDialog,
    setShowSaveDialog,
    showRenameDialog,
    setShowRenameDialog,
    showExpressionEditor,
    setShowExpressionEditor,
    handleOpenGridOptions,
    handleOpenColumnGroups,
    handleOpenConditionalFormatting,
    handleOpenRenameDialog,
    handleOpenExpressionEditor,
    handleOpenSaveDialog,
    handleOpenProfileDialog,
    handleExpressionSave
  } = useDialogManagement({
    viewInstanceId,
    activeProfileName: activeProfile?.name,
    columnDefs,
    unsavedGridOptions,
    unsavedColumnGroups,
    currentGridOptions: getCurrentGridOptions(),
    currentColumnGroups: activeProfileData?.columnGroups,
    conditionalFormattingRules,
    onApplyGridOptions: handleApplyGridOptions,
    onApplyColumnGroups: handleApplyColumnGroups,
    onApplyConditionalFormatting: handleApplyConditionalFormatting
  });
  
  // ========== IAB Management Hook ==========
  useIABManagement({
    viewInstanceId,
    unsavedGridOptions,
    activeProfileData,
    columnDefs,
    conditionalFormattingRules
  });
  
  // ========== Window Instance Registration ==========
  useEffect(() => {
    debugStorage('DataGridStompShared Mount');
    
    // Extract a readable name from the ID
    let instanceName = 'DataGrid STOMP (Shared)';
    if (viewInstanceId.includes('instance-')) {
      const match = viewInstanceId.match(/instance-(\d+)/);
      if (match) {
        instanceName = `DataGrid STOMP (Shared) ${match[1]}`;
      }
    } else if (viewInstanceId.includes('datagrid-stomp-shared-')) {
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
  
  // ========== Handle rename dialog request from context menu ==========
  useEffect(() => {
    const checkRenameRequest = () => {
      if ((window as any).__requestRenameDialog) {
        delete (window as any).__requestRenameDialog;
        setShowRenameDialog(true);
      }
    };
    
    const interval = setInterval(checkRenameRequest, 100);
    return () => clearInterval(interval);
  }, [setShowRenameDialog]);
  
  // ========== Monitor column definitions changes ==========
  useEffect(() => {
    if (columnDefs.length > 0 && gridApi) {
      gridApi.setGridOption('columnDefs', columnDefs);
      setTimeout(() => {
        gridApi?.refreshCells({ force: true });
      }, 100);
    }
  }, [columnDefs, gridApi]);
  
  // ========== Apply theme changes to grid ==========
  useEffect(() => {
    if (gridApi) {
      setTimeout(() => {
        gridApi?.refreshCells({ force: true });
      }, 50);
    }
  }, [isDarkMode, gridApi]);
  
  // ========== Check if styles are loaded ==========
  useEffect(() => {
    const timer = setTimeout(() => setStylesLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // ========== Save Current State Handler ==========
  const handleSaveCurrentState = useCallback(async (saveAsNew = false, name?: string) => {
    const success = await saveCurrentState(
      selectedProviderId,
      connectionState,
      sidebarVisible,
      showColumnSettings,
      unsavedGridOptions,
      unsavedColumnGroups,
      getDefaultGridOptions,
      saveAsNew,
      name
    );
    
    if (success) {
      clearUnsavedOptions();
      setUnsavedColumnGroups(null);
    }
  }, [selectedProviderId, connectionState, sidebarVisible, showColumnSettings, 
      unsavedGridOptions, unsavedColumnGroups, saveCurrentState, clearUnsavedOptions]);
  
  // ========== Handler Callbacks ==========
  const handleSaveNewProfile = useCallback(async (name: string) => {
    await handleSaveCurrentState(true, name);
    setShowSaveDialog(false);
  }, [handleSaveCurrentState, setShowSaveDialog]);
  
  const handleProviderChangeWrapper = useCallback((providerId: string | null) => {
    setSelectedProviderId(handleProviderChange(providerId));
  }, [handleProviderChange]);
  
  const handleThemeToggle = useCallback(() => {
    setTheme(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setTheme]);
  
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
      
      if ((window as any).__renameDialogResolve) {
        (window as any).__renameDialogResolve({ success: false });
        delete (window as any).__renameDialogResolve;
      }
    }
  }, [saveViewTitle, toast]);
  
  // ========== Loading State ==========
  if (!stylesLoaded || profilesLoading) {
    return <div className="h-full flex items-center justify-center">Loading...</div>;
  }
  
  // ========== Main Render ==========
  return (
    <div className={className} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Toolbar */}
      <Toolbar
        connectionState={connectionState}
        selectedProviderId={selectedProviderId}
        onProviderChange={handleProviderChangeWrapper}
        onConnect={connectToSharedWorker}
        onDisconnect={disconnectFromSharedWorker}
        profiles={profiles}
        activeProfile={activeProfile}
        profilesLoading={profilesLoading}
        isSaving={isSaving}
        hasUnsavedChanges={!!unsavedGridOptions || !!unsavedColumnGroups}
        onProfileLoad={handleProfileLoad}
        onProfileSave={() => handleSaveCurrentState()}
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
      
      {/* Grid Container */}
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
          gridOptions={getCurrentGridOptions()}
        />
      </div>
      
      {/* Dialogs */}
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
      
      <SaveProfileDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveNewProfile}
        title='Create New Profile'
        initialName=''
      />
      
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
      
      <ExpressionEditorDialogControlled 
        open={showExpressionEditor}
        onOpenChange={setShowExpressionEditor}
        mode="conditional"
        availableColumns={columnDefs}
        onSave={handleExpressionSave}
      />
    </div>
  );
};

// Export with React.memo for performance optimization
export const DataGridStompShared = React.memo(DataGridStompSharedComponent);