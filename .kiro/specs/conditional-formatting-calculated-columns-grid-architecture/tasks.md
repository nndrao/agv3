# Implementation Plan

- [x] 1. Create grid-level storage services



  - Create GridConditionalFormattingStorage service with CRUD operations following the exact pattern as GridColumnGroupStorage
  - Create GridCalculatedColumnsStorage service with CRUD operations following the exact pattern as GridColumnGroupStorage
  - Add migration methods to both services for transitioning from old storage formats


  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [ ] 2. Update type definitions and interfaces
  - Enhance ConditionalFormattingRule interface with createdAt, updatedAt, and description fields


  - Enhance CalculatedColumnDefinition interface with createdAt, updatedAt, and description fields
  - Update DataGridStompSharedProfile interface to store rule and column IDs instead of full objects
  - _Requirements: 1.3, 1.4, 6.4_




- [ ] 3. Create index files for new storage modules
  - Create index.ts file for conditionalFormatting module to export GridConditionalFormattingStorage


  - Create index.ts file for calculatedColumns module to export GridCalculatedColumnsStorage
  - _Requirements: 1.1, 1.2_

- [ ] 4. Update main component initialization and state management



  - Modify conditional formatting rules initialization to load from grid-level storage using profile IDs
  - Update imports to include new grid storage services
  - Add migration logic to automatically convert old format data during initialization




  - _Requirements: 1.5, 3.1, 3.2, 3.4_


- [ ] 5. Update conditional formatting handler signature and implementation
  - Change handleApplyConditionalFormatting to accept (activeRuleIds: string[], allRules: ConditionalFormattingRule[])


  - Implement logic to save all rules to grid storage and update profile with active rule IDs
  - Update handler to follow the exact pattern as handleApplyColumnGroups
  - _Requirements: 1.1, 1.3, 2.3_



- [ ] 6. Update calculated columns handler signature and implementation


  - Change handleApplyCalculatedColumns to accept (activeColumnIds: string[], allColumns: CalculatedColumnDefinition[])
  - Implement logic to save all columns to grid storage and update profile with active column IDs
  - Update handler to follow the exact pattern as handleApplyColumnGroups


  - _Requirements: 1.2, 1.4, 2.3_

- [ ] 7. Update dialog management hook for conditional formatting
  - Modify handleOpenConditionalFormatting to load all rules from grid storage
  - Update dialog data structure to pass currentRules (all available) and activeRuleIds (currently selected)
  - Update onApply callback to handle the new response format with activeRuleIds and allRules
  - _Requirements: 4.1, 4.3, 1.5_

- [ ] 8. Update dialog management hook for calculated columns
  - Modify handleOpenCalculatedColumns to load all columns from grid storage
  - Update dialog data structure to pass currentColumns (all available) and activeColumnIds (currently selected)
  - Update onApply callback to handle the new response format with activeColumnIds and allColumns
  - _Requirements: 4.2, 4.3, 1.5_

- [ ] 9. Update dialog management hook imports and type signatures
  - Add imports for new grid storage services
  - Update DialogManagementProps interface to reflect new handler signatures
  - Update currentCalculatedColumns type from objects to string array (IDs)
  - _Requirements: 1.3, 1.4_

- [ ] 10. Update conditional formatting dialog component
  - Modify ConditionalFormattingApp to display all available rules with checkboxes
  - Implement checkbox selection logic to track which rules are active
  - Update dialog initialization to handle currentRules and activeRuleIds data structure
  - Update getData method to return activeRuleIds and allRules instead of just rules
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 11. Update calculated columns dialog component
  - Modify CalculatedColumnsApp to display all available columns with checkboxes
  - Implement checkbox selection logic to track which columns are active
  - Update dialog initialization to handle currentColumns and activeColumnIds data structure
  - Update getData method to return activeColumnIds and allColumns instead of just columns
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 12. Implement reference resolution and validation
  - Add utility functions to resolve rule IDs to full ConditionalFormattingRule objects
  - Add utility functions to resolve column IDs to full CalculatedColumnDefinition objects
  - Implement validation logic to handle missing references and clean up invalid IDs from profiles
  - _Requirements: 6.1, 6.2, 1.5_

- [ ] 13. Update profile operations for new storage format
  - Modify profile saving logic to handle rule and column IDs instead of full objects
  - Update profile loading logic to resolve IDs to objects when needed
  - Add migration calls during profile loading to handle old format data
  - _Requirements: 3.1, 3.2, 3.4, 7.1_

- [ ] 14. Add comprehensive error handling and logging
  - Implement try-catch blocks around all storage operations with meaningful error messages
  - Add validation for rule and column data structures before saving
  - Implement graceful fallbacks when storage operations fail
  - Add detailed logging for migration and reference resolution processes
  - _Requirements: 6.3, 6.5_

- [ ] 15. Create comprehensive test suite
  - Write unit tests for GridConditionalFormattingStorage CRUD operations
  - Write unit tests for GridCalculatedColumnsStorage CRUD operations
  - Write integration tests for migration functionality from old to new format
  - Write tests for reference resolution and validation logic
  - Create test HTML file to verify the complete architecture works end-to-end
  - _Requirements: 3.4, 6.1, 6.2_