import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2,
  RotateCcw 
} from 'lucide-react';
import { ExpressionHistory } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface HistoryTabProps {
  history: ExpressionHistory[];
  onSelect: (expression: string) => void;
  onClear: () => void;
}

const getModeColor = (mode: string): string => {
  switch (mode) {
    case 'conditional':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'calculation':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'filter':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'validation':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

export const HistoryTab: React.FC<HistoryTabProps> = ({ 
  history, 
  onSelect, 
  onClear 
}) => {
  const handleRestore = (item: ExpressionHistory) => {
    onSelect(item.expression);
  };

  const renderHistoryItem = (item: ExpressionHistory) => (
    <div
      key={item.id}
      className="group flex flex-col p-3 hover:bg-accent rounded-md cursor-pointer border border-transparent hover:border-border"
      onClick={() => handleRestore(item)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {item.isValid ? (
              <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
            )}
            <Badge 
              variant="secondary" 
              className={`text-xs ${getModeColor(item.mode)}`}
            >
              {item.mode}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>
          <code className="text-sm font-mono block bg-muted p-2 rounded overflow-x-auto">
            {item.expression}
          </code>
          {item.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {item.description}
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleRestore(item);
          }}
          title="Restore this expression"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  // Group history by time
  const groupedHistory = history.reduce((acc, item) => {
    const date = new Date(item.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let group: string;
    if (date.toDateString() === today.toDateString()) {
      group = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = 'Yesterday';
    } else {
      group = date.toLocaleDateString();
    }
    
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, ExpressionHistory[]>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Expression History</span>
          <Badge variant="secondary" className="text-xs">
            {history.length}
          </Badge>
        </div>
        {history.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-7"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* History list */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>No expression history yet</div>
              <div className="text-xs mt-1">
                Your recent expressions will appear here
              </div>
            </div>
          ) : (
            Object.entries(groupedHistory).map(([group, items]) => (
              <div key={group} className="mb-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {group}
                </div>
                <div className="space-y-2">
                  {items.map(renderHistoryItem)}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Info */}
      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground">
          <div>• Click to restore any expression</div>
          <div>• History is saved per expression mode</div>
          <div>• Recent expressions are saved automatically</div>
        </div>
      </div>
    </div>
  );
};