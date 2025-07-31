import { IStorageAdapter, WorkspaceData, ComponentConfig } from '../interfaces/IStorageAdapter';

/**
 * Hybrid storage adapter that combines local and remote storage
 * Provides offline support with background sync to remote storage
 */
export class HybridAdapter implements IStorageAdapter {
  private localAdapter: IStorageAdapter;
  private remoteAdapter: IStorageAdapter;
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  
  constructor(localAdapter: IStorageAdapter, remoteAdapter: IStorageAdapter) {
    this.localAdapter = localAdapter;
    this.remoteAdapter = remoteAdapter;
    
    // Start background sync
    this.startBackgroundSync();
  }
  
  // Workspace operations
  async saveWorkspace(workspace: WorkspaceData): Promise<void> {
    // Always save locally first
    await this.localAdapter.saveWorkspace(workspace);
    
    // Queue for remote sync
    this.queueOperation({
      type: 'saveWorkspace',
      data: workspace,
      timestamp: Date.now()
    });
  }
  
  async getWorkspace(workspaceId: string): Promise<WorkspaceData | null> {
    // Try local first
    let workspace = await this.localAdapter.getWorkspace(workspaceId);
    
    // If not found locally and remote is available, try remote
    if (!workspace && await this.remoteAdapter.isAvailable()) {
      workspace = await this.remoteAdapter.getWorkspace(workspaceId);
      
      // Cache locally if found
      if (workspace) {
        await this.localAdapter.saveWorkspace(workspace);
      }
    }
    
    return workspace;
  }
  
  async listWorkspaces(userId?: string): Promise<WorkspaceData[]> {
    const localWorkspaces = await this.localAdapter.listWorkspaces(userId);
    
    // If remote is available, sync and merge
    if (await this.remoteAdapter.isAvailable()) {
      try {
        const remoteWorkspaces = await this.remoteAdapter.listWorkspaces(userId);
        
        // Merge and deduplicate
        const workspaceMap = new Map<string, WorkspaceData>();
        
        // Add local workspaces
        localWorkspaces.forEach(ws => workspaceMap.set(ws.workspaceId, ws));
        
        // Add/update with remote workspaces (remote takes precedence)
        remoteWorkspaces.forEach(ws => {
          workspaceMap.set(ws.workspaceId, ws);
          // Update local cache
          this.localAdapter.saveWorkspace(ws);
        });
        
        return Array.from(workspaceMap.values());
      } catch (error) {
        console.error('Failed to sync with remote:', error);
        // Fall back to local only
      }
    }
    
    return localWorkspaces;
  }
  
  async deleteWorkspace(workspaceId: string): Promise<void> {
    // Delete locally
    await this.localAdapter.deleteWorkspace(workspaceId);
    
    // Queue for remote deletion
    this.queueOperation({
      type: 'deleteWorkspace',
      data: { workspaceId },
      timestamp: Date.now()
    });
  }
  
  async updateWorkspace(workspaceId: string, updates: Partial<WorkspaceData>): Promise<void> {
    // Update locally
    await this.localAdapter.updateWorkspace(workspaceId, updates);
    
    // Queue for remote update
    this.queueOperation({
      type: 'updateWorkspace',
      data: { workspaceId, updates },
      timestamp: Date.now()
    });
  }
  
  // Component config operations
  async saveComponentConfig(config: ComponentConfig): Promise<void> {
    await this.localAdapter.saveComponentConfig(config);
    
    this.queueOperation({
      type: 'saveComponentConfig',
      data: config,
      timestamp: Date.now()
    });
  }
  
  async getComponentConfig(configId: string): Promise<ComponentConfig | null> {
    let config = await this.localAdapter.getComponentConfig(configId);
    
    if (!config && await this.remoteAdapter.isAvailable()) {
      config = await this.remoteAdapter.getComponentConfig(configId);
      
      if (config) {
        await this.localAdapter.saveComponentConfig(config);
      }
    }
    
    return config;
  }
  
  async deleteComponentConfig(configId: string): Promise<void> {
    await this.localAdapter.deleteComponentConfig(configId);
    
    this.queueOperation({
      type: 'deleteComponentConfig',
      data: { configId },
      timestamp: Date.now()
    });
  }
  
  async updateComponentConfig(configId: string, updates: Partial<ComponentConfig>): Promise<void> {
    await this.localAdapter.updateComponentConfig(configId, updates);
    
    this.queueOperation({
      type: 'updateComponentConfig',
      data: { configId, updates },
      timestamp: Date.now()
    });
  }
  
  // Bulk operations
  async getComponentConfigs(configIds: string[]): Promise<ComponentConfig[]> {
    const localConfigs = await this.localAdapter.getComponentConfigs(configIds);
    const foundIds = new Set(localConfigs.map(c => c.configId));
    const missingIds = configIds.filter(id => !foundIds.has(id));
    
    // Try to get missing configs from remote
    if (missingIds.length > 0 && await this.remoteAdapter.isAvailable()) {
      try {
        const remoteConfigs = await this.remoteAdapter.getComponentConfigs(missingIds);
        
        // Cache remote configs locally
        for (const config of remoteConfigs) {
          await this.localAdapter.saveComponentConfig(config);
        }
        
        return [...localConfigs, ...remoteConfigs];
      } catch (error) {
        console.error('Failed to get remote configs:', error);
      }
    }
    
    return localConfigs;
  }
  
  async saveComponentConfigs(configs: ComponentConfig[]): Promise<void> {
    await this.localAdapter.saveComponentConfigs(configs);
    
    this.queueOperation({
      type: 'saveComponentConfigs',
      data: configs,
      timestamp: Date.now()
    });
  }
  
  // Query operations
  async findComponentConfigsByWorkspace(workspaceId: string): Promise<ComponentConfig[]> {
    const localConfigs = await this.localAdapter.findComponentConfigsByWorkspace(workspaceId);
    
    if (await this.remoteAdapter.isAvailable()) {
      try {
        const remoteConfigs = await this.remoteAdapter.findComponentConfigsByWorkspace(workspaceId);
        
        // Merge and deduplicate
        const configMap = new Map<string, ComponentConfig>();
        localConfigs.forEach(c => configMap.set(c.configId, c));
        remoteConfigs.forEach(c => {
          configMap.set(c.configId, c);
          // Update local cache
          this.localAdapter.saveComponentConfig(c);
        });
        
        return Array.from(configMap.values());
      } catch (error) {
        console.error('Failed to query remote configs:', error);
      }
    }
    
    return localConfigs;
  }
  
  async findComponentConfigsByType(componentType: string): Promise<ComponentConfig[]> {
    const localConfigs = await this.localAdapter.findComponentConfigsByType(componentType);
    
    if (await this.remoteAdapter.isAvailable()) {
      try {
        const remoteConfigs = await this.remoteAdapter.findComponentConfigsByType(componentType);
        
        // Merge and deduplicate
        const configMap = new Map<string, ComponentConfig>();
        localConfigs.forEach(c => configMap.set(c.configId, c));
        remoteConfigs.forEach(c => {
          configMap.set(c.configId, c);
          // Update local cache
          this.localAdapter.saveComponentConfig(c);
        });
        
        return Array.from(configMap.values());
      } catch (error) {
        console.error('Failed to query remote configs:', error);
      }
    }
    
    return localConfigs;
  }
  
  // Utility methods
  async clear(): Promise<void> {
    await this.localAdapter.clear();
    
    if (await this.remoteAdapter.isAvailable()) {
      await this.remoteAdapter.clear();
    }
  }
  
  async export(): Promise<{ workspaces: WorkspaceData[]; configs: ComponentConfig[] }> {
    // Export from local (should have most recent data)
    return await this.localAdapter.export();
  }
  
  async import(data: { workspaces: WorkspaceData[]; configs: ComponentConfig[] }): Promise<void> {
    // Import to both local and remote
    await this.localAdapter.import(data);
    
    if (await this.remoteAdapter.isAvailable()) {
      await this.remoteAdapter.import(data);
    }
  }
  
  async isAvailable(): Promise<boolean> {
    // Hybrid is available if local is available
    return await this.localAdapter.isAvailable();
  }
  
  // Sync management
  private queueOperation(operation: SyncOperation): void {
    this.syncQueue.push(operation);
    this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }
    
    this.isSyncing = true;
    
    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue[0];
      
      try {
        if (await this.remoteAdapter.isAvailable()) {
          await this.executeSyncOperation(operation);
          this.syncQueue.shift(); // Remove successful operation
        } else {
          // Remote not available, stop trying
          break;
        }
      } catch (error) {
        console.error('Sync operation failed:', error);
        
        // Increment retry count
        operation.retries = (operation.retries || 0) + 1;
        
        // Remove if too many retries
        if (operation.retries > 3) {
          console.error('Dropping operation after 3 retries:', operation);
          this.syncQueue.shift();
        } else {
          // Try again later
          break;
        }
      }
    }
    
    this.isSyncing = false;
  }
  
  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'saveWorkspace':
        await this.remoteAdapter.saveWorkspace(operation.data as WorkspaceData);
        break;
        
      case 'deleteWorkspace':
        await this.remoteAdapter.deleteWorkspace(operation.data.workspaceId);
        break;
        
      case 'updateWorkspace':
        await this.remoteAdapter.updateWorkspace(
          operation.data.workspaceId,
          operation.data.updates
        );
        break;
        
      case 'saveComponentConfig':
        await this.remoteAdapter.saveComponentConfig(operation.data as ComponentConfig);
        break;
        
      case 'deleteComponentConfig':
        await this.remoteAdapter.deleteComponentConfig(operation.data.configId);
        break;
        
      case 'updateComponentConfig':
        await this.remoteAdapter.updateComponentConfig(
          operation.data.configId,
          operation.data.updates
        );
        break;
        
      case 'saveComponentConfigs':
        await this.remoteAdapter.saveComponentConfigs(operation.data as ComponentConfig[]);
        break;
    }
  }
  
  private startBackgroundSync(): void {
    // Try to sync every 30 seconds
    setInterval(() => {
      this.processQueue();
    }, 30000);
  }
}

interface SyncOperation {
  type: string;
  data: any;
  timestamp: number;
  retries?: number;
}