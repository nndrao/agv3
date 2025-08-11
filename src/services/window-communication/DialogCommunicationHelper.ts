/**
 * Dialog Communication Helper
 * 
 * Simplifies communication between main windows and dialog windows
 * Handles both portal-based (same-origin) and standalone (cross-origin) dialogs
 */

import { WindowCommunicationService } from './WindowCommunicationService';
import { ConditionalRule } from '@/components/conditional-formatting/types';

// Define standard message types for different dialogs
export enum DialogMessageType {
  // Grid Options Dialog
  GET_GRID_OPTIONS = 'GET_GRID_OPTIONS',
  APPLY_GRID_OPTIONS = 'APPLY_GRID_OPTIONS',
  
  // Column Groups Dialog
  GET_COLUMN_GROUPS = 'GET_COLUMN_GROUPS',
  APPLY_COLUMN_GROUPS = 'APPLY_COLUMN_GROUPS',
  GET_COLUMN_DEFINITIONS = 'GET_COLUMN_DEFINITIONS',
  
  // Conditional Formatting Dialog
  GET_CONDITIONAL_RULES = 'GET_CONDITIONAL_RULES',
  APPLY_CONDITIONAL_RULES = 'APPLY_CONDITIONAL_RULES',
  GET_AVAILABLE_COLUMNS = 'GET_AVAILABLE_COLUMNS',
  GET_AVAILABLE_VARIABLES = 'GET_AVAILABLE_VARIABLES',
  
  // Common
  GET_PROFILE = 'GET_PROFILE',
  CLOSE_DIALOG = 'CLOSE_DIALOG'
}

// Dialog types
export type DialogType = 'gridOptions' | 'columnGroups' | 'conditionalFormatting';

// Dialog data interfaces
export interface GridOptionsDialogData {
  currentOptions: Record<string, any>;
  profileName?: string;
}

export interface ColumnGroupsDialogData {
  columnGroups: any[];
  columnDefs: any[];
}

export interface ConditionalFormattingDialogData {
  rules: ConditionalRule[];
  availableColumns: Array<{ field: string; headerName: string; type?: string }>;
  availableVariables?: Record<string, any>;
}

/**
 * Helper class for main window (provider)
 */
export class MainWindowCommunicationHelper {
  private service: WindowCommunicationService;
  private dialogData: Map<DialogType, any> = new Map();
  
  constructor(viewId: string) {
    this.service = WindowCommunicationService.getInstance({
      windowType: 'auto',
      viewId,
      channelName: `main-window-${viewId}`
    });
  }
  
  async initialize(): Promise<void> {
    // Initialize as provider
    await this.service.initialize({ isProvider: true });
    
    // Register common handlers
    this.setupCommonHandlers();
  }
  
  private setupCommonHandlers(): void {
    // Grid Options handlers
    this.service.onMessage(DialogMessageType.GET_GRID_OPTIONS, () => {
      return this.dialogData.get('gridOptions') || {};
    });
    
    // Column Groups handlers
    this.service.onMessage(DialogMessageType.GET_COLUMN_GROUPS, () => {
      const data = this.dialogData.get('columnGroups') as ColumnGroupsDialogData;
      return data?.columnGroups || [];
    });
    
    this.service.onMessage(DialogMessageType.GET_COLUMN_DEFINITIONS, () => {
      const data = this.dialogData.get('columnGroups') as ColumnGroupsDialogData;
      return data?.columnDefs || [];
    });
    
    // Conditional Formatting handlers
    this.service.onMessage(DialogMessageType.GET_CONDITIONAL_RULES, () => {
      const data = this.dialogData.get('conditionalFormatting') as ConditionalFormattingDialogData;
      return data?.rules || [];
    });
    
    this.service.onMessage(DialogMessageType.GET_AVAILABLE_COLUMNS, () => {
      const data = this.dialogData.get('conditionalFormatting') as ConditionalFormattingDialogData;
      return data?.availableColumns || [];
    });
    
    this.service.onMessage(DialogMessageType.GET_AVAILABLE_VARIABLES, () => {
      const data = this.dialogData.get('conditionalFormatting') as ConditionalFormattingDialogData;
      return data?.availableVariables || {};
    });
  }
  
  /**
   * Set up data for a dialog before opening it
   */
  setDialogData(type: DialogType, data: any): void {
    this.dialogData.set(type, data);
  }
  
  /**
   * Register a handler for when dialog applies changes
   */
  onDialogApply<T>(type: DialogMessageType, handler: (data: T) => void | Promise<void>): void {
    this.service.onMessage(type, async (message) => {
      await handler(message.payload);
      return { success: true };
    });
  }
  
  /**
   * Clean up
   */
  async destroy(): Promise<void> {
    await this.service.destroy();
  }
}

/**
 * Helper class for dialog windows (client)
 */
export class DialogWindowCommunicationHelper {
  private service: WindowCommunicationService;
  private dialogType: DialogType;
  
  constructor(viewId: string, dialogType: DialogType, usePortalMode: boolean = false) {
    this.dialogType = dialogType;
    this.service = WindowCommunicationService.getInstance({
      windowType: usePortalMode ? 'portal' : 'standalone',
      viewId,
      channelName: `main-window-${viewId}`
    });
  }
  
  /**
   * Initialize for portal mode (direct callbacks)
   */
  async initializePortal(callbacks: {
    onApply?: (data: any) => void;
    onClose?: () => void;
    getData?: () => any;
  }): Promise<void> {
    const directCallbacks: Record<string, any> = {};
    
    // Map callbacks based on dialog type
    if (this.dialogType === 'gridOptions' && callbacks.getData) {
      directCallbacks[DialogMessageType.GET_GRID_OPTIONS] = callbacks.getData;
    }
    
    if (this.dialogType === 'columnGroups' && callbacks.getData) {
      directCallbacks[DialogMessageType.GET_COLUMN_GROUPS] = callbacks.getData;
    }
    
    if (this.dialogType === 'conditionalFormatting' && callbacks.getData) {
      directCallbacks[DialogMessageType.GET_CONDITIONAL_RULES] = callbacks.getData;
    }
    
    if (callbacks.onClose) {
      directCallbacks[DialogMessageType.CLOSE_DIALOG] = callbacks.onClose;
    }
    
    await this.service.initialize({ directCallbacks });
  }
  
  /**
   * Initialize for standalone mode (IAB)
   */
  async initializeStandalone(): Promise<void> {
    await this.service.initialize({ isProvider: false });
  }
  
  /**
   * Get initial data based on dialog type
   */
  async getInitialData(): Promise<any> {
    switch (this.dialogType) {
      case 'gridOptions':
        return this.service.sendMessage(DialogMessageType.GET_GRID_OPTIONS);
        
      case 'columnGroups':
        const [groups, defs] = await Promise.all([
          this.service.sendMessage(DialogMessageType.GET_COLUMN_GROUPS),
          this.service.sendMessage(DialogMessageType.GET_COLUMN_DEFINITIONS)
        ]);
        return { columnGroups: groups, columnDefs: defs };
        
      case 'conditionalFormatting':
        const [rules, columns, variables] = await Promise.all([
          this.service.sendMessage(DialogMessageType.GET_CONDITIONAL_RULES),
          this.service.sendMessage(DialogMessageType.GET_AVAILABLE_COLUMNS),
          this.service.sendMessage(DialogMessageType.GET_AVAILABLE_VARIABLES)
        ]);
        return { rules, columns, variables };
        
      default:
        throw new Error(`Unknown dialog type: ${this.dialogType}`);
    }
  }
  
  /**
   * Apply changes
   */
  async applyChanges(data: any): Promise<void> {
    let messageType: DialogMessageType;
    
    switch (this.dialogType) {
      case 'gridOptions':
        messageType = DialogMessageType.APPLY_GRID_OPTIONS;
        break;
      case 'columnGroups':
        messageType = DialogMessageType.APPLY_COLUMN_GROUPS;
        break;
      case 'conditionalFormatting':
        messageType = DialogMessageType.APPLY_CONDITIONAL_RULES;
        break;
      default:
        throw new Error(`Unknown dialog type: ${this.dialogType}`);
    }
    
    await this.service.sendMessage(messageType, data);
  }
  
  /**
   * Close the dialog
   */
  async close(): Promise<void> {
    try {
      await this.service.sendMessage(DialogMessageType.CLOSE_DIALOG);
    } catch (error) {
      // If communication fails, try direct window close
      if (typeof fin !== 'undefined' && fin.me) {
        try {
          await fin.me.close();
        } catch {
          window.close();
        }
      } else {
        window.close();
      }
    }
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.service.isConnected();
  }
  
  /**
   * Get communication mode
   */
  getCommunicationMode(): string {
    return this.service.getCommunicationMode();
  }
  
  /**
   * Clean up
   */
  async destroy(): Promise<void> {
    await this.service.destroy();
  }
}

// Export convenience functions for common patterns
export function createMainWindowHelper(viewId: string): MainWindowCommunicationHelper {
  return new MainWindowCommunicationHelper(viewId);
}

export function createDialogHelper(
  viewId: string, 
  dialogType: DialogType,
  usePortalMode: boolean = false
): DialogWindowCommunicationHelper {
  return new DialogWindowCommunicationHelper(viewId, dialogType, usePortalMode);
}