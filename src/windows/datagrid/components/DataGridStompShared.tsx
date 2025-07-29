import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { themeQuartz, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
// import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun, Play, Square, Save, Loader2, MoreVertical, Edit2, ChevronDown, Plus, Settings } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ProviderSelector } from "../../datatable/components/ProviderSelector";
import { StorageClient } from "../../../services/storage/storageClient";
import { SharedWorkerClient } from "../../../services/sharedWorker/SharedWorkerClient";
import { useToast } from "@/hooks/use-toast";
import { useProfileManagement, BaseProfile } from "@/hooks/useProfileManagement";
// import { ProfileSelectorSimple } from "@/components/ProfileSelectorSimple";
import { ProfileManagementDialog } from "@/components/ProfileManagementDialog";
import { ConfigVersion } from "@/services/storage/types";
import { SaveProfileDialog } from "@/components/SaveProfileDialog";
import { RenameViewDialog } from "@/components/RenameViewDialog";
import { getViewInstanceId } from "@/utils/viewUtils";
import { WindowManager } from "@/services/window/windowManager";
import { debugStorage } from "@/utils/storageDebug";
import { agGridValueFormatters } from '@/components/ag-grid/value-formatters';
import { agGridComponents } from '@/components/ag-grid/cell-renderers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "@/index.css";

// Module registration is already done in App.tsx, no need to register again

// Define row data interface
interface RowData {
  [key: string]: any;
}

// Define profile interface for DataGridStompShared
interface DataGridStompSharedProfile extends BaseProfile {
  // Data source
  selectedProviderId: string | null;
  autoConnect: boolean;
  
  // Grid configuration
  columnState?: any;
  filterModel?: any;
  sortModel?: any;
  groupModel?: any;
  
  // UI preferences
  sidebarVisible: boolean;
  theme: 'light' | 'dark' | 'system';
  showColumnSettings: boolean;
  
  // Performance settings
  asyncTransactionWaitMillis: number;
  rowBuffer: number;
  
  // Custom settings
  messageCountLimit?: number;
  updateFrequency?: number;
}

// Validate that GridApi is properly initialized
function validateGridApi(gridApi: GridApi | null): boolean {
  if (!gridApi) return false;
  
  // Check for essential methods
  const requiredMethods = [
    'getColumnState',
    'getFilterModel',
    'applyColumnState',
    'setFilterModel'
  ];
  
  return requiredMethods.every(method => typeof (gridApi as any)[method] === 'function');
}

// Define theme configuration
const theme = themeQuartz
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
      fontFamily: {
        googleFont: "Inter",
      },
      fontSize: 14,
      headerBackgroundColor: "#D9D9D9D6",
      headerFontFamily: {
        googleFont: "Inter",
      },
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
      fontFamily: {
        googleFont: "Inter",
      },
      browserColorScheme: "dark",
      chromeBackgroundColor: {
        ref: "foregroundColor",
        mix: 0.07,
        onto: "backgroundColor",
      },
      fontSize: 14,
      foregroundColor: "#FFF",
      headerFontFamily: {
        googleFont: "Inter",
      },
      headerFontSize: 14,
      iconSize: 12,
      inputBorderRadius: 2,
      oddRowBackgroundColor: "#1f1f1f",
      spacing: 6,
      wrapperBorderRadius: 2,
    },
    "dark"
  );

// Function to set dark mode on document body
function setDarkMode(enabled: boolean) {
  document.body.dataset.agThemeMode = enabled ? "dark" : "light";
}

const DataGridStompSharedComponent = () => {
  const { theme: appTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef<RowData>[]>([]);
  const [snapshotMode, setSnapshotMode] = useState<'idle' | 'requesting' | 'receiving' | 'complete'>('idle');
  const messageCountRef = useRef(0);
  const [messageCountDisplay, setMessageCountDisplay] = useState(0);
  // const lastUpdateTimeRef = useRef<number>(Date.now());
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [currentViewTitle, setCurrentViewTitle] = useState('');
  // const [statistics, setStatistics] = useState<any>({
  //   snapshotRowsReceived: 0,
  //   updateRowsReceived: 0,
  //   isConnected: false,
  //   mode: 'idle'
  // });
  
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  const sharedWorkerClientRef = useRef<SharedWorkerClient | null>(null);
  const snapshotDataRef = useRef<RowData[]>([]);
  const isSnapshotComplete = useRef(false);
  const [currentClientId, setCurrentClientId] = useState<string>('');
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const isInitialMount = useRef(true);
  const hasAutoConnected = useRef(false);
  const isConnecting = useRef(false);
  const wasManuallyDisconnected = useRef(false);
  
  // Get view instance ID from query parameters
  const viewInstanceId = useMemo(() => getViewInstanceId(), []);
  
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
  
  // Initialize SharedWorkerClient
  useEffect(() => {
    const initializeWorkerClient = async () => {
      try {
        console.log('[DataGridStompShared] Initializing SharedWorkerClient...');
        const client = new SharedWorkerClient({
          workerUrl: new URL('/src/workers/stompSharedWorker.ts', import.meta.url).href
        });
        
        // Set up event listeners before connecting
        client.on('connected', () => {
          console.log('[DataGridStompShared] SharedWorker connected');
        });
        
        client.on('disconnected', () => {
          console.log('[DataGridStompShared] SharedWorker disconnected');
          setIsConnected(false);
        });
        
        client.on('error', (error: Error) => {
          console.error('[DataGridStompShared] SharedWorker error:', error);
          toast({
            title: "SharedWorker Error",
            description: error.message,
            variant: "destructive",
          });
        });
        
        // Connect to SharedWorker
        await client.connect();
        sharedWorkerClientRef.current = client;
        
        console.log('[DataGridStompShared] SharedWorkerClient initialized');
      } catch (error) {
        console.error('[DataGridStompShared] Failed to initialize SharedWorkerClient:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to connect to SharedWorker",
          variant: "destructive",
        });
      }
    };
    
    initializeWorkerClient();
    
    return () => {
      // Cleanup on unmount
      if (sharedWorkerClientRef.current) {
        sharedWorkerClientRef.current.destroy();
        sharedWorkerClientRef.current = null;
      }
    };
  }, []);
  
  // Handle snapshot data
  const handleSnapshotData = useCallback((data: any[]) => {
    if (!isSnapshotComplete.current) {
      // During snapshot - accumulate data
      snapshotDataRef.current.push(...data);
      messageCountRef.current += data.length;
      setMessageCountDisplay(messageCountRef.current);
      
      // Update mode to receiving if not already
      setSnapshotMode((prev) => prev === 'requesting' ? 'receiving' : prev);
    }
  }, []);
  
  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((updates: any[]) => {
    if (!gridApiRef.current || updates.length === 0) return;
    
    // If we're still in snapshot mode, treat as snapshot data
    if (!isSnapshotComplete.current) {
      handleSnapshotData(updates);
      return;
    }
    
    // Real-time updates - direct to grid API
    if (gridApiRef.current) {
      gridApiRef.current.applyTransactionAsync({ update: updates });
    }
    messageCountRef.current += updates.length;
    
    // Always update display counter for real-time updates
    setMessageCountDisplay(messageCountRef.current);
  }, [handleSnapshotData]);
  
  // Set up event listeners for SharedWorker messages
  useEffect(() => {
    if (!sharedWorkerClientRef.current) return;
    
    const client = sharedWorkerClientRef.current;
    
    const handleSnapshot = (data: { providerId: string; data: any[]; statistics?: any }) => {
      console.log(`[DataGridStompShared] Received snapshot for provider ${data.providerId}, current provider: ${selectedProviderId}`);
      if (data.providerId === selectedProviderId) {
        console.log(`[DataGridStompShared] Processing snapshot: ${data.data.length} rows`);
        handleSnapshotData(data.data);
        
        // Update snapshot mode to receiving if we were requesting
        if (snapshotMode === 'requesting' && data.data.length > 0) {
          setSnapshotMode('receiving');
        }
      }
    };
    
    const handleUpdate = (data: { providerId: string; data: any[]; statistics?: any }) => {
      if (data.providerId === selectedProviderId) {
        console.log(`[DataGridStompShared] Processing update: ${data.data.length} rows`);
        handleRealtimeUpdate(data.data);
        
        // Update statistics if provided
        // if (data.statistics) {
        //   setStatistics(data.statistics);
        // }
      }
    };
    
    const handleStatus = (data: { providerId: string; statistics: any }) => {
      if (data.providerId === selectedProviderId) {
        console.log('[DataGridStompShared] Processing status update:', data.statistics);
        // setStatistics(data.statistics);
        setIsConnected(data.statistics.isConnected);
        
        // Update snapshot mode based on statistics
        if (data.statistics.mode === 'snapshot') {
          // Only change to receiving if we're currently requesting
          if (snapshotMode === 'requesting') {
            setSnapshotMode('receiving');
          }
        } else if (data.statistics.mode === 'realtime' && snapshotMode !== 'complete') {
          // Only mark complete if we have actually received data
          if (snapshotDataRef.current.length > 0 || isSnapshotComplete.current) {
            setSnapshotMode('complete');
            // When transitioning to realtime, set the accumulated snapshot data
            if (snapshotDataRef.current.length > 0 && !isSnapshotComplete.current) {
              console.log(`[DataGridStompShared] Setting snapshot data: ${snapshotDataRef.current.length} rows`);
              setRowData(snapshotDataRef.current);
              isSnapshotComplete.current = true;
              toast({
                title: "Snapshot Complete",
                description: `Loaded ${snapshotDataRef.current.length} rows`,
              });
            }
          }
          // Otherwise keep showing the busy indicator
        }
      }
    };
    
    // Add event listeners
    client.on('snapshot', handleSnapshot);
    client.on('update', handleUpdate);
    client.on('status', handleStatus);
    
    // Cleanup
    return () => {
      client.removeListener('snapshot', handleSnapshot);
      client.removeListener('update', handleUpdate);
      client.removeListener('status', handleStatus);
    };
  }, [selectedProviderId, snapshotMode, toast, handleSnapshotData, handleRealtimeUpdate]);
  
  // Memoize the profile change handler to prevent re-renders
  const handleProfileChange = useCallback((profile: DataGridStompSharedProfile) => {
    // Apply profile settings
    console.log('[DataGridStompShared] Applying profile:', profile);
    
    // On initial mount, apply all settings including selectedProviderId
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('[DataGridStompShared] Initial mount - applying full profile');
      if (profile.selectedProviderId) {
        setSelectedProviderId(profile.selectedProviderId);
      }
      setSidebarVisible(profile.sidebarVisible ?? false);
      setShowColumnSettings(profile.showColumnSettings ?? false);
      // Don't apply theme from profile - let user control it manually
    } else {
      // After initial mount, NEVER update selectedProviderId from profile
      // This prevents the profile from clearing user selections
      console.log('[DataGridStompShared] Subsequent profile application - skipping selectedProviderId');
      setSidebarVisible(profile.sidebarVisible ?? false);
      setShowColumnSettings(profile.showColumnSettings ?? false);
      // Don't apply theme from profile - let user control it manually
    }
    
    // Apply grid state if available and grid is ready
    if (gridApiRef.current && validateGridApi(gridApiRef.current)) {
      try {
        if (profile.columnState && profile.columnState.length > 0) {
          gridApiRef.current.applyColumnState({
            state: profile.columnState,
            applyOrder: true
          });
        }
        
        if (profile.filterModel && Object.keys(profile.filterModel).length > 0) {
          gridApiRef.current.setFilterModel(profile.filterModel);
        }
        
        // AG-Grid doesn't have getSortModel/setSortModel - sorting is handled via column state
        // Sort model is included in column state which is already applied above
      } catch (error) {
        console.warn('[DataGridStompShared] Error applying grid state:', error);
      }
    }
    
    // Auto-connect is handled in the provider config loading effect
    
    // Don't reset unsaved changes when profile is loaded
    // The user must explicitly save changes
  }, []);
  
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
    // createProfile,
    setActiveProfile,
    exportProfile,
    importProfile
    // resetToDefault
  } = useProfileManagement<DataGridStompSharedProfile>({
    viewInstanceId,
    componentType: 'DataGridStompShared',
    defaultProfile: {
      name: 'Default',
      autoLoad: true,
      selectedProviderId: null,
      autoConnect: false,
      sidebarVisible: false,
      theme: 'system',
      showColumnSettings: false,
      asyncTransactionWaitMillis: 50,
      rowBuffer: 10
    },
    onProfileChange: handleProfileChange,
    // autoSaveInterval: 300, // Disabled - user must explicitly save
    debug: false // Disable debug logging to reduce re-renders
  });
  
  // Removed debug state tracking to prevent re-renders
  // Memoize the key column
  // const keyColumn = useMemo(() => providerConfig?.keyColumn || 'positionId', [providerConfig?.keyColumn]);

  // Load provider configuration when selected
  useEffect(() => {
    if (!selectedProviderId) {
      setProviderConfig(null);
      return;
    }
    
    console.log('[DataGridStompShared] Provider selected:', selectedProviderId);
    loadProviderConfig(selectedProviderId);
  }, [selectedProviderId]);
  
  // Monitor columnDefs changes and update grid if ready
  useEffect(() => {
    if (columnDefs.length > 0 && gridApiRef.current) {
      // Update grid column definitions
      gridApiRef.current.setGridOption('columnDefs', columnDefs);
      
      // Force grid to refresh after setting columns
      setTimeout(() => {
        gridApiRef.current?.refreshCells({ force: true });
      }, 100);
    }
  }, [columnDefs]);
  
  // Handle auto-connect when provider config is loaded
  useEffect(() => {
    if (!providerConfig || !selectedProviderId) {
      return;
    }
    
    // Auto-connect if profile has autoConnect enabled and we haven't already auto-connected
    // AND the user hasn't manually disconnected
    if (activeProfileData?.autoConnect && !hasAutoConnected.current && !isConnected && !wasManuallyDisconnected.current) {
      console.log('[DataGridStompShared] Auto-connecting after provider config loaded');
      console.log('Provider config ready:', providerConfig);
      hasAutoConnected.current = true;
      
      // Small delay to ensure all state is settled
      const timer = setTimeout(() => {
        connectToSharedWorker();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [providerConfig, selectedProviderId, activeProfileData?.autoConnect, isConnected]);
  
  
  // Remove auto-save - user must explicitly save changes
  
  // Debug: Log when profiles change
  useEffect(() => {
    console.log('[DataGridStompShared] Profiles updated:', {
      count: profiles.length,
      profiles: profiles.map(p => ({ id: p.versionId, name: p.name }))
    });
  }, [profiles.length]); // Only depend on length to reduce re-renders

  const loadProviderConfig = async (providerId: string) => {
    console.log('Loading provider config for:', providerId);
    try {
      const config = await StorageClient.get(providerId);
      console.log('Loaded config from storage:', config);
      
      if (config) {
        // The config structure might be flat, not nested
        const stompConfig = config.config || config;
        setProviderConfig(stompConfig);
        console.log('Set provider config:', stompConfig);
        
        // Set column definitions from config
        if (stompConfig.columnDefinitions && stompConfig.columnDefinitions.length > 0) {
          // Process column definitions to resolve valueFormatter and cellRenderer strings
          const processedColumns: ColDef[] = stompConfig.columnDefinitions.map((col: any) => {
            const processedCol = { ...col };
            
            // Debug logging
            if (col.valueFormatter || col.cellRenderer) {
              console.log(`Processing column ${col.field}:`, {
                originalValueFormatter: col.valueFormatter,
                originalCellRenderer: col.cellRenderer
              });
            }
            
            // Resolve string-based valueFormatter to actual function
            if (col.valueFormatter && typeof col.valueFormatter === 'string') {
              const formatterFunc = agGridValueFormatters[col.valueFormatter as keyof typeof agGridValueFormatters];
              if (formatterFunc) {
                processedCol.valueFormatter = formatterFunc;
                console.log(`✅ Resolved valueFormatter '${col.valueFormatter}' for column ${col.field}`);
              } else {
                console.warn(`❌ Could not resolve valueFormatter '${col.valueFormatter}' for column ${col.field}. Available formatters:`, Object.keys(agGridValueFormatters));
                processedCol.valueFormatter = undefined;
              }
            }
            
            // Keep cellRenderer as string - AG-Grid will resolve it from components
            // But verify it exists in our components
            if (col.cellRenderer && typeof col.cellRenderer === 'string') {
              if (agGridComponents[col.cellRenderer as keyof typeof agGridComponents]) {
                console.log(`✅ CellRenderer '${col.cellRenderer}' exists in components for column ${col.field}`);
              } else {
                console.warn(`❌ CellRenderer '${col.cellRenderer}' not found in components for column ${col.field}. Available components:`, Object.keys(agGridComponents));
              }
            }
            
            return processedCol;
          });
          
          setColumnDefs(processedColumns);
          console.log('Set column definitions:', processedColumns.length, 'columns');
          console.log('Processed columns:', processedColumns);
          
          // Log a sample column to see the structure
          const sampleNumericCol = processedColumns.find(col => col.cellDataType === 'number');
          const sampleDateCol = processedColumns.find(col => col.cellDataType === 'date' || col.cellDataType === 'dateString');
          console.log('Sample numeric column:', sampleNumericCol);
          console.log('Sample date column:', sampleDateCol);
          
          // Check if numeric columns have formatters
          const numColsWithFormatters = processedColumns.filter(col => 
            col.cellDataType === 'number' && (col.valueFormatter || col.cellRenderer)
          );
          console.log(`Numeric columns with formatters: ${numColsWithFormatters.length} out of ${processedColumns.filter(col => col.cellDataType === 'number').length}`);
          if (numColsWithFormatters.length > 0) {
            console.log('Example numeric column with formatter:', numColsWithFormatters[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load provider config:', error);
      toast({
        title: "Configuration Error",
        description: "Failed to load provider configuration",
        variant: "destructive"
      });
    }
  };

  const connectToSharedWorker = async () => {
    console.log('Connect button clicked');
    console.log('Current provider config:', providerConfig);
    
    // Clear manual disconnect flag when user manually connects
    wasManuallyDisconnected.current = false;
    
    // Prevent multiple simultaneous connections
    if (isConnected || isConnecting.current) {
      console.log('[DataGridStompShared] Already connected or is connecting, skipping');
      return;
    }
    
    if (!providerConfig || !sharedWorkerClientRef.current) {
      console.error('No provider config loaded or SharedWorker not initialized');
      toast({
        title: "Configuration Missing",
        description: "Please select a datasource provider first",
        variant: "destructive"
      });
      return;
    }
    
    // Mark as connecting
    isConnecting.current = true;
    
    // Validate required fields
    const requiredFields = ['websocketUrl', 'listenerTopic'];
    const missingFields = requiredFields.filter(field => !providerConfig[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      console.log('Available fields in config:', Object.keys(providerConfig));
      toast({
        title: "Invalid Configuration",
        description: `Missing required fields: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      isConnecting.current = false;
      return;
    }
    
    console.log('Attempting to connect with config:', {
      websocketUrl: providerConfig.websocketUrl,
      listenerTopic: providerConfig.listenerTopic,
      keyColumn: providerConfig.keyColumn,
      snapshotEndToken: providerConfig.snapshotEndToken
    });
    
    try {
      // Reset state
      setIsConnected(false);
      setSnapshotMode('requesting');
      setRowData([]);
      snapshotDataRef.current = [];
      isSnapshotComplete.current = false;
      messageCountRef.current = 0;
      setMessageCountDisplay(0);
      
      // Subscribe to provider through SharedWorker
      await sharedWorkerClientRef.current.subscribe(selectedProviderId!, providerConfig);
      
      console.log('✅ Subscribed to provider via SharedWorker');
      setCurrentClientId(`shared-${selectedProviderId}`);
      
      // Set connected state immediately after successful subscription
      setIsConnected(true);
      
      // Request snapshot explicitly
      console.log('[DataGridStompShared] Requesting snapshot from SharedWorker');
      setSnapshotMode('requesting');
      try {
        const snapshot = await sharedWorkerClientRef.current.getSnapshot(selectedProviderId!);
        if (snapshot && snapshot.length > 0) {
          console.log(`[DataGridStompShared] Received snapshot from SharedWorker: ${snapshot.length} rows`);
          handleSnapshotData(snapshot);
          
          // Mark snapshot as complete after receiving cached data
          setSnapshotMode('complete');
          setRowData(snapshot);
          isSnapshotComplete.current = true;
          setMessageCountDisplay(snapshot.length);
          messageCountRef.current = snapshot.length;
          
          toast({
            title: "Snapshot Loaded",
            description: `Loaded ${snapshot.length} cached rows from SharedWorker`,
          });
        } else {
          console.log('[DataGridStompShared] No cached snapshot available, waiting for live data');
          // Keep showing the busy indicator since snapshot is still being loaded
        }
      } catch (error) {
        console.error('[DataGridStompShared] Failed to get snapshot:', error);
        setSnapshotMode('idle');
        toast({
          title: "Snapshot Error",
          description: "Failed to load snapshot data. Please try again.",
          variant: "destructive",
        });
      }
      
      // Request current status to sync UI state
      try {
        const status = await sharedWorkerClientRef.current.getStatus(selectedProviderId!);
        if (status) {
          console.log('[DataGridStompShared] Got status from SharedWorker:', status);
          // setStatistics(status);
        }
      } catch (error) {
        console.error('[DataGridStompShared] Failed to get status:', error);
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setIsConnected(false);
      setSnapshotMode('idle');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect to SharedWorker',
        variant: "destructive"
      });
    } finally {
      // Always clear connecting flag
      isConnecting.current = false;
    }
  };

  const disconnectFromSharedWorker = async () => {
    if (sharedWorkerClientRef.current && selectedProviderId) {
      try {
        await sharedWorkerClientRef.current.unsubscribe(selectedProviderId);
        setIsConnected(false);
        setSnapshotMode('idle');
        setCurrentClientId('');
        isSnapshotComplete.current = false;
        // Clear the grid data
        setRowData([]);
        snapshotDataRef.current = [];
        // Reset message count and statistics
        messageCountRef.current = 0;
        setMessageCountDisplay(0);
        // setStatistics({
        //   snapshotRowsReceived: 0,
        //   updateRowsReceived: 0,
        //   isConnected: false,
        //   mode: 'idle'
        // });
        // Set flag to prevent auto-reconnect
        wasManuallyDisconnected.current = true;
        isConnecting.current = false;
        toast({
          title: "Disconnected",
          description: "Disconnected from provider",
        });
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  };

  // Check if styles are loaded and initialize theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (!root.classList.contains('light') && !root.classList.contains('dark')) {
      root.classList.add('light');
    }
    const timer = setTimeout(() => setStylesLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Check for saved title on mount and apply it with a delay to ensure it takes precedence
  useEffect(() => {
    const checkAndRestoreTitle = async () => {
      try {
        // Use the viewInstanceId which is unique for each view
        const savedTitle = localStorage.getItem(`viewTitle_${viewInstanceId}`);
        if (savedTitle) {
          console.log(`[DataGridStompShared] Found saved title: "${savedTitle}" for instance: ${viewInstanceId}`);
          
          // Apply the title immediately
          document.title = savedTitle;
          
          // Also apply with a small delay to ensure it overrides any default title setting
          setTimeout(() => {
            document.title = savedTitle;
          }, 100);
          
          // Update view options with another delay to ensure the view is fully initialized
          setTimeout(async () => {
            try {
              const currentView = await fin.View.getCurrent();
              await currentView.updateOptions({
                title: savedTitle,
                titleOrder: 'options'
              });
              console.log(`[DataGridStompShared] Successfully restored title: "${savedTitle}"`);
            } catch (e) {
              console.warn('[DataGridStompShared] Could not update view options:', e);
            }
          }, 500);
        } else {
          console.log(`[DataGridStompShared] No saved title found for instance: ${viewInstanceId}`);
        }
      } catch (error) {
        console.warn('[DataGridStompShared] Could not restore title:', error);
      }
    };
    
    // Check immediately
    checkAndRestoreTitle();
    
    // Also check after a longer delay in case something else is setting the title
    const timeoutId = setTimeout(checkAndRestoreTitle, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [viewInstanceId]);
  
  // Memoize dark mode calculation to prevent re-computation
  const isDarkMode = useMemo(() => {
    return appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, [appTheme]);
  
  // Update the body dataset when dark mode changes
  useEffect(() => {
    setDarkMode(isDarkMode);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDarkMode ? 'dark' : 'light');
    
    // Refresh grid cells when theme changes to update cell renderer colors
    if (gridApiRef.current) {
      // Small delay to ensure theme classes are applied
      setTimeout(() => {
        gridApiRef.current?.refreshCells({ force: true });
      }, 50);
    }
  }, [isDarkMode]);
  
  // Expose rename dialog function to be called from context menu
  useEffect(() => {
    (window as any).__showRenameDialog = async () => {
      return new Promise((resolve) => {
        // Get current title
        const currentView = fin.View.getCurrent();
        currentView.getOptions().then((options: any) => {
          const title = document.title || options.title || options.name || 'Untitled';
          setCurrentViewTitle(title);
          setShowRenameDialog(true);
          
          // Store resolve function to be called when dialog closes
          (window as any).__renameDialogResolve = resolve;
        }).catch(() => {
          resolve({ success: false });
        });
      });
    };
    
    return () => {
      delete (window as any).__showRenameDialog;
      delete (window as any).__renameDialogResolve;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sharedWorkerClientRef.current && selectedProviderId) {
        console.log('[DataGridStompShared] Component unmounting, unsubscribing from provider');
        sharedWorkerClientRef.current.unsubscribe(selectedProviderId).catch(() => {});
      }
    };
  }, [selectedProviderId]);

  // Memoize defaultColDef to prevent ag-grid re-initialization
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
    enableCellChangeFlash: true,
    // Allow value formatters to work
    useValueFormatterForExport: true
  }), []);

  // Memoize getRowId function to prevent unnecessary row ID recalculations
  const getRowId = useCallback((params: any) => {
    const keyColumn = providerConfig?.keyColumn || 'id';
    const rowId = params.data[keyColumn];
    
    if (!rowId) {
      console.warn(`[getRowId] Missing key value for column '${keyColumn}':`, params.data);
    }
    
    return rowId?.toString() || `missing-key-${Math.random()}`;
  }, [providerConfig?.keyColumn]);

  // Memoize statusBar configuration to prevent re-initialization
  const statusBarConfig = useMemo(() => ({
    statusPanels: [
      { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
      { statusPanel: 'agTotalRowCountComponent', align: 'center' },
      { statusPanel: 'agFilteredRowCountComponent', align: 'center' },
      { statusPanel: 'agSelectedRowCountComponent', align: 'center' },
      { statusPanel: 'agAggregationComponent', align: 'right' }
    ]
  }), []);

  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent<RowData>) => {
    gridApiRef.current = params.api;
    
    // Apply saved state if available and valid
    try {
      if (activeProfileData?.columnState && activeProfileData.columnState.length > 0) {
        params.api.applyColumnState({
          state: activeProfileData.columnState,
          applyOrder: true
        });
      }
      
      if (activeProfileData?.filterModel && Object.keys(activeProfileData.filterModel).length > 0) {
        params.api.setFilterModel(activeProfileData.filterModel);
      }
      
      // AG-Grid doesn't have setSortModel - sorting is handled via column state
      // Sort model is included in column state which is already applied above
    } catch (error) {
      console.warn('[DataGridStompShared] Error applying saved state on grid ready:', error);
    }
  }, [activeProfileData]);
  
  // Save current state to profile
  const saveCurrentState = useCallback(async (saveAsNew = false, name?: string) => {
    console.log('[DataGridStompShared] Saving profile:', {
      saveAsNew,
      name,
      selectedProviderId,
      profilesBeforeSave: profiles.length
    });
    
    // Extract grid state only when updating existing profile (not for new profiles)
    let columnState: any[] = [];
    let filterModel = {};
    let sortModel: any[] = [];
    
    // Only extract grid state if we're updating an existing profile, not creating a new one
    if (!saveAsNew && gridApiRef.current && validateGridApi(gridApiRef.current)) {
      try {
        columnState = gridApiRef.current.getColumnState();
        filterModel = gridApiRef.current.getFilterModel();
        // Extract sort model from column state
        sortModel = columnState
          .filter((col: any) => col.sort !== null && col.sort !== undefined)
          .map((col: any) => ({ colId: col.colId, sort: col.sort, sortIndex: col.sortIndex }))
          .sort((a: any, b: any) => (a.sortIndex || 0) - (b.sortIndex || 0));
      } catch (error) {
        console.warn('[DataGridStompShared] Error extracting grid state:', error);
      }
    }
    
    const currentState: DataGridStompSharedProfile = {
      name: name || activeProfileData?.name || 'Profile',
      autoLoad: true,
      selectedProviderId,
      autoConnect: isConnected,
      sidebarVisible,
      theme: 'system', // Always save as system to let user control theme
      showColumnSettings,
      asyncTransactionWaitMillis: 50,
      rowBuffer: 10,
      columnState,
      filterModel,
      sortModel
    };
    
    await saveProfile(currentState, saveAsNew, name);
    
    // The profiles state should be updated by the hook after save
    console.log('[DataGridStompShared] Profile saved successfully');
  }, [activeProfileData, selectedProviderId, isConnected, sidebarVisible, showColumnSettings, saveProfile]);
  
  // Handle profile management actions
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

  // Handle view rename dialog open
  const handleOpenRenameDialog = useCallback(async () => {
    try {
      // Get current view title
      const currentView = await fin.View.getCurrent();
      const currentOptions = await currentView.getOptions();
      const title = document.title || currentOptions.title || currentOptions.name;
      setCurrentViewTitle(title);
      setShowRenameDialog(true);
    } catch (error) {
      console.error('Failed to get current view title:', error);
      setCurrentViewTitle(document.title || 'DataGrid View');
      setShowRenameDialog(true);
    }
  }, []);
  
  // Memoize the callbacks for ProfileSelectorSimple to prevent re-renders
  const handleOpenSaveDialog = useCallback(() => {
    setShowSaveDialog(true);
  }, []);
  
  const handleOpenProfileDialog = useCallback(() => {
    setShowProfileDialog(true);
  }, []);
  
  const handleSaveNewProfile = useCallback(async (name: string, _description?: string) => {
    await saveCurrentState(true, name); // Always create new when using dialog
    setShowSaveDialog(false);
  }, [saveCurrentState]);
  
  const handleProviderChange = useCallback((providerId: string | null) => {
    console.log('[DataGridStompShared] Provider changed to:', providerId);
    setSelectedProviderId(providerId);
    // Reset connection flags when provider changes
    hasAutoConnected.current = false;
    wasManuallyDisconnected.current = false;
  }, []);

  // Handle actual rename
  const handleRenameView = useCallback(async (newTitle: string) => {
    try {
      // Update document title immediately
      document.title = newTitle;
      
      // Save title for persistence
      localStorage.setItem(`viewTitle_${viewInstanceId}`, newTitle);
      
      // Try to update view options (may not work in all cases)
      try {
        const currentView = await fin.View.getCurrent();
        await currentView.updateOptions({ 
          title: newTitle,
          titleOrder: 'options'
        });
      } catch (e) {
        // Silent fail - not critical
      }
      
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
  }, [viewInstanceId, toast]);

  // Removed refresh and export handlers - no longer needed

  if (!stylesLoaded || profilesLoading) {
    return <div className="h-full flex items-center justify-center">Loading...</div>;
  }
  
  // Only log renders in development
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('[DataGridStompShared] Rendering with:', {
  //     profilesCount: profiles.length,
  //     activeProfile: activeProfile?.name,
  //     isSaving
  //   });
  // }

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'dark' : 'light'}`} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Toolbar */}
      <div className="h-14 border-b bg-background flex items-center px-4 gap-2">
        {/* Profile management section - more compact */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs gap-1 max-w-[200px]"
                disabled={profilesLoading}
              >
                <span className="truncate">
                  {activeProfile?.name || 'Select Profile'}
                </span>
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Profiles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profiles.map((profile) => (
                <DropdownMenuItem
                  key={profile.versionId}
                  onClick={() => loadProfile(profile.versionId)}
                  className={profile.versionId === activeProfile?.versionId ? 'bg-accent' : ''}
                >
                  {profile.name}
                </DropdownMenuItem>
              ))}
              {profiles.length === 0 && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  No profiles available
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenSaveDialog}>
                <Plus className="h-3 w-3 mr-2" />
                Create New Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenProfileDialog}>
                <Settings className="h-3 w-3 mr-2" />
                Manage Profiles
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Save button - smaller */}
          <Button
            onClick={() => saveCurrentState()}
            disabled={isSaving || !activeProfile}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title='Save current profile'
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </Button>
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        {/* Provider selection and connection */}
        <ProviderSelector
          value={selectedProviderId}
          onChange={handleProviderChange}
        />
        
        <Button
          onClick={isConnected ? disconnectFromSharedWorker : connectToSharedWorker}
          disabled={!selectedProviderId}
          variant={isConnected ? "destructive" : "default"}
          size="sm"
          className="gap-2"
        >
          {isConnected ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isConnected ? 'Stop' : 'Start'}
        </Button>
        
        {/* Connection status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-muted-foreground">
            {isConnected ? (
              <>
                <span className="font-medium text-foreground">Connected</span>
                <span className="mx-1">•</span>
                <span>{messageCountDisplay.toLocaleString()} messages</span>
                {snapshotMode !== 'idle' && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="capitalize">{snapshotMode}</span>
                  </>
                )}
                {currentClientId && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="text-xs font-mono">{currentClientId}</span>
                  </>
                )}
              </>
            ) : (
              'Disconnected'
            )}
          </span>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <div className="flex items-center gap-1">
            <Label htmlFor="sidebar-toggle" className="text-xs text-muted-foreground">
              Sidebar
            </Label>
            <Switch
              id="sidebar-toggle"
              checked={sidebarVisible}
              onCheckedChange={setSidebarVisible}
              className="h-4 w-7"
            />
          </div>
          
          <div className="h-6 w-px bg-border" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="gap-1 px-2 h-8 text-xs"
          >
            {isDarkMode ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          {/* Debug info dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="View debug information"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Debug info</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Debug Information</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs font-mono" onSelect={(e) => e.preventDefault()}>
                <span className="text-muted-foreground">Profiles:</span>
                <span className="ml-auto">{profiles.length}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs font-mono" onSelect={(e) => e.preventDefault()}>
                <span className="text-muted-foreground">Active:</span>
                <span className="ml-auto">{activeProfile?.name || 'none'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs font-mono" onSelect={(e) => e.preventDefault()}>
                <span className="text-muted-foreground">View ID:</span>
                <span className="ml-auto" title={viewInstanceId}>
                  {viewInstanceId.substring(0, 8)}...
                </span>
              </DropdownMenuItem>
              {isConnected && currentClientId && (
                <DropdownMenuItem className="text-xs font-mono" onSelect={(e) => e.preventDefault()}>
                  <span className="text-muted-foreground">Client ID:</span>
                  <span className="ml-auto" title={currentClientId}>
                    {currentClientId.substring(0, 12)}...
                  </span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenRenameDialog}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Grid */}
      <div className="flex-1 overflow-hidden relative">
        {/* Busy indicator overlay */}
        {(snapshotMode === 'requesting' || snapshotMode === 'receiving') && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-medium">
                  {snapshotMode === 'requesting' ? 'Waiting for snapshot...' : 'Receiving snapshot data...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {snapshotMode === 'requesting' 
                    ? 'The shared connection is loading the data' 
                    : `${messageCountDisplay} rows received`}
                </p>
              </div>
            </div>
          </div>
        )}
        <AgGridReact<RowData>
          theme={theme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          sideBar={sidebarVisible}
          onGridReady={onGridReady}
          animateRows={false}
          suppressRowHoverHighlight={false}
          cellFlashDuration={500}
          cellFadeDuration={1000}
          getRowId={getRowId}
          asyncTransactionWaitMillis={50}
          suppressColumnVirtualisation={false}
          suppressRowVirtualisation={false}
          statusBar={statusBarConfig}
          // Components
          components={agGridComponents}
          // Context to pass formatters
          context={{
            valueFormatters: agGridValueFormatters
          }}
        />
      </div>
      
      {/* Profile Management Dialog */}
      <ProfileManagementDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        profiles={profiles}
        activeProfileId={activeProfile?.versionId}
        onSave={async (profile: ConfigVersion, name: string) => {
          // Create a full profile with required fields
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
    </div>
  );
};

// Export with React.memo - since component has no props, it will only re-render on internal state changes
export const DataGridStompShared = React.memo(DataGridStompSharedComponent);