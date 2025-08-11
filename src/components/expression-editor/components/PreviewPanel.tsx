import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  AlertCircle, 
  Loader2,
  Table,
  FileJson,
  Type,
  Hash,
  Calendar,
  ToggleLeft
} from 'lucide-react';

interface PreviewPanelProps {
  result: any;
  isExecuting: boolean;
  onExecute: () => void;
}

const getTypeIcon = (value: any) => {
  const type = typeof value;
  if (type === 'string') return <Type className="h-3 w-3" />;
  if (type === 'number') return <Hash className="h-3 w-3" />;
  if (type === 'boolean') return <ToggleLeft className="h-3 w-3" />;
  if (value instanceof Date) return <Calendar className="h-3 w-3" />;
  if (Array.isArray(value)) return <Table className="h-3 w-3" />;
  if (type === 'object') return <FileJson className="h-3 w-3" />;
  return null;
};

const formatValue = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
};

const renderValue = (value: any, compact = false) => {
  if (value === null || value === undefined) {
    return (
      <span className="text-muted-foreground italic">
        {value === null ? 'null' : 'undefined'}
      </span>
    );
  }

  if (typeof value === 'object' && !compact) {
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            <span className="text-sm font-medium">Array ({value.length} items)</span>
          </div>
          <div className="bg-muted rounded p-2 overflow-x-auto">
            <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
          </div>
        </div>
      );
    } else {
      // Style object preview
      if (value.backgroundColor || value.color || value.border) {
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              <span className="text-sm font-medium">Style Object</span>
            </div>
            <div className="p-3 rounded border" style={value}>
              <div className="text-sm mb-2">Preview</div>
              <div className="bg-muted rounded p-2 overflow-x-auto">
                <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
              </div>
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            <span className="text-sm font-medium">Object</span>
          </div>
          <div className="bg-muted rounded p-2 overflow-x-auto">
            <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex items-center gap-2">
      {getTypeIcon(value)}
      <code className="text-sm bg-muted px-2 py-1 rounded">
        {formatValue(value)}
      </code>
      <Badge variant="secondary" className="text-xs">
        {typeof value}
      </Badge>
    </div>
  );
};

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
  result, 
  isExecuting, 
  onExecute 
}) => {
  const hasError = result && result.error;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Expression Preview</span>
          {result && !hasError && (
            <Badge variant="secondary" className="text-xs">
              Last executed
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={onExecute}
          disabled={isExecuting}
          className="h-7"
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-3 w-3 mr-1" />
              Execute
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {!result && !isExecuting ? (
            <div className="text-center text-muted-foreground py-8">
              <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>Click Execute to preview the expression result</div>
              <div className="text-xs mt-1">
                The expression will be evaluated with sample data
              </div>
            </div>
          ) : isExecuting ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hasError ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-800 dark:text-red-200">
                    Execution Error
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {result.error}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Result</div>
                {renderValue(result)}
              </div>

              {/* Additional context */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Expression evaluated successfully</div>
                <div>• Result type: {typeof result}</div>
                {typeof result === 'object' && result !== null && (
                  <div>• Properties: {Object.keys(result).join(', ')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Info */}
      <div className="px-4 py-2 border-t">
        <div className="text-xs text-muted-foreground">
          Preview uses sample data • Results may vary with actual data
        </div>
      </div>
    </div>
  );
};