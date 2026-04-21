import * as DialogPrimitive from "@radix-ui/react-dialog"

import * as React from "react"

import { cn } from "@/lib/utils" // 正確的寫法：使用路徑別名

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close


const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}

      className={cn(
"fixed inset-0 z-[100] bg-background/90 backdrop-blur-md data-[state=open]:animate-dialog-fade-in data-[state=closed]:animate-dialog-fade-out",        className,
      )}
      {...props}
    />
  )
})

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { overlayClassName?: string }
>(({ className, children, overlayClassName, ...props }, ref) => {
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-0 top-0 md:left-[50%] md:top-[50%] z-[100] grid w-screen h-[100dvh] md:w-full md:h-auto md:max-w-lg !translate-x-0 !translate-y-0 md:!translate-x-[-50%] md:!translate-y-[-50%] gap-4 border-0 md:border-4 border-black bg-background p-0 shadow-none md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:rounded-none outline-none data-[state=open]:animate-dialog-fade-in data-[state=closed]:animate-dialog-fade-out",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 md:top-6 md:right-8 z-[110] bg-background text-foreground border-3 border-foreground shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all w-10 h-10 flex items-center justify-center rounded-none focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <i className="hn hn-times text-xl leading-none" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
    <div
className={cn("flex flex-col gap-2 p-4 border-b-4 border-border", className)}
      {...props}
    />
  )

}
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {  return (
    <div

      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  )
}
DialogFooter.displayName = "DialogFooter"
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn(
        "text-lg font-heading leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  )
})

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Description
      ref={ref}
      data-slot="dialog-description"
      className={cn("text-sm font-base text-foreground", className)}
      {...props}
    />
  )
})

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
