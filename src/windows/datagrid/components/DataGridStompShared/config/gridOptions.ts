// Grid option type definitions
export type GridOptionType = 'boolean' | 'number' | 'string' | 'select';

export interface GridOptionDefinition {
  key: string;
  label: string;
  type: GridOptionType;
  defaultValue: any;
  description: string;
  category: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface GridOptionsCategory {
  name: string;
  label: string;
  description: string;
  options: GridOptionDefinition[];
}

// Grid options organized by category
export const GRID_OPTIONS_CATEGORIES: GridOptionsCategory[] = [
  {
    name: 'display',
    label: 'Display',
    description: 'Visual appearance and layout options',
    options: [
      {
        key: 'animateRows',
        label: 'Animate Rows',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable row animations when sorting, filtering, etc.',
        category: 'display'
      },
      {
        key: 'rowHeight',
        label: 'Row Height',
        type: 'number',
        defaultValue: 25,
        description: 'Default height in pixels for rows',
        category: 'display',
        min: 10,
        max: 100,
        step: 5
      },
      {
        key: 'headerHeight',
        label: 'Header Height',
        type: 'number',
        defaultValue: 25,
        description: 'Height in pixels of the column headers',
        category: 'display',
        min: 10,
        max: 100,
        step: 5
      },
      {
        key: 'groupHeaderHeight',
        label: 'Group Header Height',
        type: 'number',
        defaultValue: 25,
        description: 'Height in pixels of the column group headers',
        category: 'display',
        min: 10,
        max: 100,
        step: 5
      },
      {
        key: 'floatingFiltersHeight',
        label: 'Floating Filters Height',
        type: 'number',
        defaultValue: 25,
        description: 'Height in pixels of the floating filter row',
        category: 'display',
        min: 10,
        max: 100,
        step: 5
      },
      {
        key: 'pivotHeaderHeight',
        label: 'Pivot Header Height',
        type: 'number',
        defaultValue: 25,
        description: 'Height in pixels of the pivot column headers',
        category: 'display',
        min: 10,
        max: 100,
        step: 5
      },
      {
        key: 'pivotGroupHeaderHeight',
        label: 'Pivot Group Header Height',
        type: 'number',
        defaultValue: 25,
        description: 'Height in pixels of the pivot column group headers',
        category: 'display',
        min: 10,
        max: 100,
        step: 5
      }
    ]
  },
  {
    name: 'scrolling',
    label: 'Scrolling & Performance',
    description: 'Options affecting scrolling behavior and performance',
    options: [
      {
        key: 'suppressScrollOnNewData',
        label: 'Suppress Scroll on New Data',
        type: 'boolean',
        defaultValue: false,
        description: 'Prevent scroll position reset when data updates',
        category: 'scrolling'
      },
      {
        key: 'suppressAnimationFrame',
        label: 'Suppress Animation Frame',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable use of animation frames for smoother scrolling',
        category: 'scrolling'
      },
      {
        key: 'suppressColumnVirtualisation',
        label: 'Suppress Column Virtualisation',
        type: 'boolean',
        defaultValue: false,
        description: 'Render all columns instead of only visible ones',
        category: 'scrolling'
      },
      {
        key: 'suppressRowVirtualisation',
        label: 'Suppress Row Virtualisation',
        type: 'boolean',
        defaultValue: false,
        description: 'Render all rows instead of only visible ones',
        category: 'scrolling'
      },
      {
        key: 'rowBuffer',
        label: 'Row Buffer',
        type: 'number',
        defaultValue: 10,
        description: 'Number of extra rows to render outside the viewport',
        category: 'scrolling',
        min: 0,
        max: 50,
        step: 5
      },
      {
        key: 'asyncTransactionWaitMillis',
        label: 'Async Transaction Wait (ms)',
        type: 'number',
        defaultValue: 50,
        description: 'Milliseconds to wait before batching async transactions',
        category: 'scrolling',
        min: 0,
        max: 500,
        step: 10
      },
      {
        key: 'scrollbarWidth',
        label: 'Scrollbar Width',
        type: 'number',
        defaultValue: 10,
        description: 'Width of vertical scrollbar in pixels',
        category: 'scrolling',
        min: 0,
        max: 20,
        step: 1
      }
    ]
  },
  {
    name: 'selection',
    label: 'Selection',
    description: 'Row and cell selection behavior',
    options: [
      {
        key: 'rowSelection',
        label: 'Row Selection',
        type: 'select',
        defaultValue: 'multiple',
        description: 'Row selection mode',
        category: 'selection',
        options: [
          { value: 'single', label: 'Single' },
          { value: 'multiple', label: 'Multiple' }
        ]
      },
      {
        key: 'suppressRowClickSelection',
        label: 'Suppress Row Click Selection',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable row selection by clicking',
        category: 'selection'
      },
      {
        key: 'suppressCellFocus',
        label: 'Suppress Cell Focus',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable cell focus indicator',
        category: 'selection'
      },
      {
        key: 'suppressRowDeselection',
        label: 'Suppress Row Deselection',
        type: 'boolean',
        defaultValue: false,
        description: 'Prevent deselecting rows once selected',
        category: 'selection'
      },
      {
        key: 'suppressMultiRangeSelection',
        label: 'Suppress Multi Range Selection',
        type: 'boolean',
        defaultValue: false,
        description: 'Allow only single range selection',
        category: 'selection'
      },
      {
        key: 'enableCellTextSelection',
        label: 'Enable Cell Text Selection',
        type: 'boolean',
        defaultValue: false,
        description: 'Allow text selection within cells',
        category: 'selection'
      },
      {
        key: 'ensureDomOrder',
        label: 'Ensure DOM Order',
        type: 'boolean',
        defaultValue: false,
        description: 'Ensure DOM elements match data order (for accessibility)',
        category: 'selection'
      }
    ]
  },
  {
    name: 'editing',
    label: 'Editing',
    description: 'Cell editing behavior and navigation',
    options: [
      {
        key: 'editType',
        label: 'Edit Type',
        type: 'select',
        defaultValue: null,
        description: 'Cell editing mode',
        category: 'editing',
        options: [
          { value: 'fullRow', label: 'Full Row' },
          { value: '', label: 'Single Cell' }
        ]
      },
      {
        key: 'stopEditingWhenCellsLoseFocus',
        label: 'Stop Editing When Cells Lose Focus',
        type: 'boolean',
        defaultValue: true,
        description: 'Stop editing when clicking outside the cell',
        category: 'editing'
      },
      {
        key: 'enterNavigatesVertically',
        label: 'Enter Navigates Vertically',
        type: 'boolean',
        defaultValue: false,
        description: 'Enter key moves to cell below instead of right',
        category: 'editing'
      },
      {
        key: 'enterNavigatesVerticallyAfterEdit',
        label: 'Enter Navigates Vertically After Edit',
        type: 'boolean',
        defaultValue: false,
        description: 'Enter key after editing moves to cell below',
        category: 'editing'
      },
      {
        key: 'enableCellChangeFlash',
        label: 'Enable Cell Change Flash',
        type: 'boolean',
        defaultValue: true,  // Changed to true to enable cell flashing by default
        description: 'Flash cells when their data changes',
        category: 'editing'
      },
      {
        key: 'cellFlashDuration',
        label: 'Cell Flash Duration (ms)',
        type: 'number',
        defaultValue: 500,
        description: 'Duration of cell flash animation',
        category: 'editing',
        min: 100,
        max: 2000,
        step: 100
      },
      {
        key: 'cellFadeDuration',
        label: 'Cell Fade Duration (ms)',
        type: 'number',
        defaultValue: 1000,
        description: 'Duration of cell fade animation',
        category: 'editing',
        min: 100,
        max: 2000,
        step: 100
      }
    ]
  },
  {
    name: 'clipboard',
    label: 'Clipboard',
    description: 'Copy and paste behavior',
    options: [
      {
        key: 'copyHeadersToClipboard',
        label: 'Copy Headers to Clipboard',
        type: 'boolean',
        defaultValue: true,
        description: 'Include column headers when copying',
        category: 'clipboard'
      },
      {
        key: 'copyGroupHeadersToClipboard',
        label: 'Copy Group Headers to Clipboard',
        type: 'boolean',
        defaultValue: false,
        description: 'Include column group headers when copying',
        category: 'clipboard'
      },
      {
        key: 'suppressCopyRowsToClipboard',
        label: 'Suppress Copy Rows to Clipboard',
        type: 'boolean',
        defaultValue: false,
        description: 'Prevent copying row data',
        category: 'clipboard'
      },
      {
        key: 'suppressCopySingleCellRanges',
        label: 'Suppress Copy Single Cell Ranges',
        type: 'boolean',
        defaultValue: false,
        description: 'Prevent copying single cell selections',
        category: 'clipboard'
      },
      {
        key: 'suppressClipboardPaste',
        label: 'Suppress Clipboard Paste',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable paste from clipboard',
        category: 'clipboard'
      },
      {
        key: 'suppressClipboardApi',
        label: 'Suppress Clipboard API',
        type: 'boolean',
        defaultValue: false,
        description: 'Use older clipboard methods for compatibility',
        category: 'clipboard'
      }
    ]
  },
  {
    name: 'pagination',
    label: 'Pagination',
    description: 'Row pagination settings',
    options: [
      {
        key: 'pagination',
        label: 'Enable Pagination',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable row pagination',
        category: 'pagination'
      },
      {
        key: 'paginationPageSize',
        label: 'Page Size',
        type: 'number',
        defaultValue: 100,
        description: 'Number of rows per page',
        category: 'pagination',
        min: 10,
        max: 1000,
        step: 10
      },
      {
        key: 'paginationAutoPageSize',
        label: 'Auto Page Size',
        type: 'boolean',
        defaultValue: false,
        description: 'Automatically calculate page size to fit viewport',
        category: 'pagination'
      },
      {
        key: 'suppressPaginationPanel',
        label: 'Suppress Pagination Panel',
        type: 'boolean',
        defaultValue: false,
        description: 'Hide the pagination control panel',
        category: 'pagination'
      }
    ]
  },
  {
    name: 'other',
    label: 'Other Features',
    description: 'Miscellaneous grid features',
    options: [
      {
        key: 'enableRtl',
        label: 'Enable RTL',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable right-to-left text direction',
        category: 'other'
      },
      {
        key: 'enableCharts',
        label: 'Enable Charts',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable integrated charting features',
        category: 'other'
      },
      {
        key: 'suppressMenuHide',
        label: 'Suppress Menu Hide',
        type: 'boolean',
        defaultValue: false,
        description: 'Keep column menu button always visible',
        category: 'other'
      },
      {
        key: 'suppressContextMenu',
        label: 'Suppress Context Menu',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable right-click context menu',
        category: 'other'
      },
      {
        key: 'preventDefaultOnContextMenu',
        label: 'Prevent Default on Context Menu',
        type: 'boolean',
        defaultValue: false,
        description: 'Prevent browser context menu from showing',
        category: 'other'
      },
      {
        key: 'suppressDragLeaveHidesColumns',
        label: 'Suppress Drag Leave Hides Columns',
        type: 'boolean',
        defaultValue: false,
        description: 'Prevent columns from hiding when dragged out of grid',
        category: 'other'
      },
      {
        key: 'suppressRowHoverHighlight',
        label: 'Suppress Row Hover Highlight',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable row highlighting on hover',
        category: 'other'
      },
      {
        key: 'suppressRowTransform',
        label: 'Suppress Row Transform',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable CSS transforms on rows (for compatibility)',
        category: 'other'
      },
      {
        key: 'columnHoverHighlight',
        label: 'Column Hover Highlight',
        type: 'boolean',
        defaultValue: false,
        description: 'Highlight entire column on hover',
        category: 'other'
      },
      {
        key: 'deltaSort',
        label: 'Delta Sort',
        type: 'boolean',
        defaultValue: false,
        description: 'Only re-sort changed rows for better performance',
        category: 'other'
      },
      {
        key: 'treeData',
        label: 'Tree Data',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable tree data display mode',
        category: 'other'
      },
      {
        key: 'functionsPassive',
        label: 'Functions Passive',
        type: 'boolean',
        defaultValue: false,
        description: 'Use passive event listeners for better scroll performance',
        category: 'other'
      },
      {
        key: 'enableRangeSelection',
        label: 'Enable Range Selection',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable selecting cell ranges',
        category: 'other'
      },
      {
        key: 'enableRangeHandle',
        label: 'Enable Range Handle',
        type: 'boolean',
        defaultValue: false,
        description: 'Show fill handle for range selection',
        category: 'other'
      },
      {
        key: 'enableFillHandle',
        label: 'Enable Fill Handle',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable fill handle for copying cell values',
        category: 'other'
      },
      {
        key: 'suppressClearOnFillReduction',
        label: 'Suppress Clear on Fill Reduction',
        type: 'boolean',
        defaultValue: false,
        description: 'Keep cell values when reducing fill selection',
        category: 'other'
      },
      {
        key: 'allowShowChangeAfterFilter',
        label: 'Allow Show Change After Filter',
        type: 'boolean',
        defaultValue: false,
        description: 'Allow column visibility changes after filtering',
        category: 'other'
      }
    ]
  }
];

// Helper function to get all grid options as a flat map
export function getAllGridOptions(): Map<string, GridOptionDefinition> {
  const optionsMap = new Map<string, GridOptionDefinition>();
  
  GRID_OPTIONS_CATEGORIES.forEach(category => {
    category.options.forEach(option => {
      optionsMap.set(option.key, option);
    });
  });
  
  return optionsMap;
}

// Helper function to get default values for all options
export function getDefaultGridOptions(): Record<string, any> {
  const defaults: Record<string, any> = {};
  
  GRID_OPTIONS_CATEGORIES.forEach(category => {
    category.options.forEach(option => {
      defaults[option.key] = option.defaultValue;
    });
  });
  
  return defaults;
}