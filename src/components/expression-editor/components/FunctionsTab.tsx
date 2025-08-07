import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Search, 
  ChevronRight,
  Calculator,
  BarChart3,
  Type as TypeIcon,
  Calendar,
  Layers,
  GitBranch,
  Code,
  Copy,
  Info
} from 'lucide-react';
import { ExpressionMode, CustomFunction } from '../types';
import { FUNCTION_LIBRARY } from '../functions/functionLibrary';

interface FunctionsTabProps {
  mode: ExpressionMode;
  customFunctions: CustomFunction[];
  onInsert: (text: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'math':
      return <Calculator className="h-4 w-4" />;
    case 'statistical':
      return <BarChart3 className="h-4 w-4" />;
    case 'string':
      return <TypeIcon className="h-4 w-4" />;
    case 'date':
      return <Calendar className="h-4 w-4" />;
    case 'aggregation':
      return <Layers className="h-4 w-4" />;
    case 'logical':
      return <GitBranch className="h-4 w-4" />;
    case 'custom':
      return <Code className="h-4 w-4" />;
    default:
      return <Code className="h-4 w-4" />;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'math':
      return 'Math Functions';
    case 'statistical':
      return 'Statistical';
    case 'string':
      return 'String & Text';
    case 'date':
      return 'Date & Time';
    case 'aggregation':
      return 'Aggregations';
    case 'logical':
      return 'Logical';
    case 'custom':
      return 'Custom Functions';
    default:
      return category;
  }
};

export const FunctionsTab: React.FC<FunctionsTabProps> = ({ 
  mode, 
  customFunctions, 
  onInsert 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['logical', 'math'])
  );

  // Group functions by category
  const functionsByCategory = useMemo(() => {
    const categories: Record<string, typeof FUNCTION_LIBRARY[string][]> = {};
    
    Object.values(FUNCTION_LIBRARY).forEach(func => {
      if (!categories[func.category]) {
        categories[func.category] = [];
      }
      categories[func.category].push(func);
    });

    // Add custom functions
    if (customFunctions.length > 0) {
      categories.custom = customFunctions.map(cf => ({
        name: cf.name,
        category: 'custom' as const,
        signature: cf.signature,
        description: cf.description,
        parameters: [],
        returnType: 'any' as const,
        examples: []
      }));
    }

    return categories;
  }, [customFunctions]);

  // Filter functions based on search
  const filteredFunctions = useMemo(() => {
    if (!searchTerm) return functionsByCategory;

    const searchLower = searchTerm.toLowerCase();
    const filtered: typeof functionsByCategory = {};

    Object.entries(functionsByCategory).forEach(([category, funcs]) => {
      const matchingFuncs = funcs.filter(func =>
        func.name.toLowerCase().includes(searchLower) ||
        func.description.toLowerCase().includes(searchLower) ||
        func.category.toLowerCase().includes(searchLower)
      );
      
      if (matchingFuncs.length > 0) {
        filtered[category] = matchingFuncs;
      }
    });

    return filtered;
  }, [functionsByCategory, searchTerm]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleInsertFunction = (func: typeof FUNCTION_LIBRARY[string]) => {
    const params = func.parameters
      .map((p, i) => `\${${i + 1}:${p.name}}`)
      .join(', ');
    onInsert(`${func.name}(${params})`);
  };

  const handleCopyFunction = (func: typeof FUNCTION_LIBRARY[string]) => {
    navigator.clipboard.writeText(func.name);
  };

  const renderFunction = (func: typeof FUNCTION_LIBRARY[string]) => (
    <div
      key={func.name}
      className="group flex flex-col p-2 hover:bg-accent rounded-md cursor-pointer"
      onClick={() => handleInsertFunction(func)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-primary">
              {func.name}
            </span>
            <Badge variant="outline" className="text-xs">
              {func.returnType}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {func.signature}
          </div>
          <div className="text-sm mt-1">
            {func.description}
          </div>
          {func.examples.length > 0 && (
            <div className="mt-2 space-y-1">
              {func.examples.slice(0, 1).map((ex, i) => (
                <div key={i} className="text-xs">
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {ex.expression}
                  </code>
                  <span className="text-muted-foreground"> → </span>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {JSON.stringify(ex.result)}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyFunction(func);
            }}
            title="Copy function name"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              // Show function details
            }}
            title="Function details"
          >
            <Info className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Get recommended functions based on mode
  const recommendedFunctions = useMemo(() => {
    switch (mode) {
      case 'conditional':
        return ['IF', 'SWITCH', 'AND', 'OR', 'BETWEEN', 'IN'];
      case 'calculation':
        return ['SUM', 'AVG', 'ROUND', 'CONCAT', 'DATEFORMAT'];
      case 'filter':
        return ['CONTAINS', 'IN', 'BETWEEN', 'ISNULL', 'AND', 'OR'];
      case 'validation':
        return ['ISNULL', 'LENGTH', 'BETWEEN', 'CONTAINS', 'MATCH'];
      default:
        return [];
    }
  }, [mode]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search functions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </div>

      {/* Recommended functions */}
      {!searchTerm && recommendedFunctions.length > 0 && (
        <div className="p-3 border-b">
          <div className="text-xs text-muted-foreground mb-2">
            Recommended for {mode}
          </div>
          <div className="flex flex-wrap gap-1">
            {recommendedFunctions.map(fname => {
              const func = FUNCTION_LIBRARY[fname];
              if (!func) return null;
              return (
                <Button
                  key={fname}
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs font-mono"
                  onClick={() => handleInsertFunction(func)}
                >
                  {fname}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Function categories */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {searchTerm && (
            <div className="text-xs text-muted-foreground mb-2">
              Found {Object.values(filteredFunctions).flat().length} functions
            </div>
          )}
          
          {Object.entries(filteredFunctions).map(([category, funcs]) => (
            <Collapsible
              key={category}
              open={expandedCategories.has(category)}
              onOpenChange={() => toggleCategory(category)}
              className="mb-2"
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md">
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.has(category) ? 'rotate-90' : ''
                  }`}
                />
                {getCategoryIcon(category)}
                <span className="text-sm font-medium flex-1 text-left">
                  {getCategoryLabel(category)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {funcs.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="pl-6 space-y-1">
                  {funcs.map(renderFunction)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {Object.keys(filteredFunctions).length === 0 && searchTerm && (
            <div className="text-center text-muted-foreground py-8">
              No functions match "{searchTerm}"
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick reference */}
      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">Quick reference</div>
        <div className="text-xs space-y-1">
          <div>• Functions are case-insensitive</div>
          <div>• Click to insert with placeholders</div>
          <div>• Use Tab to navigate parameters</div>
        </div>
      </div>
    </div>
  );
};