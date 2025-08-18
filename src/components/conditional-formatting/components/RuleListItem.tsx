import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown,
  Eye,
  EyeOff,
  Minus
} from 'lucide-react';
import { ConditionalRule } from '../types';
import { cn } from '@/lib/utils';

interface RuleListItemProps {
  rule: ConditionalRule;
  index: number;
  totalRules: number;
  isSelected: boolean;
  isActive?: boolean; // NEW: Whether this rule is active/checked
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
  onToggleActive?: () => void; // NEW: Handle checkbox toggle
}

export const RuleListItem: React.FC<RuleListItemProps> = ({
  rule,
  index,
  totalRules,
  isSelected,
  isActive = false,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggle,
  onToggleActive
}) => {
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      className={cn(
        "group relative rounded-md transition-all cursor-pointer",
        "hover:bg-accent/50",
        isSelected 
          ? "bg-accent ring-2 ring-primary/20 shadow-sm" 
          : "hover:bg-accent/30",
        !rule.enabled && "opacity-50"
      )}
      onClick={onSelect}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left side - Checkbox, Status and Name */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Checkbox for active state */}
            {onToggleActive && (
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleActive();
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
            )}
            
            {/* Simple status indicator */}
            <div className="flex-shrink-0">
              <Minus 
                className={cn(
                  "h-3 w-3",
                  rule.enabled 
                    ? "text-primary" 
                    : "text-muted-foreground/50"
                )}
              />
            </div>

            {/* Rule name only */}
            <span className="text-sm font-medium truncate">
              {rule.name || 'Untitled Rule'}
            </span>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleAction(event as any, onToggle)}>
                {rule.enabled ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Disable
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Enable
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction(event as any, onDuplicate)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleAction(event as any, onMoveUp)}
                disabled={index === 0}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Move Up
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleAction(event as any, onMoveDown)}
                disabled={index === totalRules - 1}
              >
                <ArrowDown className="mr-2 h-4 w-4" />
                Move Down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleAction(event as any, onDelete)}
                className="focus:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4 text-[orangered]" />
                <span className="text-[orangered]">Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Subtle selection indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-l-md" />
      )}
    </div>
  );
};