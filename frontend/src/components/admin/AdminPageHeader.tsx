import React from "react"

import { cn } from "@/lib/utils"

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-2 border-black bg-[var(--admin-header-bg)] shadow-[var(--admin-shadow)] rounded-[var(--admin-radius)] p-5",
        className,
      )}
    >
      <div className="flex flex-col md:flex-row gap-3 md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-black uppercase tracking-[0.12em]">{title}</div>
          {description ? <div className="text-xs font-mono opacity-60">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 justify-end">{actions}</div> : null}
      </div>
    </div>
  )
}
