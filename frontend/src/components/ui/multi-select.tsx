import * as React from "react"
import { Check, ChevronsUpDown, X as XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type Option = {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const safeSelected = Array.isArray(selected) ? selected : []

  const handleUnselect = (item: string) => {
    onChange(safeSelected.filter((i) => i !== item))
  }

  const getChipStyle = (value: string) => {
    const isTag = value.startsWith("tag:")
    if (isTag) {
      return "bg-ztmy-purple text-white border-black hover:bg-ztmy-purple/90"
    }
    return "bg-ztmy-green text-black border-black hover:bg-ztmy-green/90"
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto min-h-[2.5rem] p-2 border-2 border-black font-bold shadow-neo-sm bg-white text-black",
            className
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1">
            {safeSelected.length === 0 && (
              <span className="text-black/50">{placeholder}</span>
            )}
            {safeSelected.map((item) => {
              const option = options.find((opt) => opt.value === item)
              return (
                <Badge
                  key={item}
                  variant="secondary"
                  className={cn("mr-1 mb-1 border-2 shadow-neo-sm", getChipStyle(item))}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUnselect(item)
                  }}
                >
                  {option?.label || item}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(item)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUnselect(item)
                    }}
                  >
                    <XIcon className={cn("h-3 w-3", item.startsWith("tag:") ? "text-white/80 hover:text-white" : "text-black/70 hover:text-black")} />
                  </button>
                </Badge>
              )
            })}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 border-2 border-black shadow-neo bg-white">
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(
                      safeSelected.includes(option.value)
                        ? safeSelected.filter((item) => item !== option.value)
                        : [...safeSelected, option.value]
                    )
                  }}
                  className={cn(
                    "font-bold",
                    safeSelected.includes(option.value) ? "bg-ztmy-green/20" : ""
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      safeSelected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
