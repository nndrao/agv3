import { useState, useEffect, useRef } from "react";
import { ModuleRegistry, themeQuartz, ColDef, GridApi } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";

import { ChannelSubscriber } from '../../services/channels/channelSubscriber';
import { ProviderSelector } from './components/ProviderSelector';
import { StorageClient } from '../../services/storage/storageClient';
import { ProviderManager } from '../../services/providers/providerManager';
import { agGridValueFormatters } from '../../components/ag-grid/value-formatters';
import { agGridComponents } from '../../components/ag-grid/cell-renderers';

ModuleRegistry.registerModules([AllEnterpriseModule]);

// Define AG-Grid theme configuration
const theme = themeQuartz
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

// Define row data interface
interface RowData {
  [key: string]: unknown;
}

export function App() {
  const gridRef = useRef<AgGridReact<RowData>>(null);
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef<RowData>[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Record<string, unknown> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [darkMode, setDarkModeState] = useState<boolean>(true);
  // const keyColumn = 'id';
  const keyColumnRef = useRef<string>('id');
  const subscriberRef = useRef<ChannelSubscriber | null>(null);
  const [snapshotMode, setSnapshotMode] = useState<'idle' | 'requesting' | 'receiving' | 'complete'>('idle');
  const snapshotModeRef = useRef<'idle' | 'requesting' | 'receiving' | 'complete'>('idle');
  const snapshotDataRef = useRef<RowData[]>([]);
  const columnDefsRef = useRef<ColDef<RowData>[]>([]);
  
  // Get table ID from URL params
  const tableId = new URLSearchParams(window.location.search).get('id') || 'default';
  
  // Update the body dataset when dark mode changes
  useEffect(() => {
    setDarkMode(darkMode);
  }, [darkMode]);
  
  useEffect(() => {
    if (selectedProvider) {
      // Load column definitions and connect
      loadColumnDefinitions(selectedProvider).then(() => {
        connectToProvider(selectedProvider);
      });
    } else {
      disconnectFromProvider();
    }
    
    return () => {
      disconnectFromProvider();
    };
  }, [selectedProvider]);
  
  const connectToProvider = async (providerId: string) => {
    disconnectFromProvider();
    
    setConnectionStatus('connecting');
    
    // Check if provider is active, if not, start it
    const activeProviders = ProviderManager.getActiveProviders();
    const isActive = activeProviders.some(p => p.providerId === providerId);
    
    if (!isActive) {
      console.log('Provider not active, starting it...');
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      
      const config = configs.find(c => c.config.id === providerId);
      if (config) {
        try {
          await ProviderManager.startProvider({
            providerId: config.config.id,
            configId: config.configId,
            config: config.config,
            type: config.componentSubType as 'stomp' | 'rest'
          });
          console.log('Provider started successfully');
        } catch (error) {
          console.error('Failed to start provider:', error);
        }
      }
    }
    
    // Create new subscriber
    const channelName = `data-provider-${providerId}`;
    subscriberRef.current = new ChannelSubscriber(channelName);
    
    try {
      await subscriberRef.current.connect();
      setConnectionStatus('connected');
      
      // Subscribe to events
      subscriberRef.current.subscribe('status');
      subscriberRef.current.subscribe('update');
      subscriberRef.current.subscribe('realtime-update');
      subscriberRef.current.subscribe('error');
      subscriberRef.current.subscribe('statistics');
      subscriberRef.current.subscribe('REQUESTING_SNAPSHOT_DATA');
      subscriberRef.current.subscribe('SNAPSHOT_COMPLETE');
      
      // Handle snapshot lifecycle events
      subscriberRef.current.on('REQUESTING_SNAPSHOT_DATA', () => {
        console.log('📋 REQUESTING_SNAPSHOT_DATA event received');
        setSnapshotMode('requesting');
        snapshotModeRef.current = 'requesting';
        snapshotDataRef.current = [];
        setRowData([]);
      });
      
      subscriberRef.current.on('SNAPSHOT_COMPLETE', (data: Record<string, unknown>) => {
        console.log('✅ SNAPSHOT_COMPLETE event received:', data);
        setSnapshotMode('complete');
        snapshotModeRef.current = 'complete';
        
        // Set all accumulated snapshot data to grid
        console.log(`Snapshot data length: ${snapshotDataRef.current.length}`);
        if (snapshotDataRef.current.length > 0) {
          console.log(`Setting ${snapshotDataRef.current.length} rows to grid`);
          console.log('Sample data:', snapshotDataRef.current.slice(0, 2));
          
          // Check if we have column definitions in state or ref
          console.log(`Column definitions in state: ${columnDefs.length}`);
          console.log(`Column definitions in ref: ${columnDefsRef.current.length}`);
          
          if ((!columnDefs || columnDefs.length === 0) && columnDefsRef.current.length > 0) {
            console.log('🔧 Restoring column definitions from ref');
            setColumnDefs(columnDefsRef.current);
          } else if (!columnDefs || columnDefs.length === 0) {
            console.error('❌ No column definitions available! Cannot display data.');
            // Try to infer columns from data
            const sampleRow = snapshotDataRef.current[0];
            if (sampleRow) {
              const inferredCols: ColDef<RowData>[] = Object.keys(sampleRow)
                .filter(key => typeof sampleRow[key] !== 'object')
                .map(key => ({
                  field: key,
                  headerName: key,
                  filter: true,
                  sortable: true,
                  resizable: true,
                  enableCellChangeFlash: true
                }));
              console.log(`Inferred ${inferredCols.length} columns from data`);
              setColumnDefs(inferredCols);
              columnDefsRef.current = inferredCols;
            }
          } else {
            console.log(`✅ Column definitions available: ${columnDefs.length} columns`);
          }
          
          console.log('Key column:', keyColumnRef.current);
          setRowData(snapshotDataRef.current);
          
          // Log grid status without forcing refresh
          setTimeout(() => {
            if (gridApiRef.current) {
              console.log('Grid API available, checking row count:', gridApiRef.current.getDisplayedRowCount());
            }
          }, 100);
        } else {
          console.warn('⚠️ No snapshot data accumulated! Check if update events are being received.');
        }
      });
      
      // Handle snapshot batch updates
      subscriberRef.current.on('update', (data: Record<string, unknown>) => {
        const currentMode = snapshotModeRef.current;
        const updates = data.updates as RowData[] | undefined;
        console.log(`📨 Update event received, mode: ${currentMode}, has updates: ${!!updates}, length: ${updates?.length}`);
        if (!updates || updates.length === 0) {
          console.warn('Update event has no data');
          return;
        }
        
        if (currentMode === 'requesting' || currentMode === 'receiving') {
          // During snapshot, accumulate data
          setSnapshotMode('receiving');
          snapshotModeRef.current = 'receiving';
          snapshotDataRef.current.push(...updates);
          console.log(`📦 Snapshot batch: ${updates.length} rows, total: ${snapshotDataRef.current.length}`);
        } else {
          console.log(`Ignoring update in mode: ${currentMode}`);
        }
      });
      
      // Handle real-time updates
      subscriberRef.current.on('realtime-update', (data: Record<string, unknown>) => {
        const updates = data.updates as RowData[] | undefined;
        if (!updates || updates.length === 0) return;
        
        if (snapshotModeRef.current === 'complete' && gridApiRef.current) {
          console.log(`🔄 Real-time update: ${updates.length} rows`);
          gridApiRef.current.applyTransactionAsync({
            update: updates
          });
        } else {
          console.log(`⚠️ Received real-time update but snapshot not complete, mode: ${snapshotModeRef.current}`);
        }
      });
      
      // Handle errors
      subscriberRef.current.on('error', (data: Record<string, unknown>) => {
        console.error('Provider error:', data);
      });
      
      // Handle statistics - throttle updates to reduce re-renders
      let statisticsTimeout: NodeJS.Timeout | null = null;
      subscriberRef.current.on('statistics', (stats: Record<string, unknown>) => {
        if (statisticsTimeout) clearTimeout(statisticsTimeout);
        statisticsTimeout = setTimeout(() => {
          setStatistics(stats);
        }, 1000); // Update statistics only once per second
      });
      
      // Wait a moment to ensure all event handlers are registered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Request snapshot
      console.log('📸 Requesting snapshot from provider...');
      try {
        const response = await subscriberRef.current.request('getSnapshot');
        console.log('📸 Snapshot request response:', response);
      } catch (error) {
        console.error('Failed to request snapshot:', error);
      }
      
    } catch (error) {
      console.error('Failed to connect to provider:', error);
      setConnectionStatus('disconnected');
    }
  };
  
  const disconnectFromProvider = () => {
    if (subscriberRef.current) {
      subscriberRef.current.disconnect();
      subscriberRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setStatistics(null);
    setSnapshotMode('idle');
    snapshotModeRef.current = 'idle';
    snapshotDataRef.current = [];
    // Don't clear column definitions on disconnect - keep them for reconnection
    // setColumnDefs([]);
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
          // setKeyColumn(config.config.keyColumn);
          keyColumnRef.current = config.config.keyColumn;
        }
        
        if (config.config.columnDefinitions) {
          const cols: ColDef<RowData>[] = config.config.columnDefinitions
            .filter((col: Record<string, unknown>) => col.type !== 'object') // Skip object columns
            .map((col: Record<string, unknown>) => ({
              field: col.field,
              headerName: col.headerName || col.field,
              width: col.width,
              filter: col.filter !== false,
              sortable: col.sortable !== false,
              resizable: col.resizable !== false,
              hide: col.hide === true,
              enableCellChangeFlash: true,
              // Resolve string-based valueFormatter to actual function
              valueFormatter: col.valueFormatter && agGridValueFormatters[col.valueFormatter as keyof typeof agGridValueFormatters] 
                ? agGridValueFormatters[col.valueFormatter as keyof typeof agGridValueFormatters]
                : undefined,
              cellRenderer: col.cellRenderer || undefined
            }));
          console.log(`✅ Loaded and setting ${cols.length} column definitions:`, cols.map(c => c.field));
          setColumnDefs(cols);
          columnDefsRef.current = cols; // Store in ref to prevent loss
          
          // Verify the state was set
          setTimeout(() => {
            console.log('🔍 Column definitions state after setting (async check):', columnDefs.length);
            console.log('🔍 Column definitions ref after setting:', columnDefsRef.current.length);
          }, 100);
        } else {
          console.warn('No column definitions found in config');
        }
      } else {
        console.error('❌ No config found for provider:', providerId);
      }
    } catch (error) {
      console.error('Failed to load column definitions:', error);
    }
  };
  
  const getRowId = (params: { data: RowData }): string => {
    if (!params.data) return `missing-data-${Math.random()}`;
    const id = params.data[keyColumnRef.current];
    return id != null ? String(id) : `missing-key-${Math.random()}`;
  };
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">DataTable - {tableId}</h1>
            <ProviderSelector
              value={selectedProvider}
              onChange={setSelectedProvider}
            />
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              connectionStatus === 'connected' ? 'bg-green-500/20 text-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-500' :
              'bg-red-500/20 text-red-500'
            }`}>
              {connectionStatus}
            </div>
            
            <button
              onClick={() => setDarkModeState(!darkMode)}
              className="px-3 py-1 text-xs font-medium rounded-full border border-border hover:bg-accent hover:text-accent-foreground"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          
          {statistics && (
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Rows: {rowData.length}</span>
              <span>Mode: {snapshotMode}</span>
              <span>Messages: {(statistics as any).messageCount || 0}</span>
              <span>Uptime: {(statistics as any).uptime ? Math.floor((statistics as any).uptime / 1000) : 0}s</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1">
        <AgGridReact
          ref={gridRef}
          theme={theme}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={getRowId}
          animateRows={false}
          rowSelection={{ mode: "multiRow" }}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            filter: true,
            sortable: true,
            resizable: true
          }}
          // Components
          components={agGridComponents}
          // Context to pass formatters
          context={{
            valueFormatters: agGridValueFormatters
          }}
          // Performance settings
          rowBuffer={10}
          suppressRowHoverHighlight={true}
          suppressScrollOnNewData={true}
          debounceVerticalScrollbar={true}
          asyncTransactionWaitMillis={100}
          onGridReady={(params) => {
            gridApiRef.current = params.api;
            console.log('Grid ready');
          }}
        />
      </div>
    </div>
  );
}

// Initialize dark mode when the component first loads
setDarkMode(true);