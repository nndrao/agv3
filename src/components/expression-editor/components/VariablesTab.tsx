import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Variable as VariableIcon, Copy, Info } from 'lucide-react';
import { Variable } from '../types';

interface VariablesTabProps {
  variables: Variable[];
  onInsert: (text: string) => void;
}

const getTypeColor = (type: string): string => {
  switch (type) {
    case 'number':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'string':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'boolean':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'date':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

export const VariablesTab: React.FC<VariablesTabProps> = ({ variables, onInsert }) => {
  const handleInsertVariable = (variable: Variable) => {
    onInsert(`\${${variable.name}}`);
  };

  const handleCopyVariable = (variable: Variable) => {
    navigator.clipboard.writeText(`\${${variable.name}}`);
  };

  // Group variables by category
  const groupedVariables = variables.reduce((acc, variable) => {
    const category = variable.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(variable);
    return acc;
  }, {} as Record<string, Variable[]>);

  const renderVariable = (variable: Variable) => (
    <div
      key={variable.name}
      className="group flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
      onClick={() => handleInsertVariable(variable)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <VariableIcon className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-medium">{variable.name}</div>
          {variable.description && (
            <div className="text-xs text-muted-foreground truncate">
              {variable.description}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Value: <code className="bg-muted px-1 rounded">
              {JSON.stringify(variable.value)}
            </code>
          </div>
        </div>
        <Badge 
          variant="secondary" 
          className={`text-xs ${getTypeColor(variable.type)}`}
        >
          {variable.type}
        </Badge>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyVariable(variable);
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
            // Show variable info
          }}
          title="Variable details"
        >
          <Info className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-3">
          {variables.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No variables available
            </div>
          ) : Object.keys(groupedVariables).length > 1 ? (
            // Show grouped variables
            Object.entries(groupedVariables).map(([category, vars]) => (
              <div key={category} className="mb-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {category}
                </div>
                {vars.map(renderVariable)}
              </div>
            ))
          ) : (
            // Show all variables
            variables.map(renderVariable)
          )}
        </div>
      </ScrollArea>

      {/* Info section */}
      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground">
          <div>• Variables are accessed with ${`{name}`}</div>
          <div>• Values shown are current at expression time</div>
          <div>• Click to insert into expression</div>
        </div>
      </div>
    </div>
  );
};