import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ModuleRegistry, themeQuartz, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Download, Settings, Moon, Sun, Play, Square } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ProviderSelector } from "../../datatable/components/ProviderSelector";
import { StorageClient } from "../../../services/storage/storageClient";
import { Client, IMessage } from '@stomp/stompjs';
// Removed useDataTableUpdates - using grid API directly for better performance
import { useToast } from "@/hooks/use-toast";
import "@/index.css";

ModuleRegistry.registerModules([AllEnterpriseModule]);

// Define row data interface
interface RowData {
  [key: string]: any;
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

const DataGridStompComponent = () => {
  const { theme: appTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef<RowData>[]>([]);
  const [snapshotMode, setSnapshotMode] = useState<'idle' | 'requesting' | 'receiving' | 'complete'>('idle');
  const messageCountRef = useRef(0);
  const [messageCountDisplay, setMessageCountDisplay] = useState(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  const stompClientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<any>(null);
  const isReceivingSnapshot = useRef(true);
  const snapshotDataRef = useRef<RowData[]>([]);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  
  // Removed debug state tracking to prevent re-renders
  // Memoize the key column
  const keyColumn = useMemo(() => providerConfig?.keyColumn || 'positionId', [providerConfig?.keyColumn]);

  // Load provider configuration when selected
  useEffect(() => {
    if (!selectedProviderId) return;
    
    loadProviderConfig(selectedProviderId);
  }, [selectedProviderId]);

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
          setColumnDefs(stompConfig.columnDefinitions);
          console.log('Set column definitions:', stompConfig.columnDefinitions.length, 'columns');
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

  const connectToStomp = async () => {
    console.log('Connect button clicked');
    console.log('Current provider config:', providerConfig);
    
    if (!providerConfig) {
      console.error('No provider config loaded');
      toast({
        title: "Configuration Missing",
        description: "Please select a datasource provider first",
        variant: "destructive"
      });
      return;
    }
    
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
      return;
    }
    
    console.log('Attempting to connect with config:', {
      websocketUrl: providerConfig.websocketUrl,
      listenerTopic: providerConfig.listenerTopic,
      keyColumn: providerConfig.keyColumn,
      snapshotEndToken: providerConfig.snapshotEndToken
    });
    
    try {
      // Only reset essential state - avoid unnecessary re-renders
      snapshotDataRef.current = [];
      isReceivingSnapshot.current = true;
      messageCountRef.current = 0;
      
      // Create STOMP client directly
      const client = new Client({
        brokerURL: providerConfig.websocketUrl,
        debug: (str) => {
          console.log('[STOMP Debug]', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });
      
      // Set up connection handlers
      client.onConnect = () => {
        console.log('✅ Connected to STOMP server');
        setIsConnected(true);
        
        // Emit requesting snapshot data
        console.log('📋 Requesting snapshot data...');
        setSnapshotMode('requesting');
        
        // Subscribe to listener topic
        console.log('📡 Subscribing to topic:', providerConfig.listenerTopic);
        subscriptionRef.current = client.subscribe(providerConfig.listenerTopic, (message: IMessage) => {
          try {
            const messageBody = message.body.trim();
            
            // Check for end token FIRST - before trying to parse JSON
            if (providerConfig.snapshotEndToken && isReceivingSnapshot.current) {
              const endToken = providerConfig.snapshotEndToken.toLowerCase();
              const messageLower = messageBody.toLowerCase();
              
              // Check if this could be the end token message
              if (messageLower.includes(endToken)) {
                console.log('🏁 Snapshot complete - end token received:', messageBody);
                isReceivingSnapshot.current = false;
                setSnapshotMode('complete');
                // Set all data at once when snapshot is complete
                setRowData(snapshotDataRef.current);
                messageCountRef.current = snapshotDataRef.current.length;
                setMessageCountDisplay(snapshotDataRef.current.length);
                toast({
                  title: "Snapshot Complete",
                  description: `Received ${snapshotDataRef.current.length} records`,
                });
                return;
              }
            }
            
            // If not end token, try to parse as JSON
            let data;
            try {
              data = JSON.parse(messageBody);
            } catch (parseError) {
              // If it's not JSON and we're not in snapshot mode, it might be a text message
              if (!isReceivingSnapshot.current) {
                console.log('[STOMP] Non-JSON message received after snapshot:', messageBody);
              } else {
                console.warn('[STOMP] Non-JSON message during snapshot (not end token):', messageBody);
              }
              return;
            }
            
            // Process data based on snapshot mode
            if (isReceivingSnapshot.current) {
              // During snapshot - accumulate data
              if (Array.isArray(data)) {
                // Log first item to verify structure
                if (snapshotDataRef.current.length === 0 && data.length > 0) {
                  console.log('[STOMP] First snapshot item:', {
                    hasPositionId: 'positionId' in data[0],
                    positionId: data[0].positionId,
                    keys: Object.keys(data[0]).slice(0, 5)
                  });
                }
                snapshotDataRef.current.push(...data);
                messageCountRef.current += data.length;
              } else if (data && typeof data === 'object') {
                snapshotDataRef.current.push(data);
                messageCountRef.current += 1;
              }
              // Set snapshot mode to receiving only once at the beginning
              if (snapshotMode === 'requesting') {
                setSnapshotMode('receiving');
              }
            } else {
              // Real-time mode - process updates
              const updates = Array.isArray(data) ? data : [data];
              
              // Only log first update for debugging
              if (updates.length > 0 && messageCountRef.current < 10) {
                const firstUpdate = updates[0];
                const keyColumn = providerConfig?.keyColumn || 'id';
                console.log('[STOMP] Real-time update:', {
                  keyColumn,
                  hasKey: keyColumn in firstUpdate,
                  keyValue: firstUpdate[keyColumn],
                  updateKeys: Object.keys(firstUpdate).slice(0, 5)
                });
              }
              
              // Use grid API directly like ag-grid stress test
              if (gridApiRef.current) {
                gridApiRef.current.applyTransactionAsync({ update: updates });
              }
              messageCountRef.current += updates.length;
              
              // Update display counter less frequently to minimize re-renders
              const now = Date.now();
              const elapsed = now - lastUpdateTimeRef.current;
              if (elapsed >= 1000) {
                setMessageCountDisplay(messageCountRef.current);
                lastUpdateTimeRef.current = now;
              }
            }
          } catch (error) {
            console.error('[STOMP] Error processing message:', error);
          }
        });
        
        // Send snapshot request if configured
        if (providerConfig.requestMessage && providerConfig.requestBody) {
          console.log('🚀 Sending snapshot request:', {
            destination: providerConfig.requestMessage,
            body: providerConfig.requestBody
          });
          
          client.publish({
            destination: providerConfig.requestMessage,
            body: providerConfig.requestBody,
          });
        }
        
        // Set up timeout for snapshot completion
        const snapshotTimeout = setTimeout(() => {
          if (isReceivingSnapshot.current) {
            console.warn('⏰ Snapshot timeout - no end token received after 30s');
            console.log('Total records received:', snapshotDataRef.current.length);
            isReceivingSnapshot.current = false;
            setSnapshotMode('complete');
            // Set all data at once when snapshot times out
            setRowData(snapshotDataRef.current);
            messageCountRef.current = snapshotDataRef.current.length;
            setMessageCountDisplay(snapshotDataRef.current.length);
            toast({
              title: "Snapshot Complete (Timeout)",
              description: `Received ${snapshotDataRef.current.length} records (no end token)`,
              variant: "default"
            });
          }
        }, 30000); // 30 second timeout
        
        // Store timeout ref for cleanup
        (client as any)._snapshotTimeout = snapshotTimeout;
      };
      
      client.onStompError = (frame) => {
        console.error('[STOMP] Error:', frame.headers['message']);
        setIsConnected(false);
        toast({
          title: "STOMP Error",
          description: frame.headers['message'] || 'Connection error',
          variant: "destructive"
        });
      };
      
      client.onWebSocketError = (event) => {
        console.error('[STOMP] WebSocket error:', event);
        setIsConnected(false);
        toast({
          title: "WebSocket Error",
          description: "Failed to connect to WebSocket",
          variant: "destructive"
        });
      };
      
      client.onDisconnect = () => {
        console.log('🔌 Disconnected from STOMP server');
        setIsConnected(false);
      };
      
      // Activate the client
      stompClientRef.current = client;
      client.activate();
      
    } catch (error) {
      console.error('Connection error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setIsConnected(false);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect to STOMP server',
        variant: "destructive"
      });
    }
  };

  const disconnectFromStomp = async () => {
    if (stompClientRef.current) {
      try {
        // Clear snapshot timeout if exists
        const timeout = (stompClientRef.current as any)._snapshotTimeout;
        if (timeout) {
          clearTimeout(timeout);
        }
        
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
        setIsConnected(false);
        setSnapshotMode('idle');
        isReceivingSnapshot.current = true;
        toast({
          title: "Disconnected",
          description: "Disconnected from STOMP server",
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
  }, [isDarkMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stompClientRef.current) {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  // Memoize defaultColDef to prevent ag-grid re-initialization
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
    enableCellChangeFlash: true
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
    // console.log('[DataGridStomp] Grid ready event fired');
    gridApiRef.current = params.api;
  }, []);

  // Memoize event handlers to prevent re-renders
  const handleRefresh = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.refreshCells();
    }
  }, []);

  const handleExport = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.exportDataAsCsv();
    }
  }, []);

  if (!stylesLoaded) {
    return <div className="h-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'dark' : 'light'}`} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Toolbar */}
      <div className="h-[80px] border-b bg-background flex flex-col px-4 py-2 gap-2">
        {/* First row - Provider selection and connection */}
        <div className="flex items-center gap-4">
          <ProviderSelector
            value={selectedProviderId}
            onChange={setSelectedProviderId}
          />
          
          <Button
            onClick={isConnected ? disconnectFromStomp : connectToStomp}
            disabled={!selectedProviderId}
            variant={isConnected ? "destructive" : "default"}
            size="sm"
            className="gap-2"
          >
            {isConnected ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isConnected ? 'Disconnect' : 'Connect'}
          </Button>
          
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-muted-foreground">
              {isConnected ? `Connected • ${messageCountDisplay} messages • ${snapshotMode}` : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {/* Second row - Grid controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="sidebar-toggle" className="text-sm">
              Sidebar
            </Label>
            <Switch
              id="sidebar-toggle"
              checked={sidebarVisible}
              onCheckedChange={setSidebarVisible}
            />
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              className="gap-2"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDarkMode ? 'Light' : 'Dark'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Grid */}
      <div className="flex-1 overflow-hidden">
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
        />
      </div>
    </div>
  );
};

// Export with React.memo - since component has no props, it will only re-render on internal state changes
export const DataGridStomp = React.memo(DataGridStompComponent);