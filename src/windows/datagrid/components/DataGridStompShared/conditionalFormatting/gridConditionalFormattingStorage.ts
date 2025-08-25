import { ConditionalFormattingRule } from '@/utils/conditionalFormattingRuntime';
import { GridConfigurationStorage } from '../storage/GridConfigurationStorage';

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
 * Now uses the centralized Configuration Service via GridConfigurationStorage
 */
export class GridConditionalFormattingStorage extends GridConfigurationStorage {
  private static readonly CONFIG_TYPE = 'conditional_formatting';
  
  /**
   * Load all conditional formatting rules for a grid instance
   */
  static async loadRules(gridInstanceId: string): Promise<ConditionalFormattingRule[]> {
    const config = await this.loadConfig<ConditionalFormattingConfiguration>(
      gridInstanceId,
      this.CONFIG_TYPE,
      { version: '2.0.0', rules: [], timestamp: Date.now() }
    );
    
    console.log(`[GridConditionalFormattingStorage] Loaded ${config.rules.length} rules for grid: ${gridInstanceId}`);
    return config.rules || [];
  }
  
  /**
   * Save all conditional formatting rules for a grid instance
   */
  static async saveRules(gridInstanceId: string, rules: ConditionalFormattingRule[]): Promise<void> {
    const config: ConditionalFormattingConfiguration = {
      version: '2.0.0',
      rules: rules,
      timestamp: Date.now()
    };
    
    await this.saveConfig(
      gridInstanceId,
      this.CONFIG_TYPE,
      config,
      `Conditional Formatting Rules for ${gridInstanceId}`
    );
    
    console.log(`[GridConditionalFormattingStorage] Saved ${rules.length} rules for grid: ${gridInstanceId}`);
  }
  
  /**
   * Add or update a conditional formatting rule
   */
  static async saveRule(gridInstanceId: string, rule: ConditionalFormattingRule): Promise<void> {
    const existingRules = await this.loadRules(gridInstanceId);
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
    
    await this.saveRules(gridInstanceId, existingRules);
  }
  
  /**
   * Delete a conditional formatting rule
   */
  static async deleteRule(gridInstanceId: string, ruleId: string): Promise<void> {
    const existingRules = await this.loadRules(gridInstanceId);
    const filteredRules = existingRules.filter(r => r.id !== ruleId);
    
    if (filteredRules.length !== existingRules.length) {
      await this.saveRules(gridInstanceId, filteredRules);
      console.log(`[GridConditionalFormattingStorage] Deleted rule: ${ruleId}`);
    } else {
      console.warn(`[GridConditionalFormattingStorage] Rule not found for deletion: ${ruleId}`);
    }
  }
  
  /**
   * Get a specific rule by ID
   */
  static async getRule(gridInstanceId: string, ruleId: string): Promise<ConditionalFormattingRule | null> {
    const rules = await this.loadRules(gridInstanceId);
    return rules.find(r => r.id === ruleId) || null;
  }
  
  /**
   * Get multiple rules by IDs
   */
  static async getRules(gridInstanceId: string, ruleIds: string[]): Promise<ConditionalFormattingRule[]> {
    const allRules = await this.loadRules(gridInstanceId);
    return ruleIds
      .map(id => allRules.find(r => r.id === id))
      .filter((rule): rule is ConditionalFormattingRule => rule !== undefined);
  }
  
  /**
   * Check if a rule exists
   */
  static async hasRule(gridInstanceId: string, ruleId: string): Promise<boolean> {
    const rule = await this.getRule(gridInstanceId, ruleId);
    return rule !== null;
  }
  
  /**
   * Get all rule IDs
   */
  static async getAllRuleIds(gridInstanceId: string): Promise<string[]> {
    const rules = await this.loadRules(gridInstanceId);
    return rules.map(r => r.id);
  }
  
  /**
   * Clear all rules for a grid instance
   */
  static async clearRules(gridInstanceId: string): Promise<void> {
    await this.deleteConfig(gridInstanceId, this.CONFIG_TYPE);
    console.log(`[GridConditionalFormattingStorage] Cleared all rules for grid: ${gridInstanceId}`);
  }
  
  /**
   * Migrate old global rules to grid-level storage
   */
  static async migrateFromGlobalRules(
    gridInstanceId: string, 
    globalRules: ConditionalFormattingRule[]
  ): Promise<string[]> {
    if (!globalRules || globalRules.length === 0) {
      return [];
    }
    
    console.log(`[GridConditionalFormattingStorage] Migrating ${globalRules.length} rules from global to grid level`);
    
    const existingRules = await this.loadRules(gridInstanceId);
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
      await this.saveRules(gridInstanceId, existingRules);
      console.log(`[GridConditionalFormattingStorage] Migration complete. Migrated rule IDs:`, migratedRuleIds);
    }
    
    return migratedRuleIds;
  }
}