# Conditional Formatting Component

This component provides a comprehensive conditional formatting system for AG-Grid, allowing users to create rules that apply visual formatting based on cell or row values.

## Features

- **Expression-based Rules**: Use the Expression Editor to create complex conditions
- **Multiple Formatting Options**: Background color, text color, borders, icons, CSS classes
- **Rule Priority System**: Control execution order with priorities
- **Cell and Row Scope**: Apply formatting to individual cells or entire rows
- **Live Preview**: Test rules with sample data before applying
- **Templates**: Quick-start templates for common scenarios
- **Import/Export**: Save and share rule configurations

## Usage Example

```tsx
import { ConditionalFormattingDialog } from '@/components/conditional-formatting';
import { useState } from 'react';

function MyGrid() {
  const [formatRules, setFormatRules] = useState<ConditionalRule[]>([]);
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  
  const handleApplyRules = (rules: ConditionalRule[]) => {
    setFormatRules(rules);
    // Apply rules to your AG-Grid column definitions
    updateColumnDefs(applyConditionalFormatting(columnDefs, rules));
  };

  return (
    <>
      <Button onClick={() => setShowFormatDialog(true)}>
        Conditional Formatting
      </Button>
      
      <ConditionalFormattingDialog
        open={showFormatDialog}
        onOpenChange={setShowFormatDialog}
        columnId="price"
        columnName="Price"
        columnType="number"
        availableColumns={columns}
        rules={formatRules}
        onApply={handleApplyRules}
        onCancel={() => setShowFormatDialog(false)}
      />
    </>
  );
}
```

## Rule Structure

```typescript
interface ConditionalRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  expression: string;  // e.g., "[value] > 100"
  formatting: {
    style?: CSSProperties;
    cellClass?: string | string[];
    icon?: {
      name: string;
      position: 'start' | 'end';
      color?: string;
    };
    valueTransform?: {
      type: 'prefix' | 'suffix' | 'replace' | 'custom';
      value?: string;
    };
  };
  scope: {
    target: 'cell' | 'row';
    applyToColumns?: string[];
    highlightEntireRow?: boolean;
  };
}
```

## Expression Examples

- **Simple Value Check**: `[value] > 0`
- **Text Contains**: `CONTAINS([Status], "Complete")`
- **Null Check**: `ISNULL([value]) OR [value] = ""`
- **Date Comparison**: `[DueDate] < TODAY()`
- **Multiple Conditions**: `[Priority] = "High" AND [Status] != "Done"`
- **Row Reference**: `[row.Total] > 1000`

## Templates

The component includes pre-built templates for common scenarios:

- **Value-based**: Positive/Negative values, Above/Below average
- **Range-based**: Top/Bottom percentiles
- **Text-based**: Contains text, Empty cells, Duplicates
- **Date-based**: Today, Past due dates
- **Custom**: Status highlighting, Priority indicators

## Integration with AG-Grid

To apply conditional formatting rules to your AG-Grid:

```typescript
import { applyRulesToColumnDef } from '@/components/conditional-formatting';

// Apply rules to a specific column
const formattedColumnDef = applyRulesToColumnDef(originalColumnDef, rules);

// Or apply to all columns
const formattedColumnDefs = columnDefs.map(colDef => 
  applyRulesToColumnDef(colDef, rules.filter(r => 
    !r.scope.applyToColumns || r.scope.applyToColumns.includes(colDef.field)
  ))
);
```

## Styling

The component uses Tailwind CSS and shadcn/ui components. Custom styles can be applied through:

1. **Direct Style Properties**: Background color, text color, borders, etc.
2. **CSS Classes**: Apply custom CSS classes to cells
3. **Icons**: Add visual indicators with Lucide icons

## Performance Considerations

- Rules are evaluated in priority order (lower numbers first)
- Evaluation stops at the first matching rule (for cell formatting)
- Row-level rules can impact performance on large datasets
- Consider disabling complex rules during data updates

## Future Enhancements

- [ ] Rule groups and categories
- [ ] Conditional formatting based on other columns
- [ ] Gradient and pattern fills
- [ ] Data bars and color scales
- [ ] Rule inheritance and overrides