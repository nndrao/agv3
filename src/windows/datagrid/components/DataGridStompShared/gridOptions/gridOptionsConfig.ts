import { GridOptionsSection } from './types';

export const gridOptionsSections: GridOptionsSection[] = [
  {
    id: 'appearance',
    title: 'Appearance & Layout',
    icon: null as any,
    options: [
      {
        key: 'headerHeight',
        label: 'Header Height',
        type: 'number',
        description: 'Height of the column headers',
        defaultValue: 40,
        min: 20,
        max: 100,
        step: 5,
        unit: 'px'
      },
      {
        key: 'rowHeight',
        label: 'Row Height',
        type: 'number',
        description: 'Height of the data rows',
        defaultValue: 40,
        min: 20,
        max: 100,
        step: 5,
        unit: 'px'
      },
      {
        key: 'floatingFiltersHeight',
        label: 'Floating Filters Height',
        type: 'number',
        description: 'Height of floating filter row',
        defaultValue: 40,
        min: 20,
        max: 80,
        step: 5,
        unit: 'px'
      },
      {
        key: 'groupHeaderHeight',
        label: 'Group Header Height',
        type: 'number',
        description: 'Height of group headers',
        defaultValue: 40,
        min: 20,
        max: 100,
        step: 5,
        unit: 'px'
      },
      {
        key: 'pivotHeaderHeight',
        label: 'Pivot Header Height',
        type: 'number',
        description: 'Height of pivot headers',
        defaultValue: 40,
        min: 20,
        max: 100,
        step: 5,
        unit: 'px'
      },
      {
        key: 'pivotGroupHeaderHeight',
        label: 'Pivot Group Header Height',
        type: 'number',
        description: 'Height of pivot group headers',
        defaultValue: 50,
        min: 20,
        max: 100,
        step: 5,
        unit: 'px'
      },
      {
        key: 'detailRowHeight',
        label: 'Detail Row Height',
        type: 'number',
        description: 'Height of detail rows in master/detail',
        defaultValue: 300,
        min: 50,
        max: 1000,
        step: 50,
        unit: 'px'
      },
      {
        key: 'detailRowAutoHeight',
        label: 'Detail Row Auto Height',
        type: 'boolean',
        description: 'Auto-size detail row height',
        defaultValue: false
      },
      {
        key: 'enableRtl',
        label: 'Right-to-Left Layout',
        type: 'boolean',
        description: 'Enable RTL layout for the grid',
        defaultValue: false
      },
      {
        key: 'domLayout',
        label: 'DOM Layout',
        type: 'select',
        description: 'Control how the grid is sized',
        defaultValue: 'normal',
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'autoHeight', label: 'Auto Height' },
          { value: 'print', label: 'Print' }
        ]
      },
      {
        key: 'font',
        label: 'Font Family',
        type: 'select',
        description: 'Font family for the grid',
        defaultValue: 'monospace',
        options: [
          { value: 'JetBrains Mono', label: 'JetBrains Mono' },
          { value: 'Fira Code', label: 'Fira Code' },
          { value: 'Source Code Pro', label: 'Source Code Pro' },
          { value: 'IBM Plex Mono', label: 'IBM Plex Mono' },
          { value: 'Roboto Mono', label: 'Roboto Mono' },
          { value: 'Monaco', label: 'Monaco' },
          { value: 'Consolas', label: 'Consolas' },
          { value: 'Courier New', label: 'Courier New' },
          { value: 'monospace', label: 'System Monospace' }
        ]
      },
      {
        key: 'scrollbarWidth',
        label: 'Scrollbar Width',
        type: 'number',
        description: 'Width of the scrollbar in pixels',
        defaultValue: 8,
        min: 0,
        max: 20,
        step: 1,
        unit: 'px'
      },
      {
        key: 'suppressHorizontalScroll',
        label: 'Suppress Horizontal Scroll',
        type: 'boolean',
        description: 'Disable horizontal scrolling',
        defaultValue: false
      },
      {
        key: 'alwaysShowHorizontalScroll',
        label: 'Always Show Horizontal Scroll',
        type: 'boolean',
        description: 'Always show horizontal scrollbar',
        defaultValue: false
      },
      {
        key: 'alwaysShowVerticalScroll',
        label: 'Always Show Vertical Scroll',
        type: 'boolean',
        description: 'Always show vertical scrollbar',
        defaultValue: false
      },
      {
        key: 'debounceVerticalScrollbar',
        label: 'Debounce Vertical Scrollbar',
        type: 'boolean',
        description: 'Debounce vertical scrollbar to improve performance',
        defaultValue: false
      },
      {
        key: 'suppressMaxRenderedRowRestriction',
        label: 'Suppress Max Row Restriction',
        type: 'boolean',
        description: 'Remove restriction on maximum rendered rows',
        defaultValue: false
      },
      {
        key: 'suppressScrollOnNewData',
        label: 'Suppress Scroll on New Data',
        type: 'boolean',
        description: 'Prevent auto-scrolling when new data loads',
        defaultValue: false
      },
      {
        key: 'suppressAnimationFrame',
        label: 'Suppress Animation Frame',
        type: 'boolean',
        description: 'Disable animation frames for scrolling',
        defaultValue: false
      },
      {
        key: 'suppressPreventDefaultOnMouseWheel',
        label: 'Allow Browser Wheel Events',
        type: 'boolean',
        description: 'Allow browser to handle mouse wheel events',
        defaultValue: false
      },
      {
        key: 'suppressScrollWhenPopupsAreOpen',
        label: 'Suppress Scroll When Popups Open',
        type: 'boolean',
        description: 'Prevent scrolling when popups are open',
        defaultValue: false
      },
      {
        key: 'suppressBrowserResizeObserver',
        label: 'Suppress Browser Resize Observer',
        type: 'boolean',
        description: 'Disable browser resize observer',
        defaultValue: false
      }
    ]
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: null as any,
    options: [
      {
        key: 'rowBuffer',
        label: 'Row Buffer',
        type: 'number',
        description: 'Number of rows rendered outside visible area',
        defaultValue: 10,
        min: 0,
        max: 50,
        step: 5
      },
      {
        key: 'suppressRowVirtualisation',
        label: 'Disable Row Virtualisation',
        type: 'boolean',
        description: 'Render all rows at once (impacts performance)',
        defaultValue: false
      },
      {
        key: 'suppressColumnVirtualisation',
        label: 'Disable Column Virtualisation',
        type: 'boolean',
        description: 'Render all columns at once (impacts performance)',
        defaultValue: false
      },
      {
        key: 'animateRows',
        label: 'Animate Rows',
        type: 'boolean',
        description: 'Enable row animations',
        defaultValue: true
      },
      {
        key: 'suppressChangeDetection',
        label: 'Suppress Change Detection',
        type: 'boolean',
        description: 'Disable change detection for performance',
        defaultValue: false
      },
      {
        key: 'valueCache',
        label: 'Enable Value Cache',
        type: 'boolean',
        description: 'Cache cell values for performance',
        defaultValue: false
      },
      {
        key: 'valueCacheNeverExpires',
        label: 'Value Cache Never Expires',
        type: 'boolean',
        description: 'Prevent value cache from expiring',
        defaultValue: false
      },
      {
        key: 'aggregateOnlyChangedColumns',
        label: 'Aggregate Only Changed Columns',
        type: 'boolean',
        description: 'Only re-aggregate columns that changed',
        defaultValue: false
      },
      {
        key: 'suppressAggFuncInHeader',
        label: 'Suppress Agg Func in Header',
        type: 'boolean',
        description: 'Hide aggregation function in header',
        defaultValue: false
      },
      {
        key: 'suppressAggAtRootLevel',
        label: 'Suppress Root Level Aggregation',
        type: 'boolean',
        description: 'Disable aggregation at root level',
        defaultValue: false
      },
      {
        key: 'asyncTransactionWaitMillis',
        label: 'Async Transaction Wait',
        type: 'number',
        description: 'Milliseconds to wait before applying async transactions',
        defaultValue: 50,
        min: 0,
        max: 5000,
        step: 50,
        unit: 'ms'
      },
      {
        key: 'suppressModelUpdateAfterUpdateTransaction',
        label: 'Suppress Model Update',
        type: 'boolean',
        description: 'Suppress model update after transaction',
        defaultValue: false
      },
      {
        key: 'deltaSort',
        label: 'Delta Sort',
        type: 'boolean',
        description: 'Enable delta sorting for better performance',
        defaultValue: false
      }
    ]
  },
  {
    id: 'behavior',
    title: 'Behavior',
    icon: null as any,
    options: [
      {
        key: 'pagination',
        label: 'Enable Pagination',
        type: 'boolean',
        description: 'Show data in pages',
        defaultValue: false
      },
      {
        key: 'paginationPageSize',
        label: 'Page Size',
        type: 'number',
        description: 'Number of rows per page',
        defaultValue: 100,
        min: 10,
        max: 1000,
        step: 10
      },
      {
        key: 'paginationAutoPageSize',
        label: 'Auto Page Size',
        type: 'boolean',
        description: 'Automatically calculate page size',
        defaultValue: false
      },
      {
        key: 'paginationPageSizeSelector',
        label: 'Page Size Selector',
        type: 'multiselect',
        description: 'Options for page size selector',
        defaultValue: [20, 50, 100, 200],
        options: [
          { value: 10, label: '10' },
          { value: 20, label: '20' },
          { value: 50, label: '50' },
          { value: 100, label: '100' },
          { value: 200, label: '200' },
          { value: 500, label: '500' },
          { value: 1000, label: '1000' }
        ]
      },
      {
        key: 'suppressPaginationPanel',
        label: 'Suppress Pagination Panel',
        type: 'boolean',
        description: 'Hide the pagination panel',
        defaultValue: false
      },
      {
        key: 'rowSelection',
        label: 'Row Selection',
        type: 'select',
        description: 'Row selection mode',
        defaultValue: undefined,
        options: [
          { value: undefined, label: 'Disabled' },
          { value: 'single', label: 'Single' },
          { value: 'multiple', label: 'Multiple' }
        ]
      },
      {
        key: 'suppressRowDeselection',
        label: 'Suppress Row Deselection',
        type: 'boolean',
        description: 'Prevent deselecting rows',
        defaultValue: false
      },
      {
        key: 'suppressRowClickSelection',
        label: 'Suppress Row Click Selection',
        type: 'boolean',
        description: 'Disable row selection on click',
        defaultValue: false
      },
      {
        key: 'suppressCellFocus',
        label: 'Suppress Cell Focus',
        type: 'boolean',
        description: 'Disable cell focus',
        defaultValue: false
      },
      {
        key: 'suppressMultiRangeSelection',
        label: 'Suppress Multi Range Selection',
        type: 'boolean',
        description: 'Disable multiple range selection',
        defaultValue: false
      },
      {
        key: 'suppressRowHoverHighlight',
        label: 'Suppress Row Hover Highlight',
        type: 'boolean',
        description: 'Disable row hover highlighting',
        defaultValue: false
      },
      {
        key: 'suppressRowClickHighlight',
        label: 'Suppress Row Click Highlight',
        type: 'boolean',
        description: 'Disable row click highlighting',
        defaultValue: false
      },
      {
        key: 'columnHoverHighlight',
        label: 'Column Hover Highlight',
        type: 'boolean',
        description: 'Enable column hover highlighting',
        defaultValue: false
      },
      {
        key: 'enableRangeSelection',
        label: 'Enable Range Selection',
        type: 'boolean',
        description: 'Allow selecting cell ranges',
        defaultValue: false
      },
      {
        key: 'enableRangeHandle',
        label: 'Enable Range Handle',
        type: 'boolean',
        description: 'Show range selection handle',
        defaultValue: false
      },
      {
        key: 'enableFillHandle',
        label: 'Enable Fill Handle',
        type: 'boolean',
        description: 'Show fill handle for copying values',
        defaultValue: false
      },
      {
        key: 'fillHandleDirection',
        label: 'Fill Handle Direction',
        type: 'select',
        description: 'Direction for fill handle operation',
        defaultValue: 'xy',
        options: [
          { value: 'x', label: 'Horizontal Only' },
          { value: 'y', label: 'Vertical Only' },
          { value: 'xy', label: 'Both Directions' }
        ]
      },
      {
        key: 'suppressClearOnFillReduction',
        label: 'Suppress Clear on Fill Reduction',
        type: 'boolean',
        description: 'Keep values when reducing fill selection',
        defaultValue: false
      },
      {
        key: 'rowMultiSelectWithClick',
        label: 'Multi Select with Click',
        type: 'boolean',
        description: 'Enable multi-select without Ctrl key',
        defaultValue: false
      }
    ]
  },
  {
    id: 'editing',
    title: 'Editing',
    icon: null as any,
    options: [
      {
        key: 'editType',
        label: 'Edit Type',
        type: 'select',
        description: 'Cell editing mode',
        defaultValue: undefined,
        options: [
          { value: undefined, label: 'Cell Edit' },
          { value: 'fullRow', label: 'Full Row Edit' }
        ]
      },
      {
        key: 'singleClickEdit',
        label: 'Single Click Edit',
        type: 'boolean',
        description: 'Enable editing with single click',
        defaultValue: false
      },
      {
        key: 'suppressClickEdit',
        label: 'Suppress Click Edit',
        type: 'boolean',
        description: 'Disable editing on click',
        defaultValue: false
      },
      {
        key: 'stopEditingWhenCellsLoseFocus',
        label: 'Stop Editing on Blur',
        type: 'boolean',
        description: 'Stop editing when cell loses focus',
        defaultValue: false
      },
      {
        key: 'enterNavigatesVertically',
        label: 'Enter Navigates Vertically',
        type: 'boolean',
        description: 'Enter key moves to cell below',
        defaultValue: false
      },
      {
        key: 'enterNavigatesVerticallyAfterEdit',
        label: 'Enter Navigates After Edit',
        type: 'boolean',
        description: 'Enter key moves down after editing',
        defaultValue: false
      },
      {
        key: 'undoRedoCellEditing',
        label: 'Enable Undo/Redo',
        type: 'boolean',
        description: 'Enable undo/redo for cell editing',
        defaultValue: false
      },
      {
        key: 'undoRedoCellEditingLimit',
        label: 'Undo/Redo Limit',
        type: 'number',
        description: 'Maximum undo/redo stack size',
        defaultValue: 10,
        min: 0,
        max: 100,
        step: 10
      }
    ]
  },
  {
    id: 'dataAndFiltering',
    title: 'Data & Filtering',
    icon: null as any,
    options: [
      {
        key: 'enableAdvancedFilter',
        label: 'Enable Advanced Filter',
        type: 'boolean',
        description: 'Enable the advanced filter',
        defaultValue: false
      },
      {
        key: 'suppressAdvancedFilterEval',
        label: 'Suppress Advanced Filter Eval',
        type: 'boolean',
        description: 'Disable advanced filter evaluation',
        defaultValue: false
      },
      {
        key: 'includeHiddenColumnsInAdvancedFilter',
        label: 'Include Hidden Columns',
        type: 'boolean',
        description: 'Include hidden columns in advanced filter',
        defaultValue: false
      },
      {
        key: 'suppressMenuHide',
        label: 'Suppress Menu Hide',
        type: 'boolean',
        description: 'Keep column menu open after action',
        defaultValue: false
      },
      {
        key: 'unSortIcon',
        label: 'Show Unsort Icon',
        type: 'boolean',
        description: 'Show icon to remove sorting',
        defaultValue: false
      },
      {
        key: 'suppressFieldDotNotation',
        label: 'Suppress Field Dot Notation',
        type: 'boolean',
        description: 'Disable dot notation in field names',
        defaultValue: false
      },
      {
        key: 'enableCellChangeFlash',
        label: 'Enable Cell Change Flash',
        type: 'boolean',
        description: 'Flash cells when data changes',
        defaultValue: true
      },
      {
        key: 'cellFlashDuration',
        label: 'Cell Flash Duration',
        type: 'number',
        description: 'Duration of cell flash in milliseconds',
        defaultValue: 500,
        min: 0,
        max: 2000,
        step: 100,
        unit: 'ms'
      },
      {
        key: 'cellFadeDuration',
        label: 'Cell Fade Duration',
        type: 'number',
        description: 'Duration of cell fade in milliseconds',
        defaultValue: 1000,
        min: 0,
        max: 5000,
        step: 100,
        unit: 'ms'
      },
      {
        key: 'allowShowChangeAfterFilter',
        label: 'Allow Show Change After Filter',
        type: 'boolean',
        description: 'Allow showing changes after filtering',
        defaultValue: false
      },
      {
        key: 'accentedSort',
        label: 'Accented Sort',
        type: 'boolean',
        description: 'Consider accents when sorting',
        defaultValue: false
      },
      {
        key: 'suppressMultiSort',
        label: 'Suppress Multi Sort',
        type: 'boolean',
        description: 'Disable sorting by multiple columns',
        defaultValue: false
      },
      {
        key: 'alwaysMultiSort',
        label: 'Always Multi Sort',
        type: 'boolean',
        description: 'Always sort by multiple columns',
        defaultValue: false
      }
    ]
  },
  {
    id: 'rowGrouping',
    title: 'Row Grouping',
    icon: null as any,
    options: [
      {
        key: 'groupDisplayType',
        label: 'Group Display Type',
        type: 'select',
        description: 'How to display grouped rows',
        defaultValue: 'singleColumn',
        options: [
          { value: 'singleColumn', label: 'Single Column' },
          { value: 'multipleColumns', label: 'Multiple Columns' },
          { value: 'groupRows', label: 'Group Rows' },
          { value: 'custom', label: 'Custom' }
        ]
      },
      {
        key: 'groupDefaultExpanded',
        label: 'Group Default Expanded',
        type: 'number',
        description: 'Number of group levels to expand by default (-1 for all)',
        defaultValue: 0,
        min: -1,
        max: 10,
        step: 1
      },
      {
        key: 'groupMaintainOrder',
        label: 'Group Maintain Order',
        type: 'boolean',
        description: 'Maintain row order when grouping',
        defaultValue: false
      },
      {
        key: 'groupSelectsChildren',
        label: 'Group Selects Children',
        type: 'boolean',
        description: 'Selecting group selects all children',
        defaultValue: false
      },
      {
        key: 'groupAggFiltering',
        label: 'Group Agg Filtering',
        type: 'boolean',
        description: 'Apply filters to aggregated group values',
        defaultValue: false
      },
      {
        key: 'groupIncludeFooter',
        label: 'Group Include Footer',
        type: 'boolean',
        description: 'Show footer for each group',
        defaultValue: false
      },
      {
        key: 'groupIncludeTotalFooter',
        label: 'Group Include Total Footer',
        type: 'boolean',
        description: 'Show total footer row',
        defaultValue: false
      },
      {
        key: 'groupSuppressBlankHeader',
        label: 'Group Suppress Blank Header',
        type: 'boolean',
        description: 'Hide blank group headers',
        defaultValue: false
      },
      {
        key: 'groupSelectsFiltered',
        label: 'Group Selects Filtered',
        type: 'boolean',
        description: 'Group selection includes only filtered rows',
        defaultValue: false
      },
      {
        key: 'showOpenedGroup',
        label: 'Show Opened Group',
        type: 'boolean',
        description: 'Show opened groups in separate column',
        defaultValue: false
      },
      {
        key: 'groupRemoveSingleChildren',
        label: 'Group Remove Single Children',
        type: 'boolean',
        description: 'Remove groups with single child',
        defaultValue: false
      },
      {
        key: 'groupRemoveLowestSingleChildren',
        label: 'Group Remove Lowest Single Children',
        type: 'boolean',
        description: 'Remove only lowest level single children',
        defaultValue: false
      },
      {
        key: 'groupHideOpenParents',
        label: 'Group Hide Open Parents',
        type: 'boolean',
        description: 'Hide parent rows when group is open',
        defaultValue: false
      },
      {
        key: 'rowGroupPanelShow',
        label: 'Row Group Panel Show',
        type: 'select',
        description: 'When to show row grouping panel',
        defaultValue: 'onlyWhenGrouping',
        options: [
          { value: 'always', label: 'Always' },
          { value: 'onlyWhenGrouping', label: 'Only When Grouping' },
          { value: 'never', label: 'Never' }
        ]
      },
      {
        key: 'suppressGroupRowsSticky',
        label: 'Suppress Group Rows Sticky',
        type: 'boolean',
        description: 'Disable sticky group rows',
        defaultValue: false
      }
    ]
  },
  {
    id: 'clipboard',
    title: 'Clipboard',
    icon: null as any,
    options: [
      {
        key: 'copyHeadersToClipboard',
        label: 'Copy Headers to Clipboard',
        type: 'boolean',
        description: 'Include headers when copying',
        defaultValue: false
      },
      {
        key: 'copyGroupHeadersToClipboard',
        label: 'Copy Group Headers to Clipboard',
        type: 'boolean',
        description: 'Include group headers when copying',
        defaultValue: false
      },
      {
        key: 'clipboardDelimiter',
        label: 'Clipboard Delimiter',
        type: 'select',
        description: 'Delimiter for clipboard data',
        defaultValue: '\t',
        options: [
          { value: '\t', label: 'Tab' },
          { value: ',', label: 'Comma' },
          { value: ';', label: 'Semicolon' },
          { value: '|', label: 'Pipe' }
        ]
      },
      {
        key: 'suppressCopyRowsToClipboard',
        label: 'Suppress Copy Rows',
        type: 'boolean',
        description: 'Disable copying rows to clipboard',
        defaultValue: false
      },
      {
        key: 'suppressCopySingleCellRanges',
        label: 'Suppress Copy Single Cell',
        type: 'boolean',
        description: 'Disable copying single cells',
        defaultValue: false
      },
      {
        key: 'suppressLastEmptyLineOnPaste',
        label: 'Suppress Last Empty Line',
        type: 'boolean',
        description: 'Remove empty line when pasting',
        defaultValue: false
      },
      {
        key: 'suppressClipboardPaste',
        label: 'Suppress Clipboard Paste',
        type: 'boolean',
        description: 'Disable pasting from clipboard',
        defaultValue: false
      },
      {
        key: 'suppressClipboardApi',
        label: 'Suppress Clipboard API',
        type: 'boolean',
        description: 'Disable clipboard API usage',
        defaultValue: false
      },
      {
        key: 'suppressCutToClipboard',
        label: 'Suppress Cut to Clipboard',
        type: 'boolean',
        description: 'Disable cutting to clipboard',
        defaultValue: false
      }
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced',
    icon: null as any,
    options: [
      {
        key: 'autoSizeStrategy',
        label: 'Auto Size Strategy',
        type: 'select',
        description: 'Strategy for auto-sizing columns',
        defaultValue: undefined,
        options: [
          { value: undefined, label: 'Default' },
          { value: 'fitCellContents', label: 'Fit Cell Contents' },
          { value: 'fitProvidedWidth', label: 'Fit Provided Width' },
          { value: 'fitGridWidth', label: 'Fit Grid Width' }
        ]
      },
      {
        key: 'masterDetail',
        label: 'Master Detail',
        type: 'boolean',
        description: 'Enable master/detail view',
        defaultValue: false
      },
      {
        key: 'keepDetailRows',
        label: 'Keep Detail Rows',
        type: 'boolean',
        description: 'Keep detail rows in memory',
        defaultValue: false
      },
      {
        key: 'keepDetailRowsCount',
        label: 'Keep Detail Rows Count',
        type: 'number',
        description: 'Number of detail rows to keep',
        defaultValue: 10,
        min: 0,
        max: 100,
        step: 10
      },
      {
        key: 'ensureDomOrder',
        label: 'Ensure DOM Order',
        type: 'boolean',
        description: 'Ensure DOM elements match data order',
        defaultValue: false
      },
      {
        key: 'suppressRowTransform',
        label: 'Suppress Row Transform',
        type: 'boolean',
        description: 'Disable CSS transforms on rows',
        defaultValue: false
      },
      {
        key: 'suppressColumnMoveAnimation',
        label: 'Suppress Column Move Animation',
        type: 'boolean',
        description: 'Disable column move animations',
        defaultValue: false
      },
      {
        key: 'suppressMovableColumns',
        label: 'Suppress Movable Columns',
        type: 'boolean',
        description: 'Disable column moving',
        defaultValue: false
      },
      {
        key: 'suppressContextMenu',
        label: 'Suppress Context Menu',
        type: 'boolean',
        description: 'Disable context menu',
        defaultValue: false
      },
      {
        key: 'preventDefaultOnContextMenu',
        label: 'Prevent Default Context Menu',
        type: 'boolean',
        description: 'Prevent browser context menu',
        defaultValue: false
      },
      {
        key: 'allowContextMenuWithControlKey',
        label: 'Allow Context Menu with Ctrl',
        type: 'boolean',
        description: 'Show context menu with Ctrl key',
        defaultValue: false
      },
      {
        key: 'suppressDragLeaveHidesColumns',
        label: 'Suppress Drag Leave Hides',
        type: 'boolean',
        description: 'Prevent hiding columns on drag leave',
        defaultValue: false
      },
      {
        key: 'suppressFocusAfterRefresh',
        label: 'Suppress Focus After Refresh',
        type: 'boolean',
        description: 'Prevent focus after refresh',
        defaultValue: false
      },
      {
        key: 'suppressAsyncEvents',
        label: 'Suppress Async Events',
        type: 'boolean',
        description: 'Make all events synchronous',
        defaultValue: false
      },
      {
        key: 'suppressRowDrag',
        label: 'Suppress Row Drag',
        type: 'boolean',
        description: 'Disable row dragging',
        defaultValue: false
      },
      {
        key: 'rowDragManaged',
        label: 'Row Drag Managed',
        type: 'boolean',
        description: 'Enable managed row dragging',
        defaultValue: false
      },
      {
        key: 'rowDragEntireRow',
        label: 'Drag Entire Row',
        type: 'boolean',
        description: 'Drag using entire row',
        defaultValue: false
      },
      {
        key: 'rowDragMultiRow',
        label: 'Multi Row Drag',
        type: 'boolean',
        description: 'Enable dragging multiple rows',
        defaultValue: false
      },
      {
        key: 'suppressMoveWhenRowDragging',
        label: 'Suppress Move When Dragging',
        type: 'boolean',
        description: 'Prevent row movement while dragging',
        defaultValue: false
      },
      {
        key: 'suppressLoadingOverlay',
        label: 'Suppress Loading Overlay',
        type: 'boolean',
        description: 'Hide loading overlay',
        defaultValue: false
      },
      {
        key: 'suppressNoRowsOverlay',
        label: 'Suppress No Rows Overlay',
        type: 'boolean',
        description: 'Hide no rows overlay',
        defaultValue: false
      },
      {
        key: 'tooltipShowDelay',
        label: 'Tooltip Show Delay',
        type: 'number',
        description: 'Delay before showing tooltip',
        defaultValue: 2000,
        min: 0,
        max: 5000,
        step: 100,
        unit: 'ms'
      },
      {
        key: 'tooltipHideDelay',
        label: 'Tooltip Hide Delay',
        type: 'number',
        description: 'Delay before hiding tooltip',
        defaultValue: 10000,
        min: 0,
        max: 10000,
        step: 1000,
        unit: 'ms'
      },
      {
        key: 'tooltipMouseTrack',
        label: 'Tooltip Mouse Track',
        type: 'boolean',
        description: 'Tooltip follows mouse cursor',
        defaultValue: false
      },
      {
        key: 'debug',
        label: 'Debug Mode',
        type: 'boolean',
        description: 'Enable debug mode',
        defaultValue: false
      }
    ]
  }
];

// Export functions to get all grid option keys
export function getAllGridOptionKeys(): string[] {
  const keys: string[] = [];
  gridOptionsSections.forEach(section => {
    section.options.forEach(option => {
      keys.push(option.key);
    });
  });
  return keys;
}

// Export function to get default grid options
export function getDefaultGridOptions(): Record<string, any> {
  const defaults: Record<string, any> = {};
  gridOptionsSections.forEach(section => {
    section.options.forEach(option => {
      if (option.defaultValue !== undefined) {
        defaults[option.key] = option.defaultValue;
      }
    });
  });
  return defaults;
}