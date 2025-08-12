import { ColDef } from 'ag-grid-community';
import { CSSProperties } from 'react';
import { 
  injectCssClass, 
  generateClassName,
  removeAllCssClasses,
  convertColumnReferences 
} from './runtimeCssManager';

/**
 * Enhanced Conditional Rules Runtime
 * Supports both metadata format and inline ternary expressions
 */

export interface EnhancedRuleMetadata {
  id: string;
  expression: string;
  type: 'metadata' | 'inline-ternary' | 'inline-style';
  styles?: CSSProperties;
  enabled?: boolean;
}

/**
 * Parse expressions to detect format type
 */
export function parseRuleExpression(expression: string): EnhancedRuleMetadata | null {
  const cleanExpression = expression.trim();
  
  // Check for metadata format
  const metadataMatch = cleanExpression.match(/\/\*\s*@rule-style\s+([\s\S]*?)\s*\*\/\s*([\s\S]+)/);
  if (metadataMatch) {
    try {
      const metadata = JSON.parse(metadataMatch[1]);
      return {
        id: metadata.id,
        expression: metadataMatch[2].trim(),
        type: 'metadata',
        styles: metadata.styles,
        enabled: true
      };
    } catch (error) {
      console.error('Failed to parse metadata:', error);
    }
  }
  
  // Check for inline ternary format: condition ? {...} : null
  const ternaryMatch = cleanExpression.match(/^(.+?)\s*\?\s*(\{[\s\S]+?\})\s*:\s*null$/);
  if (ternaryMatch) {
    const condition = ternaryMatch[1].trim();
    const styleObject = ternaryMatch[2];
    
    try {
      // Parse the style object
      // eslint-disable-next-line no-new-func
      const styles = new Function(`return ${styleObject}`)();
      
      return {
        id: `rule-inline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        expression: condition,
        type: 'inline-ternary',
        styles,
        enabled: true
      };
    } catch (error) {
      console.error('Failed to parse inline style object:', error);
    }
  }
  
  // Check for direct style object return
  if (cleanExpression.startsWith('{') && cleanExpression.endsWith('}')) {
    try {
      // eslint-disable-next-line no-new-func
      const styles = new Function(`return ${cleanExpression}`)();
      
      return {
        id: `rule-direct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        expression: 'true', // Always apply
        type: 'inline-style',
        styles,
        enabled: true
      };
    } catch (error) {
      console.error('Failed to parse direct style object:', error);
    }
  }
  
  return null;
}

/**
 * Build cellStyle function for inline styles
 */
export function buildCellStyleFunction(
  rules: EnhancedRuleMetadata[]
): ((params: any) => CSSProperties | null) | undefined {
  if (rules.length === 0) return undefined;
  
  return (params: any) => {
    // Evaluate each rule and merge styles
    let mergedStyles: CSSProperties = {};
    
    for (const rule of rules) {
      if (!rule.enabled || !rule.styles) continue;
      
      try {
        // Convert column references
        const expression = convertColumnReferences(rule.expression);
        
        // Create evaluation function
        // eslint-disable-next-line no-new-func
        const evalFunction = new Function('params', `
          try {
            const value = params.value;
            const data = params.data;
            const node = params.node;
            const colDef = params.colDef;
            const column = params.column;
            const rowIndex = params.rowIndex;
            
            return ${expression};
          } catch (e) {
            console.error('Error evaluating rule expression:', e);
            return false;
          }
        `);
        
        const result = evalFunction(params);
        
        if (result) {
          mergedStyles = { ...mergedStyles, ...rule.styles };
        }
      } catch (error) {
        console.error(`Failed to evaluate rule ${rule.id}:`, error);
      }
    }
    
    return Object.keys(mergedStyles).length > 0 ? mergedStyles : null;
  };
}

/**
 * Apply enhanced rules to columns
 * Supports both cellClassRules (CSS classes) and cellStyle (inline styles)
 */
export function applyEnhancedRulesToColumns(
  columnDefs: ColDef[],
  expressions: string[]
): ColDef[] {
  // Parse all expressions
  const rules = expressions
    .map(expr => parseRuleExpression(expr))
    .filter((rule): rule is EnhancedRuleMetadata => rule !== null);
  
  if (rules.length === 0) return columnDefs;
  
  // Separate rules by type
  const classRules = rules.filter(r => r.type === 'metadata');
  const inlineRules = rules.filter(r => r.type === 'inline-ternary' || r.type === 'inline-style');
  
  // Clear existing CSS classes
  removeAllCssClasses();
  
  return columnDefs.map(colDef => {
    const updatedColDef: ColDef = { ...colDef };
    
    // Apply class-based rules
    if (classRules.length > 0) {
      const cellClassRules: Record<string, (params: any) => boolean> = {};
      
      classRules.forEach(rule => {
        const className = generateClassName(rule.id);
        if (rule.styles) {
          injectCssClass(className, rule.styles);
        }
        
        try {
          const expression = convertColumnReferences(rule.expression);
          // eslint-disable-next-line no-new-func
          const evalFunction = new Function('params', `
            try {
              const value = params.value;
              const data = params.data;
              const node = params.node;
              const colDef = params.colDef;
              const column = params.column;
              const rowIndex = params.rowIndex;
              
              return ${expression};
            } catch (e) {
              console.error('Error evaluating rule expression:', e);
              return false;
            }
          `);
          
          cellClassRules[className] = evalFunction as (params: any) => boolean;
        } catch (error) {
          console.error(`Failed to create function for rule ${rule.id}:`, error);
        }
      });
      
      updatedColDef.cellClassRules = {
        ...colDef.cellClassRules,
        ...cellClassRules
      };
    }
    
    // Apply inline style rules
    if (inlineRules.length > 0) {
      const existingCellStyle = colDef.cellStyle;
      
      updatedColDef.cellStyle = (params: any) => {
        // Get existing styles if any
        let baseStyles: CSSProperties = {};
        if (typeof existingCellStyle === 'function') {
          baseStyles = existingCellStyle(params) || {};
        } else if (existingCellStyle) {
          baseStyles = existingCellStyle;
        }
        
        // Apply inline rules
        const inlineStyles = buildCellStyleFunction(inlineRules);
        const ruleStyles = inlineStyles ? inlineStyles(params) : null;
        
        // Merge styles
        return ruleStyles ? { ...baseStyles, ...ruleStyles } : baseStyles;
      };
    }
    
    return updatedColDef;
  });
}

/**
 * Example expressions that are supported
 */
export const EXAMPLE_EXPRESSIONS = [
  // Metadata format (from visual editor)
  `/* @rule-style {
  "id": "rule-pnl-positive",
  "styles": {
    "backgroundColor": "#10b981",
    "color": "#ffffff"
  }
} */
params.data.pnl > 0`,

  // Inline ternary format
  `[pnl] > 2000 ? { backgroundColor: '#3b82f6', color: '#ffffff' } : null`,
  
  // Multiple conditions with ternary
  `[status] === "Active" && [pnl] > 1000 ? { backgroundColor: '#10b981', fontWeight: 'bold' } : null`,
  
  // Nested ternary for multiple styles
  `[priority] === "Critical" ? { backgroundColor: '#ef4444', color: '#ffffff' } : 
   [priority] === "High" ? { backgroundColor: '#f97316', color: '#ffffff' } : 
   [priority] === "Medium" ? { backgroundColor: '#fbbf24', color: '#000000' } : null`,
  
  // Direct style object (always applied)
  `{ borderBottom: '1px solid #e5e7eb', padding: '8px' }`
];