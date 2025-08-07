// For now, we'll create a simple evaluator until the expression editor evaluator is available
// This will be replaced with: import { createExpressionEvaluator } from '@/components/expression-editor/utils/expressionEvaluator';

interface EvaluationContext {
  value: any;
  row: any;
  column: any;
  rowIndex: number;
  api?: any;
}

export function evaluateExpression(
  expression: string,
  context: EvaluationContext,
  availableColumns: Array<{ field: string; headerName?: string; type?: string }>
): boolean {
  try {
    // Create variables from context
    const variables: Record<string, any> = {
      value: context.value,
      row: context.row,
      column: context.column,
      rowIndex: context.rowIndex,
      api: context.api
    };

    // Add column values as variables
    if (context.row) {
      availableColumns.forEach(col => {
        variables[col.field] = context.row[col.field];
      });
    }

    // Simple expression evaluator - this will be replaced with the full evaluator
    // For now, handle basic expressions
    let evalExpression = expression;
    
    // Replace [value] references
    evalExpression = evalExpression.replace(/\[value\]/g, JSON.stringify(context.value));
    
    // Replace column references
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      evalExpression = evalExpression.replace(regex, JSON.stringify(variables[key]));
    });
    
    // Replace row.field references
    if (context.row) {
      Object.keys(context.row).forEach(field => {
        const regex = new RegExp(`\\[${field}\\]`, 'g');
        evalExpression = evalExpression.replace(regex, JSON.stringify(context.row[field]));
      });
    }
    
    // Basic function replacements
    evalExpression = evalExpression.replace(/ISNULL\((.*?)\)/g, '($1 === null || $1 === undefined)');
    evalExpression = evalExpression.replace(/CONTAINS\((.*?),\s*(.*?)\)/g, '($1.toString().includes($2))');
    
    // Evaluate the expression
    const func = new Function('return ' + evalExpression);
    const result = func();

    // Ensure result is boolean
    return Boolean(result);
  } catch (error) {
    console.error('Error evaluating conditional expression:', error);
    return false;
  }
}

// Helper function to validate if an expression returns a boolean
export function validateConditionalExpression(
  expression: string,
  sampleContext?: Partial<EvaluationContext>
): { isValid: boolean; error?: string } {
  try {
    const context: EvaluationContext = {
      value: sampleContext?.value ?? 100,
      row: sampleContext?.row ?? { id: 1, value: 100, status: 'Active' },
      column: sampleContext?.column ?? { field: 'value', headerName: 'Value' },
      rowIndex: sampleContext?.rowIndex ?? 0
    };

    const result = evaluateExpression(expression, context, []);
    
    // Check if result is boolean-like
    if (typeof result !== 'boolean') {
      return {
        isValid: false,
        error: 'Expression must return a boolean value (true/false)'
      };
    }

    return { isValid: true };
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message || 'Invalid expression'
    };
  }
}

// Get all variables used in an expression
export function extractVariablesFromExpression(expression: string): string[] {
  const variablePattern = /\[([^\]]+)\]/g;
  const variables = new Set<string>();
  let match;

  while ((match = variablePattern.exec(expression)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

// Replace column references with actual values for preview
export function replaceColumnReferences(
  expression: string,
  rowData: Record<string, any>
): string {
  return expression.replace(/\[([^\]]+)\]/g, (match, columnName) => {
    if (columnName in rowData) {
      const value = rowData[columnName];
      if (typeof value === 'string') {
        return `"${value}"`;
      }
      return String(value);
    }
    return match;
  });
}