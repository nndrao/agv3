// Export all formatters and utilities
export * from './DecimalFormatters';
export * from './DateFormatters';

// Import for creating the combined formatters object
import { decimalFormatters } from './DecimalFormatters';
import { dateFormatters } from './DateFormatters';

// Combined formatters object for AG-Grid registration
// This allows using valueFormatter as a string in column definitions
export const agGridValueFormatters = {
  ...decimalFormatters,
  ...dateFormatters,
  // Add more formatter types here as they are created
  // e.g., percentageFormatters, currencyFormatters, etc.
};

// Type for available formatter names
export type ValueFormatterName = keyof typeof agGridValueFormatters;

// Helper to get all available formatter names
export const getAvailableFormatters = (): string[] => {
  return Object.keys(agGridValueFormatters);
};