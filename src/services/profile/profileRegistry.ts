/**
 * Profile Registry - Maps view instances to profile storage
 * This allows profiles to persist even when view IDs change
 */

interface ViewMapping {
  viewType: string;
  viewName: string;
  profileStorageId: string;
  createdAt: string;
  lastAccessed: string;
}

export class ProfileRegistry {
  private static readonly STORAGE_KEY = 'agv3-profile-registry';
  
  /**
   * Get or create a stable profile storage ID for a view
   */
  static getProfileStorageId(viewType: string, viewName?: string): string {
    const registry = this.loadRegistry();
    
    // Look for existing mapping
    const existingMapping = registry.find(m => 
      m.viewType === viewType && 
      (!viewName || m.viewName === viewName)
    );
    
    if (existingMapping) {
      // Update last accessed time
      existingMapping.lastAccessed = new Date().toISOString();
      this.saveRegistry(registry);
      return existingMapping.profileStorageId;
    }
    
    // Create new mapping with stable ID
    const newMapping: ViewMapping = {
      viewType,
      viewName: viewName || `${viewType}-default`,
      profileStorageId: `profile-${viewType}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    registry.push(newMapping);
    this.saveRegistry(registry);
    
    return newMapping.profileStorageId;
  }
  
  /**
   * Get all mappings for a view type
   */
  static getMappingsForType(viewType: string): ViewMapping[] {
    const registry = this.loadRegistry();
    return registry.filter(m => m.viewType === viewType);
  }
  
  /**
   * Clean up old unused mappings (optional)
   */
  static cleanupOldMappings(daysToKeep: number = 30): void {
    const registry = this.loadRegistry();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const activeRegistry = registry.filter(m => 
      new Date(m.lastAccessed) > cutoffDate
    );
    
    this.saveRegistry(activeRegistry);
  }
  
  private static loadRegistry(): ViewMapping[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[ProfileRegistry] Failed to load registry:', error);
      return [];
    }
  }
  
  private static saveRegistry(registry: ViewMapping[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(registry));
    } catch (error) {
      console.error('[ProfileRegistry] Failed to save registry:', error);
    }
  }
}