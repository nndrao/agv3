export const FUNCTION_LIBRARY: Record<string, any> = {
  // Math Functions
  ABS: {
    name: 'ABS',
    category: 'math',
    signature: 'ABS(number)',
    description: 'Returns the absolute value of a number',
    parameters: [
      { name: 'number', type: 'number', description: 'The number to get absolute value of' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'ABS(-5)', result: 5 },
      { expression: 'ABS(3.14)', result: 3.14 }
    ]
  },
  
  ROUND: {
    name: 'ROUND',
    category: 'math',
    signature: 'ROUND(number, decimals)',
    description: 'Rounds a number to specified decimal places',
    parameters: [
      { name: 'number', type: 'number', description: 'The number to round' },
      { name: 'decimals', type: 'number', description: 'Number of decimal places', optional: true, defaultValue: 0 }
    ],
    returnType: 'number',
    examples: [
      { expression: 'ROUND(3.14159, 2)', result: 3.14 },
      { expression: 'ROUND(10.5)', result: 11 }
    ]
  },

  FLOOR: {
    name: 'FLOOR',
    category: 'math',
    signature: 'FLOOR(number)',
    description: 'Rounds down to the nearest integer',
    parameters: [
      { name: 'number', type: 'number', description: 'The number to round down' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'FLOOR(3.9)', result: 3 },
      { expression: 'FLOOR(-2.1)', result: -3 }
    ]
  },

  CEIL: {
    name: 'CEIL',
    category: 'math',
    signature: 'CEIL(number)',
    description: 'Rounds up to the nearest integer',
    parameters: [
      { name: 'number', type: 'number', description: 'The number to round up' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'CEIL(3.1)', result: 4 },
      { expression: 'CEIL(-2.9)', result: -2 }
    ]
  },

  MOD: {
    name: 'MOD',
    category: 'math',
    signature: 'MOD(dividend, divisor)',
    description: 'Returns the remainder of division',
    parameters: [
      { name: 'dividend', type: 'number', description: 'The number to divide' },
      { name: 'divisor', type: 'number', description: 'The number to divide by' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'MOD(10, 3)', result: 1 },
      { expression: 'MOD(20, 4)', result: 0 }
    ]
  },

  POWER: {
    name: 'POWER',
    category: 'math',
    signature: 'POWER(base, exponent)',
    description: 'Raises a number to a power',
    parameters: [
      { name: 'base', type: 'number', description: 'The base number' },
      { name: 'exponent', type: 'number', description: 'The exponent' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'POWER(2, 3)', result: 8 },
      { expression: 'POWER(10, 2)', result: 100 }
    ]
  },

  SQRT: {
    name: 'SQRT',
    category: 'math',
    signature: 'SQRT(number)',
    description: 'Returns the square root of a number',
    parameters: [
      { name: 'number', type: 'number', description: 'The number to get square root of' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'SQRT(16)', result: 4 },
      { expression: 'SQRT(2)', result: 1.414 }
    ]
  },

  // Statistical Functions
  SUM: {
    name: 'SUM',
    category: 'statistical',
    signature: 'SUM(...values)',
    description: 'Returns the sum of all values',
    parameters: [
      { name: 'values', type: 'number', description: 'Values to sum' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'SUM(1, 2, 3, 4, 5)', result: 15 },
      { expression: 'SUM([Price], [Tax])', result: 'Sum of Price and Tax columns' }
    ]
  },

  AVG: {
    name: 'AVG',
    category: 'statistical',
    signature: 'AVG(...values)',
    description: 'Returns the average of all values',
    parameters: [
      { name: 'values', type: 'number', description: 'Values to average' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'AVG(10, 20, 30)', result: 20 },
      { expression: 'AVG([Q1], [Q2], [Q3], [Q4])', result: 'Average of quarterly values' }
    ]
  },

  MIN: {
    name: 'MIN',
    category: 'statistical',
    signature: 'MIN(...values)',
    description: 'Returns the minimum value',
    parameters: [
      { name: 'values', type: 'number', description: 'Values to compare' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'MIN(5, 3, 8, 1)', result: 1 },
      { expression: 'MIN([Price1], [Price2])', result: 'Lower of two prices' }
    ]
  },

  MAX: {
    name: 'MAX',
    category: 'statistical',
    signature: 'MAX(...values)',
    description: 'Returns the maximum value',
    parameters: [
      { name: 'values', type: 'number', description: 'Values to compare' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'MAX(5, 3, 8, 1)', result: 8 },
      { expression: 'MAX([Score1], [Score2])', result: 'Higher of two scores' }
    ]
  },

  COUNT: {
    name: 'COUNT',
    category: 'statistical',
    signature: 'COUNT(...values)',
    description: 'Counts non-null values',
    parameters: [
      { name: 'values', type: 'any', description: 'Values to count' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'COUNT(1, 2, null, 4)', result: 3 },
      { expression: 'COUNT([OrderID])', result: 'Number of orders' }
    ]
  },

  // String Functions
  CONCAT: {
    name: 'CONCAT',
    category: 'string',
    signature: 'CONCAT(...texts)',
    description: 'Concatenates multiple text values',
    parameters: [
      { name: 'texts', type: 'string', description: 'Text values to concatenate' }
    ],
    returnType: 'string',
    examples: [
      { expression: 'CONCAT("Hello", " ", "World")', result: 'Hello World' },
      { expression: 'CONCAT([FirstName], " ", [LastName])', result: 'Full name' }
    ]
  },

  LENGTH: {
    name: 'LENGTH',
    category: 'string',
    signature: 'LENGTH(text)',
    description: 'Returns the length of text',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to measure' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'LENGTH("Hello")', result: 5 },
      { expression: 'LENGTH([Description])', result: 'Length of description' }
    ]
  },

  UPPER: {
    name: 'UPPER',
    category: 'string',
    signature: 'UPPER(text)',
    description: 'Converts text to uppercase',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to convert' }
    ],
    returnType: 'string',
    examples: [
      { expression: 'UPPER("hello")', result: 'HELLO' },
      { expression: 'UPPER([ProductCode])', result: 'Uppercase product code' }
    ]
  },

  LOWER: {
    name: 'LOWER',
    category: 'string',
    signature: 'LOWER(text)',
    description: 'Converts text to lowercase',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to convert' }
    ],
    returnType: 'string',
    examples: [
      { expression: 'LOWER("HELLO")', result: 'hello' },
      { expression: 'LOWER([Email])', result: 'Lowercase email' }
    ]
  },

  TRIM: {
    name: 'TRIM',
    category: 'string',
    signature: 'TRIM(text)',
    description: 'Removes leading and trailing spaces',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to trim' }
    ],
    returnType: 'string',
    examples: [
      { expression: 'TRIM("  hello  ")', result: 'hello' },
      { expression: 'TRIM([UserInput])', result: 'Trimmed input' }
    ]
  },

  LEFT: {
    name: 'LEFT',
    category: 'string',
    signature: 'LEFT(text, count)',
    description: 'Returns leftmost characters',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to extract from' },
      { name: 'count', type: 'number', description: 'Number of characters' }
    ],
    returnType: 'string',
    examples: [
      { expression: 'LEFT("Hello World", 5)', result: 'Hello' },
      { expression: 'LEFT([PostalCode], 3)', result: 'First 3 digits' }
    ]
  },

  RIGHT: {
    name: 'RIGHT',
    category: 'string',
    signature: 'RIGHT(text, count)',
    description: 'Returns rightmost characters',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to extract from' },
      { name: 'count', type: 'number', description: 'Number of characters' }
    ],
    returnType: 'string',
    examples: [
      { expression: 'RIGHT("Hello World", 5)', result: 'World' },
      { expression: 'RIGHT([AccountNumber], 4)', result: 'Last 4 digits' }
    ]
  },

  REPLACE: {
    name: 'REPLACE',
    category: 'string',
    signature: 'REPLACE(text, oldText, newText)',
    description: 'Replaces text within a string',
    parameters: [
      { name: 'text', type: 'string', description: 'Original text' },
      { name: 'oldText', type: 'string', description: 'Text to find' },
      { name: 'newText', type: 'string', description: 'Replacement text' }
    ],
    returnType: 'string',
    examples: [
      { expression: 'REPLACE("Hello World", "World", "Universe")', result: 'Hello Universe' },
      { expression: 'REPLACE([Phone], "-", "")', result: 'Phone without dashes' }
    ]
  },

  CONTAINS: {
    name: 'CONTAINS',
    category: 'string',
    signature: 'CONTAINS(text, search)',
    description: 'Checks if text contains a substring',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to search in' },
      { name: 'search', type: 'string', description: 'Text to search for' }
    ],
    returnType: 'boolean',
    examples: [
      { expression: 'CONTAINS("Hello World", "World")', result: true },
      { expression: 'CONTAINS([Email], "@gmail.com")', result: 'Check for Gmail' }
    ]
  },

  // Date Functions
  NOW: {
    name: 'NOW',
    category: 'date',
    signature: 'NOW()',
    description: 'Returns current date and time',
    parameters: [],
    returnType: 'date',
    examples: [
      { expression: 'NOW()', result: '2024-01-15 14:30:00' }
    ]
  },

  TODAY: {
    name: 'TODAY',
    category: 'date',
    signature: 'TODAY()',
    description: 'Returns current date',
    parameters: [],
    returnType: 'date',
    examples: [
      { expression: 'TODAY()', result: '2024-01-15' }
    ]
  },

  YEAR: {
    name: 'YEAR',
    category: 'date',
    signature: 'YEAR(date)',
    description: 'Extracts year from date',
    parameters: [
      { name: 'date', type: 'date', description: 'Date to extract year from' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'YEAR("2024-01-15")', result: 2024 },
      { expression: 'YEAR([OrderDate])', result: 'Order year' }
    ]
  },

  MONTH: {
    name: 'MONTH',
    category: 'date',
    signature: 'MONTH(date)',
    description: 'Extracts month from date (1-12)',
    parameters: [
      { name: 'date', type: 'date', description: 'Date to extract month from' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'MONTH("2024-01-15")', result: 1 },
      { expression: 'MONTH([BirthDate])', result: 'Birth month' }
    ]
  },

  DAY: {
    name: 'DAY',
    category: 'date',
    signature: 'DAY(date)',
    description: 'Extracts day from date',
    parameters: [
      { name: 'date', type: 'date', description: 'Date to extract day from' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'DAY("2024-01-15")', result: 15 },
      { expression: 'DAY([DueDate])', result: 'Due day' }
    ]
  },

  DATEADD: {
    name: 'DATEADD',
    category: 'date',
    signature: 'DATEADD(date, interval, unit)',
    description: 'Adds interval to date',
    parameters: [
      { name: 'date', type: 'date', description: 'Starting date' },
      { name: 'interval', type: 'number', description: 'Number to add' },
      { name: 'unit', type: 'string', description: 'Unit: day, month, year' }
    ],
    returnType: 'date',
    examples: [
      { expression: 'DATEADD("2024-01-15", 7, "day")', result: '2024-01-22' },
      { expression: 'DATEADD([StartDate], 1, "month")', result: 'One month later' }
    ]
  },

  DATEDIFF: {
    name: 'DATEDIFF',
    category: 'date',
    signature: 'DATEDIFF(date1, date2, unit)',
    description: 'Returns difference between dates',
    parameters: [
      { name: 'date1', type: 'date', description: 'First date' },
      { name: 'date2', type: 'date', description: 'Second date' },
      { name: 'unit', type: 'string', description: 'Unit: day, month, year' }
    ],
    returnType: 'number',
    examples: [
      { expression: 'DATEDIFF("2024-01-22", "2024-01-15", "day")', result: 7 },
      { expression: 'DATEDIFF([EndDate], [StartDate], "day")', result: 'Days between' }
    ]
  },

  DATEFORMAT: {
    name: 'DATEFORMAT',
    category: 'date',
    signature: 'DATEFORMAT(date, format)',
    description: 'Formats date as string',
    parameters: [
      { name: 'date', type: 'date', description: 'Date to format' },
      { name: 'format', type: 'string', description: 'Format pattern' }
    ],
    returnType: 'string',
    examples: [
      { expression: 'DATEFORMAT("2024-01-15", "MMM dd, yyyy")', result: 'Jan 15, 2024' },
      { expression: 'DATEFORMAT([OrderDate], "yyyy-MM-dd")', result: 'ISO format' }
    ]
  },

  // Logical Functions
  IF: {
    name: 'IF',
    category: 'logical',
    signature: 'IF(condition, thenValue, elseValue)',
    description: 'Returns value based on condition',
    parameters: [
      { name: 'condition', type: 'boolean', description: 'Condition to test' },
      { name: 'thenValue', type: 'any', description: 'Value if true' },
      { name: 'elseValue', type: 'any', description: 'Value if false' }
    ],
    returnType: 'any',
    examples: [
      { expression: 'IF([Score] > 90, "A", "B")', result: 'Grade based on score' },
      { expression: 'IF([Quantity] = 0, "Out of Stock", "In Stock")', result: 'Stock status' }
    ]
  },

  AND: {
    name: 'AND',
    category: 'logical',
    signature: 'AND(...conditions)',
    description: 'Returns true if all conditions are true',
    parameters: [
      { name: 'conditions', type: 'boolean', description: 'Conditions to test' }
    ],
    returnType: 'boolean',
    examples: [
      { expression: 'AND([Age] >= 18, [HasLicense] = true)', result: 'Can drive' },
      { expression: 'AND([Status] = "Active", [Balance] > 0)', result: 'Active with balance' }
    ]
  },

  OR: {
    name: 'OR',
    category: 'logical',
    signature: 'OR(...conditions)',
    description: 'Returns true if any condition is true',
    parameters: [
      { name: 'conditions', type: 'boolean', description: 'Conditions to test' }
    ],
    returnType: 'boolean',
    examples: [
      { expression: 'OR([Status] = "Gold", [Status] = "Platinum")', result: 'Premium member' },
      { expression: 'OR([Urgent] = true, [Priority] = "High")', result: 'Needs attention' }
    ]
  },

  NOT: {
    name: 'NOT',
    category: 'logical',
    signature: 'NOT(condition)',
    description: 'Inverts boolean value',
    parameters: [
      { name: 'condition', type: 'boolean', description: 'Condition to invert' }
    ],
    returnType: 'boolean',
    examples: [
      { expression: 'NOT([IsDeleted])', result: 'Is active' },
      { expression: 'NOT(CONTAINS([Email], "@"))', result: 'Invalid email' }
    ]
  },

  ISNULL: {
    name: 'ISNULL',
    category: 'logical',
    signature: 'ISNULL(value)',
    description: 'Checks if value is null',
    parameters: [
      { name: 'value', type: 'any', description: 'Value to check' }
    ],
    returnType: 'boolean',
    examples: [
      { expression: 'ISNULL([MiddleName])', result: 'No middle name' },
      { expression: 'ISNULL([DeletedDate])', result: 'Not deleted' }
    ]
  },

  IFNULL: {
    name: 'IFNULL',
    category: 'logical',
    signature: 'IFNULL(value, defaultValue)',
    description: 'Returns default if value is null',
    parameters: [
      { name: 'value', type: 'any', description: 'Value to check' },
      { name: 'defaultValue', type: 'any', description: 'Default value' }
    ],
    returnType: 'any',
    examples: [
      { expression: 'IFNULL([Nickname], [FirstName])', result: 'Nickname or first name' },
      { expression: 'IFNULL([Discount], 0)', result: 'Discount or zero' }
    ]
  },

  SWITCH: {
    name: 'SWITCH',
    category: 'logical',
    signature: 'SWITCH(expression, case1, value1, case2, value2, ..., default)',
    description: 'Returns value based on matching case',
    parameters: [
      { name: 'expression', type: 'any', description: 'Expression to match' },
      { name: 'cases', type: 'any', description: 'Case/value pairs' },
      { name: 'default', type: 'any', description: 'Default value', optional: true }
    ],
    returnType: 'any',
    examples: [
      { 
        expression: 'SWITCH([Status], "New", "blue", "Active", "green", "Closed", "gray", "black")', 
        result: 'Status color' 
      }
    ]
  },

  BETWEEN: {
    name: 'BETWEEN',
    category: 'logical',
    signature: 'BETWEEN(value, min, max)',
    description: 'Checks if value is between min and max',
    parameters: [
      { name: 'value', type: 'number', description: 'Value to check' },
      { name: 'min', type: 'number', description: 'Minimum value' },
      { name: 'max', type: 'number', description: 'Maximum value' }
    ],
    returnType: 'boolean',
    examples: [
      { expression: 'BETWEEN([Age], 18, 65)', result: 'Working age' },
      { expression: 'BETWEEN([Score], 0, 100)', result: 'Valid score' }
    ]
  },

  IN: {
    name: 'IN',
    category: 'logical',
    signature: 'IN(value, ...list)',
    description: 'Checks if value is in list',
    parameters: [
      { name: 'value', type: 'any', description: 'Value to check' },
      { name: 'list', type: 'any', description: 'List of values' }
    ],
    returnType: 'boolean',
    examples: [
      { expression: 'IN([Status], "Active", "Pending", "New")', result: 'Is open status' },
      { expression: 'IN([Country], "US", "CA", "MX")', result: 'North America' }
    ]
  }
};