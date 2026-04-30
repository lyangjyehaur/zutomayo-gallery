import React from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { Refine } from "@refinedev/core"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/admin/AppSidebar"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar"

type MePayload = {
  username?: string
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

const verifyLegacy = async (password: string) => {
  const res = await adminFetch(`${getMvsApiBase()}/verify-admin`, {
    method: "POST",
    headers: { "x-admin-password": password },
  })
  return res.ok
}

export default function AdminLayout() {
  const location = useLocation()
  const [isInitializing, setIsInitializing] = React.useState(true)
  const [isAuthed, setIsAuthed] = React.useState(false)
  const [me, setMe] = React.useState<MePayload | null>(null)

  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [legacyPassword, setLegacyPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

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

  const handleLogin = React.useCallback(async () => {
    setIsSubmitting(true)
    try {
      const res = await adminFetch(`${getAuthApiBase()}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const json = (await res.json().catch(() => null)) as ApiResponse<MePayload> | null
      if (!res.ok || !json?.success) throw new Error(String((json as any)?.error || "LOGIN_FAILED"))
      await refresh()
    } finally {
      setIsSubmitting(false)
    }
  }, [password, refresh, username])

  const handleLegacyLogin = React.useCallback(async () => {
    setIsSubmitting(true)
    try {
      const ok = await verifyLegacy(legacyPassword)
      if (!ok) throw new Error("LEGACY_LOGIN_FAILED")
      localStorage.setItem("ztmy_admin_pwd", legacyPassword)
      await refresh()
    } finally {
      setIsSubmitting(false)
    }
  }, [legacyPassword, refresh])

  const handleLogout = React.useCallback(async () => {
    await adminFetch(`${getAuthApiBase()}/logout`, { method: "POST" }).catch(() => undefined)
    setMe(null)
    setIsAuthed(false)
  }, [])

  const menus = React.useMemo(() => {
    const list = Array.isArray(me?.menus) ? me!.menus : []
    return [...list].sort((a, b) => (Number(a.sort || 0) || 0) - (Number(b.sort || 0) || 0))
  }, [me])

  if (isInitializing) {
    return <div className="p-6 font-mono">Loading...</div>
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Session 為主，必要時可使用 legacy header。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono font-bold opacity-70">Session Login</div>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                type="password"
              />
              <Button onClick={() => void handleLogin()} disabled={isSubmitting || !username.trim() || !password}>
                Login
              </Button>
            </div>
            <div className="border-t-2 border-border pt-4 flex flex-col gap-2">
              <div className="text-xs font-mono font-bold opacity-70">Legacy Header Login</div>
              <Input
                value={legacyPassword}
                onChange={(e) => setLegacyPassword(e.target.value)}
                placeholder="admin password"
                type="password"
              />
              <Button variant="neutral" onClick={() => void handleLegacyLogin()} disabled={isSubmitting || !legacyPassword}>
                Login (Legacy)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeMenu = menus.find((m) => String(m.path || "") === location.pathname)
  const activeLabel = activeMenu?.label || location.pathname

  return (
    <SidebarProvider>
      <AppSidebar menus={menus} username={me?.username || "legacy"} onLogout={() => void handleLogout()} />
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
            <MenubarMenu>
              <MenubarTrigger>Account</MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => void handleLogout()}>Logout</MenubarItem>
                <MenubarSeparator />
                <MenubarItem asChild>
                  <a href="/" target="_blank" rel="noreferrer">
                    Open Site
                  </a>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </header>
        <div className="flex-1 min-w-0">
          <Refine
            dataProvider={adminDataProvider}
            authProvider={adminAuthProvider}
            accessControlProvider={adminAccessControlProvider(permissions)}
            notificationProvider={adminNotificationProvider}
            resources={adminResources}
          >
            <Outlet />
          </Refine>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
