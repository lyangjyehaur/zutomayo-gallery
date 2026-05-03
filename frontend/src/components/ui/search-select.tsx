import * as React from "react"
import { Check, ChevronsUpDown, X as XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export type SearchSelectOption = {
  label: string
  value: string
}

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
}: {
  options: SearchSelectOption[]
  value: string | null | undefined
  onChange: (value: string | null) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(() => {
    if (!value) return null
    return options.find((o) => o.value === value) || { label: value, value }
  }, [options, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto min-h-[2.5rem] p-2 border-2 border-black font-bold shadow-neo-sm bg-white text-black",
            className,
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {!selected ? <span className="text-black/50">{placeholder}</span> : null}
            {selected ? (
              <Badge
                variant="secondary"
                className="mr-1 mb-1 border-2 shadow-neo-sm bg-ztmy-green text-black border-black hover:bg-ztmy-green/90"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
              >
                {selected.label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(null)
                  }}
                >
                  <XIcon className="h-3 w-3 text-black/70 hover:text-black" />
                </button>
              </Badge>
            ) : null}
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
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn("font-bold", option.value === value ? "bg-ztmy-green/20" : "")}
                >
                  <Check className={cn("mr-2 h-4 w-4", option.value === value ? "opacity-100" : "opacity-0")} />
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

