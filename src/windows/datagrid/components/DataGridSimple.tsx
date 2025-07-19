import React, { useState, useEffect, useRef } from "react";
import { ModuleRegistry, themeQuartz, ColDef, GridApi } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Download, Settings } from "lucide-react";

ModuleRegistry.registerModules([AllEnterpriseModule]);

// Define row data interface
interface RowData {
  [key: string]: string | number | boolean;
}

// Define theme configuration outside the component
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

// Generate 2000 rows x 30 columns of data
const rowData: RowData[] = (() => {
  const data: RowData[] = [];
  for (let i = 0; i < 2000; i++) {
    const row: RowData = { id: i };
    for (let j = 1; j <= 30; j++) {
      if (j % 3 === 0) {
        row[`col${j}`] = `Text-${i}-${j}`;
      } else if (j % 3 === 1) {
        row[`col${j}`] = Math.round(Math.random() * 1000);
      } else {
        row[`col${j}`] = Math.random() > 0.5;
      }
    }
    data.push(row);
  }
  return data;
})();

// Define typed column definitions
const columnDefs: ColDef<RowData>[] = (() => {
  const cols: ColDef<RowData>[] = [];
  // Add ID column first
  cols.push({
    field: 'id',
    headerName: 'ID',
    filter: true,
    sortable: true,
    resizable: true,
    width: 80,
    pinned: 'left'
  });
  
  // Add 30 data columns
  for (let i = 1; i <= 30; i++) {
    cols.push({
      field: `col${i}`,
      headerName: `Column ${i}`,
      filter: true,
      sortable: true,
      resizable: true,
      cellDataType: i % 3 === 0 ? 'text' : i % 3 === 1 ? 'number' : 'boolean'
    });
  }
  return cols;
})();

const defaultColDef = {
  flex: 1,
  minWidth: 100,
  filter: true,
  enableValue: true,
  enableRowGroup: true,
  enablePivot: true,
};

// Function to set dark mode on document body
function setDarkMode(enabled: boolean) {
  document.body.dataset.agThemeMode = enabled ? "dark" : "light";
}

// Column Settings Dialog Component
const ColumnSettingsDialog: React.FC<{
  show: boolean;
  onClose: () => void;
  columnDefs: ColDef<RowData>[];
  api?: GridApi<RowData> | null;
}> = ({ show, onClose, columnDefs, api }) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--ag-background-color, white)",
          padding: "20px",
          borderRadius: "8px",
          width: "500px",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Column Settings</h2>
        <div style={{ marginBottom: "15px" }}>
          <p>Manage your column visibility and settings:</p>
          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            {columnDefs.map((col, index) => (
              <div key={index} style={{ marginBottom: "8px", display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id={`col-${index}`}
                  checked={!col.hide}
                  onChange={() => {
                    if (api) {
                      const currentVisibility = !col.hide;
                      api.setColumnVisible(col.field as string, !currentVisibility);
                    }
                  }}
                />
                <label htmlFor={`col-${index}`} style={{ marginLeft: "8px" }}>
                  {col.headerName || col.field}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--ag-alpine-active-color, #2196f3)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Export the component to enable fast refresh
export const DataGridSimple = () => {
  // Use state to manage dark mode
  const [darkMode, setDarkModeState] = useState<boolean>(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  
  // Update the body dataset when dark mode changes
  useEffect(() => {
    setDarkMode(darkMode);
  }, [darkMode]);

  // Custom menu items for the grid context menu
  const getContextMenuItems = () => {
    return [
      {
        name: "Column Settings",
        icon: '<i class="fas fa-columns"></i>',
        action: () => setShowColumnSettings(true),
      },
      "separator",
      "autoSizeAll",
      "resetColumns",
      "separator",
      "copy",
      "copyWithHeaders",
      "paste",
      "separator",
      "export",
    ];
  };

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

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar - 60px height */}
      <div 
        style={{ 
          height: "60px",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "16px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: darkMode ? "#1f2937" : "#ffffff"
        }}
      >
        <div className="flex items-center gap-4 flex-1">
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
          
          <Separator orientation="vertical" className="h-8" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnSettings(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Column Settings
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="sidebar-toggle"
              checked={sidebarVisible}
              onCheckedChange={setSidebarVisible}
            />
            <Label htmlFor="sidebar-toggle">Sidebar</Label>
          </div>
          
          <Separator orientation="vertical" className="h-8" />
          
          <div className="flex items-center space-x-2">
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={setDarkModeState}
            />
            <Label htmlFor="dark-mode">Dark Mode</Label>
          </div>
        </div>
      </div>
      
      {/* AG-Grid container - fills remaining space */}
      <div style={{ flex: 1 }}>
        <AgGridReact
          style={{ height: "100%", width: "100%" }}
          theme={theme}
          columnDefs={columnDefs}
          rowData={rowData}
          defaultColDef={defaultColDef}
          sideBar={sidebarVisible ? {
            toolPanels: [
              {
                id: 'columns',
                labelDefault: 'Columns',
                labelKey: 'columns',
                iconKey: 'columns',
                toolPanel: 'agColumnsToolPanel',
              },
              {
                id: 'filters',
                labelDefault: 'Filters',
                labelKey: 'filters',
                iconKey: 'filter',
                toolPanel: 'agFiltersToolPanel',
              },
            ],
            defaultToolPanel: 'columns'
          } : false}
          getContextMenuItems={getContextMenuItems}
          onGridReady={(params) => {
            gridApiRef.current = params.api;
            console.log("Grid ready with", rowData.length, "rows");
          }}
        />
      </div>
      
      <ColumnSettingsDialog
        show={showColumnSettings}
        onClose={() => setShowColumnSettings(false)}
        columnDefs={columnDefs}
        api={gridApiRef.current}
      />
    </div>
  );
};

// Initialize dark mode when the component first loads
setDarkMode(false);

export default DataGridSimple;