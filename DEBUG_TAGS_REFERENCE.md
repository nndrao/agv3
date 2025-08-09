# Debug Tags Reference for Column Groups and Profile Issues

This document lists all the debug tags added to track column group persistence and profile loading issues.

## How to Filter Logs

To see all debug logs in the console, filter by: `[🔍]`

Example in Chrome DevTools Console:
1. Open DevTools (F12)
2. Go to Console tab
3. In the filter box, type: `[🔍]`
4. You'll see only the debugging logs in sequence

## Debug Tags (All prefixed with [🔍])

### App Startup and Profile Loading
- `[🔍][APP_STARTUP]` - Initial configuration loading in useProfileManagement
- `[🔍][APP_STARTUP_EFFECT]` - Active profile change effect in useProfileManagement
- `[🔍][PROFILE_HANDLER]` - Profile change handler in DataGridStompShared
- `[🔍][PROFILE_LOAD]` - Profile grid state application in useGridState
- `[🔍][PROFILE_CHANGE_EFFECT]` - Profile change effect in useGridState
- `[🔍][GRID_READY]` - Grid ready event handler
- `[🔍][GRID_STATE_APPLY]` - Grid state application in GridStateManager

### Column Groups Flow
- `[🔍][COLUMN_GROUPS_EFFECT]` - Column groups effect in DataGridStompShared
- `[🔍][COLUMN_GROUP_SERVICE]` - Column group application in ColumnGroupService
- `[🔍][COLUMN_GROUPS_PERSIST]` - Column groups persistence in GridStateManager
- `[🔍][COLUMN_GROUPS_RESTORE]` - Column groups restoration in GridStateManager

### Profile Save Flow
- `[🔍][PROFILE_SAVE]` - Profile save operation in DataGridStompShared

## How to Debug

### Issue 1: Column Groups Not Persisting
1. Filter console by `[🔍]`
2. Look for `[🔍][PROFILE_SAVE]` logs to verify column groups are being saved
3. Check `[🔍][COLUMN_GROUPS_PERSIST]` to ensure they're included in grid state
4. Verify `[🔍][COLUMN_GROUPS_RESTORE]` shows groups being restored from state
5. Check `[🔍][COLUMN_GROUP_SERVICE]` to see if groups are applied to AG-Grid

### Issue 2: Profile Not Loading on App Start
1. Filter console by `[🔍]`
2. Look for `[🔍][APP_STARTUP]` logs to see initial configuration loading
3. Check `[🔍][APP_STARTUP_EFFECT]` to verify profile is set
4. Verify `[🔍][PROFILE_HANDLER]` is called with correct profile
5. Check `[🔍][PROFILE_LOAD]` to ensure grid state is applied
6. Look for `[🔍][GRID_READY]` to confirm grid initialization
7. Check `[🔍][COLUMN_GROUPS_EFFECT]` to see if column groups are applied

## Expected Flow

### App Startup
```
[🔍][APP_STARTUP] Loading configuration for view
[🔍][APP_STARTUP] Setting active profile
[🔍][APP_STARTUP_EFFECT] Active profile changed
[🔍][PROFILE_HANDLER] handleProfileChange called
[🔍][GRID_READY] Grid ready event fired
[🔍][PROFILE_LOAD] applyProfileGridState called
[🔍][GRID_STATE_APPLY] applyState called
[🔍][COLUMN_GROUPS_RESTORE] Storing column groups from state
[🔍][COLUMN_GROUPS_EFFECT] Column groups effect triggered
[🔍][COLUMN_GROUP_SERVICE] applyColumnGroups called
```

### Profile Save
```
[🔍][PROFILE_SAVE] Column groups to save
[🔍][COLUMN_GROUPS_PERSIST] GridStateManager.setColumnGroups called
[🔍][COLUMN_GROUPS_PERSIST] Including column groups in extracted state
[🔍][PROFILE_SAVE] GridState includes columnGroups
```

### Profile Switch
```
[🔍][PROFILE_HANDLER] handleProfileChange called
[🔍][PROFILE_LOAD] applyProfileGridState called
[🔍][GRID_STATE_APPLY] applyState called
[🔍][COLUMN_GROUPS_RESTORE] Storing column groups from state
[🔍][COLUMN_GROUPS_EFFECT] Column groups effect triggered
[🔍][COLUMN_GROUP_SERVICE] applyColumnGroups called
```

## Key Things to Check

1. **Column Groups in Profile**: Look for `columnGroups` array in `[🔍][PROFILE_SAVE]` logs
2. **GridState includes columnGroups**: Check `[🔍][GRID_STATE_APPLY]` logs
3. **Timing Issues**: Check if `isApplyingProfile` flag prevents column group application in `[🔍][COLUMN_GROUPS_EFFECT]`
4. **Grid API Availability**: Verify grid API is valid in `[🔍][PROFILE_LOAD]` logs
5. **Column Definitions**: Ensure columnDefs are available in `[🔍][COLUMN_GROUPS_EFFECT]`
6. **Multiple Restorations**: If `[🔍][COLUMN_GROUPS_RESTORE]` appears multiple times, check for duplicate state applications

## Common Issues and Solutions

### Issue: Column groups saved but not applied
- Check `[🔍][COLUMN_GROUPS_EFFECT]` for "Skipping - profile state is being applied"
- This means the timing flag is preventing application
- Solution: The flag should reset after 1 second

### Issue: Column groups not showing after app reload
- Check `[🔍][COLUMN_GROUPS_EFFECT]` for "Grid not ready or no columnDefs"
- This means the grid isn't initialized when trying to apply groups
- Solution: Groups should be applied after grid is ready

### Issue: Multiple restore calls
- Count how many times `[🔍][COLUMN_GROUPS_RESTORE]` appears
- If more than once per profile load, there may be duplicate effect triggers
- Check for multiple `[🔍][PROFILE_LOAD]` or `[🔍][GRID_STATE_APPLY]` calls