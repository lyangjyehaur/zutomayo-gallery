import React from "react"
import { Helmet } from "react-helmet-async"
import { useCreate, useCustomMutation, useDelete, useInvalidate, useList } from "@refinedev/core"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MultiSelect, type Option } from "@/components/ui/multi-select"
import { useConfirmDialog } from "@/components/admin/useConfirmDialog"
import { DataTable } from "@/components/ui/data-table"
import { getSystemApiBase } from "@/lib/admin-api"

type RoleRow = {
  code: string
  name: string | null
  description: string | null
  permissions: string[]
}

export function AdminSystemRolesPage() {
  const invalidate = useInvalidate()
  const rolesQuery = useList<RoleRow>({ resource: "systemRoles", hasPagination: false })
  const permissionsQuery = useList<string>({ resource: "systemPermissions", hasPagination: false })
  const createRole = useCreate()
  const del = useDelete()
  const custom = useCustomMutation()
  const [confirm, ConfirmDialog] = useConfirmDialog()

  const [newCode, setNewCode] = React.useState("role:")
  const [newName, setNewName] = React.useState("")

  const [permDialogOpen, setPermDialogOpen] = React.useState(false)
  const [permRole, setPermRole] = React.useState<RoleRow | null>(null)
  const [permValue, setPermValue] = React.useState<string[]>([])

  const permissionOptions: Option[] = React.useMemo(() => {
    const list = permissionsQuery.data?.data || []
    return list.map((p) => ({ label: String(p), value: String(p) })).sort((a, b) => a.label.localeCompare(b.label))
  }, [permissionsQuery.data])

  const roles = rolesQuery.data?.data || []

  const handleCreate = async () => {
    const code = newCode.trim()
    if (!code.startsWith("role:") || code.length < 6) return
    await createRole.mutateAsync({
      resource: "systemRoles",
      values: { code, name: newName.trim() || null },
      successNotification: { message: "已新增角色", type: "success" },
      errorNotification: (err: any) => ({ message: "新增失敗", description: err?.message, type: "error" }),
    })
    setNewCode("role:")
    setNewName("")
    await invalidate({ resource: "systemRoles", invalidates: ["list"] })
  }

  const openPerms = React.useCallback((role: RoleRow) => {
    setPermRole(role)
    setPermValue(Array.isArray(role.permissions) ? role.permissions : [])
    setPermDialogOpen(true)
  }, [])

  const savePerms = async () => {
    if (!permRole) return
    await custom.mutateAsync({
      url: `${getSystemApiBase()}/admin/system/roles/${encodeURIComponent(permRole.code)}/permissions`,
      method: "put",
      values: { permissions: permValue },
      successNotification: { message: "已更新權限", type: "success" },
      errorNotification: (err: any) => ({ message: "更新失敗", description: err?.message, type: "error" }),
    })
    setPermDialogOpen(false)
    setPermRole(null)
    await invalidate({ resource: "systemRoles", invalidates: ["list"] })
  }

  const handleDelete = React.useCallback(async (role: RoleRow) => {
    const ok = await confirm({
      title: "刪除角色",
      description: `確定要刪除 ${role.code}？`,
      confirmText: "刪除",
      cancelText: "取消",
    })
    if (!ok) return
    await del.mutateAsync({
      resource: "systemRoles",
      id: role.code,
      successNotification: { message: "已刪除角色", type: "success" },
      errorNotification: (err: any) => ({ message: "刪除失敗", description: err?.message, type: "error" }),
    })
    await invalidate({ resource: "systemRoles", invalidates: ["list"] })
  }, [confirm, del, invalidate])

  const columns = React.useMemo<ColumnDef<RoleRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <Button
            variant="noShadow"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Code
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => <div className="font-mono">{row.original.code}</div>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="noShadow"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => row.original.name || "",
      },
      {
        id: "permissions",
        header: "Permissions",
        cell: ({ row }) => (
          <div className="font-mono break-all">
            {Array.isArray(row.original.permissions) ? row.original.permissions.join(", ") : ""}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openPerms(row.original)}>
              Permissions
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void handleDelete(row.original)}
              disabled={row.original.code === "role:super_admin"}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [handleDelete, openPerms],
  )

  return (
    <div className="p-6">
      <Helmet>
        <title>Admin Roles</title>
      </Helmet>
      <div className="text-xl font-semibold">Admin Roles</div>

      <div className="mt-6 border-4 border-black bg-card shadow-neo p-4 flex flex-col gap-3 max-w-2xl">
        <div className="font-mono font-bold">新增角色</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="role:xxx" />
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="name (optional)" />
        </div>
        <Button onClick={() => void handleCreate()} disabled={createRole.isLoading || !newCode.trim().startsWith("role:")}>
          建立
        </Button>
      </div>

      <div className="mt-6 border-4 border-black bg-card shadow-neo p-4 overflow-auto">
        <div className="font-mono font-bold mb-3">角色列表</div>
        <DataTable
          columns={columns}
          data={roles}
          filterColumnId="code"
          filterPlaceholder="Filter role codes..."
        />
      </div>

      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>設定權限</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-mono">{permRole?.code}</div>
            <MultiSelect
              options={permissionOptions}
              value={permValue}
              onValueChange={setPermValue}
              placeholder="選擇權限"
            />
            <Button onClick={() => void savePerms()} disabled={custom.isLoading}>
              儲存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
