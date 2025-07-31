# Prompt for Building AG Grid Column Group Management Dialog Box

## Overview
Create a component for managing column groups in AG Grid that allows users to create, update, and remove column groups with an intuitive interface. The dialog should handle column selection, group naming, and proper synchronization with the AG Grid instance.

## Requirements

### Dialog Structure
1. Create a modal dialog box with appropriate header and close button
2. Implement a two-panel layout:
   - Left panel: List of existing column groups
   - Right panel: Group creation/editing interface

### Available Columns Management
1. Create a multi-select list box showing all available columns from AG Grid
2. Each column item should include a dropdown selector with three options: 'open', 'closed', 'undefined'
3. Implement selection mechanism that allows multiple columns to be selected at once
4. Ensure proper visual indication of selected vs. unselected columns

### Group Creation
1. Provide an input field for entering the column group name
2. Implement a "Create Group" button that is enabled only when:
   - Group name is provided
   - At least one column is selected
3. When a group is created:
   - Selected columns should be removed from the available columns list
   - The new group should appear in the left sidebar list
   - A corresponding column group should be created in AG Grid with all selected columns

### Group Selection & Editing
1. Implement clickable list of existing column groups in the left sidebar
2. When a group is selected:
   - Group name should populate the name input field
   - Columns belonging to that group should appear as selected in the available columns list
   - UI should switch to "edit mode"
   - "Create Group" button should be replaced with "Update" and "Cancel" buttons

### Group Update
1. In edit mode, allow users to:
   - Modify the group name
   - Add/remove columns by selecting/deselecting them in the list
2. Implement an "Update" button that:
   - Updates the column group in AG Grid
   - Updates the group entry in the left sidebar
   - Removes selected columns from the available columns list

### Cancel Operation
1. Implement a "Cancel" button in edit mode that:
   - Exits edit mode
   - Restores the original selection state
   - Resets the group name input field
   - Removes columns belonging to the original group from the available columns list

### Group Removal
1. Add an "X" button next to each column group in the left sidebar
2. When clicked, it should:
   - Remove the column group from AG Grid
   - Remove the group from the left sidebar list
   - Make the columns available again in the "Available Columns" list as unselected
   - Ensure columns are visible as non-grouped columns in AG Grid

### State Management
1. Implement proper state tracking for:
   - Original grid columns configuration
   - Current selections
   - Edit mode status
   - Group assignments
2. Ensure all state changes are properly reflected in the UI

## Technical Constraints
1. Use standard AG Grid API methods for column manipulation
2. Ensure compatibility with AG Grid Enterprise features if used
3. Implement proper error handling and validation
4. Ensure the component is reusable and accepts configuration options
5. Make sure all UI interactions are intuitive and follow best practices
6. Implement using a modular architecture with separate files for:
   - Core component logic
   - UI components
   - State management
   - AG Grid integration
   - Persistence utilities
7. Implementation technology stack:
   - React with TypeScript
   - Tailwind CSS for styling
   - shadcn/ui component library for UI elements
   - ag-grid-react and ag-grid-enterprise packages for grid functionality

## Data Flow
1. Initialize dialog with current column configuration from AG Grid, including any existing column groups
2. Track column assignments to groups
3. Apply changes to AG Grid only upon explicit user actions (create, update, remove)
4. Maintain consistent state between dialog and grid
5. Create a serializable data structure that represents the complete column group configuration
6. Provide methods to save and load this configuration alongside AG Grid settings

## Component API
Define a clean API for the component that allows:
1. Opening the dialog with the current grid state
2. Callback for when groups are updated
3. Configuration options for appearance and behavior
4. Integration with existing AG Grid instance
5. Methods to save the current column group configuration as a JSON object
6. Methods to load and apply a saved column group configuration
7. Integration with AG Grid's state management system for persistence

## Implementation Notes
- Use AG Grid's column API to get and manipulate columns
- Remember to handle column state properly including column IDs and references
- Consider using AG Grid's column group functionality for creating and managing groups
- Ensure the dialog is responsive and works well on different screen sizes
- Create a well-defined data structure for persistence that includes:
  - Group definitions (name, columns, open/closed/undefined state)
  - Column assignments to groups
  - Any additional metadata needed for reconstruction
- Implement initialization logic that:
  - Detects existing column groups in the AG Grid instance
  - Populates the dialog interface accordingly
  - Ensures synchronization between the dialog and grid state
- Add methods to export the complete configuration as JSON
- Provide functionality to restore the column group configuration from a saved state

## Modular Architecture
Implement the solution using a modular approach with the following components:

1. **Core Module Structure**
   - `ColumnGroupManager.tsx` - Main entry point and API facade
   - `models/` - Directory for TypeScript interfaces and types
   - `components/` - Directory for UI components
   - `services/` - Directory for business logic and services
   - `utils/` - Directory for utility functions
   - `hooks/` - Directory for custom React hooks

2. **Component Modules**
   - `components/ColumnGroupDialog.tsx` - Main dialog container using shadcn Dialog
   - `components/AvailableColumnsList.tsx` - List of columns with selection using shadcn components
   - `components/ColumnGroupsList.tsx` - List of existing column groups
   - `components/GroupEditForm.tsx` - Form for creating/editing groups

3. **Service Modules**
   - `services/ColumnGroupService.ts` - Business logic for group operations
   - `services/AgGridIntegrationService.ts` - Handles AG Grid interaction
   - `services/PersistenceService.ts` - Manages saving/loading configurations

4. **Model Modules**
   - `models/ColumnGroup.ts` - TypeScript interface for column groups
   - `models/ColumnDefinition.ts` - TypeScript interface for columns
   - `models/GroupConfiguration.ts` - TypeScript interface for persistence

5. **Utility Modules**
   - `utils/columnUtils.ts` - Helper functions for column operations
   - `utils/stateUtils.ts` - Helper functions for state management

6. **UI Component Integration**
   - Use shadcn/ui components throughout the implementation
   - Leverage Tailwind CSS for styling and responsive design
   - Ensure proper TypeScript typing for all components and functions
   - Use ag-grid-react and ag-grid-enterprise API for grid manipulation

This modular architecture ensures separation of concerns, maintainability, and reusability of the code.
