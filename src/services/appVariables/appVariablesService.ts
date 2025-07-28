import { AppVariablesProvider } from '../../providers/AppVariablesProvider';
import { StorageClient } from '../storage/storageClient';
import { TemplateResolver } from '../template/templateResolver';

/**
 * Service to manage AppVariables providers
 * Loads and initializes all AppVariables datasources on startup
 */
export class AppVariablesService {
  private static initialized = false;
  
  /**
   * Initialize all AppVariables providers from storage
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[AppVariablesService] Already initialized');
      return;
    }
    
    console.log('[AppVariablesService] Initializing AppVariables providers...');
    
    try {
      // Query all variables datasources
      const configs = await StorageClient.query({
        componentType: 'datasource',
        componentSubType: 'variables',
        appId: 'agv3'
      });
      
      console.log(`[AppVariablesService] Found ${configs.length} AppVariables datasources`);
      
      // Create and register providers
      for (const config of configs) {
        try {
          const provider = new AppVariablesProvider({
            id: config.config.id,
            name: config.config.name,
            variables: config.config.variables || {}
          });
          
          // Register globally
          AppVariablesProvider.register(provider);
          
          // Start the provider
          await provider.start();
          
          // Sync variables with TemplateResolver
          Object.entries(config.config.variables || {}).forEach(([key, value]) => {
            TemplateResolver.setVariableValue(config.config.name, key, value);
          });
          
          console.log(`[AppVariablesService] Initialized provider: ${config.config.name} with ${Object.keys(config.config.variables || {}).length} variables`);
        } catch (error) {
          console.error(`[AppVariablesService] Failed to initialize provider ${config.name}:`, error);
        }
      }
      
      this.initialized = true;
      console.log('[AppVariablesService] Initialization complete');
      
    } catch (error) {
      console.error('[AppVariablesService] Failed to initialize:', error);
    }
  }
  
  /**
   * Get a variable value by datasource name and key
   */
  static getVariable(datasourceName: string, key: string): any {
    const provider = AppVariablesProvider.getProvider(datasourceName);
    if (!provider) {
      console.warn(`[AppVariablesService] Provider not found: ${datasourceName}`);
      return undefined;
    }
    
    return provider.getVariable(key);
  }
  
  /**
   * Set a variable value
   */
  static setVariable(datasourceName: string, key: string, value: any): void {
    const provider = AppVariablesProvider.getProvider(datasourceName);
    if (!provider) {
      console.warn(`[AppVariablesService] Provider not found: ${datasourceName}`);
      return;
    }
    
    provider.setVariable(key, value);
  }
  
  /**
   * Create a new AppVariables provider
   */
  static async createProvider(name: string, variables: Record<string, any> = {}): Promise<AppVariablesProvider> {
    const provider = new AppVariablesProvider({
      id: `appvars-${Date.now()}`,
      name,
      variables
    });
    
    // Register globally
    AppVariablesProvider.register(provider);
    
    // Start the provider
    await provider.start();
    
    // Sync variables with TemplateResolver
    Object.entries(variables).forEach(([key, value]) => {
      TemplateResolver.setVariableValue(name, key, value);
    });
    
    return provider;
  }
}