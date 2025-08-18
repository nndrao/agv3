import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  emptyText = "No items found.",
  className,
  disabled = false
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    return options.filter(option =>
      option.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(selected.filter(v => v !== value))
  }

  const handleSelectAll = () => {
    onChange(filteredOptions.map(opt => opt.value))
  }

  const handleClearAll = () => {
    onChange([])
  }

  const selectedLabels = React.useMemo(() => {
    return selected.map(value => {
      const option = options.find(opt => opt.value === value)
      return option ? option.label : value
    })
  }, [selected, options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            selected.length > 0 && "h-auto min-h-8",
            className
          )}
          disabled={disabled}
        >
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedLabels.slice(0, 3).map((label, index) => (
                <Badge
                  key={selected[index]}
                  variant="secondary"
                  className="mr-1 inline-flex items-center"
                >
                  {label}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => handleRemove(selected[index], e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleRemove(selected[index], e as any)
                      }
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </Badge>
              ))}
              {selected.length > 3 && (
                <Badge variant="secondary">
                  +{selected.length - 3} more
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="p-2 border-b flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-7 text-xs"
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 text-xs"
          >
            Clear All
          </Button>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                  onClick={() => handleSelect(option.value)}
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => handleSelect(option.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm flex-1">{option.label}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">
                {emptyText}
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}