import { EventEmitter } from 'events';
import { TemplateResolver } from '../services/template/templateResolver';

export interface AppVariablesConfig {
  id: string;
  name: string;
  variables: Record<string, any>;
}

/**
 * AppVariables Provider - A special datasource that stores global variables
 * These variables can be used in template resolution for other datasources
 */
export class AppVariablesProvider extends EventEmitter {
  private config: AppVariablesConfig;
  private storageKey: string;
  
  constructor(config: AppVariablesConfig) {
    super();
    this.config = config;
    this.storageKey = `agv3_variables_${config.name}`;
    
    // Load existing variables from storage
    this.loadVariables();
  }
  
  /**
   * Get the provider type
   */
  get type(): string {
    return 'variables';
  }
  
  /**
   * Get the provider ID
   */
  get id(): string {
    return this.config.id;
  }
  
  /**
   * Get the provider name
   */
  get name(): string {
    return this.config.name;
  }
  
  /**
   * Load variables from localStorage
   */
  private loadVariables(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const variables = JSON.parse(stored);
        this.config.variables = { ...this.config.variables, ...variables };
      }
    } catch (error) {
      console.error('[AppVariablesProvider] Error loading variables:', error);
    }
  }
  
  /**
   * Save variables to localStorage
   */
  private saveVariables(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config.variables));
      
      // Emit event so other components know variables changed
      this.emit('variablesChanged', this.config.variables);
    } catch (error) {
      console.error('[AppVariablesProvider] Error saving variables:', error);
    }
  }
  
  /**
   * Get a variable value
   */
  getVariable(key: string): any {
    return this.config.variables[key];
  }
  
  /**
   * Get all variables
   */
  getAllVariables(): Record<string, any> {
    return { ...this.config.variables };
  }
  
  /**
   * Set a variable value
   */
  setVariable(key: string, value: any): void {
    this.config.variables[key] = value;
    this.saveVariables();
    
    // Update the TemplateResolver's static storage
    TemplateResolver.setVariableValue(this.config.name, key, value);
  }
  
  /**
   * Set multiple variables at once
   */
  setVariables(variables: Record<string, any>): void {
    this.config.variables = { ...this.config.variables, ...variables };
    this.saveVariables();
    
    // Update the TemplateResolver's static storage
    Object.entries(variables).forEach(([key, value]) => {
      TemplateResolver.setVariableValue(this.config.name, key, value);
    });
  }
  
  /**
   * Delete a variable
   */
  deleteVariable(key: string): void {
    delete this.config.variables[key];
    this.saveVariables();
  }
  
  /**
   * Clear all variables
   */
  clearVariables(): void {
    this.config.variables = {};
    this.saveVariables();
  }
  
  /**
   * Check if connected (always true for variables provider)
   */
  get isConnected(): boolean {
    return true;
  }
  
  /**
   * Start the provider (no-op for variables)
   */
  async start(): Promise<void> {
    console.log(`[AppVariablesProvider] Started provider: ${this.config.name}`);
    this.emit('started');
  }
  
  /**
   * Stop the provider (no-op for variables)
   */
  async stop(): Promise<void> {
    console.log(`[AppVariablesProvider] Stopped provider: ${this.config.name}`);
    this.emit('stopped');
  }
  
  /**
   * Get statistics
   */
  getStatistics(): any {
    return {
      type: 'variables',
      variableCount: Object.keys(this.config.variables).length,
      variables: this.config.variables
    };
  }
  
  /**
   * Export configuration
   */
  exportConfig(): AppVariablesConfig {
    return {
      id: this.config.id,
      name: this.config.name,
      variables: { ...this.config.variables }
    };
  }
  
  /**
   * Static registry of all AppVariables providers
   */
  private static providers: Map<string, AppVariablesProvider> = new Map();
  
  /**
   * Register a provider globally
   */
  static register(provider: AppVariablesProvider): void {
    AppVariablesProvider.providers.set(provider.name, provider);
  }
  
  /**
   * Get a provider by name
   */
  static getProvider(name: string): AppVariablesProvider | undefined {
    return AppVariablesProvider.providers.get(name);
  }
  
  /**
   * Get all registered providers
   */
  static getAllProviders(): AppVariablesProvider[] {
    return Array.from(AppVariablesProvider.providers.values());
  }
}