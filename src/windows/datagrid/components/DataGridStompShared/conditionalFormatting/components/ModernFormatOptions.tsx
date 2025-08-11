import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BorderStyleEditor } from './BorderStyleEditor';
import { TypographyEditor } from './TypographyEditor';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { 
  Palette, 
  Type, 
  Square, 
  Sparkles,
  Paintbrush,
  Circle,
  Check,
  Rows,
  Highlighter,
  Bold,
  VolumeX,
  AlertTriangle,
  Droplet,
  Sun,
  Moon,
  Zap,
  Flower2,
  Waves,
  Heart,
  Star,
  RotateCcw,
  Eye,
  Sliders,
  PaintBucket,
  Brush,
  CircleOff
} from 'lucide-react';

interface ModernFormatOptionsProps {
  rule: ConditionalRule;
  onUpdateRule: (rule: ConditionalRule) => void;
}

// Preset color schemes with icons
const colorPresets = [
  { name: 'Success', bg: '#22c55e', text: '#ffffff', label: 'Green', Icon: Check },
  { name: 'Warning', bg: '#f59e0b', text: '#ffffff', label: 'Amber', Icon: AlertTriangle },
  { name: 'Error', bg: '#ef4444', text: '#ffffff', label: 'Red', Icon: CircleOff },
  { name: 'Info', bg: '#3b82f6', text: '#ffffff', label: 'Blue', Icon: Circle },
  { name: 'Subtle', bg: '#f3f4f6', text: '#1f2937', label: 'Gray', Icon: Moon },
  { name: 'Purple', bg: '#a855f7', text: '#ffffff', label: 'Purple', Icon: Flower2 },
  { name: 'Teal', bg: '#14b8a6', text: '#ffffff', label: 'Teal', Icon: Waves },
  { name: 'Pink', bg: '#ec4899', text: '#ffffff', label: 'Pink', Icon: Heart },
];

// Quick style presets with modern icons
const stylePresets = [
  { 
    name: 'Highlight', 
    Icon: Highlighter,
    style: { 
      backgroundColor: '#fef3c7', 
      color: '#92400e',
      fontWeight: '500'
    } 
  },
  { 
    name: 'Strong', 
    Icon: Bold,
    style: { 
      fontWeight: '700',
      fontSize: '15px',
      color: '#1e293b'
    } 
  },
  { 
    name: 'Muted', 
    Icon: VolumeX,
    style: { 
      opacity: '0.6',
      fontStyle: 'italic',
      color: '#64748b'
    } 
  },
  { 
    name: 'Alert', 
    Icon: AlertTriangle,
    style: { 
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #dc2626',
      fontWeight: '600'
    } 
  },
];

export const ModernFormatOptions: React.FC<ModernFormatOptionsProps> = ({
  rule,
  onUpdateRule
}) => {
  const [activeTab, setActiveTab] = useState('colors');
  const [customColors, setCustomColors] = useState({
    background: rule.formatting.style?.backgroundColor || '#ffffff',
    text: rule.formatting.style?.color || '#000000'
  });

  // Update rule styling
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

  // Apply color preset
  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    setCustomColors({ background: preset.bg, text: preset.text });
    updateStyle({ 
      backgroundColor: preset.bg, 
      color: preset.text 
    });
  };

  // Apply style preset
  const applyStylePreset = (preset: typeof stylePresets[0]) => {
    updateStyle(preset.style);
    if (preset.style.backgroundColor) {
      setCustomColors(prev => ({ 
        ...prev, 
        background: preset.style.backgroundColor! 
      }));
    }
    if (preset.style.color) {
      setCustomColors(prev => ({ 
        ...prev, 
        text: preset.style.color! 
      }));
    }
  };

  // Generate preview text style
  const previewStyle = {
    backgroundColor: rule.formatting.style?.backgroundColor || 'transparent',
    color: rule.formatting.style?.color || 'inherit',
    fontFamily: rule.formatting.style?.fontFamily || 'inherit',
    fontSize: rule.formatting.style?.fontSize || '14px',
    fontWeight: rule.formatting.style?.fontWeight || 'normal',
    fontStyle: rule.formatting.style?.fontStyle || 'normal',
    textAlign: rule.formatting.style?.textAlign as any || 'left',
    textDecoration: rule.formatting.style?.textDecoration || 'none',
    border: rule.formatting.style?.border || 'none',
    borderTop: rule.formatting.style?.borderTop || undefined,
    borderRight: rule.formatting.style?.borderRight || undefined,
    borderBottom: rule.formatting.style?.borderBottom || undefined,
    borderLeft: rule.formatting.style?.borderLeft || undefined,
    padding: '8px 12px',
    borderRadius: '4px',
    transition: 'all 0.2s ease'
  };

  return (
    <div className="h-full flex flex-col">
      {/* Live Preview */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="cf-icon-xs text-muted-foreground" />
          <Label className="cf-text-sublabel uppercase tracking-wider">
            Live Preview
          </Label>
        </div>
        <div className="bg-background rounded-lg p-3 shadow-sm">
          <div style={previewStyle} className="text-center">
            Sample Text 123
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="cf-icon-xs text-muted-foreground" />
          <Label className="cf-text-sublabel uppercase tracking-wider">
            Quick Styles
          </Label>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {stylePresets.map((preset) => {
            const Icon = preset.Icon;
            return (
              <button
                key={preset.name}
                onClick={() => applyStylePreset(preset)}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent transition-all hover:scale-105 group"
                title={preset.name}
              >
                <Icon className="cf-icon-sm mb-1 text-muted-foreground group-hover:text-foreground" />
                <span className="cf-text-tiny text-muted-foreground group-hover:text-foreground">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabbed Options */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 grid w-[calc(100%-2rem)] grid-cols-3">
          <TabsTrigger value="colors" className="cf-text-small">
            <Palette className="cf-icon-xs mr-1" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="typography" className="cf-text-small">
            <Type className="cf-icon-xs mr-1" />
            Text
          </TabsTrigger>
          <TabsTrigger value="borders" className="cf-text-small">
            <Square className="cf-icon-xs mr-1" />
            Border
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Colors Tab */}
          <TabsContent value="colors" className="px-4 py-3 space-y-4 mt-0">
            {/* Color Presets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="cf-icon-xs text-muted-foreground" />
                <Label className="cf-text-label">Color Schemes</Label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {colorPresets.map((preset) => {
                  const Icon = preset.Icon;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => applyColorPreset(preset)}
                      className="relative group"
                      title={preset.name}
                    >
                      <div 
                        className="h-8 rounded-md shadow-sm border hover:shadow-md transition-all duration-200 hover:scale-105 flex items-center justify-center"
                        style={{ backgroundColor: preset.bg }}
                      >
                        <Icon 
                          className="cf-icon-sm"
                          style={{ color: preset.text }}
                        />
                      </div>
                      {(rule.formatting.style?.backgroundColor === preset.bg) && (
                        <Check className="absolute -top-1 -right-1 cf-icon-xs text-primary bg-background rounded-full border" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brush className="cf-icon-xs text-muted-foreground" />
                <Label className="cf-text-label">Custom Colors</Label>
              </div>
              
              <div className="space-y-3">
                {/* Background Color */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="cf-text-sublabel mb-1 block">
                      Background
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="color"
                          value={customColors.background}
                          onChange={(e) => {
                            setCustomColors(prev => ({ ...prev, background: e.target.value }));
                            updateStyle({ backgroundColor: e.target.value });
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div 
                          className="h-8 rounded-md border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                          style={{ backgroundColor: customColors.background }}
                        >
                          <PaintBucket className="cf-icon-sm mix-blend-difference text-white" />
                        </div>
                      </div>
                      <Input
                        value={customColors.background}
                        onChange={(e) => {
                          setCustomColors(prev => ({ ...prev, background: e.target.value }));
                          updateStyle({ backgroundColor: e.target.value });
                        }}
                        className="w-24 cf-input font-mono"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Color */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="cf-text-sublabel mb-1 block">
                      Text Color
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="color"
                          value={customColors.text}
                          onChange={(e) => {
                            setCustomColors(prev => ({ ...prev, text: e.target.value }));
                            updateStyle({ color: e.target.value });
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div 
                          className="h-8 rounded-md border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                          style={{ backgroundColor: customColors.text }}
                        >
                          <Type className="cf-icon-sm mix-blend-difference text-white" />
                        </div>
                      </div>
                      <Input
                        value={customColors.text}
                        onChange={(e) => {
                          setCustomColors(prev => ({ ...prev, text: e.target.value }));
                          updateStyle({ color: e.target.value });
                        }}
                        className="w-24 cf-input font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Droplet className="cf-icon-xs text-muted-foreground" />
                  <Label className="cf-text-sublabel">
                    Opacity: {Math.round((rule.formatting.style?.opacity || 1) * 100)}%
                  </Label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(rule.formatting.style?.opacity || 1) * 100}
                  onChange={(e) => updateStyle({ opacity: parseFloat(e.target.value) / 100 })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
            </div>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="px-4 py-3 mt-0">
            <TypographyEditor
              value={rule.formatting.style || {}}
              onChange={(typographyStyles) => {
                onUpdateRule({
                  ...rule,
                  formatting: {
                    ...rule.formatting,
                    style: {
                      ...rule.formatting.style,
                      ...typographyStyles
                    }
                  }
                });
              }}
            />
          </TabsContent>

          {/* Borders Tab */}
          <TabsContent value="borders" className="px-4 py-3 mt-0">
            <BorderStyleEditor
              value={rule.formatting.style || {}}
              onChange={(borderStyles) => {
                onUpdateRule({
                  ...rule,
                  formatting: {
                    ...rule.formatting,
                    style: {
                      ...rule.formatting.style,
                      ...borderStyles
                    }
                  }
                });
              }}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Row Options (if applicable) */}
      {rule.scope?.target === 'row' && (
        <div className="px-4 py-3 border-t bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rows className="cf-icon-sm text-green-600 dark:text-green-400" />
              <Label className="cf-text-label">Row Options</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="highlight-entire-row"
                checked={rule.scope?.highlightEntireRow || false}
                onCheckedChange={(checked) => {
                  onUpdateRule({
                    ...rule,
                    scope: {
                      ...rule.scope,
                      highlightEntireRow: checked
                    }
                  });
                }}
                className="h-4 w-8"
              />
              <Label htmlFor="highlight-entire-row" className="cursor-pointer cf-text-small">
                Highlight entire row
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Reset Button */}
      <div className="px-4 py-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full cf-text-small"
          onClick={() => {
            updateStyle({
              backgroundColor: undefined,
              color: undefined,
              fontFamily: undefined,
              fontSize: undefined,
              fontWeight: undefined,
              fontStyle: undefined,
              textAlign: undefined,
              textDecoration: undefined,
              border: undefined,
              borderTop: undefined,
              borderRight: undefined,
              borderBottom: undefined,
              borderLeft: undefined,
              opacity: undefined
            });
            setCustomColors({ background: '#ffffff', text: '#000000' });
          }}
        >
          <RotateCcw className="cf-icon-xs mr-1" />
          Reset All Formatting
        </Button>
      </div>
    </div>
  );
};