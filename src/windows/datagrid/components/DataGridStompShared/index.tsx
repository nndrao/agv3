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
import { ConditionalFormattingRule as ConditionalFormattingRuleRT } from '@/utils/conditionalFormattingRuntime';

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
import { DataGridStompSharedProfile, CalculatedColumnDefinition } from './types';
import { DEFAULT_COL_DEF, getStatusBarConfig } from './config/gridConfig';
import { DEFAULT_PROFILE } from './config/profileDefaults';
import { COMPONENT_TYPE } from './config/constants';
import { getDefaultGridOptions } from './gridOptions/gridOptionsConfig';
import { 
  loadConditionalFormattingRules,
  saveConditionalFormattingRules,
  applyConditionalFormattingToColumns,
  getRowClassRules,
  cleanupConditionalFormatting,
  initializeConditionalFormatting
} from '@/utils/conditionalFormattingRuntime';

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
  // Removed local state - using profileData directly from hook to avoid sync issues
  // const [activeProfileData, setActiveProfileData] = useState<DataGridStompSharedProfile | null>(null);
  const [conditionalFormattingRules, setConditionalFormattingRules] = useState<ConditionalFormattingRuleRT[]>(() => loadConditionalFormattingRules());
  const [unsavedColumnGroups, setUnsavedColumnGroups] = useState<any[] | null>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  
  // ========== Refs ==========
  const isInitialMount = useRef(true);
  const viewInstanceId = useMemo(() => getViewInstanceId(), []);
  
  // ========== Custom Hooks - Core Functionality ==========
  const { providerConfig, columnDefs: baseColumnDefs } = useProviderConfig(selectedProviderId);
  
  // ========== Conditional Formatting Rules ==========
  const gridInstanceId = useMemo(() => `grid-${viewInstanceId}`, [viewInstanceId]);
  
  // Initialize conditional formatting for this grid instance
  useEffect(() => {
    initializeConditionalFormatting(gridInstanceId, conditionalFormattingRules);
    
    // Cleanup on unmount
    return () => {
      cleanupConditionalFormatting(gridInstanceId);
    };
  }, [gridInstanceId, conditionalFormattingRules]);
  
  // Reload rules when they change in storage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'conditionalFormattingRules' && e.newValue) {
        try {
          const newRules = JSON.parse(e.newValue);
          setConditionalFormattingRules(newRules);
          initializeConditionalFormatting(gridInstanceId, newRules);
        } catch (error) {
          console.error('Failed to parse conditional rules from storage:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [gridInstanceId]);

  // Temporary state for activeProfileData until the hook is properly initialized
  const [tempActiveProfileData, setTempActiveProfileData] = useState<DataGridStompSharedProfile | null>(null);
  
  // Apply conditional rules to column definitions
  const columnDefs = useMemo(() => {
    if (!baseColumnDefs) {
      return baseColumnDefs;
    }

    // Start with provider/base columns
    let defs = applyConditionalFormattingToColumns(baseColumnDefs, conditionalFormattingRules, gridInstanceId);

    // Append calculated columns from active profile
    const calcCols: CalculatedColumnDefinition[] | undefined = tempActiveProfileData?.calculatedColumns;
    console.log('[DataGridStompShared] Building columnDefs with calculated columns:', calcCols);
    if (calcCols && calcCols.length > 0) {
      const appended = calcCols.map(col => {
        const valueGetter = (params: any) => {
          try {
            // Convert [Field] to params.data.Field
            const expr = (col.expression || '').replace(/\[([^\]]+)\]/g, 'params.data.$1');
            // eslint-disable-next-line no-new-func
            const fn = new Function('params', `try { const data = params.data; const value = undefined; return (${expr}); } catch(e){ return undefined; }`);
            return fn(params);
          } catch {
            return undefined;
          }
        };
        const def: any = {
          field: col.field,
          headerName: col.headerName || col.field,
          valueGetter,
          cellDataType: col.cellDataType || 'text',
          pinned: col.pinned,
          width: col.width,
        };
        if (col.valueFormatter) {
          def.valueFormatter = col.valueFormatter;
        }
        return def;
      });
      defs = [...defs, ...appended];
    }

    return defs;
  }, [baseColumnDefs, conditionalFormattingRules, gridInstanceId, tempActiveProfileData]);
  
  // Get row class rules for row-level formatting
  const rowClassRules = useMemo(() => {
    return getRowClassRules(conditionalFormattingRules, gridInstanceId);
  }, [conditionalFormattingRules, gridInstanceId]);
  
  // UI state management - doesn't depend on activeProfileData or gridApiRef
  const { currentViewTitle, saveViewTitle } = useViewTitle(viewInstanceId);
  const { isDarkMode, className, setTheme } = useThemeSync();
  
  // ========== Profile Application Complete Helper ==========
  const checkProfileApplicationComplete = useCallback(() => {
    // This function is called by profile operations hook
    // to check if profile loading is complete
  }, []);
  
  // Create a ref to hold the profile change handler
  const profileChangeHandlerRef = useRef<((profile: DataGridStompSharedProfile) => void) | null>(null);
  
  // Profile management hook
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
    onProfileChange: (profile) => {
      // Call the handler if it's been set
      if (profileChangeHandlerRef.current) {
        profileChangeHandlerRef.current(profile);
      }
    },
    debug: false
  });
  
  // Sync tempActiveProfileData with the real activeProfileData
  useEffect(() => {
    console.log('[DataGridStompShared] Syncing activeProfileData to tempActiveProfileData', {
      activeProfileData,
      calculatedColumns: activeProfileData?.calculatedColumns
    });
    setTempActiveProfileData(activeProfileData);
  }, [activeProfileData]);
  
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
  
  // Grid options management
  const {
    unsavedGridOptions,
    handleApplyGridOptions,
    getCurrentGridOptions,
    clearUnsavedOptions,
    gridTheme
  } = useGridOptionsManagement({ gridApi, activeProfileData });
  
  // Connection management - depends on gridApiRef
  const { connectionState, workerClient, connect, disconnect } = useSharedWorkerConnection(selectedProviderId, gridApiRef);
  const { snapshotData, handleSnapshotData, handleRealtimeUpdate, resetSnapshot, requestSnapshot } = useSnapshotData(gridApiRef);
  
  // ========== Profile Change Handler ==========
  // Now that we have all the required functions, set up the profile change handler
  useEffect(() => {
    profileChangeHandlerRef.current = (profile: DataGridStompSharedProfile) => {
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
    };
  }, [applyProfileGridState, clearUnsavedOptions]);
  
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
  const handleApplyConditionalFormatting = useCallback((rules: ConditionalFormattingRuleRT[]) => {
    console.log('[DataGridStompShared] handleApplyConditionalFormatting called with rules:', rules);
    console.log('[DataGridStompShared] Rule details:', JSON.stringify(rules, null, 2));
    
    // Save rules to localStorage using the utility function
    saveConditionalFormattingRules(rules);
    console.log('[DataGridStompShared] Rules saved to localStorage');
    
    // Verify what was saved
    const savedRules = localStorage.getItem('conditionalFormattingRules');
    console.log('[DataGridStompShared] Verified saved rules:', savedRules ? JSON.parse(savedRules) : null);
    
    // Update local state
    setConditionalFormattingRules(rules);
    console.log('[DataGridStompShared] Local state updated');
    
    // Re-initialize formatting with new rules
    initializeConditionalFormatting(gridInstanceId, rules);
    console.log('[DataGridStompShared] Conditional formatting re-initialized for grid:', gridInstanceId);
    
    // Force grid refresh to apply new formatting
    if (gridApi) {
      console.log('[DataGridStompShared] Refreshing grid cells');
      gridApi.refreshCells({ force: true });
    } else {
      console.warn('[DataGridStompShared] Grid API not available, cannot refresh cells');
    }
    
    toast({
      title: "Conditional Formatting Applied",
      description: `${rules.length} rule(s) have been applied to the grid`
    });
  }, [gridInstanceId, gridApi, toast]);

  // ========== Calculated Columns Handler ==========
  const handleApplyCalculatedColumns = useCallback(async (cols: CalculatedColumnDefinition[]) => {
    console.log('[DataGridStompShared] handleApplyCalculatedColumns called with columns:', cols);
    
    if (!activeProfileData) {
      toast({ title: 'No Active Profile', description: 'Select a profile before saving calculated columns', variant: 'destructive' });
      return;
    }
    
    const updated: DataGridStompSharedProfile = { ...activeProfileData, calculatedColumns: cols };
    console.log('[DataGridStompShared] Saving profile with calculated columns:', updated);
    
    await saveProfile(updated, false, updated.name);
    
    // Force update tempActiveProfileData immediately to apply columns to grid
    console.log('[DataGridStompShared] Updating tempActiveProfileData with calculated columns');
    setTempActiveProfileData(updated);
    
    toast({ title: 'Calculated Columns Saved', description: `${cols.length} column(s) saved to profile` });
  }, [activeProfileData, saveProfile, toast]);
  
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
    handleOpenCalculatedColumns,
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
    conditionalFormattingRules: (conditionalFormattingRules as any),
    onApplyGridOptions: handleApplyGridOptions,
    onApplyColumnGroups: handleApplyColumnGroups,
    onApplyConditionalFormatting: handleApplyConditionalFormatting,
    onApplyCalculatedColumns: handleApplyCalculatedColumns,
    currentCalculatedColumns: activeProfileData?.calculatedColumns
  });
  
  // ========== IAB Management Hook ==========
  useIABManagement({
    viewInstanceId,
    unsavedGridOptions,
    activeProfileData,
    columnDefs,
    conditionalFormattingRules: (conditionalFormattingRules as any)
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
      // Only update columnDefs if they've actually changed structurally
      const currentDefs = gridApi.getColumnDefs();
      const hasStructuralChange = JSON.stringify(currentDefs?.map((c: any) => c.field)) !== 
                                  JSON.stringify(columnDefs.map(c => c.field));
      
      if (hasStructuralChange) {
        console.log('[DataGridStompShared] Updating column definitions - structural change detected');
        gridApi.setGridOption('columnDefs', columnDefs);
        setTimeout(() => {
          gridApi?.refreshCells({ force: true });
        }, 100);
      }
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
        onOpenCalculatedColumns={handleOpenCalculatedColumns}
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
          rowClassRules={rowClassRules}
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