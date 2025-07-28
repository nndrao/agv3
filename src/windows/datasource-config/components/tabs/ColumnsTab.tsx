import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModuleRegistry, themeQuartz, ColDef, GridApi, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { AgGridReact } from 'ag-grid-react';
import { Plus, Trash2 } from 'lucide-react';
import { FieldNode } from '../FieldSelector';
import { ColumnDefinition } from '../StompConfigurationDialog';

// Register AG-Grid modules
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface ColumnsTabProps {
  selectedFields: Set<string>;
  inferredFields: FieldNode[];
  manualColumns: ColumnDefinition[];
  fieldColumnOverrides: Record<string, Partial<ColumnDefinition>>;
  onManualColumnsChange: (columns: ColumnDefinition[]) => void;
  onFieldColumnOverridesChange: (overrides: Record<string, Partial<ColumnDefinition>>) => void;
  onClearAll: () => void;
}

export function ColumnsTab({
  selectedFields,
  inferredFields,
  manualColumns,
  fieldColumnOverrides,
  onManualColumnsChange,
  onFieldColumnOverridesChange,
  onClearAll,
}: ColumnsTabProps) {
  const [newColumn, setNewColumn] = useState({ field: '', header: '', type: 'text' as ColumnDefinition['cellDataType'] });
  const [, setGridApi] = useState<GridApi | null>(null);
  
  // Get field type from inferred fields
  const getFieldType = (path: string): string | undefined => {
    const findField = (fields: FieldNode[]): FieldNode | undefined => {
      for (const field of fields) {
        if (field.path === path) return field;
        if (field.children) {
          const found = findField(field.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    
    const field = findField(inferredFields);
    return field?.type;
  };
  
  // Get all columns (field-based + manual)
  const getAllColumns = useCallback(() => {
    const columns: any[] = [];
    
    // Add field-based columns
    Array.from(selectedFields).forEach(path => {
      const override = fieldColumnOverrides[path] || {};
      const fieldType = getFieldType(path);
      const cellDataType = override.cellDataType || (fieldType === 'number' ? 'number' : 
                                                    fieldType === 'boolean' ? 'boolean' : 
                                                    fieldType === 'date' ? 'date' : 'text');
      
      columns.push({
        field: path,
        headerName: override.headerName || path.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
        cellDataType: cellDataType,
        source: 'field',
      });
    });
    
    // Add manual columns
    manualColumns.forEach(col => {
      columns.push({
        ...col,
        source: 'manual',
      });
    });
    
    return columns;
  }, [selectedFields, manualColumns, fieldColumnOverrides, inferredFields]);
  
  // Column definitions for AG-Grid
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'actions',
      headerName: '',
      width: 50,
      pinned: 'left',
      cellRenderer: (params: any) => {
        return (
          <button
            className="p-1 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white transition-colors"
            onClick={() => {
              if (params.data.source === 'field') {
                // Remove from selected fields (handled by parent)
                // This is just the UI button
              } else {
                onManualColumnsChange(manualColumns.filter(col => col.field !== params.data.field));
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        );
      },
    },
    {
      field: 'field',
      headerName: 'Field Name',
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: true,
    },
    {
      field: 'cellDataType',
      headerName: 'Type',
      width: 120,
      sortable: true,
      filter: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['text', 'number', 'boolean', 'date', 'dateString', 'object'],
      },
      editable: true,
    },
    {
      field: 'headerName',
      headerName: 'Header Name',
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: true,
      editable: true,
    },
  ], [manualColumns, onManualColumnsChange]);
  
  // Grid theme configuration
  const gridTheme = useMemo(() => {
    return themeQuartz.withParams({
      accentColor: '#3a3a3a',
      backgroundColor: '#1a1a1a',
      borderColor: '#3a3a3a',
      foregroundColor: '#e5e7eb',
      headerBackgroundColor: '#2a2a2a',
      headerFontSize: 12,
      fontSize: 12,
      rowHeight: 36,
      headerHeight: 36,
      cellHorizontalPadding: 8,
    });
  }, []);
  
  // Handle grid ready
  const onGridReady = useCallback((event: GridReadyEvent) => {
    setGridApi(event.api);
  }, []);
  
  // Handle cell value changed
  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    const { data, colDef, newValue } = event;
    
    if (data.source === 'manual') {
      const index = manualColumns.findIndex(col => col.field === data.field);
      if (index !== -1) {
        const updated = [...manualColumns];
        if (colDef?.field === 'cellDataType') {
          updated[index] = { ...updated[index], cellDataType: newValue };
        } else if (colDef?.field === 'headerName') {
          updated[index] = { ...updated[index], headerName: newValue };
        }
        onManualColumnsChange(updated);
      }
    } else if (data.source === 'field') {
      // Handle field-based columns
      onFieldColumnOverridesChange({
        ...fieldColumnOverrides,
        [data.field]: {
          ...fieldColumnOverrides[data.field],
          [colDef?.field as string]: newValue,
        },
      });
    }
  }, [manualColumns, fieldColumnOverrides, onManualColumnsChange, onFieldColumnOverridesChange]);
  
  const handleAddColumn = () => {
    if (!newColumn.field || !newColumn.header) {
      return;
    }
    
    const column: ColumnDefinition = {
      field: newColumn.field,
      headerName: newColumn.header,
      cellDataType: newColumn.type,
    };
    
    onManualColumnsChange([...manualColumns, column]);
    setNewColumn({ field: '', header: '', type: 'text' });
  };
  
  const columns = getAllColumns();
  
  return (
    <div className="h-full flex flex-col bg-[#1a1a1a]">
      {/* Add Manual Column Section */}
      <div className="p-4 border-b border-[#3a3a3a] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Add Manual Column</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearAll}
            disabled={columns.length === 0}
            className="text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
          >
            Clear All
          </Button>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              value={newColumn.field}
              onChange={(e) => setNewColumn({ ...newColumn, field: e.target.value })}
              placeholder="Field name"
              className="h-9 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1">
            <Input
              value={newColumn.header}
              onChange={(e) => setNewColumn({ ...newColumn, header: e.target.value })}
              placeholder="Header name"
              className="h-9 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={newColumn.type}
            onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value as ColumnDefinition['cellDataType'] })}
            className="h-9 px-3 border border-[#3a3a3a] bg-[#2a2a2a] text-white rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="dateString">Date String</option>
            <option value="object">Object</option>
          </select>
          <Button
            size="sm"
            onClick={handleAddColumn}
            disabled={!newColumn.field || !newColumn.header}
            className="h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* AG-Grid */}
      <div className="flex-1 overflow-hidden bg-[#1a1a1a]">
        <AgGridReact
          theme={gridTheme}
          className="ag-theme-quartz-dark"
          rowData={columns}
          columnDefs={columnDefs}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
          headerHeight={36}
          rowHeight={36}
          suppressMovableColumns={true}
          suppressCellFocus={true}
          suppressRowHoverHighlight={false}
          rowSelection="single"
          domLayout="normal"
        />
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-[#3a3a3a] bg-[#242424] flex items-center justify-between flex-shrink-0">
        <div className="text-sm text-gray-400">
          {columns.length} columns total
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            onClick={() => window.location.reload()}
            className="text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground" 
            onClick={() => {
              const event = new CustomEvent('updateDatasource');
              window.dispatchEvent(event);
            }}
          >
            Update Datasource
          </Button>
        </div>
      </div>
    </div>
  );
}