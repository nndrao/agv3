import { CSSProperties } from 'react';

/**
 * Runtime CSS Manager for dynamic class generation
 * Manages CSS classes that are generated at runtime from rule configurations
 */

// Store injected style elements for cleanup
const injectedStyles = new Map<string, HTMLStyleElement>();

/**
 * Convert React CSSProperties to CSS string
 */
function cssPropertiesToString(styles: CSSProperties): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value}`;
    })
    .join('; ');
}

/**
 * Generate a CSS class name from a rule ID
 */
export function generateClassName(ruleId: string): string {
  // Prefix with 'cr' (conditional rule) to ensure valid CSS class name
  // Replace any non-alphanumeric characters with hyphens
  const sanitized = ruleId.replace(/[^a-zA-Z0-9]/g, '-');
  return `cr-${sanitized}`;
}

/**
 * Inject CSS class into the document
 */
export function injectCssClass(className: string, styles: CSSProperties): void {
  // Remove existing style if it exists
  if (injectedStyles.has(className)) {
    const existingStyle = injectedStyles.get(className);
    existingStyle?.remove();
  }

  // Create new style element
  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-rule-class', className);
  
  // Convert CSSProperties to CSS string
  const cssString = cssPropertiesToString(styles);
  styleElement.textContent = `.${className} { ${cssString} }`;
  
  // Append to document head
  document.head.appendChild(styleElement);
  
  // Store reference for cleanup
  injectedStyles.set(className, styleElement);
}

/**
 * Remove an injected CSS class
 */
export function removeCssClass(className: string): void {
  const styleElement = injectedStyles.get(className);
  if (styleElement) {
    styleElement.remove();
    injectedStyles.delete(className);
  }
}

/**
 * Remove all injected CSS classes
 */
export function removeAllCssClasses(): void {
  injectedStyles.forEach((element) => {
    element.remove();
  });
  injectedStyles.clear();
}

/**
 * Generate and inject CSS for multiple rules
 */
export function injectRulesCss(rules: Array<{ id: string; styles: CSSProperties }>): Map<string, string> {
  const classNameMap = new Map<string, string>();
  
  rules.forEach(rule => {
    const className = generateClassName(rule.id);
    injectCssClass(className, rule.styles);
    classNameMap.set(rule.id, className);
  });
  
  return classNameMap;
}

/**
 * Build cellClassRules object for AG-Grid from rule metadata
 */
export interface RuleMetadata {
  id: string;
  expression: string;
  styles: CSSProperties;
  enabled?: boolean;
}

// AG-Grid params type
interface AgGridParams {
  value: unknown;
  data: Record<string, unknown>;
  node: unknown;
  colDef: unknown;
  column: unknown;
  rowIndex: number;
}

export function buildCellClassRules(
  rules: RuleMetadata[]
): Record<string, (params: AgGridParams) => boolean> {
  const cellClassRules: Record<string, (params: AgGridParams) => boolean> = {};
  
  rules.forEach(rule => {
    if (!rule.enabled && rule.enabled !== undefined) {
      return; // Skip disabled rules
    }
    
    const className = generateClassName(rule.id);
    
    // Inject the CSS for this rule
    injectCssClass(className, rule.styles);
    
    // Create the evaluation function
    // Use Function constructor to create function from expression string
    // The expression should reference 'params' object
    try {
      const evalFunction = new Function('params', `
        try {
          // Make common properties easily accessible
          const value = params.value;
          const data = params.data;
          const node = params.node;
          const colDef = params.colDef;
          const column = params.column;
          const rowIndex = params.rowIndex;
          
          // Evaluate the expression
          return ${rule.expression};
        } catch (e) {
          console.error('Error evaluating rule expression:', e);
          return false;
        }
      `);
      
      cellClassRules[className] = evalFunction as (params: AgGridParams) => boolean;
    } catch (error) {
      console.error(`Failed to create function for rule ${rule.id}:`, error);
    }
  });
  
  return cellClassRules;
}

/**
 * Parse style metadata from expression comments
 */
export function parseStyleMetadata(expression: string): { 
  expression: string; 
  metadata?: { id: string; styles: CSSProperties } 
} {
  // Look for style metadata in comments
  const metadataRegex = /\/\*\s*@rule-style\s+([\s\S]*?)\s*\*\//;
  const match = expression.match(metadataRegex);
  
  if (match) {
    try {
      const metadata = JSON.parse(match[1]);
      // Remove the metadata comment from the expression
      const cleanExpression = expression.replace(metadataRegex, '').trim();
      return {
        expression: cleanExpression,
        metadata
      };
    } catch (error) {
      console.error('Failed to parse style metadata:', error);
    }
  }
  
  return { expression };
}

/**
 * Format style metadata for insertion into editor
 */
export function formatStyleMetadata(id: string, styles: CSSProperties): string {
  const metadata = {
    id,
    styles
  };
  
  return `/* @rule-style ${JSON.stringify(metadata, null, 2)} */`;
}

/**
 * Convert column reference format from [column] to params.data.column
 */
export function convertColumnReferences(expression: string): string {
  // Replace [columnName] with params.data.columnName
  return expression.replace(/\[([^\]]+)\]/g, 'params.data.$1');
}

/**
 * Validate expression syntax
 */
export function validateExpression(expression: string): { 
  isValid: boolean; 
  error?: string 
} {
  try {
    // Try to create a function to validate syntax
    new Function('params', `return ${expression}`);
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Invalid expression'
    };
  }
}