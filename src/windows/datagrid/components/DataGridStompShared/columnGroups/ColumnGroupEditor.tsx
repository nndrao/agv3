import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, Check, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DraggableDialog,
  DraggableDialogContent,
} from '@/components/ui/draggable-dialog';
import {
  ColumnGroupDefinition,
  ColumnDefinition,
  ColumnGroupEditorProps,
  ColumnGroupEditorContentProps
} from './types';
// Use NoPortalSelect since we're already in an OpenFin portal window
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../gridOptions/NoPortalSelect';

// Extract columns from column definitions
const extractColumnsFromDefs = (columnDefs: any[]): ColumnDefinition[] => {
  if (!columnDefs || columnDefs.length === 0) return [];
  
  const columns: ColumnDefinition[] = [];
  
  // Recursively extract columns from definitions
  const processColDef = (colDef: any) => {
    if (colDef.children) {
      // This is a column group - process its children
      colDef.children.forEach((child: any) => processColDef(child));
    } else {
      // This is a regular column
      const colId = colDef.colId || colDef.field;
      const field = colDef.field || colDef.colId || '';
      console.log('[extractColumnsFromDefs] Processing column:', { colId, field, headerName: colDef.headerName });
      columns.push({
        colId: colId,
        field: field,
        headerName: colDef.headerName || field || colId || '',
        isGrouped: false,
        groupId: undefined
      });
    }
  };
  
  columnDefs.forEach(colDef => processColDef(colDef));
  console.log('[extractColumnsFromDefs] Extracted columns:', columns.map(c => ({ colId: c.colId, field: c.field })));
  
  return columns;
};

// Extract existing column groups from column definitions
const extractGroupsFromDefs = (columnDefs: any[]): ColumnGroupDefinition[] => {
  if (!columnDefs || columnDefs.length === 0) return [];
  
  const groups: ColumnGroupDefinition[] = [];
  
  columnDefs.forEach((colDef: any) => {
    if (colDef.children) {
      // This is a column group
      const childIds: string[] = [];
      const columnStates: Record<string, 'open' | 'closed' | undefined> = {};
      
      colDef.children.forEach((child: any) => {
        if (!child.children) { // Only direct columns, not nested groups
          const colId = child.colId || child.field;
          childIds.push(colId);
          
          // Extract columnGroupShow value
          if (child.columnGroupShow) {
            columnStates[colId] = child.columnGroupShow;
          }
        }
      });
      
      if (childIds.length > 0) {
        groups.push({
          groupId: colDef.groupId || `group_${Date.now()}_${Math.random()}`,
          headerName: colDef.headerName || 'Unnamed Group',
          children: childIds,
          openByDefault: colDef.openByDefault !== false,
          columnStates
        });
      }
    }
  });
  
  return groups;
};

// Column item component with select box
const ColumnItem: React.FC<{
  column: ColumnDefinition;
  isSelected: boolean;
  onSelect: (colId: string) => void;
  openState: 'open' | 'closed' | 'undefined';
  onOpenStateChange: (colId: string, state: 'open' | 'closed' | 'undefined') => void;
  disabled?: boolean;
}> = React.memo(({ column, isSelected, onSelect, openState, onOpenStateChange, disabled }) => {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border transition-colors",
        isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => !disabled && onSelect(column.colId)}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        disabled={disabled}
      />
      <div className="flex-1">
        <div className="font-medium text-sm">{column.headerName}</div>
        <div className="text-xs text-muted-foreground">{column.field}</div>
      </div>
      <Select
        value={openState}
        onValueChange={(value) => onOpenStateChange(column.colId, value as any)}
        disabled={disabled || !isSelected}
      >
        <SelectTrigger className="w-24 h-7 text-xs" onClick={(e) => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="undefined">Default</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
});

// Group item component
const GroupItem: React.FC<{
  group: ColumnGroupDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}> = React.memo(({ group, isSelected, onSelect, onRemove }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors",
        isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div className="flex-1">
        <div className="font-medium">{group.headerName}</div>
        <div className="text-xs text-muted-foreground">{group.children.length} columns</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});

// Main editor content component
export const ColumnGroupEditorContent: React.FC<ColumnGroupEditorContentProps> = ({
  gridApi: _gridApi,
  columnApi: _columnApi,
  columnDefs,
  currentGroups,
  onApply,
  onClose
}) => {
  // State
  const [groups, setGroups] = useState<ColumnGroupDefinition[]>([]);
  const [allColumns, setAllColumns] = useState<ColumnDefinition[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [columnOpenStates, setColumnOpenStates] = useState<Map<string, 'open' | 'closed' | 'undefined'>>(new Map());
  const [groupName, setGroupName] = useState('');
  const [groupOpenState, setGroupOpenState] = useState<'open' | 'closed' | 'undefined'>('open');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Initialize from column definitions
  useEffect(() => {
    if (columnDefs && columnDefs.length > 0) {
      // Extract all columns
      const columns = extractColumnsFromDefs(columnDefs);
      setAllColumns(columns);
      
      // Initialize all columns with 'open' state
      const states = new Map<string, 'open' | 'closed' | 'undefined'>();
      columns.forEach(col => {
        states.set(col.colId, 'open');
      });
      setColumnOpenStates(states);
      
      // Use provided current groups if available, otherwise extract from columnDefs
      if (currentGroups && currentGroups.length > 0) {
        setGroups(currentGroups);
      } else {
        // Extract existing groups from column definitions
        const existingGroups = extractGroupsFromDefs(columnDefs);
        setGroups(existingGroups);
      }
    }
  }, [columnDefs, currentGroups]);
  
  // Get available columns (not in any group or in the currently selected group for editing)
  const availableColumns = useMemo(() => {
    // Get all column IDs that are in groups
    const groupedColIds = new Set<string>();
    groups.forEach(group => {
      // Don't exclude columns from the group being edited
      if (group.groupId !== selectedGroupId) {
        group.children.forEach(colId => groupedColIds.add(colId));
      }
    });
    
    // Return columns that are not grouped (or belong to the group being edited)
    return allColumns.filter(col => !groupedColIds.has(col.colId));
  }, [allColumns, groups, selectedGroupId]);
  
  // Column selection handler
  const handleColumnSelect = useCallback((colId: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(colId)) {
        next.delete(colId);
      } else {
        next.add(colId);
      }
      return next;
    });
  }, []);

  // Open state change handler for individual columns
  const handleOpenStateChange = useCallback((colId: string, state: 'open' | 'closed' | 'undefined') => {
    setColumnOpenStates(prev => {
      const next = new Map(prev);
      next.set(colId, state);
      return next;
    });
  }, []);
  
  // Create new group
  const handleCreateGroup = useCallback(() => {
    if (!groupName || selectedColumns.size === 0) return;
    
    // Create column states map
    const columnStates: Record<string, 'open' | 'closed' | undefined> = {};
    Array.from(selectedColumns).forEach(colId => {
      const state = columnOpenStates.get(colId);
      if (state !== 'undefined') {
        columnStates[colId] = state === 'open' ? 'open' : 'closed';
      }
      // undefined state means no columnGroupShow attribute
    });
    
    const newGroup: ColumnGroupDefinition = {
      groupId: `group_${Date.now()}`,
      headerName: groupName,
      children: Array.from(selectedColumns),
      openByDefault: false, // Default to collapsed to see columnGroupShow effect
      columnStates
    };
    
    setGroups(prev => [...prev, newGroup]);
    setGroupName('');
    setSelectedColumns(new Set());
  }, [groupName, selectedColumns, columnOpenStates]);
  
  // Select group for editing
  const handleGroupSelect = useCallback((groupId: string) => {
    const group = groups.find(g => g.groupId === groupId);
    if (!group) return;
    
    setSelectedGroupId(groupId);
    setGroupName(group.headerName);
    setSelectedColumns(new Set(group.children));
    setIsEditMode(true);
    
    // Set column open states based on group
    const newStates = new Map(columnOpenStates);
    group.children.forEach(colId => {
      // Use the stored column state or default to 'open'
      const columnState = group.columnStates?.[colId];
      newStates.set(colId, columnState === 'open' ? 'open' : columnState === 'closed' ? 'closed' : 'undefined');
    });
    setColumnOpenStates(newStates);
  }, [groups, columnOpenStates]);
  
  // Update existing group
  const handleUpdateGroup = useCallback(() => {
    if (!selectedGroupId || !groupName || selectedColumns.size === 0) return;
    
    // Create column states map
    const columnStates: Record<string, 'open' | 'closed' | undefined> = {};
    Array.from(selectedColumns).forEach(colId => {
      const state = columnOpenStates.get(colId);
      if (state !== 'undefined') {
        columnStates[colId] = state === 'open' ? 'open' : 'closed';
      }
      // undefined state means no columnGroupShow attribute
    });
    
    setGroups(prev => prev.map(group => {
      if (group.groupId === selectedGroupId) {
        return {
          ...group,
          headerName: groupName,
          children: Array.from(selectedColumns),
          openByDefault: false, // Default to collapsed to see columnGroupShow effect
          columnStates
        };
      }
      return group;
    }));
    
    // Reset edit mode
    handleCancelEdit();
  }, [selectedGroupId, groupName, selectedColumns, columnOpenStates]);
  
  // Cancel edit mode
  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
    setSelectedGroupId(null);
    setGroupName('');
    setSelectedColumns(new Set());
  }, []);
  
  // Remove group
  const handleRemoveGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.filter(g => g.groupId !== groupId));
    
    // If we're editing this group, cancel edit mode
    if (selectedGroupId === groupId) {
      handleCancelEdit();
    }
  }, [selectedGroupId, handleCancelEdit]);
  
  // Apply changes
  const handleApply = useCallback(() => {
    onApply(groups);
    onClose();
  }, [groups, onApply, onClose]);
  
  // Reset all
  const handleResetAll = useCallback(() => {
    setGroups([]);
    handleCancelEdit();
  }, [handleCancelEdit]);
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 flex-shrink-0">
        <h2 className="text-lg font-semibold">Column Groups</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage column groups for your grid. Groups help organize related columns together.
        </p>
      </div>
      
      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Existing Groups */}
        <div className="w-2/5 border-r flex flex-col">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
            <h3 className="font-medium">Column Groups</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              disabled={groups.length === 0}
            >
              Clear All
            </Button>
          </div>
          
          <div className="flex-1 px-4 pb-4 overflow-hidden">
            <ScrollArea className="h-full">
              {groups.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No column groups created yet
                </div>
              ) : (
                <div className="space-y-2 pr-3">
                  {groups.map(group => (
                    <GroupItem
                      key={group.groupId}
                      group={group}
                      isSelected={selectedGroupId === group.groupId}
                      onSelect={() => handleGroupSelect(group.groupId)}
                      onRemove={() => handleRemoveGroup(group.groupId)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
        
        {/* Right Panel - Column Selection */}
        <div className="flex-1 flex flex-col">
          {/* Group Name Input */}
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="mt-1"
            />
          </div>
          
          {/* Available Columns */}
          <div className="flex-1 px-4 pb-2 flex flex-col overflow-hidden">
            <h3 className="font-medium mb-2 flex-shrink-0">
              {isEditMode ? 'Columns (editing group)' : 'Available Columns'}
            </h3>
            <div className="flex-1 border rounded-md overflow-hidden">
              <ScrollArea className="h-full p-2">
                {availableColumns.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {isEditMode 
                      ? 'No columns available to add to this group' 
                      : 'All columns are assigned to groups'}
                  </div>
                ) : (
                  <div className="space-y-2 pr-3">
                    {availableColumns.map(column => (
                      <ColumnItem
                        key={column.colId}
                        column={column}
                        isSelected={selectedColumns.has(column.colId)}
                        onSelect={handleColumnSelect}
                        openState={columnOpenStates.get(column.colId) || 'open'}
                        onOpenStateChange={handleOpenStateChange}
                        disabled={false}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="px-4 pb-4 flex justify-end gap-2 flex-shrink-0">
            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateGroup}
                  disabled={!groupName || selectedColumns.size === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Update Group
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName || selectedColumns.size === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t px-6 py-4 flex justify-end gap-2 flex-shrink-0">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleApply}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
};

// Original component that uses DraggableDialog
export const ColumnGroupEditor: React.FC<ColumnGroupEditorProps> = ({
  open,
  onOpenChange,
  gridApi,
  columnApi,
  columnDefs,
  onApply
}) => {
  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="max-w-5xl max-h-[90vh] w-[90vw] h-[85vh]">
        <ColumnGroupEditorContent
          gridApi={gridApi}
          columnApi={columnApi}
          columnDefs={columnDefs}
          currentGroups={undefined} // Will be provided by parent component
          onApply={onApply}
          onClose={() => onOpenChange(false)}
        />
      </DraggableDialogContent>
    </DraggableDialog>
  );
};