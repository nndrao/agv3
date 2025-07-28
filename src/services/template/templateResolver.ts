import { v4 as uuidv4 } from 'uuid';

/**
 * Service for resolving template variables in strings
 * Supports two types of templates:
 * 1. [variable] - replaced with variable-UUID
 * 2. {datasource.variable} - replaced with value from datasource
 */
export class TemplateResolver {
  private static instance: TemplateResolver;
  private uuidCache: Map<string, string> = new Map();
  
  private constructor() {}
  
  static getInstance(): TemplateResolver {
    if (!TemplateResolver.instance) {
      TemplateResolver.instance = new TemplateResolver();
    }
    return TemplateResolver.instance;
  }
  
  /**
   * Resolve all template variables in a string
   */
  resolveTemplate(template: string, sessionId?: string): string {
    if (!template) return template;
    
    // First resolve square brackets (UUID variables)
    let resolved = this.resolveSquareBrackets(template, sessionId);
    
    // Then resolve curly brackets (datasource variables)
    resolved = this.resolveCurlyBrackets(resolved);
    
    return resolved;
  }
  
  /**
   * Resolve square bracket variables: [variable] → variable-UUID
   * If sessionId is provided, uses consistent UUIDs for the session
   */
  resolveSquareBrackets(template: string, sessionId?: string): string {
    return template.replace(/\[([^\]]+)\]/g, (match, variable) => {
      const cacheKey = sessionId ? `${sessionId}:${variable}` : variable;
      
      // Check if we already have a UUID for this variable in this session
      if (sessionId && this.uuidCache.has(cacheKey)) {
        return this.uuidCache.get(cacheKey)!;
      }
      
      // Generate new UUID
      const uuid = uuidv4();
      const resolved = `${variable}-${uuid}`;
      
      // Cache it if session-based
      if (sessionId) {
        this.uuidCache.set(cacheKey, resolved);
      }
      
      return resolved;
    });
  }
  
  /**
   * Resolve curly bracket variables: {datasource.variable} → value
   */
  resolveCurlyBrackets(template: string): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      try {
        // Parse the path (e.g., "AppVariables.ds.ConnectionString")
        const parts = path.split('.');
        
        if (parts.length < 3) {
          console.warn(`Invalid variable path: ${path}`);
          return match; // Return unchanged if invalid format
        }
        
        const datasourceName = parts.slice(0, 2).join('.'); // "AppVariables.ds"
        const variableName = parts.slice(2).join('.'); // "ConnectionString" or nested paths
        
        // Get the value from AppVariables provider
        const value = this.getVariableValue(datasourceName, variableName);
        
        return value !== undefined ? String(value) : match;
      } catch (error) {
        console.error(`Error resolving variable ${path}:`, error);
        return match; // Return unchanged on error
      }
    });
  }
  
  /**
   * Get variable value from a datasource
   * This will be implemented to work with AppVariables provider
   */
  private getVariableValue(datasourceName: string, variableName: string): any {
    // For now, check localStorage for persisted variables
    const storageKey = `agv3_variables_${datasourceName}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const variables = JSON.parse(stored);
        return variables[variableName];
      }
    } catch (error) {
      console.error(`Error reading variables from ${datasourceName}:`, error);
    }
    
    return undefined;
  }
  
  /**
   * Clear UUID cache for a session
   */
  clearSession(sessionId: string): void {
    const keysToDelete: string[] = [];
    
    this.uuidCache.forEach((value, key) => {
      if (key.startsWith(`${sessionId}:`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.uuidCache.delete(key));
  }
  
  /**
   * Set a variable value (for AppVariables provider to use)
   */
  static setVariableValue(datasourceName: string, variableName: string, value: any): void {
    const storageKey = `agv3_variables_${datasourceName}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      const variables = stored ? JSON.parse(stored) : {};
      
      variables[variableName] = value;
      
      localStorage.setItem(storageKey, JSON.stringify(variables));
    } catch (error) {
      console.error(`Error setting variable ${variableName} in ${datasourceName}:`, error);
    }
  }
  
  /**
   * Get all variables for a datasource
   */
  static getVariables(datasourceName: string): Record<string, any> {
    const storageKey = `agv3_variables_${datasourceName}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error(`Error reading variables from ${datasourceName}:`, error);
      return {};
    }
  }
}

// Export singleton instance
export const templateResolver = TemplateResolver.getInstance();