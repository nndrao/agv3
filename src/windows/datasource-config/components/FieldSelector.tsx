import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldNode {
  path: string;
  name: string;
  type: string;
  nullable: boolean;
  children?: FieldNode[];
  sample?: any;
}

interface FieldSelectorProps {
  fields: FieldNode[];
  selectedFields: Set<string>;
  expandedFields: Set<string>;
  searchQuery: string;
  selectAllChecked: boolean;
  selectAllIndeterminate: boolean;
  onFieldToggle: (path: string) => void;
  onExpandToggle: (path: string) => void;
  onSearchChange: (query: string) => void;
  onSelectAllChange: (checked: boolean) => void;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  fields,
  selectedFields,
  expandedFields,
  searchQuery,
  selectAllChecked,
  selectAllIndeterminate,
  onFieldToggle,
  onExpandToggle,
  onSearchChange,
  onSelectAllChange,
}) => {
  // Filter fields based on search
  const filteredFields = useMemo(() => {
    if (!searchQuery) return fields;
    
    const query = searchQuery.toLowerCase();
    const filterFields = (nodes: FieldNode[]): FieldNode[] => {
      return nodes.reduce((acc: FieldNode[], node) => {
        const matchesSearch = node.name.toLowerCase().includes(query) ||
                            node.path.toLowerCase().includes(query);
        
        if (node.children) {
          const filteredChildren = filterFields(node.children);
          if (filteredChildren.length > 0 || matchesSearch) {
            acc.push({
              ...node,
              children: filteredChildren
            });
          }
        } else if (matchesSearch) {
          acc.push(node);
        }
        
        return acc;
      }, []);
    };
    
    return filterFields(fields);
  }, [fields, searchQuery]);

  const renderField = (field: FieldNode, level: number = 0) => {
    const hasChildren = field.children && field.children.length > 0;
    const isExpanded = expandedFields.has(field.path);
    const isSelected = selectedFields.has(field.path);
    
    return (
      <div key={field.path}>
        <div
          className={cn(
            "flex items-center space-x-2 py-1 px-2 hover:bg-accent rounded-sm",
            level > 0 && "ml-4"
          )}
        >
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
          
          {!hasChildren && <div className="w-4" />}
          
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onFieldToggle(field.path)}
            className="h-4 w-4"
          />
          
          <div className="flex-1 flex items-center space-x-2">
            <span className="text-sm font-mono">{field.name}</span>
            <span className="text-xs text-muted-foreground">
              {field.type}
              {field.nullable && '?'}
            </span>
            {field.sample !== undefined && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                = {JSON.stringify(field.sample)}
              </span>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {field.children!.map(child => renderField(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search fields..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Select All */}
      <div className="flex items-center space-x-2 px-2">
        <Checkbox
          checked={selectAllIndeterminate ? "indeterminate" : selectAllChecked}
          onCheckedChange={onSelectAllChange}
        />
        <Label className="cursor-pointer">Select all fields</Label>
      </div>

      {/* Fields List */}
      <ScrollArea className="h-[400px] border rounded-md">
        <div className="p-2">
          {filteredFields.length > 0 ? (
            filteredFields.map(field => renderField(field))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? 'No fields match your search' : 'No fields available'}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Selected Count */}
      <div className="text-sm text-muted-foreground">
        {selectedFields.size} field{selectedFields.size !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
};