# Column Group State - Simplified Solution

## Key Insight
AG-Grid's native `getColumnState()` already captures column visibility that reflects group expansion/collapse state. We don't need separate column group state management!

## How It Works

### When Saving State
1. `gridApi.getColumnState()` returns column state including:
   - Column visibility (`hide` property)
   - Column widths
   - Column order
   - Sort state
   
2. When a column group is collapsed:
   - Columns with `columnGroupShow: 'open'` have `hide: true`
   - Columns with `columnGroupShow: 'closed'` have `hide: false`
   - Regular columns maintain their visibility

### When Restoring State
1. Apply column groups first (structure)
2. Apply column state which includes:
   - Visibility that reflects group expansion
   - Column widths and order
   - All other column properties

## What Was Removed

### 1. GridState Interface
- Removed: `columnGroupState: Array<{ groupId: string; open: boolean }>`
- Kept: `columnState: ColumnState[]` (handles everything)

### 2. GridStateManager Class
- Removed: `pendingColumnGroupState` property
- Removed: `setPendingColumnGroupState()`, `getPendingColumnGroupState()`, `clearPendingColumnGroupState()`
- Removed: `extractColumnGroupState()` method
- Removed: `applyColumnGroupState()` method

### 3. ColumnGroupService
- Removed: Separate column group state restoration logic
- Kept: Column state restoration which handles visibility

### 4. useGridState Hook
- Removed: Methods for pending column group state
- Simplified: Interface and implementation

## Benefits of Simplified Approach

1. **Less Code**: Removed ~150 lines of unnecessary code
2. **No State Duplication**: Single source of truth (column state)
3. **Native AG-Grid**: Uses built-in functionality
4. **Fewer Edge Cases**: No synchronization issues between two state types
5. **Better Performance**: One state application instead of two

## How Column Visibility Works

```javascript
// Example column with group show configuration
{
  field: 'cusip',
  headerName: 'CUSIP',
  columnGroupShow: 'open'  // Only visible when group is expanded
}

// When group is collapsed, column state will have:
{
  colId: 'cusip',
  hide: true,  // Hidden because group is collapsed
  width: 100,
  // ... other properties
}

// When group is expanded, column state will have:
{
  colId: 'cusip',
  hide: false,  // Visible because group is expanded
  width: 100,
  // ... other properties
}
```

## Implementation Flow

```
Save Profile:
1. Extract columnState (includes visibility reflecting group state)
2. Extract columnGroups (structure definitions)
3. Save both to profile

Load Profile:
1. Apply columnGroups (creates structure)
2. Apply columnState (restores visibility, widths, order)
   → This automatically restores group expansion state!
```

## Testing

The simplified solution correctly handles:
- ✅ Column group creation
- ✅ Column widths preservation
- ✅ Column order maintenance
- ✅ Group expanded/collapsed state via visibility
- ✅ Profile switching
- ✅ Application restart persistence

## Summary

By leveraging AG-Grid's native column state management, we eliminated the need for separate column group state tracking. The column visibility in `columnState` already captures whether groups are expanded or collapsed, making our solution simpler, more maintainable, and more reliable.