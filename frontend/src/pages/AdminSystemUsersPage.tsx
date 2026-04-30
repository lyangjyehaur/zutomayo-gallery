import React from "react"
import { Helmet } from "react-helmet-async"
import { useCreate, useCustomMutation, useInvalidate, useList, useUpdate } from "@refinedev/core"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MultiSelect, type Option } from "@/components/ui/multi-select"
import { DataTable } from "@/components/ui/data-table"

type UserRow = {
  id: string
  username: string
  is_active: boolean
  roles: string[]
}

type RoleRow = { code: string }

export function AdminSystemUsersPage() {
  const invalidate = useInvalidate()
  const usersQuery = useList<UserRow>({ resource: "systemUsers", hasPagination: false })
  const rolesQuery = useList<RoleRow>({ resource: "systemRoles", hasPagination: false })
  const createUser = useCreate()
  const updateUser = useUpdate()
  const custom = useCustomMutation()

  const [newUsername, setNewUsername] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [newActive, setNewActive] = React.useState(true)

  const [rolesDialogOpen, setRolesDialogOpen] = React.useState(false)
  const [rolesUser, setRolesUser] = React.useState<UserRow | null>(null)
  const [rolesValue, setRolesValue] = React.useState<string[]>([])

  const roleOptions: Option[] = React.useMemo(() => {
    const rows = rolesQuery.data?.data || []
    return rows
      .map((r) => ({ label: r.code, value: r.code }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rolesQuery.data])

  const users = usersQuery.data?.data || []

  const handleCreate = async () => {
    const username = newUsername.trim()
    if (!username || newPassword.length < 4) return
    await createUser.mutateAsync({
      resource: "systemUsers",
      values: { username, password: newPassword, is_active: newActive },
      successNotification: { message: "已新增使用者", type: "success" },
      errorNotification: (err: any) => ({ message: "新增失敗", description: err?.message, type: "error" }),
    })
    setNewUsername("")
    setNewPassword("")
    setNewActive(true)
    await invalidate({ resource: "systemUsers", invalidates: ["list"] })
  }

  const handleToggleActive = React.useCallback(async (row: UserRow, next: boolean) => {
    await updateUser.mutateAsync({
      resource: "systemUsers",
      id: row.id,
      values: { is_active: next },
      successNotification: { message: "已更新狀態", type: "success" },
      errorNotification: (err: any) => ({ message: "更新失敗", description: err?.message, type: "error" }),
    })
    await invalidate({ resource: "systemUsers", invalidates: ["list"] })
  }, [invalidate, updateUser])

  const handleResetPassword = React.useCallback(async (row: UserRow) => {
    const res = await custom.mutateAsync({
      url: `/api/admin/system/users/${encodeURIComponent(row.id)}/reset-password`,
      method: "post",
      values: {},
      successNotification: { message: "已重設密碼", type: "success" },
      errorNotification: (err: any) => ({ message: "重設失敗", description: err?.message, type: "error" }),
    })
    const pwd = (res.data as any)?.password
    if (pwd) toast.message(`新密碼：${pwd}`)
  }, [custom])

  const openRoles = React.useCallback((row: UserRow) => {
    setRolesUser(row)
    setRolesValue(Array.isArray(row.roles) ? row.roles : [])
    setRolesDialogOpen(true)
  }, [])

  const columns = React.useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: "username",
        header: ({ column }) => (
          <Button
            variant="noShadow"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Username
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => <div className="font-mono">{row.original.username}</div>,
      },
      {
        id: "active",
        header: "Active",
        cell: ({ row }) => (
          <Switch
            checked={!!row.original.is_active}
            onCheckedChange={(v) => void handleToggleActive(row.original, v)}
          />
        ),
      },
      {
        id: "roles",
        header: "Roles",
        cell: ({ row }) => (
          <div className="font-mono break-all">
            {Array.isArray(row.original.roles) ? row.original.roles.join(", ") : ""}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openRoles(row.original)}>
              Roles
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleResetPassword(row.original)}>
              Reset PW
            </Button>
          </div>
        ),
      },
    ],
    [handleResetPassword, handleToggleActive, openRoles],
  )

  const saveRoles = async () => {
    if (!rolesUser) return
    await custom.mutateAsync({
      url: `/api/admin/system/users/${encodeURIComponent(rolesUser.id)}/roles`,
      method: "put",
      values: { roles: rolesValue },
      successNotification: { message: "已更新角色", type: "success" },
      errorNotification: (err: any) => ({ message: "更新失敗", description: err?.message, type: "error" }),
    })
    setRolesDialogOpen(false)
    setRolesUser(null)
    await invalidate({ resource: "systemUsers", invalidates: ["list"] })
  }

  return (
    <div className="p-6">
      <Helmet>
        <title>Admin Users</title>
      </Helmet>
      <div className="text-xl font-semibold">Admin Users</div>

      <div className="mt-6 border-4 border-black bg-card shadow-neo p-4 flex flex-col gap-3 max-w-2xl">
        <div className="font-mono font-bold">新增使用者</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="username" />
          <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="password" type="password" />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={newActive} onCheckedChange={setNewActive} />
          <div className="text-sm">啟用</div>
        </div>
        <Button onClick={() => void handleCreate()} disabled={createUser.isLoading || !newUsername.trim() || newPassword.length < 4}>
          建立
        </Button>
      </div>

      <div className="mt-6 border-4 border-black bg-card shadow-neo p-4 overflow-auto">
        <div className="font-mono font-bold mb-3">使用者列表</div>
        <DataTable
          columns={columns}
          data={users}
          filterColumnId="username"
          filterPlaceholder="Filter usernames..."
        />
      </div>

      <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>設定角色</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-mono break-all">{rolesUser?.username}</div>
            <MultiSelect
              options={roleOptions}
              value={rolesValue}
              onValueChange={setRolesValue}
              placeholder="選擇角色"
            />
            <Button onClick={() => void saveRoles()} disabled={custom.isLoading}>
              儲存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
