import React, { useState, useEffect, useRef } from "react";
import { ModuleRegistry, themeQuartz, ColDef, GridApi } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Download, Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import "@/index.css";

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
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background p-6 rounded-lg w-[500px] max-h-[80vh] overflow-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Column Settings</h2>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-3">Manage your column visibility and settings:</p>
          <div className="max-h-[400px] overflow-auto space-y-2">
            {columnDefs.map((col, index) => (
              <div key={index} className="flex items-center space-x-2">
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
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor={`col-${index}`} className="text-sm">
                  {col.headerName || col.field}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export the component to enable fast refresh
export const DataGridSimple = () => {
  const { theme: appTheme, setTheme } = useTheme();
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  
  // Check if styles are loaded and initialize theme
  useEffect(() => {
    // Ensure theme is applied to root immediately
    const root = window.document.documentElement;
    if (!root.classList.contains('light') && !root.classList.contains('dark')) {
      root.classList.add('light'); // Default to light if no theme
    }
    
    // Give styles time to load
    const timer = setTimeout(() => setStylesLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Determine if dark mode based on theme
  const isDarkMode = appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Update the body dataset when dark mode changes
  useEffect(() => {
    setDarkMode(isDarkMode);
    // Also update the root element class for shadcn/ui components
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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

  if (!stylesLoaded) {
    return <div className="h-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'dark' : 'light'}`} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Toolbar - 60px height */}
      <div className="h-[60px] border-b bg-background flex items-center px-4 gap-4">
        <div className="flex items-center gap-2 flex-1">
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
            <Label htmlFor="sidebar-toggle" className="text-sm">Sidebar</Label>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(appTheme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* AG-Grid container - fills remaining space */}
      <div className="flex-1">
        <AgGridReact
          style={{ height: "100%", width: "100%" }}
          theme={theme}
          columnDefs={columnDefs}
          rowData={rowData}
          defaultColDef={defaultColDef}
          rowSelection="multiple"
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
          statusBar={{
            statusPanels: [
              { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
              { statusPanel: 'agTotalRowCountComponent', align: 'center' },
              { statusPanel: 'agFilteredRowCountComponent', align: 'center' },
              { statusPanel: 'agSelectedRowCountComponent', align: 'center' },
              { statusPanel: 'agAggregationComponent', align: 'right' }
            ]
          }}
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