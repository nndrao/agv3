import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WindowManager } from '@/services/window/windowManager';
import { Grid3X3, Plus, RefreshCw } from 'lucide-react';

export function DataGridInstanceTest() {
  const [instances, setInstances] = useState<Array<{id: string; name: string; type: string; createdAt: string}>>([]);
  const [lastAction, setLastAction] = useState<string>('');

  const refreshInstances = () => {
    const currentInstances = WindowManager.getDataGridStompInstances();
    setInstances(currentInstances);
    setLastAction(`Refreshed: Found ${currentInstances.length} instances`);
  };

  const createDefaultInstance = async () => {
    await WindowManager.openDataGridStomp();
    setLastAction('Created default instance');
    refreshInstances();
  };

  const createNamedInstance = async (name: string) => {
    await WindowManager.openDataGridStomp(name);
    setLastAction(`Created named instance: ${name}`);
    refreshInstances();
  };

  const testMultipleInstances = async () => {
    // Create multiple instances with different names
    await WindowManager.openDataGridStomp('Trading View');
    await WindowManager.openDataGridStomp('Risk Monitor');
    await WindowManager.openDataGridStomp('Market Data');
    await WindowManager.openDataGridStomp(); // Default instance
    
    setLastAction('Created 4 test instances');
    refreshInstances();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">DataGrid Instance Management Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
          <CardDescription>
            Create and manage multiple DataGridStomp instances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={createDefaultInstance} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Default Instance
            </Button>
            
            <Button onClick={() => createNamedInstance('Trading View')} variant="outline">
              Create "Trading View"
            </Button>
            
            <Button onClick={() => createNamedInstance('Risk Monitor')} variant="outline">
              Create "Risk Monitor"
            </Button>
            
            <Button onClick={() => createNamedInstance('Market Data')} variant="outline">
              Create "Market Data"
            </Button>
            
            <Button onClick={testMultipleInstances} variant="default">
              <Grid3X3 className="mr-2 h-4 w-4" />
              Create All Test Instances
            </Button>
            
            <Button onClick={refreshInstances} variant="secondary">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh List
            </Button>
          </div>
          
          {lastAction && (
            <div className="p-3 bg-muted rounded-md text-sm">
              Last action: {lastAction}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Active Instances ({instances.length})</CardTitle>
          <CardDescription>
            Each instance has its own unique ID and profile storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <p className="text-muted-foreground">No instances found. Create some above!</p>
          ) : (
            <div className="space-y-2">
              {instances.map((instance) => (
                <div key={instance.id} className="p-3 border rounded-lg">
                  <div className="font-medium">{instance.name}</div>
                  <div className="text-sm text-muted-foreground">ID: {instance.id}</div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(instance.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs mt-2 p-2 bg-muted rounded font-mono">
                    Profile Storage Key: {instance.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Each DataGridStomp instance gets a unique, stable ID</p>
          <p>2. Named instances use deterministic IDs (e.g., "datagrid-stomp-trading-view")</p>
          <p>3. Default instances use numbered IDs (e.g., "datagrid-stomp-instance-1")</p>
          <p>4. Profiles are stored using the instance ID as the key</p>
          <p>5. Opening the same named instance will reuse the existing ID</p>
          <p>6. Each instance maintains completely separate configurations</p>
        </CardContent>
      </Card>
    </div>
  );
}