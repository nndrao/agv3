import React from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun, MoreVertical, Edit2, Settings, Layers, Code2, Palette, FunctionSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SettingsSectionProps {
  sidebarVisible: boolean;
  onSidebarToggle: (visible: boolean) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onOpenRenameDialog: () => void;
  onOpenGridOptions?: () => void;
  onOpenColumnGroups: () => void;
  onOpenExpressionEditor?: () => void;
  onOpenConditionalFormatting?: () => void;
  onOpenCalculatedColumns?: () => void;
  profiles: any[];
  activeProfile: any;
  viewInstanceId: string;
}

export const SettingsSection = React.memo<SettingsSectionProps>(({
  sidebarVisible,
  onSidebarToggle,
  isDarkMode,
  onThemeToggle,
  onOpenRenameDialog,
  onOpenGridOptions,
  onOpenColumnGroups,
  onOpenExpressionEditor,
  onOpenConditionalFormatting,
  onOpenCalculatedColumns,
  profiles,
  activeProfile,
  viewInstanceId
}) => {
  return (
    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
      <div className="flex items-center gap-1">
        <Label htmlFor="sidebar-toggle" className="text-xs text-muted-foreground">
          Sidebar
        </Label>
        <Switch
          id="sidebar-toggle"
          checked={sidebarVisible}
          onCheckedChange={onSidebarToggle}
          className="h-4 w-7"
        />
      </div>
      
      <div className="h-6 w-px bg-border" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onThemeToggle}
        className="gap-1 px-2 h-8 text-xs"
      >
        {isDarkMode ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
        <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
      </Button>
      
      <div className="h-6 w-px bg-border" />
      
      {/* Debug info dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="View debug information"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Debug info</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Debug Information</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs font-mono" onSelect={(e) => e.preventDefault()}>
            <span className="text-muted-foreground">Profiles:</span>
            <span className="ml-auto">{profiles.length}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs font-mono" onSelect={(e) => e.preventDefault()}>
            <span className="text-muted-foreground">Active:</span>
            <span className="ml-auto">{activeProfile?.name || 'none'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs font-mono" onSelect={(e) => e.preventDefault()}>
            <span className="text-muted-foreground">View ID:</span>
            <span className="ml-auto" title={viewInstanceId}>
              {viewInstanceId.substring(0, 8)}...
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenRenameDialog}>
            <Edit2 className="h-4 w-4 mr-2" />
            Rename View
          </DropdownMenuItem>
          {onOpenGridOptions && (
            <DropdownMenuItem onClick={onOpenGridOptions}>
              <Settings className="h-4 w-4 mr-2" />
              Grid Options
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onOpenColumnGroups}>
            <Layers className="h-4 w-4 mr-2" />
            Column Groups
          </DropdownMenuItem>
          {onOpenExpressionEditor && (
            <DropdownMenuItem onClick={onOpenExpressionEditor}>
              <Code2 className="h-4 w-4 mr-2" />
              Expression Editor
            </DropdownMenuItem>
          )}
          {onOpenConditionalFormatting && (
            <DropdownMenuItem onClick={onOpenConditionalFormatting}>
              <Palette className="h-4 w-4 mr-2" />
              Conditional Formatting
            </DropdownMenuItem>
          )}
          {onOpenCalculatedColumns && (
            <DropdownMenuItem onClick={onOpenCalculatedColumns}>
              <FunctionSquare className="h-4 w-4 mr-2" />
              Calculated Columns
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});