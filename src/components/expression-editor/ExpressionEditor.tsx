import React, { useState, useRef, useEffect } from 'react';
import { Editor, Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Undo, Redo, Play, FileText, HelpCircle, Keyboard } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

import { ExpressionEditorProps, ValidationResult } from './types';
import { ExamplesTab } from './components/ExamplesTab';
import { ValidationPanel } from './components/ValidationPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { registerExpressionLanguage } from './utils/monacoLanguage';
import { createFilteredCompletionProvider, CompletionFilter } from './utils/filteredCompletionProvider';
import { validateExpression } from './utils/validator';
import { useExpressionHistory } from './hooks/useExpressionHistory';
import './expression-editor.css';

export const ExpressionEditor: React.FC<ExpressionEditorProps> = ({
  mode,
  initialExpression = '',
  height = '100%',
  availableColumns,
  availableVariables = [],
  customFunctions = [],
  onChange,
  onValidate,
  onExecute,
  showPreview = true,
  readOnly = false,
  disableResize = false
}) => {
  const { theme } = useTheme();
  const [expression, setExpression] = useState(initialExpression);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewResult, setPreviewResult] = useState<unknown>(null);
  const [bottomTab, setBottomTab] = useState('validation');
  const [showExamples, setShowExamples] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const activeCompletionFilter = useRef<CompletionFilter>('all');
  const completionProviderDisposable = useRef<{ dispose: () => void } | null>(null);
  
  const { addToHistory } = useExpressionHistory(mode);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (completionProviderDisposable.current) {
        completionProviderDisposable.current.dispose();
      }
    };
  }, []);
  
  // Monitor container size for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // More refined responsive breakpoints
        const isVerySmall = width < 400;
        const isSmall = width < 600;
        const isMedium = width < 900;
        
        // Update compact mode based on size
        setIsCompact(isSmall);
        
        // Update editor options based on container size
        if (editorRef.current) {
          editorRef.current.updateOptions({
            minimap: { 
              enabled: !isSmall && height > 300,
              side: width < 1200 ? 'left' : 'right'
            },
            lineNumbers: isVerySmall ? 'off' : 'on',
            lineNumbersMinChars: isSmall ? 2 : 3,
            folding: !isVerySmall,
            renderLineHighlight: isVerySmall ? 'none' : 'all',
            overviewRulerLanes: isSmall ? 0 : (isMedium ? 2 : 3),
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: isSmall ? 8 : 12,
              horizontalScrollbarSize: isSmall ? 8 : 12,
              useShadows: !isVerySmall
            },
            fontSize: isVerySmall ? 12 : (isSmall ? 13 : 14),
            wordWrap: isSmall ? 'on' : 'off',
            renderWhitespace: isVerySmall ? 'none' : 'boundary',
            glyphMargin: !isVerySmall
          });
          
          // Trigger layout update
          editorRef.current.layout();
        }
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Validate expression on change
  useEffect(() => {
    if (!expression) {
      setValidation(null);
      onChange('', true);
      return;
    }

    const result = onValidate ? onValidate(expression) : validateExpression(expression, {
      mode,
      columns: availableColumns,
      variables: availableVariables,
      customFunctions
    });

    setValidation(result);
    onChange(expression, result.isValid);
  }, [expression, mode, availableColumns, availableVariables, customFunctions, onChange, onValidate]);

  // Execute expression for preview
  const executeExpression = async () => {
    if (!validation?.isValid || !onExecute) return;

    setIsExecuting(true);
    try {
      const result = await onExecute(expression);
      setPreviewResult(result);
      addToHistory(expression, validation.isValid);
    } catch (error) {
      setPreviewResult({ error: (error as Error).message });
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle editor mount
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom language
    registerExpressionLanguage(monaco);

    // Function to register completion provider with filter
    const registerCompletionProvider = (filter: CompletionFilter) => {
      // Dispose of previous provider if exists
      if (completionProviderDisposable.current) {
        completionProviderDisposable.current.dispose();
      }
      
      // Register new provider
      completionProviderDisposable.current = monaco.languages.registerCompletionItemProvider('expression', 
        createFilteredCompletionProvider(monaco, {
          columns: availableColumns,
          variables: availableVariables,
          functions: customFunctions
        }, filter)
      );
      
      activeCompletionFilter.current = filter;
    };

    // Register default completion provider
    registerCompletionProvider('all');

    // Configure initial editor options (responsive settings will be applied by ResizeObserver)
    const containerWidth = containerRef.current?.offsetWidth || 800;
    const containerHeight = containerRef.current?.offsetHeight || 400;
    
    // Determine initial responsive settings
    const isVerySmallInitial = containerWidth < 400;
    const isSmallInitial = containerWidth < 600;
    const isMediumInitial = containerWidth < 900;
    
    editor.updateOptions({
      minimap: { 
        enabled: !isSmallInitial && containerHeight > 300,
        side: containerWidth < 1200 ? 'left' : 'right'
      },
      lineNumbers: isVerySmallInitial ? 'off' : 'on',
      lineNumbersMinChars: isSmallInitial ? 2 : 3,
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize: isVerySmallInitial ? 12 : (isSmallInitial ? 13 : 14),
      fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true
      },
      parameterHints: {
        enabled: true
      },
      folding: !isVerySmallInitial,
      renderLineHighlight: isVerySmallInitial ? 'none' : 'all',
      overviewRulerLanes: isSmallInitial ? 0 : (isMediumInitial ? 2 : 3),
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: isSmallInitial ? 8 : 12,
        horizontalScrollbarSize: isSmallInitial ? 8 : 12,
        useShadows: !isVerySmallInitial
      },
      wordWrap: isSmallInitial ? 'on' : 'off',
      renderWhitespace: isVerySmallInitial ? 'none' : 'boundary',
      glyphMargin: !isVerySmallInitial
    });

    // Add keyboard shortcuts
    editor.addAction({
      id: 'execute-expression',
      label: 'Execute Expression',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => executeExpression()
    });

    // Hotkey for showing columns (Ctrl+Shift+C)
    editor.addAction({
      id: 'show-columns',
      label: 'Show Column Suggestions',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC],
      run: () => {
        const position = editor.getPosition();
        if (position) {
          const model = editor.getModel();
          if (model) {
            const line = model.getLineContent(position.lineNumber);
            const beforeCursor = line.substring(0, position.column - 1);
            
            // Register column-only completion provider
            registerCompletionProvider('columns');
            
            // Check if we're not already in a column reference
            if (!beforeCursor.endsWith('[')) {
              editor.executeEdits('insert-bracket', [{
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: '['
              }]);
            }
            
            // Trigger suggestions
            editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
            
            // The filter will reset automatically when cursor moves
          }
        }
      }
    });

    // Hotkey for showing functions (Ctrl+Shift+F)
    editor.addAction({
      id: 'show-functions',
      label: 'Show Function Suggestions',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => {
        const position = editor.getPosition();
        if (position) {
          // Register function-only completion provider
          registerCompletionProvider('functions');
          
          // Trigger suggestions
          editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
          
          // The filter will reset automatically when cursor moves
        }
      }
    });

    // Hotkey for showing variables (Ctrl+Shift+V)
    editor.addAction({
      id: 'show-variables',
      label: 'Show Variable Suggestions',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV],
      run: () => {
        // Register variable-only completion provider
        registerCompletionProvider('variables');
        
        // Trigger suggestions
        editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
        
        // The filter will reset automatically when cursor moves
      }
    });

    // Hotkey for showing operators (Ctrl+Shift+O)
    editor.addAction({
      id: 'show-operators',
      label: 'Show Operator Suggestions',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO],
      run: () => {
        const position = editor.getPosition();
        if (position) {
          const model = editor.getModel();
          if (model) {
            // Register operator-only completion provider
            registerCompletionProvider('operators');
            
            editor.executeEdits('insert-space', [{
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              text: ' '
            }]);
            editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
            
            // The filter will reset automatically when cursor moves
          }
        }
      }
    });

    // Save expression (Ctrl+S) - onSave is not provided in props currently
    // This is commented out since onSave is not part of ExpressionEditorProps
    // if (onSave) {
    //   editor.addAction({
    //     id: 'save-expression',
    //     label: 'Save Expression',
    //     keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
    //     run: () => onSave(expression, mode)
    //   });
    // }
    
    // Listen for completion widget close to reset filter
    editor.onDidChangeCursorPosition(() => {
      // If we have a filter active, reset it after a short delay
      // This is safer than trying to detect widget visibility
      if (activeCompletionFilter.current !== 'all') {
        setTimeout(() => {
          if (activeCompletionFilter.current !== 'all') {
            registerCompletionProvider('all');
          }
        }, 1000);
      }
    });
  };

  // Handle undo/redo
  const handleUndo = () => {
    editorRef.current?.trigger('keyboard', 'undo', null);
  };

  const handleRedo = () => {
    editorRef.current?.trigger('keyboard', 'redo', null);
  };


  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';

  // Calculate container height - ensure it fills the parent
  const containerHeight = typeof height === 'number' ? `${height}px` : height;
  const containerStyle = {
    height: containerHeight,
    width: '100%',
    minHeight: '200px', // Ensure minimum usable height
    display: 'flex',
    flexDirection: 'column' as const
  };

  // Render non-resizable layout if in a portal/dialog context
  if (disableResize) {
    return (
      <div ref={containerRef} className="expression-editor-container" style={containerStyle}>
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Main Editor Panel */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Editor Header - Responsive */}
            <div className={cn(
              "flex items-center justify-between border-b bg-muted/50 flex-shrink-0",
              isCompact ? "py-1 px-2" : "py-2 px-4"
            )}>
              {!isCompact && <span className="text-sm font-medium">Expression Editor</span>}
              <div className={cn(
                "flex items-center gap-1",
                isCompact ? "ml-0" : "ml-auto"
              )}>
                {!isCompact && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleUndo}
                      disabled={readOnly}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleRedo}
                      disabled={readOnly}
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {onExecute && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn("h-7 w-7", isCompact && "h-6 w-6")}
                    onClick={executeExpression}
                    disabled={!validation?.isValid || isExecuting}
                    title="Execute (Ctrl+Enter)"
                  >
                    <Play className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
                  </Button>
                )}
                <Popover open={showHotkeys} onOpenChange={setShowHotkeys}>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn("h-7 w-7", isCompact && "h-6 w-6")}
                      title="Keyboard Shortcuts"
                    >
                      <Keyboard className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={cn("w-80", isCompact && "w-64")} align="end" side={isCompact ? "bottom" : "left"}>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Keyboard Shortcuts</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Show Columns</span>
                          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Shift+C</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Show Functions</span>
                          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Shift+F</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Show Variables</span>
                          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Shift+V</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Show Operators</span>
                          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Shift+O</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Execute Expression</span>
                          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Enter</kbd>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover open={showExamples} onOpenChange={setShowExamples}>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn("h-7 w-7", isCompact && "h-6 w-6")}
                      title="Examples"
                    >
                      <HelpCircle className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={cn("w-96", isCompact && "w-80")} align="end" side={isCompact ? "bottom" : "left"}>
                    <div className={cn("h-96", isCompact && "h-64")}>
                      <ExamplesTab
                        mode={mode}
                        onSelect={(expression) => {
                          setExpression(expression);
                          setShowExamples(false);
                          editorRef.current?.focus();
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Monaco Editor */}
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="expression"
                language="expression"
                theme={editorTheme}
                value={expression}
                onChange={(value) => setExpression(value || '')}
                onMount={handleEditorDidMount}
                options={{
                  readOnly,
                  automaticLayout: true
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Bottom Panel - Responsive height */}
        {(showPreview || validation) && (
          <div className={cn(
            "border-t flex-shrink-0",
            isCompact ? "h-32" : "h-40"
          )}>
            <Tabs value={bottomTab} onValueChange={setBottomTab} className="h-full flex flex-col">
              <TabsList className={cn(
                "w-full justify-start rounded-none border-b flex-shrink-0",
                isCompact ? "px-1" : "px-2"
              )}>
                <TabsTrigger value="validation" className={cn(isCompact && "text-xs px-2")}>
                  {isCompact ? "Valid" : "Validation"}
                </TabsTrigger>
                {showPreview && (
                  <TabsTrigger value="preview" className={cn(isCompact && "text-xs px-2")}>
                    {isCompact ? "Prev" : "Preview"}
                  </TabsTrigger>
                )}
              </TabsList>
              
              <div className="flex-1 min-h-0 overflow-hidden">
                <TabsContent value="validation" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                  {validation && (
                    <ValidationPanel
                      validation={validation}
                    />
                  )}
                </TabsContent>
                
                {showPreview && (
                  <TabsContent value="preview" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <PreviewPanel
                      result={previewResult}
                      isExecuting={isExecuting}
                      onExecute={executeExpression}
                    />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>
        )}
      </div>
    );
  }

  // Original resizable layout
  return (
    <div className="expression-editor-container" style={containerStyle}>
      {/* Main content area with resizable panels */}
      <div className="flex-1 min-h-0">
        <div className="h-full">
          {/* Main Editor Panel */}
          <div className="h-full">
            <div className="h-full flex flex-col">
              {/* Editor Header - Responsive */}
              <div className={cn(
                "flex items-center justify-between border-b bg-muted/50 flex-shrink-0",
                isCompact ? "py-1 px-2" : "py-2 px-4"
              )}>
                {!isCompact && <span className="text-sm font-medium">Expression Editor</span>}
                <div className={cn(
                  "flex items-center gap-1",
                  isCompact ? "ml-0" : "ml-auto"
                )}>
                  {!isCompact && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleUndo}
                        disabled={readOnly}
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleRedo}
                        disabled={readOnly}
                        title="Redo (Ctrl+Y)"
                      >
                        <Redo className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {onExecute && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn("h-7 w-7", isCompact && "h-6 w-6")}
                      onClick={executeExpression}
                      disabled={!validation?.isValid || isExecuting}
                      title="Execute (Ctrl+Enter)"
                    >
                      <Play className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
                    </Button>
                  )}
                  <Popover open={showHotkeys} onOpenChange={setShowHotkeys}>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-7 w-7", isCompact && "h-6 w-6")}
                        title="Keyboard Shortcuts"
                      >
                        <Keyboard className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={cn("w-80", isCompact && "w-64")} align="end" side={isCompact ? "bottom" : "left"}>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Keyboard Shortcuts</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Show Columns</span>
                            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Shift+C</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Show Functions</span>
                            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Shift+F</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Show Variables</span>
                            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Shift+V</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Show Operators</span>
                            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Shift+O</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Execute Expression</span>
                            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Ctrl+Enter</kbd>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover open={showExamples} onOpenChange={setShowExamples}>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-7 w-7", isCompact && "h-6 w-6")}
                        title="Examples"
                      >
                        <HelpCircle className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={cn("w-96", isCompact && "w-80")} align="end" side={isCompact ? "bottom" : "left"}>
                      <div className={cn("h-96", isCompact && "h-64")}>
                        <ExamplesTab
                          mode={mode}
                          onSelect={(expression) => {
                            setExpression(expression);
                            setShowExamples(false);
                            editorRef.current?.focus();
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Monaco Editor */}
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="expression"
                  language="expression"
                  theme={editorTheme}
                  value={expression}
                  onChange={(value) => setExpression(value || '')}
                  onMount={handleEditorDidMount}
                  options={{
                    readOnly,
                    automaticLayout: true
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Responsive Height */}
      {(validation || showPreview) && (
        <div className={cn(
          "border-t flex-shrink-0",
          isCompact ? "h-32" : "h-40"
        )}>
          <Tabs value={bottomTab} onValueChange={setBottomTab} className="h-full flex flex-col">
            <TabsList className={cn(
              "w-full justify-start rounded-none flex-shrink-0",
              isCompact ? "px-1" : "px-2"
            )}>
              <TabsTrigger value="validation" className={cn(isCompact && "text-xs px-2")}>
                {isCompact ? "Valid" : "Validation"}
              </TabsTrigger>
              {showPreview && onExecute && (
                <TabsTrigger value="preview" className={cn(isCompact && "text-xs px-2")}>
                  {isCompact ? "Prev" : "Preview"}
                </TabsTrigger>
              )}
              {!isCompact && (
                <TabsTrigger value="documentation">Documentation</TabsTrigger>
              )}
            </TabsList>
            
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="validation" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ValidationPanel validation={validation} />
              </TabsContent>
              
              {showPreview && onExecute && (
                <TabsContent value="preview" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <PreviewPanel 
                    result={previewResult}
                    isExecuting={isExecuting}
                    onExecute={executeExpression}
                  />
                </TabsContent>
              )}
              
              {!isCompact && (
                <TabsContent value="documentation" className="h-full m-0 p-4 overflow-auto">
                  <div className="text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 inline mr-2" />
                    Expression documentation and syntax guide
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
};