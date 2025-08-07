import React, { useState } from 'react';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { Palette, Type, Square, X } from 'lucide-react';
import './compactStyles.css';

interface CompactFormatOptionsProps {
  rule: ConditionalRule;
  onUpdateRule: (rule: ConditionalRule) => void;
}

interface BorderStyle {
  side: string;
  width: string;  
  style: string;
  color: string;
}

export const CompactFormatOptions: React.FC<CompactFormatOptionsProps> = ({
  rule,
  onUpdateRule
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'borders'>('colors');
  
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

  return (
    <div className="cf-compact-container">
      {/* Preview Section - Compact */}
      <div className="cf-preview">
        <label className="cf-label">Preview</label>
        <div className="cf-preview-box">
          <div 
            className="cf-preview-content"
            style={{
              ...rule.formatting.style,
              padding: '8px 12px',
            }}
          >
            Sample Text
          </div>
        </div>
      </div>

      {/* Tab Navigation - Compact */}
      <div className="cf-tabs">
        <button
          className={`cf-tab ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
          title="Colors & Layout"
        >
          <Palette className="cf-tab-icon" />
          <span>Colors</span>
        </button>
        <button
          className={`cf-tab ${activeTab === 'typography' ? 'active' : ''}`}
          onClick={() => setActiveTab('typography')}
          title="Typography"
        >
          <Type className="cf-tab-icon" />
          <span>Text</span>
        </button>
        <button
          className={`cf-tab ${activeTab === 'borders' ? 'active' : ''}`}
          onClick={() => setActiveTab('borders')}
          title="Borders"
        >
          <Square className="cf-tab-icon" />
          <span>Borders</span>
        </button>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="cf-content">
        {activeTab === 'colors' && (
          <div className="cf-colors-content">
            {/* Background Color */}
            <div className="cf-field">
              <label className="cf-label">Background</label>
              <div className="cf-color-input">
                <input
                  type="color"
                  value={rule.formatting.style?.backgroundColor || '#1f2937'}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="cf-color-picker"
                />
                <input
                  type="text"
                  value={rule.formatting.style?.backgroundColor || '#1f2937'}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="cf-color-text"
                  placeholder="#1f2937"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="cf-field">
              <label className="cf-label">Text Color</label>
              <div className="cf-color-input">
                <input
                  type="color"
                  value={rule.formatting.style?.color || '#f9fafb'}
                  onChange={(e) => updateStyle({ color: e.target.value })}
                  className="cf-color-picker"
                />
                <input
                  type="text"
                  value={rule.formatting.style?.color || '#f9fafb'}
                  onChange={(e) => updateStyle({ color: e.target.value })}
                  className="cf-color-text"
                  placeholder="#f9fafb"
                />
              </div>
            </div>

            {/* Opacity */}
            <div className="cf-field">
              <label className="cf-label">
                Opacity
                <span className="cf-value">{Math.round((rule.formatting.style?.opacity || 1) * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={(rule.formatting.style?.opacity || 1) * 100}
                onChange={(e) => updateStyle({ opacity: parseFloat(e.target.value) / 100 })}
                className="cf-slider"
              />
            </div>

            {/* Text Alignment */}
            <div className="cf-field">
              <label className="cf-label">Alignment</label>
              <div className="cf-button-group">
                <button
                  className={`cf-btn ${textAlign === 'left' ? 'active' : ''}`}
                  onClick={() => updateStyle({ textAlign: 'left' })}
                >
                  L
                </button>
                <button
                  className={`cf-btn ${textAlign === 'center' ? 'active' : ''}`}
                  onClick={() => updateStyle({ textAlign: 'center' })}
                >
                  C
                </button>
                <button
                  className={`cf-btn ${textAlign === 'right' ? 'active' : ''}`}
                  onClick={() => updateStyle({ textAlign: 'right' })}
                >
                  R
                </button>
                <button
                  className={`cf-btn ${textAlign === 'justify' ? 'active' : ''}`}
                  onClick={() => updateStyle({ textAlign: 'justify' })}
                >
                  J
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="cf-typography-content">
            {/* Font Family */}
            <div className="cf-field">
              <label className="cf-label">Font Family</label>
              <select
                value={rule.formatting.style?.fontFamily || 'Inter'}
                onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                className="cf-select"
              >
                <option value="Inter">Inter</option>
                <option value="system-ui">System UI</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Helvetica Neue', sans-serif">Helvetica</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier</option>
              </select>
            </div>

            {/* Font Size & Weight */}
            <div className="cf-row">
              <div className="cf-field-half">
                <label className="cf-label">Size</label>
                <input
                  type="number"
                  value={parseInt(rule.formatting.style?.fontSize || '14')}
                  onChange={(e) => updateStyle({ fontSize: `${e.target.value}px` })}
                  className="cf-input"
                  min="8"
                  max="72"
                />
              </div>
              <div className="cf-field-half">
                <label className="cf-label">Weight</label>
                <select
                  value={rule.formatting.style?.fontWeight || '400'}
                  onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                  className="cf-select"
                >
                  <option value="300">Light</option>
                  <option value="400">Regular</option>
                  <option value="500">Medium</option>
                  <option value="600">Semibold</option>
                  <option value="700">Bold</option>
                </select>
              </div>
            </div>

            {/* Font Style */}
            <div className="cf-field">
              <label className="cf-label">Style</label>
              <div className="cf-button-group">
                <button
                  className={`cf-btn ${rule.formatting.style?.fontStyle === 'normal' || !rule.formatting.style?.fontStyle ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontStyle: 'normal' })}
                >
                  Normal
                </button>
                <button
                  className={`cf-btn ${rule.formatting.style?.fontStyle === 'italic' ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontStyle: 'italic' })}
                >
                  Italic
                </button>
              </div>
            </div>

            {/* Text Decoration */}
            <div className="cf-field">
              <label className="cf-label">Decoration</label>
              <select
                value={rule.formatting.style?.textDecoration || 'none'}
                onChange={(e) => updateStyle({ textDecoration: e.target.value === 'none' ? undefined : e.target.value })}
                className="cf-select"
              >
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="line-through">Line Through</option>
                <option value="overline">Overline</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'borders' && (
          <div className="cf-borders-content">
            {/* Border Controls */}
            <div className="cf-border-controls">
              <div className="cf-row">
                <div className="cf-field-half">
                  <label className="cf-label">Side</label>
                  <select
                    value={currentBorder.side}
                    onChange={(e) => setCurrentBorder({ ...currentBorder, side: e.target.value })}
                    className="cf-select"
                  >
                    <option value="Top">Top</option>
                    <option value="Right">Right</option>
                    <option value="Bottom">Bottom</option>
                    <option value="Left">Left</option>
                  </select>
                </div>
                <div className="cf-field-half">
                  <label className="cf-label">Width</label>
                  <select
                    value={currentBorder.width}
                    onChange={(e) => setCurrentBorder({ ...currentBorder, width: e.target.value })}
                    className="cf-select"
                  >
                    <option value="1px">1px</option>
                    <option value="2px">2px</option>
                    <option value="3px">3px</option>
                    <option value="4px">4px</option>
                  </select>
                </div>
              </div>

              <div className="cf-row">
                <div className="cf-field-half">
                  <label className="cf-label">Style</label>
                  <select
                    value={currentBorder.style}
                    onChange={(e) => setCurrentBorder({ ...currentBorder, style: e.target.value })}
                    className="cf-select"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="double">Double</option>
                  </select>
                </div>
                <div className="cf-field-half">
                  <label className="cf-label">Color</label>
                  <div className="cf-color-input-small">
                    <input
                      type="color"
                      value={currentBorder.color}
                      onChange={(e) => setCurrentBorder({ ...currentBorder, color: e.target.value })}
                      className="cf-color-picker"
                    />
                    <input
                      type="text"
                      value={currentBorder.color}
                      onChange={(e) => setCurrentBorder({ ...currentBorder, color: e.target.value })}
                      className="cf-color-text-small"
                    />
                  </div>
                </div>
              </div>

              <button className="cf-add-btn" onClick={addBorderStyle}>
                Add Border
              </button>
            </div>

            {/* Applied Borders */}
            <div className="cf-applied-borders">
              <label className="cf-label">Applied Borders</label>
              <div className="cf-border-list">
                {appliedBorders.length === 0 ? (
                  <div className="cf-no-borders">No borders</div>
                ) : (
                  appliedBorders.map((border) => (
                    <div key={border.side} className="cf-border-item">
                      <span className="cf-border-info">
                        <strong>{border.side}:</strong> {border.width} {border.style}
                      </span>
                      <button
                        className="cf-remove-btn"
                        onClick={() => removeBorderStyle(border.side)}
                      >
                        <X className="cf-remove-icon" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="cf-footer">
        <button
          className="cf-reset-btn"
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
          Reset All
        </button>
      </div>
    </div>
  );
};