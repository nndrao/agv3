# Profile Management Bug Fixes

## Issues Fixed (2025-07-21)

### 1. New Profiles Not Showing in Dropdown

**Problem**: After creating a new profile, it wouldn't appear in the profile selector dropdown.

**Root Cause**: The state wasn't being properly updated after saving a new profile.

**Fixes Applied**:
- Added proper state updates in `saveProfile` to ensure new profiles are added to the profiles array
- Added a key prop to ProfileSelectorSimple to force re-render when profiles change
- Ensured the new profile is set as the active profile after creation
- Made the save operation properly async/await in the dialog callback

### 2. Datasource Provider Not Persisting

**Problem**: The selected datasource provider wasn't being saved with the profile.

**Root Cause**: Two issues:
1. Provider changes weren't marking the profile as having unsaved changes
2. The profile loading wasn't properly applying null values

**Fixes Applied**:
- Added `setHasUnsavedChanges(true)` when provider selection changes
- Modified the profile loading to always set selectedProviderId, even if null
- Ensured saveCurrentState includes the current selectedProviderId value

## Implementation Details

### Profile Save Flow
```typescript
// When provider changes, mark as unsaved
onChange={(providerId) => {
  setSelectedProviderId(providerId);
  setHasUnsavedChanges(true);
}}

// Save includes provider ID
const currentState = {
  selectedProviderId,
  // ... other settings
};
```

### Profile Load Flow
```typescript
onProfileChange: (profile) => {
  // Always apply provider ID, even if null
  setSelectedProviderId(profile.selectedProviderId || null);
  // ... apply other settings
}
```

### Dropdown Update Flow
```typescript
// Force re-render with key prop
<ProfileSelectorSimple
  key={`profile-selector-${profiles.length}-${activeProfile?.versionId}`}
  profiles={profiles}
  // ...
/>
```

## Testing Checklist

- [x] Create new profile - appears in dropdown immediately
- [x] Select datasource provider - persists when saving profile
- [x] Switch profiles - datasource provider updates correctly
- [x] Save with no provider selected - maintains null state
- [x] Visual feedback shows when there are unsaved changes

## Debug Logging

Added console logging to track:
- Profile creation flow
- Number of profiles before/after save
- Provider ID being saved
- Profile data being applied

These logs help diagnose any remaining issues with the profile system.