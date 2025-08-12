# Inline Style Editor Implementation

## Overview
The inline style editor allows users to visually define CSS styles for conditional formatting rules in AG-Grid. When users type a condition expression and press `Ctrl+Shift+D`, a visual style editor popup appears where they can configure styles without typing CSS manually.

## Key Features

### 1. Keyboard Shortcut (Ctrl+Shift+D)
- Opens visual style editor at cursor position
- Works with selected text or current line
- Automatically converts column references (e.g., `[pnl]` → `params.data.pnl`)

### 2. Visual Style Configuration
- **Colors**: Background and text color pickers
- **Typography**: Font family, size, weight, style
- **Borders**: Side, width, style, color configuration
- **Alignment**: Text alignment options
- **Opacity**: Slider for transparency
- **Live Preview**: Real-time preview of configured styles

### 3. Runtime CSS Generation
The system generates CSS classes dynamically at runtime:

```javascript
// User types in Monaco editor:
params.data.pnl >= 2000

// Press Ctrl+Shift+D, configure styles, then generates:
/* @rule-style {
  "id": "rule-pnl-2000",
  "styles": {
    "backgroundColor": "#10b981",
    "color": "#ffffff",
    "fontWeight": "bold"
  }
} */
params.data.pnl >= 2000
```

### 4. AG-Grid Integration
At runtime, the system:
1. Reads rule metadata from configuration
2. Generates unique CSS class names
3. Injects CSS into document
4. Creates cellClassRules for AG-Grid

```javascript
// Generated CSS
.cr-rule-pnl-2000 {
  background-color: #10b981;
  color: #ffffff;
  font-weight: bold;
}

// AG-Grid cellClassRules
columnDef.cellClassRules = {
  'cr-rule-pnl-2000': (params) => params.data.pnl >= 2000
}
```

## Architecture

### Components

#### 1. **InlineStyleEditor.tsx**
- Floating dialog component
- Reuses ShadcnFormatOptions for style configuration
- Handles save action to insert metadata

#### 2. **runtimeCssManager.ts**
- Generates CSS class names
- Injects CSS into document
- Manages style lifecycle
- Converts CSSProperties to CSS strings

#### 3. **conditionalRulesRuntime.ts**
- Loads rules from configuration
- Builds cellClassRules for AG-Grid
- Manages rule persistence
- Applies rules to column definitions

#### 4. **ExpressionEditor.tsx (Enhanced)**
- Added Ctrl+Shift+D keyboard shortcut
- Manages style editor popup state
- Inserts metadata into editor
- Handles expression context

## Workflow

1. **Create Rule**:
   - User types condition in Monaco editor
   - Presses Ctrl+Shift+D
   - Visual style editor opens

2. **Configure Styles**:
   - User configures styles visually
   - Live preview shows result
   - Click "Insert Style" to save

3. **Metadata Generation**:
   - System inserts metadata comment
   - Expression remains below metadata
   - Rule saved to configuration

4. **Runtime Application**:
   - Grid loads rules from configuration
   - CSS classes generated dynamically
   - Styles injected into document
   - cellClassRules applied to columns

## Storage

Rules are stored in localStorage with the key `conditionalFormattingRules`:

```json
[
  {
    "id": "rule-pnl-2000",
    "expression": "params.data.pnl >= 2000",
    "styles": {
      "backgroundColor": "#10b981",
      "color": "#ffffff",
      "fontWeight": "bold"
    },
    "enabled": true
  }
]
```

## Benefits

1. **No Manual CSS Typing**: Users configure styles visually
2. **Runtime Generation**: CSS classes created dynamically from configuration
3. **AG-Grid Compatible**: Works with cellClassRules API
4. **Reusable**: Rules can be applied to multiple columns
5. **Performance**: CSS classes are more efficient than inline styles
6. **Maintainable**: Clear separation between logic and presentation

## Usage Example

```javascript
// In conditional formatting dialog
1. Type: [pnl] >= 2000
2. Press: Ctrl+Shift+D
3. Configure: Green background, white text, bold
4. Save: Inserts metadata and expression
5. Runtime: Automatically applies to grid cells
```

## Files Modified

- `src/components/expression-editor/ExpressionEditor.tsx`
- `src/components/expression-editor/components/InlineStyleEditor.tsx`
- `src/utils/runtimeCssManager.ts`
- `src/utils/conditionalRulesRuntime.ts`
- `src/windows/datagrid/components/DataGridStompShared/index.tsx`

## Testing

Open `test-inline-style-editor.html` in a browser to see a demonstration of:
- Expression entry
- Metadata generation
- Runtime CSS injection
- Live grid styling
- Multiple rules application