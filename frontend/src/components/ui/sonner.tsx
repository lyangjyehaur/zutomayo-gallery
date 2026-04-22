import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      style={{ fontFamily: "inherit", overflowWrap: "anywhere" }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "bg-background text-foreground border-border border-2 font-heading shadow-shadow rounded-base text-[13px] flex flex-col gap-3 p-5 w-[356px] items-start",
          description: "font-base w-full",
          actionButton:
            "font-base border-2 text-[14px] h-9 px-4 bg-main text-main-foreground border-border rounded-base w-full justify-center text-center",
          cancelButton:
            "font-base border-2 text-[14px] h-9 px-4 bg-secondary-background text-foreground border-border rounded-base w-full justify-center text-center",
          error: "bg-black text-white",
          content: "w-full",
          title: "font-bold text-base w-full",
          loading:
            "[&[data-sonner-toast]_[data-icon]]:flex [&[data-sonner-toast]_[data-icon]]:size-4 [&[data-sonner-toast]_[data-icon]]:relative [&[data-sonner-toast]_[data-icon]]:justify-start [&[data-sonner-toast]_[data-icon]]:items-center [&[data-sonner-toast]_[data-icon]]:flex-shrink-0",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
