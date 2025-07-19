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
import "./DataGrid.css";
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
  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[] | boolean;
  statusBar?: { statusPanels: StatusPanelDef[] };
  theme?: unknown;
  className?: string;
  getRowId?: (params: GetRowIdParams) => string;
  suppressScrollOnNewData?: boolean;
  debounceVerticalScrollbar?: boolean;
  suppressAnimationFrame?: boolean;
  selectedProvider?: string;
  onProviderChange?: (provider: string) => void;
}

export interface DataGridRef {
  api: GridApi | null;
}

const DataGrid = forwardRef<DataGridRef, DataGridProps>((props, ref) => {
  const gridRef = useRef<AgGridReact>(null);
  const [providers, setProviders] = useState<{id: string; name: string; type?: string; isActive: boolean; status: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkModeState] = useState<boolean>(true);
  const [internalSelectedProvider, setInternalSelectedProvider] = useState<string | null>(null);
  const [loadedColumnDefs, setLoadedColumnDefs] = useState<ColDef[]>([]);
  const [keyColumn, setKeyColumn] = useState<string>('id');
  const [dataSourceClient, setDataSourceClient] = useState<IDataSourceClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isFirstBatch, setIsFirstBatch] = useState(true);
  const [isGridReady, setIsGridReady] = useState(false);
  // Remove snapshotMode state - only use ref to avoid re-renders
  const snapshotModeRef = useRef<'idle' | 'receiving' | 'complete'>('idle');
  // Generate dummy data for testing
  const generateDummyData = (rows: number = 1000, cols: number = 30) => {
    const data = [];
    const columns = ['id', ...Array.from({ length: cols - 1 }, (_, i) => `col${i + 1}`)];
    
    for (let i = 0; i < rows; i++) {
      const row: Record<string, any> = { id: `ROW-${i}` };
      columns.forEach((col, idx) => {
        if (col === 'id') return;
        if (idx % 3 === 0) {
          row[col] = `Text-${i}-${idx}`;
        } else if (idx % 3 === 1) {
          row[col] = Math.random() * 1000;
        } else {
          row[col] = Math.random() > 0.5;
        }
      });
      data.push(row);
    }
    return data;
  };
  
  // Generate column definitions for dummy data
  const generateDummyColumnDefs = (cols: number = 30): ColDef[] => {
    const columns = ['id', ...Array.from({ length: cols - 1 }, (_, i) => `col${i + 1}`)];
    return columns.map((col, idx) => ({
      field: col,
      headerName: col.toUpperCase(),
      filter: true,
      sortable: true,
      resizable: true,
      width: col === 'id' ? 100 : 150,
      cellDataType: idx % 3 === 0 ? 'text' : idx % 3 === 1 ? 'number' : 'boolean',
      enableCellChangeFlash: true
    }));
  };
  
  // TEST MODE: Set to true to use dummy data
  const USE_DUMMY_DATA = true;
  const [gridRowData, setGridRowData] = useState<Record<string, any>[]>(USE_DUMMY_DATA ? generateDummyData() : []);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const pendingDataRef = useRef<{ data: Record<string, any>[], metadata: DataMetadata }[]>([]);
  const snapshotDataRef = useRef<Record<string, any>[]>([]);

  const updateBatchRef = useRef<Record<string, any>[]>([]);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    rowData,
    columnDefs,
    defaultColDef,
    onGridReady,
    onCellClicked,
    onRowSelected,
    onCellValueChanged,
    enableCellChangeFlash = true,
    asyncTransactionWaitMillis = 60,
    rowSelection,
    animateRows = true,
    pagination = false,
    paginationPageSize = 100,
    paginationPageSizeSelector = [20, 50, 100, 200],
    statusBar,
    theme = agGridTheme,
    className = "ag-theme-quartz",
    getRowId,
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
    if (internalSelectedProvider && !USE_DUMMY_DATA) {
      // Reset grid ready state when provider changes
      // Provider changed, resetting grid state
      setIsGridReady(false);
      pendingDataRef.current = [];
      snapshotDataRef.current = [];
      snapshotModeRef.current = 'idle';
      setGridRowData([]);
      
      loadColumnDefinitions(internalSelectedProvider);
      initializeDataSourceClient(internalSelectedProvider);
    } else if (!USE_DUMMY_DATA) {
      // Cleanup
      dataSourceClient?.disconnect();
      setDataSourceClient(null);
    }
    
    // Set up periodic cleanup (from AGV1 pattern)
    cleanupTimerRef.current = setInterval(() => {
      // Clear update batch if it's too large
      if (updateBatchRef.current.length > 1000) {
        updateBatchRef.current = [];
      }
      // Clear snapshot data if too large
      if (snapshotDataRef.current.length > 10000) {
        snapshotDataRef.current = [];
      }
    }, 60000); // Every minute
    
    return () => {
      // Clean up timers
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
      updateBatchRef.current = [];
      snapshotDataRef.current = [];
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
      // Failed to load providers
    } finally {
      setLoading(false);
    }
  };

  const loadColumnDefinitions = async (providerId: string): Promise<void> => {
    try {
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      
      const config = configs.find(c => c.config.id === providerId);
      if (config) {
        // Config found
        
        if (config.config.keyColumn) {
          // Setting keyColumn
          setKeyColumn(config.config.keyColumn);
        }

        if (config.config.columnDefinitions) {
          const cols: ColDef[] = config.config.columnDefinitions.map((col: {
            field: string;
            headerName?: string;
            hide?: boolean;
            filter?: boolean;
            sortable?: boolean;
            resizable?: boolean;
            pinned?: string | null;
            width?: number;
            minWidth?: number;
            cellDataType?: string;
            precision?: number;
          }) => ({
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
              ? (params: { value: number | null | undefined }) => {
                  if (params.value == null) return '';
                  return Number(params.value).toFixed(col.precision);
                }
              : col.cellDataType === 'number'
                ? (params: { value: number | null | undefined }) => {
                    if (params.value == null) return '';
                    return Number(params.value).toFixed(2);
                  }
                : undefined
          }));
          // Loaded column definitions
          setLoadedColumnDefs(cols);
        } else {
          // No column definitions found in config
          setLoadedColumnDefs([]);
        }
      } else {
        // No config found for provider
        setLoadedColumnDefs([]);
      }
    } catch (error) {
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
        return;
      }
      
      // Check if provider is running
      const activeProviders = ProviderManager.getActiveProviders();
      const isProviderRunning = activeProviders.some(p => p.providerId === providerId);
      
      if (!isProviderRunning) {
        // Provider not running, starting it now
        try {
          await ProviderManager.startProvider({
            providerId,
            configId: config.configId,
            config: config.config,
            type: config.componentSubType as 'stomp' | 'rest'
          });
          // Provider started successfully
        } catch (error) {
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
        // Handle incoming data

        // During snapshot, accumulate data in ref
        if (metadata.isSnapshot && snapshotModeRef.current !== 'complete') {
          // Only update ref, not state to avoid re-renders
          if (snapshotModeRef.current !== 'receiving') {
            snapshotModeRef.current = 'receiving';
          }
          // Use push to avoid creating new arrays
          snapshotDataRef.current.push(...data);
        } else if (snapshotModeRef.current === 'complete') {
          // After snapshot complete, batch real-time updates
          updateBatchRef.current.push(...data);
          
          // Clear existing timer
          if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
          }
          
          // Set new timer to apply batched updates
          updateTimerRef.current = setTimeout(() => {
            if (gridRef.current?.api && updateBatchRef.current.length > 0) {
              // Use async transaction for large updates (AGV1 pattern)
              const useAsync = updateBatchRef.current.length > 50;
              const transaction = {
                update: updateBatchRef.current
              };
              
              if (useAsync) {
                gridRef.current.api.applyTransactionAsync(transaction);
              } else {
                const result = gridRef.current.api.applyTransaction(transaction);
              }
              
              // Clear the batch
              updateBatchRef.current = [];
            }
          }, asyncTransactionWaitMillis);
        } else {
          // Received data in unexpected state
        }
      });
      
      client.onSnapshotComplete((stats) => {
        // Snapshot complete
        
        // Update ref first
        snapshotModeRef.current = 'complete';
        
        // Set grid data once
        setGridRowData(snapshotDataRef.current);
        setIsFirstBatch(true);
        
        // Flash the grid to show snapshot is complete
        if (gridRef.current?.api) {
          // Small delay to ensure grid has processed all data
          setTimeout(() => {
            gridRef.current?.api?.flashCells();
            // Grid ready for real-time updates
            
            // Clear snapshot data ref
            snapshotDataRef.current = [];
            
            // Log that we're now waiting for real-time updates
            // Waiting for real-time updates
          }, 100);
        }
      });
      
      client.onError((error) => {
        // DataSource error
      });
      
      // Connect
      await client.connect();
      
      setDataSourceClient(client);
      
    } catch (error) {
      setConnectionStatus('error');
    }
  };
  

  
  
  const handleRefresh = async () => {
    if (!dataSourceClient) return;
    
    // Clear any pending update timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    
    setIsFirstBatch(true);
    snapshotModeRef.current = 'idle';
    snapshotDataRef.current = [];
    updateBatchRef.current = [];
    // Clear the grid data
    setGridRowData([]);
    
    try {
      await dataSourceClient.refresh();
    } catch (error) {
      // Refresh failed
    }
  };
  
  const handleGridReady = useCallback((event: GridReadyEvent) => {
    // Grid is ready
    setIsGridReady(true);
    
    
    
    if (onGridReady) {
      onGridReady(event);
    }
  }, [onGridReady, dataSourceClient]);

  return (
    <div className="flex flex-col h-screen w-full">
      <div className="h-[50px] min-h-[50px] border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
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
      <div className={cn(className, "ag-theme-quartz", "flex-1 min-h-0 overflow-hidden")}>
        <AgGridReact
          ref={gridRef}
          theme={theme}
          rowData={gridRowData}
          columnDefs={USE_DUMMY_DATA ? generateDummyColumnDefs() : (columnDefs.length > 0 ? columnDefs : loadedColumnDefs)}
          defaultColDef={defaultColDefMemo}
          onGridReady={handleGridReady}
          enableCellChangeFlash={enableCellChangeFlash}
          animateRows={false}
          getRowId={getRowId || (keyColumn ? (params) => params.data?.[keyColumn] : undefined)}
          rowSelection={rowSelectionOptions}
          statusBar={statusBar || defaultStatusBar}
          sideBar={isSidebarVisible ? sideBar : false}
          suppressScrollOnNewData={true}
          debounceVerticalScrollbar={true}
          suppressColumnMoveAnimation={true}
          suppressAnimationFrame={false}
          rowBuffer={10}
          asyncTransactionWaitMillis={asyncTransactionWaitMillis}
          // Performance settings from AGV1
          suppressRowHoverHighlight={true}
          suppressCellFocus={false}
          enableCellTextSelection={true}
          ensureDomOrder={true}
        />
      </div>
    </div>
  );
});

DataGrid.displayName = 'DataGrid';

export default DataGrid;

// Initialize dark mode when the component first loads
setDarkMode(true);