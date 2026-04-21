import * as SwitchPrimitive from "@radix-ui/react-switch"

import * as React from "react"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-[52px] shrink-0 cursor-pointer items-center border-2 border-border bg-secondary-background shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-main data-[state=unchecked]:bg-secondary-background",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-4 bg-white border-2 border-border ring-0 transition-transform data-[state=checked]:translate-x-[28px] data-[state=unchecked]:translate-x-1",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
