// Test case to demonstrate expected columnGroupShow behavior

export const testColumnGroupShowConfig = () => {
  
  // Expected behavior:
  // When a column group is collapsed (closed):
  //   - Columns with columnGroupShow: 'closed' should be visible
  //   - Columns with columnGroupShow: 'open' should be hidden
  //   - Columns without columnGroupShow should be visible
  //
  // When a column group is expanded (open):
  //   - Columns with columnGroupShow: 'open' should be visible
  //   - Columns with columnGroupShow: 'closed' should be hidden
  //   - Columns without columnGroupShow should be visible
  
  const testColumnDefs = [
    {
      headerName: 'Test Group',
      groupId: 'testGroup',
      openByDefault: false, // Start collapsed
      children: [
        {
          field: 'col1',
          headerName: 'Always Visible',
          // No columnGroupShow - always visible
        },
        {
          field: 'col2', 
          headerName: 'Only When Open',
          columnGroupShow: 'open' // Only visible when group is expanded
        },
        {
          field: 'col3',
          headerName: 'Only When Closed',
          columnGroupShow: 'closed' // Only visible when group is collapsed
        }
      ]
    }
  ];
  
  
  return testColumnDefs;
};

// Helper to verify column visibility
export const verifyColumnVisibility = (gridApi: any, columnApi: any) => {
  
  // Get all columns
  const allColumns = columnApi?.getAllColumns?.() || gridApi?.getAllColumns?.() || [];
  
  // Check each column's visibility
  allColumns.forEach((col: any) => {
    const colId = col.getColId();
    const isVisible = col.isVisible();
    const colDef = col.getColDef();
    
  });
  
  // Check column group states
  const columnGroupStates = columnApi?.getColumnGroupState?.() || gridApi?.getColumnGroupState?.() || [];
};