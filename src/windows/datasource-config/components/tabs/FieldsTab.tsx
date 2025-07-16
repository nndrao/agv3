import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronRight, 
  ChevronDown, 
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldNode } from '../FieldSelector';

interface FieldsTabProps {
  inferredFields: FieldNode[];
  selectedFields: Set<string>;
  expandedFields: Set<string>;
  fieldSearchQuery: string;
  selectAllChecked: boolean;
  selectAllIndeterminate: boolean;
  onFieldToggle: (path: string) => void;
  onExpandToggle: (path: string) => void;
  onSearchChange: (query: string) => void;
  onSelectAllChange: (checked: boolean) => void;
  onClearAll: () => void;
  onInferFields?: () => void;
  inferring?: boolean;
}

export function FieldsTab({
  inferredFields,
  selectedFields,
  expandedFields,
  fieldSearchQuery,
  selectAllChecked,
  selectAllIndeterminate,
  onFieldToggle,
  onExpandToggle,
  onSearchChange,
  onSelectAllChange,
  onClearAll,
  onInferFields,
  inferring = false,
}: FieldsTabProps) {
  
  // Filter fields based on search query
  const filterFields = (fields: FieldNode[], query: string): FieldNode[] => {
    if (!query) return fields;
    
    const lowerQuery = query.toLowerCase();
    
    return fields.reduce((acc: FieldNode[], field) => {
      const matchesQuery = 
        field.path.toLowerCase().includes(lowerQuery) ||
        field.name.toLowerCase().includes(lowerQuery);
      
      if (field.children) {
        const filteredChildren = filterFields(field.children, query);
        if (matchesQuery || filteredChildren.length > 0) {
          acc.push({
            ...field,
            children: filteredChildren.length > 0 ? filteredChildren : field.children
          });
        }
      } else if (matchesQuery) {
        acc.push(field);
      }
      
      return acc;
    }, []);
  };
  
  const toggleFieldSelection = (path: string) => {
    onFieldToggle(path);
  };
  
  const renderFieldItem = (field: FieldNode, level: number = 0) => {
    const hasChildren = field.children && field.children.length > 0;
    const isExpanded = expandedFields.has(field.path);
    const isSelected = selectedFields.has(field.path);
    const isObjectField = field.type === 'object';
    
    // For object fields, determine if it should be checked/indeterminate based on children
    let checkboxState: boolean | "indeterminate" = isSelected;
    
    if (isObjectField) {
      // Collect all non-object leaf paths for this object
      const collectLeaves = (node: FieldNode): string[] => {
        const leaves: string[] = [];
        if (!node.children || node.children.length === 0) {
          if (node.type !== 'object') {
            leaves.push(node.path);
          }
        } else {
          node.children.forEach(child => {
            leaves.push(...collectLeaves(child));
          });
        }
        return leaves;
      };
      
      const leafPaths = collectLeaves(field);
      const selectedLeaves = leafPaths.filter(path => selectedFields.has(path));
      
      if (selectedLeaves.length === 0) {
        checkboxState = false;
      } else if (selectedLeaves.length === leafPaths.length) {
        checkboxState = true;
      } else {
        checkboxState = "indeterminate";
      }
    }
    
    return (
      <div key={field.path}>
        <div
          className={cn(
            "flex items-center py-1.5 px-2 hover:bg-accent/30 rounded group"
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren && (
              <button
                onClick={() => onExpandToggle(field.path)}
                className="p-0.5 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            
            <Checkbox
              checked={checkboxState}
              onCheckedChange={() => toggleFieldSelection(field.path)}
              className="h-4 w-4 ml-5"
            />
            
            <span className={cn(
              "text-sm",
              field.type === 'string' && "field-type-string",
              field.type === 'number' && "field-type-number",
              field.type === 'boolean' && "field-type-boolean",
              field.type === 'date' && "field-type-date",
              isObjectField && "field-type-object"
            )}>
              {field.type}
            </span>
            
            <span className={cn(
              "text-sm",
              isObjectField && "font-medium"
            )}>
              {field.name}
            </span>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {field.children!.map(child => renderFieldItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  const filteredFields = filterFields(inferredFields, fieldSearchQuery);
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectAllIndeterminate ? "indeterminate" : selectAllChecked}
                onCheckedChange={onSelectAllChange}
                className="h-4 w-4"
              />
              <h3 className="text-sm font-medium">
                Inferred Fields ({inferredFields.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={onInferFields}
                disabled={inferring}
              >
                Infer Fields
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearAll}
                disabled={inferredFields.length === 0}
              >
                Clear All
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="p-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fields..."
                value={fieldSearchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          
          {/* Fields List */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-2">
              {(() => {
                if (filteredFields.length === 0) {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      {fieldSearchQuery ? 'No fields match your search' : 'No fields inferred yet'}
                    </div>
                  );
                }
                
                return filteredFields.map(field => renderFieldItem(field));
              })()}
            </div>
          </ScrollArea>
        </div>
        
        {/* Selected fields sidebar */}
        <div className="w-64 border-l flex flex-col">
          <div className="p-4 border-b flex-shrink-0">
            <h3 className="text-sm font-medium">
              Selected ({selectedFields.size})
            </h3>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-1">
              {Array.from(selectedFields).sort().map(path => {
                return (
                  <div
                    key={path}
                    className="text-sm text-muted-foreground py-1"
                  >
                    {path}
                  </div>
                );
              })}
              
              {selectedFields.size === 0 && (
                <div className="text-center text-muted-foreground text-sm py-4">
                  No fields selected
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t dialog-footer flex items-center justify-between flex-shrink-0">
        <Button 
          variant="secondary"
          onClick={() => {
            // This would update columns based on selected fields
            // For now, just switch to columns tab
          }}
          disabled={selectedFields.size === 0}
        >
          Update Columns ({selectedFields.size})
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Cancel
          </Button>
          <Button variant="default" className="update-button" onClick={() => {
            const event = new CustomEvent('updateDatasource');
            window.dispatchEvent(event);
          }}>
            Update Datasource
          </Button>
        </div>
      </div>
    </div>
  );
}