# Requirements Document

## Introduction

This feature implements a consistent grid-level storage architecture for conditional formatting rules and calculated columns, aligning them with the existing column groups architecture. Currently, conditional formatting uses global localStorage (shared across all grids) and calculated columns are stored at the profile level (causing duplication). This creates architectural inconsistency and inefficiency. The new architecture will store all rules and columns at the grid level with profile-level ID references, enabling better organization, sharing, and performance.

## Requirements

### Requirement 1: Grid-Level Storage Architecture

**User Story:** As a developer, I want conditional formatting rules and calculated columns to use the same storage architecture as column groups, so that the codebase is consistent and maintainable.

#### Acceptance Criteria

1. WHEN the system stores conditional formatting rules THEN it SHALL store them at the grid instance level using the key pattern `grid_conditional_formatting_{gridInstanceId}`
2. WHEN the system stores calculated columns THEN it SHALL store them at the grid instance level using the key pattern `grid_calculated_columns_{gridInstanceId}`
3. WHEN a profile references conditional formatting rules THEN it SHALL store only rule IDs in the `conditionalFormattingRules` array
4. WHEN a profile references calculated columns THEN it SHALL store only column IDs in the `calculatedColumns` array
5. WHEN the system loads active rules/columns for a profile THEN it SHALL resolve the IDs to full objects from grid-level storage

### Requirement 2: Cross-Profile Sharing and Reusability

**User Story:** As a user, I want to reuse conditional formatting rules and calculated columns across different profiles within the same grid, so that I don't have to recreate common configurations.

#### Acceptance Criteria

1. WHEN I create a conditional formatting rule in one profile THEN it SHALL be available for selection in other profiles for the same grid
2. WHEN I create a calculated column in one profile THEN it SHALL be available for selection in other profiles for the same grid
3. WHEN multiple profiles use the same rule or column THEN the system SHALL store only one copy at the grid level
4. WHEN I delete a rule or column that is used by multiple profiles THEN the system SHALL remove it from all profiles that reference it
5. WHEN I modify a rule or column THEN the changes SHALL be reflected in all profiles that use it

### Requirement 3: Migration from Legacy Storage

**User Story:** As a user with existing conditional formatting rules and calculated columns, I want them to be automatically migrated to the new architecture, so that I don't lose my configurations.

#### Acceptance Criteria

1. WHEN the system detects old global conditional formatting rules THEN it SHALL migrate them to grid-level storage and update profile references
2. WHEN the system detects old profile-level calculated columns THEN it SHALL migrate them to grid-level storage and update profile references
3. WHEN migrating rules or columns without IDs THEN the system SHALL generate unique IDs for them
4. WHEN migration is complete THEN the system SHALL preserve all existing functionality without data loss
5. WHEN migration encounters duplicate rules or columns THEN it SHALL deduplicate them while preserving all profile references

### Requirement 4: Enhanced Dialog Interface

**User Story:** As a user, I want to see all available conditional formatting rules and calculated columns in their respective dialogs, so that I can easily select which ones to apply to my current profile.

#### Acceptance Criteria

1. WHEN I open the conditional formatting dialog THEN it SHALL display all rules available for the current grid with checkboxes for selection
2. WHEN I open the calculated columns dialog THEN it SHALL display all columns available for the current grid with checkboxes for selection
3. WHEN I view the rule/column list THEN it SHALL clearly indicate which items are currently active in my profile
4. WHEN I create a new rule or column THEN it SHALL be automatically added to the grid-level storage and selected for the current profile
5. WHEN I delete a rule or column THEN it SHALL be removed from grid-level storage and all profile references

### Requirement 5: Performance and Efficiency

**User Story:** As a user, I want profile switching to be fast and efficient, so that I can quickly change between different grid configurations.

#### Acceptance Criteria

1. WHEN switching profiles THEN the system SHALL only load rule/column IDs from the profile and resolve them from grid storage
2. WHEN saving profiles THEN the system SHALL only store rule/column IDs, not full objects
3. WHEN applying conditional formatting THEN the system SHALL use cached rule objects to avoid repeated storage lookups
4. WHEN applying calculated columns THEN the system SHALL use cached column objects to avoid repeated storage lookups
5. WHEN multiple profiles share rules/columns THEN the system SHALL maintain only one copy in memory per grid instance

### Requirement 6: Data Integrity and Validation

**User Story:** As a user, I want the system to maintain data integrity when managing conditional formatting rules and calculated columns, so that my configurations are always consistent and valid.

#### Acceptance Criteria

1. WHEN loading profile references THEN the system SHALL validate that all referenced rule/column IDs exist in grid storage
2. WHEN a referenced rule or column is missing THEN the system SHALL remove the invalid ID from the profile and log a warning
3. WHEN saving rules or columns THEN the system SHALL validate the data structure and reject invalid entries
4. WHEN updating timestamps THEN the system SHALL set `createdAt` for new items and `updatedAt` for all saves
5. WHEN handling storage errors THEN the system SHALL provide meaningful error messages and fallback gracefully

### Requirement 7: Backward Compatibility

**User Story:** As a user with existing grid configurations, I want the new architecture to work seamlessly with my current setup, so that I experience no disruption during the transition.

#### Acceptance Criteria

1. WHEN the system encounters old format data THEN it SHALL automatically migrate it without user intervention
2. WHEN migration is in progress THEN the system SHALL continue to function normally
3. WHEN both old and new format data exist THEN the system SHALL prioritize the new format and migrate the old
4. WHEN external systems reference the old storage format THEN the system SHALL maintain compatibility during a transition period
5. WHEN the migration is complete THEN the system SHALL optionally clean up old format data