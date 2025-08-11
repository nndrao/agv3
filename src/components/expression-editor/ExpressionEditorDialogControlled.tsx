import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  CheckCircle, 
  XCircle,
  Calculator,
  Filter,
  ShieldCheck,
  Palette
} from 'lucide-react';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionMode, Variable } from './types';
import { ColDef } from 'ag-grid-community';

// Convert ColDef to simplified format for Expression Editor
interface SimpleColumn {
  field: string;
  headerName: string;
  type: string;
}

// Sample columns for demo
const SAMPLE_COLUMNS: SimpleColumn[] = [
  { field: 'Status', headerName: 'Status', type: 'text' },
  { field: 'Priority', headerName: 'Priority', type: 'text' },
  { field: 'Value', headerName: 'Value', type: 'number' },
  { field: 'Price', headerName: 'Price', type: 'number' },
  { field: 'Quantity', headerName: 'Quantity', type: 'number' },
  { field: 'Discount', headerName: 'Discount %', type: 'number' },
  { field: 'DueDate', headerName: 'Due Date', type: 'date' },
  { field: 'StartDate', headerName: 'Start Date', type: 'date' },
  { field: 'IsActive', headerName: 'Active', type: 'boolean' },
  { field: 'CustomerName', headerName: 'Customer', type: 'text' },
  { field: 'Email', headerName: 'Email', type: 'text' },
  { field: 'Phone', headerName: 'Phone', type: 'text' },
  { field: 'Description', headerName: 'Description', type: 'text' },
  { field: 'Score', headerName: 'Score', type: 'number' },
  { field: 'Age', headerName: 'Age (days)', type: 'number' }
];

// Sample variables for demo
const SAMPLE_VARIABLES: Variable[] = [
  { name: 'currentUser', value: 'john.doe', type: 'string', description: 'Current logged in user' },
  { name: 'today', value: new Date(), type: 'date', description: 'Current date' },
  { name: 'threshold', value: 100, type: 'number', description: 'Alert threshold' },
  { name: 'isProduction', value: false, type: 'boolean', description: 'Production environment flag' }
];

interface ExpressionEditorDialogControlledProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: ExpressionMode;
  onSave?: (expression: string, mode: ExpressionMode) => void;
  availableColumns?: ColDef[];
  availableVariables?: Variable[];
}

// Helper function to convert ColDef to SimpleColumn
const convertColDefToSimpleColumn = (colDef: ColDef): SimpleColumn => {
  return {
    field: colDef.field || '',
    headerName: colDef.headerName || colDef.field || '',
    type: Array.isArray(colDef.type) ? colDef.type[0] || 'text' : (colDef.type || 'text')
  };
};

export const ExpressionEditorDialogControlled: React.FC<ExpressionEditorDialogControlledProps> = ({ 
  open,
  onOpenChange,
  mode: initialMode = 'conditional',
  onSave,
  availableColumns,
  availableVariables = SAMPLE_VARIABLES
}) => {
  const [mode, setMode] = useState<ExpressionMode>(initialMode);
  const [expression, setExpression] = useState('');
  const [isValid, setIsValid] = useState(false);
  
  // Convert ColDef[] to SimpleColumn[]
  const simpleColumns = React.useMemo(() => {
    if (!availableColumns) return SAMPLE_COLUMNS;
    return availableColumns.map(convertColDefToSimpleColumn);
  }, [availableColumns]);

  const handleExpressionChange = (expr: string, valid: boolean) => {
    setExpression(expr);
    setIsValid(valid);
  };

  const handleSave = () => {
    if (isValid && expression) {
      onSave?.(expression, mode);
      onOpenChange(false);
    }
  };

  const handleExecute = async (expr: string) => {
    // Simulate execution with sample data
    try {
      // Simple evaluation for demo purposes
      if (expr.includes('SWITCH')) {
        return {
          backgroundColor: '#4CAF50',
          color: 'white',
          fontWeight: 'bold'
        };
      }
      if (expr.includes('IF') && expr.includes('backgroundColor')) {
        return {
          backgroundColor: '#FF9800',
          color: 'white'
        };
      }
      if (expr.includes('SUM')) {
        return 150;
      }
      if (expr.includes('CONCAT')) {
        return 'John Doe';
      }
      if (expr.includes('AND') || expr.includes('OR')) {
        return true;
      }
      if (expr.includes('ROUND')) {
        return 123.45;
      }
      return { result: 'Executed successfully' };
    } catch (error) {
      throw new Error('Execution failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const getInitialExpression = (mode: ExpressionMode) => {
    switch (mode) {
      case 'conditional':
        return `SWITCH([Status],
  "Done", { backgroundColor: "#4CAF50", color: "white" },
  "In Progress", { backgroundColor: "#FF9800", color: "white" },
  "Started", { backgroundColor: "#2196F3", color: "white" },
  { backgroundColor: "#f5f5f5", color: "#666" }
)`;
      case 'calculation':
        return 'ROUND([Price] * [Quantity] * (1 - [Discount] / 100), 2)';
      case 'filter':
        return 'AND([Status] = "Active", [Value] > ${threshold})';
      case 'validation':
        return 'NOT(ISNULL([Email])) AND CONTAINS([Email], "@")';
      default:
        return '';
    }
  };

  const getModeIcon = (mode: ExpressionMode) => {
    switch (mode) {
      case 'conditional':
        return <Palette className="h-4 w-4" />;
      case 'calculation':
        return <Calculator className="h-4 w-4" />;
      case 'filter':
        return <Filter className="h-4 w-4" />;
      case 'validation':
        return <ShieldCheck className="h-4 w-4" />;
    }
  };

  const getModeDescription = (mode: ExpressionMode) => {
    switch (mode) {
      case 'conditional':
        return 'Create dynamic cell styles based on data values';
      case 'calculation':
        return 'Calculate new values from existing columns';
      case 'filter':
        return 'Build complex filter queries for data';
      case 'validation':
        return 'Define validation rules for cell editing';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[1400px] h-[85vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Expression Editor</DialogTitle>
                <DialogDescription>
                  Build powerful expressions with IntelliSense and live validation
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isValid ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Valid Expression
                </Badge>
              ) : expression ? (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Invalid Expression
                </Badge>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        
        <Tabs 
          value={mode} 
          onValueChange={(v) => setMode(v as ExpressionMode)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="border-b px-6 flex-shrink-0">
            <TabsList className="h-12 p-1 bg-transparent border-0">
              <TabsTrigger 
                value="conditional" 
                className="gap-2 data-[state=active]:bg-muted"
              >
                <Palette className="h-4 w-4" />
                Conditional Formatting
              </TabsTrigger>
              <TabsTrigger 
                value="calculation"
                className="gap-2 data-[state=active]:bg-muted"
              >
                <Calculator className="h-4 w-4" />
                Calculated Columns
              </TabsTrigger>
              <TabsTrigger 
                value="filter"
                className="gap-2 data-[state=active]:bg-muted"
              >
                <Filter className="h-4 w-4" />
                Filter Queries
              </TabsTrigger>
              <TabsTrigger 
                value="validation"
                className="gap-2 data-[state=active]:bg-muted"
              >
                <ShieldCheck className="h-4 w-4" />
                Validation Rules
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={mode} className="flex-1 m-0 p-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="px-6 py-3 bg-muted/50 border-b flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getModeIcon(mode)}
                <span>{getModeDescription(mode)}</span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ExpressionEditor
                key={mode} // Force remount when mode changes
                mode={mode}
                initialExpression={getInitialExpression(mode)}
                availableColumns={simpleColumns}
                availableVariables={availableVariables}
                onChange={handleExpressionChange}
                onExecute={handleExecute}
                showPreview={true}
                showHistory={true}
                showFunctionLibrary={true}
                height="100%"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {expression ? (
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {expression.length > 50 
                    ? expression.substring(0, 50) + '...' 
                    : expression
                  }
                </code>
              ) : (
                'No expression entered'
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!isValid || !expression}
              >
                Save Expression
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};