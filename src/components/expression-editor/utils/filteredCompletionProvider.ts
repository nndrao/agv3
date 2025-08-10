import { Monaco } from '@monaco-editor/react';
import { languages } from 'monaco-editor';
import { Variable, CustomFunction, ColumnDefinition } from '../types';
import { FUNCTION_LIBRARY } from '../functions/functionLibrary';

interface CompletionContext {
  columns: ColumnDefinition[];
  variables: Variable[];
  functions: CustomFunction[];
}

export type CompletionFilter = 'columns' | 'functions' | 'variables' | 'operators' | 'all';

export function createFilteredCompletionProvider(
  monaco: Monaco,
  context: CompletionContext,
  filter: CompletionFilter
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
      if (filter === 'columns' || filter === 'all') {
        context.columns.forEach(column => {
          suggestions.push({
            label: column.field,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: `[${column.field}]`,
            detail: `Column: ${column.headerName || column.field}`,
            documentation: `Type: ${column.type || 'any'}`,
            range: range,
            sortText: filter === 'columns' ? '0' + column.field : '2' + column.field
          });
        });
      }

      // Add variable suggestions
      if (filter === 'variables' || filter === 'all') {
        context.variables.forEach(variable => {
          suggestions.push({
            label: variable.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `\${${variable.name}}`,
            detail: `Variable: ${variable.type}`,
            documentation: variable.description || '',
            range: range,
            sortText: filter === 'variables' ? '0' + variable.name : '3' + variable.name
          });
        });
      }

      // Add function suggestions
      if (filter === 'functions' || filter === 'all') {
        // Add function suggestions from library
        Object.values(FUNCTION_LIBRARY).forEach(func => {
          const params = func.parameters
            .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
            .join(', ');
          
          suggestions.push({
            label: func.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func.name}(${func.parameters.map((p, i) => `\${${i + 1}:${p.name}}`).join(', ')})`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: `${func.name}(${params}): ${func.returnType}`,
            documentation: {
              value: `**${func.description}**\n\n${func.examples.map(ex => 
                `\`${ex.expression}\` → \`${ex.result}\``
              ).join('\n')}`
            },
            range: range,
            sortText: filter === 'functions' ? '0' + func.name : '1' + func.name
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
            range: range,
            sortText: filter === 'functions' ? '0' + func.name : '1' + func.name
          });
        });
      }

      // Add operators
      if (filter === 'operators' || filter === 'all') {
        const operators = [
          { label: '==', doc: 'Equal to' },
          { label: '!=', doc: 'Not equal to' },
          { label: '>', doc: 'Greater than' },
          { label: '<', doc: 'Less than' },
          { label: '>=', doc: 'Greater than or equal to' },
          { label: '<=', doc: 'Less than or equal to' },
          { label: '&&', doc: 'Logical AND' },
          { label: '||', doc: 'Logical OR' },
          { label: '+', doc: 'Addition' },
          { label: '-', doc: 'Subtraction' },
          { label: '*', doc: 'Multiplication' },
          { label: '/', doc: 'Division' },
          { label: '%', doc: 'Modulo' }
        ];
        
        operators.forEach(op => {
          suggestions.push({
            label: op.label,
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: ` ${op.label} `,
            detail: op.doc,
            range: range,
            sortText: filter === 'operators' ? '0' + op.label : '4' + op.label
          });
        });
      }

      // Add keywords only in 'all' mode
      if (filter === 'all') {
        const keywords = ['if', 'then', 'else', 'and', 'or', 'not', 'in', 'between', 'true', 'false', 'null'];
        keywords.forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range: range,
            sortText: '5' + keyword
          });
        });

        // Add snippets
        suggestions.push({
          label: 'if-then-else',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'IF(${1:condition}, ${2:thenValue}, ${3:elseValue})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If-then-else expression',
          range: range,
          sortText: '6if'
        });
      }

      return { suggestions };
    }
  };
}