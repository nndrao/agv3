/**
 * OpenFin Dialog Service
 * 
 * A robust service for managing dialog windows in OpenFin with reliable
 * parent-child communication using Inter-Application Bus (IAB).
 * 
 * Features:
 * - One-to-one parent-child communication
 * - Automatic cleanup on window close
 * - Type-safe message passing
 * - Error handling and timeouts
 * - Unique dialog IDs to prevent conflicts
 */

import { getViewUrl } from '@/utils/urlUtils';

// Message types for dialog communication
export interface DialogInitRequest {
  dialogId: string;
  parentIdentity: { uuid: string; name: string };
  timestamp: number;
  data: any;
}

export interface DialogResponse {
  dialogId: string;
  action: 'apply' | 'cancel' | 'error';
  timestamp: number;
  data?: any;
  error?: string;
}

export interface DialogConfig {
  /** Unique name for the dialog window */
  name: string;
  /** Route path (e.g., '/grid-options') */
  route: string;
  /** Initial data to pass to dialog */
  data: any;
  /** OpenFin window options */
  windowOptions?: Partial<any>;
  /** Callback when dialog applies changes */
  onApply?: (data: any) => void | Promise<void>;
  /** Callback when dialog is cancelled */
  onCancel?: () => void;
  /** Callback when dialog errors */
  onError?: (error: string) => void;
}

export interface DialogChildConfig {
  /** Callback to set initial data in child */
  onInitialize: (data: any) => void;
  /** Function to get data when applying */
  getData: () => any;
}

class OpenFinDialogService {
  private static instance: OpenFinDialogService;
  private activeDialogs: Map<string, {
    window: any;
    config: DialogConfig;
    cleanup: () => void;
  }> = new Map();

  private constructor() {}

  static getInstance(): OpenFinDialogService {
    if (!OpenFinDialogService.instance) {
      OpenFinDialogService.instance = new OpenFinDialogService();
    }
    return OpenFinDialogService.instance;
  }

  /**
   * Opens a dialog window and sets up communication
   * Parent-side method
   */
  async openDialog(config: DialogConfig): Promise<void> {
    const dialogId = `${config.name}-${Date.now()}`;
    
    try {
      // Check if fin is available
      if (typeof fin === 'undefined') {
        throw new Error('OpenFin API not available');
      }

      // Close existing dialog with same name if exists
      await this.closeDialog(config.name);

      // Create window options
      // Using BrowserRouter, so routes are regular paths
      const windowUrl = getViewUrl(config.route);
      const defaultOptions = {
        name: config.name,
        url: windowUrl,
        defaultWidth: 800,
        defaultHeight: 600,
        defaultCentered: true,
        autoShow: true,
        frame: true,
        resizable: true,
        maximizable: true,
        minimizable: true,
        saveWindowState: false,
        customData: { dialogId, parentIdentity: fin.me.identity }
      };

      const finalOptions = {
        ...defaultOptions,
        ...config.windowOptions
      };

      console.log(`[DialogService] Opening dialog: ${config.name}`, finalOptions);

      // Create the window
      const dialogWindow = await fin.Window.create(finalOptions);

      // Set up response listener
      const responseHandler = (response: DialogResponse) => {
        if (response.dialogId !== dialogId) return;

        console.log(`[DialogService] Received response from ${config.name}:`, response.action);

        switch (response.action) {
          case 'apply':
            if (config.onApply && response.data) {
              config.onApply(response.data);
            }
            this.closeDialog(config.name);
            break;
          case 'cancel':
            if (config.onCancel) {
              config.onCancel();
            }
            this.closeDialog(config.name);
            break;
          case 'error':
            console.error(`[DialogService] Dialog error: ${response.error}`);
            if (config.onError) {
              config.onError(response.error || 'Unknown error');
            }
            this.closeDialog(config.name);
            break;
        }
      };

      // Subscribe to dialog responses
      await fin.InterApplicationBus.subscribe(
        { uuid: fin.me.uuid, name: config.name },
        'dialog-response',
        responseHandler
      );

      // Set up init request handler - dialog will request data when ready
      const initHandler = async (request: { dialogId: string }) => {
        if (request.dialogId !== dialogId) return;
        
        console.log(`[DialogService] Sending init data to ${config.name}`);
        
        // Send initialization data to dialog
        const initData: DialogInitRequest = {
          dialogId,
          parentIdentity: fin.me.identity,
          timestamp: Date.now(),
          data: config.data
        };

        await fin.InterApplicationBus.send(
          { uuid: fin.me.uuid, name: config.name },
          'dialog-init-data',
          initData
        );
      };

      await fin.InterApplicationBus.subscribe(
        { uuid: fin.me.uuid, name: config.name },
        'dialog-request-init',
        initHandler
      );

      // Cleanup function
      const cleanup = () => {
        fin.InterApplicationBus.unsubscribe(
          { uuid: fin.me.uuid, name: config.name },
          'dialog-response',
          responseHandler
        );
        fin.InterApplicationBus.unsubscribe(
          { uuid: fin.me.uuid, name: config.name },
          'dialog-request-init',
          initHandler
        );
      };

      // Store dialog info
      this.activeDialogs.set(config.name, {
        window: dialogWindow,
        config,
        cleanup
      });

      // Listen for window close
      dialogWindow.on('closed', () => {
        console.log(`[DialogService] Dialog closed: ${config.name}`);
        this.closeDialog(config.name);
      });

    } catch (error) {
      console.error(`[DialogService] Failed to open dialog: ${config.name}`, error);
      if (config.onError) {
        config.onError(error instanceof Error ? error.message : 'Failed to open dialog');
      }
      throw error;
    }
  }

  /**
   * Initializes a child dialog and retrieves initial data
   * Child-side method
   */
  async initializeChild(config: DialogChildConfig): Promise<void> {
    try {
      if (typeof fin === 'undefined') {
        throw new Error('OpenFin API not available');
      }

      const me = await fin.me;
      const customData = await me.getOptions().then(opts => opts.customData);
      const dialogId = customData?.dialogId;
      const parentIdentity = customData?.parentIdentity;

      if (!dialogId || !parentIdentity) {
        throw new Error('Dialog not properly initialized - missing customData');
      }

      console.log(`[DialogService Child] Initializing with ID: ${dialogId}`);

      // Set up handler for init data
      const initDataHandler = (data: DialogInitRequest) => {
        if (data.dialogId !== dialogId) return;
        
        console.log(`[DialogService Child] Received init data`);
        config.onInitialize(data.data);
      };

      // Subscribe to init data
      await fin.InterApplicationBus.subscribe(
        parentIdentity,
        'dialog-init-data',
        initDataHandler
      );

      // Request init data from parent
      await fin.InterApplicationBus.send(
        parentIdentity,
        'dialog-request-init',
        { dialogId }
      );

      // Store references for later use
      (window as any).__dialogContext = {
        dialogId,
        parentIdentity,
        sendResponse: async (action: 'apply' | 'cancel' | 'error', data?: any, error?: string) => {
          const response: DialogResponse = {
            dialogId,
            action,
            timestamp: Date.now(),
            data,
            error
          };

          console.log(`[DialogService Child] Sending response: ${action}`);
          
          try {
            await fin.InterApplicationBus.send(
              parentIdentity,
              'dialog-response',
              response
            );
          } catch (err) {
            console.error('[DialogService Child] Failed to send response:', err);
          }

          // Close window after sending response (except for errors)
          if (action !== 'error') {
            setTimeout(() => fin.me.close(), 100);
          }
        }
      };

    } catch (error) {
      console.error('[DialogService Child] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Sends a response from child dialog to parent
   * Child-side method
   */
  async sendResponse(action: 'apply' | 'cancel' | 'error', data?: any, error?: string): Promise<void> {
    const context = (window as any).__dialogContext;
    if (!context) {
      throw new Error('Dialog context not initialized. Call initializeChild first.');
    }
    
    await context.sendResponse(action, data, error);
  }

  /**
   * Closes a dialog by name
   */
  async closeDialog(name: string): Promise<void> {
    const dialog = this.activeDialogs.get(name);
    if (!dialog) return;

    try {
      // Run cleanup
      dialog.cleanup();
      
      // Close window
      await dialog.window.close(true);
    } catch (error) {
      console.error(`[DialogService] Error closing dialog: ${name}`, error);
    } finally {
      this.activeDialogs.delete(name);
    }
  }

  /**
   * Closes all active dialogs
   */
  async closeAllDialogs(): Promise<void> {
    const closePromises = Array.from(this.activeDialogs.keys()).map(name =>
      this.closeDialog(name)
    );
    await Promise.all(closePromises);
  }

  /**
   * Gets the number of active dialogs
   */
  getActiveDialogCount(): number {
    return this.activeDialogs.size;
  }

  /**
   * Checks if a dialog is active
   */
  isDialogActive(name: string): boolean {
    return this.activeDialogs.has(name);
  }
}

// Export singleton instance
export const dialogService = OpenFinDialogService.getInstance();

// Export convenience functions for child dialogs
export const initializeDialog = (config: DialogChildConfig) => 
  dialogService.initializeChild(config);

export const sendDialogResponse = (action: 'apply' | 'cancel' | 'error', data?: any, error?: string) =>
  dialogService.sendResponse(action, data, error);