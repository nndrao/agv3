import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Database, 
  Hash, 
  Calendar, 
  ToggleLeft, 
  Type,
  Copy,
  Info
} from 'lucide-react';
import { ColumnDefinition } from '@/types';

interface ColumnsTabProps {
  columns: ColumnDefinition[];
  onInsert: (text: string) => void;
}

const getColumnIcon = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'number':
    case 'numeric':
      return <Hash className="h-4 w-4" />;
    case 'date':
    case 'datetime':
      return <Calendar className="h-4 w-4" />;
    case 'boolean':
      return <ToggleLeft className="h-4 w-4" />;
    case 'text':
    case 'string':
    default:
      return <Type className="h-4 w-4" />;
  }
};

const getTypeColor = (type?: string): string => {
  switch (type?.toLowerCase()) {
    case 'number':
    case 'numeric':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'date':
    case 'datetime':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'boolean':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'text':
    case 'string':
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

export const ColumnsTab: React.FC<ColumnsTabProps> = ({ columns, onInsert }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return columns.filter(col => 
      col.field.toLowerCase().includes(searchLower) ||
      col.headerName?.toLowerCase().includes(searchLower) ||
      col.type?.toLowerCase().includes(searchLower)
    );
  }, [columns, searchTerm]);

  const handleInsertColumn = (column: ColumnDefinition) => {
    onInsert(`[${column.field}]`);
  };

  const handleCopyColumn = (column: ColumnDefinition) => {
    navigator.clipboard.writeText(`[${column.field}]`);
  };

  const renderColumn = (column: ColumnDefinition) => (
    <div
      key={column.field}
      className="group flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
      onClick={() => handleInsertColumn(column)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {getColumnIcon(column.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {column.headerName || column.field}
          </div>
          {column.headerName && column.field !== column.headerName && (
            <div className="text-xs text-muted-foreground truncate">
              {column.field}
            </div>
          )}
        </div>
        <Badge 
          variant="secondary" 
          className={`text-xs ${getTypeColor(column.type)}`}
        >
          {column.type || 'any'}
        </Badge>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyColumn(column);
          }}
          title="Copy to clipboard"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            // Show column info
          }}
          title="Column details"
        >
          <Info className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </div>

      {/* Column count */}
      <div className="px-3 pt-2 pb-1">
        <div className="text-xs text-muted-foreground">
          {searchTerm 
            ? `Found ${filteredColumns.length} of ${columns.length} columns`
            : `${columns.length} columns available`
          }
        </div>
      </div>

      {/* Column list */}
      <ScrollArea className="flex-1">
        <div className="p-3 pt-1">
          {(searchTerm ? filteredColumns : columns).map(renderColumn)}
          {searchTerm && filteredColumns.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No columns match "{searchTerm}"
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick insert section */}
      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">Quick insert</div>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => onInsert('[*]')}
          >
            All columns
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => onInsert('params.value')}
          >
            Current value
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => onInsert('params.data')}
          >
            Row data
          </Button>
        </div>
      </div>
    </div>
  );
};