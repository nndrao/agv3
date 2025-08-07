import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Copy, 
  ExternalLink,
  Sparkles 
} from 'lucide-react';
import { ExpressionMode } from '../types';

interface ExamplesTabProps {
  mode: ExpressionMode;
  onSelect: (expression: string) => void;
}

interface ExampleCategory {
  name: string;
  description: string;
  examples: Example[];
}

interface Example {
  title: string;
  expression: string;
  description: string;
  result?: string;
  tags?: string[];
}

const EXAMPLE_LIBRARY: Record<ExpressionMode, ExampleCategory[]> = {
  conditional: [
    {
      name: 'Status-based Styling',
      description: 'Change cell appearance based on status values',
      examples: [
        {
          title: 'Status Color Mapping',
          expression: `SWITCH([Status],
  "Done", { backgroundColor: "#4CAF50", color: "white" },
  "In Progress", { backgroundColor: "#FF9800", color: "white" },
  "Started", { backgroundColor: "#2196F3", color: "white" },
  "Pending", { backgroundColor: "#9E9E9E", color: "white" },
  { backgroundColor: "#f5f5f5", color: "#666" }
)`,
          description: 'Apply different colors based on status value',
          tags: ['status', 'color', 'switch']
        },
        {
          title: 'Priority Highlighting',
          expression: `IF([Priority] = "High", 
  { backgroundColor: "#FFEBEE", borderLeft: "3px solid #F44336" },
  IF([Priority] = "Medium",
    { backgroundColor: "#FFF3E0", borderLeft: "3px solid #FF9800" },
    {}
  )
)`,
          description: 'Highlight rows based on priority level',
          tags: ['priority', 'highlight', 'border']
        }
      ]
    },
    {
      name: 'Value-based Formatting',
      description: 'Format cells based on numeric values',
      examples: [
        {
          title: 'Positive/Negative Colors',
          expression: `IF([Value] > 0,
  { color: "#4CAF50", fontWeight: "bold" },
  IF([Value] < 0,
    { color: "#F44336", fontWeight: "bold" },
    { color: "#9E9E9E" }
  )
)`,
          description: 'Green for positive, red for negative values',
          tags: ['numbers', 'color', 'positive', 'negative']
        },
        {
          title: 'Percentage Thresholds',
          expression: `IF([Percentage] >= 90, { backgroundColor: "#4CAF50", color: "white" },
  IF([Percentage] >= 70, { backgroundColor: "#8BC34A" },
    IF([Percentage] >= 50, { backgroundColor: "#FFC107" },
      { backgroundColor: "#F44336", color: "white" }
    )
  )
)`,
          description: 'Color scale based on percentage ranges',
          tags: ['percentage', 'threshold', 'scale']
        }
      ]
    },
    {
      name: 'Date-based Styling',
      description: 'Format based on date comparisons',
      examples: [
        {
          title: 'Overdue Items',
          expression: `IF(AND([DueDate] < TODAY(), [Status] != "Complete"),
  { 
    backgroundColor: "#FFEBEE", 
    color: "#B71C1C",
    fontWeight: "bold"
  },
  {}
)`,
          description: 'Highlight overdue incomplete items',
          tags: ['date', 'overdue', 'today']
        },
        {
          title: 'Upcoming Deadlines',
          expression: `IF(DATEDIFF([DueDate], TODAY(), "day") <= 3,
  { 
    backgroundColor: "#FFF9C4",
    borderLeft: "3px solid #F57F17"
  },
  {}
)`,
          description: 'Warn about deadlines within 3 days',
          tags: ['date', 'deadline', 'warning']
        }
      ]
    }
  ],
  
  calculation: [
    {
      name: 'Financial Calculations',
      description: 'Common financial formulas',
      examples: [
        {
          title: 'Profit Margin',
          expression: 'ROUND(([Revenue] - [Cost]) / [Revenue] * 100, 2)',
          description: 'Calculate profit margin percentage',
          result: '25.50',
          tags: ['finance', 'percentage', 'margin']
        },
        {
          title: 'Running Total',
          expression: 'SUM([Amount]) OVER (ORDER BY [Date])',
          description: 'Calculate running total over time',
          tags: ['aggregate', 'window', 'sum']
        },
        {
          title: 'Tax Calculation',
          expression: 'ROUND([Price] * (1 + [TaxRate] / 100), 2)',
          description: 'Calculate price including tax',
          tags: ['tax', 'price', 'calculation']
        }
      ]
    },
    {
      name: 'String Manipulations',
      description: 'Text processing examples',
      examples: [
        {
          title: 'Full Name',
          expression: 'CONCAT([FirstName], " ", [LastName])',
          description: 'Combine first and last names',
          result: 'John Doe',
          tags: ['string', 'concat', 'name']
        },
        {
          title: 'Email Domain',
          expression: 'SUBSTRING([Email], FIND("@", [Email]) + 1, LENGTH([Email]))',
          description: 'Extract domain from email address',
          result: 'company.com',
          tags: ['email', 'domain', 'extract']
        },
        {
          title: 'Format Phone',
          expression: 'CONCAT("(", LEFT([Phone], 3), ") ", MID([Phone], 4, 3), "-", RIGHT([Phone], 4))',
          description: 'Format phone number as (123) 456-7890',
          tags: ['phone', 'format', 'string']
        }
      ]
    },
    {
      name: 'Date Calculations',
      description: 'Working with dates and times',
      examples: [
        {
          title: 'Age Calculation',
          expression: 'FLOOR(DATEDIFF(TODAY(), [BirthDate], "day") / 365.25)',
          description: 'Calculate age in years',
          result: '25',
          tags: ['age', 'date', 'years']
        },
        {
          title: 'Days Until Due',
          expression: 'DATEDIFF([DueDate], TODAY(), "day")',
          description: 'Days remaining until due date',
          result: '14',
          tags: ['date', 'countdown', 'days']
        },
        {
          title: 'Quarter Label',
          expression: 'CONCAT("Q", QUARTER([Date]), " ", YEAR([Date]))',
          description: 'Format date as quarter (Q1 2024)',
          result: 'Q1 2024',
          tags: ['quarter', 'date', 'format']
        }
      ]
    }
  ],
  
  filter: [
    {
      name: 'Text Filters',
      description: 'Filter based on text patterns',
      examples: [
        {
          title: 'Contains Keyword',
          expression: 'CONTAINS([Description], "urgent")',
          description: 'Find rows containing specific text',
          tags: ['text', 'search', 'contains']
        },
        {
          title: 'Email Domain Filter',
          expression: 'ENDSWITH([Email], "@company.com")',
          description: 'Filter by email domain',
          tags: ['email', 'domain', 'filter']
        },
        {
          title: 'Pattern Match',
          expression: 'REGEXMATCH([ProductCode], "^[A-Z]{2}-\\d{4}$")',
          description: 'Match specific pattern (XX-0000)',
          tags: ['regex', 'pattern', 'match']
        }
      ]
    },
    {
      name: 'Numeric Filters',
      description: 'Filter based on numeric conditions',
      examples: [
        {
          title: 'Range Filter',
          expression: 'BETWEEN([Price], 10, 100)',
          description: 'Values within range',
          tags: ['range', 'between', 'numeric']
        },
        {
          title: 'Top Percentile',
          expression: '[Value] >= PERCENTILE([Value], 0.9)',
          description: 'Top 10% of values',
          tags: ['percentile', 'top', 'statistics']
        },
        {
          title: 'Above Average',
          expression: '[Score] > AVG([Score])',
          description: 'Values above average',
          tags: ['average', 'comparison', 'filter']
        }
      ]
    },
    {
      name: 'Complex Filters',
      description: 'Combine multiple conditions',
      examples: [
        {
          title: 'Active High-Value',
          expression: 'AND([Status] = "Active", [Value] > 1000, NOT(ISNULL([Email])))',
          description: 'Active records with high value and email',
          tags: ['complex', 'multiple', 'and']
        },
        {
          title: 'Priority Queue',
          expression: 'OR([Priority] = "High", AND([Priority] = "Medium", [Age] > 7))',
          description: 'High priority or aging medium priority',
          tags: ['priority', 'or', 'complex']
        },
        {
          title: 'Date Range',
          expression: 'AND([Date] >= DATEADD(TODAY(), -30, "day"), [Date] <= TODAY())',
          description: 'Last 30 days',
          tags: ['date', 'range', 'recent']
        }
      ]
    }
  ],
  
  validation: [
    {
      name: 'Data Validation',
      description: 'Validate data integrity',
      examples: [
        {
          title: 'Required Field',
          expression: 'NOT(ISNULL([RequiredField]))',
          description: 'Ensure field is not empty',
          tags: ['required', 'null', 'validation']
        },
        {
          title: 'Email Format',
          expression: 'REGEXMATCH([Email], "^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$")',
          description: 'Validate email format',
          tags: ['email', 'format', 'regex']
        },
        {
          title: 'Phone Format',
          expression: 'REGEXMATCH([Phone], "^\\d{3}-\\d{3}-\\d{4}$")',
          description: 'Validate phone format (123-456-7890)',
          tags: ['phone', 'format', 'validation']
        }
      ]
    },
    {
      name: 'Business Rules',
      description: 'Enforce business logic',
      examples: [
        {
          title: 'Date Logic',
          expression: '[EndDate] >= [StartDate]',
          description: 'End date must be after start date',
          tags: ['date', 'logic', 'rule']
        },
        {
          title: 'Percentage Range',
          expression: 'AND([Percentage] >= 0, [Percentage] <= 100)',
          description: 'Percentage between 0 and 100',
          tags: ['percentage', 'range', 'validation']
        },
        {
          title: 'Conditional Required',
          expression: 'IF([Type] = "Custom", NOT(ISNULL([CustomValue])), true)',
          description: 'Custom value required when type is Custom',
          tags: ['conditional', 'required', 'logic']
        }
      ]
    }
  ]
};

export const ExamplesTab: React.FC<ExamplesTabProps> = ({ mode, onSelect }) => {
  const examples = useMemo(() => EXAMPLE_LIBRARY[mode] || [], [mode]);

  const handleSelectExample = (expression: string) => {
    onSelect(expression);
  };

  const handleCopyExample = (expression: string) => {
    navigator.clipboard.writeText(expression);
  };

  const renderExample = (example: Example) => (
    <div
      key={example.title}
      className="group p-3 hover:bg-accent rounded-md cursor-pointer border border-transparent hover:border-border"
      onClick={() => handleSelectExample(example.expression)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{example.title}</span>
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            {example.description}
          </div>
          <code className="text-xs font-mono block bg-muted p-2 rounded overflow-x-auto">
            {example.expression}
          </code>
          {example.result && (
            <div className="text-xs text-muted-foreground mt-2">
              Result: <code className="bg-muted px-1 rounded">{example.result}</code>
            </div>
          )}
          {example.tags && (
            <div className="flex flex-wrap gap-1 mt-2">
              {example.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyExample(example.expression);
          }}
          title="Copy expression"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          <span className="text-sm font-medium">
            Examples for {mode} expressions
          </span>
        </div>
      </div>

      {/* Examples list */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {examples.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>No examples available for this mode</div>
            </div>
          ) : (
            examples.map(category => (
              <div key={category.name} className="mb-6">
                <div className="mb-3">
                  <h4 className="text-sm font-medium">{category.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <div className="space-y-2">
                  {category.examples.map(renderExample)}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Info */}
      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <ExternalLink className="h-3 w-3" />
          <span>Click any example to use it in your expression</span>
        </div>
      </div>
    </div>
  );
};