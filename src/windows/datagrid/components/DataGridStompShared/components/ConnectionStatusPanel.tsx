import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { IStatusPanel, IStatusPanelParams } from 'ag-grid-community';

interface ConnectionStatusPanelProps extends IStatusPanelParams {
  connectionState?: any;
  snapshotData?: any;
}

export const ConnectionStatusPanel = forwardRef<IStatusPanel, ConnectionStatusPanelProps>((props, ref) => {
  const [refreshCount, setRefreshCount] = useState(0);
  
  // Implement IStatusPanel interface
  useImperativeHandle(ref, () => ({
    init: (params: IStatusPanelParams) => {
      // Store params if needed
    },
    destroy: () => {
      // Cleanup if needed
    },
    refresh: () => {
      // Force component to re-render when AG-Grid requests a refresh
      setRefreshCount(prev => prev + 1);
    }
  }));
  
  // Get context from grid API
  const context = props.api?.getContext?.() || {};
  const connectionState = context.connectionState || props.connectionState || { isConnected: false };
  const snapshotData = context.snapshotData || props.snapshotData || { mode: 'idle', messageCount: 0 };
  
  const { isConnected } = connectionState;
  const { mode, messageCount } = snapshotData;
  
  return (
    <div className="ag-status-panel ag-status-panel-connection">
      <span className="ag-status-name-value">
        <span className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isConnected ? (
            <>
              <span>Connected</span>
              <span className="mx-1">•</span>
              <span>{messageCount.toLocaleString()} messages</span>
              {mode !== 'idle' && (
                <>
                  <span className="mx-1">•</span>
                  <span className="capitalize">{mode}</span>
                </>
              )}
            </>
          ) : (
            'Disconnected'
          )}
        </span>
      </span>
    </div>
  );
});