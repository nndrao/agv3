import { themeQuartz, ColDef } from "ag-grid-community";

// Define theme configuration
export const GRID_THEME = themeQuartz
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

// Default column definition
export const DEFAULT_COL_DEF: ColDef = {
  flex: 1,
  minWidth: 100,
  filter: true,
  sortable: true,
  resizable: true,
  enableCellChangeFlash: true,
  // Allow value formatters to work
  useValueFormatterForExport: true
};

// Status bar configuration - will be updated dynamically with connection status
export const getStatusBarConfig = () => ({
  statusPanels: [
    { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
    { statusPanel: 'agTotalRowCountComponent', align: 'center' },
    { statusPanel: 'agFilteredRowCountComponent', align: 'center' },
    { statusPanel: 'agSelectedRowCountComponent', align: 'center' },
    { statusPanel: 'agAggregationComponent', align: 'right' },
    { statusPanel: 'connectionStatusPanel', align: 'right' }
  ]
});

// Grid performance settings
export const GRID_PERFORMANCE_CONFIG = {
  asyncTransactionWaitMillis: 50,
  rowBuffer: 10,
  animateRows: false,
  suppressRowHoverHighlight: false,
  cellFlashDuration: 500,
  cellFadeDuration: 1000,
  suppressColumnVirtualisation: false,
  suppressRowVirtualisation: false
};

// Helper function to create theme with dynamic font
export const createThemeWithFont = (fontFamily?: string) => {
  const baseFont = fontFamily || 'Inter';
  
  return themeQuartz
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
        fontFamily: baseFont,
        fontSize: 14,
        headerBackgroundColor: "#D9D9D9D6",
        headerFontFamily: baseFont,
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
        fontFamily: baseFont,
        browserColorScheme: "dark",
        chromeBackgroundColor: {
          ref: "foregroundColor",
          mix: 0.07,
          onto: "backgroundColor",
        },
        fontSize: 14,
        foregroundColor: "#FFF",
        headerFontFamily: baseFont,
        headerFontSize: 14,
        iconSize: 12,
        inputBorderRadius: 2,
        oddRowBackgroundColor: "#1f1f1f",
        spacing: 6,
        wrapperBorderRadius: 2,
      },
      "dark"
    );
};