import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Code2, 
  Sparkles, 
  CheckCircle,
  Copy,
  Trash2
} from 'lucide-react';
import { ExpressionEditorDialog } from './ExpressionEditorDialog';
import { ExpressionMode } from './types';

interface SavedExpression {
  id: string;
  expression: string;
  mode: ExpressionMode;
  timestamp: Date;
}

export const DialogDemo: React.FC = () => {
  const [savedExpressions, setSavedExpressions] = useState<SavedExpression[]>([]);
  const [selectedMode, setSelectedMode] = useState<ExpressionMode | 'all'>('conditional');

  const handleSaveExpression = (expression: string, mode: ExpressionMode) => {
    const newExpression: SavedExpression = {
      id: Date.now().toString(),
      expression,
      mode,
      timestamp: new Date()
    };
    setSavedExpressions(prev => [newExpression, ...prev]);
  };

  const handleCopyExpression = (expression: string) => {
    navigator.clipboard.writeText(expression);
  };

  const handleDeleteExpression = (id: string) => {
    setSavedExpressions(prev => prev.filter(exp => exp.id !== id));
  };

  const getModeColor = (mode: ExpressionMode) => {
    switch (mode) {
      case 'conditional':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'calculation':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'filter':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'validation':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    }
  };

  const filteredExpressions = savedExpressions.filter(
    exp => selectedMode === 'all' || exp.mode === selectedMode
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Expression Editor Demo</h1>
        </div>
        <p className="text-muted-foreground">
          Build powerful expressions for AG-Grid customization with IntelliSense and validation
        </p>
      </div>

      {/* Demo Card */}
      <Card>
        <CardHeader>
          <CardTitle>Try the Expression Editor</CardTitle>
          <CardDescription>
            Click the button below to open the Expression Editor dialog. Build expressions for conditional formatting, 
            calculated columns, filters, and validation rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <ExpressionEditorDialog 
              mode="conditional"
              onSave={handleSaveExpression}
            />
          </div>

          <Alert>
            <Code2 className="h-4 w-4" />
            <AlertDescription>
              The editor includes syntax highlighting, auto-completion for columns and functions, 
              real-time validation, and a comprehensive function library with 50+ built-in functions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Saved Expressions */}
      {savedExpressions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Saved Expressions</CardTitle>
                <CardDescription>
                  Your saved expressions from the editor
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {savedExpressions.length} expressions
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" value={selectedMode} onValueChange={(v) => setSelectedMode(v as any)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="conditional">Conditional</TabsTrigger>
                <TabsTrigger value="calculation">Calculation</TabsTrigger>
                <TabsTrigger value="filter">Filter</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>
              
              <TabsContent value={selectedMode} className="mt-4">
                <div className="space-y-3">
                  {filteredExpressions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No expressions saved yet
                    </div>
                  ) : (
                    filteredExpressions.map(exp => (
                      <div 
                        key={exp.id}
                        className="p-4 border rounded-lg space-y-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={getModeColor(exp.mode)}
                              >
                                {exp.mode}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {exp.timestamp.toLocaleString()}
                              </span>
                            </div>
                            <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                              <code>{exp.expression}</code>
                            </pre>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleCopyExpression(exp.expression)}
                              title="Copy expression"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleDeleteExpression(exp.id)}
                              title="Delete expression"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">IntelliSense</div>
                <div className="text-sm text-muted-foreground">
                  Auto-completion for columns, functions, and variables
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Real-time Validation</div>
                <div className="text-sm text-muted-foreground">
                  Instant feedback on syntax errors and warnings
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Function Library</div>
                <div className="text-sm text-muted-foreground">
                  50+ built-in functions for math, strings, dates, and logic
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Live Preview</div>
                <div className="text-sm text-muted-foreground">
                  Execute expressions and see results instantly
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Expression History</div>
                <div className="text-sm text-muted-foreground">
                  Automatically saves recent expressions per mode
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Mode-Specific Examples</div>
                <div className="text-sm text-muted-foreground">
                  Curated examples for each expression type
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};