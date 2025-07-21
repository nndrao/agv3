import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ModuleRegistry } from 'ag-grid-community';
import type { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { AgGridReact } from 'ag-grid-react';
import type { TradeRecord, WorkerMessage, ColumnMode } from './types';
import DataWorker from './workers/dataWorker?worker';
import { WebSocketClient } from './services/WebSocketClient';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import './App.css';

// Register AG-Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

function numberCellFormatter(params: any): string {
  if (params.value == null) return '';
  return Math.floor(params.value).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

const App: React.FC = () => {
  const gridRef = useRef<AgGridReact<TradeRecord>>(null);
  const [rowData, setRowData] = useState<TradeRecord[]>([]);
  const [message, setMessage] = useState<string>('');
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const workerRef = useRef<Worker | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [columnMode, setColumnMode] = useState<ColumnMode>('flat');
  const [showToolPanel, setShowToolPanel] = useState<boolean>(false);
  const gridApiRef = useRef<GridApi<TradeRecord> | null>(null);
  const [updatesPerSecond, setUpdatesPerSecond] = useState<number>(0);
  const updateCountRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const [isExtremeRunning, setIsExtremeRunning] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);

  const columnDefs: ColDef<TradeRecord>[] = [
    { headerName: 'Product', field: 'product', type: 'dimension' },
    { headerName: 'Portfolio', field: 'portfolio', type: 'dimension' },
    { headerName: 'Book', field: 'book', type: 'dimension' },
    { headerName: 'Trade', field: 'trade', width: 100 },
    { headerName: 'Deal Type', field: 'dealType', type: 'dimension' },
    { headerName: 'Bid', field: 'bidFlag', type: 'dimension', width: 100 },
    { headerName: 'Current', field: 'current', type: 'measure' },
    { headerName: 'Previous', field: 'previous', type: 'measure' },
    { headerName: 'PL 1', field: 'pl1', type: 'measure' },
    { headerName: 'PL 2', field: 'pl2', type: 'measure' },
    { headerName: 'Gain-DX', field: 'gainDx', type: 'measure' },
    { headerName: 'SX / PX', field: 'sxPx', type: 'measure' },
    { headerName: '99 Out', field: '_99Out', type: 'measure' },
    { headerName: 'Submitter ID', field: 'submitterID', type: 'measure' },
    { headerName: 'Submitted Deal ID', field: 'submitterDealID', type: 'measure' }
  ];

  const defaultColDef: ColDef = {
    width: 120,
    resizable: true,
    sortable: true,
    filter: true,
    enableCellChangeFlash: true
  };

  const columnTypes = {
    dimension: {
      enableRowGroup: true,
      enablePivot: true,
    },
    measure: {
      width: 150,
      aggFunc: 'sum',
      enableValue: true,
      cellClass: 'number',
      valueFormatter: numberCellFormatter,
      cellRenderer: 'agAnimateShowChangeCellRenderer'
    }
  };

  useEffect(() => {
    // Initialize main worker
    const worker = new DataWorker();
    workerRef.current = worker;
    
    // Initialize WebSocket client
    const wsClient = new WebSocketClient();
    wsClientRef.current = wsClient;

    // Connect to WebSocket server
    wsClient.connect()
      .then(() => setWsConnected(true))
      .catch(error => {
        console.error('Failed to connect to WebSocket server:', error);
        setMessage('WebSocket server not available. Start the server with: npm run start');
      });

    const handleWorkerMessage = (e: MessageEvent<WorkerMessage>) => {
      switch (e.data.type) {
        case 'start':
          setTestStartTime(Date.now());
          logTestStart(e.data.messageCount, e.data.updateCount || 0, e.data.interval || null);
          break;
        case 'end':
          logStressResults(e.data.messageCount!, e.data.updateCount!);
          break;
        case 'setRowData':
          setRowData(e.data.records!);
          break;
        case 'updateData':
          if (gridApiRef.current) {
            // Using applyTransactionAsync for better performance
            gridApiRef.current.applyTransactionAsync({ update: e.data.records! });
            
            // Track updates per second
            updateCountRef.current += e.data.records!.length;
            const now = Date.now();
            const elapsed = now - lastUpdateTimeRef.current;
            if (elapsed >= 1000) {
              setUpdatesPerSecond(Math.floor((updateCountRef.current / elapsed) * 1000));
              updateCountRef.current = 0;
              lastUpdateTimeRef.current = now;
            }
          }
          break;
      }
    };
    
    worker.onmessage = handleWorkerMessage;
    
    // Handle WebSocket messages
    const unsubscribe = wsClient.onMessage((message) => {
      switch (message.type) {
        case 'initial':
          if (message.records) {
            setRowData(message.records);
          }
          break;
        case 'update':
          if (message.records && gridApiRef.current) {
            // With immutable data mode, we need to provide complete row objects
            gridApiRef.current.applyTransactionAsync({ update: message.records });
            
            // Track updates per second
            updateCountRef.current += message.records.length;
            const now = Date.now();
            const elapsed = now - lastUpdateTimeRef.current;
            if (elapsed >= 1000) {
              setUpdatesPerSecond(Math.floor((updateCountRef.current / elapsed) * 1000));
              updateCountRef.current = 0;
              lastUpdateTimeRef.current = now;
            }
          }
          break;
        case 'testStart':
          console.log(`WebSocket test started: ${message.testType}`);
          updateCountRef.current = 0;
          lastUpdateTimeRef.current = Date.now();
          break;
        case 'testComplete':
          const msg = `Extreme test complete: ${message.totalSent?.toLocaleString()} updates in ${Math.floor(message.duration || 0)}ms = ${message.actualRate?.toLocaleString()} updates/sec`;
          setMessage(msg);
          console.log(msg);
          setIsExtremeRunning(false);
          break;
      }
    });

    return () => {
      worker.terminate();
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  const logTestStart = (messageCount: number | undefined, updateCount: number, interval: number | null) => {
    const msg = messageCount
      ? `Sending ${messageCount} messages at once with ${updateCount} record updates each.`
      : `Sending 1 message with ${updateCount} updates every ${interval || 0} milliseconds, that's ${interval ? (1000 / interval * updateCount).toLocaleString() : '0'} updates per second.`;
    
    console.log(msg);
    setMessage(msg);
  };

  const logStressResults = (messageCount: number, updateCount: number) => {
    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;
    const totalUpdates = messageCount * updateCount;
    const updatesPerSecond = Math.floor((totalUpdates / duration) * 1000);

    const msg = `Processed ${totalUpdates.toLocaleString()} updates in ${duration.toLocaleString()}ms, that's ${updatesPerSecond.toLocaleString()} updates per second.`;
    setMessage(msg);

    console.log('####################');
    console.log('# -- Stress test results --');
    console.log(`# The grid was pumped with ${messageCount.toLocaleString()} messages. Each message had ${updateCount.toLocaleString()} record updates which gives a total number of updates of ${totalUpdates.toLocaleString()}.`);
    console.log(`# Time taken to execute the test was ${duration.toLocaleString()} milliseconds which gives ${updatesPerSecond.toLocaleString()} updates per second.`);
    console.log('####################');
  };

  const onGridReady = useCallback((params: GridReadyEvent<TradeRecord>) => {
    gridApiRef.current = params.api;
  }, []);

  const onStartStress = () => {
    workerRef.current?.postMessage('startStress');
  };

  const onStartLoad = () => {
    workerRef.current?.postMessage('startLoad');
  };

  const onStopMessages = () => {
    workerRef.current?.postMessage('stop');
    wsClientRef.current?.stopTest();
    setMessage('Test stopped');
    console.log('Test stopped');
    setUpdatesPerSecond(0);
    updateCountRef.current = 0;
    setIsExtremeRunning(false);
  };

  const onStartExtreme = () => {
    if (!isExtremeRunning && wsClientRef.current && wsConnected) {
      setMessage('Starting EXTREME stress test via WebSocket - attempting 150,000+ updates per second...');
      setIsExtremeRunning(true);
      updateCountRef.current = 0;
      lastUpdateTimeRef.current = Date.now();
      
      wsClientRef.current.startExtremeTest();
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (isExtremeRunning && wsClientRef.current) {
          wsClientRef.current.stopTest();
        }
      }, 10000);
    } else if (!wsConnected) {
      setMessage('WebSocket not connected. Start the server with: cd websocket-server && npm start');
    }
  };

  const onColumnsFlat = () => {
    setColumnMode('flat');
    gridApiRef.current?.setGridOption('pivotMode', false);
    gridApiRef.current?.applyColumnState({
      state: [
        { colId: "product", rowGroupIndex: null, pivot: false, hide: false },
        { colId: "portfolio", rowGroupIndex: null, pivot: false, hide: false },
        { colId: "book", rowGroupIndex: null, pivot: false, hide: false },
        { colId: "trade", hide: false },
        { colId: "dealType", hide: false },
        { colId: "bidFlag", hide: false },
        { colId: "current", hide: false },
        { colId: "previous", hide: false },
        { colId: "pl1", hide: false },
        { colId: "pl2", hide: false },
        { colId: "gainDx", hide: false },
        { colId: "sxPx", hide: false },
        { colId: "_99Out", hide: false },
        { colId: "submitterID", hide: false },
        { colId: "submitterDealID", hide: false }
      ],
      applyOrder: true
    });
  };

  const onColumnsGroup = () => {
    setColumnMode('group');
    gridApiRef.current?.setGridOption('pivotMode', false);
    gridApiRef.current?.applyColumnState({
      state: [
        { colId: "product", rowGroupIndex: 0, hide: true },
        { colId: "portfolio", rowGroupIndex: 1, hide: true },
        { colId: "book", rowGroupIndex: 2, hide: true },
        { colId: "trade", hide: false },
        { colId: "dealType", hide: false },
        { colId: "bidFlag", hide: false },
        { colId: "current", aggFunc: "sum" },
        { colId: "previous", aggFunc: "sum" },
        { colId: "pl1", aggFunc: "sum" },
        { colId: "pl2", aggFunc: "sum" },
        { colId: "gainDx", aggFunc: "sum" },
        { colId: "sxPx", aggFunc: "sum" },
        { colId: "_99Out", aggFunc: "sum" },
        { colId: "submitterID", aggFunc: "sum" },
        { colId: "submitterDealID", aggFunc: "sum" }
      ],
      applyOrder: true
    });
  };

  const onColumnsPivot = () => {
    setColumnMode('pivot');
    gridApiRef.current?.setGridOption('pivotMode', true);
    gridApiRef.current?.applyColumnState({
      state: [
        { colId: "product", rowGroupIndex: 0, hide: true },
        { colId: "portfolio", pivotIndex: 0, hide: false },
        { colId: "book", rowGroupIndex: 1, hide: true },
        { colId: "trade", hide: false },
        { colId: "dealType", hide: false },
        { colId: "bidFlag", hide: false },
        { colId: "current", aggFunc: "sum" },
        { colId: "previous", aggFunc: "sum" },
        { colId: "pl1", aggFunc: "sum" },
        { colId: "pl2", aggFunc: "sum" },
        { colId: "gainDx", aggFunc: "sum" },
        { colId: "sxPx", aggFunc: "sum" },
        { colId: "_99Out", aggFunc: "sum" },
        { colId: "submitterID", aggFunc: "sum" },
        { colId: "submitterDealID", aggFunc: "sum" }
      ],
      applyOrder: true
    });
  };

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-section">
          <span>Test:</span>
          <button onClick={onStartStress}>▶ Stress</button>
          <button onClick={onStartLoad}>▶ Load</button>
          <button 
            onClick={onStartExtreme} 
            disabled={isExtremeRunning}
            style={{ 
              backgroundColor: !wsConnected ? '#666' : (isExtremeRunning ? '#888' : '#ff4444'), 
              color: 'white',
              cursor: (!wsConnected || isExtremeRunning) ? 'not-allowed' : 'pointer'
            }}
            title={!wsConnected ? 'WebSocket not connected' : ''}
          >
            {!wsConnected ? '⚠ WS Offline' : (isExtremeRunning ? '⏳ Running...' : '▶ Extreme (150k/s)')}
          </button>
          <button onClick={onStopMessages}>■ Stop</button>
        </div>
        
        <div className="toolbar-section">
          <span>Columns:</span>
          <button onClick={onColumnsFlat} className={columnMode === 'flat' ? 'active' : ''}>Flat</button>
          <button onClick={onColumnsGroup} className={columnMode === 'group' ? 'active' : ''}>Group</button>
          <button onClick={onColumnsPivot} className={columnMode === 'pivot' ? 'active' : ''}>Pivot</button>
        </div>
        
        <div className="toolbar-section">
          <span>Tool Panel:</span>
          <button onClick={() => { setShowToolPanel(true); gridApiRef.current?.setGridOption('sideBar', true); }}>Show</button>
          <button onClick={() => { setShowToolPanel(false); gridApiRef.current?.setGridOption('sideBar', false); }}>Hide</button>
        </div>
        
        <div className="toolbar-section">
          <span>Metrics:</span>
          <button 
            onClick={() => setShowMetrics(!showMetrics)}
            className={showMetrics ? 'active' : ''}
          >
            {showMetrics ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      
      <div className="message-box">
        <span>{message}</span>
        {updatesPerSecond > 0 && (
          <span style={{ marginLeft: '20px', fontWeight: 'bold', color: updatesPerSecond > 100000 ? '#00ff00' : '#ffaa00' }}>
            Current: {updatesPerSecond.toLocaleString()} updates/sec
          </span>
        )}
        <span style={{ 
          marginLeft: '20px', 
          fontSize: '12px',
          color: wsConnected ? '#00ff00' : '#ff4444'
        }}>
          WebSocket: {wsConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>
      
      <div className="grid-container ag-theme-balham-dark">
        <AgGridReact<TradeRecord>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          columnTypes={columnTypes}
          animateRows={false}
          groupDefaultExpanded={0}
          rowGroupPanelShow={'always'}
          pivotPanelShow={'always'}
          suppressAggFuncInHeader={true}
          getRowId={(params) => params.data.trade.toString()}
          onGridReady={onGridReady}
          sideBar={showToolPanel}
          asyncTransactionWaitMillis={5}
          suppressColumnVirtualisation={false}
          suppressRowVirtualisation={false}
          debounceVerticalScrollbar={true}
          // Removed immutableData as it hurt performance
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
      
      <PerformanceMetrics
        updatesPerSecond={updatesPerSecond}
        isRunning={isExtremeRunning}
        totalRows={rowData.length}
        showMetrics={showMetrics}
      />
    </div>
  );
};

export default App;
