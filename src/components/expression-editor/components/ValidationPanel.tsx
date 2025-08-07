import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Lightbulb,
  Zap
} from 'lucide-react';
import { ValidationResult, ValidationError } from '../types';

interface ValidationPanelProps {
  validation: ValidationResult | null;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

const getComplexityBadge = (complexity?: string) => {
  switch (complexity) {
    case 'low':
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Low complexity</Badge>;
    case 'medium':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Medium complexity</Badge>;
    case 'high':
      return <Badge variant="secondary" className="bg-red-100 text-red-700">High complexity</Badge>;
    default:
      return null;
  }
};

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ validation }) => {
  if (!validation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <div>Enter an expression to validate</div>
        </div>
      </div>
    );
  }

  const renderError = (error: ValidationError, index: number) => (
    <div key={index} className="flex items-start gap-2 p-2 hover:bg-accent rounded">
      {getSeverityIcon(error.severity)}
      <div className="flex-1">
        <div className="text-sm">
          {error.message}
          {error.line && error.column && (
            <span className="text-xs text-muted-foreground ml-2">
              (Line {error.line}, Column {error.column})
            </span>
          )}
        </div>
        {error.suggestion && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            {error.suggestion}
          </div>
        )}
        {error.quickFix && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs mt-1"
            onClick={() => error.quickFix?.fix()}
          >
            Apply fix: {error.quickFix.label}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {validation.isValid ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Expression is valid</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">
                {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''} found
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {validation.returnType && (
            <Badge variant="outline" className="text-xs">
              Returns: {validation.returnType}
            </Badge>
          )}
          {getComplexityBadge(validation.estimatedComplexity)}
        </div>
      </div>

      {/* Error/warning list */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {validation.errors.length === 0 && validation.warnings.length === 0 ? (
            <div className="space-y-3">
              {/* Expression info */}
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium mb-2">Expression Analysis</div>
                <div className="space-y-1 text-xs">
                  {validation.usedColumns.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">Columns:</span>
                      <div className="flex flex-wrap gap-1">
                        {validation.usedColumns.map(col => (
                          <Badge key={col} variant="secondary" className="text-xs">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {validation.usedFunctions.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">Functions:</span>
                      <div className="flex flex-wrap gap-1">
                        {validation.usedFunctions.map(func => (
                          <Badge key={func} variant="secondary" className="text-xs">
                            {func}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance tips */}
              {validation.estimatedComplexity === 'high' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Performance Consideration
                      </div>
                      <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        This expression has high complexity and may impact performance on large datasets.
                        Consider simplifying or caching results where possible.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {validation.errors.map((error, i) => renderError(error, i))}
              {validation.warnings.map((warning, i) => renderError(warning, `w${i}`))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};