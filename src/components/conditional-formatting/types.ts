import { CSSProperties } from 'react';

export interface ConditionalRule {
  // Rule Identity
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number; // Execution order (lower numbers execute first)
  
  // Condition Expression
  expression: string; // Expression that evaluates to boolean
  
  // Formatting Actions
  formatting: {
    // Style formatting
    style?: CSSProperties;
    
    // Class-based formatting
    cellClass?: string | string[];
    
    // Icon/Badge
    icon?: {
      name: string;
      position: 'start' | 'end';
      color?: string;
    };
    
    // Value transformation
    valueTransform?: {
      type: 'prefix' | 'suffix' | 'replace' | 'custom';
      value?: string;
      functionBody?: string;
    };
  };
  
  // Scope
  scope: {
    target: 'cell' | 'row';
    applyToColumns?: string[]; // For row scope - which columns to apply style to
    highlightEntireRow?: boolean;
  };
}

export interface ConditionalFormattingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId?: string;
  columnName?: string;
  columnType?: string;
  availableColumns: Array<{
    field: string;
    headerName?: string;
    type?: string;
  }>;
  rules: ConditionalRule[];
  onApply: (rules: ConditionalRule[]) => void;
  onCancel?: () => void;
}

export interface ConditionalFormattingConfig {
  maxRules?: number;
  defaultStyle?: CSSProperties;
  templates?: ConditionalRuleTemplate[];
}

export interface ConditionalRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'value' | 'range' | 'text' | 'date' | 'custom';
  rule: Partial<ConditionalRule>;
  icon?: string;
}