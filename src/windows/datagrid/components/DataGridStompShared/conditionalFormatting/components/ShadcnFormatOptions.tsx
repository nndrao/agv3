import React, { useState } from 'react';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { Palette, Type, Square, X, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/openfin/openfin-select';

interface ShadcnFormatOptionsProps {
  rule: ConditionalRule;
  onUpdateRule: (rule: ConditionalRule) => void;
}

interface BorderStyle {
  side: string;
  width: string;  
  style: string;
  color: string;
}

export const ShadcnFormatOptions: React.FC<ShadcnFormatOptionsProps> = ({
  rule,
  onUpdateRule
}) => {
  const getInitialBorders = (): BorderStyle[] => {
    const borders: BorderStyle[] = [];
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    
    sides.forEach(side => {
      const borderKey = `border${side}` as keyof typeof rule.formatting.style;
      const borderValue = rule.formatting.style?.[borderKey] as string;
      if (borderValue && borderValue !== 'none') {
        const parts = borderValue.split(' ');
        if (parts.length >= 3) {
          borders.push({
            side,
            width: parts[0],
            style: parts[1],
            color: parts[2]
          });
        }
      }
    });
    
    return borders;
  };
  
  const [appliedBorders, setAppliedBorders] = useState<BorderStyle[]>(getInitialBorders());
  const [currentBorder, setCurrentBorder] = useState<BorderStyle>({
    side: 'Top',
    width: '1px',
    style: 'solid',
    color: '#374151'
  });

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

  const addBorderStyle = () => {
    const borderKey = `border${currentBorder.side}`;
    const borderValue = `${currentBorder.width} ${currentBorder.style} ${currentBorder.color}`;
    
    updateStyle({ [borderKey]: borderValue });
    
    setAppliedBorders([...appliedBorders.filter(b => b.side !== currentBorder.side), currentBorder]);
  };

  const removeBorderStyle = (side: string) => {
    const borderKey = `border${side}`;
    updateStyle({ [borderKey]: undefined });
    setAppliedBorders(appliedBorders.filter(b => b.side !== side));
  };

  const textAlign = rule.formatting.style?.textAlign || 'left';
  const opacity = rule.formatting.style?.opacity || 1;

  return (
    <div className="w-[320px] h-[600px] flex flex-col bg-background border rounded-lg">
      {/* Preview Section */}
      <div className="p-3 border-b">
        <Label className="text-xs font-medium mb-2 block">Preview</Label>
        <Card className="p-1">
          <div 
            className="p-2 text-center rounded-sm"
            style={{
              ...rule.formatting.style,
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Sample Text
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="colors" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 px-3">
          <TabsTrigger value="colors" className="text-xs gap-1">
            <Palette className="h-3 w-3" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="typography" className="text-xs gap-1">
            <Type className="h-3 w-3" />
            Text
          </TabsTrigger>
          <TabsTrigger value="borders" className="text-xs gap-1">
            <Square className="h-3 w-3" />
            Borders
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Colors Tab */}
          <TabsContent value="colors" className="px-3 space-y-3 mt-3">
            {/* Background Color */}
            <div className="space-y-1.5">
              <Label htmlFor="bg-color" className="text-xs">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={rule.formatting.style?.backgroundColor || '#ffffff'}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="w-10 h-8 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={rule.formatting.style?.backgroundColor || '#ffffff'}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="flex-1 h-8 text-xs font-mono"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-1.5">
              <Label htmlFor="text-color" className="text-xs">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  id="text-color"
                  type="color"
                  value={rule.formatting.style?.color || '#000000'}
                  onChange={(e) => updateStyle({ color: e.target.value })}
                  className="w-10 h-8 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={rule.formatting.style?.color || '#000000'}
                  onChange={(e) => updateStyle({ color: e.target.value })}
                  className="flex-1 h-8 text-xs font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="opacity" className="text-xs">Opacity</Label>
                <span className="text-xs text-muted-foreground">{Math.round(opacity * 100)}%</span>
              </div>
              <Slider
                id="opacity"
                min={0}
                max={100}
                step={1}
                value={[opacity * 100]}
                onValueChange={(value) => updateStyle({ opacity: value[0] / 100 })}
                className="w-full"
              />
            </div>

            {/* Text Alignment */}
            <div className="space-y-1.5">
              <Label className="text-xs">Text Alignment</Label>
              <ToggleGroup 
                type="single" 
                value={textAlign}
                onValueChange={(value) => value && updateStyle({ textAlign: value })}
                className="justify-start"
              >
                <ToggleGroupItem value="left" aria-label="Align left" className="h-8 px-3">
                  <AlignLeft className="h-3 w-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Align center" className="h-8 px-3">
                  <AlignCenter className="h-3 w-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Align right" className="h-8 px-3">
                  <AlignRight className="h-3 w-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="justify" aria-label="Justify" className="h-8 px-3">
                  <AlignJustify className="h-3 w-3" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="px-3 space-y-3 mt-3">
            {/* Font Family */}
            <div className="space-y-1.5">
              <Label htmlFor="font-family" className="text-xs">Font Family</Label>
              <Select
                value={rule.formatting.style?.fontFamily || 'Inter'}
                onValueChange={(value) => updateStyle({ fontFamily: value })}
              >
                <SelectTrigger id="font-family" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="system-ui">System UI</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="'Helvetica Neue', sans-serif">Helvetica</SelectItem>
                  <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Courier New', monospace">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="font-size" className="text-xs">Size (px)</Label>
                <Input
                  id="font-size"
                  type="number"
                  value={parseInt(rule.formatting.style?.fontSize || '14')}
                  onChange={(e) => updateStyle({ fontSize: `${e.target.value}px` })}
                  className="h-8 text-xs"
                  min="8"
                  max="72"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="font-weight" className="text-xs">Weight</Label>
                <Select
                  value={rule.formatting.style?.fontWeight || '400'}
                  onValueChange={(value) => updateStyle({ fontWeight: value })}
                >
                  <SelectTrigger id="font-weight" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">Light</SelectItem>
                    <SelectItem value="400">Regular</SelectItem>
                    <SelectItem value="500">Medium</SelectItem>
                    <SelectItem value="600">Semibold</SelectItem>
                    <SelectItem value="700">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Font Style */}
            <div className="space-y-1.5">
              <Label className="text-xs">Font Style</Label>
              <ToggleGroup 
                type="single" 
                value={rule.formatting.style?.fontStyle || 'normal'}
                onValueChange={(value) => value && updateStyle({ fontStyle: value })}
                className="justify-start"
              >
                <ToggleGroupItem value="normal" className="h-8 text-xs">
                  Normal
                </ToggleGroupItem>
                <ToggleGroupItem value="italic" className="h-8 text-xs">
                  Italic
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Text Decoration */}
            <div className="space-y-1.5">
              <Label htmlFor="text-decoration" className="text-xs">Text Decoration</Label>
              <Select
                value={rule.formatting.style?.textDecoration || 'none'}
                onValueChange={(value) => updateStyle({ textDecoration: value === 'none' ? undefined : value })}
              >
                <SelectTrigger id="text-decoration" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="underline">Underline</SelectItem>
                  <SelectItem value="line-through">Line Through</SelectItem>
                  <SelectItem value="overline">Overline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Borders Tab */}
          <TabsContent value="borders" className="px-3 space-y-3 mt-3">
            {/* Border Controls */}
            <Card className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Side</Label>
                  <Select
                    value={currentBorder.side}
                    onValueChange={(value) => setCurrentBorder({ ...currentBorder, side: value })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Top">Top</SelectItem>
                      <SelectItem value="Right">Right</SelectItem>
                      <SelectItem value="Bottom">Bottom</SelectItem>
                      <SelectItem value="Left">Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width</Label>
                  <Select
                    value={currentBorder.width}
                    onValueChange={(value) => setCurrentBorder({ ...currentBorder, width: value })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1px">1px</SelectItem>
                      <SelectItem value="2px">2px</SelectItem>
                      <SelectItem value="3px">3px</SelectItem>
                      <SelectItem value="4px">4px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Style</Label>
                  <Select
                    value={currentBorder.style}
                    onValueChange={(value) => setCurrentBorder({ ...currentBorder, style: value })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                      <SelectItem value="double">Double</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-1">
                    <Input
                      type="color"
                      value={currentBorder.color}
                      onChange={(e) => setCurrentBorder({ ...currentBorder, color: e.target.value })}
                      className="w-7 h-7 p-0.5 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={currentBorder.color}
                      onChange={(e) => setCurrentBorder({ ...currentBorder, color: e.target.value })}
                      className="flex-1 h-7 text-xs font-mono px-2"
                      placeholder="#000"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={addBorderStyle} 
                className="w-full h-7 text-xs"
                variant="secondary"
              >
                Add Border
              </Button>
            </Card>

            {/* Applied Borders */}
            <div className="space-y-1.5">
              <Label className="text-xs">Applied Borders</Label>
              <div className="p-2 rounded bg-transparent">
                <ScrollArea className="h-[180px]">
                  {appliedBorders.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No borders applied
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {appliedBorders.map((border) => (
                        <div key={border.side} className="flex items-center justify-between p-1.5 rounded">
                          <span className="text-xs">
                            <span className="font-medium">{border.side}:</span> {border.width} {border.style}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => removeBorderStyle(border.side)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="outline"
          className="w-full h-8 text-xs"
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
              opacity: undefined
            });
            setAppliedBorders([]);
          }}
        >
          Reset All Formatting
        </Button>
      </div>
    </div>
  );
};