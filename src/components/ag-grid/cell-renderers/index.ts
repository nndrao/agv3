// Export all cell renderers
export { NumericCellRenderer } from './NumericCellRenderer';

// Export a components object for easy AG-Grid registration
export const cellRenderers = {
  NumericCellRenderer: () => import('./NumericCellRenderer').then(m => m.NumericCellRenderer),
};

// For direct import and registration
import { NumericCellRenderer } from './NumericCellRenderer';

export const agGridComponents = {
  NumericCellRenderer: NumericCellRenderer,
};