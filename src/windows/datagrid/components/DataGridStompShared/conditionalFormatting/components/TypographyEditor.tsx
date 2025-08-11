import React from 'react';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/openfin/openfin-select';
import { 
  Type, 
  ALargeSmall, 
  Bold as BoldIcon,
  Italic as ItalicIcon,
  AlignLeft,
  Underline,
  Space,
  AlignVerticalSpaceAround
} from 'lucide-react';

interface TypographyStyles {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  textDecoration?: string;
  letterSpacing?: string;
  lineHeight?: string;
}

interface TypographyEditorProps {
  value: TypographyStyles;
  onChange: (value: TypographyStyles) => void;
}

// Rich font family options
const fontFamilies = [
  { value: 'inherit', label: 'Default' },
  { value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', label: 'System UI' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Helvetica Neue", Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: '"Source Sans Pro", sans-serif', label: 'Source Sans Pro' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: 'Garamond, serif', label: 'Garamond' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: 'Monaco, monospace', label: 'Monaco' },
  { value: '"SF Mono", monospace', label: 'SF Mono' },
  { value: 'Consolas, monospace', label: 'Consolas' },
  { value: '"Fira Code", monospace', label: 'Fira Code' },
];

// Rich font size options
const fontSizes = [
  { value: 'inherit', label: 'Default' },
  { value: '8px', label: '8px - Tiny' },
  { value: '9px', label: '9px' },
  { value: '10px', label: '10px - X-Small' },
  { value: '11px', label: '11px' },
  { value: '12px', label: '12px - Small' },
  { value: '13px', label: '13px' },
  { value: '14px', label: '14px - Normal' },
  { value: '15px', label: '15px' },
  { value: '16px', label: '16px - Medium' },
  { value: '18px', label: '18px - Large' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px - X-Large' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px - XX-Large' },
  { value: '36px', label: '36px' },
  { value: '48px', label: '48px - Huge' },
];

// Rich font weight options
const fontWeights = [
  { value: 'inherit', label: 'Default' },
  { value: '100', label: '100 - Thin' },
  { value: '200', label: '200 - Extra Light' },
  { value: '300', label: '300 - Light' },
  { value: '400', label: '400 - Normal' },
  { value: '500', label: '500 - Medium' },
  { value: '600', label: '600 - Semi Bold' },
  { value: '700', label: '700 - Bold' },
  { value: '800', label: '800 - Extra Bold' },
  { value: '900', label: '900 - Black' },
];

// Font style options
const fontStyles = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Italic' },
  { value: 'oblique', label: 'Oblique' },
];

// Text alignment options
const textAlignments = [
  { value: 'inherit', label: 'Default' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

// Text decoration options
const textDecorations = [
  { value: 'none', label: 'None' },
  { value: 'underline', label: 'Underline' },
  { value: 'overline', label: 'Overline' },
  { value: 'line-through', label: 'Line Through' },
  { value: 'underline overline', label: 'Underline + Overline' },
];

// Letter spacing options
const letterSpacings = [
  { value: 'normal', label: 'Normal' },
  { value: '-0.05em', label: 'Tight' },
  { value: '-0.025em', label: 'Slightly Tight' },
  { value: '0.025em', label: 'Slightly Wide' },
  { value: '0.05em', label: 'Wide' },
  { value: '0.1em', label: 'Extra Wide' },
  { value: '0.2em', label: 'Ultra Wide' },
];

// Line height options
const lineHeights = [
  { value: 'normal', label: 'Normal' },
  { value: '1', label: '1.0 - Compact' },
  { value: '1.2', label: '1.2 - Tight' },
  { value: '1.4', label: '1.4 - Snug' },
  { value: '1.5', label: '1.5 - Default' },
  { value: '1.6', label: '1.6 - Relaxed' },
  { value: '1.8', label: '1.8 - Loose' },
  { value: '2', label: '2.0 - Double' },
];

export const TypographyEditor: React.FC<TypographyEditorProps> = ({
  value,
  onChange
}) => {
  const updateStyle = (property: keyof TypographyStyles, val: string) => {
    onChange({
      ...value,
      [property]: val === 'inherit' ? undefined : val
    });
  };

  return (
    <div className="space-y-3">
      {/* Font Family and Size - First Row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Type className="cf-icon-xs text-muted-foreground" />
            <Label className="cf-text-sublabel">Font Family</Label>
          </div>
          <Select
            value={value.fontFamily || 'inherit'}
            onValueChange={(val) => updateStyle('fontFamily', val)}
          >
            <SelectTrigger className="cf-select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {fontFamilies.map(f => (
                <SelectItem key={f.value} value={f.value} className="cf-text-small">{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <div className="flex items-center gap-1 mb-1">
            <ALargeSmall className="cf-icon-xs text-muted-foreground" />
            <Label className="cf-text-sublabel">Size</Label>
          </div>
          <Select
            value={value.fontSize || 'inherit'}
            onValueChange={(val) => updateStyle('fontSize', val)}
          >
            <SelectTrigger className="cf-select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {fontSizes.map(s => (
                <SelectItem key={s.value} value={s.value} className="cf-text-small">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Weight and Style - Second Row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <BoldIcon className="cf-icon-xs text-muted-foreground" />
            <Label className="cf-text-sublabel">Weight</Label>
          </div>
          <Select
            value={value.fontWeight?.toString() || 'inherit'}
            onValueChange={(val) => updateStyle('fontWeight', val)}
          >
            <SelectTrigger className="cf-select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {fontWeights.map(w => (
                <SelectItem key={w.value} value={w.value} className="cf-text-small">{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <div className="flex items-center gap-1 mb-1">
            <ItalicIcon className="cf-icon-xs text-muted-foreground" />
            <Label className="cf-text-sublabel">Style</Label>
          </div>
          <Select
            value={value.fontStyle || 'normal'}
            onValueChange={(val) => updateStyle('fontStyle', val)}
          >
            <SelectTrigger className="cf-select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontStyles.map(s => (
                <SelectItem key={s.value} value={s.value} className="cf-text-small">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Text Alignment and Decoration - Third Row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <AlignLeft className="cf-icon-xs text-muted-foreground" />
            <Label className="cf-text-sublabel">Alignment</Label>
          </div>
          <Select
            value={value.textAlign || 'inherit'}
            onValueChange={(val) => updateStyle('textAlign', val)}
          >
            <SelectTrigger className="cf-select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {textAlignments.map(a => (
                <SelectItem key={a.value} value={a.value} className="cf-text-small">{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Underline className="cf-icon-xs text-muted-foreground" />
            <Label className="cf-text-sublabel">Decoration</Label>
          </div>
          <Select
            value={value.textDecoration || 'none'}
            onValueChange={(val) => updateStyle('textDecoration', val)}
          >
            <SelectTrigger className="cf-select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {textDecorations.map(d => (
                <SelectItem key={d.value} value={d.value} className="cf-text-small">{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Letter Spacing and Line Height - Fourth Row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Space className="cf-icon-xs text-muted-foreground" />
            <Label className="cf-text-sublabel">Letter Spacing</Label>
          </div>
          <Select
            value={value.letterSpacing || 'normal'}
            onValueChange={(val) => updateStyle('letterSpacing', val)}
          >
            <SelectTrigger className="cf-select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {letterSpacings.map(l => (
                <SelectItem key={l.value} value={l.value} className="cf-text-small">{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <div className="flex items-center gap-1 mb-1">
            <AlignVerticalSpaceAround className="cf-icon-xs text-muted-foreground" />
            <Label className="cf-text-sublabel">Line Height</Label>
          </div>
          <Select
            value={value.lineHeight || 'normal'}
            onValueChange={(val) => updateStyle('lineHeight', val)}
          >
            <SelectTrigger className="cf-select-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lineHeights.map(l => (
                <SelectItem key={l.value} value={l.value} className="cf-text-small">{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};