import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

// Common icons for conditional formatting
const COMMON_ICONS = [
  'AlertCircle', 'AlertTriangle', 'ArrowDown', 'ArrowUp', 'Award',
  'Ban', 'Bell', 'Bookmark', 'Calendar', 'Check', 'CheckCircle', 'CheckCircle2',
  'ChevronDown', 'ChevronUp', 'Circle', 'Clock', 'Copy', 'DollarSign',
  'Download', 'Eye', 'EyeOff', 'File', 'Flag', 'Folder', 'Hash',
  'Heart', 'Home', 'Info', 'Link', 'Lock', 'Mail', 'MessageCircle',
  'Minus', 'MinusCircle', 'MoreHorizontal', 'MoreVertical', 'Percent',
  'Phone', 'Plus', 'PlusCircle', 'RefreshCw', 'Search', 'Settings',
  'Shield', 'ShieldCheck', 'ShieldX', 'Star', 'Tag', 'Target',
  'ThumbsDown', 'ThumbsUp', 'Trash', 'TrendingDown', 'TrendingUp',
  'Upload', 'User', 'Users', 'X', 'XCircle', 'Zap'
];

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get the icon component
  const getIcon = (name: string) => {
    const iconName = name.charAt(0).toUpperCase() + name.slice(1);
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  // Filter icons based on search
  const filteredIcons = COMMON_ICONS.filter(icon =>
    icon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleIconSelect = (iconName: string) => {
    onChange(iconName.toLowerCase());
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", className)}
        >
          {value ? (
            <>
              {getIcon(value)}
              <span className="text-sm">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select icon...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>
        <ScrollArea className="h-80">
          <div className="grid grid-cols-5 gap-1 p-3">
            {filteredIcons.map((iconName) => {
              const isSelected = value === iconName.toLowerCase();
              return (
                <Button
                  key={iconName}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-10 w-10 p-0",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => handleIconSelect(iconName)}
                  title={iconName}
                >
                  {getIcon(iconName.toLowerCase())}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};