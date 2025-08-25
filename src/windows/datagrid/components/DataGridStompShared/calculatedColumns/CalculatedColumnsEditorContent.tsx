import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Plus, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpressionEditor } from '@/components/expression-editor/ExpressionEditor';
import { CalculatedColumnDefinition } from '../types';
import { GridCalculatedColumnsStorage } from './gridCalculatedColumnsStorage';
import { ColDef } from 'ag-grid-community';

interface CalculatedColumnsEditorContentProps {
  columnDefs: ColDef[];
  currentColumns?: CalculatedColumnDefinition[]; // All available columns
  selectedColumnIds?: string[]; // Currently selected column IDs
  onApply: (selectedColumnIds: string[], allColumns: CalculatedColumnDefinition[]) => void;
  onClose: () => void;
  profileName?: string;
  gridInstanceId?: string;
}

export const CalculatedColumnsEditorContent: React.FC<CalculatedColumnsEditorContentProps> = ({
  columnDefs,
  currentColumns = [],
  selectedColumnIds = [],
  onApply,
  onClose,
  profileName,
  gridInstanceId,
}) => {
  const [columns, setColumns] = useState<CalculatedColumnDefinition[]>(currentColumns);
  const [activeColumnIds, setActiveColumnIds] = useState<string[]>(selectedColumnIds);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(
    currentColumns.length > 0 ? currentColumns[0].id : null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Convert column defs to the format expected by components
  const availableColumns = React.useMemo(() => 
    columnDefs.map(col => ({
      field: col.field || '',
      headerName: col.headerName,
      type: Array.isArray(col.type) ? col.type[0] : (col.type || 'text')
    })),
    [columnDefs]
  );

  const selectedColumn = React.useMemo(
    () => columns.find(c => c.id === selectedColumnId),
    [columns, selectedColumnId]
  );

  const handleAddColumn = useCallback(() => {
    const newColumn: CalculatedColumnDefinition = {
      id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      field: `calculated_${columns.length + 1}`,
      headerName: `Calculated Column ${columns.length + 1}`,
      expression: '',
      cellDataType: 'number',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setColumns(prevColumns => [...prevColumns, newColumn]);
    setSelectedColumnId(newColumn.id);
    setHasUnsavedChanges(true);
  }, [columns.length]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prevColumns => prevColumns.filter(c => c.id !== columnId));
    
    // Remove from active columns if it was selected
    setActiveColumnIds(prevActiveIds => prevActiveIds.filter(id => id !== columnId));
    
    setSelectedColumnId(prevSelectedId => {
      if (prevSelectedId === columnId) {
        return null;
      }
      return prevSelectedId;
    });
    
    setHasUnsavedChanges(true);
  }, []);

  const handleUpdateColumn = useCallback((updatedColumn: CalculatedColumnDefinition) => {
    setColumns(prevColumns => prevColumns.map(c => 
      c.id === updatedColumn.id ? { ...updatedColumn, updatedAt: Date.now() } : c
    ));
    setHasUnsavedChanges(true);
  }, []);

  // Handle checkbox toggle for column selection
  const handleToggleColumnActive = useCallback((columnId: string) => {
    setActiveColumnIds(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  }, []);

  const handleApply = useCallback(() => {
    onApply(activeColumnIds, columns);
  }, [activeColumnIds, columns, onApply]);

  const handleSaveColumns = useCallback(async () => {
    if (!gridInstanceId) {
      console.warn('[CalculatedColumnsEditor] No gridInstanceId provided, cannot save columns');
      return;
    }

    try {
      // Save all columns to grid-level storage
      await GridCalculatedColumnsStorage.saveColumns(gridInstanceId, columns);
      
      setHasUnsavedChanges(false);
      console.log(`[CalculatedColumnsEditor] Saved ${columns.length} columns to grid storage`);
    } catch (error) {
      console.error('[CalculatedColumnsEditor] Error saving columns:', error);
    }
  }, [columns, gridInstanceId]);

  return (
    <div className="calculated-columns-dialog">
      <div className="cc-content-wrapper">
        {/* Left Panel - Columns List */}
        <div className="cc-sidebar-panel">
          <div className="cc-columns-panel">
            <div className="cc-columns-header">
              <div className="flex gap-3">
                <Button
                  onClick={handleAddColumn}
                  size="sm"
                  className="flex-1 min-w-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Column
                </Button>
              </div>
            </div>
            
            <div className="cc-columns-list">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className={`cc-column-item ${selectedColumnId === column.id ? 'selected' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeColumnIds.includes(column.id)}
                      onChange={() => handleToggleColumnActive(column.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setSelectedColumnId(column.id)}
                    >
                      <div className="font-medium">{column.headerName}</div>
                      <div className="text-sm text-muted-foreground">{column.field}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteColumn(column.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              
              {columns.length === 0 && (
                <div className="cc-empty-state">
                  <p className="text-muted-foreground text-sm">No calculated columns yet</p>
                  <p className="text-muted-foreground text-xs">Click "Add Column" to create your first calculated column</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Column Editor */}
        <div className="cc-main-panel">
          {selectedColumn ? (
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-2 gap-3 p-3 border-b">
                <div>
                  <label className="block text-sm font-medium mb-1">Field Name</label>
                  <input
                    type="text"
                    value={selectedColumn.field}
                    onChange={(e) => handleUpdateColumn({ ...selectedColumn, field: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Header Name</label>
                  <input
                    type="text"
                    value={selectedColumn.headerName}
                    onChange={(e) => handleUpdateColumn({ ...selectedColumn, headerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="flex-1 min-h-0">
                <Tabs defaultValue="expression" className="h-full flex flex-col">
                  <TabsList className="px-3 py-2 border-b justify-start">
                    <TabsTrigger value="expression">Expression</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="expression" className="flex-1 min-h-0 m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <div className="flex-1 min-h-0">
                      <ExpressionEditor
                        mode="calculation"
                        initialExpression={selectedColumn.expression || ''}
                        availableColumns={availableColumns}
                        onChange={(expr, _valid) => handleUpdateColumn({ ...selectedColumn, expression: expr })}
                        showPreview={true}
                        showHistory={true}
                        height="100%"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="flex-1 m-0 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Data Type</label>
                        <select
                          value={selectedColumn.cellDataType || 'number'}
                          onChange={(e) => handleUpdateColumn({ 
                            ...selectedColumn, 
                            cellDataType: e.target.value as any 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="number">Number</option>
                          <option value="text">Text</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Column Width</label>
                        <input
                          type="number"
                          value={selectedColumn.width || ''}
                          onChange={(e) => handleUpdateColumn({ 
                            ...selectedColumn, 
                            width: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Auto"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Pin Column</label>
                        <select
                          value={selectedColumn.pinned || ''}
                          onChange={(e) => handleUpdateColumn({ 
                            ...selectedColumn, 
                            pinned: e.target.value as any || undefined 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">None</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={selectedColumn.description || ''}
                          onChange={(e) => handleUpdateColumn({ 
                            ...selectedColumn, 
                            description: e.target.value 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md h-20"
                          placeholder="Optional description for this calculated column"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="preview" className="flex-1 m-0 p-0">
                    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center">
                        <p>Preview will show calculated results when applied to the grid.</p>
                        <p className="text-xs mt-2">Use "Apply" to see the column in action.</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="cc-empty-editor">
              <p className="text-muted-foreground">Select a column to edit, or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="cc-footer-actions">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Close
        </Button>
        <Button
          onClick={handleSaveColumns}
          variant="outline"
          disabled={!hasUnsavedChanges}
          className="min-w-[120px]"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Columns
        </Button>
        <Button
          onClick={handleApply}
          className="min-w-[100px]"
          variant="default"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Apply
        </Button>
      </div>
    </div>
  );
};