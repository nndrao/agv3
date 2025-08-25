import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConnectionState } from '../types';

interface ConnectionManagerProps {
  // Connection state
  connectionState: ConnectionState;
  selectedProviderId: string | null;
  availableProviders: Array<{ id: string; name: string }>;
  
  // Connection operations
  onProviderChange: (providerId: string | null) => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  
  // UI state
  isConnecting?: boolean;
  connectionError?: string;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  connectionState,
  selectedProviderId,
  availableProviders,
  onProviderChange,
  onConnect,
  onDisconnect,
  isConnecting = false,
  connectionError
}) => {
  const [localConnecting, setLocalConnecting] = useState(false);
  
  const handleConnect = useCallback(async () => {
    if (!selectedProviderId) return;
    
    setLocalConnecting(true);
    try {
      await onConnect();
    } finally {
      setLocalConnecting(false);
    }
  }, [selectedProviderId, onConnect]);
  
  const handleDisconnect = useCallback(async () => {
    setLocalConnecting(true);
    try {
      await onDisconnect();
    } finally {
      setLocalConnecting(false);
    }
  }, [onDisconnect]);
  
  const isProcessing = isConnecting || localConnecting;
  
  return (
    <div className="flex items-center gap-2">
      {/* Provider Selection */}
      <Select
        value={selectedProviderId || ''}
        onValueChange={onProviderChange}
        disabled={connectionState.isConnected || isProcessing}
      >
        <SelectTrigger className="w-[200px] h-8 text-xs">
          <SelectValue placeholder="Select Provider" />
        </SelectTrigger>
        <SelectContent>
          {availableProviders.map(provider => (
            <SelectItem key={provider.id} value={provider.id}>
              {provider.name}
            </SelectItem>
          ))}
          {availableProviders.length === 0 && (
            <SelectItem value="none" disabled>
              No providers available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      
      {/* Connection Button */}
      {connectionState.isConnected ? (
        <Button
          onClick={handleDisconnect}
          disabled={isProcessing}
          variant="destructive"
          size="sm"
          className="h-8 px-3 text-xs"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Disconnecting...
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Disconnect
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={!selectedProviderId || isProcessing}
          variant="default"
          size="sm"
          className="h-8 px-3 text-xs"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wifi className="h-3 w-3 mr-1" />
              Connect
            </>
          )}
        </Button>
      )}
      
      {/* Connection Status */}
      {connectionState.isConnected && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">Connected</span>
        </div>
      )}
      
      {/* Error Message */}
      {connectionError && !connectionState.isConnected && (
        <span className="text-xs text-red-500">
          {connectionError}
        </span>
      )}
    </div>
  );
};