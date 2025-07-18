import { forwardRef, useImperativeHandle, useRef, useMemo, useCallback, useState, useEffect } from "react";
import { AgGridReact, AgGridReactProps } from "ag-grid-react";
import { 
  ColDef, 
  GridApi, 
  GridReadyEvent,
  CellClickedEvent,
  RowSelectedEvent,
  CellValueChangedEvent,
  GetRowIdParams,
  StatusPanelDef,
  RowSelectionOptions,
  SideBarDef
} from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import { cn } from "../../../lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { StorageClient } from "../../../services/storage/storageClient";
import { ProviderManager } from "../../../services/providers/providerManager";
import { DataSourceClientFactory } from "../../../services/datasource/DataSourceClientFactory";
import { IDataSourceClient, ConnectionStatus, DataMetadata } from "../../../services/datasource/interfaces";

// Define AG-Grid theme configuration with light and dark variants
const agGridTheme = themeQuartz
  .withParams(
    {
      accentColor: "#8AAAA7",
      backgroundColor: "#F7F7F7",
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
      headerBackgroundColor: "#EFEFEFD6",
      headerFontFamily: {
        googleFont: "Inter",
      },
      headerFontSize: 14,
      headerFontWeight: 500,
      iconButtonBorderRadius: 1,
      iconSize: 12,
      inputBorderRadius: 2,
      oddRowBackgroundColor: "#EEF1F1E8",
      spacing: 6,
      wrapperBorderRadius: 2,
    },
    "light"
  )
  .withParams(
    {
      accentColor: "#8AAAA7",
      backgroundColor: "#1f2836",
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
      oddRowBackgroundColor: "#2A2E35",
      spacing: 6,
      wrapperBorderRadius: 2,
    },
    "dark"
  );

// Function to set dark mode on document body
function setDarkMode(enabled: boolean) {
  document.body.dataset.agThemeMode = enabled ? "dark" : "light";
}

export interface DataGridProps extends Omit<AgGridReactProps, 'theme'> {
  rowData: unknown[];
  columnDefs: ColDef[];
  defaultColDef?: ColDef;
  onGridReady?: (event: GridReadyEvent) => void;
  onCellClicked?: (event: CellClickedEvent) => void;
  onRowSelected?: (event: RowSelectedEvent) => void;
  onCellValueChanged?: (event: CellValueChangedEvent) => void;
  enableCellChangeFlash?: boolean;
  asyncTransactionWaitMillis?: number;
  rowSelection?: RowSelectionOptions | 'single' | 'multiple';
  animateRows?: boolean;
  suppressRowHoverHighlight?: boolean;
  suppressCellFocus?: boolean;
  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[] | boolean;
  statusBar?: { statusPanels: StatusPanelDef[] };
  theme?: unknown;
  className?: string;
  getRowId?: (params: GetRowIdParams) => string;
  rowBuffer?: number;
  cacheBlockSize?: number;
  maxBlocksInCache?: number;
  blockLoadDebounceMillis?: number;
  selectedProvider?: string;
  onProviderChange?: (provider: string) => void;
}

export interface DataGridRef {
  api: GridApi | null;
}

const DataGrid = forwardRef<DataGridRef, DataGridProps>((props, ref) => {
  const gridRef = useRef<AgGridReact>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkModeState] = useState<boolean>(true);
  const [internalSelectedProvider, setInternalSelectedProvider] = useState<string | null>(null);
  const [loadedColumnDefs, setLoadedColumnDefs] = useState<ColDef[]>([]);
  const [keyColumn, setKeyColumn] = useState<string>('id');
  const [dataSourceClient, setDataSourceClient] = useState<IDataSourceClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isFirstBatch, setIsFirstBatch] = useState(true);
  const [isGridReady, setIsGridReady] = useState(false);
  const [snapshotMode, setSnapshotMode] = useState<'idle' | 'receiving' | 'complete'>('idle');
  const snapshotModeRef = useRef<'idle' | 'receiving' | 'complete'>('idle');
  const [gridRowData, setGridRowData] = useState<any[]>([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const pendingDataRef = useRef<{ data: any[], metadata: DataMetadata }[]>([]);
  const snapshotDataRef = useRef<any[]>([]);

  const updateBatchRef = useRef<any[]>([]);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    rowData,
    columnDefs,
    defaultColDef,
    onGridReady,
    onCellClicked,
    onRowSelected,
    onCellValueChanged,
    enableCellChangeFlash = true,
    asyncTransactionWaitMillis = 50,
    rowSelection,
    animateRows = true,
    suppressRowHoverHighlight = false,
    suppressCellFocus = false,
    pagination = false,
    paginationPageSize = 100,
    paginationPageSizeSelector = [20, 50, 100, 200],
    statusBar,
    theme = agGridTheme,
    className = "ag-theme-quartz",
    getRowId,
    rowBuffer = 10,
    cacheBlockSize = 100,
    maxBlocksInCache = 10,
    blockLoadDebounceMillis = 100,
    selectedProvider,
    onProviderChange,
    ...otherProps
  } = props;

  useImperativeHandle(ref, () => ({
    api: gridRef.current?.api || null
  }));

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    setDarkMode(darkMode);
  }, [darkMode]);

  // Sync internal state with prop
  useEffect(() => {
    setInternalSelectedProvider(selectedProvider || null);
  }, [selectedProvider]);
  
  

  

  // Handle provider changes
  useEffect(() => {
    if (internalSelectedProvider) {
      // Reset grid ready state when provider changes
      console.log('Provider changed, resetting grid state');
      setIsGridReady(false);
      pendingDataRef.current = [];
      snapshotDataRef.current = [];
      setSnapshotMode('idle');
      snapshotModeRef.current = 'idle';
      setGridRowData([]);
      
      loadColumnDefinitions(internalSelectedProvider);
      initializeDataSourceClient(internalSelectedProvider);
    } else {
      // Cleanup
      dataSourceClient?.disconnect();
      setDataSourceClient(null);
    }
    
    return () => {
      // Clean up timer
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      updateBatchRef.current = [];
      dataSourceClient?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalSelectedProvider]);
  
  const loadProviders = async () => {
    try {
      // Get datasource configs
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      
      // Get active providers
      const activeProviders = ProviderManager.getActiveProviders();
      const activeProviderIds = new Set(activeProviders.map(p => p.providerId));
      
      // Combine configs with active status
      const providersWithStatus = configs.map(config => ({
        id: config.config.id,
        name: config.name,
        type: config.componentSubType,
        isActive: activeProviderIds.has(config.config.id),
        status: activeProviders.find(p => p.providerId === config.config.id)?.status || 'stopped'
      }));
      
      setProviders(providersWithStatus);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadColumnDefinitions = async (providerId: string): Promise<void> => {
    try {
      console.log('📋 Loading column definitions for provider:', providerId);
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      
      const config = configs.find(c => c.config.id === providerId);
      if (config) {
        console.log('📋 Config found:', config);
        
        if (config.config.keyColumn) {
          console.log(`Setting keyColumn: ${config.config.keyColumn}`);
          setKeyColumn(config.config.keyColumn);
        }

        if (config.config.columnDefinitions) {
          const cols: ColDef[] = config.config.columnDefinitions.map((col: any) => ({
            field: col.field,
            headerName: col.headerName || col.field,
            hide: col.hide || false,
            filter: col.filter !== false,
            sortable: col.sortable !== false,
            resizable: col.resizable !== false,
            pinned: col.pinned || null,
            width: col.width || undefined,
            minWidth: col.minWidth || 100,
            enableCellChangeFlash: true,  // Enable for each column
            cellDataType: col.cellDataType || undefined,
            valueFormatter: col.cellDataType === 'number' && col.precision !== undefined
              ? (params: any) => {
                  if (params.value == null) return '';
                  return Number(params.value).toFixed(col.precision);
                }
              : col.cellDataType === 'number'
                ? (params: any) => {
                    if (params.value == null) return '';
                    return Number(params.value).toFixed(2);
                  }
                : undefined
          }));
          console.log(`✅ Loaded ${cols.length} column definitions:`, cols.map(c => c.field));
          setLoadedColumnDefs(cols);
        } else {
          console.warn('No column definitions found in config');
          setLoadedColumnDefs([]);
        }
      } else {
        console.error('❌ No config found for provider:', providerId);
        setLoadedColumnDefs([]);
      }
    } catch (error) {
      console.error('Failed to load column definitions:', error);
      setLoadedColumnDefs([]);
    }
  };

  const defaultColDefMemo = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,  // Enable floating filters
    menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],  // Enable all menu tabs
    ...defaultColDef
  }), [defaultColDef]);
  
  // Default sidebar configuration
  const sideBar = useMemo<SideBarDef>(() => ({
    toolPanels: [
      {
        id: 'columns',
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
        minWidth: 225,
        width: 225,
        maxWidth: 400,
      },
      {
        id: 'filters',
        labelDefault: 'Filters',
        labelKey: 'filters',
        iconKey: 'filter',
        toolPanel: 'agFiltersToolPanel',
        minWidth: 180,
        width: 250,
        maxWidth: 400,
      },
    ],
    position: 'right',
    defaultToolPanel: 'columns',
  }), []);
  
  // Default status bar configuration
  const defaultStatusBar = useMemo<{ statusPanels: StatusPanelDef[] }>(() => ({
    statusPanels: [
      {
        statusPanel: 'agTotalAndFilteredRowCountComponent',
        align: 'left',
      },
      {
        statusPanel: 'agTotalRowCountComponent',
        align: 'center',
      },
      {
        statusPanel: 'agFilteredRowCountComponent',
        align: 'center',
      },
      {
        statusPanel: 'agSelectedRowCountComponent',
        align: 'center',
      },
      {
        statusPanel: 'agAggregationComponent',
        align: 'right',
      },
    ],
  }), []);

  const rowSelectionOptions = useMemo(() => {
    if (typeof rowSelection === 'string') {
      return {
        mode: rowSelection,
        checkboxes: true,
        headerCheckbox: rowSelection === 'multiple'
      };
    }
    return rowSelection;
  }, [rowSelection]);

  const initializeDataSourceClient = async (providerId: string) => {
    try {
      // Disconnect existing client
      if (dataSourceClient) {
        await dataSourceClient.disconnect();
      }
      
      // Get provider configuration to check if provider needs to be started
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      
      const config = configs.find(c => c.config.id === providerId);
      if (!config) {
        console.error('Provider configuration not found:', providerId);
        return;
      }
      
      // Check if provider is running
      const activeProviders = ProviderManager.getActiveProviders();
      const isProviderRunning = activeProviders.some(p => p.providerId === providerId);
      
      if (!isProviderRunning) {
        console.log('Provider not running, starting it now...');
        try {
          await ProviderManager.startProvider({
            providerId,
            configId: config.configId,
            config: config.config,
            type: config.componentSubType as 'stomp' | 'rest'
          });
          console.log('Provider started successfully');
        } catch (error) {
          console.error('Failed to start provider:', error);
          setConnectionStatus('error');
          return;
        }
      }
      
      // Create new client
      const client = await DataSourceClientFactory.create(providerId);
      
      // Set up event handlers
      client.onStatusChange((status) => {
        setConnectionStatus(status);
      });
      
      client.onData((data, metadata) => {
        console.log('DataGrid received data:', { 
          dataLength: data.length, 
          metadata,
          firstItem: data[0],
          snapshotMode: snapshotModeRef.current,
          isSnapshot: metadata.isSnapshot,
          hasGridApi: !!gridRef.current?.api
        });

        // During snapshot, accumulate data
        if (snapshotModeRef.current !== 'complete') {
          console.log('Appending data during snapshot phase');
          // Append data during snapshot
          setGridRowData(prev => [...prev, ...data]);
        } else {
          console.log('Applying real-time update via transaction');
          // After snapshot complete, use transaction API for real-time updates
          if (gridRef.current?.api) {
            const transaction = {
              update: data  // AG-Grid will match by rowId and update existing rows
            };
            
            const result = gridRef.current.api.applyTransaction(transaction);
            console.log('Transaction applied:', {
              updated: result?.update?.length || 0,
              added: result?.add?.length || 0,
              dataLength: data.length
            });
          } else {
            console.warn('Cannot apply transaction - grid API not ready or snapshot not complete');
          }
        }
      });
      
      client.onSnapshotComplete((stats) => {
        console.log('Snapshot complete:', stats);
        console.log('Enabling real-time updates with transactions');
        console.log('Total rows in grid:', gridRowData.length);
        setSnapshotMode('complete');
        snapshotModeRef.current = 'complete';
        setIsFirstBatch(true);
        
        // Flash the grid to show snapshot is complete
        if (gridRef.current?.api) {
          // Small delay to ensure grid has processed all data
          setTimeout(() => {
            gridRef.current?.api?.flashCells();
            console.log('Grid ready for real-time updates');
            console.log('Current grid row count:', gridRef.current?.api?.getDisplayedRowCount());
            
            // Log that we're now waiting for real-time updates
            console.log('Waiting for real-time updates via transaction API...');
          }, 100);
        }
      });
      
      client.onError((error) => {
        console.error('DataSource error:', error);
      });
      
      // Connect
      await client.connect();
      
      setDataSourceClient(client);
      
    } catch (error) {
      console.error('Failed to initialize data source client:', error);
      setConnectionStatus('error');
    }
  };
  

  
  
  const handleRefresh = async () => {
    if (!dataSourceClient) return;
    
    setIsFirstBatch(true);
    setSnapshotMode('idle');
    snapshotDataRef.current = [];
    updateBatchRef.current = [];
    // Clear the grid data
    setGridRowData([]);
    
    try {
      await dataSourceClient.refresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };
  
  const handleGridReady = useCallback((event: GridReadyEvent) => {
    console.log('Grid is ready!', { 
      hasDataSourceClient: !!dataSourceClient,
      pendingDataCount: pendingDataRef.current.length 
    });
    setIsGridReady(true);
    
    
    
    if (onGridReady) {
      onGridReady(event);
    }
  }, [onGridReady, dataSourceClient]);

  return (
    <div className="datagrid-wrapper" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="datagrid-toolbar h-[50px] min-h-[50px] border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-4 flex-1">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading providers...</div>
          ) : (
            <Select 
              value={internalSelectedProvider || ''} 
              onValueChange={(value) => {
                const newValue = value || null;
                setInternalSelectedProvider(newValue);
                if (onProviderChange) {
                  onProviderChange(newValue);
                }
              }}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a datasource..." />
              </SelectTrigger>
              <SelectContent>
                {providers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No datasources configured. Please configure a datasource first.
                  </div>
                ) : (
                  providers.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          provider.isActive && provider.status === 'running' ? 'bg-green-500' :
                          provider.isActive && provider.status === 'error' ? 'bg-red-500' :
                          provider.isActive ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`} />
                        <span>{provider.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({provider.type?.toUpperCase()})
                          {!provider.isActive && ' - Inactive'}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          
          {/* Connection Status */}
          {internalSelectedProvider && (
            <div className="flex items-center gap-2 text-sm">
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionStatus === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              )} />
              <span className="text-muted-foreground capitalize">
                {connectionStatus}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={connectionStatus !== 'connected'}
            className="px-3 py-1 text-xs font-medium rounded border border-border hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            ⟳ Refresh
          </button>
          
          <button
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className="px-3 py-1 text-xs font-medium rounded border border-border hover:bg-accent hover:text-accent-foreground"
            title={isSidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            {isSidebarVisible ? '◀ Hide Sidebar' : '▶ Show Sidebar'}
          </button>
          
          <button
            onClick={() => setDarkModeState(!darkMode)}
            className="px-3 py-1 text-xs font-medium rounded-full border border-border hover:bg-accent hover:text-accent-foreground"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>
      <div className={cn(className, "flex-1 overflow-hidden")}>
        <AgGridReact
          ref={gridRef}
          theme={theme}
          rowData={gridRowData}
          columnDefs={columnDefs.length > 0 ? columnDefs : loadedColumnDefs}
          defaultColDef={defaultColDefMemo}
          onGridReady={handleGridReady}
           enableCellChangeFlash={snapshotMode === 'complete'}
          rowSelection={rowSelectionOptions}
          animateRows={snapshotMode === 'receiving' ? false : animateRows}
          suppressRowHoverHighlight={suppressRowHoverHighlight}
           statusBar={statusBar || defaultStatusBar}
          sideBar={isSidebarVisible ? sideBar : false}
          getRowId={getRowId || ((params) => params.data?.[keyColumn])}
          rowBuffer={10}
          
          suppressColumnVirtualisation={false}
          suppressRowVirtualisation={false}
         
        
        />
      </div>
    </div>
  );
});

DataGrid.displayName = 'DataGrid';

export default DataGrid;

// Initialize dark mode when the component first loads
setDarkMode(true);