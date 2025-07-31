import { ICellRenderer, ICellRendererParams } from 'ag-grid-community';

export class NumericCellRenderer implements ICellRenderer {
  private eGui!: HTMLSpanElement;
  
  // Theme-aware colors for positive, negative, and zero values
  private static readonly COLORS = {
    light: {
      positive: '#00695C', // Darker teal for better contrast
      negative: '#D32F2F', // Darker red for better visibility
      zero: ''            // Default color (inherit from theme)
    },
    dark: {
      positive: '#40E0D0', // Bright turquoise/teal
      negative: '#FF4500', // OrangeRed
      zero: ''            // Default color (inherit from theme)
    }
  };

  init(params: ICellRendererParams): void {
    // Create the cell element
    this.eGui = document.createElement('span');
    
    // Preserve all default cell styling by inheriting parent styles
    this.eGui.style.display = 'inline';
    this.eGui.style.width = '100%';
    
    // Set the value - use valueFormatted if available (from valueFormatter)
    this.setValue(params.valueFormatted ?? params.value, params.value);
  }

  getGui(): HTMLElement {
    return this.eGui;
  }

  refresh(params: ICellRendererParams): boolean {
    // Update the value when data changes - use valueFormatted if available
    this.setValue(params.valueFormatted ?? params.value, params.value);
    return true;
  }

  destroy(): void {
    // Cleanup if needed
  }

  private isDarkMode(): boolean {
    // Check if we're in dark mode by looking at the body's data attribute
    // AG-Grid sets data-ag-theme-mode="dark" when in dark mode
    const isDark = document.body.dataset.agThemeMode === 'dark';
    
    // Also check if the root element has dark class as a fallback
    if (!isDark) {
      return document.documentElement.classList.contains('dark');
    }
    
    return isDark;
  }

  private setValue(displayValue: unknown, rawValue?: unknown): void {
    // Use raw value for color determination, display value for text
    const valueForColor = rawValue ?? displayValue;
    
    // Handle null or undefined values
    if (displayValue == null) {
      this.eGui.textContent = '';
      this.eGui.style.color = '';
      return;
    }

    // Convert raw value to number for color determination
    const numValue = Number(valueForColor);
    
    // Get the appropriate color set based on theme
    const colors = this.isDarkMode() ? NumericCellRenderer.COLORS.dark : NumericCellRenderer.COLORS.light;
    
    // Apply color based on the raw numeric value
    if (!isNaN(numValue)) {
      if (numValue > 0) {
        this.eGui.style.color = colors.positive;
      } else if (numValue < 0) {
        this.eGui.style.color = colors.negative;
      } else {
        this.eGui.style.color = colors.zero;
      }
    } else {
      this.eGui.style.color = '';
    }

    // Display the formatted value, removing minus sign if present
    // The color already indicates negative values
    let textContent = String(displayValue);
    if (textContent.startsWith('-')) {
      textContent = textContent.substring(1);
    }
    this.eGui.textContent = textContent;
  }
}