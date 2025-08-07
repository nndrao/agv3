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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
}

export const RuleListItem: React.FC<RuleListItemProps> = ({
  rule,
  index,
  totalRules,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggle
}) => {
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group relative rounded-md transition-all cursor-pointer",
              "hover:bg-accent/50",
              isSelected 
                ? "bg-accent" 
                : "hover:bg-accent/30",
              !rule.enabled && "opacity-50"
            )}
            onClick={onSelect}
          >
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                {/* Left side - Status and Name */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
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
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
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
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div>
              <div className="font-medium">{rule.name || 'Untitled Rule'}</div>
              {rule.description && (
                <div className="text-xs text-muted-foreground mt-0.5">{rule.description}</div>
              )}
            </div>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <span className={rule.enabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Priority:</span>
                <span>{rule.priority}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Scope:</span>
                <span>
                  {rule.scope.target === 'cell' ? 'Cell' : 'Row'}
                  {rule.scope.target === 'cell' && rule.scope.applyToColumns && rule.scope.applyToColumns.length > 0 && (
                    <span className="ml-1">({rule.scope.applyToColumns.length} columns)</span>
                  )}
                </span>
              </div>
              {rule.expression && (
                <div>
                  <span className="text-muted-foreground">Expression:</span>
                  <div className="font-mono text-[10px] bg-muted/50 p-1 rounded mt-0.5 break-all">
                    {rule.expression}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};