import { IStorageAdapter, WorkspaceData, ComponentConfig } from './interfaces/IStorageAdapter';
import { EnhancedLocalStorageAdapter } from './adapters/EnhancedLocalStorageAdapter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Central storage manager that coordinates workspace and component configuration storage
 * Provides a unified interface for saving and loading complete workspace states
 */
export class StorageManager {
  private static instance: StorageManager;
  private adapter: IStorageAdapter;
  
  private constructor(adapter?: IStorageAdapter) {
    this.adapter = adapter || new EnhancedLocalStorageAdapter();
  }
  
  /**
   * Get singleton instance of StorageManager
   */
  static getInstance(adapter?: IStorageAdapter): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager(adapter);
    }
    return StorageManager.instance;
  }
  
  /**
   * Set a different storage adapter
   */
  setAdapter(adapter: IStorageAdapter): void {
    this.adapter = adapter;
  }
  
  /**
   * Get current storage adapter
   */
  getAdapter(): IStorageAdapter {
    return this.adapter;
  }
  
  /**
   * Save workspace with OpenFin snapshot
   */
  async saveWorkspace(name: string, snapshot: any, metadata?: any): Promise<string> {
    const workspaceId = uuidv4();
    
    const workspace: WorkspaceData = {
      workspaceId,
      name,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: metadata?.userId || 'system',
        version: '1.0.0',
        tags: metadata?.tags || []
      },
      snapshot
    };
    
    await this.adapter.saveWorkspace(workspace);
    return workspaceId;
  }
  
  /**
   * Load workspace and return snapshot for OpenFin to apply
   */
  async loadWorkspace(workspaceId: string): Promise<WorkspaceData | null> {
    return await this.adapter.getWorkspace(workspaceId);
  }
  
  /**
   * Save complete workspace state including all component configurations
   */
  async saveWorkspaceWithConfigs(
    name: string, 
    snapshot: any, 
    componentConfigs: Map<string, any>,
    metadata?: any
  ): Promise<string> {
    // Save workspace first
    const workspaceId = await this.saveWorkspace(name, snapshot, metadata);
    
    // Save all component configurations
    for (const [viewId, config] of componentConfigs) {
      const componentConfig: ComponentConfig = {
        configId: viewId,
        workspaceId,
        componentType: config.componentType || 'unknown',
        profiles: config.profiles || [],
        activeProfile: config.activeProfile || '',
        settings: config.settings || {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      
      await this.adapter.saveComponentConfig(componentConfig);
    }
    
    return workspaceId;
  }
  
  /**
   * Load workspace with all associated component configurations
   */
  async loadWorkspaceWithConfigs(workspaceId: string): Promise<{
    workspace: WorkspaceData | null;
    configs: Map<string, ComponentConfig>;
  }> {
    const workspace = await this.adapter.getWorkspace(workspaceId);
    const configs = new Map<string, ComponentConfig>();
    
    if (workspace) {
      // Get all configs associated with this workspace
      const componentConfigs = await this.adapter.findComponentConfigsByWorkspace(workspaceId);
      
      for (const config of componentConfigs) {
        configs.set(config.configId, config);
      }
    }
    
    return { workspace, configs };
  }
  
  /**
   * List all available workspaces for a user
   */
  async listWorkspaces(userId?: string): Promise<WorkspaceData[]> {
    return await this.adapter.listWorkspaces(userId);
  }
  
  /**
   * Delete workspace and all associated configurations
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.adapter.deleteWorkspace(workspaceId);
  }
  
  /**
   * Clone an existing workspace
   */
  async cloneWorkspace(workspaceId: string, newName: string): Promise<string> {
    const { workspace, configs } = await this.loadWorkspaceWithConfigs(workspaceId);
    
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    
    // Create new workspace with same snapshot
    const newWorkspaceId = await this.saveWorkspace(
      newName,
      workspace.snapshot,
      workspace.metadata
    );
    
    // Clone all component configs
    for (const [viewId, config] of configs) {
      const newConfig: ComponentConfig = {
        ...config,
        workspaceId: newWorkspaceId,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      
      await this.adapter.saveComponentConfig(newConfig);
    }
    
    return newWorkspaceId;
  }
  
  /**
   * Export all workspaces and configurations
   */
  async exportAll(): Promise<{
    workspaces: WorkspaceData[];
    configs: ComponentConfig[];
  }> {
    return await this.adapter.export();
  }
  
  /**
   * Import workspaces and configurations
   */
  async importAll(data: {
    workspaces: WorkspaceData[];
    configs: ComponentConfig[];
  }): Promise<void> {
    await this.adapter.import(data);
  }
  
  /**
   * Save component configuration independently
   */
  async saveComponentConfig(
    viewId: string,
    componentType: string,
    config: any,
    workspaceId?: string
  ): Promise<void> {
    const componentConfig: ComponentConfig = {
      configId: viewId,
      workspaceId,
      componentType,
      profiles: config.profiles || [],
      activeProfile: config.activeProfile || '',
      settings: config.settings || {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    await this.adapter.saveComponentConfig(componentConfig);
  }
  
  /**
   * Get component configuration
   */
  async getComponentConfig(viewId: string): Promise<ComponentConfig | null> {
    return await this.adapter.getComponentConfig(viewId);
  }
  
  /**
   * Check if storage is available
   */
  async isAvailable(): Promise<boolean> {
    return await this.adapter.isAvailable();
  }
}