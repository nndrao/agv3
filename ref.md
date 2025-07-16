import React, { StrictMode, useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import { ModuleRegistry, themeQuartz, ColDef, GridApi } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";

ModuleRegistry.registerModules([AllEnterpriseModule]);

// Define row data interface
interface RowData {
  make: string;
  model: string;
  price: number;
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

// Sample data and column definitions
const rowData: RowData[] = (() => {
  const data: RowData[] = [];
  for (let i = 0; i < 10; i++) {
    data.push({ make: "Toyota", model: "Celica", price: 35000 + i * 1000 });
    data.push({ make: "Ford", model: "Mondeo", price: 32000 + i * 1000 });
    data.push({
      make: "Porsche",
      model: "Boxster",
      price: 72000 + i * 1000,
    });
  }
  return data;
})();

// Define typed column definitions
const columnDefs: ColDef<RowData>[] = [
  { field: 'make' as keyof RowData },
  { field: 'model' as keyof RowData },
  { field: 'price' as keyof RowData }
];

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
          <div>
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
export const GridExample = () => {
  // Use state to manage dark mode
  const [darkMode, setDarkModeState] = useState<boolean>(false);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
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

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <p style={{ flex: 0 }}>
        <label>
          Dark mode:{" "}
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkModeState(e.target.checked)}
          />
        </label>
        <button 
          style={{ 
            marginLeft: "20px", 
            padding: "4px 12px",
            cursor: "pointer",
            backgroundColor: "var(--ag-alpine-active-color, #2196f3)",
            color: "white",
            border: "none",
            borderRadius: "4px"
          }}
          onClick={() => setShowColumnSettings(true)}
        >
          Column Settings
        </button>
      </p>
      <div style={{ flex: 1 }}>
        <AgGridReact
          theme={theme}
          columnDefs={columnDefs}
          rowData={rowData}
          defaultColDef={defaultColDef}
          sideBar
          getContextMenuItems={getContextMenuItems}
          onGridReady={(params) => {
            gridApiRef.current = params.api;
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

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <GridExample />
  </StrictMode>
);
