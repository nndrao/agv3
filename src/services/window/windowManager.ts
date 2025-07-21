import { v4 as uuidv4 } from 'uuid';

export class WindowManager {
  private static windows: Map<string, any> = new Map();
  
  static async openDatasourceConfig(): Promise<any> {
    // Get the platform
    const platform = fin.Platform.getCurrentSync();
    
    // Create window with view for the Datasource Configuration
    const window = await platform.createWindow({
      name: 'datasource-config-window',
      defaultWidth: 1100,
      defaultHeight: 600,
      defaultTitle: 'Datasource Configuration',
      layout: {
        content: [
          {
            type: 'component',
            componentName: 'view',
            componentState: {
              url: 'http://localhost:5174/datasource-config',
              name: 'datasource-config-view'
            }
          }
        ]
      }
    });
    
    return window;
  }
  
  static async openDataTable(tableId?: string): Promise<any> {
    const id = tableId || uuidv4();
    
    // Get the platform
    const platform = fin.Platform.getCurrentSync();
    
    // Create view for the DataTable
    const view = await platform.createView({
      url: `http://localhost:5174/datatable?id=${id}`,
      name: `datatable-view-${id}`
    });
    
    return view;
  }
  
  static async showProviderStatus(): Promise<any> {
    // Get the platform
    const platform = fin.Platform.getCurrentSync();
    
    // Create view for the Provider Status
    const view = await platform.createView({
      url: 'http://localhost:5174/provider-status',
      name: 'provider-status-view'
    });
    
    return view;
  }
  
  static async openDataGridStomp(): Promise<any> {
    const id = uuidv4();
    
    // Get the platform
    const platform = fin.Platform.getCurrentSync();
    
    // Create view for DataGrid with direct STOMP connection
    const view = await platform.createView({
      url: `http://localhost:5174/datagrid-stomp?id=${id}`,
      name: `datagrid-stomp-view-${id}`
    });
    
    return view;
  }
  
  static async openDataGridChannel(): Promise<any> {
    const id = uuidv4();
    
    // Get the platform
    const platform = fin.Platform.getCurrentSync();
    
    // Create view for DataGrid with channel connection
    const view = await platform.createView({
      url: `http://localhost:5174/datagrid-channel?id=${id}`,
      name: `datagrid-channel-view-${id}`
    });
    
    return view;
  }
  
  static async createHeadlessProvider(providerId: string, config: any): Promise<any> {
    const windowName = `provider-${providerId}`;
    
    console.log(`Creating provider window: ${windowName}`);
    console.log('Provider config:', config);
    
    // Create headless window
    const window = await fin.Window.create({
      name: windowName,
      url: 'http://localhost:5174/provider-window.html',
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
    
    console.log(`Provider window created: ${windowName}`);
    console.log('Window details:', {
      name: windowName,
      url: 'http://localhost:5174/provider-window.html',
      customData: window.getOptions().customData
    });
    
    // Track window closure
    window.on('closed', () => {
      console.log(`Provider window closed: ${windowName}`);
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
        console.log(`Found existing window: ${name}`);
        // Add to our map
        this.windows.set(name, existingWindow);
        return existingWindow;
      }
    } catch (error) {
      // Window doesn't exist
      console.log(`Window not found: ${name}`);
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
}