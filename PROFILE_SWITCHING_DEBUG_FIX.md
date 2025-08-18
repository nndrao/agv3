# Profile Switching Debug Fix

## Issue Analysis from Logs

From the provided logs, I identified the root cause of the profile switching bug:

### Problem Sequence:
1. **Profile change detected correctly**: `isActualProfileChange: true`
2. **Grid not ready**: `hasGridApi: false` 
3. **Profile change deferred**: "Grid not ready - profile will be applied in onGridReady"
4. **When grid becomes ready**: Profile is not applied as a switch

### Root Cause:
The profile change detection was working correctly, but when the grid wasn't ready, the profile switch information was lost. When `onGridReady` eventually ran, it didn't know that this should be treated as a profile switch.

## Fixes Applied

### 1. **Added Pending Profile Switch Tracking**

**File**: `src/windows/datagrid/components/DataGridStompShared/index.tsx`

**Added**:
```typescript
// Track if there's a pending profile switch that should be applied when grid is ready
const pendingProfileSwitchRef = useRef<boolean>(false);
```

### 2. **Enhanced Profile Change Handler**

**Changes**:
- When grid is not ready but profile change is detected, set `pendingProfileSwitchRef.current = true`
- Update `currentProfileNameRef.current` even when grid isn't ready
- Added logging to track pending switches

### 3. **Improved onGridReady Logic**

**Changes**:
- Check for `pendingProfileSwitchRef.current` to detect deferred profile switches
- Enhanced switch detection logic with better null checks
- Added detailed logging for debugging switch decisions
- Clear pending switch flag after applying

### 4. **Added Grid Ready Effect**

**New Effect**:
```typescript
useEffect(() => {
  if (gridApi && activeProfileData && pendingProfileSwitchRef.current) {
    // Apply pending profile switch when grid becomes ready
  }
}, [gridApi, activeProfileData, applyProfile]);
```

## Expected Log Flow After Fix

### When Profile Change Occurs (Grid Not Ready):
```
[🔍 PROFILE-CHANGE-002] Profile application context: {
  isActualProfileChange: true, 
  hasGridApi: false
}
[🔍 PROFILE-CHANGE-008] Grid not ready - profile will be applied in onGridReady
[🔍 PROFILE-CHANGE-009] Marked pending profile switch for when grid is ready
```

### When Grid Becomes Ready:
```
[DataGridStompShared] Grid ready, checking profile: {
  hasPendingSwitch: true,
  currentProfileName: "Profile-1",
  profileName: "Default"
}
[DataGridStompShared] Grid ready - profile switch decision: {
  shouldTreatAsSwitch: true,
  reason: "pending switch"
}
[ProfileApplication] Profile switch/change detected - performing complete reset
```

## Testing Instructions

### Test Scenario 1: Profile Switch While Grid Loading
1. Start with Profile A
2. Quickly switch to Profile B before grid is fully ready
3. Verify logs show "Marked pending profile switch"
4. Verify when grid is ready, it shows "shouldTreatAsSwitch: true"
5. Verify complete reset is performed

### Test Scenario 2: Profile Switch After Grid Ready
1. Start with Profile A (grid fully loaded)
2. Switch to Profile B
3. Verify immediate profile switch detection
4. Verify complete reset is performed

### Key Log Messages to Look For:
- ✅ `[🔍 PROFILE-CHANGE-009] Marked pending profile switch for when grid is ready`
- ✅ `[DataGridStompShared] Grid ready - profile switch decision: { shouldTreatAsSwitch: true }`
- ✅ `[ProfileApplication] Profile switch/change detected - performing complete reset`
- ✅ `[ProfileApplication] Complete grid reset finished`

## Verification Checklist

After applying this fix:

- [ ] Profile switches are detected even when grid is not ready
- [ ] Pending profile switches are applied when grid becomes ready
- [ ] Complete grid reset is performed for all profile switches
- [ ] Old profile settings are completely cleared
- [ ] New profile settings are applied to clean state
- [ ] No settings persist from previous profiles

This fix ensures that profile switching works reliably regardless of grid readiness state and that all profile changes result in complete state clearing and reapplication.