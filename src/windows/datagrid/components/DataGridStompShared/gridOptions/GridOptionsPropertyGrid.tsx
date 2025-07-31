import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './NoPortalSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { GridOptionsConfig, GridOptionsSection, GridOptionField } from './types';

interface GridOptionsPropertyGridProps {
  sections: GridOptionsSection[];
  options: GridOptionsConfig;
  onChange: (key: keyof GridOptionsConfig, value: any) => void;
  profileOptions: GridOptionsConfig;
  searchTerm: string;
  viewMode: 'categorized' | 'alphabetical';
}

export const GridOptionsPropertyGrid: React.FC<GridOptionsPropertyGridProps> = ({
  sections,
  options,
  onChange,
  profileOptions,
  searchTerm,
  viewMode
}) => {

  // Filter and organize fields
  const filteredData = useMemo(() => {
    const allFields: { field: GridOptionField; section: GridOptionsSection }[] = [];
    
    sections.forEach(section => {
      section.options.forEach(field => {
        if (!searchTerm || 
            field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            field.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
          allFields.push({ field, section });
        }
      });
    });

    if (viewMode === 'alphabetical') {
      allFields.sort((a, b) => a.field.label.localeCompare(b.field.label));
      return [{ 
        section: { id: 'all', title: 'All Properties', icon: null as any, options: [] }, 
        fields: allFields 
      }];
    } else {
      const grouped = sections.map(section => ({
        section,
        fields: allFields.filter(item => item.section.id === section.id)
      })).filter(group => group.fields.length > 0);
      
      return grouped;
    }
  }, [sections, searchTerm, viewMode]);

  const renderPropertyRow = (field: GridOptionField) => {
    const value = options[field.key as keyof GridOptionsConfig];
    const profileValue = profileOptions[field.key as keyof GridOptionsConfig];
    const hasChanged = value !== profileValue && value !== undefined;

    return (
      <div 
        key={field.key} 
        className={cn(
          "grid grid-cols-[minmax(100px,200px)_minmax(200px,250px)] gap-0 min-h-[28px] ml-2",
          "hover:bg-muted/50 transition-colors",
          hasChanged && "font-medium"
        )}
      >
        <div className="flex items-center px-2 py-1 bg-muted/20">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Label className="text-xs font-normal cursor-help truncate">
                  {field.label}
                </Label>
              </TooltipTrigger>
              {field.description && (
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-xs">{field.description}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center px-2 py-1 justify-start">
          {renderField(field, value)}
        </div>
      </div>
    );
  };

  const renderField = (field: GridOptionField, value: any) => {
    switch (field.type) {
      case 'number':
        return (
          <div className="flex items-center gap-1 w-full">
            <Input
              type="number"
              value={value ?? field.defaultValue ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                onChange(field.key as keyof GridOptionsConfig, val);
              }}
              min={field.min}
              max={field.max}
              step={field.step}
              placeholder={field.defaultValue?.toString()}
              className="h-6 text-xs w-[180px]"
            />
            {field.unit && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">{field.unit}</span>
            )}
          </div>
        );

      case 'boolean':
        return (
          <Switch
            checked={value ?? field.defaultValue ?? false}
            onCheckedChange={(checked) => onChange(field.key as keyof GridOptionsConfig, checked)}
            className="h-4 w-7"
          />
        );

      case 'string':
        return (
          <Input
            type="text"
            value={value ?? field.defaultValue ?? ''}
            onChange={(e) => onChange(field.key as keyof GridOptionsConfig, e.target.value)}
            placeholder={field.defaultValue?.toString()}
            className="h-6 text-xs w-[180px]"
          />
        );

      case 'select':
        return (
          <Select
            value={String(value ?? field.defaultValue ?? '')}
            onValueChange={(val) => {
              if (val === 'null') onChange(field.key as keyof GridOptionsConfig, null);
              else if (val === 'undefined') onChange(field.key as keyof GridOptionsConfig, undefined);
              else onChange(field.key as keyof GridOptionsConfig, val);
            }}
          >
            <SelectTrigger className="h-6 text-xs w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem 
                  key={String(option.value)} 
                  value={String(option.value ?? 'null')}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const currentValues = value ?? field.defaultValue ?? [];
        const isArray = Array.isArray(currentValues);
        const valuesArray = isArray ? currentValues : [];
        
        return (
          <Select
            value="_multiselect"
            onValueChange={() => {}}
          >
            <SelectTrigger className="h-6 text-xs w-[180px]">
              <SelectValue>
                {valuesArray.length > 0 
                  ? valuesArray.join(', ')
                  : '(none)'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                {field.options?.map(option => {
                  const isChecked = valuesArray.includes(option.value);
                  return (
                    <label
                      key={String(option.value)}
                      className="flex items-center gap-2 p-1.5 hover:bg-accent rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (!isArray && value === false) {
                            const newValues = checked ? [option.value] : [];
                            onChange(field.key as keyof GridOptionsConfig, newValues);
                          } else {
                            const newValues = checked
                              ? [...valuesArray, option.value]
                              : valuesArray.filter((v: any) => v !== option.value);
                            onChange(field.key as keyof GridOptionsConfig, newValues.length > 0 ? newValues : false);
                          }
                        }}
                        className="h-3 w-3"
                      />
                      <span className="text-xs">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  if (viewMode === 'alphabetical' && filteredData.length > 0) {
    return (
      <div>
        {filteredData[0].fields.map(({ field }) => renderPropertyRow(field))}
      </div>
    );
  }

  return (
    <Accordion 
      type="multiple" 
      defaultValue={sections.map(s => s.id)}
      className="w-full"
    >
      {filteredData.map(({ section, fields }) => (
        <AccordionItem key={section.id} value={section.id} className="border-none">
          <AccordionTrigger className="h-8 px-3 py-0 text-xs font-semibold hover:no-underline bg-muted/30 hover:bg-muted/50 grid-options-accordion-trigger">
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <div>
              {fields.map(({ field }) => renderPropertyRow(field))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};