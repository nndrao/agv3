import React, { useState } from 'react';
import { 
  Palette, 
  Type, 
  Square, 
  Sparkles,
  Eye,
  Zap,
  Droplets,
  Layers,
  Minus,
  ChevronRight
} from 'lucide-react';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import './premiumStyles.css';

interface PremiumFormatOptionsProps {
  rule: ConditionalRule;
  onUpdateRule: (rule: ConditionalRule) => void;
}

// Premium color palettes with gradients
const premiumPalettes = [
  {
    name: 'Emerald',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bg: '#10b981',
    text: '#ffffff',
    glow: '0 0 20px rgba(16, 185, 129, 0.3)'
  },
  {
    name: 'Sunset',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
    bg: '#f59e0b',
    text: '#ffffff',
    glow: '0 0 20px rgba(245, 158, 11, 0.3)'
  },
  {
    name: 'Ocean',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    bg: '#3b82f6',
    text: '#ffffff',
    glow: '0 0 20px rgba(59, 130, 246, 0.3)'
  },
  {
    name: 'Royal',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    bg: '#8b5cf6',
    text: '#ffffff',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)'
  },
  {
    name: 'Rose',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    bg: '#f43f5e',
    text: '#ffffff',
    glow: '0 0 20px rgba(244, 63, 94, 0.3)'
  },
  {
    name: 'Slate',
    gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    bg: '#475569',
    text: '#ffffff',
    glow: '0 0 20px rgba(100, 116, 139, 0.2)'
  },
];

// Premium style presets with unique effects
const premiumPresets = [
  {
    name: 'Glow',
    icon: '✨',
    className: 'preset-glow',
    style: {
      backgroundColor: 'rgba(251, 191, 36, 0.1)',
      color: '#f59e0b',
      boxShadow: 'inset 0 0 20px rgba(251, 191, 36, 0.2)',
      border: '1px solid rgba(251, 191, 36, 0.3)',
      fontWeight: '500'
    }
  },
  {
    name: 'Glass',
    icon: '🔮',
    className: 'preset-glass',
    style: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#1e293b',
      fontWeight: '500'
    }
  },
  {
    name: 'Neon',
    icon: '💡',
    className: 'preset-neon',
    style: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      color: '#22c55e',
      textShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
      border: '1px solid #22c55e',
      fontWeight: '600'
    }
  },
  {
    name: 'Shadow',
    icon: '🌑',
    className: 'preset-shadow',
    style: {
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      fontWeight: '600'
    }
  }
];

export const PremiumFormatOptions: React.FC<PremiumFormatOptionsProps> = ({
  rule,
  onUpdateRule
}) => {
  const [activeSection, setActiveSection] = useState<'colors' | 'typography' | 'effects'>('colors');
  const [selectedPalette, setSelectedPalette] = useState<typeof premiumPalettes[0] | null>(null);

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

  const applyPalette = (palette: typeof premiumPalettes[0]) => {
    setSelectedPalette(palette);
    updateStyle({ 
      backgroundColor: palette.bg, 
      color: palette.text,
      boxShadow: palette.glow
    });
  };

  const applyPreset = (preset: typeof premiumPresets[0]) => {
    updateStyle(preset.style);
  };

  return (
    <div className="premium-format-container">
      {/* Live Preview Card */}
      <div className="premium-preview-card">
        <div className="preview-header">
          <Eye className="preview-icon" />
          <span className="preview-label">LIVE PREVIEW</span>
        </div>
        <div className="preview-content">
          <div 
            className="preview-sample"
            style={{
              ...rule.formatting.style,
              padding: '16px 24px',
              borderRadius: '12px',
            }}
          >
            Sample Text 123
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="premium-quick-actions">
        <div className="quick-actions-header">
          <Zap className="section-icon" />
          <span className="section-label">QUICK STYLES</span>
        </div>
        <div className="preset-grid">
          {premiumPresets.map((preset) => (
            <button
              key={preset.name}
              className={`preset-button ${preset.className}`}
              onClick={() => applyPreset(preset)}
            >
              <span className="preset-icon">{preset.icon}</span>
              <span className="preset-name">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section Navigator */}
      <div className="premium-section-nav">
        {[
          { id: 'colors', label: 'Colors', icon: Palette },
          { id: 'typography', label: 'Typography', icon: Type },
          { id: 'effects', label: 'Effects', icon: Layers }
        ].map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              className={`nav-button ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id as any)}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{section.label}</span>
              {activeSection === section.id && (
                <div className="nav-indicator" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Sections */}
      <div className="premium-content">
          {activeSection === 'colors' && (
            <div className="colors-section">
              {/* Premium Palettes */}
              <div className="palette-grid">
                {premiumPalettes.map((palette) => (
                  <button
                    key={palette.name}
                    className={`palette-card ${selectedPalette?.name === palette.name ? 'selected' : ''}`}
                    onClick={() => applyPalette(palette)}
                  >
                    <div 
                      className="palette-gradient"
                      style={{ background: palette.gradient }}
                    />
                    <span className="palette-name">{palette.name}</span>
                    {selectedPalette?.name === palette.name && (
                      <div className="palette-check">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Color Controls */}
              <div className="custom-colors">
                <div className="color-control">
                  <label className="control-label">Background</label>
                  <div className="color-input-group">
                    <div className="color-gradient-picker">
                      <input
                        type="color"
                        value={rule.formatting.style?.backgroundColor || '#ffffff'}
                        onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                        className="color-input"
                      />
                      <div className="color-preview" style={{ 
                        background: rule.formatting.style?.backgroundColor || '#ffffff' 
                      }} />
                    </div>
                    <input
                      type="text"
                      value={rule.formatting.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="hex-input"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div className="color-control">
                  <label className="control-label">Text</label>
                  <div className="color-input-group">
                    <div className="color-gradient-picker">
                      <input
                        type="color"
                        value={rule.formatting.style?.color || '#000000'}
                        onChange={(e) => updateStyle({ color: e.target.value })}
                        className="color-input"
                      />
                      <div className="color-preview" style={{ 
                        background: rule.formatting.style?.color || '#000000' 
                      }} />
                    </div>
                    <input
                      type="text"
                      value={rule.formatting.style?.color || '#000000'}
                      onChange={(e) => updateStyle({ color: e.target.value })}
                      className="hex-input"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Opacity Slider */}
                <div className="opacity-control">
                  <label className="control-label">
                    <Droplets className="label-icon" />
                    Opacity
                    <span className="opacity-value">
                      {Math.round((rule.formatting.style?.opacity || 1) * 100)}%
                    </span>
                  </label>
                  <div className="premium-slider">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(rule.formatting.style?.opacity || 1) * 100}
                      onChange={(e) => updateStyle({ opacity: parseFloat(e.target.value) / 100 })}
                      className="slider-input"
                    />
                    <div 
                      className="slider-fill"
                      style={{ width: `${(rule.formatting.style?.opacity || 1) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'typography' && (
            <div className="typography-section">
              <div className="typography-controls">
                {/* Font controls would go here - keeping it simple for now */}
                <div className="control-group">
                  <label className="control-label">Font Size</label>
                  <div className="size-buttons">
                    {['12px', '14px', '16px', '18px', '20px', '24px'].map(size => (
                      <button
                        key={size}
                        className={`size-button ${rule.formatting.style?.fontSize === size ? 'active' : ''}`}
                        onClick={() => updateStyle({ fontSize: size })}
                      >
                        {size.replace('px', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <label className="control-label">Font Weight</label>
                  <div className="weight-buttons">
                    {[
                      { value: '300', label: 'Light' },
                      { value: '400', label: 'Regular' },
                      { value: '500', label: 'Medium' },
                      { value: '600', label: 'Semibold' },
                      { value: '700', label: 'Bold' }
                    ].map(weight => (
                      <button
                        key={weight.value}
                        className={`weight-button ${rule.formatting.style?.fontWeight === weight.value ? 'active' : ''}`}
                        onClick={() => updateStyle({ fontWeight: weight.value })}
                      >
                        {weight.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'effects' && (
            <div className="effects-section">
              <div className="effect-controls">
                <div className="control-group">
                  <label className="control-label">Border Radius</label>
                  <div className="radius-buttons">
                    {['0px', '4px', '8px', '12px', '16px', '24px'].map(radius => (
                      <button
                        key={radius}
                        className={`radius-button ${rule.formatting.style?.borderRadius === radius ? 'active' : ''}`}
                        onClick={() => updateStyle({ borderRadius: radius })}
                      >
                        <div className="radius-preview" style={{ borderRadius: radius }} />
                        <span>{radius.replace('px', '')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <label className="control-label">Shadow</label>
                  <div className="shadow-buttons">
                    {[
                      { name: 'None', value: 'none' },
                      { name: 'Small', value: '0 1px 3px rgba(0,0,0,0.12)' },
                      { name: 'Medium', value: '0 4px 12px rgba(0,0,0,0.15)' },
                      { name: 'Large', value: '0 10px 25px rgba(0,0,0,0.2)' },
                      { name: 'Glow', value: '0 0 20px rgba(59, 130, 246, 0.4)' }
                    ].map(shadow => (
                      <button
                        key={shadow.name}
                        className={`shadow-button ${rule.formatting.style?.boxShadow === shadow.value ? 'active' : ''}`}
                        onClick={() => updateStyle({ boxShadow: shadow.value })}
                      >
                        <div className="shadow-preview" style={{ boxShadow: shadow.value }} />
                        <span>{shadow.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Reset Button */}
      <button
        className="premium-reset-button"
        onClick={() => {
          updateStyle({
            backgroundColor: undefined,
            color: undefined,
            fontSize: undefined,
            fontWeight: undefined,
            borderRadius: undefined,
            boxShadow: undefined,
            opacity: undefined
          });
          setSelectedPalette(null);
        }}
      >
        <Sparkles className="reset-icon" />
        Reset Formatting
      </button>
    </div>
  );
};