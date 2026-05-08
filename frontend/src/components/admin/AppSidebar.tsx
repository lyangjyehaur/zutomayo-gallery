import React from "react"
import { Link, useLocation } from "react-router-dom"

import {
  Album,
  BookOpen,
  ChevronsUpDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Film,
  Image,
  Images,
  Inbox,
  Layers,
  Link2,
  LogOut,
  Megaphone,
  Settings2,
  SlidersHorizontal,
  TriangleAlert,
  UserCog,
  Users,
  Wrench,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/admin-permissions"
import { resolveUserAvatarUrl } from "@/lib/gravatar"

type MenuItem = {
  label?: string
  path?: string
  sort?: number
}

const iconForPath = (path: string) => {
  const p = String(path || "")
  if (p === "/admin" || p === "/admin/mvs") return Film
  if (p === "/admin/artists") return Users
  if (p === "/admin/albums") return Album
  if (p === "/admin/apple-music-albums") return Album
  if (p === "/admin/dicts") return BookOpen
  if (p === "/admin/fanart") return Image
  if (p === "/admin/staging-fanarts") return Images
  if (p === "/admin/submissions") return Inbox
  if (p === "/admin/annotations") return Image
  if (p === "/admin/system/announcements") return Megaphone
  if (p === "/admin/mvs/settings") return SlidersHorizontal
  if (p === "/admin/system/group-repair") return Wrench
  if (p === "/admin/system/media-groups") return Layers
  if (p === "/admin/system/orphans") return Link2
  if (p === "/admin/system/errors") return TriangleAlert
  if (p === "/admin/system/users") return UserCog
  if (p.startsWith("/admin/system/")) return Settings2
  return FileText
}

export function AppSidebar({
  menus,
  permissions,
  username,
  email,
  displayName,
  avatarUrl,
  onLogout,
}: {
  menus: MenuItem[]
  permissions: string[]
  username: string
  email?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  onLogout: () => void
}) {
  const location = useLocation()
  const { isMobile } = useSidebar()
  const canAccessPermission = React.useCallback((permission?: AdminPermission) => {
    if (!permission) return true
    return permissions.includes("*") || permissions.includes(permission)
  }, [permissions])

  const sorted = React.useMemo(() => {
    return [...menus].sort(
      (a, b) => (Number(a.sort || 0) || 0) - (Number(b.sort || 0) || 0),
    )
  }, [menus])

  const systemItems = React.useMemo(() => {
    const base = sorted.filter((m) => String(m.path || "").startsWith("/admin/system/"))
    const mediaTools = [
      { label: "全局設定", path: "/admin/mvs/settings", sort: 9979, permission: ADMIN_PERMISSIONS.MVS },
      { label: "公告管理", path: "/admin/system/announcements", sort: 9980, permission: ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS },
      { label: "推文修復", path: "/admin/system/group-repair", sort: 9981, permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS },
      { label: "推文分組", path: "/admin/system/media-groups", sort: 9982, permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS },
      { label: "未歸屬媒體", path: "/admin/system/orphans", sort: 9983, permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_ORPHANS },
    ]
    const excluded = new Set(mediaTools.map((m) => m.path))
    const adminTools = base.filter((m) => {
      const path = String(m.path || "")
      if (!path) return false
      return !excluded.has(path)
    })
    const normalize = (list: any[]) => {
      const map = new Map<string, any>()
      list.forEach((m) => {
        const path = String(m.path || "")
        if (!path) return
        if (!map.has(path)) map.set(path, m)
      })
      return Array.from(map.values()).sort(
        (a, b) => (Number(a.sort || 0) || 0) - (Number(b.sort || 0) || 0),
      )
    }
    const visibleMediaTools = mediaTools
      .filter((m) => canAccessPermission(m.permission))
      .map((m) => sorted.find((item) => String(item.path || "") === m.path) || m)
    return { adminTools: normalize(adminTools), mediaTools: normalize(visibleMediaTools as any[]) }
  }, [canAccessPermission, sorted])

  const globalSettingsPath = "/admin/mvs/settings"

  const mvListPath = React.useMemo(() => {
    const prefer = sorted.find((m) => String(m.path || "") === "/admin/mvs")
    if (prefer?.path) return String(prefer.path)
    const root = sorted.find((m) => String(m.path || "") === "/admin")
    return root?.path ? String(root.path) : "/admin/mvs"
  }, [sorted])

  const mvLabel = React.useMemo(() => {
    const list = sorted.filter((m) => {
      const path = String(m.path || "")
      return path === "/admin" || path === "/admin/mvs"
    })
    return list.find((m) => String(m.path || "") === mvListPath)?.label || "MV 管理"
  }, [mvListPath, sorted])

  const otherItems = React.useMemo(() => {
    return sorted.filter((m) => {
      const path = String(m.path || "")
      if (!path) return false
      if (path.startsWith("/admin/system/")) return false
      if (path === "/admin" || path === "/admin/mvs") return false
      if (path === globalSettingsPath) return false
      return true
    })
  }, [globalSettingsPath, sorted])

  const systemOpen = location.pathname.startsWith("/admin/system/")

  const contentPaths = React.useMemo(() => {
    return new Set([
      "/admin/artists",
      "/admin/albums",
      "/admin/apple-music-albums",
      "/admin/dicts",
      "/admin/fanart",
      "/admin/staging-fanarts",
      "/admin/submissions",
      "/admin/annotations",
    ])
  }, [])

  const contentItems = React.useMemo(() => {
    return otherItems.filter((m) => contentPaths.has(String(m.path || "")))
  }, [contentPaths, otherItems])

  const miscItems = React.useMemo(() => {
    return otherItems.filter((m) => !contentPaths.has(String(m.path || "")))
  }, [contentPaths, otherItems])

  const hasSystemItems = systemItems.adminTools.length > 0 || systemItems.mediaTools.length > 0

  const labelForMenu = React.useCallback((m: any) => {
    const raw = typeof m?.label === "string" ? m.label.trim() : ""
    if (raw) return raw
    const path = typeof m?.path === "string" ? m.path : ""
    const seg = path.split("?")[0].split("/").filter(Boolean).slice(-1)[0] || path
    if (!seg) return path
    const spaced = seg.replace(/[-_]/g, " ")
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  }, [])

  const userInitials = React.useMemo(() => {
    const raw = (displayName || username || "").trim()
    if (!raw) return "AD"
    return raw.slice(0, 2).toUpperCase()
  }, [displayName, username])

  const resolvedAvatar = React.useMemo(() => {
    return resolveUserAvatarUrl({ email, avatar_url: avatarUrl }, 80)
  }, [avatarUrl, email])

  const userLabel = React.useMemo(() => {
    return (displayName || "").trim() || (username || "").trim() || "Admin"
  }, [displayName, username])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col gap-2">
        <div className="px-1">
          <div className="flex items-center gap-2">
            <img
              src="/icon/favicon.svg"
              alt="ZTMY"
              className="size-6 border-2 border-black bg-[var(--admin-panel-bg)] shadow-[var(--admin-shadow-sm)] rounded-[calc(var(--admin-radius)-4px)]"
            />
            <div className="min-w-0">
              <div className="font-heading leading-none truncate">ZTMY Admin</div>
              <div className="text-xs font-mono opacity-70 break-all truncate">{userLabel}</div>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>管理</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === mvListPath}>
                <Link to={mvListPath}>
                  <Film />
                  <span>{mvLabel}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {contentItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>內容</SidebarGroupLabel>
            <SidebarMenu>
              {contentItems.map((m, idx) => {
                const path = String(m.path || "")
                if (!path) return null
                const active = location.pathname === path
                return (
                  <SidebarMenuItem key={`${path}-${idx}`}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={path}>
                        {React.createElement(iconForPath(path))}
                        <span>{labelForMenu(m)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}

        {hasSystemItems ? (
          <SidebarGroup>
            <SidebarGroupLabel>系統</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible asChild defaultOpen={systemOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={systemOpen}
                      tooltip="系統管理"
                      className="data-[state=open]:bg-main data-[state=open]:outline-border data-[state=open]:text-main-foreground"
                    >
                      <Settings2 />
                      <span>系統管理</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {systemItems.mediaTools.length > 0 ? (
                        <div className="px-2 py-1 text-[10px] font-mono opacity-60">媒體</div>
                      ) : null}
                      {systemItems.mediaTools.map((m, idx) => {
                        const path = String(m.path || "")
                        if (!path) return null
                        const active = location.pathname === path
                        return (
                          <SidebarMenuSubItem key={`${path}-${idx}`}>
                            <SidebarMenuSubButton asChild isActive={active}>
                              <Link to={path}>
                                {React.createElement(iconForPath(path))}
                                <span>{labelForMenu(m)}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                      {systemItems.adminTools.length > 0 ? (
                        <div className="px-2 py-1 text-[10px] font-mono opacity-60">權限</div>
                      ) : null}
                      {systemItems.adminTools.map((m, idx) => {
                        const path = String(m.path || "")
                        if (!path) return null
                        const active = location.pathname === path
                        return (
                          <SidebarMenuSubItem key={`${path}-${idx}`}>
                            <SidebarMenuSubButton asChild isActive={active}>
                              <Link to={path}>
                                {React.createElement(iconForPath(path))}
                                <span>{labelForMenu(m)}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}

        {miscItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>其他</SidebarGroupLabel>
            <SidebarMenu>
              {miscItems.map((m, idx) => {
                const path = String(m.path || "")
                if (!path) return null
                const active = location.pathname === path
                return (
                  <SidebarMenuItem key={`${path}-${idx}`}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={path}>
                        {React.createElement(iconForPath(path))}
                        <span>{labelForMenu(m)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <SidebarMenuButton
                asChild
                size="lg"
                className="group-data-[state=collapsed]:hover:outline-0 group-data-[state=collapsed]:hover:bg-transparent overflow-hidden"
              >
                <DropdownMenuTrigger className="flex w-full items-center gap-2 focus-visible:ring-0 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-8 w-8">
                    {resolvedAvatar ? <AvatarImage src={resolvedAvatar} alt={userLabel} /> : null}
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-heading">{userLabel}</span>
                    <span className="truncate text-xs opacity-70">{email || username}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </DropdownMenuTrigger>
              </SidebarMenuButton>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <a href="/" target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Open Site
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/account">
                    <Settings2 />
                    帳戶設定
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
