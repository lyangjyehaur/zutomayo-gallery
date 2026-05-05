import React from "react"
import { Link, Navigate, Outlet, useLocation } from "react-router-dom"
import { Refine } from "@refinedev/core"
import { toast } from "sonner"
import { adminFetch, getAuthApiBase, getMvsApiBase } from "@/lib/admin-api"
import {
  adminAccessControlProvider,
  adminAuthProvider,
  adminDataProvider,
  adminNotificationProvider,
  adminResources,
} from "@/lib/refine"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/admin/AppSidebar"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar"
import { useConfirmDialog } from "@/components/admin/useConfirmDialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions"

type MePayload = {
  username?: string
  email?: string | null
  display_name?: string | null
  avatar_url?: string | null
  roles?: string[]
  permissions?: string[]
  menus?: Array<{ label?: string; path?: string; sort?: number }>
}

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string; message?: string }

const fetchMe = async (): Promise<MePayload | null> => {
  const res = await adminFetch(`${getAuthApiBase()}/me`)
  const json = (await res.json().catch(() => null)) as ApiResponse<MePayload> | null
  if (!res.ok || !json?.success) return null
  return json.data
}

export default function AdminLayout() {
  const location = useLocation()
  const [confirm, ConfirmDialog] = useConfirmDialog()
  const [isInitializing, setIsInitializing] = React.useState(true)
  const [isAuthed, setIsAuthed] = React.useState(false)
  const [me, setMe] = React.useState<MePayload | null>(null)
  const [logoutError, setLogoutError] = React.useState<string | null>(null)

  const permissions = React.useMemo(() => {
    if (me?.permissions && Array.isArray(me.permissions)) return me.permissions
    return []
  }, [me?.permissions])

  const canAccessPermission = React.useCallback((permission: string) => {
    return permissions.includes("*") || permissions.includes(permission)
  }, [permissions])

  const refresh = React.useCallback(async () => {
    const next = await fetchMe()
    if (next) {
      setMe(next)
      setIsAuthed(true)
      return
    }
    setMe(null)
    setIsAuthed(false)
  }, [])

  React.useEffect(() => {
    const run = async () => {
      try {
        await refresh()
      } finally {
        setIsInitializing(false)
      }
    }
    run()
  }, [refresh])

  const handleLogout = React.useCallback(async () => {
    const ok = await confirm({
      title: "登出後台",
      description: "確定要登出嗎？",
      confirmText: "登出",
      cancelText: "取消",
    })
    if (!ok) return

    try {
      setLogoutError(null)
      const res = await adminFetch(`${getAuthApiBase()}/logout`, { method: "POST" })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(String(json?.error || json?.message || "LOGOUT_FAILED"))
      }
      toast.success("已登出")
    } catch (e: any) {
      setLogoutError(`登出失敗：${String(e?.message || e)}`)
      return
    }
    setMe(null)
    setIsAuthed(false)
  }, [confirm])

  const menus = React.useMemo(() => {
    const list = Array.isArray(me?.menus) ? me!.menus : []
    return [...list].sort((a, b) => (Number(a.sort || 0) || 0) - (Number(b.sort || 0) || 0))
  }, [me])

  const mvListPath = React.useMemo(() => {
    const prefer = menus.find((m) => String(m.path || "") === "/admin/mvs")
    if (prefer?.path) return String(prefer.path)
    const root = menus.find((m) => String(m.path || "") === "/admin")
    return root?.path ? String(root.path) : "/admin/mvs"
  }, [menus])

  const mvLabel = React.useMemo(() => {
    const list = menus.filter((m) => {
      const path = String(m.path || "")
      return path === "/admin" || path === "/admin/mvs"
    })
    return list.find((m) => String(m.path || "") === mvListPath)?.label || "MV 管理"
  }, [menus, mvListPath])

  const staticLabelByPath = React.useMemo(() => {
    return new Map<string, string>([
      ["/admin/account", "帳戶設定"],
      ["/admin/mvs/settings", "全局設定"],
      ["/admin/system/announcements", "公告管理"],
      ["/admin/submissions", "投稿審核"],
      ["/admin/system/group-repair", "推文修復"],
      ["/admin/system/media-groups", "推文分組"],
      ["/admin/system/orphans", "未歸屬媒體"],
    ])
  }, [])

  const labelForPath = React.useCallback(
    (path: string) => {
      const exact = menus.find((m) => String(m.path || "") === path)
      if (exact?.label) return String(exact.label)
      const staticLabel = staticLabelByPath.get(path)
      if (staticLabel) return staticLabel
      const seg = path.split("/").filter(Boolean).slice(-1)[0] || path
      return seg
    },
    [menus, staticLabelByPath],
  )

  const systemRootPath = React.useMemo(() => {
    const prefer = menus.find((m) => String(m.path || "") === "/admin/system/users")?.path
    if (prefer) return String(prefer)
    const first = menus.find((m) => String(m.path || "").startsWith("/admin/system/"))?.path
    return first ? String(first) : "/admin/system/media-groups"
  }, [menus])

  const navigateItems = React.useMemo(() => {
    const hasSystemAccess = [
      ADMIN_PERMISSIONS.SYSTEM_USERS,
      ADMIN_PERMISSIONS.SYSTEM_ROLES,
      ADMIN_PERMISSIONS.SYSTEM_MENUS,
      ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS,
      ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS,
      ADMIN_PERMISSIONS.SYSTEM_MEDIA_ORPHANS,
    ].some((permission) => canAccessPermission(permission))
    return [
      { label: mvLabel, path: mvListPath, permission: ADMIN_PERMISSIONS.MVS },
      { label: "系統管理", path: systemRootPath, permission: null, visible: hasSystemAccess },
      { label: "全局設定", path: "/admin/mvs/settings", permission: ADMIN_PERMISSIONS.MVS },
      { label: "公告管理", path: "/admin/system/announcements", permission: ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS },
      { label: "推文修復", path: "/admin/system/group-repair", permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS },
      { label: "推文分組", path: "/admin/system/media-groups", permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS },
      { label: "未歸屬媒體", path: "/admin/system/orphans", permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_ORPHANS },
    ].filter((item) => {
      if ("visible" in item) return item.visible
      return canAccessPermission(item.permission)
    })
  }, [canAccessPermission, mvLabel, mvListPath, systemRootPath])

  const breadcrumb = React.useMemo(() => {
    const path = location.pathname
    const items: Array<{ label: string; to?: string }> = [{ label: "Admin", to: "/admin" }]

    if (path === "/admin") return items

    if (path === "/admin/mvs/settings") {
      items.push({ label: mvLabel, to: mvListPath })
      items.push({ label: "全局設定" })
      return items
    }

    if (path.startsWith("/admin/system/")) {
      items.push({ label: "系統管理", to: systemRootPath })
      items.push({ label: labelForPath(path) })
      return items
    }

    items.push({ label: labelForPath(path) })
    return items
  }, [labelForPath, location.pathname, mvLabel, mvListPath, systemRootPath])

  if (isInitializing) {
    return <div className="p-6 font-mono">Loading...</div>
  }

  if (!isAuthed) {
    const to = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/admin/auth?to=${to}`} replace />
  }

  return (
    <SidebarProvider>
        <AppSidebar
          menus={menus}
          permissions={permissions}
          username={me?.username || "legacy"}
          email={me?.email}
          displayName={me?.display_name}
          avatarUrl={me?.avatar_url}
          onLogout={() => void handleLogout()}
        />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b-2 border-border bg-background px-4">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumb.map((b, idx) => {
                  const isLast = idx === breadcrumb.length - 1
                  return (
                    <React.Fragment key={`${b.label}-${idx}`}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{b.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={b.to || "/admin"}>{b.label}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {isLast ? null : <BreadcrumbSeparator />}
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>Navigate</MenubarTrigger>
              <MenubarContent>
                {navigateItems.map((item, idx) => (
                  <React.Fragment key={item.path}>
                    {idx === 1 ? <MenubarSeparator /> : null}
                    <MenubarItem asChild>
                      <Link to={item.path}>{item.label}</Link>
                    </MenubarItem>
                  </React.Fragment>
                ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </header>
        <div className="flex-1 min-w-0">
          {logoutError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTitle>操作失敗</AlertTitle>
                <AlertDescription>{logoutError}</AlertDescription>
              </Alert>
            </div>
          ) : null}
          <Refine
            dataProvider={adminDataProvider}
            authProvider={adminAuthProvider}
            accessControlProvider={adminAccessControlProvider(permissions)}
            notificationProvider={adminNotificationProvider}
            resources={adminResources}
          >
            <Outlet context={{ menus }} />
          </Refine>
          <ConfirmDialog />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
