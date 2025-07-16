import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Database
} from 'lucide-react';

interface ConnectionTabProps {
  config: any;
  onChange: (updates: any) => void;
  onTest: () => void;
  onInferFields: () => void;
  testing: boolean;
  inferring: boolean;
  testResult: any;
  testError: string;
}

export function ConnectionTab({ 
  config, 
  onChange, 
  onTest, 
  onInferFields,
  testing,
  inferring,
  testResult,
  testError
}: ConnectionTabProps) {
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: e.target.value });
  };
  
  const handleNumberChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: parseInt(e.target.value) || 0 });
  };
  
  const handleCheckboxChange = (field: string) => (checked: boolean) => {
    onChange({ [field]: checked });
  };
  
  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Basic Configuration */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">BASIC CONFIGURATION</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-normal">Datasource Name *</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={handleChange('name')}
                  placeholder="My STOMP Datasource"
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="websocket-url" className="text-sm font-normal">WebSocket URL *</Label>
                  <Input
                    id="websocket-url"
                    value={config.websocketUrl}
                    onChange={handleChange('websocketUrl')}
                    placeholder="ws://localhost:8080"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="listener-topic" className="text-sm font-normal">Listener Topic *</Label>
                  <Input
                    id="listener-topic"
                    value={config.listenerTopic}
                    onChange={handleChange('listenerTopic')}
                    placeholder="/snapshot/positions"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="updates-topic" className="text-sm font-normal">Updates Topic (optional)</Label>
              <Input
                id="updates-topic"
                value={config.updatesTopic || ''}
                onChange={handleChange('updatesTopic')}
                placeholder="Leave empty to use same as Listener Topic"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Some STOMP servers send real-time updates on a different topic than the snapshot
              </p>
            </div>
          </div>

          {/* Request Configuration */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">REQUEST CONFIGURATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="request-destination" className="text-sm font-normal">Destination</Label>
                <Input
                  id="request-destination"
                  value={config.requestMessage}
                  onChange={handleChange('requestMessage')}
                  placeholder="/snapshot/positions/5000/100"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="request-body" className="text-sm font-normal">Body</Label>
                <Input
                  id="request-body"
                  value={config.requestBody}
                  onChange={handleChange('requestBody')}
                  placeholder="TriggerTopic"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Data Configuration */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">DATA CONFIGURATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="snapshot-token" className="text-sm font-normal">Snapshot End Token</Label>
                <Input
                  id="snapshot-token"
                  value={config.snapshotEndToken}
                  onChange={handleChange('snapshotEndToken')}
                  placeholder="Success"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="key-column" className="text-sm font-normal">Key Column</Label>
                <Input
                  id="key-column"
                  value={config.keyColumn}
                  onChange={handleChange('keyColumn')}
                  placeholder="id"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="snapshot-timeout" className="text-sm font-normal">Snapshot Timeout</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="snapshot-timeout"
                    type="number"
                    value={config.snapshotTimeoutMs}
                    onChange={handleNumberChange('snapshotTimeoutMs')}
                    placeholder="60000"
                    min="10000"
                    max="600000"
                    className="pr-12 bg-background"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ms</span>
                </div>
              </div>
              {config.listenerTopic?.includes('/snapshot/') && (
                <div>
                  <Label htmlFor="message-rate" className="text-sm font-normal">Message Rate</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="message-rate"
                      type="number"
                      value={config.messageRate}
                      onChange={handleChange('messageRate')}
                      placeholder="1000"
                      className="pr-16 bg-background"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">msg/s</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">OPTIONS</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-start"
                checked={config.autoStart}
                onCheckedChange={handleCheckboxChange('autoStart')}
              />
              <label
                htmlFor="auto-start"
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Auto-start on application load
              </label>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      {/* Footer with buttons */}
      <div className="p-6 border-t dialog-footer flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={onTest}
              disabled={testing || !config.websocketUrl}
              className=""
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Test Connection
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>

            {testResult && testResult.success && (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Connected successfully
              </div>
            )}

            {testError && (
              <div className="flex items-center text-sm text-red-600">
                <AlertCircle className="mr-1.5 h-4 w-4" />
                <span className="line-clamp-1">{testError}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Cancel
            </Button>
            <Button variant="default" className="update-button" onClick={() => {
              // This will be handled by the parent component
              const event = new CustomEvent('updateDatasource');
              window.dispatchEvent(event);
            }}>
              Update Datasource
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}