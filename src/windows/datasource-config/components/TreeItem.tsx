import React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FieldNode } from './FieldSelector';

interface TreeItemProps {
  field: FieldNode;
  level?: number;
  isExpanded: boolean;
  isSelected: boolean | 'indeterminate';
  onToggle: () => void;
  onSelect: () => void;
  onExpandToggle: () => void;
  renderChild?: (field: FieldNode, level: number) => React.ReactNode;
  showSample?: boolean;
}

const typeColorMap = {
  string: {
    badge: 'bg-green-900/20 text-green-400 border-green-800/30 hover:bg-green-900/30',
    text: 'text-green-400',
  },
  number: {
    badge: 'bg-blue-900/20 text-blue-400 border-blue-800/30 hover:bg-blue-900/30',
    text: 'text-blue-400',
  },
  boolean: {
    badge: 'bg-yellow-900/20 text-yellow-400 border-yellow-800/30 hover:bg-yellow-900/30',
    text: 'text-yellow-400',
  },
  date: {
    badge: 'bg-purple-900/20 text-purple-400 border-purple-800/30 hover:bg-purple-900/30',
    text: 'text-purple-400',
  },
  object: {
    badge: 'bg-orange-900/20 text-orange-400 border-orange-800/30 hover:bg-orange-900/30',
    text: 'text-orange-400',
  },
  array: {
    badge: 'bg-pink-900/20 text-pink-400 border-pink-800/30 hover:bg-pink-900/30',
    text: 'text-pink-400',
  },
  null: {
    badge: 'bg-gray-900/20 text-gray-400 border-gray-800/30 hover:bg-gray-900/30',
    text: 'text-gray-400',
  },
};

export function TreeItem({
  field,
  level = 0,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onExpandToggle,
  renderChild,
  showSample = true,
}: TreeItemProps) {
  const hasChildren = field.children && field.children.length > 0;
  const isObjectField = field.type === 'object';
  const typeColors = typeColorMap[field.type] || typeColorMap.string;
  
  // Debug logging
  if (level === 0) {
    console.log(`[TreeItem] Root field: ${field.name} (${field.path}), type: ${field.type}, hasChildren: ${hasChildren}`);
  }

  const treeItemContent = (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 transition-all',
        'hover:bg-accent hover:text-accent-foreground'
      )}
      style={{
        marginLeft: level > 0 ? `${level * 40}px` : undefined,
      }}
    >
      {/* Expand/Collapse button or spacer */}
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onExpandToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          <span className="w-5" />
        )}
      </div>

      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 flex-shrink-0"
      />

      {/* Type badge */}
      <Badge
        variant="outline"
        className={cn(
          'flex-shrink-0 border px-1.5 py-0 text-xs font-mono',
          typeColors.badge
        )}
      >
        {field.type}
      </Badge>

      {/* Field name */}
      <span
        className={cn(
          'text-sm',
          isObjectField ? 'font-semibold' : 'font-normal'
        )}
      >
        {field.name}
      </span>

      {/* Sample value */}
      {showSample && !isObjectField && field.sample !== undefined && field.sample !== null && (
        <span 
          className="ml-auto mr-2 max-w-[200px] truncate text-xs text-muted-foreground opacity-60"
          title={String(field.sample)}
        >
          {String(field.sample)}
        </span>
      )}
    </div>
  );

  if (!hasChildren) {
    return (
      <div className="relative">
        {/* Tree line connector */}
        {level > 0 && (
          <>
            {/* Vertical line */}
            <div
              className="absolute bottom-0 left-0 top-0 w-px bg-border/50"
              style={{
                marginLeft: `${level * 40 - 20}px`,
              }}
            />
            {/* Horizontal line */}
            <div
              className="absolute top-[18px] h-px bg-border/50"
              style={{
                left: `${level * 40 - 20}px`,
                width: '20px',
              }}
            />
          </>
        )}
        {treeItemContent}
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onExpandToggle}>
      <div className="relative">
        {/* Tree line connector */}
        {level > 0 && (
          <>
            {/* Vertical line */}
            <div
              className="absolute bottom-0 left-0 top-0 w-px bg-border/50"
              style={{
                marginLeft: `${level * 40 - 20}px`,
              }}
            />
            {/* Horizontal line */}
            <div
              className="absolute top-[18px] h-px bg-border/50"
              style={{
                left: `${level * 40 - 20}px`,
                width: '20px',
              }}
            />
          </>
        )}
        {treeItemContent}
      </div>
      <CollapsibleContent className="relative">
        {/* Vertical line for children */}
        {level < 2 && (
          <div
            className="absolute bottom-0 left-0 top-0 w-px bg-border/50"
            style={{
              marginLeft: `${(level + 1) * 40 - 20}px`,
            }}
          />
        )}
        {renderChild && field.children && field.children.map(child => renderChild(child, level + 1))}
      </CollapsibleContent>
    </Collapsible>
  );
}