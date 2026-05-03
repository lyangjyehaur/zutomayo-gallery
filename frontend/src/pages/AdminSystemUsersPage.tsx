import React from "react"
import { Helmet } from "react-helmet-async"
import { useCreate, useCustomMutation, useInvalidate, useList, useUpdate } from "@refinedev/core"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MultiSelect, type Option } from "@/components/ui/multi-select"
import { DataTable } from "@/components/ui/data-table"
import { resolveUserAvatarUrl } from "@/lib/gravatar"

type UserRow = {
  id: string
  username: string
  email?: string | null
  display_name?: string | null
  avatar_url?: string | null
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
  const [newEmail, setNewEmail] = React.useState("")
  const [newDisplayName, setNewDisplayName] = React.useState("")
  const [newAvatarUrl, setNewAvatarUrl] = React.useState("")
  const [newActive, setNewActive] = React.useState(true)

  const [rolesDialogOpen, setRolesDialogOpen] = React.useState(false)
  const [rolesUser, setRolesUser] = React.useState<UserRow | null>(null)
  const [rolesValue, setRolesValue] = React.useState<string[]>([])

  const [pwDialogOpen, setPwDialogOpen] = React.useState(false)
  const [pwConfirmOpen, setPwConfirmOpen] = React.useState(false)
  const [pwUser, setPwUser] = React.useState<UserRow | null>(null)
  const [pwValue, setPwValue] = React.useState("")
  const [pwConfirmValue, setPwConfirmValue] = React.useState("")

  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false)
  const [profileUser, setProfileUser] = React.useState<UserRow | null>(null)
  const [profileEmail, setProfileEmail] = React.useState("")
  const [profileDisplayName, setProfileDisplayName] = React.useState("")
  const [profileAvatarUrl, setProfileAvatarUrl] = React.useState("")

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
      values: {
        username,
        password: newPassword,
        is_active: newActive,
        email: newEmail.trim() || null,
        display_name: newDisplayName.trim() || null,
        avatar_url: newAvatarUrl.trim() || null,
      },
      successNotification: { message: "已新增使用者", type: "success" },
      errorNotification: (err: any) => ({ message: "新增失敗", description: err?.message, type: "error" }),
    })
    setNewUsername("")
    setNewPassword("")
    setNewEmail("")
    setNewDisplayName("")
    setNewAvatarUrl("")
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

  const openResetPassword = React.useCallback((row: UserRow) => {
    setPwUser(row)
    setPwValue("")
    setPwConfirmValue("")
    setPwDialogOpen(true)
  }, [])

  const openProfile = React.useCallback((row: UserRow) => {
    setProfileUser(row)
    setProfileEmail(String(row.email || ""))
    setProfileDisplayName(String(row.display_name || ""))
    setProfileAvatarUrl(String(row.avatar_url || ""))
    setProfileDialogOpen(true)
  }, [])

  const saveProfile = React.useCallback(async () => {
    if (!profileUser) return
    await updateUser.mutateAsync({
      resource: "systemUsers",
      id: profileUser.id,
      values: {
        email: profileEmail.trim() || null,
        display_name: profileDisplayName.trim() || null,
        avatar_url: profileAvatarUrl.trim() || null,
      },
      successNotification: { message: "已更新使用者資料", type: "success" },
      errorNotification: (err: any) => ({ message: "更新失敗", description: err?.message, type: "error" }),
    })
    setProfileDialogOpen(false)
    setProfileUser(null)
    await invalidate({ resource: "systemUsers", invalidates: ["list"] })
  }, [invalidate, profileAvatarUrl, profileDisplayName, profileEmail, profileUser, updateUser])

  const submitResetPassword = React.useCallback(async () => {
    if (!pwUser) return
    const pwd = pwValue
    try {
      await toast.promise(
        custom.mutateAsync({
          url: `/api/admin/system/users/${encodeURIComponent(pwUser.id)}/reset-password`,
          method: "post",
          values: { new_password: pwd },
        }) as any,
        {
          loading: "更新中...",
          success: "已更新密碼",
          error: (err: any) => `更新失敗：${String(err?.message || err)}`,
        },
      )
      setPwConfirmOpen(false)
      setPwDialogOpen(false)
      setPwUser(null)
      setPwValue("")
      setPwConfirmValue("")
    } catch {
    }
  }, [custom, pwUser, pwValue])

  const openRoles = React.useCallback((row: UserRow) => {
    setRolesUser(row)
    setRolesValue(Array.isArray(row.roles) ? row.roles : [])
    setRolesDialogOpen(true)
  }, [])

  const columns = React.useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: "avatar",
        header: "Avatar",
        cell: ({ row }) => {
          const u = row.original
          const display = String(u.display_name || u.username || "")
          const initials = display.trim() ? display.trim().slice(0, 2).toUpperCase() : "AD"
          const url = resolveUserAvatarUrl({ email: u.email, avatar_url: u.avatar_url }, 80)
          return (
            <Avatar className="h-8 w-8">
              {url ? <AvatarImage src={url} alt={display} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          )
        },
      },
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
        accessorKey: "display_name",
        header: "Display",
        cell: ({ row }) => <div className="font-mono">{row.original.display_name || ""}</div>,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <div className="font-mono break-all">{row.original.email || ""}</div>,
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
            <Button size="sm" variant="outline" onClick={() => openProfile(row.original)}>
              Profile
            </Button>
            <Button size="sm" variant="outline" onClick={() => openRoles(row.original)}>
              Roles
            </Button>
            <Button size="sm" variant="outline" onClick={() => openResetPassword(row.original)}>
              Set PW
            </Button>
          </div>
        ),
      },
    ],
    [handleToggleActive, openProfile, openResetPassword, openRoles],
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
    <div className="p-6 flex flex-col gap-4">
      <Helmet>
        <title>系統使用者</title>
      </Helmet>
      <AdminPageHeader title="系統使用者" description="管理後台登入帳號、角色與基本資料。" />

      <AdminPanel className="flex flex-col gap-3 max-w-2xl">
        <div className="font-mono font-bold">新增使用者</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="username" />
          <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="password" type="password" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="display name" />
          <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email" />
        </div>
        <Input value={newAvatarUrl} onChange={(e) => setNewAvatarUrl(e.target.value)} placeholder="avatar url (optional)" />
        <div className="flex items-center gap-2">
          <Switch checked={newActive} onCheckedChange={setNewActive} />
          <div className="text-sm">啟用</div>
        </div>
        <Button onClick={() => void handleCreate()} disabled={createUser.isLoading || !newUsername.trim() || newPassword.length < 4}>
          建立
        </Button>
      </AdminPanel>

      <AdminPanel className="overflow-auto flex flex-col gap-3">
        <div className="font-mono font-bold">使用者列表</div>
        <DataTable
          columns={columns}
          data={users}
          filterColumnId="username"
          filterPlaceholder="Filter usernames..."
        />
      </AdminPanel>

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

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>使用者資料</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-mono break-all">{profileUser?.username}</div>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {resolveUserAvatarUrl({ email: profileEmail, avatar_url: profileAvatarUrl }, 80) ? (
                  <AvatarImage
                    src={resolveUserAvatarUrl({ email: profileEmail, avatar_url: profileAvatarUrl }, 80)}
                    alt={profileDisplayName || profileUser?.username || ""}
                  />
                ) : null}
                <AvatarFallback>
                  {(profileDisplayName || profileUser?.username || "AD").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-xs font-mono opacity-70">有 email 且未填 avatar url 時，會使用 gravatar</div>
            </div>
            <Input value={profileDisplayName} onChange={(e) => setProfileDisplayName(e.target.value)} placeholder="display name" />
            <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="email" />
            <Input value={profileAvatarUrl} onChange={(e) => setProfileAvatarUrl(e.target.value)} placeholder="avatar url (optional)" />
            <Button onClick={() => void saveProfile()} disabled={updateUser.isLoading}>
              儲存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pwDialogOpen}
        onOpenChange={(open) => {
          setPwDialogOpen(open)
          if (!open) setPwConfirmOpen(false)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>設定密碼</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-mono break-all">{pwUser?.username}</div>
            <Input
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              placeholder="new password"
              type="password"
            />
            <Input
              value={pwConfirmValue}
              onChange={(e) => setPwConfirmValue(e.target.value)}
              placeholder="confirm password"
              type="password"
            />
            <div className="text-xs font-mono opacity-70">密碼長度至少 4，且兩次輸入必須一致</div>
            <Button
              onClick={() => setPwConfirmOpen(true)}
              disabled={pwValue.length < 4 || pwValue !== pwConfirmValue || custom.isLoading}
            >
              下一步
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pwConfirmOpen} onOpenChange={setPwConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認更新密碼</AlertDialogTitle>
            <AlertDialogDescription>
              將更新使用者 {pwUser?.username} 的密碼。此操作會立即生效，確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitResetPassword()} disabled={custom.isLoading}>
              確認
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
