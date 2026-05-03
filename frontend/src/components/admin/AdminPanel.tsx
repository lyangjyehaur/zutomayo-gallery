import React from "react"

import { cn } from "@/lib/utils"

export function AdminPanel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-2 border-black bg-[var(--admin-panel-bg)] shadow-[var(--admin-shadow)] rounded-[var(--admin-radius)] p-5",
        className,
      )}
    >
      {children}
    </div>
  )
}
