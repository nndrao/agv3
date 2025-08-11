# Expression Editor Component

A sophisticated expression editor for AG-Grid column customization with syntax highlighting, IntelliSense, and a comprehensive function library.

## Features

- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Custom Expression Language**: Supports columns, variables, and functions
- **IntelliSense**: Auto-completion for columns, functions, and variables
- **Function Library**: 50+ built-in functions (math, string, date, logical, statistical)
- **Real-time Validation**: Syntax checking and error reporting
- **Live Preview**: Execute expressions and see results
- **Expression History**: Automatically saves recent expressions
- **Multiple Modes**: Conditional formatting, calculations, filters, validation

## Installation

Before using the Expression Editor, install the required dependencies:

```bash
npm install @monaco-editor/react monaco-editor
```

## Usage

### Basic Usage

```tsx
import { ExpressionEditor } from '@/components/expression-editor';
import { ColumnDefinition } from '@/types';

const columns: ColumnDefinition[] = [
  { field: 'Status', headerName: 'Status', type: 'text' },
  { field: 'Value', headerName: 'Value', type: 'number' }
];

function MyComponent() {
  const [expression, setExpression] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleChange = (expr: string, valid: boolean) => {
    setExpression(expr);
    setIsValid(valid);
  };

  return (
    <ExpressionEditor
      mode="conditional"
      initialExpression=""
      availableColumns={columns}
      onChange={handleChange}
      showPreview={true}
      showHistory={true}
    />
  );
}
```

### Dialog Usage

```tsx
import { ExpressionEditorDialog } from '@/components/expression-editor/ExpressionEditorDialog';

function MyComponent() {
  const handleSave = (expression: string, mode: ExpressionMode) => {
    console.log('Saved expression:', expression, 'for mode:', mode);
    // Apply the expression to your AG-Grid column
  };

  return (
    <ExpressionEditorDialog 
      mode="conditional"
      onSave={handleSave}
    />
  );
}
```

## Expression Syntax

### Column References
```
[ColumnName]
[Status]
[Price]
```

### Variables
```
${variableName}
${currentUser}
${threshold}
```

### Functions
```
UPPER([Name])
SUM([Price], [Tax])
IF([Status] = "Active", "green", "red")
```

### Conditional Formatting Example
```javascript
SWITCH([Status],
  "Done", { backgroundColor: "#4CAF50", color: "white" },
  "In Progress", { backgroundColor: "#FF9800", color: "white" },
  "Started", { backgroundColor: "#2196F3", color: "white" },
  { backgroundColor: "#f5f5f5", color: "#666" }
)
```

## Modes

### 1. Conditional Formatting (`conditional`)
Returns style objects for cell/row formatting based on conditions.

### 2. Calculated Columns (`calculation`)
Creates new column values based on expressions using other columns.

### 3. Filter Queries (`filter`)
Returns boolean values to filter rows.

### 4. Validation Rules (`validation`)
Returns boolean to validate cell values during editing.

## Function Categories

- **Math**: ABS, ROUND, FLOOR, CEIL, MOD, POWER, SQRT
- **Statistical**: SUM, AVG, MIN, MAX, COUNT, MEDIAN
- **String**: CONCAT, LENGTH, UPPER, LOWER, TRIM, REPLACE
- **Date**: NOW, TODAY, YEAR, MONTH, DATEADD, DATEDIFF
- **Logical**: IF, AND, OR, NOT, SWITCH, BETWEEN, IN

## Development

### Running the Demos

There are two demo components available:

1. **Full Page Demo** - Shows the Expression Editor in a full page layout:
```tsx
import { ExpressionEditorDemo } from '@/components/expression-editor/ExpressionEditorDemo';

// Add to your routes or render directly
<ExpressionEditorDemo />
```

2. **Dialog Demo** - Shows the Expression Editor in a dialog with save functionality:
```tsx
import { DialogDemo } from '@/components/expression-editor/DialogDemo';

// Add to your routes or render directly
<DialogDemo />
```

## Architecture

```
expression-editor/
├── ExpressionEditor.tsx       # Main component
├── types/                     # TypeScript interfaces
├── components/               # UI components
│   ├── ColumnsTab.tsx
│   ├── FunctionsTab.tsx
│   ├── VariablesTab.tsx
│   ├── HistoryTab.tsx
│   ├── ExamplesTab.tsx
│   ├── ValidationPanel.tsx
│   └── PreviewPanel.tsx
├── functions/                # Function library
│   └── functionLibrary.ts
├── utils/                    # Utilities
│   ├── monacoLanguage.ts    # Language definition
│   ├── completionProvider.ts # IntelliSense
│   └── validator.ts         # Expression validation
└── hooks/                   # React hooks
    └── useExpressionHistory.ts
```

## Next Steps

1. **ExpressionField Component**: Create inline expression field for form integration
2. **Advanced Functions**: Add more statistical and aggregation functions
3. **Custom Function Builder**: UI for users to create custom functions
4. **Performance Optimization**: Web Worker for expression evaluation
5. **Export/Import**: Share expressions between users/grids