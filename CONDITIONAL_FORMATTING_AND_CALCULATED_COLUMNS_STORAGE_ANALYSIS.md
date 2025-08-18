# Conditional Formatting and Calculated Columns Storage Analysis

## Overview

This document analyzes how conditional formatting rules and calculated columns configurations are currently stored and managed in the DataGrid application.

## Current Storage Architecture

### 1. Conditional Formatting Rules

#### Storage Location: **Global localStorage**
- **Key**: `'conditionalFormattingRules'`
- **Scope**: Global across all grid instances and profiles
- **Format**: JSON array of `ConditionalFormattingRule` objects

#### Storage Functions:
```typescript
// Load from localStorage
export function loadConditionalFormattingRules(): ConditionalFormattingRule[] {
  const stored = localStorage.getItem('conditionalFormattingRules');
  return stored ? JSON.parse(stored) : [];
}

// Save to localStorage
export function saveConditionalFormattingRules(rules: ConditionalFormattingRule[]): void {
  localStorage.setItem('conditionalFormattingRules', JSON.stringify(rules));
}
```

#### Usage Pattern:
```typescript
// In main component - loaded once on initialization
const [conditionalFormattingRules, setConditionalFormattingRules] = useState<ConditionalFormattingRuleRT[]>(
  () => loadConditionalFormattingRules()
);

// Applied when rules change
const handleApplyConditionalFormatting = useCallback((rules: ConditionalFormattingRuleRT[]) => {
  saveConditionalFormattingRules(rules); // Save to global localStorage
  setConditionalFormattingRules(rules);  // Update local state
  // Grid refreshes automatically
}, []);
```

### 2. Calculated Columns

#### Storage Location: **Profile-Level**
- **Scope**: Per profile (stored in profile configuration)
- **Format**: Array of `CalculatedColumnDefinition` objects in profile data

#### Storage Structure:
```typescript
interface DataGridStompSharedProfile extends BaseProfile {
  // ... other profile fields
  calculatedColumns?: CalculatedColumnDefinition[];
}

interface CalculatedColumnDefinition {
  id: string;
  field: string;
  headerName: string;
  expression: string; // calculation expression using [Column] references
  cellDataType?: 'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'object';
  pinned?: 'left' | 'right';
  width?: number;
  valueFormatter?: string;
}
```

#### Usage Pattern:
```typescript
// Applied when calculated columns change
const handleApplyCalculatedColumns = useCallback(async (cols: CalculatedColumnDefinition[]) => {
  const updated: DataGridStompSharedProfile = { 
    ...activeProfileData, 
    calculatedColumns: cols 
  };
  
  await saveProfile(updated, false, updated.name); // Save to profile
  setTempActiveProfileData(updated); // Apply immediately
}, [activeProfileData, saveProfile]);

// Included in profile save operations
const calculatedColumnsToSave = activeProfileData?.calculatedColumns || [];
const currentState: DataGridStompSharedProfile = {
  // ... other profile fields
  calculatedColumns: calculatedColumnsToSave
};
```

## Storage Comparison

| Feature | Conditional Formatting | Calculated Columns |
|---------|----------------------|-------------------|
| **Storage Location** | Global localStorage | Profile-specific |
| **Sharing Scope** | All grids & profiles | Single profile only |
| **Storage Key** | `'conditionalFormattingRules'` | Part of profile data |
| **Persistence** | Manual save/load | Automatic with profile |
| **Profile Independence** | Yes - global rules | No - profile-specific |
| **Migration Support** | No versioning | Profile versioning |

## Issues with Current Architecture

### 1. Conditional Formatting Issues

#### **Global Storage Problems:**
- **No Profile Isolation**: Rules apply to all profiles globally
- **No Grid Instance Isolation**: Same rules for all grid instances
- **Overwrite Risk**: Saving rules from one profile overwrites rules from another
- **No Versioning**: No way to track rule changes or revert
- **No Backup**: Rules can be lost if localStorage is cleared

#### **Inconsistent with Other Features:**
- Column groups are grid-level with profile references
- Calculated columns are profile-level
- Conditional formatting is global (inconsistent)

### 2. Calculated Columns Issues

#### **Profile-Only Storage:**
- **No Sharing**: Can't reuse calculated columns across profiles
- **Duplication**: Same calculations must be recreated for each profile
- **No Templates**: No way to create reusable calculation templates

## Recommended Architecture Changes

### 1. Conditional Formatting - Move to Grid-Level Storage

#### **Proposed Structure:**
```typescript
// Grid-level storage (similar to column groups)
interface ConditionalFormattingConfiguration {
  version: string;
  rules: ConditionalFormattingRule[];
  timestamp: number;
}

// Profile-level references
interface DataGridStompSharedProfile extends BaseProfile {
  // ... other fields
  conditionalFormattingRules?: string[]; // Rule IDs, not full rules
}

// Storage service
class GridConditionalFormattingStorage {
  static loadRules(gridInstanceId: string): ConditionalFormattingRule[]
  static saveRule(gridInstanceId: string, rule: ConditionalFormattingRule): void
  static deleteRule(gridInstanceId: string, ruleId: string): void
  static getRules(gridInstanceId: string, ruleIds: string[]): ConditionalFormattingRule[]
}
```

#### **Benefits:**
- **Grid-Level Sharing**: Rules shared across profiles for same grid
- **Profile Isolation**: Each profile can have different active rules
- **Consistent Architecture**: Matches column groups pattern
- **Better Organization**: Rules organized by grid instance
- **Versioning Support**: Can track rule changes over time

### 2. Calculated Columns - Add Grid-Level Option

#### **Proposed Enhancement:**
```typescript
// Add grid-level storage for reusable calculations
class GridCalculatedColumnsStorage {
  static loadTemplates(gridInstanceId: string): CalculatedColumnTemplate[]
  static saveTemplate(gridInstanceId: string, template: CalculatedColumnTemplate): void
  static getTemplates(gridInstanceId: string, templateIds: string[]): CalculatedColumnTemplate[]
}

// Enhanced profile structure
interface DataGridStompSharedProfile extends BaseProfile {
  calculatedColumns?: CalculatedColumnDefinition[]; // Profile-specific columns
  calculatedColumnTemplates?: string[]; // References to grid-level templates
}
```

#### **Benefits:**
- **Template Reuse**: Common calculations can be shared
- **Profile Flexibility**: Profiles can still have unique calculations
- **Better Organization**: Separates templates from instances

## Migration Strategy

### Phase 1: Conditional Formatting Migration
1. Create `GridConditionalFormattingStorage` service
2. Migrate existing global rules to grid-level storage
3. Update profiles to reference rule IDs instead of storing full rules
4. Update UI to work with new architecture

### Phase 2: Calculated Columns Enhancement
1. Create `GridCalculatedColumnsStorage` service for templates
2. Add template management UI
3. Allow profiles to reference both templates and custom columns
4. Maintain backward compatibility with existing profile columns

## Implementation Priority

### High Priority (Conditional Formatting):
- **Critical Issue**: Current global storage causes rule conflicts
- **User Impact**: Rules from different profiles interfere with each other
- **Architecture Inconsistency**: Doesn't match other features

### Medium Priority (Calculated Columns):
- **Enhancement**: Current system works but could be more efficient
- **User Benefit**: Would improve reusability and organization
- **Lower Risk**: Current system doesn't have critical issues

## Code Changes Required

### Conditional Formatting:
1. `src/utils/conditionalFormattingRuntime.ts` - Update storage functions
2. `src/windows/datagrid/components/DataGridStompShared/index.tsx` - Update initialization and handlers
3. `src/windows/datagrid/components/DataGridStompShared/types.ts` - Update profile interface
4. `src/windows/datagrid/components/DataGridStompShared/hooks/useProfileOperations.ts` - Update save logic

### Calculated Columns:
1. Create new grid-level storage service
2. Update profile operations to handle templates
3. Enhance calculated columns UI for template management
4. Update profile application logic

This analysis shows that conditional formatting has architectural issues that should be addressed, while calculated columns work correctly but could benefit from enhancement for better reusability.