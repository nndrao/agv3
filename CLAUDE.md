# AGV3 Project Memory

## StompDatasourceProvider - Fixed Implementation

### Overview
The StompDatasourceProvider has been refactored to properly handle the STOMP server lifecycle with clear separation between snapshot and real-time modes, based on the correct lifecycle explanation provided.

### STOMP Server Lifecycle (Correct Implementation)

1. **Connection Phase**
   - Client connects to WebSocket
   - Establishes STOMP connection

2. **Snapshot Phase**
   - Subscribe to listener topic
   - Send 'REQUESTING_SNAPSHOT_DATA' event
   - Send snapshot request message (trigger)
   - Server sends data in batches
   - Server sends end token when complete
   - Client sends 'SNAPSHOT_COMPLETE' event

3. **Real-time Phase**
   - Subscribe to updates (might be same or different topic)
   - Receive continuous updates
   - Apply updates using transactions

### Key Implementation Changes

#### 1. Lifecycle Events
```typescript
// Added to StompStatistics
mode: 'idle' | 'snapshot' | 'realtime'

// New events emitted
provider.emit('REQUESTING_SNAPSHOT_DATA')
provider.emit('SNAPSHOT_COMPLETE', { rowCount, duration })
```

#### 2. Snapshot Handling
- Check for end token FIRST before processing data
- Support batch processing with callback
- Accumulate data during snapshot phase
- Emit SNAPSHOT_COMPLETE when end token received

#### 3. Real-time Updates
```typescript
// New method for real-time subscription
async subscribeToRealtimeUpdates(onUpdate: (data: any[]) => void): Promise<void>

// Unsubscribe method
unsubscribeFromRealtimeUpdates(): void
```

### DataTable Integration

#### Snapshot Mode Handling
```typescript
// Listen for lifecycle events
subscriberRef.current.subscribe('REQUESTING_SNAPSHOT_DATA');
subscriberRef.current.subscribe('SNAPSHOT_COMPLETE');

// Track snapshot state
const [snapshotMode, setSnapshotMode] = useState<'idle' | 'requesting' | 'receiving' | 'complete'>('idle');

// Accumulate data during snapshot
const snapshotDataRef = useRef<RowData[]>([]);

// On SNAPSHOT_COMPLETE, set all data at once
setRowData(snapshotDataRef.current);
```

#### Real-time Mode Handling
```typescript
// After snapshot complete, use applyTransactionAsync
const transaction = {
  update: data.updates  // AG-Grid automatically handles add/update based on row ID
};
gridApiRef.current.applyTransactionAsync(transaction);
```

### Provider Window Updates

1. **Removed old subscribeToUpdates() method** - now uses provider's subscribeToRealtimeUpdates()

2. **Event forwarding** - forwards lifecycle events to DataTable:
   - REQUESTING_SNAPSHOT_DATA
   - SNAPSHOT_COMPLETE

3. **Batch processing during snapshot** - publishes batches as they arrive

4. **Proper cleanup** - unsubscribes from real-time updates on stop

### Configuration (StompConfig)
```typescript
interface StompConfig {
  websocketUrl: string;      // WebSocket URL
  listenerTopic: string;     // Topic to subscribe to
  requestMessage?: string;   // Topic to send snapshot request
  requestBody?: string;      // Body of snapshot request
  snapshotEndToken?: string; // Token indicating end of snapshot
  keyColumn?: string;        // Key field for row identification
  messageRate?: string;      // Expected message rate
  snapshotTimeoutMs?: number; // Snapshot timeout (default: 60000)
}
```

### Flow Diagram
```
DataTable                Provider              STOMP Server
    |                       |                       |
    |---- getSnapshot ----->|                       |
    |<- REQUESTING_DATA ----|                       |
    |                       |--- Subscribe -------->|
    |                       |--- Send Request ----->|
    |                       |<---- Batch 1 ---------|
    |<---- update (batch) --|                       |
    |                       |<---- Batch 2 ---------|
    |<---- update (batch) --|                       |
    |                       |<---- End Token -------|
    |<- SNAPSHOT_COMPLETE --|                       |
    |                       |                       |
    |                       |-- Subscribe Updates ->|
    |                       |<--- Real-time Data ---|
    |<--- update (realtime)-|                       |
```

---

## Provider Pool Architecture Plan

### Overview
After fixing StompDatasourceProvider, implement a provider pool architecture that:
- Reduces OS windows from 100 to 5-10
- NO WebSocket connection sharing (each provider keeps its own)
- Simple architecture without message routing complexity

### Key Design Decisions
1. Each provider maintains its own WebSocket connection
2. Workers only share window/process overhead, not connections
3. No message demultiplexing needed
4. Expected 90% memory reduction through window consolidation

### Implementation Plan
See: `/mnt/c/Users/developer/Documents/provider-pool-implementation-plan.md`

---

## Current Working State

### What's Working:
- STOMP provider properly implements snapshot and real-time lifecycle
- Clear separation between snapshot and real-time modes
- Proper event emission for lifecycle tracking
- DataTable correctly handles both modes
- End token detection works correctly
- Batch processing during snapshot

### Fixed Issues:
1. ✅ StompDatasourceProvider now follows correct lifecycle
2. ✅ Snapshot data properly delivered with batching
3. ✅ End token checked before processing data
4. ✅ Clear mode separation (snapshot vs real-time)
5. ✅ Proper event lifecycle (REQUESTING_SNAPSHOT_DATA, SNAPSHOT_COMPLETE)

### Next Steps:
1. Implement provider pool architecture for better scaling
2. Add reconnection logic with exponential backoff
3. Implement circuit breaker for failing connections

### Important Commands:
- Lint code: `npm run lint`
- Type check: `npm run typecheck`
- These commands should be run before committing changes

---

## Session Updates (2025-08-01)

### 1. Grid Options Performance Optimization
**Problem**: Apply Changes button taking over 3 seconds to save 200 options
**Solution**: 
- Implemented batch updates using `requestAnimationFrame`
- Only update options that actually changed
- Added performance timing logs
- Reduced update time from 3+ seconds to milliseconds

```typescript
// Performance optimization in handleApplyGridOptions
const changedOptions: Record<string, any> = {};
Object.entries(newOptions).forEach(([key, value]) => {
  if (key !== 'font' && currentOptions[key] !== value) {
    changedOptions[key] = value;
  }
});

requestAnimationFrame(() => {
  Object.entries(changedOptions).forEach(([key, value]) => {
    gridApi.setGridOption(key, value);
  });
});
```

### 2. Column Group Editor Implementation
**Feature**: Complete column group editor based on specification
**Components Created**:
- `ColumnGroupEditor.tsx` - Main editor component
- `ColumnGroupService.ts` - Service for applying groups to AG-Grid
- `types.ts` - TypeScript interfaces

**Key Features**:
- Two-panel layout (groups list and column selection)
- Create/update/delete column groups
- Column visibility control (open/closed/default states)
- Proper state management
- Integration with AG-Grid API

### 3. Column Group Persistence
**Feature**: Save column groups with profile
**Implementation**:
- Added `columnGroups` to `DataGridStompSharedProfile` interface
- Added `unsavedColumnGroups` state for temporary changes
- Column groups saved when profile is saved
- Column groups loaded and applied when profile loads

### 4. Column Group Show Implementation
**Feature**: Control column visibility based on group expand/collapse state
**Implementation**:
- Added `columnStates` to `ColumnGroupDefinition`:
  ```typescript
  columnStates?: Record<string, 'open' | 'closed' | undefined>;
  ```
- Applied `columnGroupShow` attribute to columns:
  - `'open'` - Column only visible when group is expanded
  - `'closed'` - Column only visible when group is collapsed  
  - `undefined` - Column always visible

### 5. Bug Fixes

#### a. Column Groups Not Applying on Load
**Problem**: Groups saved but not applied when component loads
**Solution**: 
- Added effect to apply column groups after grid is ready
- Handle null `columnApi` for newer AG-Grid versions
- Added 500ms delay to ensure grid initialization

#### b. Dropdown Portal Issue
**Problem**: Select dropdowns opening in parent window
**Solution**: Created and used `NoPortalSelect` component that renders dropdowns locally

#### c. Column Groups Dialog Not Opening
**Problem**: Menu click didn't open dialog
**Solution**: 
- Fixed OpenFinPortalDialog to handle existing windows in bad state
- Added force close for stuck windows
- Added timeout for window ready check

#### d. Layout Issues
**Problem**: Poor layout in column group editor (from screenshot)
**Solution**:
- Fixed flexbox layout structure
- Added proper scrollable areas
- Made sidebar wider
- Positioned buttons correctly

### 6. Enhanced Debugging
**Added Extensive Logging**:
- Column group creation and updates
- Column definitions before and after applying
- Group expand/collapse behavior testing
- API method availability checks
- Detailed verification of applied configurations

### 7. Testing Utilities
**Created Test Helpers**:
- `testColumnGroupShow.ts` - Test configuration demonstrator
- Automatic expand/collapse testing after applying groups
- Console verification of column visibility states

### 8. UI/UX Improvements
- Changed from checkboxes to proper Select components for column options
- Added visual feedback for selected columns
- Improved button placement and spacing
- Added "Clear All" functionality
- Better error messages and toasts

### 9. State Management Improvements
- Separated saved vs unsaved changes for both grid options and column groups
- Proper cleanup when switching profiles
- Consistent state updates across all operations

### 10. API Compatibility
- Added checks for both `columnApi` and `gridApi` methods
- Handle AG-Grid version differences gracefully
- Fallback approaches for missing methods

---

## Recent Updates (2025-07-15)

### End Token Detection Enhancement
- Changed from exact string match to case-insensitive contains check
- Now uses `messageBody.toLowerCase().includes(endToken.toLowerCase())`
- Handles variations like "Success", "SUCCESS", or messages containing the token

### DataTable Performance Updates

#### AG-Grid Configuration
```typescript
// Added to AgGridReact component
enableCellChangeFlash={true}           // Built-in cell flashing
asyncTransactionWaitMillis={50}        // Batch updates for performance
statusBar={{...}}                      // Added status bar with row counts
```

#### Real-time Updates Implementation
```typescript
// Simplified to use AG-Grid best practices
const transaction = {
  update: data.updates
};
// Using applyTransactionAsync for better performance
const result = gridApiRef.current.applyTransactionAsync(transaction);
```

#### Key Changes Made:
1. **Removed custom CellFlashService** - Using AG-Grid's built-in `enableCellChangeFlash`
2. **Simplified transaction logic** - Let AG-Grid determine add vs update based on row ID
3. **Added defensive checks** in getRowId function
4. **Using forEachNode** for safer row data access (fixed initial implementation)
5. **Added key column validation** before applying updates

### Performance Issues (CURRENT PROBLEM)

#### Symptoms:
- DataTable is sluggish when receiving updates
- Real-time updates may be causing performance degradation

#### Potential Causes:
1. **Snapshot Data Handling**:
   - Currently using `setRowData()` which replaces all data
   - During snapshot, we're calling setRowData multiple times as batches arrive
   - Should accumulate all snapshot data and set once at the end

2. **Update Frequency**:
   - May be receiving updates too frequently
   - Even with `asyncTransactionWaitMillis`, updates might be overwhelming

3. **Row Data Size**:
   - Large datasets might need virtual scrolling or pagination
   - Current implementation loads all data into memory

4. **Grid Redrawing**:
   - Multiple setRowData calls during snapshot cause full grid redraws
   - Should use immutable data updates

#### Recommended Fixes:

1. **Optimize Snapshot Loading**:
```typescript
// Don't update grid during snapshot receiving
if (snapshotMode === 'receiving') {
  snapshotDataRef.current.push(...data.updates);
  // Don't call setRowData here
} else if (snapshotMode === 'complete') {
  // Set all data once when complete
  setRowData(snapshotDataRef.current);
}
```

2. **Enable Row Virtualization**:
```typescript
rowBuffer={10}
rowModelType={'clientSide'}
animateRows={false}  // Disable during snapshot
suppressRowHoverHighlight={true}
suppressCellFocus={true}
```

3. **Debounce Updates**:
```typescript
// Consider debouncing real-time updates
const debouncedUpdate = useMemo(
  () => debounce((updates) => {
    gridApiRef.current?.applyTransactionAsync({ update: updates });
  }, 100),
  []
);
```

### Provider Window Batch Handling
- Fixed to send only new items in each batch, not accumulated data
- Tracks `previousLength` to slice only new items
- This prevents sending increasingly large payloads

### Error Handling
- Added try-catch blocks around transaction application
- Better error logging for debugging
- Fallback mechanisms if transactions fail

---

## DataGridStompShared Refactoring Plan (2025-07-30)

### Overview
Plan to refactor the 1464-line DataGridStompShared component into smaller, focused modules while preventing re-renders and infinite loops.

### Goals
- Modularize into smaller, focused modules
- **PREVENT re-renders and infinite loops**
- Preserve ALL existing features, behaviors, styling, and functions
- Make the component simpler and more performant
- Improve maintainability

### Key Performance Principles
1. **Stable References**: Use `useCallback`, `useMemo`, and `useRef` appropriately
2. **Proper Dependencies**: Ensure all hook dependencies are correctly specified
3. **Avoid State Cascades**: Prevent state updates that trigger other state updates
4. **Ref-based Values**: Use refs for values that don't need to trigger re-renders

### Proposed Module Structure with Performance Focus

#### 1. Custom Hooks (with re-render prevention)

```typescript
// hooks/useSharedWorkerConnection.ts
- Uses refs for connection state that doesn't need UI updates
- Stable callback references with useCallback
- Returns only necessary reactive state

// hooks/useSnapshotData.ts
- Uses ref for accumulating data (snapshotDataRef)
- Only updates state when snapshot is complete
- Memoized handlers to prevent re-creation

// hooks/useProviderConfig.ts
- Caches loaded configs
- Stable loading function with useCallback
- Minimal state updates

// hooks/useGridState.ts
- Debounced state persistence
- Memoized grid configuration
- Refs for grid API to avoid re-renders

// hooks/useViewTitle.ts
- LocalStorage-based with minimal re-renders
- Effect runs only on mount

// hooks/useThemeSync.ts
- Memoized theme calculations
- Single effect for theme updates
```

#### 2. Constants & Configuration

```typescript
// config/gridConfig.ts
export const GRID_THEME = themeQuartz.withParams(...);
export const DEFAULT_COL_DEF = { flex: 1, minWidth: 100, ... };
export const STATUS_BAR_CONFIG = { statusPanels: [...] };

// config/profileDefaults.ts
export const DEFAULT_PROFILE: DataGridStompSharedProfile = { ... };

// config/constants.ts
export const SNAPSHOT_MODES = { IDLE: 'idle', ... } as const;
```

#### 3. Memoized Components

```typescript
// components/Toolbar/index.tsx
export const Toolbar = React.memo(({ ... }) => { ... });

// components/BusyIndicator.tsx
export const BusyIndicator = React.memo(({ mode, messageCount }) => { ... });

// components/DataGrid.tsx
export const DataGrid = React.memo(({ ... }) => { ... });
```

#### 4. Event Handlers as Stable Functions

```typescript
// handlers/connectionHandlers.ts
export const createConnectionHandlers = (deps) => {
  const connect = useCallback(async () => { ... }, [deps]);
  const disconnect = useCallback(async () => { ... }, [deps]);
  return { connect, disconnect };
};
```

### Refactoring Strategy to Prevent Issues

#### 1. State Management
- Group related state to reduce update cycles
- Use refs for non-UI state (messageCountRef, isConnecting, etc.)
- Implement state reducers for complex state logic

#### 2. Effect Optimization
- Combine related effects where possible
- Use cleanup functions properly
- Avoid effects that depend on frequently changing values

#### 3. Callback Stability
- Wrap all event handlers in useCallback
- Use refs to access latest values without adding dependencies
- Create handler factories that return stable functions

#### 4. Component Structure

```typescript
// Main component becomes much simpler:
const DataGridStompShared = () => {
  // Custom hooks with stable APIs
  const connection = useSharedWorkerConnection(selectedProviderId);
  const snapshot = useSnapshotData(connection);
  const providerConfig = useProviderConfig(selectedProviderId);
  const gridState = useGridState(gridApiRef, activeProfileData);
  const theme = useThemeSync(appTheme);
  
  // Memoized handlers
  const handlers = useMemo(() => ({
    onConnect: () => connection.connect(providerConfig),
    onDisconnect: () => connection.disconnect(),
    onProfileSave: () => profileManagement.save(getCurrentState()),
  }), [connection, providerConfig, profileManagement]);
  
  return (
    <div className={theme.className}>
      <Toolbar {...handlers} />
      <BusyIndicator {...snapshot} />
      <DataGrid 
        config={gridConfig}
        data={snapshot.data}
        onReady={gridState.onReady}
      />
    </div>
  );
};
```

### Performance Guarantees

1. **No Infinite Loops**: 
   - All effects have proper dependency arrays
   - State updates don't trigger cascading updates
   - Refs used for values that don't affect UI

2. **Minimal Re-renders**:
   - Components wrapped in React.memo
   - Callbacks memoized with useCallback
   - Complex computations memoized with useMemo

3. **Stable Hook APIs**:
   - Hooks return stable references
   - Internal state changes don't propagate unnecessarily
   - Clear separation between UI state and operational state

### Module File Structure

```
src/windows/datagrid/components/DataGridStompShared/
├── index.tsx                    // Main component (simplified)
├── types.ts                     // All interfaces and types
├── config/
│   ├── gridConfig.ts           // AG-Grid configuration
│   ├── profileDefaults.ts      // Default profile settings
│   └── constants.ts            // Component constants
├── hooks/
│   ├── useSharedWorkerConnection.ts
│   ├── useSnapshotData.ts
│   ├── useProviderConfig.ts
│   ├── useGridState.ts
│   ├── useViewTitle.ts
│   └── useThemeSync.ts
├── handlers/
│   ├── connectionHandlers.ts
│   ├── profileHandlers.ts
│   └── gridHandlers.ts
└── components/
    ├── Toolbar/
    │   ├── index.tsx
    │   ├── ProfileSection.tsx
    │   ├── ConnectionSection.tsx
    │   ├── StatusSection.tsx
    │   └── SettingsSection.tsx
    ├── BusyIndicator.tsx
    └── DataGrid.tsx
```

This refactoring will make the component much simpler, more maintainable, and MORE performant than the current implementation.

---

## AG-Grid Column Customization Dialog (2025-08-01)

### Overview
Comprehensive plan for implementing an advanced AG-Grid column customization dialog system with extensive customization capabilities.

### Key Features
- Multi-dialog architecture with main dialog and specialized sub-dialogs
- Comprehensive customization options for columns including:
  - Cell renderers and value formatters
  - Cell editors with validation
  - Filters and filter parameters
  - Cell and header styling (colors, fonts, borders, alignment)
  - Conditional formatting rules
  - Calculated columns with formulas
  - Column-level permissions
  - Named filter queries
- Minimal storage principle - only saves customizations that differ from defaults
- Performance optimizations including lazy loading and virtualization

### Documentation Reference
See: `/mnt/c/Users/developer/Documents/projects/agv3/documents/AG-GRID_COLUMN_CUSTOMIZATION_DIALOG_PLAN.md`

This comprehensive document includes:
- Detailed tab specifications (General, Display, Styling, Editing, Filtering)
- Advanced sub-dialog specifications
- Data storage strategy
- Implementation recommendations
- Performance considerations

---

## Conditional Formatting Dialog Improvements (2025-08-04)

### Overview
Major redesign and enhancement of the conditional formatting dialog to create a professional, sophisticated interface with improved UX.

### Key Improvements

#### 1. Complete UI Redesign
- **Layout**: Implemented resizable panels using react-resizable-panels
- **Visual Hierarchy**: Professional spacing and consistent design patterns
- **Responsive Design**: Adapts to different screen sizes
- **Theme Compatibility**: Works seamlessly with light/dark themes

#### 2. Expression Editor Enhancements
- **Keyboard Shortcuts**: 
  - Ctrl+Shift+C - Show only columns in IntelliSense
  - Ctrl+Shift+F - Show only functions
  - Ctrl+Shift+V - Show only variables
  - Ctrl+Shift+O - Show only operators
- **Responsive Width**: Adapts layout based on container width
- **Removed Sidebar**: Replaced with popover buttons for examples
- **Full Container Support**: Now fills parent container properly

#### 3. Rule List Improvements
- **Minimalist Design**: Simple rule items showing only title
- **Tooltip Information**: All details shown on hover
- **Modern Icons**: Replaced with subtle monochromatic indicators
- **Clean Interactions**: Smooth hover and selection states

#### 4. Multi-Select Column Selector
- **Searchable**: Filter columns by name
- **Cell-Only Rules**: Select specific columns for rule application
- **Visual Feedback**: Clear indication of selected columns

#### 5. Professional Styling
- **Custom CSS**: Comprehensive styles in conditionalFormatting.css
- **Consistent Spacing**: Professional layout throughout
- **Modern Icons**: Updated all icons to be sophisticated
- **Smooth Animations**: Subtle transitions and effects

### Implementation Details

#### Files Modified
1. `ConditionalFormattingApp.tsx` - Fixed imports, set window title
2. `ConditionalFormattingEditorContent.tsx` - Added resizable panels
3. `RuleListItem.tsx` - Complete redesign with minimalist approach
4. `ExpressionEditor.tsx` - Made fully responsive
5. `GridConfigurationBus.ts` - Fixed channel cleanup
6. `RuleEditorSimplified.tsx` - Added column selector
7. `conditionalFormatting.css` - Professional styling

#### New Components
- `MultiSelect` - Searchable multi-select component
- `FilteredCompletionProvider` - IntelliSense filtering

### Technical Improvements
1. **Fixed Temporal Dead Zone Errors**: Reordered code execution
2. **Fixed JSX Structure**: Corrected missing closing tags
3. **Fixed Runtime Errors**: Handled undefined callbacks
4. **Fixed Channel Cleanup**: Proper destroy/disconnect handling
5. **Fixed Portal Issues**: Created NoPortalSelect components

### UI/UX Enhancements
1. **Rule Item Design**:
   - Minimal display with just title and status
   - Comprehensive tooltip with all information
   - Theme-aware colors and styling
   - Subtle monochromatic icons (Minus icon)

2. **Expression Editor**:
   - Responsive breakpoints (400px, 600px, 900px)
   - Dynamic Monaco Editor options
   - Adaptive UI elements
   - Smart feature toggling

3. **Dialog Layout**:
   - Resizable panels for flexible workspace
   - Minimum 220px width for sidebar
   - Professional button spacing
   - Clean visual hierarchy

### Performance Optimizations
1. **ResizeObserver**: Real-time container size detection
2. **Automatic Layout**: Monaco Editor auto-adjusts
3. **Smart Features**: Resource-intensive features disabled on small screens
4. **Memoized Components**: Reduced unnecessary re-renders

### Current State
The conditional formatting dialog is now:
- ✅ Professional and sophisticated
- ✅ Fully responsive
- ✅ Theme-compatible
- ✅ Minimalist and elegant
- ✅ Feature-complete with keyboard shortcuts
- ✅ Optimized for performance