# Column Group State AG-Grid API Integration

## Overview

This document describes the implementation of proper column group state management using AG-Grid's native APIs for extracting and restoring column group open/closed states.

## Problem Statement

The previous implementation was not properly saving and restoring the open/closed state of column groups. Users would lose their column group expansion preferences when switching profiles or reloading the application.

## Solution

Integrated AG-Grid's native column group state APIs:
- `gridApi.getColumnGroupState()` - Extract current open/closed state
- `gridApi.setColumnGroupState(state)` - Apply open/closed state
- `columnGroupOpened` event - Listen for user interactions

## Implementation Details

### 1. ColumnGroupService Updates

#### New Methods Added:

```typescript
/**
 * Extract column group state from AG-Grid using native API
 */
static extractColumnGroupState(gridApi: any): Array<{ groupId: string; open: boolean }>

/**
 * Apply column group state to AG-Grid using native API
 */
static applyColumnGroupState(gridApi: any, groupState: Array<{ groupId: string; open: boolean }>): boolean

/**
 * Save column group state to grid-level storage
 */
static saveColumnGroupState(gridInstanceId: string, gridApi: any, activeGroupIds: string[]): void

/**
 * Load and apply column group state from grid-level storage
 */
static loadAndApplyColumnGroupState(gridInstanceId: string, gridApi: any, activeGroupIds: string[]): boolean

/**
 * Set up event listeners to automatically save column group state changes
 */
static setupColumnGroupStateListeners(gridInstanceId: string, gridApi: any, activeGroupIds: string[]): () => void
```

### 2. GridStateManager Updates

#### Enhanced Column Group State Handling:

```typescript
private extractColumnGroupState(): Array<{ groupId: string; open: boolean }> {
  // Use AG-Grid's native getColumnGroupState API
  if (typeof this.gridApi.getColumnGroupState === 'function') {
    return this.gridApi.getColumnGroupState() || [];
  }
  return [];
}

private applyColumnGroupState(state: GridState): boolean {
  // Use AG-Grid's native setColumnGroupState API
  if (typeof this.gridApi.setColumnGroupState === 'function') {
    this.gridApi.setColumnGroupState(state.columnGroupState);
    return true;
  }
  return false;
}
```

### 3. Profile Application Integration

#### Automatic State Restoration:

```typescript
// In useProfileApplication hook
const applyColumnGroups = useCallback((columnDefs, activeGroupIds) => {
  // Build column definitions with groups
  const newColumnDefs = ColumnGroupService.buildColumnDefsWithGroups(/*...*/);
  
  // Schedule column group state restoration after column definitions are applied
  setTimeout(() => {
    // Restore column group state
    ColumnGroupService.loadAndApplyColumnGroupState(gridInstanceId, gridApi, activeGroupIds);
    
    // Set up event listeners to save state changes
    ColumnGroupService.setupColumnGroupStateListeners(gridInstanceId, gridApi, activeGroupIds);
  }, 100);
  
  return newColumnDefs;
}, [gridInstanceId]);
```

### 4. Event-Driven State Persistence

#### Automatic State Saving:

```typescript
static setupColumnGroupStateListeners(gridInstanceId, gridApi, activeGroupIds) {
  const saveStateDebounced = debounce(() => {
    this.saveColumnGroupState(gridInstanceId, gridApi, activeGroupIds);
  }, 500);

  const onColumnGroupOpened = (event) => {
    saveStateDebounced();
  };

  gridApi.addEventListener('columnGroupOpened', onColumnGroupOpened);
  
  return () => {
    gridApi.removeEventListener('columnGroupOpened', onColumnGroupOpened);
  };
}
```

## Data Flow

### 1. Profile Loading
```
Profile Load → Extract activeGroupIds → Build Column Definitions → Apply to Grid → Restore Group State
```

### 2. User Interaction
```
User Expands/Collapses Group → AG-Grid Event → Auto-save State → Update Storage
```

### 3. Profile Saving
```
Save Profile → Extract Current Group State → Update Group Definitions → Save to Storage
```

## Storage Structure

### Grid-Level Storage
```typescript
// localStorage key: `grid_column_groups_${gridInstanceId}`
{
  version: "2.0.0",
  groups: [
    {
      groupId: "group_1",
      headerName: "Basic Info",
      children: ["name", "age", "email"],
      openByDefault: true, // Stores last known state
      columnStates: { ... },
      createdAt: 1234567890,
      updatedAt: 1234567890
    }
  ],
  timestamp: 1234567890
}
```

### Profile-Level Storage
```typescript
// Profile stores only active group IDs
{
  name: "My Profile",
  columnGroups: ["group_1", "group_3"], // Just IDs
  // ... other profile data
}
```

## Benefits

1. **Native AG-Grid Integration**: Uses official APIs for maximum compatibility
2. **Automatic State Persistence**: User interactions are automatically saved
3. **Efficient Storage**: Group definitions stored once, referenced by ID
4. **Real-time Updates**: State changes are immediately persisted
5. **Robust Error Handling**: Fallback methods for older AG-Grid versions

## API Reference

### AG-Grid Methods Used

- `gridApi.getColumnGroupState()` - Returns array of `{groupId, open}` objects
- `gridApi.setColumnGroupState(state)` - Applies array of `{groupId, open}` objects
- `gridApi.setColumnGroupOpened(groupId, open)` - Fallback for individual groups
- `gridApi.addEventListener('columnGroupOpened', callback)` - Listen for state changes

### Event Data Structure

```typescript
// columnGroupOpened event
{
  groupId: string;
  open: boolean;
  // ... other AG-Grid event properties
}
```

## Testing

Use `test-column-group-state-persistence.html` to verify:
- AG-Grid API method availability and functionality
- State extraction and application accuracy
- Profile integration and persistence
- Event listener setup and cleanup

## Migration Notes

- Existing profiles with old column group format are automatically migrated
- `openByDefault` property is updated with actual user preferences
- No data loss during migration process
- Backward compatibility maintained

## Performance Considerations

- State saving is debounced (500ms) to prevent excessive writes
- Event listeners are properly cleaned up to prevent memory leaks
- State extraction only occurs when necessary
- Minimal impact on grid rendering performance

## Error Handling

- Graceful fallback when AG-Grid APIs are not available
- Console warnings for debugging state issues
- Automatic recovery from corrupted state data
- Safe defaults when state cannot be restored