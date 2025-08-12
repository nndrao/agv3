import { ColDef, GridApi } from 'ag-grid-community';
import { CSSProperties } from 'react';

/**
 * Conditional Formatting Runtime
 * Manages dynamic CSS class generation and application for AG-Grid
 * Optimized for performance with large datasets
 */

// Store for managing CSS styles per grid instance
const gridStyleManagers = new Map<string, GridStyleManager>();

/**
 * Rule metadata structure
 */
export interface ConditionalFormattingRule {
  id: string;
  name: string;
  expression: string;
  styles?: CSSProperties;
  formatting?: {
    style?: CSSProperties;
  };
  scope: {
    target: 'cell' | 'row';
    applyToColumns?: string[]; // Specific columns for cell scope
  };
  priority: number;
  enabled: boolean;
}

/**
 * Manages styles for a specific grid instance
 */
class GridStyleManager {
  private instanceId: string;
  private styleElement: HTMLStyleElement | null = null;
  private rulesMap = new Map<string, ConditionalFormattingRule>();
  private classPrefix: string;

  constructor(instanceId: string) {
    this.instanceId = instanceId;
    // Create unique class prefix for this grid instance
    this.classPrefix = `ag-cf-${instanceId}`;
    this.initializeStyleElement();
  }

  private initializeStyleElement() {
    // Create a style element for this grid instance
    this.styleElement = document.createElement('style');
    this.styleElement.setAttribute('data-grid-instance', this.instanceId);
    this.styleElement.setAttribute('data-conditional-formatting', 'true');
    document.head.appendChild(this.styleElement);
  }

  /**
   * Generate CSS class name for a rule
   */
  generateClassName(ruleId: string): string {
    // Use prefix to ensure uniqueness per grid instance
    return `${this.classPrefix}-${ruleId.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  /**
   * Convert CSSProperties to CSS string
   */
  private cssPropertiesToString(styles: CSSProperties | undefined | null): string {
    if (!styles || typeof styles !== 'object') {
      return '';
    }
    
    return Object.entries(styles)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
      })
      .join('; ');
  }

  /**
   * Update CSS for all rules
   */
  updateStyles(rules: ConditionalFormattingRule[]) {
    console.log(`[GridStyleManager ${this.instanceId}] Updating styles for ${rules.length} rules`);
    
    if (!this.styleElement) {
      console.warn(`[GridStyleManager ${this.instanceId}] Style element not found`);
      return;
    }

    // Clear existing rules
    this.rulesMap.clear();

    // Generate CSS for all enabled rules
    const cssRules: string[] = [];

    rules.forEach(rule => {
      // Handle both formats: rule.styles and rule.formatting.style
      const styles = rule.styles || (rule.formatting as any)?.style;
      
      console.log(`[GridStyleManager ${this.instanceId}] Processing rule:`, {
        id: rule.id,
        enabled: rule.enabled,
        hasStyles: !!styles,
        styles: styles,
        scope: rule.scope
      });
      
      if (!rule.enabled) {
        console.log(`[GridStyleManager ${this.instanceId}] Skipping disabled rule: ${rule.id}`);
        return;
      }
      if (!styles) {
        console.log(`[GridStyleManager ${this.instanceId}] Skipping rule without styles: ${rule.id}`);
        return;
      }

      this.rulesMap.set(rule.id, rule);
      const className = this.generateClassName(rule.id);
      const cssString = this.cssPropertiesToString(styles);
      
      console.log(`[GridStyleManager ${this.instanceId}] Generated CSS for rule ${rule.id}:`, {
        className,
        cssString,
        cssStringLength: cssString.length
      });
      
      // Skip if no CSS to apply
      if (!cssString) {
        console.log(`[GridStyleManager ${this.instanceId}] No CSS string generated for rule: ${rule.id}`);
        return;
      }

      // For cell scope
      if (rule.scope.target === 'cell') {
        const cssRule = `.${className} { ${cssString} }`;
        cssRules.push(cssRule);
        console.log(`[GridStyleManager ${this.instanceId}] Added cell CSS rule:`, cssRule);
      }
      
      // For row scope - apply to all cells in the row
      if (rule.scope.target === 'row') {
        // Apply to all cells in a row with this class
        cssRules.push(`.${className} { ${cssString} }`);
        // Also ensure row-level styles cascade properly
        cssRules.push(`.ag-row.${className} .ag-cell { ${cssString} }`);
      }
    });

    // Update style element
    this.styleElement.textContent = cssRules.join('\n');
    console.log(`[GridStyleManager ${this.instanceId}] Injected ${cssRules.length} CSS rules`);
    if (cssRules.length > 0) {
      console.log(`[GridStyleManager ${this.instanceId}] CSS Preview:`, cssRules[0]);
    }
  }

  /**
   * Build cellClassRules for AG-Grid columns
   */
  buildCellClassRules(
    rules: ConditionalFormattingRule[],
    columnField?: string
  ): Record<string, (params: any) => boolean> {
    const cellClassRules: Record<string, (params: any) => boolean> = {};

    // Sort rules by priority (higher priority first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    sortedRules.forEach(rule => {
      if (!rule.enabled) return;

      // Check if rule applies to this column
      if (rule.scope.target === 'cell' && rule.scope.applyToColumns) {
        if (columnField && !rule.scope.applyToColumns.includes(columnField)) {
          return; // Skip if column not in target list
        }
      }

      const className = this.generateClassName(rule.id);

      // Create evaluation function
      try {
        // Convert column references [column] to params.data.column
        const processedExpression = rule.expression
          .replace(/\[([^\]]+)\]/g, 'params.data.$1');

        // Create safe evaluation function
        const evalFunction = new Function('params', `
          try {
            // Make common properties easily accessible
            const value = params.value;
            const data = params.data;
            const node = params.node;
            const colDef = params.colDef;
            const column = params.column;
            const rowIndex = params.rowIndex;
            const api = params.api;
            const context = params.context;
            
            // Evaluate the expression
            return ${processedExpression};
          } catch (e) {
            console.error('Error evaluating conditional formatting rule "${rule.name}":', e);
            return false;
          }
        `);

        cellClassRules[className] = evalFunction as (params: any) => boolean;
      } catch (error) {
        console.error(`Failed to create evaluation function for rule "${rule.name}":`, error);
      }
    });

    return cellClassRules;
  }

  /**
   * Build rowClassRules for AG-Grid
   */
  buildRowClassRules(
    rules: ConditionalFormattingRule[]
  ): Record<string, (params: any) => boolean> {
    const rowClassRules: Record<string, (params: any) => boolean> = {};

    // Filter for row-scoped rules
    const rowRules = rules.filter(r => r.scope.target === 'row' && r.enabled);

    // Sort by priority
    const sortedRules = [...rowRules].sort((a, b) => b.priority - a.priority);

    sortedRules.forEach(rule => {
      const className = this.generateClassName(rule.id);

      try {
        // Convert column references
        const processedExpression = rule.expression
          .replace(/\[([^\]]+)\]/g, 'params.data.$1');

        const evalFunction = new Function('params', `
          try {
            const data = params.data;
            const node = params.node;
            const rowIndex = params.rowIndex;
            const api = params.api;
            const context = params.context;
            
            return ${processedExpression};
          } catch (e) {
            console.error('Error evaluating row rule "${rule.name}":', e);
            return false;
          }
        `);

        rowClassRules[className] = evalFunction as (params: any) => boolean;
      } catch (error) {
        console.error(`Failed to create row evaluation function for rule "${rule.name}":`, error);
      }
    });

    return rowClassRules;
  }

  /**
   * Cleanup styles when grid is destroyed
   */
  destroy() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    this.rulesMap.clear();
  }
}

/**
 * Initialize conditional formatting for a grid instance
 */
export function initializeConditionalFormatting(
  gridInstanceId: string,
  rules: ConditionalFormattingRule[]
): GridStyleManager {
  // Clean up existing manager if present
  if (gridStyleManagers.has(gridInstanceId)) {
    gridStyleManagers.get(gridInstanceId)?.destroy();
  }

  // Create new manager
  const manager = new GridStyleManager(gridInstanceId);
  gridStyleManagers.set(gridInstanceId, manager);

  // Update styles
  manager.updateStyles(rules);

  return manager;
}

/**
 * Apply conditional formatting rules to column definitions
 */
export function applyConditionalFormattingToColumns(
  columnDefs: ColDef[],
  rules: ConditionalFormattingRule[],
  gridInstanceId: string
): ColDef[] {
  console.log(`[applyConditionalFormattingToColumns] Applying ${rules.length} rules to ${columnDefs.length} columns for grid ${gridInstanceId}`);
  
  // Initialize or get style manager
  let manager = gridStyleManagers.get(gridInstanceId);
  if (!manager) {
    console.log(`[applyConditionalFormattingToColumns] Creating new style manager for ${gridInstanceId}`);
    manager = initializeConditionalFormatting(gridInstanceId, rules);
  } else {
    // Update styles if manager exists
    console.log(`[applyConditionalFormattingToColumns] Updating existing style manager for ${gridInstanceId}`);
    manager.updateStyles(rules);
  }

  // Separate cell and row rules
  const cellRules = rules.filter(r => r.scope.target === 'cell');
  const rowRules = rules.filter(r => r.scope.target === 'row');
  console.log(`[applyConditionalFormattingToColumns] Cell rules: ${cellRules.length}, Row rules: ${rowRules.length}`);

  // Apply to columns
  return columnDefs.map(colDef => {
    // Get rules applicable to this column
    const columnRules = cellRules.filter(rule => {
      if (!rule.scope.applyToColumns || rule.scope.applyToColumns.length === 0) {
        return true; // Apply to all columns if not specified
      }
      return rule.scope.applyToColumns.includes(colDef.field || '');
    });

    // Build cellClassRules for this column
    const cellClassRules = manager.buildCellClassRules(columnRules, colDef.field);
    
    if (Object.keys(cellClassRules).length > 0) {
      console.log(`[applyConditionalFormattingToColumns] Adding ${Object.keys(cellClassRules).length} cellClassRules to column ${colDef.field}`);
    }

    // Merge with existing cellClassRules
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
 * Apply row-level conditional formatting
 */
export function getRowClassRules(
  rules: ConditionalFormattingRule[],
  gridInstanceId: string
): Record<string, (params: any) => boolean> {
  const manager = gridStyleManagers.get(gridInstanceId);
  if (!manager) {
    console.warn(`No style manager found for grid instance: ${gridInstanceId}`);
    return {};
  }

  return manager.buildRowClassRules(rules);
}

/**
 * Load rules from localStorage
 */
export function loadConditionalFormattingRules(): ConditionalFormattingRule[] {
  try {
    const stored = localStorage.getItem('conditionalFormattingRules');
    if (stored) {
      const rules = JSON.parse(stored);
      if (!Array.isArray(rules)) return [];
      
      // Filter out invalid rules and ensure required fields exist
      return rules.filter(rule => {
        // Basic validation
        if (!rule || typeof rule !== 'object') return false;
        if (!rule.id || !rule.name || !rule.expression) return false;
        
        // Ensure scope exists with defaults
        if (!rule.scope) {
          rule.scope = { target: 'cell', applyToColumns: [] };
        }
        
        // Normalize styles: handle both rule.styles and rule.formatting.style
        if (!rule.styles && rule.formatting?.style) {
          rule.styles = rule.formatting.style;
        }
        
        // Ensure styles exists as empty object if not present
        if (!rule.styles) {
          rule.styles = {};
        }
        
        // Ensure priority exists
        if (typeof rule.priority !== 'number') {
          rule.priority = 0;
        }
        
        // Ensure enabled exists
        if (typeof rule.enabled !== 'boolean') {
          rule.enabled = true;
        }
        
        return true;
      });
    }
  } catch (error) {
    console.error('Failed to load conditional formatting rules:', error);
  }
  return [];
}

/**
 * Save rules to localStorage
 */
export function saveConditionalFormattingRules(rules: ConditionalFormattingRule[]): void {
  try {
    localStorage.setItem('conditionalFormattingRules', JSON.stringify(rules));
  } catch (error) {
    console.error('Failed to save conditional formatting rules:', error);
  }
}

/**
 * Clean up conditional formatting for a grid instance
 */
export function cleanupConditionalFormatting(gridInstanceId: string): void {
  const manager = gridStyleManagers.get(gridInstanceId);
  if (manager) {
    manager.destroy();
    gridStyleManagers.delete(gridInstanceId);
  }
}

/**
 * Update rules for a specific grid instance
 */
export function updateConditionalFormattingRules(
  gridInstanceId: string,
  rules: ConditionalFormattingRule[]
): void {
  const manager = gridStyleManagers.get(gridInstanceId);
  if (manager) {
    manager.updateStyles(rules);
  } else {
    initializeConditionalFormatting(gridInstanceId, rules);
  }
}

/**
 * Performance optimization: Batch rule updates
 */
export function batchUpdateRules(
  gridInstanceId: string,
  updates: Array<{ ruleId: string; changes: Partial<ConditionalFormattingRule> }>,
  currentRules: ConditionalFormattingRule[]
): ConditionalFormattingRule[] {
  // Apply updates to rules
  const updatedRules = currentRules.map(rule => {
    const update = updates.find(u => u.ruleId === rule.id);
    if (update) {
      return { ...rule, ...update.changes };
    }
    return rule;
  });

  // Update styles
  updateConditionalFormattingRules(gridInstanceId, updatedRules);
  
  // Save to storage
  saveConditionalFormattingRules(updatedRules);

  return updatedRules;
}