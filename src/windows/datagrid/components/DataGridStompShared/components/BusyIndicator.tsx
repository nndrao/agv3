import React from 'react';
import { Loader2 } from "lucide-react";
import { BusyIndicatorProps } from '../types';
import { SNAPSHOT_MODES } from '../config/constants';

export const BusyIndicator = React.memo<BusyIndicatorProps>(({ mode, messageCount }) => {
  if (mode !== SNAPSHOT_MODES.REQUESTING && mode !== SNAPSHOT_MODES.RECEIVING) {
    return null;
  }
  
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-lg font-medium">
            {mode === SNAPSHOT_MODES.REQUESTING ? 'Waiting for snapshot...' : 'Receiving snapshot data...'}
          </p>
          <p className="text-sm text-muted-foreground">
            {mode === SNAPSHOT_MODES.REQUESTING 
              ? 'The shared connection is loading the data' 
              : `${messageCount} rows received`}
          </p>
        </div>
      </div>
    </div>
  );
});