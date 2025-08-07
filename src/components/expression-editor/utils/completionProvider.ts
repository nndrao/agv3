import { Monaco } from '@monaco-editor/react';
import { languages } from 'monaco-editor';
import { ColumnDefinition } from '@/types';
import { Variable, CustomFunction } from '../types';
import { FUNCTION_LIBRARY } from '../functions/functionLibrary';

interface CompletionContext {
  columns: ColumnDefinition[];
  variables: Variable[];
  functions: CustomFunction[];
}

export function createCompletionProvider(
  monaco: Monaco,
  context: CompletionContext
): languages.CompletionItemProvider {
  return {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions: languages.CompletionItem[] = [];

      // Add column suggestions
      context.columns.forEach(column => {
        suggestions.push({
          label: column.field,
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: `[${column.field}]`,
          detail: `Column: ${column.headerName || column.field}`,
          documentation: `Type: ${column.type || 'any'}`,
          range: range
        });
      });

      // Add variable suggestions
      context.variables.forEach(variable => {
        suggestions.push({
          label: variable.name,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: `\${${variable.name}}`,
          detail: `Variable: ${variable.type}`,
          documentation: variable.description || '',
          range: range
        });
      });

      // Add function suggestions from library
      Object.values(FUNCTION_LIBRARY).forEach(func => {
        const params = func.parameters
          .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
          .join(', ');
        
        suggestions.push({
          label: func.name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `${func.name}(${func.parameters.map(p => p.name).join(', ')})`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: `${func.name}(${params}): ${func.returnType}`,
          documentation: {
            value: `**${func.description}**\n\n${func.examples.map(ex => 
              `\`${ex.expression}\` → \`${ex.result}\``
            ).join('\n')}`
          },
          range: range
        });
      });

      // Add custom functions
      context.functions.forEach(func => {
        suggestions.push({
          label: func.name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: func.name + '($1)',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: func.signature,
          documentation: func.description,
          range: range
        });
      });

      // Add keywords
      const keywords = ['if', 'then', 'else', 'and', 'or', 'not', 'in', 'between', 'true', 'false', 'null'];
      keywords.forEach(keyword => {
        suggestions.push({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range: range
        });
      });

      // Add operators
      const operators = ['==', '!=', '>', '<', '>=', '<=', '&&', '||', '+', '-', '*', '/', '%'];
      operators.forEach(op => {
        suggestions.push({
          label: op,
          kind: monaco.languages.CompletionItemKind.Operator,
          insertText: op,
          range: range
        });
      });

      // Add snippets
      suggestions.push({
        label: 'if-then-else',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'IF(${1:condition}, ${2:thenValue}, ${3:elseValue})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'If-then-else expression',
        range: range
      });

      suggestions.push({
        label: 'status-color-map',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: `SWITCH([Status],
  "Done", { backgroundColor: "#4CAF50", color: "white" },
  "In Progress", { backgroundColor: "#FF9800", color: "white" },
  "Started", { backgroundColor: "#2196F3", color: "white" },
  "Pending", { backgroundColor: "#9E9E9E", color: "white" },
  { backgroundColor: "#f5f5f5", color: "#666" }
)`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Status color mapping for conditional formatting',
        range: range
      });

      return { suggestions };
    },

    // Provide signature help for functions
    provideSignatureHelp: (model, position) => {
      // Simple implementation - can be enhanced
      const lineContent = model.getLineContent(position.lineNumber);
      const offset = position.column - 1;
      
      // Find function name before opening parenthesis
      let funcStart = offset;
      while (funcStart > 0 && lineContent[funcStart] !== '(') {
        funcStart--;
      }
      
      if (funcStart === 0) return null;
      
      // Extract function name
      let funcNameStart = funcStart - 1;
      while (funcNameStart > 0 && /[a-zA-Z_]/.test(lineContent[funcNameStart])) {
        funcNameStart--;
      }
      
      const funcName = lineContent.substring(funcNameStart + 1, funcStart).toUpperCase();
      const func = FUNCTION_LIBRARY[funcName];
      
      if (!func) return null;
      
      return {
        value: {
          signatures: [{
            label: func.signature,
            documentation: func.description,
            parameters: func.parameters.map(p => ({
              label: p.name,
              documentation: `${p.type} - ${p.description}`
            }))
          }],
          activeSignature: 0,
          activeParameter: 0 // Can be calculated based on comma count
        },
        dispose: () => {}
      };
    }
  };
}