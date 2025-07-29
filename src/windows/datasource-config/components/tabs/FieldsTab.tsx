import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Search, Database, Loader2 } from 'lucide-react';
import { FieldNode } from '../FieldSelector';
import { TreeItem } from '../TreeItem';

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
    // const hasChildren = field.children && field.children.length > 0;
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
      <TreeItem
        key={field.path}
        field={field}
        level={level}
        isExpanded={isExpanded}
        isSelected={checkboxState}
        onToggle={() => toggleFieldSelection(field.path)}
        onSelect={() => toggleFieldSelection(field.path)}
        onExpandToggle={() => onExpandToggle(field.path)}
        renderChild={(childField, childLevel) => renderFieldItem(childField, childLevel)}
      />
    );
  };
  
  const filteredFields = filterFields(inferredFields, fieldSearchQuery);
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <CardHeader className="flex-shrink-0 space-y-0 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectAllIndeterminate ? "indeterminate" : selectAllChecked}
                  onCheckedChange={onSelectAllChange}
                />
                <h3 className="text-sm font-medium">
                  Inferred Fields
                </h3>
                <Badge variant="secondary" className="ml-2">
                  {inferredFields.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onInferFields}
                  disabled={inferring}
                >
                  {inferring ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Inferring...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-3 w-3" />
                      Infer Fields
                    </>
                  )}
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
          </CardHeader>
          
          <Separator />
          
          {/* Search */}
          <div className="flex-shrink-0 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fields..."
                value={fieldSearchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
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
        <Card className="w-64 rounded-none border-y-0 border-r-0">
          <CardHeader className="space-y-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Selected Fields
              </h3>
              <Badge variant="secondary">
                {selectedFields.size}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="p-3 space-y-1">
                {Array.from(selectedFields).sort().map(path => {
                  return (
                    <div
                      key={path}
                      className="rounded-md bg-muted/50 px-2 py-1 text-sm font-mono"
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
          </CardContent>
        </Card>
      </div>
      
      <Separator />
      
      {/* Footer */}
      <div className="flex items-center justify-between p-4">
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
          <Button 
            variant="ghost" 
            onClick={() => window.location.reload()}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
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