import React from "react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { shouldShowSecondaryLang } from "@/i18n"

type HeaderTone = "admin" | "public"

type AuthCardProps = {
  title: string
  code: string
  iconClassName?: string
  headerTone?: HeaderTone
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  maxWidthClassName?: string
  bodyClassName?: string
}

export function AuthCard({
  title,
  code,
  iconClassName = "hn hn-exclamation-triangle",
  headerTone = "public",
  children,
  footer,
  className,
  maxWidthClassName,
  bodyClassName,
}: AuthCardProps) {
  const headerBg = headerTone === "admin" ? "bg-black text-white" : "bg-black text-white"
  const { i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-foreground crt-lines p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-5 crt-lines-global" />
      <div
        className={cn(
          "w-full max-w-sm bg-card border-4 border-black shadow-neo flex flex-col z-10 relative",
          maxWidthClassName,
          className,
        )}
      >
        <div className={cn("h-10 flex items-center justify-between px-4 border-b-4 border-black", headerBg)}>
          <span className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
            <i className={cn(iconClassName, "text-base")} />
            <span className="flex flex-col leading-tight">
              <span className="tracking-normal opacity-90">{title}</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-60 normal-case">{code}</span>
              )}
            </span>
          </span>
          <div className="flex gap-2">
            <div className="size-3 rounded-full bg-main" />
            <div className="size-3 rounded-full bg-ztmy-green" />
            <div className="size-3 rounded-full bg-red-500" />
          </div>
        </div>
        <div className={cn("p-8", bodyClassName)}>{children}</div>
        {footer ? footer : null}
      </div>
    </div>
  )
}
