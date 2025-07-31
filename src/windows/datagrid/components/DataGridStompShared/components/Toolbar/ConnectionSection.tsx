import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { ProviderSelector } from "@/windows/datatable/components/ProviderSelector";

interface ConnectionSectionProps {
  selectedProviderId: string | null;
  isConnected: boolean;
  onProviderChange: (providerId: string | null) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const ConnectionSection = React.memo<ConnectionSectionProps>(({
  selectedProviderId,
  isConnected,
  onProviderChange,
  onConnect,
  onDisconnect
}) => {
  return (
    <>
      <ProviderSelector
        value={selectedProviderId}
        onChange={onProviderChange}
      />
      
      <Button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={!selectedProviderId}
        variant={isConnected ? "destructive" : "default"}
        size="sm"
        className="gap-2"
      >
        {isConnected ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {isConnected ? 'Stop' : 'Start'}
      </Button>
    </>
  );
});