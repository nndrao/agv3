import { IStatusPanel, IStatusPanelParams } from 'ag-grid-community';

// AG-Grid expects a class-based component for status panels
export class ConnectionStatusPanel implements IStatusPanel {
  private eGui: HTMLElement;
  private params: IStatusPanelParams;
  private messageCount: number = 0;
  private snapshotMode: string = 'idle';
  private isConnected: boolean = false;
  private eventListener: (() => void) | null = null;

  init(params: IStatusPanelParams): void {
    console.log('[RT-MSG-INIT] ConnectionStatusPanel init called');
    this.params = params;
    
    // Create the GUI element
    this.eGui = document.createElement('div');
    this.eGui.className = 'ag-status-panel ag-status-panel-connection';
    
    // Set up event listener for custom updates
    if (params.api) {
      this.eventListener = () => {
        console.log('[RT-MSG-014a] Event handler triggered');
        const customContext = (params.api as any)._customContext || {};
        console.log('[RT-MSG-014b] Custom context in handler:', customContext);
        
        // Update connection state
        if (customContext.connectionState) {
          this.isConnected = customContext.connectionState.isConnected || false;
        }
        
        // Update snapshot data
        if (customContext.snapshotData) {
          this.messageCount = customContext.snapshotData.messageCount || 0;
          this.snapshotMode = customContext.snapshotData.mode || 'idle';
          console.log('[RT-MSG-014] Status panel updated via event - count:', this.messageCount);
        }
        
        this.refresh();
      };
      
      console.log('[RT-MSG-INIT2] Adding event listener for statusBarUpdate');
      params.api.addEventListener('statusBarUpdate', this.eventListener);
      
      // Initial update
      console.log('[RT-MSG-INIT3] Calling initial update');
      this.eventListener();
    } else {
      console.warn('[RT-MSG-INIT-ERROR] No API available in init');
    }
    
    // Initial render
    this.refresh();
  }

  getGui(): HTMLElement {
    return this.eGui;
  }

  destroy(): void {
    console.log('[ConnectionStatusPanel] destroy called');
    if (this.params.api && this.eventListener) {
      this.params.api.removeEventListener('statusBarUpdate', this.eventListener);
    }
  }

  refresh(): void {
    console.log('[RT-MSG-012] ConnectionStatusPanel Rendering - messageCount:', this.messageCount, 'mode:', this.snapshotMode);
    
    // Update the HTML
    this.eGui.innerHTML = `
      <span class="ag-status-name-value">
        <span style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${this.isConnected ? '#10b981' : '#9ca3af'}; ${this.isConnected ? 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : ''}"></div>
          ${this.isConnected ? `
            <span>Connected</span>
            <span style="margin: 0 4px;">•</span>
            <span>${this.messageCount.toLocaleString()} messages</span>
            ${this.snapshotMode !== 'idle' ? `
              <span style="margin: 0 4px;">•</span>
              <span style="text-transform: capitalize;">${this.snapshotMode}</span>
            ` : ''}
          ` : 'Disconnected'}
        </span>
      </span>
    `;
    
    // Add pulse animation CSS if not already added
    if (!document.getElementById('connection-status-panel-styles')) {
      const style = document.createElement('style');
      style.id = 'connection-status-panel-styles';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }
  }
}