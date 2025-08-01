import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
// import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  // Database
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
  // onInferFields,
  testing,
  // inferring,
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
    <div className="h-full flex flex-col bg-[#1a1a1a]">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          {/* Basic Configuration */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-gray-400 uppercase tracking-wider">BASIC CONFIGURATION</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-normal text-gray-300 mb-2">Datasource Name *</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={handleChange('name')}
                  placeholder="My STOMP Datasource"
                  className="mt-1.5 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <Label htmlFor="websocket-url" className="text-sm font-normal text-gray-300 mb-2">WebSocket URL *</Label>
                <Input
                  id="websocket-url"
                  value={config.websocketUrl}
                  onChange={handleChange('websocketUrl')}
                  placeholder="ws://localhost:8080"
                  className="mt-1.5 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Request Configuration */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-gray-400 uppercase tracking-wider">REQUEST CONFIGURATION</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data-type" className="text-sm font-normal text-gray-300 mb-2">Data Type *</Label>
                  <select
                    id="data-type"
                    value={config.dataType || 'positions'}
                    onChange={(e) => onChange({ dataType: e.target.value as 'positions' | 'trades' })}
                    className="mt-1.5 w-full h-10 rounded-md border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
                  >
                    <option value="positions">Positions</option>
                    <option value="trades">Trades</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="message-rate" className="text-sm font-normal text-gray-300 mb-2">Message Rate *</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="message-rate"
                      type="number"
                      value={config.messageRate || 1000}
                      onChange={handleNumberChange('messageRate')}
                      placeholder="1000"
                      min="100"
                      max="50000"
                      className="pr-16 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">msg/s</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batch-size" className="text-sm font-normal text-gray-300 mb-2">Batch Size (optional)</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    value={config.batchSize || ''}
                    onChange={handleNumberChange('batchSize')}
                    placeholder="Auto (rate/10)"
                    min="10"
                    max="1000"
                    className="mt-1.5 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="manual-topics"
                    checked={config.manualTopics || false}
                    onCheckedChange={handleCheckboxChange('manualTopics')}
                    className="border-[#3a3a3a] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label
                    htmlFor="manual-topics"
                    className="text-sm font-normal text-gray-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Configure topics manually
                  </label>
                </div>
                
                {config.manualTopics ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="listener-topic" className="text-sm font-normal text-gray-300 mb-2">Listener Topic</Label>
                      <Input
                        id="listener-topic"
                        value={config.listenerTopic || ''}
                        onChange={handleChange('listenerTopic')}
                        placeholder="/snapshot/positions/[client-id]"
                        className="mt-1.5 font-mono text-sm bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <Label htmlFor="request-message" className="text-sm font-normal text-gray-300 mb-2">Trigger Topic</Label>
                      <Input
                        id="request-message"
                        value={config.requestMessage || ''}
                        onChange={handleChange('requestMessage')}
                        placeholder="/snapshot/positions/[client-id]/1000/50"
                        className="mt-1.5 font-mono text-sm bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="rounded-lg bg-[#242424] border border-[#3a3a3a] p-3">
                      <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Template Variables</Label>
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <div><code className="bg-[#1a1a1a] px-1 py-0.5 rounded text-blue-400">[variable]</code> - Replaced with variable-UUID</div>
                        <div><code className="bg-[#1a1a1a] px-1 py-0.5 rounded text-blue-400">{`{datasource.variable}`}</code> - Replaced with datasource value</div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Example: <code className="bg-[#1a1a1a] px-1 py-0.5 rounded text-blue-400">{`{AppVariables.ds.Environment}`}</code> → production
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#242424] border border-[#3a3a3a] p-3">
                    <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Auto-Generated Configuration</Label>
                    <div className="mt-2 space-y-1 font-mono text-xs text-gray-300">
                      <div>Listener: /snapshot/{config.dataType || 'positions'}/[auto-generated-id]</div>
                      <div>Trigger: /snapshot/{config.dataType || 'positions'}/[auto-generated-id]/{config.messageRate || 1000}{config.batchSize ? `/${config.batchSize}` : ''}</div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      A unique client ID will be generated automatically on each connection
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Configuration */}
          <div>
            <h3 className="text-xs font-semibold mb-4 text-gray-400 uppercase tracking-wider">DATA CONFIGURATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="snapshot-token" className="text-sm font-normal text-gray-300 mb-2">Snapshot End Token</Label>
                <Input
                  id="snapshot-token"
                  value={config.snapshotEndToken}
                  onChange={handleChange('snapshotEndToken')}
                  placeholder="Success"
                  className="mt-1.5 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <Label htmlFor="key-column" className="text-sm font-normal text-gray-300 mb-2">Key Column</Label>
                <Input
                  id="key-column"
                  value={config.keyColumn}
                  onChange={handleChange('keyColumn')}
                  placeholder="id"
                  className="mt-1.5 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="snapshot-timeout" className="text-sm font-normal text-gray-300 mb-2">Snapshot Timeout</Label>
              <div className="relative mt-1.5">
                <Input
                  id="snapshot-timeout"
                  type="number"
                  value={config.snapshotTimeoutMs || 30000}
                  onChange={handleNumberChange('snapshotTimeoutMs')}
                  placeholder="30000"
                  min="10000"
                  max="600000"
                  className="pr-12 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">ms</span>
              </div>
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