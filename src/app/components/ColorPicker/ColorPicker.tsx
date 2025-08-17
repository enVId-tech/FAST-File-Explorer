import React, { useState } from 'react';
import './ColorPicker.scss';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  allowTransparency?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  label,
  allowTransparency = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(color);

  const handleColorChange = (newColor: string) => {
    setTempColor(newColor);
    onChange(newColor);
  };

  const predefinedColors = [
    '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529',
    '#ff0000', '#ff6b6b', '#ffa8a8', '#ffcc02', '#ffd93d', '#74c0fc', '#339af0', '#228be6', '#1971c2', '#1864ab',
    '#00ff00', '#69db7c', '#51cf66', '#40c057', '#37b24d', '#2f9e44', '#2b8a3e', '#237d31', '#1b5e20', '#0d4818',
    '#0000ff', '#74c0fc', '#339af0', '#228be6', '#1971c2', '#1864ab', '#1558d6', '#1048c7', '#0b3ba8', '#082f8a',
    '#800080', '#d0bfff', '#b197fc', '#9775fa', '#845ef7', '#7950f2', '#7048e8', '#6741d9', '#5f3dc4', '#5429b8',
  ];

  return (
    <div className="color-picker">
      {label && <label className="color-picker-label">{label}</label>}

      <div className="color-picker-container">
        <div
          className="color-preview"
          style={{ backgroundColor: color }}
          onClick={() => setIsOpen(!isOpen)}
          title="Click to change color"
        />

        <input
          type="text"
          value={color}
          onChange={(e) => handleColorChange(e.target.value)}
          className="color-input"
          placeholder="#ffffff or rgba(255,255,255,0.5)"
        />
      </div>

      {isOpen && (
        <div className="color-picker-dropdown">
          <div className="color-picker-section">
            <h4>Color Input</h4>
            <input
              type="color"
              value={color.startsWith('#') ? color : '#ffffff'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="native-color-picker"
            />
          </div>

          <div className="color-picker-section">
            <h4>Predefined Colors</h4>
            <div className="predefined-colors">
              {predefinedColors.map((preColor) => (
                <div
                  key={preColor}
                  className={`predefined-color ${color === preColor ? 'selected' : ''}`}
                  style={{ backgroundColor: preColor }}
                  onClick={() => handleColorChange(preColor)}
                  title={preColor}
                />
              ))}
            </div>
          </div>

          {allowTransparency && (
            <div className="color-picker-section">
              <h4>Transparency</h4>
              <div className="transparency-examples">
                <div
                  className="transparency-option"
                  onClick={() => handleColorChange(color.replace(/[^,]+\)$/, '1)'))}
                >
                  Opaque
                </div>
                <div
                  className="transparency-option"
                  onClick={() => handleColorChange(color.replace(/[^,]+\)$/, '0.8)'))}
                >
                  80%
                </div>
                <div
                  className="transparency-option"
                  onClick={() => handleColorChange(color.replace(/[^,]+\)$/, '0.5)'))}
                >
                  50%
                </div>
                <div
                  className="transparency-option"
                  onClick={() => handleColorChange(color.replace(/[^,]+\)$/, '0.2)'))}
                >
                  20%
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
