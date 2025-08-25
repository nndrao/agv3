/**
 * Window Operations Service
 * 
 * Provides standard APIs for window/view operations in OpenFin
 */

import { WindowOperations } from '../openfin/ServiceContext';
import { v4 as uuidv4 } from 'uuid';

export class WindowOperationsService implements WindowOperations {
  private viewId: string;
  private windowId: string;
  private instanceId: string;
  private messageHandlers: Set<(message: any) => void> = new Set();
  private iabSubscription: any = null;
  private currentView: any = null;
  private currentWindow: any = null;

  constructor(viewId: string) {
    this.viewId = viewId;
    this.instanceId = viewId;
    this.windowId = '';
    this.initialize();
  }

  /**
   * Initialize the service
   */
  private async initialize(): Promise<void> {
    try {
      if (typeof fin === 'undefined') {
        console.warn('[WindowOperationsService] Not in OpenFin environment');
        return;
      }

      // Check if fin.me exists (it might not in some contexts)
      if (!fin.me) {
        // Try alternative methods to get current context
        try {
          // Try to get current window directly
          this.currentWindow = await fin.Window.getCurrent();
          if (this.currentWindow && this.currentWindow.identity) {
            this.windowId = this.currentWindow.identity.name;
          }
        } catch (e) {
          // Try to get current view directly
          try {
            this.currentView = await fin.View.getCurrent();
            if (this.currentView) {
              const viewInfo = await this.currentView.getInfo();
              this.windowId = viewInfo.target?.identity?.name || '';
            }
          } catch (viewError) {
            console.warn('[WindowOperationsService] Could not determine current context');
          }
        }
      } else {
        // Use fin.me if available
        if (fin.me.isView) {
          this.currentView = await fin.View.getCurrent();
          const viewInfo = await this.currentView.getInfo();
          this.windowId = viewInfo.target?.identity?.name || '';
        } else if (fin.me.isWindow) {
          this.currentWindow = await fin.Window.getCurrent();
          this.windowId = this.currentWindow.identity?.name || '';
        }
      }

      // Subscribe to inter-window messages
      this.subscribeToMessages();

      console.log('[WindowOperationsService] Initialized', {
        viewId: this.viewId,
        windowId: this.windowId,
        hasView: !!this.currentView,
        hasWindow: !!this.currentWindow
      });
    } catch (error) {
      console.error('[WindowOperationsService] Failed to initialize:', error);
    }
  }

  /**
   * Subscribe to inter-window messages
   */
  private subscribeToMessages(): void {
    if (typeof fin === 'undefined') return;

    try {
      // Subscribe to messages for this view
      this.iabSubscription = fin.InterApplicationBus.subscribe(
        { uuid: '*' },
        `window-message-${this.viewId}`,
        (message: any) => {
          // Notify all registered handlers
          this.messageHandlers.forEach(handler => {
            try {
              handler(message);
            } catch (error) {
              console.error('[WindowOperationsService] Message handler error:', error);
            }
          });
        }
      );

      // Also subscribe to broadcast messages
      fin.InterApplicationBus.subscribe(
        { uuid: '*' },
        'window-broadcast',
        (message: any) => {
          // Notify all registered handlers
          this.messageHandlers.forEach(handler => {
            try {
              handler(message);
            } catch (error) {
              console.error('[WindowOperationsService] Broadcast handler error:', error);
            }
          });
        }
      );
    } catch (error) {
      console.warn('[WindowOperationsService] Failed to subscribe to messages:', error);
    }
  }

  // ============================================================================
  // Tab Operations
  // ============================================================================

  async renameTab(name: string): Promise<void> {
    try {
      if (!this.currentView) {
        console.warn('[WindowOperationsService] No current view to rename');
        return;
      }

      // Update the view title
      await this.currentView.updateOptions({ title: name });

      // Save to localStorage for persistence
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`viewTitle_${this.viewId}`, name);
      }

      // Broadcast rename event
      await fin.InterApplicationBus.publish('tab-events', {
        type: 'tab-renamed',
        tabId: this.viewId,
        oldName: await this.getTabName(),
        newName: name,
        timestamp: Date.now()
      });

      console.log(`[WindowOperationsService] Tab renamed to: ${name}`);
    } catch (error) {
      console.error('[WindowOperationsService] Failed to rename tab:', error);
      throw error;
    }
  }

  getTabName(): string {
    // Try to get from localStorage first
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTitle = localStorage.getItem(`viewTitle_${this.viewId}`);
      if (savedTitle) return savedTitle;
    }

    // Return view ID as fallback
    return this.viewId;
  }

  // ============================================================================
  // Window Metadata
  // ============================================================================

  getViewId(): string {
    return this.viewId;
  }

  getWindowId(): string {
    return this.windowId;
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  // ============================================================================
  // Window State Operations
  // ============================================================================

  async minimize(): Promise<void> {
    try {
      if (this.currentWindow) {
        await this.currentWindow.minimize();
      } else if (this.currentView) {
        // Get parent window and minimize it
        const viewInfo = await this.currentView.getInfo();
        const parentWindow = await fin.Window.wrapSync(viewInfo.target);
        await parentWindow.minimize();
      }
    } catch (error) {
      console.error('[WindowOperationsService] Failed to minimize:', error);
      throw error;
    }
  }

  async maximize(): Promise<void> {
    try {
      if (this.currentWindow) {
        await this.currentWindow.maximize();
      } else if (this.currentView) {
        // Get parent window and maximize it
        const viewInfo = await this.currentView.getInfo();
        const parentWindow = await fin.Window.wrapSync(viewInfo.target);
        await parentWindow.maximize();
      }
    } catch (error) {
      console.error('[WindowOperationsService] Failed to maximize:', error);
      throw error;
    }
  }

  async restore(): Promise<void> {
    try {
      if (this.currentWindow) {
        await this.currentWindow.restore();
      } else if (this.currentView) {
        // Get parent window and restore it
        const viewInfo = await this.currentView.getInfo();
        const parentWindow = await fin.Window.wrapSync(viewInfo.target);
        await parentWindow.restore();
      }
    } catch (error) {
      console.error('[WindowOperationsService] Failed to restore:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.currentView) {
        // Close the view
        await this.currentView.close();
      } else if (this.currentWindow) {
        // Close the window
        await this.currentWindow.close();
      }

      // Broadcast close event
      await fin.InterApplicationBus.publish('tab-events', {
        type: 'tab-closed',
        tabId: this.viewId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[WindowOperationsService] Failed to close:', error);
      throw error;
    }
  }

  async focus(): Promise<void> {
    try {
      if (this.currentView) {
        await this.currentView.focus();
      } else if (this.currentWindow) {
        await this.currentWindow.focus();
        await this.currentWindow.bringToFront();
      }
    } catch (error) {
      console.error('[WindowOperationsService] Failed to focus:', error);
      throw error;
    }
  }

  // ============================================================================
  // Inter-Window Communication
  // ============================================================================

  async sendToWindow(targetId: string, message: any): Promise<void> {
    try {
      if (typeof fin === 'undefined') {
        console.warn('[WindowOperationsService] Not in OpenFin environment');
        return;
      }

      // Send message to specific window/view
      await fin.InterApplicationBus.publish(`window-message-${targetId}`, {
        ...message,
        source: this.viewId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[WindowOperationsService] Failed to send message:', error);
      throw error;
    }
  }

  async broadcast(message: any): Promise<void> {
    try {
      if (typeof fin === 'undefined') {
        console.warn('[WindowOperationsService] Not in OpenFin environment');
        return;
      }

      // Broadcast message to all windows
      await fin.InterApplicationBus.publish('window-broadcast', {
        ...message,
        source: this.viewId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[WindowOperationsService] Failed to broadcast message:', error);
      throw error;
    }
  }

  onMessage(callback: (message: any) => void): () => void {
    // Add handler
    this.messageHandlers.add(callback);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(callback);
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get current bounds of the window/view
   */
  async getBounds(): Promise<{ top: number; left: number; width: number; height: number }> {
    try {
      if (this.currentWindow) {
        return await this.currentWindow.getBounds();
      } else if (this.currentView) {
        return await this.currentView.getBounds();
      }
      return { top: 0, left: 0, width: 0, height: 0 };
    } catch (error) {
      console.error('[WindowOperationsService] Failed to get bounds:', error);
      return { top: 0, left: 0, width: 0, height: 0 };
    }
  }

  /**
   * Set bounds of the window/view
   */
  async setBounds(bounds: { top?: number; left?: number; width?: number; height?: number }): Promise<void> {
    try {
      if (this.currentWindow) {
        await this.currentWindow.setBounds(bounds);
      } else if (this.currentView) {
        await this.currentView.setBounds(bounds);
      }
    } catch (error) {
      console.error('[WindowOperationsService] Failed to set bounds:', error);
      throw error;
    }
  }

  /**
   * Show developer tools
   */
  async showDeveloperTools(): Promise<void> {
    try {
      if (this.currentView) {
        await this.currentView.showDeveloperTools();
      } else if (this.currentWindow) {
        await this.currentWindow.showDeveloperTools();
      }
    } catch (error) {
      console.error('[WindowOperationsService] Failed to show developer tools:', error);
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    try {
      if (this.currentView) {
        await this.currentView.navigate(url);
      } else if (this.currentWindow) {
        await this.currentWindow.navigate(url);
      }
    } catch (error) {
      console.error('[WindowOperationsService] Failed to navigate:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear message handlers
    this.messageHandlers.clear();

    // Unsubscribe from IAB if needed
    if (this.iabSubscription) {
      try {
        // OpenFin doesn't provide a direct unsubscribe method for IAB
        // The subscription will be cleaned up when the window closes
      } catch (error) {
        console.warn('[WindowOperationsService] Error during cleanup:', error);
      }
    }

    console.log('[WindowOperationsService] Destroyed');
  }
}