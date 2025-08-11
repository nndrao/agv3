import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/openfin/openfin-select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { Palette, Type, Square } from 'lucide-react';

interface SimpleFormatOptionsProps {
  rule: ConditionalRule;
  onUpdateRule: (rule: ConditionalRule) => void;
}

// Font options
const fontFamilies = [
  { value: 'inherit', label: 'Default' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Helvetica Neue", Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Courier' },
];

const fontSizes = [
  { value: 'inherit', label: 'Default' },
  { value: '10px', label: '10px' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
];

const fontWeights = [
  { value: 'inherit', label: 'Default' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
];

const borderStyles = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
];

const borderWidths = [
  { value: '0', label: 'None' },
  { value: '1px', label: '1px' },
  { value: '2px', label: '2px' },
  { value: '3px', label: '3px' },
  { value: '4px', label: '4px' },
];

export const SimpleFormatOptions: React.FC<SimpleFormatOptionsProps> = ({
  rule,
  onUpdateRule
}) => {
  const [activeTab, setActiveTab] = useState('colors');

  const updateStyle = (styleUpdates: any) => {
    onUpdateRule({
      ...rule,
      formatting: {
        ...rule.formatting,
        style: {
          ...rule.formatting.style,
          ...styleUpdates
        }
      }
    });
  };

  // Parse border values
  const parseBorder = (borderStr: string) => {
    if (!borderStr || borderStr === 'none') return { width: '0', style: 'none', color: '#000000' };
    const parts = borderStr.split(' ').filter(Boolean);
    return {
      width: parts[0] || '0',
      style: parts[1] || 'none',
      color: parts[2] || '#000000'
    };
  };

  const getBorderValue = (side: 'top' | 'right' | 'bottom' | 'left') => {
    const key = `border${side.charAt(0).toUpperCase() + side.slice(1)}` as keyof typeof rule.formatting.style;
    const value = rule.formatting.style?.[key];
    return parseBorder(typeof value === 'string' ? value : '');
  };

  const updateBorder = (side: 'top' | 'right' | 'bottom' | 'left', property: 'width' | 'style' | 'color', value: string) => {
    const border = getBorderValue(side);
    border[property] = value;
    
    const borderString = border.style === 'none' || border.width === '0' 
      ? 'none' 
      : `${border.width} ${border.style} ${border.color}`;
    
    const key = `border${side.charAt(0).toUpperCase() + side.slice(1)}`;
    updateStyle({ [key]: borderString });
  };

  // Live preview style
  const previewStyle = {
    ...rule.formatting.style,
    padding: '12px 20px',
    borderRadius: '6px',
    transition: 'all 0.2s ease'
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Live Preview */}
      <div className="p-4 border-b">
        <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
        <div className="flex justify-center p-4 bg-muted/10 rounded-lg">
          <div style={previewStyle}>
            Sample Text
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 grid w-[calc(100%-2rem)] grid-cols-3">
          <TabsTrigger value="colors" className="text-xs">
            <Palette className="w-3 h-3 mr-1.5" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="typography" className="text-xs">
            <Type className="w-3 h-3 mr-1.5" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="borders" className="text-xs">
            <Square className="w-3 h-3 mr-1.5" />
            Borders
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Colors Tab */}
          <TabsContent value="colors" className="p-4 space-y-4">
            <div className="space-y-4">
              {/* Background Color */}
              <div className="space-y-2">
                <Label className="text-xs">Background Color</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex gap-2">
                    <input
                      type="color"
                      value={rule.formatting.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="w-12 h-9 rounded border cursor-pointer"
                    />
                    <Input
                      value={rule.formatting.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="flex-1 h-9 text-xs font-mono"
                      placeholder="#ffffff"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs"
                    onClick={() => updateStyle({ backgroundColor: undefined })}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex gap-2">
                    <input
                      type="color"
                      value={rule.formatting.style?.color || '#000000'}
                      onChange={(e) => updateStyle({ color: e.target.value })}
                      className="w-12 h-9 rounded border cursor-pointer"
                    />
                    <Input
                      value={rule.formatting.style?.color || '#000000'}
                      onChange={(e) => updateStyle({ color: e.target.value })}
                      className="flex-1 h-9 text-xs font-mono"
                      placeholder="#000000"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs"
                    onClick={() => updateStyle({ color: undefined })}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Opacity */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Opacity</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(((rule.formatting.style?.opacity as number) || 1) * 100)}%
                  </span>
                </div>
                <Slider
                  value={[((rule.formatting.style?.opacity as number) || 1) * 100]}
                  onValueChange={([value]) => updateStyle({ opacity: value / 100 })}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="p-4 space-y-4">
            {/* Font Family */}
            <div className="space-y-2">
              <Label className="text-xs">Font Family</Label>
              <Select
                value={rule.formatting.style?.fontFamily || 'inherit'}
                onValueChange={(value) => updateStyle({ fontFamily: value === 'inherit' ? undefined : value })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map(font => (
                    <SelectItem key={font.value} value={font.value} className="text-xs">
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label className="text-xs">Font Size</Label>
              <Select
                value={String(rule.formatting.style?.fontSize || 'inherit')}
                onValueChange={(value) => updateStyle({ fontSize: value === 'inherit' ? undefined : value })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map(size => (
                    <SelectItem key={size.value} value={size.value} className="text-xs">
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Weight */}
            <div className="space-y-2">
              <Label className="text-xs">Font Weight</Label>
              <Select
                value={rule.formatting.style?.fontWeight?.toString() || 'inherit'}
                onValueChange={(value) => updateStyle({ fontWeight: value === 'inherit' ? undefined : value })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontWeights.map(weight => (
                    <SelectItem key={weight.value} value={weight.value} className="text-xs">
                      {weight.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Font Style */}
            <div className="space-y-2">
              <Label className="text-xs">Font Style</Label>
              <div className="flex gap-2">
                <Button
                  variant={rule.formatting.style?.fontStyle === 'italic' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-9 text-xs"
                  onClick={() => updateStyle({ 
                    fontStyle: rule.formatting.style?.fontStyle === 'italic' ? undefined : 'italic' 
                  })}
                >
                  Italic
                </Button>
                <Button
                  variant={rule.formatting.style?.textDecoration === 'underline' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-9 text-xs"
                  onClick={() => updateStyle({ 
                    textDecoration: rule.formatting.style?.textDecoration === 'underline' ? undefined : 'underline' 
                  })}
                >
                  Underline
                </Button>
                <Button
                  variant={rule.formatting.style?.textDecoration === 'line-through' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-9 text-xs"
                  onClick={() => updateStyle({ 
                    textDecoration: rule.formatting.style?.textDecoration === 'line-through' ? undefined : 'line-through' 
                  })}
                >
                  Strike
                </Button>
              </div>
            </div>

            {/* Text Alignment */}
            <div className="space-y-2">
              <Label className="text-xs">Text Alignment</Label>
              <div className="flex gap-2">
                {['left', 'center', 'right', 'justify'].map(align => (
                  <Button
                    key={align}
                    variant={rule.formatting.style?.textAlign === align ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 h-9 text-xs capitalize"
                    onClick={() => updateStyle({ 
                      textAlign: rule.formatting.style?.textAlign === align ? undefined : align 
                    })}
                  >
                    {align}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Borders Tab */}
          <TabsContent value="borders" className="p-4 space-y-4">
            {/* Individual Border Sides */}
            {(['top', 'right', 'bottom', 'left'] as const).map(side => {
              const border = getBorderValue(side);
              return (
                <div key={side} className="space-y-2">
                  <Label className="text-xs capitalize">{side} Border</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Width */}
                    <Select
                      value={border.width}
                      onValueChange={(value) => updateBorder(side, 'width', value)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Width" />
                      </SelectTrigger>
                      <SelectContent>
                        {borderWidths.map(width => (
                          <SelectItem key={width.value} value={width.value} className="text-xs">
                            {width.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Style */}
                    <Select
                      value={border.style}
                      onValueChange={(value) => updateBorder(side, 'style', value)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Style" />
                      </SelectTrigger>
                      <SelectContent>
                        {borderStyles.map(style => (
                          <SelectItem key={style.value} value={style.value} className="text-xs">
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Color */}
                    <div className="flex gap-1">
                      <input
                        type="color"
                        value={border.color}
                        onChange={(e) => updateBorder(side, 'color', e.target.value)}
                        className="w-9 h-9 rounded border cursor-pointer"
                      />
                      <Input
                        value={border.color}
                        onChange={(e) => updateBorder(side, 'color', e.target.value)}
                        className="flex-1 h-9 text-xs font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <Separator />

            {/* Border Radius */}
            <div className="space-y-2">
              <Label className="text-xs">Border Radius</Label>
              <div className="flex gap-2">
                {['0', '4', '8', '12', '16', '24'].map(radius => (
                  <Button
                    key={radius}
                    variant={rule.formatting.style?.borderRadius === `${radius}px` ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 h-9 text-xs"
                    onClick={() => updateStyle({ 
                      borderRadius: rule.formatting.style?.borderRadius === `${radius}px` ? undefined : `${radius}px` 
                    })}
                  >
                    {radius}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Reset Button */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            updateStyle({
              backgroundColor: undefined,
              color: undefined,
              fontFamily: undefined,
              fontSize: undefined,
              fontWeight: undefined,
              fontStyle: undefined,
              textDecoration: undefined,
              textAlign: undefined,
              borderTop: undefined,
              borderRight: undefined,
              borderBottom: undefined,
              borderLeft: undefined,
              borderRadius: undefined,
              opacity: undefined
            });
          }}
        >
          Reset All Formatting
        </Button>
      </div>
    </div>
  );
};