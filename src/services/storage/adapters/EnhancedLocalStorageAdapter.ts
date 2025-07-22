import { IStorageAdapter, WorkspaceData, ComponentConfig, ViewState } from '../interfaces/IStorageAdapter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced LocalStorage adapter that implements the full IStorageAdapter interface
 * Supports both workspace and component configuration storage
 */
export class EnhancedLocalStorageAdapter implements IStorageAdapter {
  private workspacePrefix = 'agv3:workspace:';
  private configPrefix = 'agv3:config:';
  private indexPrefix = 'agv3:index:';
  
  // Workspace operations
  async saveWorkspace(workspace: WorkspaceData): Promise<void> {
    const key = `${this.workspacePrefix}${workspace.workspaceId}`;
    workspace.metadata.updatedAt = new Date().toISOString();
    
    localStorage.setItem(key, JSON.stringify(workspace));
    this.updateWorkspaceIndex(workspace.workspaceId);
  }
  
  async getWorkspace(workspaceId: string): Promise<WorkspaceData | null> {
    const key = `${this.workspacePrefix}${workspaceId}`;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as WorkspaceData;
    } catch (error) {
      console.error('Failed to parse workspace data:', error);
      return null;
    }
  }
  
  async listWorkspaces(userId?: string): Promise<WorkspaceData[]> {
    const workspaces: WorkspaceData[] = [];
    const index = this.getWorkspaceIndex();
    
    for (const workspaceId of index) {
      const workspace = await this.getWorkspace(workspaceId);
      if (workspace) {
        // Filter by userId if provided
        if (!userId || workspace.metadata.createdBy === userId) {
          workspaces.push(workspace);
        }
      }
    }
    
    return workspaces;
  }
  
  async deleteWorkspace(workspaceId: string): Promise<void> {
    const key = `${this.workspacePrefix}${workspaceId}`;
    localStorage.removeItem(key);
    this.removeFromWorkspaceIndex(workspaceId);
    
    // Also delete associated component configs
    const configs = await this.findComponentConfigsByWorkspace(workspaceId);
    for (const config of configs) {
      await this.deleteComponentConfig(config.configId);
    }
  }
  
  async updateWorkspace(workspaceId: string, updates: Partial<WorkspaceData>): Promise<void> {
    const existing = await this.getWorkspace(workspaceId);
    if (!existing) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    await this.saveWorkspace(updated);
  }
  
  // Component config operations
  async saveComponentConfig(config: ComponentConfig): Promise<void> {
    const key = `${this.configPrefix}${config.configId}`;
    if (!config.metadata) {
      config.metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      config.metadata.updatedAt = new Date().toISOString();
    }
    
    localStorage.setItem(key, JSON.stringify(config));
    this.updateConfigIndex(config.configId, config.componentType, config.workspaceId);
  }
  
  async getComponentConfig(configId: string): Promise<ComponentConfig | null> {
    const key = `${this.configPrefix}${configId}`;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as ComponentConfig;
    } catch (error) {
      console.error('Failed to parse component config:', error);
      return null;
    }
  }
  
  async deleteComponentConfig(configId: string): Promise<void> {
    const key = `${this.configPrefix}${configId}`;
    const config = await this.getComponentConfig(configId);
    
    localStorage.removeItem(key);
    
    if (config) {
      this.removeFromConfigIndex(configId, config.componentType, config.workspaceId);
    }
  }
  
  async updateComponentConfig(configId: string, updates: Partial<ComponentConfig>): Promise<void> {
    const existing = await this.getComponentConfig(configId);
    if (!existing) {
      throw new Error(`Component config ${configId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    await this.saveComponentConfig(updated);
  }
  
  // Bulk operations
  async getComponentConfigs(configIds: string[]): Promise<ComponentConfig[]> {
    const configs: ComponentConfig[] = [];
    
    for (const configId of configIds) {
      const config = await this.getComponentConfig(configId);
      if (config) {
        configs.push(config);
      }
    }
    
    return configs;
  }
  
  async saveComponentConfigs(configs: ComponentConfig[]): Promise<void> {
    for (const config of configs) {
      await this.saveComponentConfig(config);
    }
  }
  
  // Query operations
  async findComponentConfigsByWorkspace(workspaceId: string): Promise<ComponentConfig[]> {
    const indexKey = `${this.indexPrefix}workspace:${workspaceId}`;
    const configIds = this.getIndexArray(indexKey);
    return this.getComponentConfigs(configIds);
  }
  
  async findComponentConfigsByType(componentType: string): Promise<ComponentConfig[]> {
    const indexKey = `${this.indexPrefix}type:${componentType}`;
    const configIds = this.getIndexArray(indexKey);
    return this.getComponentConfigs(configIds);
  }
  
  // Utility methods
  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('agv3:')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  async export(): Promise<{ workspaces: WorkspaceData[]; configs: ComponentConfig[] }> {
    const workspaces = await this.listWorkspaces();
    const configs: ComponentConfig[] = [];
    
    // Get all component configs
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.configPrefix)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            configs.push(JSON.parse(data) as ComponentConfig);
          } catch (error) {
            console.error('Failed to parse config during export:', error);
          }
        }
      }
    }
    
    return { workspaces, configs };
  }
  
  async import(data: { workspaces: WorkspaceData[]; configs: ComponentConfig[] }): Promise<void> {
    // Clear existing data first
    await this.clear();
    
    // Import workspaces
    for (const workspace of data.workspaces) {
      await this.saveWorkspace(workspace);
    }
    
    // Import configs
    for (const config of data.configs) {
      await this.saveComponentConfig(config);
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const testKey = 'agv3:test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Index management helpers
  private getWorkspaceIndex(): string[] {
    const indexKey = `${this.indexPrefix}workspaces`;
    return this.getIndexArray(indexKey);
  }
  
  private updateWorkspaceIndex(workspaceId: string): void {
    const indexKey = `${this.indexPrefix}workspaces`;
    const index = this.getIndexArray(indexKey);
    
    if (!index.includes(workspaceId)) {
      index.push(workspaceId);
      localStorage.setItem(indexKey, JSON.stringify(index));
    }
  }
  
  private removeFromWorkspaceIndex(workspaceId: string): void {
    const indexKey = `${this.indexPrefix}workspaces`;
    const index = this.getIndexArray(indexKey);
    const filtered = index.filter(id => id !== workspaceId);
    localStorage.setItem(indexKey, JSON.stringify(filtered));
  }
  
  private updateConfigIndex(configId: string, componentType: string, workspaceId?: string): void {
    // Update type index
    const typeIndexKey = `${this.indexPrefix}type:${componentType}`;
    const typeIndex = this.getIndexArray(typeIndexKey);
    if (!typeIndex.includes(configId)) {
      typeIndex.push(configId);
      localStorage.setItem(typeIndexKey, JSON.stringify(typeIndex));
    }
    
    // Update workspace index if workspaceId provided
    if (workspaceId) {
      const workspaceIndexKey = `${this.indexPrefix}workspace:${workspaceId}`;
      const workspaceIndex = this.getIndexArray(workspaceIndexKey);
      if (!workspaceIndex.includes(configId)) {
        workspaceIndex.push(configId);
        localStorage.setItem(workspaceIndexKey, JSON.stringify(workspaceIndex));
      }
    }
  }
  
  private removeFromConfigIndex(configId: string, componentType: string, workspaceId?: string): void {
    // Remove from type index
    const typeIndexKey = `${this.indexPrefix}type:${componentType}`;
    const typeIndex = this.getIndexArray(typeIndexKey);
    const filteredType = typeIndex.filter(id => id !== configId);
    localStorage.setItem(typeIndexKey, JSON.stringify(filteredType));
    
    // Remove from workspace index if workspaceId provided
    if (workspaceId) {
      const workspaceIndexKey = `${this.indexPrefix}workspace:${workspaceId}`;
      const workspaceIndex = this.getIndexArray(workspaceIndexKey);
      const filteredWorkspace = workspaceIndex.filter(id => id !== configId);
      localStorage.setItem(workspaceIndexKey, JSON.stringify(filteredWorkspace));
    }
  }
  
  private getIndexArray(key: string): string[] {
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    try {
      return JSON.parse(data) as string[];
    } catch (error) {
      console.error('Failed to parse index array:', error);
      return [];
    }
  }
}