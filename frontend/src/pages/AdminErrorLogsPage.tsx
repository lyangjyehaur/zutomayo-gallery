import React from "react"
import { toast } from "sonner"
import { formatApiError } from "@/lib/api-error"
import { adminFetch, getApiRoot } from "@/lib/admin-api"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ErrorLogRow = {
  id: string
  source: string
  message: string
  stack?: string | null
  status_code?: number | null
  error_code?: string | null
  method?: string | null
  url?: string | null
  request_id?: string | null
  ip?: string | null
  details?: unknown
  resolved: boolean
  resolved_by?: string | null
  resolved_at?: string | null
  created_at: string
}

const sourceLabels: Record<string, string> = {
  request: "請求錯誤",
  uncaught: "未捕獲異常",
  unhandled_rejection: "未處理 Promise",
  cron: "定時任務",
  queue: "佇列任務",
}

const sourceColors: Record<string, string> = {
  request: "bg-blue-100 text-blue-800 border-blue-300",
  uncaught: "bg-red-100 text-red-800 border-red-300",
  unhandled_rejection: "bg-orange-100 text-orange-800 border-orange-300",
  cron: "bg-purple-100 text-purple-800 border-purple-300",
  queue: "bg-yellow-100 text-yellow-800 border-yellow-300",
}

export function AdminErrorLogsPage() {
  const base = React.useMemo(() => `${getApiRoot()}/system`, [])
  const [rows, setRows] = React.useState<ErrorLogRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(50)
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const [filterSource, setFilterSource] = React.useState<string>("all")
  const [filterSeverity, setFilterSeverity] = React.useState<string>("server")
  const [filterResolved, setFilterResolved] = React.useState<string>("all")
  const [filterSearch, setFilterSearch] = React.useState("")
  const [searchInput, setSearchInput] = React.useState("")

  const [detailRow, setDetailRow] = React.useState<ErrorLogRow | null>(null)

  const fetchList = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (filterSource !== "all") params.set("source", filterSource)
      if (filterSeverity !== "all") params.set("severity", filterSeverity)
      if (filterResolved !== "all") params.set("resolved", filterResolved)
      if (filterSearch.trim()) params.set("search", filterSearch.trim())

      const res = await adminFetch(`${base}/errors?${params}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "LOAD_FAILED"))
      setRows(json.data.rows || [])
      setTotal(json.data.total || 0)
    } catch (e: any) {
      setRows([])
      toast.error(formatApiError(e, "載入錯誤日誌失敗"))
    } finally {
      setIsLoading(false)
    }
  }, [base, page, limit, filterSource, filterSeverity, filterResolved, filterSearch])

  React.useEffect(() => {
    void fetchList()
  }, [fetchList])

  const totalPages = Math.ceil(total / limit)

  const handleSearch = () => {
    setPage(1)
    setFilterSearch(searchInput)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)))
    }
  }

  const resolveOne = async (id: string) => {
    try {
      const res = await adminFetch(`${base}/errors/${id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "RESOLVE_FAILED"))
      toast.success("已標記解決")
      await fetchList()
    } catch (e: any) {
      toast.error(formatApiError(e, "標記解決失敗"))
    }
  }

  const batchResolve = async () => {
    if (selectedIds.size === 0) return
    try {
      const res = await adminFetch(`${base}/errors/batch-resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "BATCH_RESOLVE_FAILED"))
      toast.success(`已標記 ${json.data.updated} 筆解決`)
      setSelectedIds(new Set())
      await fetchList()
    } catch (e: any) {
      toast.error(formatApiError(e, "批次標記失敗"))
    }
  }

  const unresolveOne = async (id: string) => {
    try {
      const res = await adminFetch(`${base}/errors/${id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: false }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(String(json?.error || "UNRESOLVE_FAILED"))
      toast.success("已取消解決標記")
      await fetchList()
    } catch (e: any) {
      toast.error(formatApiError(e, "取消標記失敗"))
    }
  }

  const copyErrorInfo = (row: ErrorLogRow) => {
    const parts = [
      `=== 後端錯誤日誌 ===`,
      `ID: ${row.id}`,
      `時間: ${row.created_at}`,
      `來源: ${sourceLabels[row.source] || row.source}`,
      `訊息: ${row.message}`,
    ]
    if (row.status_code) parts.push(`HTTP: ${row.status_code}`)
    if (row.error_code) parts.push(`代碼: ${row.error_code}`)
    if (row.method) parts.push(`方法: ${row.method}`)
    if (row.url) parts.push(`URL: ${row.url}`)
    if (row.request_id) parts.push(`RequestID: ${row.request_id}`)
    if (row.ip) parts.push(`IP: ${row.ip}`)
    if (row.stack) parts.push(`\n堆疊:\n${row.stack}`)
    if (row.details) parts.push(`\n詳情:\n${JSON.stringify(row.details, null, 2)}`)

    navigator.clipboard.writeText(parts.join("\n")).then(() => {
      toast.success("已複製錯誤詳情")
    }).catch(() => {
      toast.error("複製失敗")
    })
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <AdminPageHeader title="後端錯誤日誌" description="查看後端運行時產生的所有異常記錄" />

      <AdminPanel className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono opacity-60">來源</span>
            <Select value={filterSource} onValueChange={(v) => { setFilterSource(v); setPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="request">請求錯誤</SelectItem>
                <SelectItem value="uncaught">未捕獲異常</SelectItem>
                <SelectItem value="unhandled_rejection">未處理 Promise</SelectItem>
                <SelectItem value="cron">定時任務</SelectItem>
                <SelectItem value="queue">佇列任務</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono opacity-60">嚴重程度</span>
            <Select value={filterSeverity} onValueChange={(v) => { setFilterSeverity(v); setPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="server">服務端錯誤 (5xx+)</SelectItem>
                <SelectItem value="client">客戶端錯誤 (4xx)</SelectItem>
                <SelectItem value="all">全部</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono opacity-60">狀態</span>
            <Select value={filterResolved} onValueChange={(v) => { setFilterResolved(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="false">未解決</SelectItem>
                <SelectItem value="true">已解決</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-xs font-mono opacity-60">搜尋</span>
            <div className="flex gap-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="搜尋訊息、堆疊、URL..."
              />
              <Button onClick={handleSearch}>搜尋</Button>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 border-2 border-black bg-card p-2">
            <span className="text-xs font-mono">已選 {selectedIds.size} 筆</span>
            <Button size="sm" onClick={() => void batchResolve()}>
              批次標記解決
            </Button>
            <Button size="sm" variant="neutral" onClick={() => setSelectedIds(new Set())}>
              取消選取
            </Button>
          </div>
        )}

        <div className="text-xs font-mono opacity-60">
          共 {total} 筆，第 {page}/{totalPages || 1} 頁
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[160px]">時間</TableHead>
                <TableHead className="w-[100px]">來源</TableHead>
                <TableHead className="w-[70px]">HTTP</TableHead>
                <TableHead>訊息</TableHead>
                <TableHead className="w-[100px]">方法/URL</TableHead>
                <TableHead className="w-[80px]">狀態</TableHead>
                <TableHead className="w-[160px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 font-mono opacity-60">
                    載入中...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 font-mono opacity-60">
                    暫無錯誤記錄 🎉
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className={row.resolved ? "opacity-50" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-mono whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${sourceColors[row.source] || "bg-gray-100 text-gray-800"}`}>
                        {sourceLabels[row.source] || row.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {row.status_code || "-"}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs" title={row.message}>
                      {row.message}
                    </TableCell>
                    <TableCell className="text-xs font-mono whitespace-nowrap">
                      {row.method || ""}{row.url ? ` ${row.url.slice(0, 30)}` : ""}
                    </TableCell>
                    <TableCell>
                      {row.resolved ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">已解決</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">未解決</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="neutral" onClick={() => setDetailRow(row)}>
                          詳情
                        </Button>
                        {row.resolved ? (
                          <Button size="sm" variant="neutral" onClick={() => void unresolveOne(row.id)}>
                            取消
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => void resolveOne(row.id)}>
                            解決
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              size="sm"
              variant="neutral"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一頁
            </Button>
            <span className="text-xs font-mono">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="neutral"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一頁
            </Button>
          </div>
        )}
      </AdminPanel>

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              錯誤詳情
              {detailRow && (
                <Badge className={`text-[10px] ${sourceColors[detailRow.source] || ""}`}>
                  {sourceLabels[detailRow.source] || detailRow.source}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailRow && (
            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs font-mono opacity-60">ID</span>
                  <div className="font-mono text-xs break-all">{detailRow.id}</div>
                </div>
                <div>
                  <span className="text-xs font-mono opacity-60">時間</span>
                  <div className="font-mono text-xs">{new Date(detailRow.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-xs font-mono opacity-60">HTTP 狀態碼</span>
                  <div className="font-mono text-xs">{detailRow.status_code || "-"}</div>
                </div>
                <div>
                  <span className="text-xs font-mono opacity-60">錯誤代碼</span>
                  <div className="font-mono text-xs">{detailRow.error_code || "-"}</div>
                </div>
                <div>
                  <span className="text-xs font-mono opacity-60">方法</span>
                  <div className="font-mono text-xs">{detailRow.method || "-"}</div>
                </div>
                <div>
                  <span className="text-xs font-mono opacity-60">Request ID</span>
                  <div className="font-mono text-xs break-all">{detailRow.request_id || "-"}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-mono opacity-60">URL</span>
                  <div className="font-mono text-xs break-all">{detailRow.url || "-"}</div>
                </div>
                <div>
                  <span className="text-xs font-mono opacity-60">IP</span>
                  <div className="font-mono text-xs">{detailRow.ip || "-"}</div>
                </div>
                <div>
                  <span className="text-xs font-mono opacity-60">解決狀態</span>
                  <div className="text-xs">
                    {detailRow.resolved
                      ? `已解決 by ${detailRow.resolved_by || "?"} at ${detailRow.resolved_at ? new Date(detailRow.resolved_at).toLocaleString() : "?"}`
                      : "未解決"}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono opacity-60">錯誤訊息</span>
                <div className="bg-red-50 border-2 border-red-200 p-2 rounded text-xs font-mono whitespace-pre-wrap break-all">
                  {detailRow.message}
                </div>
              </div>

              {detailRow.stack && (
                <div>
                  <span className="text-xs font-mono opacity-60">堆疊追蹤</span>
                  <pre className="bg-gray-50 border-2 border-gray-200 p-2 rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto">
                    {detailRow.stack}
                  </pre>
                </div>
              )}

              {detailRow.details && (
                <div>
                  <span className="text-xs font-mono opacity-60">額外詳情</span>
                  <pre className="bg-gray-50 border-2 border-gray-200 p-2 rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
                    {JSON.stringify(detailRow.details, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={() => copyErrorInfo(detailRow)}>
                  複製完整資訊
                </Button>
                {detailRow.resolved ? (
                  <Button variant="neutral" onClick={() => { void unresolveOne(detailRow.id); setDetailRow(null) }}>
                    取消解決
                  </Button>
                ) : (
                  <Button onClick={() => { void resolveOne(detailRow.id); setDetailRow(null) }}>
                    標記解決
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
