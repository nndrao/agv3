# Profile Persistence Fix

## Date: 2025-07-21

### Problem
Profiles were not persisting when reloading the workspace because:
1. Each time `openDataGridStomp()` was called, it generated a new random UUID
2. Profiles are stored using the view instance ID as the key
3. New UUID = Different storage key = Can't find previous profiles

### Solution
Changed from random UUID to a stable ID:

```typescript
// Before - Random UUID each time
const id = uuidv4(); // e.g., "a3f2c1b8-9d4e-4a6b-8c2d-1e3f4a5b6c7d"

// After - Stable ID
const id = 'datagrid-stomp-main'; // Always the same
```

### How It Works Now
1. **First Load**: Creates view with ID `datagrid-stomp-main`
2. **Save Profile**: Stored under key `datagrid-stomp-main`
3. **Reload Workspace**: Creates view with same ID `datagrid-stomp-main`
4. **Load Profile**: Finds profiles stored under `datagrid-stomp-main`

### Benefits
- Profiles persist across workspace reloads
- Users don't lose their configurations
- Consistent experience

### Trade-offs
- All DataGridStomp instances share the same profiles
- If you need multiple independent instances, you'll need to modify the approach

### Alternative Approach (ProfileRegistry)
I also created a `ProfileRegistry` service that can map dynamic view IDs to stable storage IDs. This is useful if you need:
- Multiple view instances with separate profiles
- Dynamic view creation
- Profile migration between views

### Testing
1. Open DataGridStomp
2. Create a profile named "Test Profile"
3. Close and reload the workspace
4. Open DataGridStomp again
5. ✅ "Test Profile" should be available in the dropdown