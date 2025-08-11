# Column Group State Persistence - Complete Fix

## Issue
Column group expanded/collapsed state was not being persisted or restored when saving/loading profiles.

## Root Cause Analysis
1. Column group state was being extracted and stored in GridStateManager
2. However, the pending column group state methods were not exposed through the useGridState hook
3. The ColumnGroupService was trying to retrieve pending state but the methods were not available

## Complete Solution

### Files Modified

#### 1. `/src/windows/datagrid/components/DataGridStompShared/utils/gridStateManager.ts`
- Added `pendingColumnGroupState` private property
- Added methods:
  - `setPendingColumnGroupState()` - Store group state for deferred application
  - `getPendingColumnGroupState()` - Retrieve pending group state
  - `clearPendingColumnGroupState()` - Clear after application
- Enhanced logging in `extractColumnGroupState()` with [🔍] prefix

#### 2. `/src/windows/datagrid/components/DataGridStompShared/hooks/useGridState.ts`
- Added to interface:
  - `getPendingColumnGroupState: () => any`
  - `clearPendingColumnGroupState: () => void`
- Implemented callbacks that delegate to GridStateManager
- Added to return statement to expose methods

#### 3. `/src/windows/datagrid/components/DataGridStompShared/index.tsx`
- Updated destructuring to include new methods from useGridState
- Simplified gridStateManager object passed to ColumnGroupService
- Now includes all four pending state methods

#### 4. `/src/windows/datagrid/components/DataGridStompShared/columnGroups/columnGroupService.ts`
- Enhanced to check for pending column group state
- Applies pending state after column groups are created
- Clears pending state after successful application

## Flow Diagram

```
1. Profile Load
   ↓
2. GridStateManager.applyState()
   - Stores column groups
   - Stores pending column state
   - Stores pending column group state
   ↓
3. Column Groups Effect (in index.tsx)
   - Retrieves stored column groups
   - Creates gridStateManager proxy object
   - Calls ColumnGroupService.applyColumnGroups()
   ↓
4. ColumnGroupService
   - Creates column group definitions
   - Applies to grid
   - Retrieves pending column state → Applies widths/order
   - Retrieves pending column group state → Applies expanded/collapsed
   - Clears pending states
   ↓
5. Grid displays with correct state
```

## Key Improvements

1. **Complete State Management Chain**: All pending state methods now properly exposed through hooks
2. **Proper Sequencing**: Column groups → Column state → Group state
3. **Clean Architecture**: State management centralized in GridStateManager
4. **Comprehensive Logging**: [🔍] prefixed logs throughout the flow

## Testing Checklist

- [x] Column groups are created correctly
- [x] Column widths are preserved
- [x] Column order is maintained
- [x] Column group expanded/collapsed state is restored
- [x] Multiple profiles can be switched without issues
- [x] State persists across application restarts

## Debug Commands

To verify the fix is working, filter console logs:
```javascript
// In browser console
Array.from(document.querySelectorAll('.log')).filter(el => el.textContent.includes('[🔍]'))
```

Key logs to look for:
- `[🔍][GRID_STATE_APPLY] Storing pending column group state`
- `[🔍][COLUMN_GROUP_SERVICE] Using pending column group state from GridStateManager`
- `[🔍][COLUMN_GROUP_SERVICE] Set group {groupId} to open/closed`

## Summary

The fix ensures complete persistence and restoration of column group states by:
1. Properly storing pending states in GridStateManager
2. Exposing all necessary methods through the hook chain
3. Retrieving and applying states in the correct sequence
4. Clearing pending states after successful application

This maintains the separation of concerns while ensuring all state is properly managed and applied.