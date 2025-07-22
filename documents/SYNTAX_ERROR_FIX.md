# Syntax Error Fix - DataGridStomp

## Date: 2025-07-21

### Error:
```
Unexpected token (169:19)
componentType: 'DataGridStomp',
               ^
```

### Root Cause:
The `useProfileManagement` hook call had incorrect syntax. The destructuring assignment was malformed - it was trying to use object property syntax inside the destructuring pattern instead of properly calling the hook.

### Incorrect Code:
```typescript
const {
  viewInstanceId,  // ❌ Wrong - these should be return values
  componentType: 'DataGridStomp',  // ❌ Wrong - this should be in the parameter
  defaultProfile: { ... },  // ❌ Wrong - this should be in the parameter
  ...
} = useProfileManagement<DataGridStompProfile>({...});
```

### Correct Code:
```typescript
const {
  profiles,         // ✅ Correct - these are return values
  activeProfile,    // ✅ Correct
  activeProfileData,  // ✅ Correct
  ...
} = useProfileManagement<DataGridStompProfile>({
  viewInstanceId,   // ✅ Correct - these are parameters
  componentType: 'DataGridStomp',  // ✅ Correct
  defaultProfile: { ... },  // ✅ Correct
  ...
});
```

### Key Learning:
- Destructuring assignment extracts values FROM the function return
- Parameters go INSIDE the function call
- Don't mix parameter syntax with destructuring syntax

### Result:
- App no longer crashes
- Syntax error resolved
- Profile management works correctly