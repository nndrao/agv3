// Expression Editor Types

export type ExpressionMode = 'conditional' | 'calculation' | 'filter' | 'validation';

export interface ColumnDefinition {
  field: string;
  headerName: string;
  type: string;
}

export interface ExpressionEditorProps {
  // Editor configuration
  mode: ExpressionMode;
  initialExpression?: string;
  height?: number | string;
  
  // Context
  availableColumns: ColumnDefinition[];
  availableVariables?: Variable[];
  customFunctions?: CustomFunction[];
  
  // Callbacks
  onChange: (expression: string, isValid: boolean) => void;
  onValidate?: (expression: string) => ValidationResult;
  onExecute?: (expression: string, context?: any) => any;
  
  // UI Options
  showPreview?: boolean;
  showHistory?: boolean;
  showFunctionLibrary?: boolean;
  readOnly?: boolean;
}

export interface Variable {
  name: string;
  value: any;
  type: DataType;
  description?: string;
  category?: string;
}

export interface CustomFunction {
  name: string;
  signature: string;
  description: string;
  category: string;
  implementation: (...args: any[]) => any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  returnType?: DataType;
  usedColumns: string[];
  usedFunctions: string[];
  estimatedComplexity?: 'low' | 'medium' | 'high';
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  quickFix?: QuickFix;
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning';
}

export interface QuickFix {
  label: string;
  fix: () => string;
}

export type DataType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'array' 
  | 'object' 
  | 'any' 
  | 'void';

export interface FunctionDefinition {
  name: string;
  category: FunctionCategory;
  signature: string;
  description: string;
  parameters: ParameterDefinition[];
  returnType: DataType;
  examples: Example[];
  aliases?: string[];
  deprecated?: boolean;
  replacedBy?: string;
}

export interface ParameterDefinition {
  name: string;
  type: DataType | DataType[];
  description: string;
  optional?: boolean;
  defaultValue?: any;
  validator?: (value: any) => boolean;
}

export interface Example {
  expression: string;
  result: any;
  description?: string;
}

export type FunctionCategory = 
  | 'math'
  | 'statistical'
  | 'string'
  | 'date'
  | 'aggregation'
  | 'logical'
  | 'conversion'
  | 'custom';

export interface ExpressionContext {
  row?: Record<string, any>;
  columns?: ColumnDefinition[];
  variables?: Record<string, any>;
  functions?: Record<string, Function>;
}

export interface SyntaxToken {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

export type TokenType = 
  | 'keyword'
  | 'identifier'
  | 'operator'
  | 'number'
  | 'string'
  | 'boolean'
  | 'null'
  | 'punctuation'
  | 'function'
  | 'column'
  | 'variable'
  | 'comment';

export interface AutoCompleteItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText: string;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
}

export enum CompletionItemKind {
  Function = 'function',
  Variable = 'variable',
  Column = 'column',
  Keyword = 'keyword',
  Operator = 'operator',
  Constant = 'constant',
  Snippet = 'snippet'
}

export interface ExpressionHistory {
  id: string;
  expression: string;
  timestamp: Date;
  mode: ExpressionMode;
  isValid: boolean;
  description?: string;
}

export interface EditorTheme {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: TokenThemeRule[];
  colors: Record<string, string>;
}

export interface TokenThemeRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}