# Test: Conditional Formatting Preservation on Profile Save

## Purpose
Test that conditional formatting rules are preserved when saving a profile.

## Test Steps

1. **Open the DataGridStompShared component**
   - Launch the application
   - Open developer console (F12)

2. **Apply Conditional Formatting**
   - Open Conditional Formatting dialog
   - Create or enable some rules
   - Click Apply
   - Verify formatting is visible in the grid

3. **Save the Profile**
   - Use the profile save button
   - Watch console for logs with `[🔴 CF-` prefix

4. **Expected Console Output**
   Look for these log patterns:

   ```
   [🔴 CF-SAVE-001] Starting saveCurrentState
   - Should show existing conditional rules count

   [🔴 CF-SAVE-003] Preserving conditional formatting rules
   - Should show the rule IDs being preserved

   [🔴 CF-SAVE-004] Profile object prepared for saving
   - Should show conditionalFormattingRules with correct count

   [🔴 CF-PROFILE-001] Profile data being saved
   - Should confirm conditionalFormattingRules are included

   [🔴 CF-LOAD-001] Conditional formatting effect triggered
   - Should show rules being reloaded after save

   [🔴 CF-SET-002] Setting rules from profile load
   - Should show rules being reapplied to the grid
   ```

5. **Verify Formatting Persists**
   - After save completes, conditional formatting should still be visible
   - Rules should not disappear from the grid

## Debugging Tags

All conditional formatting related logs use the `[🔴 CF-` prefix for easy filtering:

- `CF-SAVE-*` - Profile save operations
- `CF-SET-*` - Setting conditional formatting rules
- `CF-LOAD-*` - Loading rules from storage
- `CF-PROFILE-*` - Profile management operations

## Common Issues to Check

1. **Rules disappear after save**: Check if `conditionalFormattingRules` field is missing in the saved profile data
2. **Rules not reloading**: Check if the effect is triggered after profile save
3. **Wrong rules loaded**: Verify the rule IDs match between save and load

## Filter Console Output
In browser console, use:
```javascript
// Show only conditional formatting logs
console.log = ((originalLog) => {
  return function(...args) {
    const str = args.join(' ');
    if (str.includes('[🔴 CF-')) {
      originalLog.apply(console, args);
    }
  };
})(console.log);
```