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
import { OpenFinServiceProvider } from "@/services/openfin/OpenFinServiceProvider";
import { useOpenFinServices } from "@/services/openfin/useOpenFinServices";



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
import { useProfileApplication } from './hooks/useProfileApplication';


import { Toolbar } from './components/Toolbar';
import { BusyIndicator } from './components/BusyIndicator';
import { DataGrid } from './components/DataGrid';


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
  initializeConditionalFormatting,
  ConditionalFormattingRule as ConditionalFormattingRuleRT
} from '@/utils/conditionalFormattingRuntime';
import { GridConditionalFormattingStorage } from './conditionalFormatting';
import { GridCalculatedColumnsStorage } from './calculatedColumns';

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
  
  // Access centralized services (with fallback)
  let services: any = {};
  let logger: any;
  let configuration: any;
  let events: any;
  let windowOps: any;
  
  try {
    services = useOpenFinServices();
    logger = services.logger;
    configuration = services.configuration;
    events = services.events;
    windowOps = services.window;
  } catch (error) {
    console.warn('[DataGridStompShared] Services not available, using fallbacks:', error);
    // Provide fallback implementations
    logger = {
      info: (...args: any[]) => console.log('[DataGridStompShared]', ...args),
      warn: (...args: any[]) => console.warn('[DataGridStompShared]', ...args),
      error: (...args: any[]) => console.error('[DataGridStompShared]', ...args),
      debug: (...args: any[]) => console.debug('[DataGridStompShared]', ...args)
    };
    events = {
      on: () => () => {},
      emit: () => {},
      broadcast: () => Promise.resolve()
    };
  }
  
  // ========== Core State ==========
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);

  // Initialize conditional formatting rules from global storage (will be updated when profile loads)
  const [conditionalFormattingRules, setConditionalFormattingRules] = useState<ConditionalFormattingRuleRT[]>(() => {
    // Start with global storage for backward compatibility
    return loadConditionalFormattingRules();
  });
  const [unsavedColumnGroups, setUnsavedColumnGroups] = useState<any[] | null>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [columnGroupsApplied, setColumnGroupsApplied] = useState(false);
  
  const isInitialMount = useRef(true);
  const viewInstanceId = useMemo(() => getViewInstanceId(), []);
  const originalColumnDefsRef = useRef<any[]>([]);
  
  const { providerConfig, columnDefs: baseColumnDefs } = useProviderConfig(selectedProviderId);
  
  useEffect(() => {
    if (baseColumnDefs && baseColumnDefs.length > 0) {
      console.log('[DataGridStompShared] Storing original column definitions from provider');
      originalColumnDefsRef.current = JSON.parse(JSON.stringify(
        baseColumnDefs.map(col => ({
          ...col,
          enableCellChangeFlash: true
        }))
      ));
    }
  }, [baseColumnDefs, selectedProviderId]);
  
  const gridInstanceId = useMemo(() => `grid-${viewInstanceId}`, [viewInstanceId]);
  
  useEffect(() => {
    initializeConditionalFormatting(gridInstanceId, conditionalFormattingRules);
    
    return () => {
      cleanupConditionalFormatting(gridInstanceId);
    };
  }, [gridInstanceId, conditionalFormattingRules]);

  // Migration effect - migrate global conditional formatting rules to grid-level storage
  useEffect(() => {
    const migrateGlobalRules = () => {
      try {
        const globalRules = loadConditionalFormattingRules();
        if (globalRules.length > 0) {
          console.log('[DataGridStompShared] Migrating conditional formatting rules to grid-level storage');
          GridConditionalFormattingStorage.migrateFromGlobalRules(gridInstanceId, globalRules);
        }
      } catch (error) {
        console.error('[DataGridStompShared] Global rules migration error:', error);
      }
    };

    // Run once when component mounts
    migrateGlobalRules();
  }, [gridInstanceId]);


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

  const [tempActiveProfileData, setTempActiveProfileData] = useState<DataGridStompSharedProfile | null>(null);
  const rowClassRules = useMemo(() => {
    return getRowClassRules(conditionalFormattingRules, gridInstanceId);
  }, [conditionalFormattingRules, gridInstanceId]);
  
  const { currentViewTitle, saveViewTitle } = useViewTitle(viewInstanceId);
  const { isDarkMode, className, setTheme } = useThemeSync();
  
  const checkProfileApplicationComplete = useCallback(() => {
  }, []);
  
  const profileChangeHandlerRef = useRef<((profile: DataGridStompSharedProfile) => void) | null>(null);
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
    importProfile,
    isSavingProfileRef
  } = useProfileManagement<DataGridStompSharedProfile>({
    viewInstanceId,
    componentType: COMPONENT_TYPE,
    defaultProfile: DEFAULT_PROFILE,
    onProfileChange: (profile) => {
      if (profileChangeHandlerRef.current) {
        profileChangeHandlerRef.current(profile);
      }
    },
    debug: false
  });
  
  // Sync tempActiveProfileData with the real activeProfileData
  useEffect(() => {
    console.log('[🔍 PROFILE-SYNC-001] Syncing activeProfileData to tempActiveProfileData', {
      hasActiveProfileData: !!activeProfileData,
      calculatedColumns: activeProfileData?.calculatedColumns?.length || 0,
      columnGroups: activeProfileData?.columnGroups?.length || 0,
      columnGroupsDetail: activeProfileData?.columnGroups
    });
    setTempActiveProfileData(activeProfileData);
  }, [activeProfileData]);

  // Update conditional formatting rules when profile changes
  useEffect(() => {
    if (activeProfileData?.conditionalFormattingRules) {
      // Load active rules from grid-level storage based on profile IDs
      const activeRules = GridConditionalFormattingStorage.getRules(gridInstanceId, activeProfileData.conditionalFormattingRules);
      setConditionalFormattingRules(activeRules);
      console.log('[DataGridStompShared] Updated conditional formatting rules from profile:', activeRules.length);
    }
  }, [activeProfileData?.conditionalFormattingRules, gridInstanceId]);

  // Profile-specific migration effect - runs when activeProfileData is available
  useEffect(() => {
    if (!activeProfileData) return;

    const migrateProfileData = async () => {
      try {
        let needsProfileUpdate = false;
        const updatedProfile = { ...activeProfileData };

        // Migrate calculated columns from profile-level storage if they're objects (old format)
        if (activeProfileData.calculatedColumns && Array.isArray(activeProfileData.calculatedColumns) && activeProfileData.calculatedColumns.length > 0) {
          const firstItem = activeProfileData.calculatedColumns[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            console.log('[DataGridStompShared] Migrating calculated columns to grid-level storage');
            const migratedColumnIds = GridCalculatedColumnsStorage.migrateFromProfileColumns(
              gridInstanceId, 
              activeProfileData.calculatedColumns as any[]
            );
            updatedProfile.calculatedColumns = migratedColumnIds;
            needsProfileUpdate = true;
          }
        }

        // If we migrated global rules and profile has no rule references, add them
        const allGridRules = GridConditionalFormattingStorage.loadRules(gridInstanceId);
        if (allGridRules.length > 0 && (!activeProfileData.conditionalFormattingRules || activeProfileData.conditionalFormattingRules.length === 0)) {
          console.log('[DataGridStompShared] Adding migrated rules to profile');
          updatedProfile.conditionalFormattingRules = allGridRules.map(rule => rule.id);
          needsProfileUpdate = true;
        }

        // Save profile if we made changes
        if (needsProfileUpdate) {
          await saveProfile(updatedProfile, false, updatedProfile.name);
        }
      } catch (error) {
        console.error('[DataGridStompShared] Profile migration error:', error);
      }
    };

    migrateProfileData();
  }, [activeProfileData?.name, gridInstanceId, saveProfile]); // Only run when profile name changes (new profile loaded)
  
  const { 
    gridApi, 
    columnApi, 
    onGridReady: onGridReadyBase, 
    getRowId, 
    applyProfileGridState, 
    extractGridState, 
    extractFullGridState, 
    gridApiRef,
    setColumnGroups,
    getColumnGroups,
    getPendingColumnState,
    clearPendingColumnState,
    gridStateManagerRef
  } = useGridState(providerConfig, activeProfileData, null, isSavingProfileRef);
  const {
    unsavedGridOptions,
    handleApplyGridOptions,
    getCurrentGridOptions,
    clearUnsavedOptions,
    gridTheme
  } = useGridOptionsManagement({ gridApi, activeProfileData });
  
  const { connectionState, workerClient, connect, disconnect } = useSharedWorkerConnection(selectedProviderId, gridApiRef);
  
  // Log connection state changes
  useEffect(() => {
    if (connectionState) {
      logger.info('Connection state changed', { 
        providerId: selectedProviderId,
        isConnecting: connectionState.isConnecting,
        isConnected: connectionState.isConnected,
        mode: connectionState.mode
      });
    }
  }, [connectionState, selectedProviderId, logger]);
  const { snapshotData, handleSnapshotData, handleRealtimeUpdate, resetSnapshot, requestSnapshot } = useSnapshotData(gridApiRef);
  const { applyProfile } = useProfileApplication({
    gridApiRef,
    originalColumnDefsRef,
    gridStateManagerRef,
    providerConfig,
    conditionalFormattingRules,
    gridInstanceId
  });
  
  // Simple ref-based profile change tracking
  const pendingProfileRef = useRef<DataGridStompSharedProfile | null>(null);
  const profileChangeRequiredRef = useRef<boolean>(false);
  
  const onGridReady = useCallback((params: any) => {
    onGridReadyBase(params);
    
    // Apply pending profile if one exists
    if (profileChangeRequiredRef.current && pendingProfileRef.current) {
      applyProfile(pendingProfileRef.current);
      profileChangeRequiredRef.current = false;
      pendingProfileRef.current = null;
    } else if (activeProfileData) {
      // Fallback: apply activeProfileData if no pending profile
      applyProfile(activeProfileData);
    }
  }, [onGridReadyBase, applyProfile, activeProfileData]);
  
  useEffect(() => {
    profileChangeHandlerRef.current = (profile: DataGridStompSharedProfile) => {
      // Store profile and mark for application
      pendingProfileRef.current = profile;
      profileChangeRequiredRef.current = true;
      
      // Clear unsaved changes
      clearUnsavedOptions();
      setUnsavedColumnGroups(null);
      
      // Update UI state immediately
      setSidebarVisible(profile.sidebarVisible ?? false);
      setShowColumnSettings(profile.showColumnSettings ?? false);
      
      // Set provider on initial mount
      if (isInitialMount.current && profile.selectedProviderId) {
        setSelectedProviderId(profile.selectedProviderId);
        isInitialMount.current = false;
      }
      
      // Apply immediately if grid is ready
      if (gridApiRef.current) {
        applyProfile(profile);
        profileChangeRequiredRef.current = false;
        pendingProfileRef.current = null;
        
        // Update the hash to reflect the newly applied profile
        const profileHash = JSON.stringify({
          name: profile.name,
          columnGroups: profile.columnGroups,
          gridOptions: profile.gridOptions,
          selectedProviderId: profile.selectedProviderId,
          sidebarVisible: profile.sidebarVisible
        });
        lastAppliedProfileRef.current = profileHash;
      }
    };
  }, [applyProfile, clearUnsavedOptions, gridApiRef]);

  // Track the last applied profile to avoid unnecessary reapplications
  const lastAppliedProfileRef = useRef<string | null>(null);
  
  // Backup mechanism for direct activeProfileData changes
  // Skip application if we're currently saving a profile to avoid unnecessary refresh
  useEffect(() => {
    if (activeProfileData && 
        gridApiRef.current && 
        !profileChangeRequiredRef.current) {
      
      // Create a simple hash of the profile to detect actual changes
      const profileHash = JSON.stringify({
        name: activeProfileData.name,
        columnGroups: activeProfileData.columnGroups,
        gridOptions: activeProfileData.gridOptions,
        selectedProviderId: activeProfileData.selectedProviderId,
        sidebarVisible: activeProfileData.sidebarVisible
      });
      
      // Skip if we're saving or if this is the same profile we just applied
      if (isSavingProfileRef.current) {
        console.log('[🔍 MAIN-PROFILE-SKIP] Skipping profile application during save operation');
        return;
      }
      
      if (lastAppliedProfileRef.current === profileHash) {
        console.log('[🔍 MAIN-PROFILE-SKIP] Skipping profile application - no meaningful changes detected');
        return;
      }
      
      console.log('[🔍 MAIN-PROFILE-APPLY] Applying profile due to activeProfileData change');
      applyProfile(activeProfileData);
      lastAppliedProfileRef.current = profileHash;
    }
  }, [activeProfileData, gridApiRef, applyProfile]);
  
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
    checkProfileApplicationComplete,
    gridInstanceId,
    gridApiRef,
    isSavingProfileRef
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
    columnDefs: baseColumnDefs || [],
    activeProfileData,
    unsavedColumnGroups,
    setUnsavedColumnGroups,
    getColumnGroups,
    setColumnGroups,
    getPendingColumnState,
    clearPendingColumnState,
    isProfileLoadingRef,
    checkProfileApplicationComplete,
    setColumnGroupsApplied,
    isSavingProfileRef,
    gridInstanceId
  });
  
  // ========== Conditional Formatting Handler ==========
  const handleApplyConditionalFormatting = useCallback(async (activeRuleIds: string[], allRules: ConditionalFormattingRuleRT[]) => {
    console.log('[DataGridStompShared] handleApplyConditionalFormatting called with:', {
      activeRuleIds,
      allRulesCount: allRules.length
    });
    
    if (!activeProfileData) {
      console.error('[DataGridStompShared] No active profile data available');
      return;
    }

    try {
      // Save all rules to grid-level storage
      allRules.forEach(rule => {
        GridConditionalFormattingStorage.saveRule(gridInstanceId, rule);
      });
      console.log('[DataGridStompShared] All rules saved to grid-level storage');

      // Get active rules for application
      const activeRules = GridConditionalFormattingStorage.getRules(gridInstanceId, activeRuleIds);
      console.log('[DataGridStompShared] Retrieved active rules:', activeRules.length);

      // Update the profile with the active rule IDs
      const updated: DataGridStompSharedProfile = { 
        ...activeProfileData, 
        conditionalFormattingRules: activeRuleIds
      };

      // Save the profile
      await saveProfile(updated, false, updated.name);
      console.log('[DataGridStompShared] Profile updated with conditional formatting rule IDs');

      // Update local state for immediate application
      setConditionalFormattingRules(activeRules);
      
      // Re-initialize formatting with active rules
      initializeConditionalFormatting(gridInstanceId, activeRules);
      console.log('[DataGridStompShared] Conditional formatting re-initialized for grid:', gridInstanceId);
      
      // Update temp state to trigger profile application (includes column def updates)
      setTempActiveProfileData(updated);
      
      // Apply the profile immediately to ensure column definitions are updated
      if (gridApi) {
        console.log('[DataGridStompShared] Applying profile to update column definitions with formatting');
        applyProfile(updated);
        
        // Force grid refresh to apply new formatting immediately
        setTimeout(() => {
          console.log('[DataGridStompShared] Refreshing grid cells to show conditional formatting');
          gridApi.refreshCells({ force: true });
          // Also refresh headers in case row-level formatting affects them
          gridApi.refreshHeader();
        }, 10);
      }
      
      toast({
        title: "Conditional Formatting Applied",
        description: `${activeRules.length} rule(s) have been applied to the grid`
      });
    } catch (error) {
      console.error('[DataGridStompShared] Error applying conditional formatting:', error);
      toast({
        title: "Error",
        description: "Failed to apply conditional formatting rules",
        variant: "destructive"
      });
    }
  }, [activeProfileData, saveProfile, gridInstanceId, gridApi, toast]);

  // ========== Calculated Columns Handler ==========
  const handleApplyCalculatedColumns = useCallback(async (activeColumnIds: string[], allColumns: CalculatedColumnDefinition[]) => {
    console.log('[DataGridStompShared] handleApplyCalculatedColumns called with:', {
      activeColumnIds,
      allColumnsCount: allColumns.length
    });
    
    if (!activeProfileData) {
      console.error('[DataGridStompShared] No active profile data available');
      toast({ 
        title: 'No Active Profile', 
        description: 'Select a profile before saving calculated columns', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Save all columns to grid-level storage
      allColumns.forEach(column => {
        GridCalculatedColumnsStorage.saveColumn(gridInstanceId, column);
      });
      console.log('[DataGridStompShared] All columns saved to grid-level storage');

      // Update the profile with the active column IDs
      const updated: DataGridStompSharedProfile = { 
        ...activeProfileData, 
        calculatedColumns: activeColumnIds
      };

      // Save the profile
      await saveProfile(updated, false, updated.name);
      console.log('[DataGridStompShared] Profile updated with calculated column IDs');

      // Update temp state to trigger profile application (includes column def updates)
      setTempActiveProfileData(updated);
      
      // Apply the profile immediately to ensure column definitions are updated
      if (gridApi) {
        console.log('[DataGridStompShared] Applying profile to update column definitions with calculated columns');
        applyProfile(updated);
        
        // Force grid refresh to show new columns immediately
        setTimeout(() => {
          console.log('[DataGridStompShared] Refreshing grid to show calculated columns');
          gridApi.refreshCells({ force: true });
          // Also refresh headers to show new column headers
          gridApi.refreshHeader();
        }, 10);
      }

      console.log('[DataGridStompShared] Applied', activeColumnIds.length, 'calculated columns');

      toast({ 
        title: 'Calculated Columns Applied', 
        description: `${activeColumnIds.length} column(s) have been applied to the grid` 
      });
    } catch (error) {
      console.error('[DataGridStompShared] Error applying calculated columns:', error);
      toast({
        title: "Error",
        description: "Failed to apply calculated columns",
        variant: "destructive"
      });
    }
  }, [activeProfileData, saveProfile, gridInstanceId, toast]);
  
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
    columnDefs: baseColumnDefs || [],
    unsavedGridOptions,
    unsavedColumnGroups,
    currentGridOptions: getCurrentGridOptions(),
    currentColumnGroups: activeProfileData?.columnGroups,
    conditionalFormattingRules: (conditionalFormattingRules as any),
    onApplyGridOptions: handleApplyGridOptions,
    onApplyColumnGroups: handleApplyColumnGroups,
    onApplyConditionalFormatting: handleApplyConditionalFormatting,
    onApplyCalculatedColumns: handleApplyCalculatedColumns,
    currentCalculatedColumns: activeProfileData?.calculatedColumns, // Now stores column IDs
    gridInstanceId
  });
  
  // ========== IAB Management Hook ==========
  useIABManagement({
    viewInstanceId,
    unsavedGridOptions,
    activeProfileData,
    columnDefs: baseColumnDefs || [],
    conditionalFormattingRules: (conditionalFormattingRules as any)
  });
  
  // ========== Window Instance Registration ==========
  useEffect(() => {
    debugStorage('DataGridStompShared Mount');
    logger.info('DataGridStompShared component mounted', { viewInstanceId });
    
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
    logger.debug('View instance registered', { viewInstanceId, instanceName });
    
    // Title restoration is now handled by useViewTitle hook which uses Configuration Service
    // Set initial title - useViewTitle hook will restore saved title if available
    document.title = instanceName;
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
  
  // Column definitions are now handled centrally in useProfileApplication
  // This effect has been removed to prevent conflicts
  
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
  
  // Initial mount completion is now handled in the profile change handler
  
  // ========== Save Current State Handler ==========
  const handleSaveCurrentState = useCallback(async (saveAsNew = false, name?: string) => {
    console.log('[🔍 MAIN-SAVE-001] handleSaveCurrentState called with:', {
      saveAsNew,
      name,
      unsavedColumnGroups: unsavedColumnGroups,
      unsavedGridOptions: !!unsavedGridOptions
    });
    
    // Set saving flag to prevent unnecessary profile reapplication
    isSavingProfileRef.current = true;
    
    try {
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
        console.log('[🔍 MAIN-SAVE-002] Save successful, clearing unsaved changes');
        clearUnsavedOptions();
        // Clear unsaved column groups only after successful save
        // The saved groups are now in the profile
        setUnsavedColumnGroups(null);
        // Keep columnGroupsApplied as true since the groups are still applied
        // They're just moved from unsaved to saved state
        console.log('[🔍 MAIN-SAVE-003] Cleared unsaved column groups after successful save, columnGroupsApplied remains:', columnGroupsApplied);
        
        // Verify grid still has column groups after save
        setTimeout(() => {
          if (gridApi) {
            const currentDefs = gridApi.getColumnDefs();
            const hasGroups = currentDefs?.some((col: any) => col.children && col.children.length > 0);
            console.log('[🔍 MAIN-SAVE-005] Grid state after save:', {
              hasColumnGroups: hasGroups,
              columnDefsCount: currentDefs?.length,
              profileHasGroups: !!activeProfileData?.columnGroups?.length,
              columnGroupsApplied
            });
          }
        }, 100);
      } else {
        console.log('[🔍 MAIN-SAVE-004] Save failed, keeping unsaved changes');
      }
    } finally {
      // Clear saving flag after a short delay to allow profile management to complete
      setTimeout(() => {
        isSavingProfileRef.current = false;
        console.log('[🔍 MAIN-SAVE-006] Cleared saving flag, profile reapplication re-enabled');
      }, 500);
    }
  }, [selectedProviderId, connectionState, sidebarVisible, showColumnSettings, 
      unsavedGridOptions, unsavedColumnGroups, saveCurrentState, clearUnsavedOptions, columnGroupsApplied]);
  
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
    console.log('[DataGridStompShared] Loading state:', { stylesLoaded, profilesLoading });
    return <div className="h-full w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-lg">Loading DataGrid...</div>
    </div>;
  }
  
  console.log('[DataGridStompShared] Rendering main component');
  
  // ========== Main Render ==========
  return (
    <div className={`${className} min-h-screen bg-background`} data-theme={isDarkMode ? 'dark' : 'light'}>
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
          columnDefs={baseColumnDefs || []}
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
        availableColumns={baseColumnDefs || []}
        onSave={handleExpressionSave}
      />
    </div>
  );
};

// Wrap with OpenFinServiceProvider
const DataGridStompSharedWithServices = () => {
  const viewId = useMemo(() => getViewInstanceId(), []);
  
  return (
    <OpenFinServiceProvider
      viewId={viewId}
      services={['configuration', 'logging', 'events', 'window', 'appVariables']}
      logLevel="info"
      logToConsole={true}
      logToIndexedDB={true}
      subscribeToWorkspaceEvents={true}
      subscribeToThemeEvents={true}
      subscribeToProfileEvents={true}
      enableCaching={true}
    >
      <DataGridStompSharedComponent />
    </OpenFinServiceProvider>
  );
};

// Export without React.memo to avoid double initialization issues
export const DataGridStompShared = DataGridStompSharedWithServices;