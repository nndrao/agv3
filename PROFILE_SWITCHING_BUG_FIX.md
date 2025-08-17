# Profile Switching Bug Fix

## Problem Identified

When switching between profiles, the old profile's settings were still being applied to the grid instead of being completely cleared and replaced with the new profile's settings.

## Root Causes Found

1. **Incomplete Reset Logic**: The `resetGridCompletely` function was missing critical reset steps
2. **Inadequate Profile Change Detection**: The system wasn't always detecting when an actual profile change occurred
3. **Missing Column Group State Clearing**: Previous column group states weren't being cleared
4. **Insufficient Column Definition Reset**: Previous calculated columns and groups persisted

## Fixes Applied

### 1. Enhanced Reset Logic

**File**: `src/windows/datagrid/components/DataGridStompShared/hooks/useProfileApplication.ts`

**Changes**:
- Added column group state clearing: `gridApi.setColumnGroupState([])`
- Added explicit column definition reset to original provider definitions
- Added grid state manager column groups clearing: `gridStateManagerRef.current.setColumnGroups([])`
- Improved the order of reset operations

### 2. Improved Profile Change Detection

**Files**: 
- `src/windows/datagrid/components/DataGridStompShared/index.tsx`
- `src/windows/datagrid/components/DataGridStompShared/hooks/useProfileApplication.ts`

**Changes**:
- Added `currentProfileNameRef` to track the current profile name
- Added `lastAppliedProfileRef` in the profile application hook
- Enhanced profile switch detection to catch actual profile name changes
- Added `isActualProfileChange` logic to detect real profile switches

### 3. More Aggressive Reset Strategy

**Changes**:
- Reset is now triggered for both `isProfileSwitch` OR `isActualProfileChange`
- Even initial loads get a minimal reset to ensure clean column definitions
- Added better logging to track profile change detection

## Updated Reset Sequence

When a profile switch is detected, the system now:

1. **Clears column group states**: `gridApi.setColumnGroupState([])`
2. **Resets to original column definitions**: Removes all calculated columns and groups
3. **Clears grid state manager**: Removes stored column groups
4. **Resets all other grid states**: Filters, sorting, selection, etc.
5. **Resets grid options to defaults**: Ensures clean option state

## Testing Checklist

To verify the fix works:

### Profile Switching Tests
- [ ] Switch from Profile A to Profile B
- [ ] Verify Profile A's column groups are completely removed
- [ ] Verify Profile A's calculated columns are removed
- [ ] Verify Profile A's grid options are cleared
- [ ] Verify Profile B's settings are applied correctly

### Specific Scenarios
- [ ] Profile with column groups → Profile without column groups
- [ ] Profile without column groups → Profile with column groups  
- [ ] Profile with calculated columns → Profile without calculated columns
- [ ] Profile with different grid options (row height, etc.)
- [ ] Profile with different filter/sort states

### Console Verification
Look for these log messages:
- `[ProfileApplication] Profile switch/change detected - performing complete reset`
- `[🔍 PROFILE-CHANGE-002] Profile application context:` with correct detection flags
- No errors during profile application

## Expected Behavior After Fix

1. **Complete State Clearing**: When switching profiles, ALL previous settings should be cleared
2. **Clean Application**: New profile settings should be applied to a clean grid state
3. **No Persistence**: No settings from the previous profile should remain
4. **Reliable Detection**: Profile changes should be detected accurately
5. **Fast Switching**: Profile switches should be immediate without delays

## Backward Compatibility

The fix maintains full backward compatibility:
- Existing profiles continue to work
- No changes to profile data structure
- No breaking API changes
- Enhanced logging for better debugging

This fix ensures that profile switching provides a clean, predictable experience where each profile's settings are applied independently without interference from previous profiles.