import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { ChannelClient } from "../../../services/channels/channelClient";
import { useDataTableUpdates } from "../../datatable/hooks/useDataTableUpdates";
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

export const DataGridChannel = () => {
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
  const [messageCount, setMessageCount] = useState(0);
  
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  const channelClientRef = useRef<ChannelClient | null>(null);
  const snapshotDataRef = useRef<RowData[]>([]);
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  
  // Use the data table updates hook
  const { processUpdates, flushTransactions, getMetrics } = useDataTableUpdates({
    gridApi: gridApiRef.current,
    keyColumn: providerConfig?.keyColumn || 'id',
    snapshotMode,
    asyncTransactionWaitMillis: 50,
    updatesEnabled: true,
    onUpdateError: (error) => {
      console.error('Update error:', error);
      toast({
        title: "Update Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

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
        const providerConfigData = config.config || config;
        setProviderConfig(providerConfigData);
        console.log('Set provider config:', providerConfigData);
        
        // Set column definitions from config
        if (providerConfigData.columnDefinitions && providerConfigData.columnDefinitions.length > 0) {
          setColumnDefs(providerConfigData.columnDefinitions);
          console.log('Set column definitions:', providerConfigData.columnDefinitions.length, 'columns');
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

  const connectToChannel = async () => {
    console.log('Connect to channel button clicked');
    console.log('Selected provider ID:', selectedProviderId);
    console.log('Current provider config:', providerConfig);
    
    if (!selectedProviderId) {
      console.error('No provider selected');
      toast({
        title: "No Provider Selected",
        description: "Please select a datasource provider first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsConnected(false);
      setSnapshotMode('idle');
      setRowData([]);
      snapshotDataRef.current = [];
      
      // Create channel client for the provider
      const channelName = `provider-${selectedProviderId}`;
      console.log('Creating channel client for:', channelName);
      
      const channelClient = new ChannelClient(channelName);
      channelClientRef.current = channelClient;
      
      // Connect to channel
      console.log('Connecting to channel...');
      await channelClient.connect();
      console.log('Connected to channel successfully');
      
      // Subscribe to lifecycle events
      const unsubscribeRequestingData = channelClient.on('REQUESTING_SNAPSHOT_DATA', (payload) => {
        console.log('Provider is requesting snapshot data');
        setSnapshotMode('requesting');
      });
      unsubscribeFunctionsRef.current.push(unsubscribeRequestingData);
      
      const unsubscribeSnapshotComplete = channelClient.on('SNAPSHOT_COMPLETE', (payload) => {
        console.log('Snapshot complete:', payload);
        setSnapshotMode('complete');
        // Set all accumulated data at once
        setRowData(snapshotDataRef.current);
      });
      unsubscribeFunctionsRef.current.push(unsubscribeSnapshotComplete);
      
      // Subscribe to data updates
      const unsubscribeData = channelClient.on('data', (payload) => {
        if (payload.type === 'snapshot') {
          // Accumulate snapshot data
          console.log(`Received snapshot batch of ${payload.data.length} records`);
          snapshotDataRef.current.push(...payload.data);
          setMessageCount(prev => prev + payload.data.length);
          setSnapshotMode('receiving');
        } else if (payload.type === 'update' && snapshotMode === 'complete') {
          // Process real-time updates
          console.log(`Received ${payload.data.length} real-time updates`);
          processUpdates(payload.data);
          setMessageCount(prev => prev + payload.data.length);
        }
      });
      unsubscribeFunctionsRef.current.push(unsubscribeData);
      
      // Subscribe to connection status
      const unsubscribeStatus = channelClient.on('status', (payload) => {
        console.log('Provider status:', payload);
        if (payload.status === 'error') {
          toast({
            title: "Provider Error",
            description: payload.error || 'Provider encountered an error',
            variant: "destructive"
          });
        }
      });
      unsubscribeFunctionsRef.current.push(unsubscribeStatus);
      
      setIsConnected(true);
      
      // Request the provider to start if it's not already running
      console.log('Requesting provider to start...');
      try {
        const startResponse = await channelClient.send('start', { providerId: selectedProviderId });
        console.log('Provider start response:', startResponse);
      } catch (error) {
        console.warn('Provider may already be running or start request failed:', error);
      }
      
      toast({
        title: "Connected",
        description: `Connected to provider channel: ${channelName}`,
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setIsConnected(false);
      
      // Check if it's an OpenFin-specific error
      if (error instanceof Error && error.message.includes('fin is not defined')) {
        toast({
          title: "OpenFin Not Available",
          description: "This component requires OpenFin runtime",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Connection Failed",
          description: error instanceof Error ? error.message : 'Failed to connect to provider channel',
          variant: "destructive"
        });
      }
    }
  };

  const disconnectFromChannel = async () => {
    if (channelClientRef.current) {
      try {
        // Unsubscribe all listeners
        unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
        unsubscribeFunctionsRef.current = [];
        
        // Disconnect from channel
        await channelClientRef.current.disconnect();
        channelClientRef.current = null;
        
        setIsConnected(false);
        setSnapshotMode('idle');
        toast({
          title: "Disconnected",
          description: "Disconnected from provider channel",
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
  
  // Determine if dark mode based on theme
  const isDarkMode = appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
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
      if (channelClientRef.current) {
        unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
        channelClientRef.current.disconnect();
      }
    };
  }, []);

  const defaultColDef = {
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
    enableCellChangeFlash: true
  };

  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent<RowData>) => {
    gridApiRef.current = params.api;
  }, []);

  // Event handlers
  const handleRefresh = () => {
    if (gridApiRef.current) {
      gridApiRef.current.refreshCells();
    }
  };

  const handleExport = () => {
    if (gridApiRef.current) {
      gridApiRef.current.exportDataAsCsv();
    }
  };

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
            onClick={isConnected ? disconnectFromChannel : connectToChannel}
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
              {isConnected ? `Connected (Channel) • ${messageCount} messages • ${snapshotMode}` : 'Disconnected'}
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
          getRowId={(params) => {
            const keyColumn = providerConfig?.keyColumn || 'id';
            return params.data[keyColumn]?.toString() || '';
          }}
          asyncTransactionWaitMillis={50}
          suppressColumnVirtualisation={false}
          suppressRowVirtualisation={false}
          statusBar={{
            statusPanels: [
              { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
              { statusPanel: 'agTotalRowCountComponent', align: 'center' },
              { statusPanel: 'agFilteredRowCountComponent', align: 'center' },
              { statusPanel: 'agSelectedRowCountComponent', align: 'center' },
              { statusPanel: 'agAggregationComponent', align: 'right' }
            ]
          }}
        />
      </div>
    </div>
  );
};