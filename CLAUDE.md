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