import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/openfin/openfin-select';
import { 
  Square, 
  Minus, 
  MoreHorizontal,
  Circle,
  Palette,
  Maximize2,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft
} from 'lucide-react';

interface BorderStyle {
  width?: string;
  style?: string;
  color?: string;
}

interface BorderStyles {
  borderTop?: BorderStyle | string;
  borderRight?: BorderStyle | string;
  borderBottom?: BorderStyle | string;
  borderLeft?: BorderStyle | string;
  border?: string;
}

interface BorderStyleEditorProps {
  value: BorderStyles;
  onChange: (value: BorderStyles) => void;
}

const borderWidths = [
  { value: '0', label: 'None' },
  { value: '1px', label: '1px' },
  { value: '2px', label: '2px' },
  { value: '3px', label: '3px' },
  { value: '4px', label: '4px' },
  { value: '5px', label: '5px' },
];

const borderStyles = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
  { value: 'groove', label: 'Groove' },
  { value: 'ridge', label: 'Ridge' },
  { value: 'inset', label: 'Inset' },
  { value: 'outset', label: 'Outset' },
];

export const BorderStyleEditor: React.FC<BorderStyleEditorProps> = ({
  value,
  onChange
}) => {
  const [useIndividualSides, setUseIndividualSides] = React.useState(false);
  
  // Parse border string (e.g., "2px solid #000") into parts
  const parseBorder = (borderStr: string): BorderStyle => {
    if (!borderStr) return { width: '0', style: 'none', color: '#000000' };
    const parts = borderStr.split(' ').filter(Boolean);
    return {
      width: parts[0] || '0',
      style: parts[1] || 'none',
      color: parts[2] || '#000000'
    };
  };

  // Convert BorderStyle object to string
  const borderToString = (border: BorderStyle): string => {
    if (!border.width || border.width === '0' || border.style === 'none') return '';
    return `${border.width} ${border.style} ${border.color}`;
  };

  // Get current values for all sides
  const allSides = parseBorder(value.border || '');
  const topSide = typeof value.borderTop === 'string' ? parseBorder(value.borderTop) : allSides;
  const rightSide = typeof value.borderRight === 'string' ? parseBorder(value.borderRight) : allSides;
  const bottomSide = typeof value.borderBottom === 'string' ? parseBorder(value.borderBottom) : allSides;
  const leftSide = typeof value.borderLeft === 'string' ? parseBorder(value.borderLeft) : allSides;

  const updateBorder = (side: 'all' | 'top' | 'right' | 'bottom' | 'left', property: keyof BorderStyle, val: string) => {
    if (side === 'all') {
      const newBorder = { ...allSides, [property]: val };
      onChange({ border: borderToString(newBorder) });
    } else {
      const sides = { top: topSide, right: rightSide, bottom: bottomSide, left: leftSide };
      const newSide = { ...sides[side], [property]: val };
      const borderKey = `border${side.charAt(0).toUpperCase() + side.slice(1)}` as keyof BorderStyles;
      onChange({
        ...value,
        [borderKey]: borderToString(newSide)
      });
    }
  };

  const sideIcons = {
    top: ArrowUp,
    right: ArrowRight,
    bottom: ArrowDown,
    left: ArrowLeft
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Square className="cf-icon-xs text-muted-foreground" />
          <Label className="cf-text-label">Border Style</Label>
        </div>
        <button
          type="button"
          onClick={() => setUseIndividualSides(!useIndividualSides)}
          className="cf-text-small text-primary hover:underline flex items-center gap-1"
        >
          <Maximize2 className="cf-icon-xs" />
          {useIndividualSides ? 'Use same for all' : 'Individual sides'}
        </button>
      </div>

      {!useIndividualSides ? (
        // All sides same
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Minus className="cf-icon-xs text-muted-foreground" />
              <Label className="cf-text-sublabel">Width</Label>
            </div>
            <Select
              value={allSides.width}
              onValueChange={(val) => updateBorder('all', 'width', val)}
            >
              <SelectTrigger className="cf-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {borderWidths.map(w => (
                  <SelectItem key={w.value} value={w.value} className="cf-text-small">{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <MoreHorizontal className="cf-icon-xs text-muted-foreground" />
              <Label className="cf-text-sublabel">Style</Label>
            </div>
            <Select
              value={allSides.style}
              onValueChange={(val) => updateBorder('all', 'style', val)}
            >
              <SelectTrigger className="cf-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {borderStyles.map(s => (
                  <SelectItem key={s.value} value={s.value} className="cf-text-small">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Palette className="cf-icon-xs text-muted-foreground" />
              <Label className="cf-text-sublabel">Color</Label>
            </div>
            <input
              type="color"
              value={allSides.color}
              onChange={(e) => updateBorder('all', 'color', e.target.value)}
              className="h-8 w-full rounded border cursor-pointer"
            />
          </div>
        </div>
      ) : (
        // Individual sides
        <div className="space-y-2">
          {(['top', 'right', 'bottom', 'left'] as const).map(side => {
            const sideValue = side === 'top' ? topSide : 
                           side === 'right' ? rightSide :
                           side === 'bottom' ? bottomSide : leftSide;
            const Icon = sideIcons[side];
            return (
              <div key={side} className="grid grid-cols-4 gap-2 items-center">
                <div className="flex items-center gap-1">
                  <Icon className="cf-icon-xs text-muted-foreground" />
                  <Label className="cf-text-tiny capitalize">{side}</Label>
                </div>
                <Select
                  value={sideValue.width}
                  onValueChange={(val) => updateBorder(side, 'width', val)}
                >
                  <SelectTrigger className="cf-input-small">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {borderWidths.map(w => (
                      <SelectItem key={w.value} value={w.value} className="cf-text-small">{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={sideValue.style}
                  onValueChange={(val) => updateBorder(side, 'style', val)}
                >
                  <SelectTrigger className="cf-input-small">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {borderStyles.map(s => (
                      <SelectItem key={s.value} value={s.value} className="cf-text-small">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <input
                  type="color"
                  value={sideValue.color}
                  onChange={(e) => updateBorder(side, 'color', e.target.value)}
                  className="h-7 w-full rounded border cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};