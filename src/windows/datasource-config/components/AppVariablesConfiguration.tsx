import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface AppVariablesConfigurationProps {
  config: any;
  onSave: (config: any) => void;
  onCancel: () => void;
}

export function AppVariablesConfiguration({ 
  config, 
  onSave, 
  onCancel 
}: AppVariablesConfigurationProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    id: config?.id || uuidv4(),
    name: config?.name || 'AppVariables.ds',
    type: 'variables',
    variables: config?.variables || {}
  });
  
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  
  const handleAddVariable = () => {
    if (!newKey.trim()) {
      toast({
        title: 'Invalid key',
        description: 'Variable key cannot be empty',
        variant: 'destructive'
      });
      return;
    }
    
    if (formData.variables[newKey]) {
      toast({
        title: 'Duplicate key',
        description: 'A variable with this key already exists',
        variant: 'destructive'
      });
      return;
    }
    
    setFormData({
      ...formData,
      variables: {
        ...formData.variables,
        [newKey]: newValue
      }
    });
    
    setNewKey('');
    setNewValue('');
  };
  
  const handleDeleteVariable = (key: string) => {
    const newVariables = { ...formData.variables };
    delete newVariables[key];
    
    setFormData({
      ...formData,
      variables: newVariables
    });
  };
  
  const handleEditVariable = (key: string, value: string) => {
    setFormData({
      ...formData,
      variables: {
        ...formData.variables,
        [key]: value
      }
    });
    setEditingKey(null);
    setEditingValue('');
  };
  
  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: 'Missing name',
        description: 'Please provide a name for the datasource',
        variant: 'destructive'
      });
      return;
    }
    
    // Ensure name ends with .ds
    if (!formData.name.endsWith('.ds')) {
      formData.name += '.ds';
    }
    
    onSave(formData);
  };
  
  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-white">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <Card className="bg-[#242424] border-[#3a3a3a]">
            <CardHeader>
              <CardTitle className="text-white">AppVariables Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                Define global variables that can be used in other datasource configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-300">Datasource Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="AppVariables.ds"
                  className="mt-1.5 bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Name should end with .ds to follow the convention
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#242424] border-[#3a3a3a]">
            <CardHeader>
              <CardTitle className="text-white">Variables</CardTitle>
              <CardDescription className="text-gray-400">
                Add key-value pairs that can be referenced using {`{${formData.name}.key}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Key"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
                    className="bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Input
                    placeholder="Value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
                    className="bg-[#2a2a2a] border-[#3a3a3a] text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleAddVariable}
                    className="bg-transparent border-[#3a3a3a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-gray-500"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {Object.keys(formData.variables).length > 0 && (
                  <div className="border border-[#3a3a3a] rounded-md bg-[#1a1a1a]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#3a3a3a] hover:bg-transparent">
                          <TableHead className="text-gray-300">Key</TableHead>
                          <TableHead className="text-gray-300">Value</TableHead>
                          <TableHead className="w-[100px] text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(formData.variables).map(([key, value]) => (
                          <TableRow key={key} className="border-[#3a3a3a] hover:bg-[#2a2a2a]">
                            <TableCell className="font-mono text-sm text-blue-400">{key}</TableCell>
                            <TableCell>
                              {editingKey === key ? (
                                <Input
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditVariable(key, editingValue);
                                    }
                                  }}
                                  onBlur={() => handleEditVariable(key, editingValue)}
                                  autoFocus
                                  className="h-8 bg-[#2a2a2a] border-[#3a3a3a] text-white focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:underline text-gray-300"
                                  onClick={() => {
                                    setEditingKey(key);
                                    setEditingValue(String(value));
                                  }}
                                >
                                  {String(value)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteVariable(key)}
                                className="text-gray-400 hover:bg-[#3a3a3a] hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {Object.keys(formData.variables).length > 0 && (
                  <div className="rounded-lg bg-[#2a2a2a] border border-[#3a3a3a] p-3">
                    <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Usage Example</Label>
                    <div className="mt-2 space-y-1 text-xs">
                      {Object.keys(formData.variables).slice(0, 3).map(key => (
                        <div key={key}>
                          <code className="bg-[#1a1a1a] px-1 py-0.5 rounded text-blue-400">
                            {`{${formData.name}.${key}}`}
                          </code>
                          {' → '}
                          <span className="text-gray-500">{String(formData.variables[key])}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
      
      <div className="p-6 border-t border-[#3a3a3a] bg-[#242424] flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="bg-transparent border-[#3a3a3a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-gray-500"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Variables
        </Button>
      </div>
    </div>
  );
}