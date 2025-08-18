import { ColDef } from 'ag-grid-community';
import { 
  RuleMetadata, 
  buildCellClassRules, 
  removeAllCssClasses,
  convertColumnReferences 
} from './runtimeCssManager';

/**
 * Conditional Rules Runtime
 * Manages the application of conditional formatting rules to AG-Grid columns at runtime
 */

// Store active rules for management
let activeRules: RuleMetadata[] = [];

/**
 * Load rules from configuration
 * This would typically load from localStorage, API, or config file
 */
export function loadRulesFromConfig(): RuleMetadata[] {
  try {
    // Try to load from localStorage first
    const stored = localStorage.getItem('conditionalFormattingRules');
    if (stored) {
      const rules = JSON.parse(stored);
      return Array.isArray(rules) ? rules : [];
    }
  } catch (error) {
    console.error('Failed to load rules from storage:', error);
  }
  
  // Return empty array if no rules found
  return [];
}

/**
 * Save rules to configuration
 */
export function saveRulesToConfig(rules: RuleMetadata[]): void {
  try {
    localStorage.setItem('conditionalFormattingRules', JSON.stringify(rules));
  } catch (error) {
    console.error('Failed to save rules to storage:', error);
  }
}

/**
 * Apply conditional formatting rules to column definitions
 */
export function applyRulesToColumns(
  columnDefs: ColDef[],
  rules: RuleMetadata[]
): ColDef[] {
  // Clear any existing CSS classes
  removeAllCssClasses();
  
  // Store active rules
  activeRules = rules;
  
  // Build global rules list
  const globalRules: RuleMetadata[] = [];
  
  rules.forEach(rule => {
    // Convert column references in expression
    rule.expression = convertColumnReferences(rule.expression);
    
    // For now, treat all rules as global
    // In future, could parse expression to determine target columns
    globalRules.push(rule);
  });
  
  // Apply rules to columns
  return columnDefs.map(colDef => {
    const columnRules = [...globalRules];
    
    if (columnRules.length === 0) {
      return colDef;
    }
    
    // Build cellClassRules for this column
    const cellClassRules = buildCellClassRules(columnRules);
    
    return {
      ...colDef,
      cellClassRules: {
        ...colDef.cellClassRules,
        ...cellClassRules
      }
    };
  });
}

/**
 * Add a new rule at runtime
 */
export function addRule(rule: RuleMetadata): void {
  activeRules.push(rule);
  saveRulesToConfig(activeRules);
}

/**
 * Update an existing rule
 */
export function updateRule(ruleId: string, updates: Partial<RuleMetadata>): void {
  const index = activeRules.findIndex(r => r.id === ruleId);
  if (index !== -1) {
    activeRules[index] = { ...activeRules[index], ...updates };
    saveRulesToConfig(activeRules);
  }
}

/**
 * Remove a rule
 */
export function removeRule(ruleId: string): void {
  activeRules = activeRules.filter(r => r.id !== ruleId);
  saveRulesToConfig(activeRules);
}

/**
 * Get all active rules
 */
export function getActiveRules(): RuleMetadata[] {
  return [...activeRules];
}

/**
 * Clear all rules
 */
export function clearAllRules(): void {
  activeRules = [];
  removeAllCssClasses();
  saveRulesToConfig([]);
}

/**
 * Export rules to JSON
 */
export function exportRules(): string {
  return JSON.stringify(activeRules, null, 2);
}

/**
 * Import rules from JSON
 */
export function importRules(json: string): boolean {
  try {
    const rules = JSON.parse(json);
    if (!Array.isArray(rules)) {
      throw new Error('Rules must be an array');
    }
    
    // Validate each rule
    rules.forEach(rule => {
      if (!rule.id || !rule.expression || !rule.styles) {
        throw new Error('Invalid rule format');
      }
    });
    
    activeRules = rules;
    saveRulesToConfig(activeRules);
    return true;
  } catch (error) {
    console.error('Failed to import rules:', error);
    return false;
  }
}

/**
 * Create a rule from an expression and styles
 */
export function createRuleFromExpression(
  expression: string,
  styles: React.CSSProperties,
  id?: string
): RuleMetadata {
  return {
    id: id || `rule-${Date.now()}`,
    expression,
    styles,
    enabled: true
  };
}

/**
 * Parse expressions from Monaco editor content
 * Looks for expressions with style metadata comments
 */
export function parseExpressionsFromEditor(content: string): RuleMetadata[] {
  const rules: RuleMetadata[] = [];
  
  // Regular expression to find style metadata and following expression
  const ruleRegex = /\/\*\s*@rule-style\s+([\s\S]*?)\s*\*\/\s*([^\n]+)/g;
  
  let match;
  while ((match = ruleRegex.exec(content)) !== null) {
    try {
      const metadata = JSON.parse(match[1]);
      const expression = match[2].trim();
      
      if (metadata.id && metadata.styles && expression) {
        rules.push({
          id: metadata.id,
          expression,
          styles: metadata.styles,
          enabled: true
        });
      }
    } catch (error) {
      console.error('Failed to parse rule from editor:', error);
    }
  }
  
  return rules;
}

/**
 * Format rules for display in Monaco editor
 */
export function formatRulesForEditor(rules: RuleMetadata[]): string {
  return rules.map(rule => {
    const metadata = {
      id: rule.id,
      styles: rule.styles
    };
    
    return `/* @rule-style ${JSON.stringify(metadata, null, 2)} */\n${rule.expression}`;
  }).join('\n\n');
}