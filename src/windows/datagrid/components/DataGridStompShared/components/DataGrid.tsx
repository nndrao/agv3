import React, { useMemo } from 'react';
import { AgGridReact } from "ag-grid-react";
import { DataGridProps } from '../types';
import { agGridComponents } from '@/components/ag-grid/cell-renderers';
import { agGridValueFormatters } from '@/components/ag-grid/value-formatters';
import { GRID_PERFORMANCE_CONFIG } from '../config/gridConfig';
import { ConnectionStatusPanel } from './ConnectionStatusPanel';

export const DataGrid = React.memo<DataGridProps>(({
  theme,
  rowData,
  columnDefs,
  defaultColDef,
  sidebarVisible,
  onGridReady,
  getRowId,
  statusBarConfig,
  connectionState,
  snapshotData,
  gridOptions = {}
}) => {
  console.log('[🔍][DATA_GRID] DataGrid rendering with columnDefs:', columnDefs?.length || 0, 'columns');
  // Merge custom components with ag-grid components
  const components = useMemo(() => ({
    ...agGridComponents,
    connectionStatusPanel: ConnectionStatusPanel
  }), []);
  
  // Create status bar with connection status props
  const statusBar = useMemo(() => {
    if (!statusBarConfig) return undefined;
    
    return {
      ...statusBarConfig,
      statusPanels: statusBarConfig.statusPanels.map((panel: any) => {
        if (panel.statusPanel === 'connectionStatusPanel') {
          return {
            ...panel,
            statusPanelParams: {
              connectionState,
              snapshotData
            }
          };
        }
        return panel;
      })
    };
  }, [statusBarConfig, connectionState, snapshotData]);
  
  return (
    <AgGridReact
      theme={theme}
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      sideBar={sidebarVisible}
      onGridReady={(params) => {
        console.log('[🔍][DATA_GRID] AG-Grid onGridReady fired');
        onGridReady(params);
      }}
      getRowId={getRowId}
      statusBar={statusBar}
      // Apply grid options from profile (excluding font which is handled by wrapper)
      {...Object.fromEntries(Object.entries(gridOptions).filter(([key]) => key !== 'font'))}
      // Override with performance config if not in gridOptions
      animateRows={gridOptions.animateRows ?? GRID_PERFORMANCE_CONFIG.animateRows}
      suppressRowHoverHighlight={gridOptions.suppressRowHoverHighlight ?? GRID_PERFORMANCE_CONFIG.suppressRowHoverHighlight}
      cellFlashDuration={gridOptions.cellFlashDuration ?? GRID_PERFORMANCE_CONFIG.cellFlashDuration}
      cellFadeDuration={gridOptions.cellFadeDuration ?? GRID_PERFORMANCE_CONFIG.cellFadeDuration}
      asyncTransactionWaitMillis={gridOptions.asyncTransactionWaitMillis ?? GRID_PERFORMANCE_CONFIG.asyncTransactionWaitMillis}
      suppressColumnVirtualisation={gridOptions.suppressColumnVirtualisation ?? GRID_PERFORMANCE_CONFIG.suppressColumnVirtualisation}
      suppressRowVirtualisation={gridOptions.suppressRowVirtualisation ?? GRID_PERFORMANCE_CONFIG.suppressRowVirtualisation}
      // Components
      components={components}
      // Context to pass formatters and connection data
      context={{
        valueFormatters: agGridValueFormatters,
        connectionState,
        snapshotData
      }}
    />
  );
});