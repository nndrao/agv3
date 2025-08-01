// Test case to demonstrate expected columnGroupShow behavior

export const testColumnGroupShowConfig = () => {
  console.log('=== Column Group Show Test Configuration ===');
  
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
  
  console.log('Test column definitions:', JSON.stringify(testColumnDefs, null, 2));
  
  return testColumnDefs;
};

// Helper to verify column visibility
export const verifyColumnVisibility = (gridApi: any, columnApi: any) => {
  console.log('=== Verifying Column Visibility ===');
  
  // Get all columns
  const allColumns = columnApi?.getAllColumns?.() || gridApi?.getAllColumns?.() || [];
  console.log('Total columns:', allColumns.length);
  
  // Check each column's visibility
  allColumns.forEach((col: any) => {
    const colId = col.getColId();
    const isVisible = col.isVisible();
    const colDef = col.getColDef();
    
    console.log(`Column ${colId}:`, {
      visible: isVisible,
      columnGroupShow: colDef.columnGroupShow,
      field: colDef.field
    });
  });
  
  // Check column group states
  const columnGroupStates = columnApi?.getColumnGroupState?.() || gridApi?.getColumnGroupState?.() || [];
  console.log('Column group states:', columnGroupStates);
};