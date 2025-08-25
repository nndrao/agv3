# Simplification Phase 2 - Progress Report

## Summary
Phase 2 component refactoring is underway. Created modular components to extract functionality from DataGridStompShared.

## Components Created

### 1. ProfileManager Component ✅
**Location**: `src/windows/datagrid/components/DataGridStompShared/components/ProfileManager.tsx`
- Encapsulates all profile UI controls and dialogs
- Manages profile dropdown, save button, and status
- Includes ProfileManagementDialog and SaveProfileDialog
- **Lines**: 199

### 2. ConnectionManager Component ✅  
**Location**: `src/windows/datagrid/components/DataGridStompShared/components/ConnectionManager.tsx`
- Handles provider selection and connection UI
- Manages connect/disconnect operations
- Shows connection status and errors
- **Lines**: 141

### 3. GridStateManager Utility ✅
**Location**: `src/windows/datagrid/components/DataGridStompShared/utils/GridStateManager.tsx`
- Singleton class for grid state management
- Extracts and applies grid state
- Handles column definitions and grid options
- Supports both legacy and full state persistence
- **Lines**: 271

## Current State

### DataGridStompShared Component
- **Current Lines**: 973 (no reduction yet)
- **Target Lines**: Under 300
- **Status**: Components created but not yet integrated

### Why No Line Reduction Yet?

The main component hasn't been reduced because:

1. **Existing Hook Architecture**: The component already uses custom hooks extensively:
   - `useSharedWorkerConnection`
   - `useSnapshotData`
   - `useProviderConfig`
   - `useGridState`
   - `useProfileOperations`
   - `useConnectionManagement`
   - `useColumnGroupManagement`
   - `useGridOptionsManagement`

2. **Profile UI Duplication**: 
   - ProfileSection component already exists in Toolbar
   - ProfileManager duplicates this functionality
   - Need to consolidate, not duplicate

3. **Integration Work Needed**:
   - Components are created but not replacing existing code
   - Need to remove duplicate logic from main component
   - Need to update imports and wire up new components

## Next Steps for Actual Simplification

### 1. Remove Duplicate Profile Logic
- ProfileSection in Toolbar already handles profile UI
- Remove ProfileManager or replace ProfileSection with it
- Consolidate profile dialog management

### 2. Replace Connection Logic
- Remove connection UI from ConnectionSection
- Use new ConnectionManager component
- Update Toolbar to use ConnectionManager

### 3. Use GridStateManager
- Replace inline grid state logic with GridStateManager calls
- Remove extractGridState and extractFullGridState from main component
- Update hooks to use GridStateManager

### 4. Extract More Components

#### 4.1 DialogsContainer Component
Extract all dialogs into a single container:
```tsx
<DialogsContainer
  dialogs={{
    profile: { open: showProfileDialog, ... },
    save: { open: showSaveDialog, ... },
    rename: { open: showRenameDialog, ... },
    expression: { open: showExpressionEditor, ... }
  }}
  handlers={dialogHandlers}
/>
```

#### 4.2 GridContainer Component
Extract grid and busy indicator:
```tsx
<GridContainer
  theme={gridTheme}
  snapshotData={snapshotData}
  columnDefs={baseColumnDefs}
  gridOptions={gridOptions}
  onGridReady={onGridReady}
/>
```

#### 4.3 StateProvider Component
Wrap component with state management:
```tsx
<StateProvider>
  <Toolbar />
  <GridContainer />
  <DialogsContainer />
</StateProvider>
```

## Metrics

### Before Phase 2
- DataGridStompShared: 973 lines
- Total project: 48,797 lines

### After Phase 2 (Target)
- DataGridStompShared: < 300 lines
- Extracted components: ~700 lines (distributed)
- Better organization and maintainability

## Issues to Address

### 1. Hook Complexity
Current hooks are doing too much:
- `useProfileOperations`: 272 lines
- `useGridState`: 200+ lines
- `useColumnGroupManagement`: 150+ lines

These need to be simplified or broken down further.

### 2. Event Handler Proliferation
Too many individual event handlers:
- handleProfileLoad
- handleProfileSave
- handleProfileExport
- handleProfileImport
- handleProfileRename
- handleSetDefault
- handleSaveCurrentState
- handleSaveNewProfile
- etc.

Consider using a reducer pattern or action-based approach.

### 3. State Management Complexity
Multiple overlapping state concerns:
- Profile state (active, unsaved, loading)
- Connection state
- Grid state
- Dialog state
- Theme state

Consider using a state machine or reducer.

## Recommended Approach

### Step 1: Consolidate Existing Components
Instead of creating new components, first consolidate what exists:
- Use existing ProfileSection, don't duplicate with ProfileManager
- Update ConnectionSection to be simpler
- Keep existing hooks but simplify them

### Step 2: Extract Render Logic
Move all JSX to separate components:
- Create `DataGridStompSharedView` component with just JSX
- Keep logic in `DataGridStompShared` container
- Pass all props down to view component

### Step 3: Simplify Hooks
Break down large hooks:
- Split `useProfileOperations` into smaller hooks
- Extract grid operations from `useGridState`
- Separate concerns better

### Step 4: Use Composition
Instead of one large component, compose smaller ones:
```tsx
export const DataGridStompShared = () => {
  return (
    <ProfileProvider>
      <ConnectionProvider>
        <GridProvider>
          <DataGridStompSharedUI />
        </GridProvider>
      </ConnectionProvider>
    </ProfileProvider>
  );
};
```

## Conclusion

Phase 2 has created the building blocks for simplification but hasn't yet achieved the line reduction goal. The next step is to actually integrate these components and remove the duplicate code from DataGridStompShared. The main challenge is that the component already uses a hook-based architecture, so we need to be careful not to just move complexity around but actually reduce it.

The real simplification will come from:
1. Removing duplicate code
2. Consolidating similar functions
3. Using composition over configuration
4. Simplifying the hooks themselves
5. Moving rendering logic to view components