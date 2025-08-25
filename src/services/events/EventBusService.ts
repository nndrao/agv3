/**
 * Event Bus Service
 * 
 * Subscribes to OpenFin platform/workspace events and forwards them
 * to components through a unified event bus interface
 */

import { EventEmitter } from 'events';
import { EventBus, ThemeInfo, ProviderError } from '../openfin/ServiceContext';

export class EventBusService extends EventEmitter implements EventBus {
  private static instance: EventBusService | null = null;
  private isInitialized = false;
  private subscriptions: Array<() => void> = [];
  private platform: any = null;
  private workspace: any = null;

  private constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for multiple subscriptions
  }

  /**
   * Get or create singleton instance
   */
  static async getInstance(): Promise<EventBusService> {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
      await EventBusService.instance.initialize();
    }
    return EventBusService.instance;
  }

  /**
   * Initialize event subscriptions
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if we're in OpenFin environment
      if (typeof fin === 'undefined') {
        console.warn('[EventBusService] Not in OpenFin environment, running in limited mode');
        this.isInitialized = true;
        return;
      }

      // Get platform and workspace references
      this.platform = fin.Platform.getCurrentSync();
      
      // Try to get workspace if available
      try {
        if (fin.me && fin.me.isWindow) {
          const win = await fin.Window.getCurrent();
          const options = await win.getOptions();
          if (options.workspacePlatform) {
            this.workspace = await fin.Workspace.getInstance();
          }
        }
      } catch (err) {
        console.log('[EventBusService] Workspace API not available');
      }

      // Subscribe to various events
      await this.subscribeToWorkspaceEvents();
      await this.subscribeToThemeEvents();
      await this.subscribeToWindowEvents();
      await this.subscribeToViewEvents();
      await this.subscribeToChannelEvents();

      this.isInitialized = true;
      console.log('[EventBusService] Initialized successfully');
    } catch (error) {
      console.error('[EventBusService] Failed to initialize:', error);
      this.isInitialized = true; // Mark as initialized even on error to prevent retry
    }
  }

  /**
   * Subscribe to workspace events
   */
  private async subscribeToWorkspaceEvents(): Promise<void> {
    if (!this.workspace) return;

    try {
      // Workspace save/load events
      const workspaceEventTypes = [
        'workspace-saving',
        'workspace-saved',
        'workspace-loading',
        'workspace-loaded',
        'workspace-closed'
      ];

      for (const eventType of workspaceEventTypes) {
        this.workspace.addEventListener(eventType, (event: any) => {
          this.handleWorkspaceEvent(eventType, event);
        });
      }

      console.log('[EventBusService] Subscribed to workspace events');
    } catch (error) {
      console.warn('[EventBusService] Failed to subscribe to workspace events:', error);
    }
  }

  /**
   * Handle workspace events
   */
  private handleWorkspaceEvent(eventType: string, event: any): void {
    switch (eventType) {
      case 'workspace-saving':
        this.emit('workspace:saving');
        break;
      case 'workspace-saved':
        this.emit('workspace:saved', event.workspace);
        break;
      case 'workspace-loading':
        this.emit('workspace:loading');
        break;
      case 'workspace-loaded':
        this.emit('workspace:loaded', event.workspace);
        break;
      case 'workspace-closed':
        this.emit('workspace:closed', event.workspace);
        break;
    }
  }

  /**
   * Subscribe to theme events
   */
  private async subscribeToThemeEvents(): Promise<void> {
    try {
      // Listen for theme changes via IAB
      const themeChannel = 'agv3-theme-events';
      
      fin.InterApplicationBus.subscribe(
        { uuid: '*' },
        themeChannel,
        (message: any) => {
          if (message.type === 'theme-changed') {
            this.emit('theme:changed', message.theme as ThemeInfo);
            this.emit('theme:toggled', message.theme.mode === 'dark');
          }
        }
      );

      // Also listen for system theme changes
      if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addEventListener('change', (e) => {
          this.emit('theme:toggled', e.matches);
        });
      }

      console.log('[EventBusService] Subscribed to theme events');
    } catch (error) {
      console.warn('[EventBusService] Failed to subscribe to theme events:', error);
    }
  }

  /**
   * Subscribe to window events
   */
  private async subscribeToWindowEvents(): Promise<void> {
    if (!fin.me || (!fin.me.isWindow && !fin.me.isView)) return;

    try {
      const target = fin.me.isWindow ? await fin.Window.getCurrent() : await fin.View.getCurrent();
      
      // Window/View lifecycle events
      target.on('shown', () => this.emit('window:shown'));
      target.on('hidden', () => this.emit('window:hidden'));
      target.on('closed', () => this.emit('window:closed'));
      
      if (fin.me && fin.me.isWindow) {
        const window = target as any;
        window.on('minimized', () => this.emit('window:minimized'));
        window.on('maximized', () => this.emit('window:maximized'));
        window.on('restored', () => this.emit('window:restored'));
      }

      console.log('[EventBusService] Subscribed to window events');
    } catch (error) {
      console.warn('[EventBusService] Failed to subscribe to window events:', error);
    }
  }

  /**
   * Subscribe to view events (tabs)
   */
  private async subscribeToViewEvents(): Promise<void> {
    if (!fin.me || !fin.me.isView) return;

    try {
      const view = await fin.View.getCurrent();
      
      // Tab events
      view.on('target-changed', (event: any) => {
        if (event.type === 'view-attached') {
          this.emit('tab:attached', event);
        } else if (event.type === 'view-detached') {
          this.emit('tab:detached', event);
        }
      });

      // Listen for tab rename via IAB
      fin.InterApplicationBus.subscribe(
        { uuid: fin.me?.uuid || '*' },
        'tab-events',
        (message: any) => {
          switch (message.type) {
            case 'tab-renamed':
              this.emit('tab:renamed', {
                oldName: message.oldName,
                newName: message.newName
              });
              break;
            case 'tab-selected':
              this.emit('tab:selected', message.tabId);
              break;
            case 'tab-closed':
              this.emit('tab:closed', message.tabId);
              break;
          }
        }
      );

      console.log('[EventBusService] Subscribed to view events');
    } catch (error) {
      console.warn('[EventBusService] Failed to subscribe to view events:', error);
    }
  }

  /**
   * Subscribe to channel events (for profile and provider updates)
   */
  private async subscribeToChannelEvents(): Promise<void> {
    try {
      // Profile events
      fin.InterApplicationBus.subscribe(
        { uuid: '*' },
        'profile-events',
        (message: any) => {
          switch (message.type) {
            case 'profile-changed':
              this.emit('profile:changed', message.profile);
              break;
            case 'profile-saved':
              this.emit('profile:saved', message.profile);
              break;
            case 'profile-deleted':
              this.emit('profile:deleted', message.profileId);
              break;
          }
        }
      );

      // Provider events
      fin.InterApplicationBus.subscribe(
        { uuid: '*' },
        'provider-events',
        (message: any) => {
          switch (message.type) {
            case 'provider-connected':
              this.emit('provider:connected', message.providerId);
              break;
            case 'provider-disconnected':
              this.emit('provider:disconnected', message.providerId);
              break;
            case 'provider-error':
              this.emit('provider:error', {
                providerId: message.providerId,
                error: new Error(message.error),
                timestamp: new Date(message.timestamp),
                recoverable: message.recoverable
              } as ProviderError);
              break;
          }
        }
      );

      console.log('[EventBusService] Subscribed to channel events');
    } catch (error) {
      console.warn('[EventBusService] Failed to subscribe to channel events:', error);
    }
  }

  /**
   * Emit an event to IAB for cross-window communication
   */
  async broadcast(channel: string, event: string, data: any): Promise<void> {
    try {
      await fin.InterApplicationBus.publish(channel, {
        type: event,
        data,
        source: fin.me?.identity || { uuid: '*', name: 'unknown' },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`[EventBusService] Failed to broadcast ${event} on ${channel}:`, error);
    }
  }

  /**
   * Clean up subscriptions
   */
  async destroy(): Promise<void> {
    // Remove all listeners
    this.removeAllListeners();

    // Clean up OpenFin subscriptions
    for (const unsubscribe of this.subscriptions) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('[EventBusService] Error during cleanup:', error);
      }
    }

    this.subscriptions = [];
    this.isInitialized = false;
    EventBusService.instance = null;

    console.log('[EventBusService] Destroyed');
  }

  /**
   * Helper to create a profile event
   */
  emitProfileEvent(type: 'changed' | 'saved' | 'deleted', data: any): void {
    const eventMap = {
      changed: 'profile:changed',
      saved: 'profile:saved',
      deleted: 'profile:deleted'
    };

    this.emit(eventMap[type], data);
    
    // Also broadcast to other windows
    this.broadcast('profile-events', `profile-${type}`, data);
  }

  /**
   * Helper to create a provider event
   */
  emitProviderEvent(type: 'connected' | 'disconnected' | 'error', providerId: string, error?: Error): void {
    const eventMap = {
      connected: 'provider:connected',
      disconnected: 'provider:disconnected',
      error: 'provider:error'
    };

    if (type === 'error' && error) {
      const providerError: ProviderError = {
        providerId,
        error,
        timestamp: new Date(),
        recoverable: false
      };
      this.emit(eventMap[type], providerError);
    } else {
      this.emit(eventMap[type], providerId);
    }

    // Also broadcast to other windows
    this.broadcast('provider-events', `provider-${type}`, {
      providerId,
      error: error?.message,
      timestamp: Date.now(),
      recoverable: false
    });
  }
}