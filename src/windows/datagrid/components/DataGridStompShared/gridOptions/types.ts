export interface GridOptionField {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'select' | 'multiselect' | 'string';
  description?: string;
  defaultValue?: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface GridOptionsSection {
  id: string;
  title: string;
  icon: any;
  options: GridOptionField[];
}

export interface GridOptionsConfig {
  // Appearance & Layout
  headerHeight?: number;
  rowHeight?: number;
  floatingFiltersHeight?: number;
  groupHeaderHeight?: number;
  pivotHeaderHeight?: number;
  pivotGroupHeaderHeight?: number;
  
  // Scrolling
  scrollbarWidth?: number;
  suppressHorizontalScroll?: boolean;
  alwaysShowHorizontalScroll?: boolean;
  alwaysShowVerticalScroll?: boolean;
  debounceVerticalScrollbar?: boolean;
  suppressScrollOnNewData?: boolean;
  suppressAnimationFrame?: boolean;
  suppressPreventDefaultOnMouseWheel?: boolean;
  suppressScrollWhenPopupsAreOpen?: boolean;
  suppressBrowserResizeObserver?: boolean;
  suppressMaxRenderedRowRestriction?: boolean;
  
  // Performance
  rowBuffer?: number;
  suppressRowVirtualisation?: boolean;
  suppressColumnVirtualisation?: boolean;
  animateRows?: boolean;
  suppressChangeDetection?: boolean;
  valueCache?: boolean;
  valueCacheNeverExpires?: boolean;
  aggregateOnlyChangedColumns?: boolean;
  suppressAggFuncInHeader?: boolean;
  suppressAggAtRootLevel?: boolean;
  asyncTransactionWaitMillis?: number;
  
  // Row Models
  pagination?: boolean;
  paginationPageSize?: number;
  paginationAutoPageSize?: boolean;
  suppressPaginationPanel?: boolean;
  
  // Selection
  rowSelection?: 'single' | 'multiple';
  suppressRowDeselection?: boolean;
  suppressRowClickSelection?: boolean;
  suppressCellFocus?: boolean;
  suppressMultiRangeSelection?: boolean;
  
  // Rendering
  domLayout?: 'normal' | 'autoHeight' | 'print';
  ensureDomOrder?: boolean;
  enableRtl?: boolean;
  suppressColumnMoveAnimation?: boolean;
  suppressMovableColumns?: boolean;
  suppressFieldDotNotation?: boolean;
  unSortIcon?: boolean;
  suppressMenuHide?: boolean;
  autoGroupColumnDef?: any;
  suppressRowTransform?: boolean;
  
  // Editing
  editType?: 'fullRow';
  singleClickEdit?: boolean;
  suppressClickEdit?: boolean;
  stopEditingWhenCellsLoseFocus?: boolean;
  enterNavigatesVertically?: boolean;
  enterNavigatesVerticallyAfterEdit?: boolean;
  undoRedoCellEditing?: boolean;
  undoRedoCellEditingLimit?: number;
  
  // Headers
  suppressMovingInCss?: boolean;
  suppressTouch?: boolean;
  suppressAsyncEvents?: boolean;
  
  // Clipboard
  copyHeadersToClipboard?: boolean;
  copyGroupHeadersToClipboard?: boolean;
  clipboardDelimiter?: string;
  suppressCopyRowsToClipboard?: boolean;
  suppressCopySingleCellRanges?: boolean;
  suppressLastEmptyLineOnPaste?: boolean;
  suppressClipboardPaste?: boolean;
  suppressClipboardApi?: boolean;
  suppressCutToClipboard?: boolean;
  
  // Export
  suppressCsvExport?: boolean;
  suppressExcelExport?: boolean;
  
  // Row Dragging
  rowDragManaged?: boolean;
  suppressRowDrag?: boolean;
  suppressMoveWhenRowDragging?: boolean;
  rowDragEntireRow?: boolean;
  rowDragMultiRow?: boolean;
  
  // Row Grouping
  groupDisplayType?: 'singleColumn' | 'multipleColumns' | 'groupRows' | 'custom';
  groupDefaultExpanded?: number;
  groupMaintainOrder?: boolean;
  groupSelectsChildren?: boolean;
  groupAggFiltering?: boolean;
  groupIncludeFooter?: boolean;
  groupIncludeTotalFooter?: boolean;
  groupSuppressBlankHeader?: boolean;
  groupSelectsFiltered?: boolean;
  showOpenedGroup?: boolean;
  groupRemoveSingleChildren?: boolean;
  groupRemoveLowestSingleChildren?: boolean;
  groupHideOpenParents?: boolean;
  rowGroupPanelShow?: 'always' | 'onlyWhenGrouping' | 'never';
  suppressGroupRowsSticky?: boolean;
  
  // Pivoting
  pivotMode?: boolean;
  pivotPanelShow?: 'always' | 'onlyWhenPivoting' | 'never';
  pivotMaxGeneratedColumns?: number;
  pivotDefaultExpanded?: number;
  pivotSuppressAutoColumn?: boolean;
  suppressExpandablePivotGroups?: boolean;
  functionsReadOnly?: boolean;
  functionsPassive?: boolean;
  
  // Filtering
  enableAdvancedFilter?: boolean;
  suppressAdvancedFilterEval?: boolean;
  includeHiddenColumnsInAdvancedFilter?: boolean;
  
  // Other
  debug?: boolean;
  maintainColumnOrder?: boolean;
  enableCellChangeFlash?: boolean;
  cellFlashDuration?: number;
  cellFadeDuration?: number;
  allowShowChangeAfterFilter?: boolean;
  
  // Master Detail
  masterDetail?: boolean;
  keepDetailRows?: boolean;
  keepDetailRowsCount?: number;
  detailRowHeight?: number;
  detailRowAutoHeight?: boolean;
  
  // Miscellaneous
  localeText?: any;
  suppressContextMenu?: boolean;
  preventDefaultOnContextMenu?: boolean;
  allowContextMenuWithControlKey?: boolean;
  suppressDragLeaveHidesColumns?: boolean;
  suppressFocusAfterRefresh?: boolean;
  suppressModelUpdateAfterUpdateTransaction?: boolean;
  suppressRowHoverHighlight?: boolean;
  suppressRowClickHighlight?: boolean;
  columnHoverHighlight?: boolean;
  deltaSort?: boolean;
  enableGroupEdit?: boolean;
  suppressMaintainUnsortedOrder?: boolean;
  
  // Tree Data
  treeData?: boolean;
  getDataPath?: any;
  
  // Loading
  suppressLoadingOverlay?: boolean;
  suppressNoRowsOverlay?: boolean;
  
  // Tooltips
  tooltipShowDelay?: number;
  tooltipHideDelay?: number;
  tooltipMouseTrack?: boolean;
  
  // Font
  font?: string;
}