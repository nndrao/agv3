import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionMode, Variable, ColumnDefinition } from './types';

// Sample columns for demo
const SAMPLE_COLUMNS: ColumnDefinition[] = [
  { field: 'Status', headerName: 'Status', type: 'text' },
  { field: 'Priority', headerName: 'Priority', type: 'text' },
  { field: 'Value', headerName: 'Value', type: 'number' },
  { field: 'Price', headerName: 'Price', type: 'number' },
  { field: 'Quantity', headerName: 'Quantity', type: 'number' },
  { field: 'DueDate', headerName: 'Due Date', type: 'date' },
  { field: 'StartDate', headerName: 'Start Date', type: 'date' },
  { field: 'IsActive', headerName: 'Active', type: 'boolean' },
  { field: 'CustomerName', headerName: 'Customer', type: 'text' },
  { field: 'Email', headerName: 'Email', type: 'text' },
  { field: 'Phone', headerName: 'Phone', type: 'text' },
  { field: 'Description', headerName: 'Description', type: 'text' }
];

// Sample variables for demo
const SAMPLE_VARIABLES: Variable[] = [
  { name: 'currentUser', value: 'john.doe', type: 'string', description: 'Current logged in user' },
  { name: 'today', value: new Date(), type: 'date', description: 'Current date' },
  { name: 'threshold', value: 100, type: 'number', description: 'Alert threshold' },
  { name: 'isProduction', value: false, type: 'boolean', description: 'Production environment flag' }
];

export const ExpressionEditorDemo: React.FC = () => {
  const [mode, setMode] = useState<ExpressionMode>('conditional');
  const [expression, setExpression] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleExpressionChange = (expr: string, valid: boolean) => {
    setExpression(expr);
    setIsValid(valid);
  };

  const handleExecute = async (expr: string) => {
    // Simulate execution with sample data
    try {
      // Simple evaluation for demo purposes
      if (expr.includes('SWITCH')) {
        return {
          backgroundColor: '#4CAF50',
          color: 'white'
        };
      }
      if (expr.includes('IF')) {
        return true;
      }
      if (expr.includes('SUM')) {
        return 150;
      }
      if (expr.includes('CONCAT')) {
        return 'John Doe';
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

  return (
    <div className="container mx-auto p-6 max-w-screen-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Expression Editor Demo</span>
            <div className="flex items-center gap-2">
              <Badge variant={isValid ? 'default' : 'destructive'}>
                {isValid ? 'Valid' : 'Invalid'}
              </Badge>
              <Badge variant="outline">{mode}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as ExpressionMode)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="conditional">Conditional Formatting</TabsTrigger>
              <TabsTrigger value="calculation">Calculated Columns</TabsTrigger>
              <TabsTrigger value="filter">Filter Queries</TabsTrigger>
              <TabsTrigger value="validation">Validation Rules</TabsTrigger>
            </TabsList>
            
            <TabsContent value={mode} className="mt-4">
              <div className="h-[600px] border rounded-lg overflow-hidden">
                <ExpressionEditor
                  key={mode} // Force remount when mode changes
                  mode={mode}
                  initialExpression={getInitialExpression(mode)}
                  availableColumns={SAMPLE_COLUMNS}
                  availableVariables={SAMPLE_VARIABLES}
                  onChange={handleExpressionChange}
                  onExecute={handleExecute}
                  showPreview={true}
                  showHistory={true}
                  showFunctionLibrary={true}
                />
              </div>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Current Expression:</h4>
                <code className="text-xs block bg-background p-2 rounded">
                  {expression || '(empty)'}
                </code>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};