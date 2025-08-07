import { Monaco } from '@monaco-editor/react';

export function registerExpressionLanguage(monaco: Monaco) {
  // Register the language
  monaco.languages.register({ id: 'expression' });

  // Define tokens for syntax highlighting
  monaco.languages.setMonarchTokensProvider('expression', {
    defaultToken: '',
    tokenPostfix: '.expression',

    keywords: [
      'if', 'then', 'else', 'and', 'or', 'not', 'in', 'between',
      'true', 'false', 'null', 'undefined'
    ],

    operators: [
      '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
      '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
      '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
      '%=', '<<=', '>>=', '>>>='
    ],

    // Common functions that should be highlighted
    builtinFunctions: [
      // Math
      'ABS', 'ROUND', 'FLOOR', 'CEIL', 'TRUNC', 'SIGN', 'MOD', 'POWER', 'SQRT', 'EXP', 'LN', 'LOG',
      'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'DEGREES', 'RADIANS', 'PI', 'RANDOM', 'RANDBETWEEN',
      // Statistical
      'SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'MEDIAN', 'MODE', 'STDEV', 'VAR', 'PERCENTILE', 'QUARTILE',
      'SUMIF', 'COUNTIF', 'AVGIF', 'SUMIFS', 'COUNTIFS',
      // String
      'CONCAT', 'LENGTH', 'UPPER', 'LOWER', 'PROPER', 'TRIM', 'LEFT', 'RIGHT', 'MID', 'SUBSTRING',
      'SPLIT', 'FIND', 'SEARCH', 'CONTAINS', 'STARTSWITH', 'ENDSWITH', 'REPLACE', 'SUBSTITUTE',
      'REPEAT', 'REVERSE', 'PADLEFT', 'PADRIGHT', 'REGEXMATCH', 'REGEXEXTRACT', 'REGEXREPLACE',
      // Date
      'NOW', 'TODAY', 'CURRENTTIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
      'WEEKDAY', 'WEEKNUM', 'QUARTER', 'DATEADD', 'DATEDIFF', 'DATETRUNC', 'LASTDAY', 'EOMONTH',
      'DATEFORMAT', 'DATEPARSE', 'ISOTEXT', 'UNIXTIME', 'FROMUNIXTIME',
      // Logical
      'IF', 'IFS', 'SWITCH', 'AND', 'OR', 'NOT', 'XOR', 'EQUALS', 'NOTEQUALS',
      'GREATERTHAN', 'LESSTHAN', 'BETWEEN', 'IN', 'ISNULL', 'ISNOTNULL', 'IFNULL', 'COALESCE',
      'NULLIF', 'ISNUMBER', 'ISTEXT', 'ISDATE', 'ISBOOLEAN', 'ISERROR', 'TYPE'
    ],

    // Define patterns
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    digits: /\d+(_+\d+)*/,
    octaldigits: /[0-7]+(_+[0-7]+)*/,
    binarydigits: /[0-1]+(_+[0-1]+)*/,
    hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

    tokenizer: {
      root: [
        // Column references [Column Name]
        [/\[([^\]]+)\]/, 'variable.name'],

        // Variables ${varName}
        [/\$\{([^}]+)\}/, 'variable.other'],

        // Functions
        [/[a-zA-Z_]\w*(?=\()/, {
          cases: {
            '@builtinFunctions': 'support.function',
            '@default': 'identifier'
          }
        }],

        // Identifiers
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],

        // Whitespace
        { include: '@whitespace' },

        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],

        // Numbers
        [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
        [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
        [/0[xX](@hexdigits)/, 'number.hex'],
        [/0[oO]?(@octaldigits)/, 'number.octal'],
        [/0[bB](@binarydigits)/, 'number.binary'],
        [/(@digits)/, 'number'],

        // Delimiter
        [/[;,.]/, 'delimiter'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop']
      ],
    },
  });

  // Define language configuration
  monaco.languages.setLanguageConfiguration('expression', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: new RegExp("^\\s*//\\s*#?region\\b"),
        end: new RegExp("^\\s*//\\s*#?endregion\\b")
      }
    },
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  });

  // Define theme rules for better highlighting
  monaco.editor.defineTheme('expression-theme-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'variable.name', foreground: '0066cc' },
      { token: 'variable.other', foreground: '0066cc' },
      { token: 'support.function', foreground: '795E26' },
      { token: 'keyword', foreground: '0000ff' },
      { token: 'operator', foreground: '000000' },
      { token: 'number', foreground: '098658' },
      { token: 'string', foreground: 'a31515' },
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    ],
    colors: {}
  });

  monaco.editor.defineTheme('expression-theme-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'variable.name', foreground: '4FC1FF' },
      { token: 'variable.other', foreground: '4FC1FF' },
      { token: 'support.function', foreground: 'DCDCAA' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    ],
    colors: {}
  });
}