import React from "react"

import { cn } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { Input } from "@/components/ui/input"

export type AdminSplitGroup<T> = {
  key: string
  items: T[]
}

export function AdminSplitView<T>({
  title,
  description,
  actions,
  leftSearchValue,
  onLeftSearchValueChange,
  leftSearchPlaceholder = "搜尋...",
  leftHeader,
  groups,
  getKey,
  renderItemTitle,
  renderItemSubtitle,
  renderItemEnd,
  selectedKey,
  onSelect,
  leftEmpty,
  right,
  rightEmpty,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  leftSearchValue: string
  onLeftSearchValueChange: (value: string) => void
  leftSearchPlaceholder?: string
  leftHeader?: React.ReactNode
  groups: Array<AdminSplitGroup<T>>
  getKey: (item: T) => string
  renderItemTitle: (item: T) => React.ReactNode
  renderItemSubtitle?: (item: T) => React.ReactNode
  renderItemEnd?: (item: T) => React.ReactNode
  selectedKey: string | null | undefined
  onSelect: (key: string) => void
  leftEmpty?: React.ReactNode
  right: React.ReactNode
  rightEmpty?: React.ReactNode
  className?: string
}) {
  const hasItems = groups.some((g) => g.items.length > 0)

  return (
    <div className={cn("p-6 flex flex-col gap-4", className)}>
      <AdminPageHeader title={title} description={description} actions={actions} />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <AdminPanel className="p-0 overflow-hidden">
          <div className="p-4 border-b-2 border-black bg-[var(--admin-panel-bg)] flex flex-col gap-2">
            {leftHeader ? <div>{leftHeader}</div> : null}
            <Input
              value={leftSearchValue}
              onChange={(e) => onLeftSearchValueChange(e.target.value)}
              placeholder={leftSearchPlaceholder}
              className="border-2 border-black font-bold h-9"
            />
          </div>

          <div className="max-h-[calc(100dvh-220px)] overflow-auto">
            {!hasItems ? (
              leftEmpty ? (
                leftEmpty
              ) : (
                <div className="p-3 text-xs font-mono opacity-60">無資料</div>
              )
            ) : (
              groups.map((g) => (
                <div key={g.key}>
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest opacity-60 border-b-2 border-black/10 bg-card/40">
                    {g.key} <span className="opacity-40">({g.items.length})</span>
                  </div>
                  {g.items.map((item) => {
                    const k = String(getKey(item))
                    const active = k === String(selectedKey || "")
                    return (
                      <button
                        key={k}
                        onClick={() => onSelect(k)}
                        className={cn(
                          "w-full text-left px-4 py-3 border-b-2 border-black/10 font-bold transition-all hover:bg-main/10",
                          active ? "bg-main text-black shadow-[inset_4px_0_0_0_#000]" : "",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{renderItemTitle(item)}</div>
                            {renderItemSubtitle ? <div className="text-[10px] font-mono opacity-60 truncate">{renderItemSubtitle(item)}</div> : null}
                          </div>
                          {renderItemEnd ? <div onClick={(e) => e.stopPropagation()}>{renderItemEnd(item)}</div> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </AdminPanel>

        <AdminPanel className="flex flex-col gap-4">
          {rightEmpty ? (
            selectedKey ? (
              right
            ) : (
              rightEmpty
            )
          ) : (
            right
          )}
        </AdminPanel>
      </div>
    </div>
  )
}
