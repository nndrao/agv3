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
import { ProfileStatusIndicator, useProfileStatus } from './components/ProfileStatusIndicator';
import { GridOptionsEditorContent } from './gridOptions/GridOptionsEditor';
import { ColumnGroupEditorContent } from './columnGroups/ColumnGroupEditor';
import { ColumnGroupService } from './columnGroups/columnGroupService';
import { ConditionalFormattingEditorContent } from './conditionalFormatting/ConditionalFormattingEditorContent';
import { OpenFinPortalDialog } from '@/components/ui/openfin-portal-dialog';
import { ExpressionEditorDialogControlled } from '@/components/expression-editor/ExpressionEditorDialogControlled';
import { GridConfigurationBus } from '@/services/iab/GridConfigurationBus';
import { ConditionalRule } from '@/components/conditional-formatting/types';

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

// Simple expression evaluator for conditional formatting
function evaluateExpression(expression: string, context: any): boolean {
  try {
    // Replace variable references with actual values
    let evaluableExpression = expression;
    
    // Replace value references
    evaluableExpression = evaluableExpression.replace(/\bvalue\b/g, JSON.stringify(context.value));
    
    // Replace column references (e.g., data.columnName)
    evaluableExpression = evaluableExpression.replace(/data\.(\w+)/g, (match, columnName) => {
      return JSON.stringify(context.data[columnName]);
    });
    
    // Replace rowIndex
    evaluableExpression = evaluableExpression.replace(/\browIndex\b/g, context.rowIndex);
    
    // Basic safety check - only allow certain characters and operators
    if (!/^[0-9a-zA-Z\s\.\-+*/<>=!&|()'"]+$/.test(evaluableExpression)) {
      console.warn('Expression contains unsafe characters:', evaluableExpression);
      return false;
    }
    
    // Evaluate the expression
    // Note: In production, use a proper expression parser/evaluator
    return Function('"use strict"; return (' + evaluableExpression + ')')();
  } catch (error) {
    console.error('Error evaluating expression:', expression, error);
    return false;
  }
}

const DataGridStompSharedComponent = () => {
  const { toast } = useToast();
  const profileStatus = useProfileStatus();
  
  // State
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showGridOptionsDialog, setShowGridOptionsDialog] = useState(false);
  const [gridOptionsForEditor, setGridOptionsForEditor] = useState<Record<string, any> | null>(null);
  const [showColumnGroupDialog, setShowColumnGroupDialog] = useState(false);
  const [showExpressionEditor, setShowExpressionEditor] = useState(false);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [unsavedGridOptions, setUnsavedGridOptions] = useState<Record<string, any> | null>(null);
  const [unsavedColumnGroups, setUnsavedColumnGroups] = useState<any[] | null>(null);
  const [conditionalFormattingRules, setConditionalFormattingRules] = useState<ConditionalRule[]>([]);
  
  // Stable refs for dialog state
  const gridOptionsDialogRef = useRef(false);
  
  // Refs for lifecycle management
  const isInitialMount = useRef(true);
  const hasAutoConnected = useRef(false);
  // Removed isApplyingProfileRef - no longer needed with proper sequencing
  
  // Get view instance ID from query parameters
  const viewInstanceId = useMemo(() => getViewInstanceId(), []);
  
  // State for active profile data - needed before hooks
  const [activeProfileData, setActiveProfileData] = useState<DataGridStompSharedProfile | null>(null);
  
  // Track if we're in the middle of switching profiles
  const switchingProfileRef = useRef(false);
  
  // Profile status callbacks for useGridState
  const profileStatusCallbacks = useMemo(() => ({
    onProfileApplying: (profileName: string) => {
      console.log('[profileStatusCallbacks] onProfileApplying called, current operation:', profileStatus.operation);
      // If we're already switching, keep that status, otherwise show applying
      if (profileStatus.operation !== 'switching') {
        profileStatus.startOperation('applying', profileName);
      }
    },
    onProfileApplied: (profileName: string, success: boolean, error?: string) => {
      console.log('[profileStatusCallbacks] onProfileApplied called - success:', success);
      console.log('[profileStatusCallbacks] switchingProfileRef.current:', switchingProfileRef.current);
      // Don't complete immediately if we're switching - wait for column groups to be applied
      // The column groups effect will complete the operation
      if (!switchingProfileRef.current) {
        profileStatus.completeOperation(success, error);
      }
    }
  }), [profileStatus]);
  
  // Custom hooks - order matters for dependencies
  const { providerConfig, columnDefs } = useProviderConfig(selectedProviderId);
  const { gridApi, columnApi, onGridReady, getRowId, applyProfileGridState, extractGridState, extractFullGridState, resetGridState, gridApiRef, setColumnGroups, getColumnGroups, getPendingColumnState, clearPendingColumnState, getPendingColumnGroupState, clearPendingColumnGroupState } = useGridState(providerConfig, activeProfileData, profileStatusCallbacks);
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
  
  // Handle conditional formatting rules apply
  const handleApplyConditionalFormatting = useCallback((rules: ConditionalRule[]) => {
    console.log('[handleApplyConditionalFormatting] Applying rules:', rules);
    
    if (!gridApi) {
      console.error('[handleApplyConditionalFormatting] GridAPI not available');
      toast({
        title: "Error",
        description: "Grid API not available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Store the rules
      setConditionalFormattingRules(rules);
      
      // Get current column definitions
      const currentColDefs = gridApi.getColumnDefs() || [];
      
      // Sort rules by priority (lower number = higher priority)
      const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
      
      // Update column definitions with conditional formatting
      const updatedColDefs = currentColDefs.map(colDef => {
        const newColDef = { ...colDef };
        
        // Find rules that apply to this column
        const applicableRules = sortedRules.filter(rule => {
          if (!rule.enabled) return false;
          // Check if rule applies to this specific column
          if (rule.scope.target === 'cell' && rule.scope.applyToColumns) {
            return rule.scope.applyToColumns.includes(colDef.field);
          }
          // If no specific columns specified, apply to all
          return !rule.scope.applyToColumns || rule.scope.applyToColumns.length === 0;
        });
        
        if (applicableRules.length > 0) {
          // Create cellClass function that evaluates rules
          newColDef.cellClass = (params: any) => {
            const classes: string[] = [];
            
            for (const rule of applicableRules) {
              try {
                // Create context for expression evaluation
                const context = {
                  value: params.value,
                  data: params.data,
                  rowIndex: params.rowIndex,
                  column: params.column.getColId()
                };
                
                // Evaluate expression
                const result = evaluateExpression(rule.expression, context);
                
                if (result && rule.formatting.cellClass) {
                  if (Array.isArray(rule.formatting.cellClass)) {
                    classes.push(...rule.formatting.cellClass);
                  } else {
                    classes.push(rule.formatting.cellClass);
                  }
                }
              } catch (error) {
                console.error(`Error evaluating rule ${rule.name}:`, error);
              }
            }
            
            return classes.join(' ');
          };
          
          // Create cellStyle function that evaluates rules
          newColDef.cellStyle = (params: any) => {
            let combinedStyle = {};
            
            for (const rule of applicableRules) {
              try {
                // Create context for expression evaluation
                const context = {
                  value: params.value,
                  data: params.data,
                  rowIndex: params.rowIndex,
                  column: params.column.getColId()
                };
                
                // Evaluate expression
                const result = evaluateExpression(rule.expression, context);
                
                if (result && rule.formatting.style) {
                  combinedStyle = { ...combinedStyle, ...rule.formatting.style };
                }
              } catch (error) {
                console.error(`Error evaluating rule ${rule.name}:`, error);
              }
            }
            
            return combinedStyle;
          };
        }
        
        return newColDef;
      });
      
      // Apply updated column definitions
      gridApi.setGridOption('columnDefs', updatedColDefs);
      
      toast({
        title: "Conditional Formatting Applied",
        description: `${rules.length} formatting rules applied successfully`
      });
    } catch (error) {
      console.error('[handleApplyConditionalFormatting] Error applying rules:', error);
      toast({
        title: "Error",
        description: "Failed to apply conditional formatting rules.",
        variant: "destructive"
      });
    }
    
  }, [gridApi, toast]);
  
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
    console.log('[🔍][PROFILE_HANDLER] handleProfileChange called with profile:', profile?.name);
    console.log('[🔍][PROFILE_HANDLER] Profile has columnGroups:', profile?.columnGroups);
    console.log('[🔍][PROFILE_HANDLER] Profile has gridState:', !!profile?.gridState);
    console.log('[🔍][PROFILE_HANDLER] Is initial mount:', isInitialMount.current);
    
    // Clear any unsaved grid options and column groups when loading a profile
    setUnsavedGridOptions(null);
    setUnsavedColumnGroups(null);
    
    // On initial mount, we need to track this as a profile application
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('[🔍][PROFILE_HANDLER] Initial mount - applying full profile');
      
      // Start the loading indicator for initial profile load
      if (!switchingProfileRef.current) {
        console.log('[🔍][PROFILE_HANDLER] Starting initial profile load indicator');
        profileStatus.startOperation('loading', profile.name);
        switchingProfileRef.current = true;
      }
      
      if (profile.selectedProviderId) {
        console.log('[🔍][PROFILE_HANDLER] Setting provider ID:', profile.selectedProviderId);
        setSelectedProviderId(profile.selectedProviderId);
      }
      setSidebarVisible(profile.sidebarVisible ?? false);
      setShowColumnSettings(profile.showColumnSettings ?? false);
    } else {
      // After initial mount, NEVER update selectedProviderId from profile
      console.log('[🔍][PROFILE_HANDLER] Subsequent profile application - skipping selectedProviderId');
      setSidebarVisible(profile.sidebarVisible ?? false);
      setShowColumnSettings(profile.showColumnSettings ?? false);
    }
    
    // Apply grid state if available
    console.log('[🔍][PROFILE_HANDLER] Calling applyProfileGridState');
    applyProfileGridState(profile);
  }, [applyProfileGridState, profileStatus]);
  
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
            gridOptions: gridOptionsForEditor || getDefaultGridOptions(),
            columnDefs: columnDefs || [],
            profile: activeProfileData,
            conditionalFormatting: conditionalFormattingRules
          });
        }
        
        // Listen for conditional formatting updates
        const handleConfigUpdate = () => {
          const config = bus.getConfiguration(viewInstanceId);
          if (config?.conditionalFormatting) {
            setConditionalFormattingRules(config.conditionalFormatting);
            // Apply rules to the grid
            handleApplyConditionalFormatting(config.conditionalFormatting);
          }
        };
        
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
      gridOptions: gridOptionsForEditor || getDefaultGridOptions(),
      columnDefs: columnDefs || [],
      profile: activeProfileData,
      conditionalFormatting: conditionalFormattingRules
    });
  }, [viewInstanceId, gridOptionsForEditor, columnDefs, activeProfileData, conditionalFormattingRules]);
  
  // Monitor columnDefs changes and update grid if ready
  useEffect(() => {
    if (columnDefs.length > 0 && gridApi) {
      console.log('[DataGridStompShared] Column defs changed, updating grid');
      
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
    console.log('[DataGridStompShared] Saving profile with full grid state:', { saveAsNew, name, selectedProviderId });
    
    // Show saving status
    const profileDisplayName = name || activeProfileData?.name || 'Profile';
    profileStatus.startOperation('saving', profileDisplayName);
    
    // Extract full grid state for comprehensive persistence
    const fullGridState = extractFullGridState();
    
    // Extract legacy grid state for backward compatibility
    const { columnState, filterModel, sortModel } = extractGridState();
    
    // Use unsaved grid options if available, otherwise use current profile options
    const gridOptionsToSave = unsavedGridOptions || activeProfileData?.gridOptions || getDefaultGridOptions();
    
    // Use unsaved column groups if available, otherwise use current profile column groups
    // Also update the state manager before extracting full state
    const columnGroupsToSave = unsavedColumnGroups || activeProfileData?.columnGroups || [];
    console.log('[🔍][PROFILE_SAVE] Column groups to save:', columnGroupsToSave);
    console.log('[🔍][PROFILE_SAVE] Setting column groups in state manager');
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
    
    console.log('[🔍][PROFILE_SAVE] Full profile state to save:', currentState);
    console.log('[🔍][PROFILE_SAVE] GridState includes columnGroups:', fullGridState?.columnGroups);
    
    try {
      await saveProfile(currentState, saveAsNew, name);
      
      // Clear unsaved options after successful save
      setUnsavedGridOptions(null);
      setUnsavedColumnGroups(null);
      
      console.log('[DataGridStompShared] Profile saved successfully');
      
      // Show success status
      profileStatus.completeOperation(true);
    } catch (error) {
      console.error('[DataGridStompShared] Error saving profile:', error);
      
      // Show error status
      profileStatus.completeOperation(false, 'Failed to save profile');
    }
  }, [activeProfileData, selectedProviderId, connectionState.isConnected, sidebarVisible, showColumnSettings, saveProfile, extractGridState, extractFullGridState, unsavedGridOptions, unsavedColumnGroups, setColumnGroups, profileStatus]);
  
  // Wrapped profile load handler with status indication
  const handleProfileLoad = useCallback(async (versionId: string) => {
    console.log('[handleProfileLoad] Called with versionId:', versionId);
    console.log('[handleProfileLoad] Current activeProfile:', activeProfile?.versionId);
    
    // Don't show indicator if selecting the already active profile
    if (activeProfile?.versionId === versionId) {
      console.log('[handleProfileLoad] Same profile, skipping');
      return;
    }
    
    const profile = profiles.find(p => p.versionId === versionId);
    console.log('[handleProfileLoad] Found profile:', profile);
    
    if (profile) {
      // Show "Loading profile..." immediately
      console.log('[handleProfileLoad] Starting switching operation');
      profileStatus.startOperation('switching', profile.name);
      switchingProfileRef.current = true;
      
      try {
        await loadProfile(versionId);
        
        // Profile is loaded but not yet applied to grid
        // The actual application will happen via callbacks and column group effects
        // Don't complete here - wait for the column groups effect to complete
        console.log('[handleProfileLoad] loadProfile completed - waiting for grid application');
      } catch (error) {
        console.error('[handleProfileLoad] Error loading profile:', error);
        switchingProfileRef.current = false;
        profileStatus.completeOperation(false, 'Failed to switch profile');
      }
    }
  }, [profiles, activeProfile, loadProfile, profileStatus]);
  
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
  
  const handleOpenColumnGroups = useCallback(() => {
    console.log('[DataGridStompShared] handleOpenColumnGroups called');
    setShowColumnGroupDialog(true);
    console.log('[DataGridStompShared] showColumnGroupDialog set to true');
  }, []);
  
  const handleOpenExpressionEditor = useCallback(() => {
    console.log('[DataGridStompShared] handleOpenExpressionEditor called');
    setShowExpressionEditor(true);
  }, []);
  
  const handleOpenConditionalFormatting = useCallback(async () => {
    console.log('[DataGridStompShared] handleOpenConditionalFormatting called');
    try {
      await WindowManager.openConditionalFormatting(viewInstanceId);
    } catch (error) {
      console.error('[DataGridStompShared] Failed to open conditional formatting:', error);
      toast({
        title: "Error",
        description: "Failed to open conditional formatting dialog",
        variant: "destructive"
      });
    }
  }, [viewInstanceId, toast]);
  
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
  
  // Handle column groups apply
  const handleApplyColumnGroups = useCallback((groups: any[]) => {
    console.log('[handleApplyColumnGroups] Starting column group application');
    console.log('- gridApi available:', !!gridApi);
    console.log('- columnApi available:', !!columnApi);
    console.log('- columnDefs length:', columnDefs.length);
    console.log('- groups to apply:', groups);
    
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
      
      console.log('[handleApplyColumnGroups] Column groups applied successfully');
      
      // Force a grid refresh to ensure the changes are visible
      setTimeout(() => {
        gridApi.refreshCells({ force: true });
        
        // Test expanding/collapsing groups to verify columnGroupShow behavior
        console.log('[handleApplyColumnGroups] Testing column group expand/collapse behavior...');
        
        // Try to expand all groups first
        // In newer AG-Grid versions, column group methods might be on gridApi
        const setGroupOpened = columnApi?.setColumnGroupOpened || gridApi?.setColumnGroupOpened;
        
        if (setGroupOpened) {
          groups.forEach(group => {
            console.log(`[handleApplyColumnGroups] Expanding group: ${group.headerName}`);
            setGroupOpened.call(columnApi || gridApi, group.groupId, true);
          });
          
          // Then collapse them after a delay to see the effect
          setTimeout(() => {
            groups.forEach(group => {
              console.log(`[handleApplyColumnGroups] Collapsing group: ${group.headerName}`);
              setGroupOpened.call(columnApi || gridApi, group.groupId, false);
            });
          }, 2000);
        } else {
          console.log('[handleApplyColumnGroups] setColumnGroupOpened not available on columnApi or gridApi');
          
          // Try another approach - look for the method in different places
          console.log('[handleApplyColumnGroups] Available gridApi methods:', Object.keys(gridApi).filter(k => k.includes('Column')));
        }
      }, 100);
      
      toast({
        title: "Column Groups Applied",
        description: `${groups.length} column groups applied successfully (not saved to profile)`
      });
    } catch (error) {
      console.error('[handleApplyColumnGroups] Error applying column groups:', error);
      toast({
        title: "Error",
        description: "Failed to apply column groups. Please check the console for details.",
        variant: "destructive"
      });
    }
    
    setShowColumnGroupDialog(false);
  }, [gridApi, columnApi, columnDefs, toast]);
  
  
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
  
  // Apply column groups after grid is ready and we have both columnDefs and groups
  // This runs AFTER grid state has been applied (column state, filters, sorts)
  useEffect(() => {
    console.log('[🔍][COLUMN_GROUPS_EFFECT] Column groups effect triggered');
    console.log('[🔍][COLUMN_GROUPS_EFFECT] - gridApi:', !!gridApi);
    console.log('[🔍][COLUMN_GROUPS_EFFECT] - columnApi:', !!columnApi);
    console.log('[🔍][COLUMN_GROUPS_EFFECT] - columnDefs.length:', columnDefs.length);
    console.log('[🔍][COLUMN_GROUPS_EFFECT] - activeProfileData?.columnGroups:', activeProfileData?.columnGroups);
    console.log('[🔍][COLUMN_GROUPS_EFFECT] - unsavedColumnGroups:', unsavedColumnGroups);
    console.log('[🔍][COLUMN_GROUPS_EFFECT] - switchingProfileRef.current:', switchingProfileRef.current);
    
    // Only apply column groups when grid is ready and we have column definitions
    if (gridApi && columnDefs.length > 0) {
      // First check if there are column groups stored in the GridStateManager
      const storedGroups = getColumnGroups();
      console.log('[🔍][COLUMN_GROUPS_EFFECT] Stored groups from GridStateManager:', storedGroups);
      
      // Use stored groups first, then unsaved, then profile
      const groups = storedGroups?.length > 0 ? storedGroups : (unsavedColumnGroups || activeProfileData?.columnGroups);
      
      console.log('[🔍][COLUMN_GROUPS_EFFECT] Groups to apply:', JSON.stringify(groups, null, 2));
      console.log('[🔍][COLUMN_GROUPS_EFFECT] Groups source:', storedGroups?.length > 0 ? 'stored' : (unsavedColumnGroups ? 'unsaved' : 'profile'));
      
      // Update the state manager with current column groups
      setColumnGroups(groups || []);
      
      if (groups && groups.length > 0) {
        console.log('[🔍][COLUMN_GROUPS_EFFECT] Applying column groups immediately');
        console.log('[🔍][COLUMN_GROUPS_EFFECT] Column defs available:', columnDefs.length);
        
        // Apply column groups immediately since grid is ready
        console.log('[🔍][COLUMN_GROUPS_EFFECT] Calling ColumnGroupService.applyColumnGroups with:');
        console.log('[🔍][COLUMN_GROUPS_EFFECT] - groups:', groups);
        console.log('[🔍][COLUMN_GROUPS_EFFECT] - columnDefs count:', columnDefs.length);
        
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
          const appliedDefs = gridApi.getColumnDefs();
          console.log('[🔍][COLUMN_GROUPS_EFFECT] Verification - Grid has column defs:', appliedDefs?.length);
          const hasGroups = appliedDefs?.some((def: any) => def.children);
          console.log('[🔍][COLUMN_GROUPS_EFFECT] Verification - Grid has column groups:', hasGroups);
          
          // If we were switching profiles, complete the operation now
          if (switchingProfileRef.current) {
            console.log('[🔍][COLUMN_GROUPS_EFFECT] Completing profile switch');
            switchingProfileRef.current = false;
            profileStatus.completeOperation(true);
          }
        }, 100);
      } else {
        console.log('[🔍][COLUMN_GROUPS_EFFECT] No column groups to apply');
        
        // If we were switching profiles but have no column groups, complete now
        if (switchingProfileRef.current) {
          console.log('[🔍][COLUMN_GROUPS_EFFECT] No column groups - completing profile switch');
          switchingProfileRef.current = false;
          profileStatus.completeOperation(true);
        }
      }
    } else {
      console.log('[🔍][COLUMN_GROUPS_EFFECT] Grid not ready or no columnDefs');
      console.log('[🔍][COLUMN_GROUPS_EFFECT] - gridApi available:', !!gridApi);
      console.log('[🔍][COLUMN_GROUPS_EFFECT] - columnDefs count:', columnDefs?.length);
      
      // If we're waiting for the grid to be ready but we're switching profiles,
      // we'll complete when the grid becomes ready and this effect runs again
    }
  }, [gridApi, columnApi, columnDefs, activeProfileData?.columnGroups, unsavedColumnGroups, setColumnGroups, getColumnGroups, profileStatus]);
  
  // Memoize window options (must be before early return)
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

  // Window options for conditional formatting dialog - needs more space
  const conditionalFormattingWindowOptions = useMemo(() => ({
    defaultWidth: 1400,
    defaultHeight: 900,
    defaultCentered: true,
    frame: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    alwaysOnTop: false,
    saveWindowState: false,
    autoShow: true
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
        profileOperation={profileStatus.operation}
        profileName={profileStatus.profileName}
        profileError={profileStatus.error}
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
      
      {/* Column Groups Editor in OpenFin Window */}
      {console.log('[DataGridStompShared] Rendering with showColumnGroupDialog:', showColumnGroupDialog)}
      <OpenFinPortalDialog
        open={showColumnGroupDialog}
        onOpenChange={(open) => {
          console.log('[DataGridStompShared] OpenFinPortalDialog onOpenChange called with:', open);
          setShowColumnGroupDialog(open);
        }}
        windowName={`column-groups-${viewInstanceId}`}
        windowOptions={windowOptions}
        onWindowCreated={(window) => {
          console.log('[DataGridStompShared] Column groups window created:', window);
        }}
      >
        <ColumnGroupEditorContent
          gridApi={gridApi}
          columnApi={columnApi}
          columnDefs={columnDefs}
          currentGroups={unsavedColumnGroups || activeProfileData?.columnGroups}
          onApply={handleApplyColumnGroups}
          onClose={() => {
            console.log('[DataGridStompShared] ColumnGroupEditorContent onClose called');
            setShowColumnGroupDialog(false);
          }}
        />
      </OpenFinPortalDialog>
      
      {/* Expression Editor Dialog */}
      <ExpressionEditorDialogControlled 
        open={showExpressionEditor}
        onOpenChange={setShowExpressionEditor}
        mode="conditional"
        availableColumns={columnDefs}
        onSave={(expression, mode) => {
          // Handle expression save - apply to selected columns
          console.log('Expression saved:', expression, 'Mode:', mode);
          toast({
            title: "Expression Saved",
            description: `Expression saved in ${mode} mode`
          });
        }}
      />
      
      {/* Conditional Formatting is now opened via IAB in a separate window */}
    </div>
  );
};

// Export with React.memo - since component has no props, it will only re-render on internal state changes
export const DataGridStompShared = React.memo(DataGridStompSharedComponent);