import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WindowManager } from '@/services/window/windowManager';
import { Plus, Grid3X3 } from 'lucide-react';

interface DataGridInstance {
  id: string;
  name: string;
  createdAt: string;
}

export function DataGridStompManager() {
  const [instances, setInstances] = useState<DataGridInstance[]>([]);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [showNewInstance, setShowNewInstance] = useState(false);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = () => {
    const storedInstances = WindowManager.getDataGridStompInstances();
    setInstances(storedInstances);
  };

  const createNewInstance = async () => {
    if (newInstanceName.trim()) {
      await WindowManager.openDataGridStomp(newInstanceName.trim());
      setNewInstanceName('');
      setShowNewInstance(false);
      loadInstances();
    }
  };

  const openInstance = async (instanceName: string) => {
    await WindowManager.openDataGridStomp(instanceName);
  };

  const createDefaultInstance = async () => {
    await WindowManager.openDataGridStomp();
    loadInstances();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          DataGrid STOMP Instances
        </CardTitle>
        <CardDescription>
          Manage multiple DataGrid STOMP views with independent configurations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Instance list */}
          <div className="space-y-2">
            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No instances created yet</p>
            ) : (
              instances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                  onClick={() => openInstance(instance.name)}
                >
                  <div>
                    <h4 className="font-medium">{instance.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      ID: {instance.id}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add delete functionality
                    }}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Create new instance */}
          {showNewInstance ? (
            <div className="flex gap-2">
              <Input
                placeholder="Instance name (e.g., Trading View)"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    createNewInstance();
                  }
                }}
                autoFocus
              />
              <Button onClick={createNewInstance} disabled={!newInstanceName.trim()}>
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewInstance(false);
                  setNewInstanceName('');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowNewInstance(true)}
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Named Instance
              </Button>
              <Button
                onClick={createDefaultInstance}
                variant="outline"
                className="gap-2"
              >
                <Grid3X3 className="h-4 w-4" />
                New Instance
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}