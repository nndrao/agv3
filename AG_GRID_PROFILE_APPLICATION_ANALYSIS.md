# AG-Grid Profile Application Analysis & Recommended Order

## Current Profile Application Issues

### **Problem 1: Incorrect Application Order**
The current `useProfileApplication` hook applies settings in this order:
1. Reset grid (if switching profiles)
2. Apply grid options
3. Build column definitions (base + calculated + conditional formatting)
4. Apply column groups (modifies columnDefs)
5. Set final columnDefs to grid
6. Apply grid state (filters, sorts, but NOT column state if groups exist)
7. Apply column group expansion state
8. Apply column state AFTER column groups (with delay)

### **Problem 2: Column State Persistence Issues**
- Column state is not being properly persisted or applied
- Timing issues with column groups causing column state to be lost
- Delays and workarounds instead of proper sequencing
- Column state applied with setTimeout which is unreliable

### **Problem 3: Incomplete Grid Reset**
- Current reset doesn't follow AG-Grid v33+ best practices
- Missing proper state clearing methods
- Not using latest AG-Grid reset APIs

## **Recommended Profile Application Order**

Based on AG-Grid v33+ documentation and best practices, settings should be applied in this **exact order**:

### **1. Reset AG-Grid's All States**
```typescript
// Use AG-Grid v33+ reset methods
gridApi.resetColumnState();
gridApi.setFilterModel(null);
gridApi.deselectAll();
gridApi.setGridOption('quickFilterText', '');
// Clear any row grouping
if (gridApi.setRowGroupColumns) gridApi.setRowGroupColumns([]);
// Reset to original column definitions
gridApi.setGridOption('columnDefs', originalColumnDefs);
```

### **2. Apply Column Definitions from Data Provider**
```typescript
// Set base column definitions from provider
const baseColumnDefs = JSON.parse(JSON.stringify(originalColumnDefsRef.current));
gridApi.setGridOption('columnDefs', baseColumnDefs);
```

### **3. Apply Grid Options from Selected Profile**
```typescript
// Apply all grid options from profile
Object.entries(profileGridOptions).forEach(([key, value]) => {
  if (!INITIAL_GRID_OPTIONS.includes(key)) {
    gridApi.setGridOption(key as any, value);
  }
});
```

### **4. Apply Calculated Columns to Column Definitions**
```typescript
// Add calculated columns to column definitions
const calculatedColDefs = buildCalculatedColumns(profile.calculatedColumns);
const defsWithCalculated = [...baseColumnDefs, ...calculatedColDefs];
gridApi.setGridOption('columnDefs', defsWithCalculated);
```

### **5. Apply Column Groups to Column Definitions**
```typescript
// Transform column definitions with groups
const activeGroups = profile.columnGroups?.filter(g => g.isActive !== false) || [];
const groupedColumnDefs = ColumnGroupService.buildColumnDefsWithGroups(
  defsWithCalculated, 
  activeGroups, 
  gridApi
);
gridApi.setGridOption('columnDefs', groupedColumnDefs);
```

### **6. Apply Column Styles and Settings** *(To be implemented)*
```typescript
// Apply column-specific styling, formatting, etc.
// This would include custom cell renderers, formatters, etc.
```

### **7. Apply Conditional Formatting Rules to Column Definitions**
```typescript
// Apply conditional formatting to column definitions
const formattedColumnDefs = applyConditionalFormattingToColumns(
  groupedColumnDefs,
  conditionalFormattingRules,
  gridInstanceId
);
gridApi.setGridOption('columnDefs', formattedColumnDefs);
```

### **8. Apply All Grid States (Column State + Column Group State)**
```typescript
// Apply column state FIRST
if (profile.gridState?.columnState) {
  gridApi.applyColumnState({
    state: profile.gridState.columnState,
    applyOrder: true
  });
}

// Apply column group state SECOND (after column state is set)
if (profile.gridState?.columnGroupState) {
  gridApi.setColumnGroupState(profile.gridState.columnGroupState);
}

// Apply other states
if (profile.gridState?.filterModel) {
  gridApi.setFilterModel(profile.gridState.filterModel);
}
// Apply sorting, selection, etc.
```

## **Key Principles for Correct Implementation**

### **1. Single Column Definition Update**
- Only call `setGridOption('columnDefs', ...)` once per step
- Build complete column definitions before applying
- Avoid multiple rapid columnDefs updates

### **2. Proper State Sequencing**
- Column definitions MUST be set before applying column state
- Column group state MUST be applied after column state
- No delays or setTimeout - use proper sequencing

### **3. AG-Grid v33+ Best Practices**
- Use `resetColumnState()` instead of manual resets
- Use `setColumnGroupState()` for group expansion
- Use `applyColumnState()` with proper options

### **4. State Persistence**
- Extract complete state using `gridApi.getColumnState()`
- Extract group state using `gridApi.getColumnGroupState()`
- Store both in profile.gridState

## **Implementation Requirements**

### **Modified useProfileApplication Hook**
```typescript
const applyProfile = useCallback((profile: DataGridStompSharedProfile, isProfileSwitch: boolean) => {
  // 1. Reset all states
  resetGridCompletely();
  
  // 2. Apply columnDefs from provider
  gridApi.setGridOption('columnDefs', originalColumnDefs);
  
  // 3. Apply grid options
  applyGridOptions(profile.gridOptions);
  
  // 4. Build and apply calculated columns
  const defsWithCalculated = addCalculatedColumns(originalColumnDefs, profile.calculatedColumns);
  gridApi.setGridOption('columnDefs', defsWithCalculated);
  
  // 5. Build and apply column groups
  const groupedDefs = applyColumnGroups(defsWithCalculated, profile.columnGroups);
  gridApi.setGridOption('columnDefs', groupedDefs);
  
  // 6. Apply column styles (future)
  // applyColumnStyles(profile.columnStyles);
  
  // 7. Apply conditional formatting
  const finalDefs = applyConditionalFormatting(groupedDefs, conditionalFormattingRules);
  gridApi.setGridOption('columnDefs', finalDefs);
  
  // 8. Apply all grid states in correct order
  applyAllGridStates(profile.gridState);
}, []);
```

### **Enhanced Grid State Manager**
- Proper extraction of column state and group state
- Correct application order in `applyState()`
- No delays or workarounds

### **Profile Structure Updates**
```typescript
interface DataGridStompSharedProfile {
  // ... existing fields
  gridState: {
    columnState: ColumnState[];
    columnGroupState: Array<{ groupId: string; open: boolean }>;
    filterModel: FilterModel;
    // ... other states
  };
}
```

## **Context for Future Modifications**

**IMPORTANT**: Save this context for all future AG-Grid profile modifications:

1. **Always follow the 8-step application order** listed above
2. **Never use setTimeout or delays** for state application
3. **Apply column state BEFORE column group state**
4. **Only update columnDefs once per logical step**
5. **Use AG-Grid v33+ APIs** for all operations
6. **Reset completely before applying new profile**
7. **Extract and persist both column state and group state**
8. **Test column state persistence** after any changes

This order ensures that AG-Grid receives settings in the correct sequence, preventing state conflicts and ensuring proper persistence of column widths, visibility, and group expansion states.