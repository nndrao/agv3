# Column Group Show State Persistence - Complete Solution

## Understanding columnGroupShow

According to AG-Grid documentation, `columnGroupShow` controls when columns are visible:
- `'open'` - Column is only visible when the group is expanded
- `'closed'` - Column is only visible when the group is collapsed  
- `undefined` - Column is always visible regardless of group state

## The Challenge

When saving and restoring grid state, we need to:
1. Save which columns have which `columnGroupShow` setting
2. Save whether each group is expanded or collapsed
3. Restore both the structure AND the state correctly

## Our Solution

### 1. Column Group Definition
```typescript
interface ColumnGroupDefinition {
  groupId: string;
  headerName: string;
  children: string[]; // Column IDs
  openByDefault?: boolean;
  columnStates?: Record<string, 'open' | 'closed' | undefined>;
}
```

### 2. State Extraction
We determine if a group is open or closed by analyzing column visibility:
```typescript
// If columns with columnGroupShow:'open' are hidden -> group is collapsed
// If columns with columnGroupShow:'closed' are visible -> group is collapsed
if (child.columnGroupShow === 'open') {
  hasOpenColumns = true;
  if (colState && colState.hide === true) {
    openColumnsHidden = true; // Group is collapsed
  }
} else if (child.columnGroupShow === 'closed') {
  hasClosedColumns = true;
  if (colState && colState.hide === false) {
    closedColumnsVisible = true; // Group is collapsed
  }
}
```

### 3. State Application Sequence
```
1. Create column groups with columnGroupShow settings
2. Apply column state (preserves widths, order)
3. Apply group expansion state explicitly
4. Verify column visibility matches expected state
```

### 4. Key Implementation Points

#### When Creating Column Groups:
```typescript
// Apply columnGroupShow to each column
if (columnState !== undefined) {
  colDefWithGroupShow.columnGroupShow = columnState;
}
```

#### When Restoring State:
```typescript
// Set group expansion state
gridApi.setColumnGroupOpened(groupState.groupId, groupState.open);

// Verify columns have correct visibility
const shouldBeVisible = 
  (columnGroupShow === 'open' && groupState.open) ||
  (columnGroupShow === 'closed' && !groupState.open);
```

## Testing

Use `test-column-group-show.html` to verify:
1. Groups start with correct `openByDefault` state
2. Toggling groups shows/hides columns based on `columnGroupShow`
3. State can be saved and restored correctly

## Debug Logging

Key logs to verify correct behavior:
- `[🔍][COLUMN_GROUP_STATE_EXTRACT]` - Shows how group state is determined
- `[🔍][COLUMN_GROUP_SERVICE]` - Shows columnGroupShow being applied
- `[🔍][COLUMN_GROUP_SERVICE] Final verification` - Confirms final state

## Common Issues and Solutions

### Issue 1: Columns not hiding/showing correctly
**Solution**: Ensure `columnGroupShow` is applied when creating column definitions

### Issue 2: Group state not persisting
**Solution**: Explicitly save and restore group expansion state separately from column state

### Issue 3: Wrong columns visible after restore
**Solution**: Apply states in correct order: groups → columns → group state

## Summary

The complete solution:
1. Preserves `columnGroupShow` settings when creating groups
2. Intelligently extracts group state from column visibility
3. Applies states in the correct sequence
4. Explicitly sets group expansion state for reliability
5. Verifies final state matches expectations

This ensures all three `columnGroupShow` states ('open', 'closed', undefined) work correctly with persistence.