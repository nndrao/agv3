import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConditionalRuleTemplate } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  Calendar,
  Hash,
  Type,
  Percent,
  DollarSign,
  Clock,
  Flag
} from 'lucide-react';

interface RuleTemplatesProps {
  columnType?: string;
  onSelectTemplate: (template: ConditionalRuleTemplate) => void;
}

const getIconForTemplate = (templateId: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'positive-values': <TrendingUp className="h-5 w-5" />,
    'negative-values': <TrendingDown className="h-5 w-5" />,
    'above-average': <TrendingUp className="h-5 w-5" />,
    'below-average': <TrendingDown className="h-5 w-5" />,
    'top-10-percent': <Percent className="h-5 w-5" />,
    'bottom-10-percent': <Percent className="h-5 w-5" />,
    'contains-text': <Type className="h-5 w-5" />,
    'empty-cells': <XCircle className="h-5 w-5" />,
    'duplicate-values': <AlertTriangle className="h-5 w-5" />,
    'today': <Calendar className="h-5 w-5" />,
    'past-due': <Clock className="h-5 w-5" />,
    'high-priority': <Flag className="h-5 w-5" />,
    'completed': <CheckCircle2 className="h-5 w-5" />,
    'in-progress': <Clock className="h-5 w-5" />,
    'currency-positive': <DollarSign className="h-5 w-5" />,
    'percentage-high': <Percent className="h-5 w-5" />
  };
  return iconMap[templateId] || <Hash className="h-5 w-5" />;
};

export const RuleTemplates: React.FC<RuleTemplatesProps> = ({
  columnType,
  onSelectTemplate
}) => {
  const templates: ConditionalRuleTemplate[] = [
    // Number Templates
    {
      id: 'positive-values',
      name: 'Positive Values',
      description: 'Highlight cells with positive numbers',
      category: 'value',
      rule: {
        name: 'Positive Values',
        expression: '[value] > 0',
        formatting: {
          style: {
            backgroundColor: '#c8e6c9',
            color: '#2e7d32'
          }
        },
        scope: { target: 'cell' }
      }
    },
    {
      id: 'negative-values',
      name: 'Negative Values',
      description: 'Highlight cells with negative numbers',
      category: 'value',
      rule: {
        name: 'Negative Values',
        expression: '[value] < 0',
        formatting: {
          style: {
            backgroundColor: '#ffcdd2',
            color: '#c62828'
          }
        },
        scope: { target: 'cell' }
      }
    },
    {
      id: 'above-average',
      name: 'Above Average',
      description: 'Highlight values above column average',
      category: 'value',
      rule: {
        name: 'Above Average',
        expression: '[value] > AVG([Column])',
        formatting: {
          style: {
            backgroundColor: '#e1f5fe',
            color: '#0277bd',
            fontWeight: 'bold'
          }
        },
        scope: { target: 'cell' }
      }
    },
    {
      id: 'top-10-percent',
      name: 'Top 10%',
      description: 'Highlight top 10% of values',
      category: 'range',
      rule: {
        name: 'Top 10%',
        expression: '[value] >= PERCENTILE([Column], 0.9)',
        formatting: {
          style: {
            backgroundColor: '#ffd54f',
            color: '#f57f17',
            fontWeight: 'bold'
          },
          icon: {
            name: 'star',
            position: 'end',
            color: '#f57f17'
          }
        },
        scope: { target: 'cell' }
      }
    },

    // Text Templates
    {
      id: 'contains-text',
      name: 'Contains Text',
      description: 'Highlight cells containing specific text',
      category: 'text',
      rule: {
        name: 'Contains Text',
        expression: 'CONTAINS([value], "important")',
        formatting: {
          style: {
            backgroundColor: '#fff3cd',
            color: '#856404'
          }
        },
        scope: { target: 'cell' }
      }
    },
    {
      id: 'empty-cells',
      name: 'Empty Cells',
      description: 'Highlight empty or null cells',
      category: 'text',
      rule: {
        name: 'Empty Cells',
        expression: 'ISNULL([value]) OR [value] = ""',
        formatting: {
          style: {
            backgroundColor: '#f5f5f5',
            color: '#9e9e9e',
            fontStyle: 'italic'
          }
        },
        scope: { target: 'cell' }
      }
    },
    {
      id: 'duplicate-values',
      name: 'Duplicate Values',
      description: 'Highlight duplicate values in column',
      category: 'text',
      rule: {
        name: 'Duplicate Values',
        expression: 'COUNTIF([Column], [value]) > 1',
        formatting: {
          style: {
            backgroundColor: '#ffebee',
            color: '#d32f2f'
          },
          icon: {
            name: 'alert-triangle',
            position: 'start',
            color: '#d32f2f'
          }
        },
        scope: { target: 'cell' }
      }
    },

    // Date Templates
    {
      id: 'today',
      name: 'Today',
      description: 'Highlight today\'s date',
      category: 'date',
      rule: {
        name: 'Today',
        expression: 'DATEFORMAT([value], "YYYY-MM-DD") = DATEFORMAT(TODAY(), "YYYY-MM-DD")',
        formatting: {
          style: {
            backgroundColor: '#e8f5e9',
            color: '#388e3c',
            fontWeight: 'bold'
          }
        },
        scope: { target: 'cell' }
      }
    },
    {
      id: 'past-due',
      name: 'Past Due',
      description: 'Highlight dates in the past',
      category: 'date',
      rule: {
        name: 'Past Due',
        expression: '[value] < TODAY() AND NOT(ISNULL([value]))',
        formatting: {
          style: {
            backgroundColor: '#ffcdd2',
            color: '#d32f2f',
            fontWeight: 'bold'
          },
          icon: {
            name: 'alert-circle',
            position: 'start',
            color: '#d32f2f'
          }
        },
        scope: { target: 'cell' }
      }
    },

    // Status Templates
    {
      id: 'high-priority',
      name: 'High Priority',
      description: 'Highlight high priority items',
      category: 'custom',
      rule: {
        name: 'High Priority',
        expression: '[Priority] = "High" OR [Priority] = "Critical"',
        formatting: {
          style: {
            backgroundColor: '#ff5252',
            color: '#ffffff',
            fontWeight: 'bold'
          }
        },
        scope: { target: 'row' }
      }
    },
    {
      id: 'completed',
      name: 'Completed Status',
      description: 'Highlight completed items',
      category: 'custom',
      rule: {
        name: 'Completed',
        expression: '[Status] = "Completed" OR [Status] = "Done"',
        formatting: {
          style: {
            backgroundColor: '#c8e6c9',
            color: '#2e7d32',
            textDecoration: 'line-through'
          },
          icon: {
            name: 'check-circle',
            position: 'start',
            color: '#2e7d32'
          }
        },
        scope: { target: 'row' }
      }
    },
    {
      id: 'in-progress',
      name: 'In Progress',
      description: 'Highlight items in progress',
      category: 'custom',
      rule: {
        name: 'In Progress',
        expression: '[Status] = "In Progress" OR [Status] = "Working"',
        formatting: {
          style: {
            backgroundColor: '#fff3cd',
            color: '#856404'
          },
          icon: {
            name: 'clock',
            position: 'start',
            color: '#856404'
          }
        },
        scope: { target: 'row' }
      }
    }
  ];

  // Filter templates based on column type if provided
  const filteredTemplates = columnType ? templates.filter(template => {
    switch (columnType) {
      case 'number':
      case 'numeric':
        return ['value', 'range'].includes(template.category);
      case 'text':
      case 'string':
        return ['text', 'custom'].includes(template.category);
      case 'date':
      case 'datetime':
        return ['date', 'custom'].includes(template.category);
      default:
        return true;
    }
  }) : templates;

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ConditionalRuleTemplate[]>);

  const categoryLabels: Record<string, string> = {
    value: 'Value-based Rules',
    range: 'Range-based Rules',
    text: 'Text-based Rules',
    date: 'Date-based Rules',
    custom: 'Custom Rules'
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Rule Templates</h3>
          <p className="text-sm text-muted-foreground">
            Select a template to quickly create common formatting rules
          </p>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h4 className="text-sm font-medium mb-3">{categoryLabels[category]}</h4>
              <div className="grid gap-3">
                {categoryTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onSelectTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            {getIconForTemplate(template.id)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {template.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {template.rule.scope?.target === 'row' ? 'Row' : 'Cell'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                            {template.rule.expression}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">Preview:</div>
                          <div
                            className="px-3 py-1 rounded text-sm"
                            style={template.rule.formatting?.style}
                          >
                            Sample Text
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};