import React, { useState } from 'react';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import './minimalStyles.css';

interface MinimalFormatOptionsProps {
  rule: ConditionalRule;
  onUpdateRule: (rule: ConditionalRule) => void;
}

// Clean color palette
const minimalColors = [
  { name: 'Blue', value: '#3b82f6', text: '#ffffff' },
  { name: 'Green', value: '#10b981', text: '#ffffff' },
  { name: 'Amber', value: '#f59e0b', text: '#ffffff' },
  { name: 'Red', value: '#ef4444', text: '#ffffff' },
  { name: 'Purple', value: '#8b5cf6', text: '#ffffff' },
  { name: 'Gray', value: '#6b7280', text: '#ffffff' },
];

// Clean style presets
const stylePresets = [
  {
    name: 'Highlight',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    ),
    style: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      fontWeight: '500'
    }
  },
  {
    name: 'Bold',
    icon: <span style={{ fontWeight: 'bold', fontSize: '14px' }}>B</span>,
    style: {
      fontWeight: '700',
      color: '#1e293b'
    }
  },
  {
    name: 'Subtle',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    style: {
      opacity: '0.6',
      color: '#64748b'
    }
  },
  {
    name: 'Alert',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    style: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #dc2626'
    }
  }
];

export const MinimalFormatOptions: React.FC<MinimalFormatOptionsProps> = ({
  rule,
  onUpdateRule
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'colors' | 'text'>('style');
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const currentBg = rule.formatting.style?.backgroundColor || '#ffffff';
  const currentColor = rule.formatting.style?.color || '#000000';

  return (
    <div className="minimal-format-container">
      {/* Preview - Clean and Simple */}
      <div className="minimal-preview">
        <span className="preview-label">PREVIEW</span>
        <div 
          className="preview-box"
          style={{
            ...rule.formatting.style,
            padding: '12px 16px',
          }}
        >
          Sample Text
        </div>
      </div>

      {/* Quick Styles - Minimalist Grid */}
      <div className="minimal-section">
        <div className="section-header">
          <span className="section-title">Quick Styles</span>
        </div>
        <div className="style-grid">
          {stylePresets.map((preset) => (
            <button
              key={preset.name}
              className="style-preset"
              onClick={() => updateStyle(preset.style)}
              title={preset.name}
            >
              {preset.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Simple Tab Navigation */}
      <div className="minimal-tabs">
        <button
          className={`tab ${activeTab === 'style' ? 'active' : ''}`}
          onClick={() => setActiveTab('style')}
        >
          Style
        </button>
        <button
          className={`tab ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          Colors
        </button>
        <button
          className={`tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          Text
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'style' && (
          <div className="style-content">
            {/* Border Radius */}
            <div className="control-row">
              <label className="control-label">Radius</label>
              <div className="button-group">
                {['0', '4', '8', '12', '16'].map(radius => (
                  <button
                    key={radius}
                    className={`option-btn ${rule.formatting.style?.borderRadius === `${radius}px` ? 'active' : ''}`}
                    onClick={() => updateStyle({ borderRadius: `${radius}px` })}
                  >
                    {radius}
                  </button>
                ))}
              </div>
            </div>

            {/* Shadow */}
            <div className="control-row">
              <label className="control-label">Shadow</label>
              <div className="button-group">
                <button
                  className={`option-btn ${!rule.formatting.style?.boxShadow ? 'active' : ''}`}
                  onClick={() => updateStyle({ boxShadow: undefined })}
                >
                  None
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.boxShadow === '0 1px 3px rgba(0,0,0,0.12)' ? 'active' : ''}`}
                  onClick={() => updateStyle({ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' })}
                >
                  Sm
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.boxShadow === '0 4px 6px rgba(0,0,0,0.1)' ? 'active' : ''}`}
                  onClick={() => updateStyle({ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' })}
                >
                  Md
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.boxShadow === '0 10px 15px rgba(0,0,0,0.1)' ? 'active' : ''}`}
                  onClick={() => updateStyle({ boxShadow: '0 10px 15px rgba(0,0,0,0.1)' })}
                >
                  Lg
                </button>
              </div>
            </div>

            {/* Border */}
            <div className="control-row">
              <label className="control-label">Border</label>
              <div className="button-group">
                <button
                  className={`option-btn ${!rule.formatting.style?.border ? 'active' : ''}`}
                  onClick={() => updateStyle({ border: undefined })}
                >
                  None
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.border === '1px solid #e5e7eb' ? 'active' : ''}`}
                  onClick={() => updateStyle({ border: '1px solid #e5e7eb' })}
                >
                  Light
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.border === '1px solid #9ca3af' ? 'active' : ''}`}
                  onClick={() => updateStyle({ border: '1px solid #9ca3af' })}
                >
                  Med
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.border === '2px solid #4b5563' ? 'active' : ''}`}
                  onClick={() => updateStyle({ border: '2px solid #4b5563' })}
                >
                  Bold
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="colors-content">
            {/* Color Palette */}
            <div className="control-row">
              <label className="control-label">Palette</label>
              <div className="color-palette">
                {minimalColors.map(color => (
                  <button
                    key={color.name}
                    className={`color-swatch ${currentBg === color.value ? 'active' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => updateStyle({ 
                      backgroundColor: color.value,
                      color: color.text 
                    })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="control-row">
              <label className="control-label">Custom</label>
              <div className="color-inputs">
                <div className="color-input-group">
                  <input
                    type="color"
                    value={currentBg}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={currentBg}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="color-text"
                    placeholder="#000000"
                  />
                  <span className="color-label">BG</span>
                </div>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={currentColor}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                    className="color-text"
                    placeholder="#000000"
                  />
                  <span className="color-label">FG</span>
                </div>
              </div>
            </div>

            {/* Opacity */}
            <div className="control-row">
              <label className="control-label">
                Opacity
                <span className="opacity-value">{Math.round((rule.formatting.style?.opacity || 1) * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={(rule.formatting.style?.opacity || 1) * 100}
                onChange={(e) => updateStyle({ opacity: parseFloat(e.target.value) / 100 })}
                className="opacity-slider"
              />
            </div>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="text-content">
            {/* Font Size */}
            <div className="control-row">
              <label className="control-label">Size</label>
              <div className="button-group">
                {['12', '14', '16', '18', '20'].map(size => (
                  <button
                    key={size}
                    className={`option-btn ${rule.formatting.style?.fontSize === `${size}px` ? 'active' : ''}`}
                    onClick={() => updateStyle({ fontSize: `${size}px` })}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Weight */}
            <div className="control-row">
              <label className="control-label">Weight</label>
              <div className="button-group">
                <button
                  className={`option-btn ${rule.formatting.style?.fontWeight === '300' ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontWeight: '300' })}
                >
                  Light
                </button>
                <button
                  className={`option-btn ${(!rule.formatting.style?.fontWeight || rule.formatting.style?.fontWeight === '400') ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontWeight: '400' })}
                >
                  Regular
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.fontWeight === '500' ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontWeight: '500' })}
                >
                  Medium
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.fontWeight === '700' ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontWeight: '700' })}
                >
                  Bold
                </button>
              </div>
            </div>

            {/* Text Style */}
            <div className="control-row">
              <label className="control-label">Style</label>
              <div className="button-group">
                <button
                  className={`option-btn ${!rule.formatting.style?.fontStyle ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontStyle: undefined })}
                >
                  Normal
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.fontStyle === 'italic' ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontStyle: 'italic' })}
                >
                  Italic
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.textDecoration === 'underline' ? 'active' : ''}`}
                  onClick={() => updateStyle({ textDecoration: rule.formatting.style?.textDecoration === 'underline' ? undefined : 'underline' })}
                >
                  Under
                </button>
                <button
                  className={`option-btn ${rule.formatting.style?.textDecoration === 'line-through' ? 'active' : ''}`}
                  onClick={() => updateStyle({ textDecoration: rule.formatting.style?.textDecoration === 'line-through' ? undefined : 'line-through' })}
                >
                  Strike
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset Button - Minimal */}
      <div className="minimal-footer">
        <button
          className="reset-btn"
          onClick={() => {
            updateStyle({
              backgroundColor: undefined,
              color: undefined,
              fontSize: undefined,
              fontWeight: undefined,
              fontStyle: undefined,
              textDecoration: undefined,
              borderRadius: undefined,
              boxShadow: undefined,
              border: undefined,
              opacity: undefined
            });
          }}
        >
          Reset All
        </button>
      </div>
    </div>
  );
};