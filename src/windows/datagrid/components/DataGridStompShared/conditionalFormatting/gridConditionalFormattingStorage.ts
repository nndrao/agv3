import { ConditionalFormattingRule } from '@/utils/conditionalFormattingRuntime';

/**
 * Configuration structure for conditional formatting rules storage
 */
interface ConditionalFormattingConfiguration {
  version: string;
  rules: ConditionalFormattingRule[];
  timestamp: number;
}

/**
 * Grid-level conditional formatting storage service
 * Manages conditional formatting rules that are shared across all profiles for a specific grid instance
 */
export class GridConditionalFormattingStorage {
  private static readonly STORAGE_KEY_PREFIX = 'grid_conditional_formatting_';
  
  /**
   * Get the storage key for a specific grid instance
   */
  private static getStorageKey(gridInstanceId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${gridInstanceId}`;
  }
  
  /**
   * Load all conditional formatting rules for a grid instance
   */
  static loadRules(gridInstanceId: string): ConditionalFormattingRule[] {
    try {
      const storageKey = this.getStorageKey(gridInstanceId);
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        console.log(`[GridConditionalFormattingStorage] No rules found for grid: ${gridInstanceId}`);
        return [];
      }
      
      const config: ConditionalFormattingConfiguration = JSON.parse(stored);
      console.log(`[GridConditionalFormattingStorage] Loaded ${config.rules.length} rules for grid: ${gridInstanceId}`);
      
      return config.rules || [];
    } catch (error) {
      console.error(`[GridConditionalFormattingStorage] Error loading rules for grid ${gridInstanceId}:`, error);
      return [];
    }
  }
  
  /**
   * Save all conditional formatting rules for a grid instance
   */
  static saveRules(gridInstanceId: string, rules: ConditionalFormattingRule[]): void {
    try {
      const config: ConditionalFormattingConfiguration = {
        version: '2.0.0', // Updated version for new architecture
        rules: rules,
        timestamp: Date.now()
      };
      
      const storageKey = this.getStorageKey(gridInstanceId);
      localStorage.setItem(storageKey, JSON.stringify(config, null, 2));
      
      console.log(`[GridConditionalFormattingStorage] Saved ${rules.length} rules for grid: ${gridInstanceId}`);
    } catch (error) {
      console.error(`[GridConditionalFormattingStorage] Error saving rules for grid ${gridInstanceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add or update a conditional formatting rule
   */
  static saveRule(gridInstanceId: string, rule: ConditionalFormattingRule): void {
    const existingRules = this.loadRules(gridInstanceId);
    const existingIndex = existingRules.findIndex(r => r.id === rule.id);
    
    const updatedRule = {
      ...rule,
      updatedAt: Date.now(),
      createdAt: rule.createdAt || Date.now()
    };
    
    if (existingIndex >= 0) {
      // Update existing rule
      existingRules[existingIndex] = updatedRule;
      console.log(`[GridConditionalFormattingStorage] Updated rule: ${rule.id}`);
    } else {
      // Add new rule
      existingRules.push(updatedRule);
      console.log(`[GridConditionalFormattingStorage] Added new rule: ${rule.id}`);
    }
    
    this.saveRules(gridInstanceId, existingRules);
  }
  
  /**
   * Delete a conditional formatting rule
   */
  static deleteRule(gridInstanceId: string, ruleId: string): void {
    const existingRules = this.loadRules(gridInstanceId);
    const filteredRules = existingRules.filter(r => r.id !== ruleId);
    
    if (filteredRules.length !== existingRules.length) {
      this.saveRules(gridInstanceId, filteredRules);
      console.log(`[GridConditionalFormattingStorage] Deleted rule: ${ruleId}`);
    } else {
      console.warn(`[GridConditionalFormattingStorage] Rule not found for deletion: ${ruleId}`);
    }
  }
  
  /**
   * Get a specific rule by ID
   */
  static getRule(gridInstanceId: string, ruleId: string): ConditionalFormattingRule | null {
    const rules = this.loadRules(gridInstanceId);
    return rules.find(r => r.id === ruleId) || null;
  }
  
  /**
   * Get multiple rules by IDs
   */
  static getRules(gridInstanceId: string, ruleIds: string[]): ConditionalFormattingRule[] {
    const allRules = this.loadRules(gridInstanceId);
    return ruleIds
      .map(id => allRules.find(r => r.id === id))
      .filter((rule): rule is ConditionalFormattingRule => rule !== undefined);
  }
  
  /**
   * Check if a rule exists
   */
  static hasRule(gridInstanceId: string, ruleId: string): boolean {
    return this.getRule(gridInstanceId, ruleId) !== null;
  }
  
  /**
   * Get all rule IDs
   */
  static getAllRuleIds(gridInstanceId: string): string[] {
    const rules = this.loadRules(gridInstanceId);
    return rules.map(r => r.id);
  }
  
  /**
   * Clear all rules for a grid instance
   */
  static clearRules(gridInstanceId: string): void {
    const storageKey = this.getStorageKey(gridInstanceId);
    localStorage.removeItem(storageKey);
    console.log(`[GridConditionalFormattingStorage] Cleared all rules for grid: ${gridInstanceId}`);
  }
  
  /**
   * Migrate old global rules to grid-level storage
   */
  static migrateFromGlobalRules(
    gridInstanceId: string, 
    globalRules: ConditionalFormattingRule[]
  ): string[] {
    if (!globalRules || globalRules.length === 0) {
      return [];
    }
    
    console.log(`[GridConditionalFormattingStorage] Migrating ${globalRules.length} rules from global to grid level`);
    
    const existingRules = this.loadRules(gridInstanceId);
    const migratedRuleIds: string[] = [];
    
    globalRules.forEach(globalRule => {
      // Ensure rule has an ID and timestamps
      const migratedRule: ConditionalFormattingRule = {
        ...globalRule,
        id: globalRule.id || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: globalRule.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      
      // Check if rule already exists (avoid duplicates)
      if (!existingRules.find(r => r.id === migratedRule.id)) {
        existingRules.push(migratedRule);
        migratedRuleIds.push(migratedRule.id);
      } else {
        // Rule already exists, just add to active list
        migratedRuleIds.push(migratedRule.id);
      }
    });
    
    if (migratedRuleIds.length > 0) {
      this.saveRules(gridInstanceId, existingRules);
      console.log(`[GridConditionalFormattingStorage] Migration complete. Migrated rule IDs:`, migratedRuleIds);
    }
    
    return migratedRuleIds;
  }
}