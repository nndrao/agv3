import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Upload, Info } from 'lucide-react';
import { ConditionalRule } from '../types';
import { evaluateExpression } from '../utils/expressionEvaluator';

interface PreviewPanelProps {
  rules: ConditionalRule[];
  availableColumns: Array<{
    field: string;
    headerName?: string;
    type?: string;
  }>;
  previewData: any[];
  onDataChange: (data: any[]) => void;
}

const DEFAULT_PREVIEW_DATA = [
  { id: 1, Status: 'Completed', Priority: 'High', Value: 100, Date: '2024-01-15' },
  { id: 2, Status: 'In Progress', Priority: 'Medium', Value: -50, Date: '2024-01-20' },
  { id: 3, Status: 'Not Started', Priority: 'Low', Value: 0, Date: '2024-01-10' },
  { id: 4, Status: 'Completed', Priority: 'High', Value: 250, Date: '2024-01-18' },
  { id: 5, Status: 'In Progress', Priority: 'Critical', Value: -25, Date: '2024-01-22' }
];

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  rules,
  availableColumns,
  previewData,
  onDataChange
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Use default data if no preview data provided
  const data = useMemo(() => 
    previewData.length > 0 ? previewData : DEFAULT_PREVIEW_DATA,
    [previewData]
  );

  // Get columns from data
  const columns = useMemo(() => {
    if (data.length === 0) return availableColumns;
    
    const dataColumns = Object.keys(data[0])
      .filter(key => key !== 'id')
      .map(field => ({
        field,
        headerName: availableColumns.find(c => c.field === field)?.headerName || field,
        type: availableColumns.find(c => c.field === field)?.type || 'text'
      }));
    
    return dataColumns;
  }, [data, availableColumns]);

  // Apply rules to cell
  const getCellStyle = useCallback((value: any, columnField: string, rowData: any, rowIndex: number) => {
    let combinedStyle: React.CSSProperties = {};
    let combinedClasses: string[] = [];

    // Apply rules in priority order
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      try {
        // Evaluate expression
        const context = {
          value,
          row: rowData,
          column: columns.find(c => c.field === columnField),
          rowIndex
        };

        const result = evaluateExpression(rule.expression, context, columns);

        if (result === true) {
          // Apply formatting
          if (rule.formatting.style) {
            // For row scope, check if we should apply to this column
            if (rule.scope.target === 'row') {
              if (!rule.scope.applyToColumns || 
                  rule.scope.applyToColumns.length === 0 || 
                  rule.scope.applyToColumns.includes(columnField)) {
                combinedStyle = { ...combinedStyle, ...rule.formatting.style };
              }
            } else {
              // Cell scope - apply directly
              combinedStyle = { ...combinedStyle, ...rule.formatting.style };
            }
          }

          if (rule.formatting.cellClass) {
            const classes = Array.isArray(rule.formatting.cellClass) 
              ? rule.formatting.cellClass 
              : [rule.formatting.cellClass];
            combinedClasses.push(...classes);
          }
        }
      } catch (error) {
        console.error('Error evaluating rule:', rule.name, error);
      }
    }

    return {
      style: combinedStyle,
      className: combinedClasses.join(' ')
    };
  }, [rules, columns]);

  // Get row style for row-scoped rules
  const getRowStyle = useCallback((rowData: any, rowIndex: number) => {
    let combinedStyle: React.CSSProperties = {};

    const rowRules = rules.filter(r => r.enabled && r.scope.target === 'row' && r.scope.highlightEntireRow);
    const sortedRules = [...rowRules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      try {
        const context = {
          value: null,
          row: rowData,
          column: null,
          rowIndex
        };

        const result = evaluateExpression(rule.expression, context, columns);

        if (result === true && rule.formatting.style) {
          combinedStyle = { ...combinedStyle, ...rule.formatting.style };
        }
      } catch (error) {
        console.error('Error evaluating row rule:', rule.name, error);
      }
    }

    return combinedStyle;
  }, [rules, columns]);

  // Handle JSON import
  const handleJsonImport = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        onDataChange(parsed);
        setJsonError(null);
        setJsonInput('');
      } else {
        setJsonError('Data must be an array of objects');
      }
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  }, [jsonInput, onDataChange]);

  // Reset to default data
  const handleReset = useCallback(() => {
    onDataChange(DEFAULT_PREVIEW_DATA);
  }, [onDataChange]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium">Preview</h3>
            <p className="text-xs text-muted-foreground mt-1">
              See how your rules apply to sample data
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Data
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Rules are applied in priority order. Lower priority numbers are applied first.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Preview Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column.field}>
                        {column.headerName || column.field}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, rowIndex) => {
                    const rowStyle = getRowStyle(row, rowIndex);
                    return (
                      <TableRow key={row.id || rowIndex} style={rowStyle}>
                        {columns.map((column) => {
                          const cellValue = row[column.field];
                          const { style, className } = getCellStyle(cellValue, column.field, row, rowIndex);
                          return (
                            <TableCell 
                              key={column.field}
                              style={style}
                              className={className}
                            >
                              {cellValue?.toString() || ''}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Custom Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder={`Paste JSON array of objects, e.g.:
[
  {"Status": "Done", "Value": 100},
  {"Status": "Pending", "Value": -50}
]`}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={6}
              />
              {jsonError && (
                <Alert variant="destructive">
                  <AlertDescription>{jsonError}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleJsonImport}
                disabled={!jsonInput}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};