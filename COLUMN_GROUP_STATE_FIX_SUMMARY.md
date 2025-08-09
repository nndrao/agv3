# Column Group State Persistence Fix Summary

## Problem
Column group expanded/collapsed state was not being persisted or restored correctly when saving and loading profiles.

## Root Cause
The column group state was being extracted but not properly applied because:
1. Column groups need to be created BEFORE their state can be applied
2. The `setColumnGroupOpened` API method only works AFTER column groups exist in the grid
3. There was no mechanism to defer column group state application until after groups were created

## Solution Implemented

### 1. Added Pending Column Group State Management
- Added `pendingColumnGroupState` property to `GridStateManager` class
- Created methods to store, retrieve, and clear pending column group state:
  - `setPendingColumnGroupState()`
  - `getPendingColumnGroupState()`
  - `clearPendingColumnGroupState()`

### 2. Modified State Application Flow
- When loading a profile with column groups:
  1. Grid options are applied first (via component props)
  2. Column groups are stored in GridStateManager
  3. Column state is stored as pending (to preserve widths/order)
  4. Column group state is stored as pending
  5. ColumnGroupService applies groups, then retrieves and applies pending states

### 3. Enhanced Column Group Service
- Modified `applyColumnGroups()` to check for pending column group state
- After applying column groups, the service now:
  1. Restores column state (widths, order, visibility)
  2. Retrieves pending column group state from GridStateManager
  3. Applies the expanded/collapsed state to each group
  4. Clears the pending state after application

### 4. Improved State Extraction
- Enhanced logging in `extractColumnGroupState()` with [🔍] prefix
- Better detection of column group state using multiple methods:
  - API method `getColumnGroupState()` (if available)
  - Traversing column definitions and checking `isColumnGroupOpened()`
  - Fallback to `openByDefault` property

## Files Modified

1. **`/src/windows/datagrid/components/DataGridStompShared/utils/gridStateManager.ts`**
   - Added `pendingColumnGroupState` property
   - Added methods for managing pending column group state
   - Enhanced `applyState()` to store column group state for deferred application
   - Improved `extractColumnGroupState()` with detailed logging

2. **`/src/windows/datagrid/components/DataGridStompShared/columnGroups/columnGroupService.ts`**
   - Modified `applyColumnGroups()` to retrieve and apply pending column group state
   - Added logic to check GridStateManager for pending states
   - Clear pending states after application

3. **`/src/windows/datagrid/components/DataGridStompShared/hooks/useGridState.ts`**
   - Updated interface to expose pending column state methods
   - Methods already existed but were not in the interface

## Testing
Created `test-column-group-state.html` to verify that column group states can be:
- Saved with proper structure
- Loaded and parsed correctly
- Applied to restore expanded/collapsed states

## Verification Steps
1. Create column groups in the grid
2. Expand/collapse some groups
3. Save the profile
4. Reload the application or switch profiles
5. Load the saved profile
6. Verify that column groups are restored with correct expanded/collapsed states

## Debug Logging
All related logs are prefixed with `[🔍]` for easy filtering in the console:
- `[🔍][COLUMN_GROUP_STATE_EXTRACT]` - When extracting state
- `[🔍][GRID_STATE_APPLY]` - When applying state
- `[🔍][COLUMN_GROUP_SERVICE]` - When applying column groups
- `[🔍][PROFILE_LOAD]` - When loading profiles

## Order of Operations
The correct sequence is now enforced:
1. Grid options applied
2. Column groups created
3. Column state applied (widths, order)
4. Column group state applied (expanded/collapsed)
5. Grid state applied (filters, sorts)