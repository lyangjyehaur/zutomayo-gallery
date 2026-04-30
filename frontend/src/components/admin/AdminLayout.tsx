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
    return isAuthed ? ["*"] : []
  }, [isAuthed, me?.permissions])

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
      try {
        localStorage.removeItem("ztmy_admin_pwd")
      } catch {
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

  if (isInitializing) {
    return <div className="p-6 font-mono">Loading...</div>
  }

  if (!isAuthed) {
    const to = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/admin/auth?to=${to}`} replace />
  }

  const activeMenu = menus.find((m) => String(m.path || "") === location.pathname)
  const activeLabel = activeMenu?.label || location.pathname

  return (
    <SidebarProvider>
        <AppSidebar
          menus={menus}
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
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/admin">Admin</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>Navigate</MenubarTrigger>
              <MenubarContent>
                {menus.slice(0, 12).map((m, idx) => {
                  const path = String(m.path || "")
                  if (!path) return null
                  return (
                    <MenubarItem key={`${path}-${idx}`} asChild>
                      <Link to={path}>{m.label || path}</Link>
                    </MenubarItem>
                  )
                })}
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
            <Outlet />
          </Refine>
          <ConfirmDialog />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
