import { ValueFormatterParams } from 'ag-grid-community';

// Pre-compiled regex for thousand separator - reused for performance
const THOUSAND_SEPARATOR_REGEX = /\B(?=(\d{3})+(?!\d))/g;

// Helper function to add thousand separators
const addThousandSeparator = (value: string): string => {
  const parts = value.split('.');
  parts[0] = parts[0].replace(THOUSAND_SEPARATOR_REGEX, ',');
  return parts.join('.');
};

// Base formatter function
const createDecimalFormatter = (decimals: number, withThousandSeparator: boolean = false) => {
  return (params: ValueFormatterParams): string => {
    // Handle null/undefined
    if (params.value == null) {
      return '';
    }

    // Convert to number
    const numValue = Number(params.value);
    
    // Handle NaN
    if (isNaN(numValue)) {
      return '';
    }

    // Format with fixed decimals
    const formatted = numValue.toFixed(decimals);
    
    // Add thousand separator if requested
    return withThousandSeparator ? addThousandSeparator(formatted) : formatted;
  };
};

// Pre-created formatters for 0-9 decimal places (for maximum performance)
export const formatter0Decimal = createDecimalFormatter(0);
export const formatter1Decimal = createDecimalFormatter(1);
export const formatter2Decimal = createDecimalFormatter(2);
export const formatter3Decimal = createDecimalFormatter(3);
export const formatter4Decimal = createDecimalFormatter(4);
export const formatter5Decimal = createDecimalFormatter(5);
export const formatter6Decimal = createDecimalFormatter(6);
export const formatter7Decimal = createDecimalFormatter(7);
export const formatter8Decimal = createDecimalFormatter(8);
export const formatter9Decimal = createDecimalFormatter(9);

// Pre-created formatters with thousand separators
export const formatter0DecimalWithThousandSeparator = createDecimalFormatter(0, true);
export const formatter1DecimalWithThousandSeparator = createDecimalFormatter(1, true);
export const formatter2DecimalWithThousandSeparator = createDecimalFormatter(2, true);
export const formatter3DecimalWithThousandSeparator = createDecimalFormatter(3, true);
export const formatter4DecimalWithThousandSeparator = createDecimalFormatter(4, true);
export const formatter5DecimalWithThousandSeparator = createDecimalFormatter(5, true);
export const formatter6DecimalWithThousandSeparator = createDecimalFormatter(6, true);
export const formatter7DecimalWithThousandSeparator = createDecimalFormatter(7, true);
export const formatter8DecimalWithThousandSeparator = createDecimalFormatter(8, true);
export const formatter9DecimalWithThousandSeparator = createDecimalFormatter(9, true);

// Registry object for string-based access
export const decimalFormatters = {
  '0Decimal': formatter0Decimal,
  '1Decimal': formatter1Decimal,
  '2Decimal': formatter2Decimal,
  '3Decimal': formatter3Decimal,
  '4Decimal': formatter4Decimal,
  '5Decimal': formatter5Decimal,
  '6Decimal': formatter6Decimal,
  '7Decimal': formatter7Decimal,
  '8Decimal': formatter8Decimal,
  '9Decimal': formatter9Decimal,
  '0DecimalWithThousandSeparator': formatter0DecimalWithThousandSeparator,
  '1DecimalWithThousandSeparator': formatter1DecimalWithThousandSeparator,
  '2DecimalWithThousandSeparator': formatter2DecimalWithThousandSeparator,
  '3DecimalWithThousandSeparator': formatter3DecimalWithThousandSeparator,
  '4DecimalWithThousandSeparator': formatter4DecimalWithThousandSeparator,
  '5DecimalWithThousandSeparator': formatter5DecimalWithThousandSeparator,
  '6DecimalWithThousandSeparator': formatter6DecimalWithThousandSeparator,
  '7DecimalWithThousandSeparator': formatter7DecimalWithThousandSeparator,
  '8DecimalWithThousandSeparator': formatter8DecimalWithThousandSeparator,
  '9DecimalWithThousandSeparator': formatter9DecimalWithThousandSeparator,
};

// Dynamic formatter factory for custom decimal places (cached for performance)
const formatterCache = new Map<string, (params: ValueFormatterParams) => string>();

export const getDecimalFormatter = (decimals: number, withThousandSeparator: boolean = false): ((params: ValueFormatterParams) => string) => {
  const key = `${decimals}${withThousandSeparator ? 'TS' : ''}`;
  
  if (!formatterCache.has(key)) {
    formatterCache.set(key, createDecimalFormatter(decimals, withThousandSeparator));
  }
  
  return formatterCache.get(key)!;
};