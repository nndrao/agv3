// Expression Editor Types

export type ExpressionMode = 'conditional' | 'calculation' | 'filter' | 'validation';

export interface Variable {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description?: string;
  category?: string;
}

export interface ColumnDefinition {
  field: string;
  headerName: string;
  type: string;
}

export interface CustomFunction {
  name: string;
  signature: string;
  description: string;
  category: string;
}

export interface ValidationError {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
  quickFix?: {
    label: string;
    fix: () => void;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions?: string[];
  returnType?: string;
  estimatedComplexity?: 'low' | 'medium' | 'high';
  usedColumns: string[];
  usedFunctions: string[];
}

export interface ExpressionEditorProps {
  mode: ExpressionMode;
  initialExpression?: string;
  height?: number | string;
  availableColumns: ColumnDefinition[];
  availableVariables?: Variable[];
  customFunctions?: CustomFunction[];
  onChange: (expression: string, isValid: boolean) => void;
  onValidate?: (expression: string) => ValidationResult;
  onExecute?: (expression: string) => Promise<any>;
  showPreview?: boolean;
  showHistory?: boolean;
  showFunctionLibrary?: boolean;
  readOnly?: boolean;
  id?: string;
  disableResize?: boolean;
}

export interface FunctionDefinition {
  name: string;
  category: string;
  signature: string;
  description: string;
  examples?: string[] | { expression: string; result: any }[];
  parameters?: { name: string; type: string; description: string }[];
  returnType?: string;
}

export interface ExpressionHistory {
  id?: string;
  expression: string;
  mode: ExpressionMode;
  timestamp: number;
  isValid?: boolean;
  description?: string;
}

export interface ExpressionExample {
  title: string;
  description: string;
  expression: string;
  mode: ExpressionMode;
}