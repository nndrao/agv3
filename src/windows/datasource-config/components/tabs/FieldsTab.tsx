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
            "flex items-center py-1.5 hover:bg-[#2a2a2a] rounded-md group transition-colors",
            level === 0 ? "px-2" : "px-2"
          )}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-center gap-2 flex-1">
            {/* Expand/Collapse button or spacer */}
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {hasChildren ? (
                <button
                  onClick={() => onExpandToggle(field.path)}
                  className="p-0.5 hover:bg-[#3a3a3a] rounded transition-colors w-5 h-5 flex items-center justify-center"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </button>
              ) : (
                <span className="w-5" /> // Spacer for alignment
              )}
            </div>
            
            <Checkbox
              checked={checkboxState}
              onCheckedChange={() => toggleFieldSelection(field.path)}
              className="h-4 w-4 border-[#3a3a3a] data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary flex-shrink-0"
            />
            
            <span className={cn(
              "text-xs px-2 py-0.5 rounded font-mono flex-shrink-0",
              field.type === 'string' && "bg-green-900/20 text-green-400 border border-green-800/30",
              field.type === 'number' && "bg-blue-900/20 text-blue-400 border border-blue-800/30",
              field.type === 'boolean' && "bg-yellow-900/20 text-yellow-400 border border-yellow-800/30",
              field.type === 'date' && "bg-purple-900/20 text-purple-400 border border-purple-800/30",
              isObjectField && "bg-orange-900/20 text-orange-400 border border-orange-800/30"
            )}>
              {field.type}
            </span>
            
            <span className={cn(
              "text-sm",
              isObjectField ? "font-semibold text-white" : "text-gray-300"
            )}>
              {field.name}
            </span>
            
            {/* Show sample value for leaf nodes */}
            {!isObjectField && field.sample !== undefined && field.sample !== null && (
              <span className="text-xs text-gray-500 ml-auto mr-2 truncate max-w-[200px]" title={String(field.sample)}>
                {String(field.sample)}
              </span>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Vertical line for tree structure */}
            {level < 2 && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-px bg-[#3a3a3a]"
                style={{ marginLeft: `${level * 24 + 12}px` }}
              />
            )}
            {field.children!.map(child => renderFieldItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  const filteredFields = filterFields(inferredFields, fieldSearchQuery);
  
  return (
    <div className="h-full flex flex-col bg-[#1a1a1a]">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#3a3a3a] flex items-center justify-between flex-shrink-0 bg-[#242424]">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectAllIndeterminate ? "indeterminate" : selectAllChecked}
                onCheckedChange={onSelectAllChange}
                className="h-4 w-4 border-[#3a3a3a] data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary"
              />
              <h3 className="text-sm font-medium text-white">
                Inferred Fields
              </h3>
              <span className="text-xs bg-[#3a3a3a] text-gray-300 px-2 py-0.5 rounded">
                {inferredFields.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={onInferFields}
                disabled={inferring}
                className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 border-[#3a3a3a]"
              >
                Infer Fields
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearAll}
                disabled={inferredFields.length === 0}
                className="text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
              >
                Clear All
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="p-3 border-b border-[#3a3a3a] flex-shrink-0 bg-[#1e1e1e]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search fields..."
                value={fieldSearchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-9 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Fields List */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-2">
              {(() => {
                if (filteredFields.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      {fieldSearchQuery ? 'No fields match your search' : 'No fields inferred yet. Click "Infer Fields" to analyze your data.'}
                    </div>
                  );
                }
                
                return filteredFields.map(field => renderFieldItem(field));
              })()}
            </div>
          </ScrollArea>
        </div>
        
        {/* Selected fields sidebar */}
        <div className="w-64 border-l border-[#3a3a3a] flex flex-col bg-[#242424]">
          <div className="p-4 border-b border-[#3a3a3a] flex-shrink-0 bg-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                Selected Fields
              </h3>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                {selectedFields.size}
              </span>
            </div>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-1">
              {Array.from(selectedFields).sort().map(path => {
                return (
                  <div
                    key={path}
                    className="text-sm text-gray-400 py-1 font-mono"
                  >
                    {path}
                  </div>
                );
              })}
              
              {selectedFields.size === 0 && (
                <div className="text-center text-gray-500 text-sm py-4">
                  No fields selected
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-[#3a3a3a] bg-[#242424] flex items-center justify-between flex-shrink-0">
        <Button 
          variant="secondary"
          onClick={() => {
            // This would update columns based on selected fields
            // For now, just switch to columns tab
          }}
          disabled={selectedFields.size === 0}
          className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 border-[#3a3a3a]"
        >
          Update Columns ({selectedFields.size})
        </Button>
        
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