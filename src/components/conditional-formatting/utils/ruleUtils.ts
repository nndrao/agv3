import { ConditionalRule, ConditionalRuleTemplate } from '../types';

// Generate unique rule ID
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new rule with defaults
export function createNewRule(name?: string): ConditionalRule {
  return {
    id: generateRuleId(),
    name: name || 'New Rule',
    description: '',
    enabled: true,
    priority: 1,
    expression: '[value] > 0',
    formatting: {
      style: {
        backgroundColor: '#e3f2fd',
        color: '#1976d2'
      }
    },
    scope: {
      target: 'cell'
    }
  };
}

// Create rule from template
export function createRuleFromTemplate(template: ConditionalRuleTemplate): ConditionalRule {
  return {
    id: generateRuleId(),
    name: template.rule.name || template.name,
    description: template.description,
    enabled: true,
    priority: 1,
    expression: template.rule.expression || 'true',
    formatting: template.rule.formatting || {},
    scope: template.rule.scope || { target: 'cell' }
  };
}

// Duplicate an existing rule
export function duplicateRule(rule: ConditionalRule): ConditionalRule {
  return {
    ...rule,
    id: generateRuleId(),
    name: `${rule.name} (Copy)`,
    priority: rule.priority + 1
  };
}

// Sort rules by priority
export function sortRulesByPriority(rules: ConditionalRule[]): ConditionalRule[] {
  return [...rules].sort((a, b) => a.priority - b.priority);
}

// Update rule priorities after reordering
export function updateRulePriorities(rules: ConditionalRule[]): ConditionalRule[] {
  return rules.map((rule, index) => ({
    ...rule,
    priority: index + 1
  }));
}

// Move rule up or down in the list
export function moveRule(
  rules: ConditionalRule[],
  ruleId: string,
  direction: 'up' | 'down'
): ConditionalRule[] {
  const index = rules.findIndex(r => r.id === ruleId);
  if (index === -1) return rules;

  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= rules.length) return rules;

  const newRules = [...rules];
  [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
  
  // Update priorities
  return updateRulePriorities(newRules);
}

// Validate rule
export function validateRule(rule: ConditionalRule): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.name || rule.name.trim() === '') {
    errors.push('Rule name is required');
  }

  if (!rule.expression || rule.expression.trim() === '') {
    errors.push('Expression is required');
  }

  if (rule.priority < 1) {
    errors.push('Priority must be at least 1');
  }

  if (!rule.formatting || (!rule.formatting.style && !rule.formatting.cellClass && !rule.formatting.icon)) {
    errors.push('At least one formatting option must be specified');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export rules to JSON
export function exportRules(rules: ConditionalRule[]): string {
  return JSON.stringify(rules, null, 2);
}

// Import rules from JSON
export function importRules(json: string): ConditionalRule[] | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('Rules must be an array');
    }

    // Validate and create new IDs for imported rules
    return parsed.map(rule => ({
      ...rule,
      id: generateRuleId()
    }));
  } catch (error) {
    console.error('Error importing rules:', error);
    return null;
  }
}

// Apply rules to AG-Grid column definition
export function applyRulesToColumnDef(
  columnDef: any,
  rules: ConditionalRule[]
): any {
  const cellRules = rules.filter(r => r.enabled && r.scope.target === 'cell');
  
  if (cellRules.length === 0) {
    return columnDef;
  }

  return {
    ...columnDef,
    cellClass: (_params: any) => {
      const classes: string[] = [];
      const sortedRules = sortRulesByPriority(cellRules);

      for (const rule of sortedRules) {
        try {
          // This would need the actual evaluation logic
          // For now, just showing the structure
          if (rule.formatting.cellClass) {
            if (Array.isArray(rule.formatting.cellClass)) {
              classes.push(...rule.formatting.cellClass);
            } else {
              classes.push(rule.formatting.cellClass);
            }
          }
        } catch (error) {
          console.error('Error applying rule:', rule.name, error);
        }
      }

      return classes.join(' ');
    },
    cellStyle: (_params: any) => {
      let combinedStyle = {};
      const sortedRules = sortRulesByPriority(cellRules);

      for (const rule of sortedRules) {
        try {
          // This would need the actual evaluation logic
          // For now, just showing the structure
          if (rule.formatting.style) {
            combinedStyle = { ...combinedStyle, ...rule.formatting.style };
          }
        } catch (error) {
          console.error('Error applying rule:', rule.name, error);
        }
      }

      return combinedStyle;
    }
  };
}