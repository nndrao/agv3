import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  // Blues
  '#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#1976d2', '#1565c0',
  // Greens
  '#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32',
  // Reds
  '#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336', '#e53935', '#d32f2f', '#c62828',
  // Oranges
  '#fff3e0', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#fb8c00', '#f57c00', '#ef6c00',
  // Grays
  '#fafafa', '#f5f5f5', '#eeeeee', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#616161', '#424242',
  // Special
  '#ffffff', '#000000', 'transparent'
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(color);

  const handleColorSelect = (selectedColor: string) => {
    setInputValue(selectedColor);
    onChange(selectedColor);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(value) || value === 'transparent') {
      onChange(value);
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-10 h-10 p-0 border-2"
            style={{
              backgroundColor: color === 'transparent' ? undefined : color,
              backgroundImage: color === 'transparent' 
                ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)'
                : undefined,
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 4px 4px'
            }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="grid grid-cols-9 gap-1">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                className={cn(
                  "w-8 h-8 rounded-md border-2 hover:scale-110 transition-transform",
                  color === presetColor ? "border-primary" : "border-transparent"
                )}
                style={{
                  backgroundColor: presetColor === 'transparent' ? undefined : presetColor,
                  backgroundImage: presetColor === 'transparent' 
                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)'
                    : undefined,
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 4px 4px'
                }}
                onClick={() => handleColorSelect(presetColor)}
                title={presetColor}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="#000000"
        className="flex-1 font-mono text-sm"
      />
    </div>
  );
};