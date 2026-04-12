import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border-3 border-border shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none py-2 px-4 rounded-none";
  
  const variants = {
    default: "bg-white text-black hover:bg-gray-100",
    yellow: "bg-ztmy-yellow text-black hover:bg-ztmy-yellow/90",
    dark: "bg-[#1a1a20] text-white hover:bg-[#25252b]",
  };

  return (
    <button 
      ref={ref} 
      className={cn(baseStyles, variants[variant], className)} 
      {...props} 
    />
  )
})
Button.displayName = "Button"

export { Button }