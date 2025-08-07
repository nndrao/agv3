import React, { useState } from 'react';
import { ConditionalRule } from '@/components/conditional-formatting/types';
import { Palette, Type, Square, X, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import './wireframeStyles.css';

interface WireframeFormatOptionsProps {
  rule: ConditionalRule;
  onUpdateRule: (rule: ConditionalRule) => void;
}

interface BorderStyle {
  side: string;
  width: string;
  style: string;
  color: string;
}

export const WireframeFormatOptions: React.FC<WireframeFormatOptionsProps> = ({
  rule,
  onUpdateRule
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'borders'>('colors');
  
  // Initialize applied borders from existing rule
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
    <div className="wf-format-container">
      {/* Preview Section */}
      <div className="wf-preview-section">
        <h3 className="wf-section-title">Preview</h3>
        <div className="wf-preview-box">
          <div 
            className="wf-preview-content"
            style={{
              ...rule.formatting.style,
              padding: '12px 16px',
            }}
          >
            Sample Cell Content
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="wf-tabs">
        <button
          className={`wf-tab ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          <Palette className="wf-tab-icon" />
          <span>Colors & Layout</span>
        </button>
        <button
          className={`wf-tab ${activeTab === 'typography' ? 'active' : ''}`}
          onClick={() => setActiveTab('typography')}
        >
          <Type className="wf-tab-icon" />
          <span>Typography</span>
        </button>
        <button
          className={`wf-tab ${activeTab === 'borders' ? 'active' : ''}`}
          onClick={() => setActiveTab('borders')}
        >
          <Square className="wf-tab-icon" />
          <span>Borders</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="wf-tab-content">
        {activeTab === 'colors' && (
          <div className="wf-colors-content">
            {/* Colors Section */}
            <div className="wf-section">
              <h4 className="wf-subsection-title">Colors</h4>
              
              {/* Background Color */}
              <div className="wf-field">
                <label className="wf-label">Background Color</label>
                <div className="wf-color-input">
                  <input
                    type="color"
                    value={rule.formatting.style?.backgroundColor || '#1f2937'}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="wf-color-picker"
                  />
                  <input
                    type="text"
                    value={rule.formatting.style?.backgroundColor || '#1f2937'}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="wf-color-text"
                    placeholder="#1f2937"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="wf-field">
                <label className="wf-label">Text Color</label>
                <div className="wf-color-input">
                  <input
                    type="color"
                    value={rule.formatting.style?.color || '#f9fafb'}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                    className="wf-color-picker"
                  />
                  <input
                    type="text"
                    value={rule.formatting.style?.color || '#f9fafb'}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                    className="wf-color-text"
                    placeholder="#f9fafb"
                  />
                </div>
              </div>
            </div>

            {/* Layout Section */}
            <div className="wf-section">
              <h4 className="wf-subsection-title">Layout</h4>
              
              {/* Text Alignment */}
              <div className="wf-field">
                <label className="wf-label">Text Alignment</label>
                <div className="wf-button-group">
                  <button
                    className={`wf-align-btn ${textAlign === 'left' ? 'active' : ''}`}
                    onClick={() => updateStyle({ textAlign: 'left' })}
                  >
                    <AlignLeft className="wf-align-icon" />
                    <span>Left</span>
                  </button>
                  <button
                    className={`wf-align-btn ${textAlign === 'center' ? 'active' : ''}`}
                    onClick={() => updateStyle({ textAlign: 'center' })}
                  >
                    <AlignCenter className="wf-align-icon" />
                    <span>Center</span>
                  </button>
                  <button
                    className={`wf-align-btn ${textAlign === 'right' ? 'active' : ''}`}
                    onClick={() => updateStyle({ textAlign: 'right' })}
                  >
                    <AlignRight className="wf-align-icon" />
                    <span>Right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="wf-typography-content">
            {/* Font Family */}
            <div className="wf-field">
              <label className="wf-label">Font Family</label>
              <select
                value={rule.formatting.style?.fontFamily || 'Inter'}
                onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                className="wf-select"
              >
                <option value="Inter">Inter</option>
                <option value="system-ui">System UI</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Helvetica Neue', sans-serif">Helvetica</option>
                <option value="'SF Pro Display', sans-serif">SF Pro</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
              </select>
            </div>

            {/* Size, Weight, Style Row */}
            <div className="wf-row-3">
              <div className="wf-field">
                <label className="wf-label">Size (px)</label>
                <input
                  type="number"
                  value={parseInt(rule.formatting.style?.fontSize || '14')}
                  onChange={(e) => updateStyle({ fontSize: `${e.target.value}px` })}
                  className="wf-input"
                  min="8"
                  max="72"
                />
              </div>

              <div className="wf-field">
                <label className="wf-label">Weight</label>
                <select
                  value={rule.formatting.style?.fontWeight || '400'}
                  onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                  className="wf-select"
                >
                  <option value="300">300</option>
                  <option value="400">400</option>
                  <option value="500">500</option>
                  <option value="600">600</option>
                  <option value="700">700</option>
                </select>
              </div>

              <div className="wf-field">
                <label className="wf-label">Style</label>
                <select
                  value={rule.formatting.style?.fontStyle || 'Normal'}
                  onChange={(e) => updateStyle({ fontStyle: e.target.value === 'Normal' ? undefined : e.target.value })}
                  className="wf-select"
                >
                  <option value="Normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </div>
            </div>

            {/* Text Decoration */}
            <div className="wf-field">
              <label className="wf-label">Text Decoration</label>
              <select
                value={rule.formatting.style?.textDecoration || 'None'}
                onChange={(e) => updateStyle({ textDecoration: e.target.value === 'None' ? undefined : e.target.value })}
                className="wf-select"
              >
                <option value="None">None</option>
                <option value="underline">Underline</option>
                <option value="line-through">Line Through</option>
                <option value="overline">Overline</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'borders' && (
          <div className="wf-borders-content">
            {/* Border Controls */}
            <div className="wf-border-controls">
              <div className="wf-row-4">
                <div className="wf-field-small">
                  <label className="wf-label-small">Side</label>
                  <select
                    value={currentBorder.side}
                    onChange={(e) => setCurrentBorder({ ...currentBorder, side: e.target.value })}
                    className="wf-select-small"
                  >
                    <option value="Top">Top</option>
                    <option value="Right">Right</option>
                    <option value="Bottom">Bottom</option>
                    <option value="Left">Left</option>
                  </select>
                </div>

                <div className="wf-field-small">
                  <label className="wf-label-small">Width</label>
                  <select
                    value={currentBorder.width}
                    onChange={(e) => setCurrentBorder({ ...currentBorder, width: e.target.value })}
                    className="wf-select-small"
                  >
                    <option value="1px">1px</option>
                    <option value="2px">2px</option>
                    <option value="3px">3px</option>
                    <option value="4px">4px</option>
                  </select>
                </div>

                <div className="wf-field-small">
                  <label className="wf-label-small">Style</label>
                  <select
                    value={currentBorder.style}
                    onChange={(e) => setCurrentBorder({ ...currentBorder, style: e.target.value })}
                    className="wf-select-small"
                  >
                    <option value="solid">solid</option>
                    <option value="dashed">dashed</option>
                    <option value="dotted">dotted</option>
                    <option value="double">double</option>
                  </select>
                </div>

                <div className="wf-field-small">
                  <label className="wf-label-small">Color</label>
                  <div className="wf-color-input-small">
                    <input
                      type="color"
                      value={currentBorder.color}
                      onChange={(e) => setCurrentBorder({ ...currentBorder, color: e.target.value })}
                      className="wf-color-picker-small"
                    />
                    <input
                      type="text"
                      value={currentBorder.color}
                      onChange={(e) => setCurrentBorder({ ...currentBorder, color: e.target.value })}
                      className="wf-color-text-small"
                      placeholder="#374151"
                    />
                  </div>
                </div>
              </div>

              <button className="wf-add-border-btn" onClick={addBorderStyle}>
                Add Border Style
              </button>
            </div>

            {/* Applied Border Styles */}
            <div className="wf-applied-borders">
              <h4 className="wf-subsection-title">Applied Border Styles</h4>
              <div className="wf-border-list">
                {appliedBorders.length === 0 ? (
                  <div className="wf-no-borders">No borders applied</div>
                ) : (
                  appliedBorders.map((border) => (
                    <div key={border.side} className="wf-border-item">
                      <span className="wf-border-side">{border.side}</span>
                      <span className="wf-border-details">
                        {border.width} {border.style}
                      </span>
                      <span className="wf-border-color">{border.color}</span>
                      <button
                        className="wf-remove-btn"
                        onClick={() => removeBorderStyle(border.side)}
                      >
                        <X className="wf-remove-icon" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};