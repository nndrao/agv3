# Profile Creation Fix - No Grid State for New Profiles

## Date: 2025-07-21

### Problem
When creating a new profile, the system was trying to apply grid state (setSortModel) which caused errors because:
1. The grid might not be initialized yet
2. New profiles shouldn't have grid state - they should start clean

### Solution Implemented

#### 1. **Create Minimal Profiles**
New profiles are now created without any grid state:
```typescript
// Only extract grid state when updating existing profile
if (!saveAsNew && validateGridApi(gridApiRef.current)) {
  // Extract grid state for updates only
}
```

#### 2. **Safe Grid State Application**
Added validation before applying any grid state:
```typescript
if (gridApiRef.current && validateGridApi(gridApiRef.current)) {
  try {
    // Only apply if state exists and is valid
    if (profile.sortModel && profile.sortModel.length > 0 && typeof gridApiRef.current.setSortModel === 'function') {
      gridApiRef.current.setSortModel(profile.sortModel);
    }
  } catch (error) {
    console.warn('[DataGridStomp] Error applying grid state:', error);
  }
}
```

#### 3. **Profile Creation Flow**
New workflow:
1. User clicks "+" to create new profile
2. System creates a minimal profile with only basic settings (no grid state)
3. Profile is immediately selected and active
4. User can then configure the grid and click "Save" to update the profile with current state

### Benefits
- No more errors when creating profiles
- Cleaner profile creation process
- Grid state only saved when explicitly requested
- Better user experience - start with a clean slate

### Technical Details

**Minimal Profile Structure for New Profiles:**
```typescript
{
  name: "New Profile Name",
  autoLoad: true,
  selectedProviderId: null,
  autoConnect: false,
  sidebarVisible: true,
  theme: 'system',
  showColumnSettings: false,
  asyncTransactionWaitMillis: 50,
  rowBuffer: 10,
  // No grid state fields (columnState, filterModel, sortModel)
}
```

**Grid State Added Only on Save:**
- columnState: Column positions, widths, visibility
- filterModel: Active filters
- sortModel: Active sorts

This approach ensures new profiles always work and users have full control over when to save grid state.