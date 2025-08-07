import { v4 as uuidv4 } from 'uuid';
import { getViewUrl } from '@/utils/urlUtils';

interface ViewInstance {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

export class WindowManager {
  private static windows: Map<string, any> = new Map();
  private static viewInstances: Map<string, ViewInstance> = new Map();
  private static readonly VIEW_INSTANCES_KEY = 'agv3-view-instances';
  
  static async openDatasourceConfig(): Promise<any> {
    const windowName = 'datasource-config-window';
    
    // Check if window already exists
    try {
      const existingWindow = await fin.Window.wrapSync({ uuid: fin.me.uuid, name: windowName });
      if (existingWindow) {
        await existingWindow.focus();
        await existingWindow.bringToFront();
        return existingWindow;
      }
    } catch (error) {
      // Window doesn't exist, create it
    }
    
    // Create a normal OpenFin window (not a platform window)
    const window = await fin.Window.create({
      name: windowName,
      url: getViewUrl('/datasource-config'),
      defaultWidth: 1100,
      defaultHeight: 700,
      defaultCentered: true,
      autoShow: true,
      frame: true,
      contextMenu: true,
      resizable: true,
      maximizable: true,
      minimizable: true,
      alwaysOnTop: false,
      saveWindowState: false,
      customData: {
        windowType: 'dialog'
      }
    });
    
    // Store window reference
    this.windows.set(windowName, window);
    
    // Track window closure
    window.on('closed', () => {
      this.windows.delete(windowName);
    });
    
    // Focus the window
    await window.focus();
    await window.bringToFront();
    
    return window;
  }
  
  static async openDataTable(tableId?: string): Promise<any> {
    const id = tableId || uuidv4();
    
    // Get the platform
    const platform = fin.Platform.getCurrentSync();
    
    // Create view for the DataTable
    const view = await platform.createView({
      url: getViewUrl(`/datatable?id=${id}`),
      name: `datatable-view-${id}`
    });
    
    return view;
  }
  
  static async showProviderStatus(): Promise<any> {
    const windowName = 'provider-status-window';
    
    // Check if window already exists
    try {
      const existingWindow = await fin.Window.wrapSync({ uuid: fin.me.uuid, name: windowName });
      if (existingWindow) {
        await existingWindow.focus();
        await existingWindow.bringToFront();
        return existingWindow;
      }
    } catch (error) {
      // Window doesn't exist, create it
    }
    
    // Create a normal OpenFin window
    const window = await fin.Window.create({
      name: windowName,
      url: getViewUrl('/provider-status'),
      defaultWidth: 900,
      defaultHeight: 600,
      defaultCentered: true,
      autoShow: true,
      frame: true,
      contextMenu: true,
      resizable: true,
      maximizable: true,
      minimizable: true,
      alwaysOnTop: false,
      saveWindowState: false,
      customData: {
        windowType: 'dialog'
      }
    });
    
    // Store window reference
    this.windows.set(windowName, window);
    
    // Track window closure
    window.on('closed', () => {
      this.windows.delete(windowName);
    });
    
    // Focus the window
    await window.focus();
    await window.bringToFront();
    
    return window;
  }
  
  static async openDataGridStomp(instanceName?: string): Promise<any> {
    // Load existing instances
    this.loadViewInstances();
    
    let id: string;
    let viewName: string;
    
    if (instanceName) {
      // Use provided instance name to find or create instance
      const existingInstance = Array.from(this.viewInstances.values())
        .find(instance => instance.type === 'DataGridStomp' && instance.name === instanceName);
      
      if (existingInstance) {
        id = existingInstance.id;
      } else {
        // Create new instance with stable ID based on name
        id = `datagrid-stomp-${instanceName.toLowerCase().replace(/\s+/g, '-')}`;
      }
      viewName = `datagrid-stomp-${instanceName}`;
    } else {
      // Create a new numbered instance
      const existingCount = Array.from(this.viewInstances.values())
        .filter(instance => instance.type === 'DataGridStomp').length;
      
      id = `datagrid-stomp-instance-${existingCount + 1}`;
      viewName = `DataGrid STOMP ${existingCount + 1}`;
    }
    
    // Get the platform
    const platform = fin.Platform.getCurrentSync();
    
    // Check if view already exists
    try {
      const existingView = await fin.View.wrapSync({ 
        uuid: fin.me.uuid, 
        name: `datagrid-stomp-view-${id}` 
      });
      if (existingView) {
        await existingView.focus();
        return existingView;
      }
    } catch (error) {
      // View doesn't exist, create it
    }
    
    // Check if there's a saved title for this view
    let viewTitle = viewName;
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTitle = localStorage.getItem(`viewTitle_${id}`);
      if (savedTitle) {
        viewTitle = savedTitle;
      }
    }
    
    // Create view for DataGrid with direct STOMP connection
    const view = await platform.createView({
      url: getViewUrl(`/datagrid-stomp?id=${id}`),
      name: `datagrid-stomp-view-${id}`,
      title: viewTitle,
      titleOrder: 'options',
      customData: {
        instanceName: viewName,
        instanceId: id
      }
    });
    
    // Save instance
    this.saveViewInstance(id, viewName, 'DataGridStomp');
    
    return view;
  }
  
  // Removed methods for DataGridChannel, DataGridStompSimplified, and DataGridStompManager as they are no longer used
  
  static async openDataGridStompShared(instanceName?: string): Promise<any> {
    // Load existing instances
    this.loadViewInstances();
    
    let id: string;
    let viewName: string;
    
    if (instanceName) {
      // Use provided instance name to find or create instance
      const existingInstance = Array.from(this.viewInstances.values())
        .find(instance => instance.type === 'DataGridStompShared' && instance.name === instanceName);
      
      if (existingInstance) {
        id = existingInstance.id;
      } else {
        // Create new instance with stable ID based on name
        id = `datagrid-stomp-shared-${instanceName.toLowerCase().replace(/\s+/g, '-')}`;
      }
      viewName = instanceName;
    } else {
      // Create a new numbered instance
      const existingCount = Array.from(this.viewInstances.values())
        .filter(instance => instance.type === 'DataGridStompShared').length;
      
      id = `datagrid-stomp-shared-instance-${existingCount + 1}`;
      viewName = `DataGrid STOMP Shared ${existingCount + 1}`;
    }
    
    // Get the platform
    const platform = fin.Platform.getCurrentSync();
    
    // Check if view already exists
    try {
      const existingView = await fin.View.wrapSync({ 
        uuid: fin.me.uuid, 
        name: `datagrid-stomp-shared-view-${id}` 
      });
      if (existingView) {
        await existingView.focus();
        return existingView;
      }
    } catch (error) {
      // View doesn't exist, create it
    }
    
    // Check if there's a saved title for this view
    let viewTitle = viewName;
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTitle = localStorage.getItem(`viewTitle_${id}`);
      if (savedTitle) {
        viewTitle = savedTitle;
      }
    }
    
    // Create view for DataGrid with SharedWorker connection
    const view = await platform.createView({
      url: getViewUrl(`/datagrid-stomp-shared?id=${id}`),
      name: `datagrid-stomp-shared-view-${id}`,
      title: viewTitle,
      titleOrder: 'options',
      customData: {
        instanceName: viewName,
        instanceId: id
      }
    });
    
    // Save instance
    this.saveViewInstance(id, viewName, 'DataGridStompShared');
    
    return view;
  }
  
  static async createHeadlessProvider(providerId: string, config: any): Promise<any> {
    const windowName = `provider-${providerId}`;
    
    
    // Create headless window
    const window = await fin.Window.create({
      name: windowName,
      url: getViewUrl('/provider-window.html'),
      defaultWidth: 400,
      defaultHeight: 300,
      defaultTop: 100,
      defaultLeft: 100,
      frame: true,  // Show frame for debugging
      autoShow: true,  // Must be true for window to load and run
      showTaskbarIcon: true,  // Show in taskbar for debugging
      saveWindowState: false,
      customData: {
        providerId,
        config
      }
    });
    
    this.windows.set(windowName, window);
    
    
    // Track window closure
    window.on('closed', () => {
      this.windows.delete(windowName);
    });
    
    // Track window events
    window.on('crashed', () => {
      console.error(`Provider window crashed: ${windowName}`);
    });
    
    window.on('not-responding', () => {
      console.warn(`Provider window not responding: ${windowName}`);
    });
    
    return window;
  }
  
  static async getWindow(name: string): Promise<any> {
    // First check our internal map
    const window = this.windows.get(name);
    if (window) {
      return window;
    }
    
    // Try to find existing window by name
    try {
      const existingWindow = await fin.Window.wrapSync({ uuid: fin.me.uuid, name });
      if (existingWindow) {
        // Add to our map
        this.windows.set(name, existingWindow);
        return existingWindow;
      }
    } catch (error) {
      // Window doesn't exist
    }
    
    return null;
  }
  
  static async closeWindow(name: string): Promise<void> {
    const window = this.windows.get(name);
    if (window) {
      try {
        await window.close();
      } catch (error) {
        console.error(`Failed to close window ${name}:`, error);
      }
      this.windows.delete(name);
    }
  }
  
  static getActiveWindows(): string[] {
    return Array.from(this.windows.keys());
  }
  
  static getDataGridStompInstances(): ViewInstance[] {
    this.loadViewInstances();
    return Array.from(this.viewInstances.values())
      .filter(instance => instance.type === 'DataGridStomp');
  }
  
  static async openConditionalFormatting(viewId: string): Promise<any> {
    const windowName = `conditional-formatting-${viewId}`;
    
    // Check if window already exists
    try {
      const existingWindow = await fin.Window.wrapSync({ uuid: fin.me.uuid, name: windowName });
      if (existingWindow) {
        await existingWindow.focus();
        await existingWindow.bringToFront();
        return existingWindow;
      }
    } catch (error) {
      // Window doesn't exist, create it
    }
    
    // Create a window for conditional formatting
    const window = await fin.Window.create({
      name: windowName,
      url: getViewUrl(`/conditional-formatting?viewId=${viewId}`),
      title: 'Conditional Formatting Rules',
      defaultWidth: 1000,
      defaultHeight: 700,
      defaultCentered: true,
      autoShow: true,
      frame: true,
      contextMenu: true,
      resizable: true,
      maximizable: true,
      minimizable: true,
      alwaysOnTop: false,
      saveWindowState: false,
      customData: {
        windowType: 'dialog',
        viewId
      }
    });
    
    // Store window reference
    this.windows.set(windowName, window);
    
    // Track window closure
    window.on('closed', () => {
      this.windows.delete(windowName);
    });
    
    // Focus the window
    await window.focus();
    await window.bringToFront();
    
    return window;
  }
  
  static registerViewInstance(id: string, name: string, type: string): void {
    this.loadViewInstances();
    
    // Check if instance already exists
    if (!this.viewInstances.has(id)) {
      this.saveViewInstance(id, name, type);
    }
  }
  
  private static loadViewInstances(): void {
    try {
      const stored = localStorage.getItem(this.VIEW_INSTANCES_KEY);
      if (stored) {
        const instances = JSON.parse(stored) as ViewInstance[];
        this.viewInstances.clear();
        instances.forEach(instance => {
          this.viewInstances.set(instance.id, instance);
        });
      }
    } catch (error) {
      console.error('[WindowManager] Failed to load view instances:', error);
    }
  }
  
  private static saveViewInstance(id: string, name: string, type: string): void {
    const instance: ViewInstance = {
      id,
      name,
      type,
      createdAt: new Date().toISOString()
    };
    
    this.viewInstances.set(id, instance);
    
    try {
      const instances = Array.from(this.viewInstances.values());
      localStorage.setItem(this.VIEW_INSTANCES_KEY, JSON.stringify(instances));
    } catch (error) {
      console.error('[WindowManager] Failed to save view instances:', error);
    }
  }
}