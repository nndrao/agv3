# Column Group Architecture Refactor

## Overview

This refactor changes the column group implementation from storing full column group definitions at the profile level to a more efficient architecture where:

1. **Column groups are stored at the grid level** - All column group definitions are stored in grid-level localStorage, shared across all profiles
2. **Profiles store only group IDs** - Each profile stores only the IDs of active column groups, not the full definitions
3. **Automatic migration** - Old format profiles are automatically migrated to the new format

## Benefits

- **Reduced storage size**: Profiles are much smaller since they only store group IDs
- **Better sharing**: Column groups can be reused across multiple profiles without duplication
- **Centralized management**: All column groups for a grid are managed in one place
- **Easier maintenance**: Updates to column group definitions automatically apply to all profiles using them

## Architecture Changes

### 1. Data Storage

**Before (Profile-level storage):**
```typescript
interface Profile {
  columnGroups: ColumnGroupDefinition[]; // Full objects stored in each profile
}
```

**After (Grid-level storage):**
```typescript
// Grid-level storage (localStorage key: `grid_column_groups_${gridInstanceId}`)
interface ColumnGroupConfiguration {
  version: string;
  groups: ColumnGroupDefinition[];
  timestamp: number;
}

// Profile-level storage
interface Profile {
  columnGroups: string[]; // Only group IDs
}
```

### 2. New Services

#### GridColumnGroupStorage
- `loadColumnGroups(gridInstanceId)` - Load all groups for a grid
- `saveColumnGroups(gridInstanceId, groups)` - Save all groups for a grid
- `saveColumnGroup(gridInstanceId, group)` - Add/update a single group
- `deleteColumnGroup(gridInstanceId, groupId)` - Delete a group
- `getColumnGroup(gridInstanceId, groupId)` - Get a specific group
- `getColumnGroups(gridInstanceId, groupIds)` - Get multiple groups by IDs
- `migrateFromProfileGroups(gridInstanceId, profileGroups)` - Migrate old format

### 3. Updated Components

#### ColumnGroupEditor
- Now receives all available groups and active group IDs separately
- Returns active group IDs and updated group definitions
- Supports creating/editing groups that are saved to grid-level storage

#### ColumnGroupService
- `buildColumnDefsWithGroups()` now takes group IDs and grid instance ID
- `applyColumnGroups()` now takes group IDs instead of full group objects
- Added utility methods for CRUD operations on grid-level storage

### 4. Hook Updates

#### useColumnGroupManagement
- Handles grid-level storage operations
- Manages unsaved group IDs instead of full group objects
- Applies groups using grid-level storage

#### useProfileApplication
- Applies column groups using group IDs and grid instance ID
- Handles migration from old format automatically

#### useDialogManagement
- Loads all available groups from grid storage
- Passes active group IDs to column group editor
- Handles new callback signature with group IDs and all groups

#### useProfileOperations
- Automatically migrates old format column groups during save
- Stores only group IDs in profiles
- Preserves backward compatibility

### 5. Migration Strategy

The system automatically migrates old format profiles:

1. **Detection**: When saving a profile, check if `columnGroups` contains objects or strings
2. **Migration**: If objects are found, migrate them to grid-level storage using `ColumnGroupService.migrateProfileColumnGroups()`
3. **Update**: Replace profile's `columnGroups` with the returned group IDs
4. **Preservation**: Inactive groups are migrated but not included in active group IDs

## File Changes

### New Files
- `src/windows/datagrid/components/DataGridStompShared/columnGroups/gridColumnGroupStorage.ts`
- `test-column-groups-new-architecture.html`
- `COLUMN_GROUP_ARCHITECTURE_REFACTOR.md`

### Modified Files
- `src/windows/datagrid/components/DataGridStompShared/columnGroups/types.ts`
- `src/windows/datagrid/components/DataGridStompShared/columnGroups/columnGroupService.ts`
- `src/windows/datagrid/components/DataGridStompShared/columnGroups/ColumnGroupEditor.tsx`
- `src/windows/datagrid/components/DataGridStompShared/columnGroups/index.ts`
- `src/windows/datagrid/components/DataGridStompShared/types.ts`
- `src/windows/datagrid/components/DataGridStompShared/utils/gridStateManager.ts`
- `src/windows/datagrid/components/DataGridStompShared/hooks/useColumnGroupManagement.ts`
- `src/windows/datagrid/components/DataGridStompShared/hooks/useProfileApplication.ts`
- `src/windows/datagrid/components/DataGridStompShared/hooks/useDialogManagement.ts`
- `src/windows/datagrid/components/DataGridStompShared/hooks/useProfileOperations.ts`
- `src/windows/datagrid/components/DataGridStompShared/hooks/useGridState.ts`
- `src/windows/datagrid/components/DataGridStompShared/index.tsx`

## Usage Examples

### Creating a Column Group
```typescript
// Groups are now created and stored at grid level
const newGroup = ColumnGroupService.createColumnGroup(
  gridInstanceId,
  'My Group',
  ['col1', 'col2', 'col3'],
  { 'col1': 'open', 'col2': 'closed' }
);

// Profile stores only the group ID
profile.columnGroups = [...profile.columnGroups, newGroup.groupId];
```

### Loading Groups for a Profile
```typescript
// Load all available groups from grid storage
const allGroups = GridColumnGroupStorage.loadColumnGroups(gridInstanceId);

// Get only the active groups for this profile
const activeGroups = GridColumnGroupStorage.getColumnGroups(
  gridInstanceId, 
  profile.columnGroups
);
```

### Applying Groups to Grid
```typescript
// Apply using group IDs and grid instance ID
ColumnGroupService.applyColumnGroups(
  gridApi,
  columnApi,
  profile.columnGroups, // Array of group IDs
  gridInstanceId,
  originalColumnDefs
);
```

## Backward Compatibility

The system maintains full backward compatibility:

1. **Old profiles continue to work** - Migration happens automatically during save operations
2. **No data loss** - All existing column groups are preserved during migration
3. **Gradual migration** - Profiles are migrated individually as they are saved
4. **Fallback support** - System can handle both old and new formats during transition

## Testing

Use `test-column-groups-new-architecture.html` to verify:
- Grid-level storage operations
- Profile-level group ID references
- Cross-profile group sharing
- Migration from old format

## Performance Improvements

- **Reduced profile size**: Profiles are significantly smaller (storing IDs vs full objects)
- **Faster profile switching**: Less data to parse and apply
- **Better memory usage**: Column group definitions loaded once per grid, not per profile
- **Efficient sharing**: No duplication of group definitions across profiles

## Future Enhancements

This architecture enables future features:
- **Group templates**: Predefined column groups that can be shared across grids
- **Group versioning**: Track changes to column group definitions over time
- **Group permissions**: Control which users can modify specific column groups
- **Group analytics**: Track usage of column groups across profiles and users