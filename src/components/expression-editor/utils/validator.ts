import { 
  ValidationResult, 
  ValidationError, 
  ExpressionMode,
  CustomFunction,
  Variable
} from '../types';
import { ColumnDefinition } from '@/types';
import { FUNCTION_LIBRARY } from '../functions/functionLibrary';

interface ValidationContext {
  mode: ExpressionMode;
  columns: ColumnDefinition[];
  variables: Variable[];
  customFunctions: CustomFunction[];
}

export function validateExpression(
  expression: string, 
  context: ValidationContext
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const usedColumns: string[] = [];
  const usedFunctions: string[] = [];
  
  if (!expression.trim()) {
    return {
      isValid: false,
      errors: [{
        line: 1,
        column: 1,
        message: 'Expression cannot be empty',
        severity: 'error'
      }],
      warnings: [],
      usedColumns: [],
      usedFunctions: []
    };
  }

  // Extract column references [ColumnName]
  const columnPattern = /\[([^\]]+)\]/g;
  let match;
  while ((match = columnPattern.exec(expression)) !== null) {
    const columnName = match[1];
    usedColumns.push(columnName);
    
    // Check if column exists
    const columnExists = context.columns.some(col => 
      col.field === columnName || col.headerName === columnName
    );
    
    if (!columnExists) {
      errors.push({
        line: 1,
        column: match.index,
        message: `Column "${columnName}" not found`,
        severity: 'error',
        suggestion: `Available columns: ${context.columns.map(c => c.field).join(', ')}`
      });
    }
  }

  // Extract variable references ${varName}
  const variablePattern = /\$\{([^}]+)\}/g;
  while ((match = variablePattern.exec(expression)) !== null) {
    const varName = match[1];
    
    // Check if variable exists
    const varExists = context.variables.some(v => v.name === varName);
    
    if (!varExists) {
      errors.push({
        line: 1,
        column: match.index,
        message: `Variable "${varName}" not found`,
        severity: 'error',
        suggestion: context.variables.length > 0 
          ? `Available variables: ${context.variables.map(v => v.name).join(', ')}`
          : 'No variables are available in this context'
      });
    }
  }

  // Extract function calls
  const functionPattern = /([A-Z_]+)\s*\(/gi;
  while ((match = functionPattern.exec(expression)) !== null) {
    const funcName = match[1].toUpperCase();
    usedFunctions.push(funcName);
    
    // Check if function exists
    const funcExists = FUNCTION_LIBRARY[funcName] || 
      context.customFunctions.some(f => f.name.toUpperCase() === funcName);
    
    if (!funcExists) {
      errors.push({
        line: 1,
        column: match.index,
        message: `Function "${funcName}" not found`,
        severity: 'error',
        suggestion: 'Check function name and spelling'
      });
    }
  }

  // Check for unmatched parentheses
  const openParens = (expression.match(/\(/g) || []).length;
  const closeParens = (expression.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push({
      line: 1,
      column: 1,
      message: `Unmatched parentheses: ${openParens} opening, ${closeParens} closing`,
      severity: 'error'
    });
  }

  // Check for unmatched brackets
  const openBrackets = (expression.match(/\[/g) || []).length;
  const closeBrackets = (expression.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push({
      line: 1,
      column: 1,
      message: `Unmatched brackets: ${openBrackets} opening, ${closeBrackets} closing`,
      severity: 'error'
    });
  }

  // Check for unmatched quotes
  const singleQuotes = (expression.match(/'/g) || []).length;
  const doubleQuotes = (expression.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Unmatched single quotes',
      severity: 'error'
    });
  }
  if (doubleQuotes % 2 !== 0) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Unmatched double quotes',
      severity: 'error'
    });
  }

  // Mode-specific validation
  switch (context.mode) {
    case 'filter':
      // Filter expressions should return boolean
      if (!expression.match(/(<|>|=|!=|AND|OR|NOT|BETWEEN|IN|CONTAINS|TRUE|FALSE)/i)) {
        warnings.push({
          line: 1,
          column: 1,
          message: 'Filter expressions typically return boolean values',
          severity: 'warning',
          suggestion: 'Use comparison operators or logical functions'
        });
      }
      break;

    case 'conditional':
      // Conditional formatting should include style properties
      if (!expression.match(/(backgroundColor|color|fontWeight|border)/)) {
        warnings.push({
          line: 1,
          column: 1,
          message: 'Conditional formatting typically returns style objects',
          severity: 'warning',
          suggestion: 'Return an object with style properties like { backgroundColor: "#color" }'
        });
      }
      break;

    case 'validation':
      // Validation should return boolean
      if (!expression.match(/(true|false|AND|OR|NOT|<|>|=|!=)/i)) {
        warnings.push({
          line: 1,
          column: 1,
          message: 'Validation expressions should return true or false',
          severity: 'warning'
        });
      }
      break;
  }

  // Estimate complexity
  let complexity: 'low' | 'medium' | 'high' = 'low';
  const functionCount = usedFunctions.length;
  const nestedFunctions = (expression.match(/\w+\s*\([^)]*\w+\s*\(/g) || []).length;
  
  if (functionCount > 5 || nestedFunctions > 2) {
    complexity = 'high';
  } else if (functionCount > 2 || nestedFunctions > 0) {
    complexity = 'medium';
  }

  // Performance warnings
  if (complexity === 'high') {
    warnings.push({
      line: 1,
      column: 1,
      message: 'Complex expression may impact performance',
      severity: 'warning',
      suggestion: 'Consider simplifying or breaking into multiple columns'
    });
  }

  // Check for common mistakes
  if (expression.includes('==') && !expression.includes('===')) {
    warnings.push({
      line: 1,
      column: expression.indexOf('=='),
      message: 'Using == for comparison, consider using EQUALS() function',
      severity: 'info'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    usedColumns: [...new Set(usedColumns)],
    usedFunctions: [...new Set(usedFunctions)],
    estimatedComplexity: complexity,
    returnType: guessReturnType(expression, context.mode)
  };
}

function guessReturnType(expression: string, mode: ExpressionMode): string | undefined {
  // Mode-based defaults
  switch (mode) {
    case 'filter':
    case 'validation':
      return 'boolean';
    case 'conditional':
      return 'object';
  }

  // Expression-based guessing
  if (expression.match(/^\d+(\.\d+)?$/)) return 'number';
  if (expression.match(/^["'].*["']$/)) return 'string';
  if (expression.match(/^(true|false)$/i)) return 'boolean';
  if (expression.match(/\{.*\}/)) return 'object';
  if (expression.match(/\[.*\]/)) return 'array';
  
  // Function-based guessing
  const functionMatch = expression.match(/^([A-Z_]+)\s*\(/i);
  if (functionMatch) {
    const funcName = functionMatch[1].toUpperCase();
    const func = FUNCTION_LIBRARY[funcName];
    if (func) return func.returnType;
  }

  return undefined;
}