import React from "react"
import { Link, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
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
} from "@/components/ui/sidebar"

type MenuItem = {
  label?: string
  path?: string
  sort?: number
}

export function AppSidebar({
  menus,
  username,
  onLogout,
}: {
  menus: MenuItem[]
  username: string
  onLogout: () => void
}) {
  const location = useLocation()
  const sorted = React.useMemo(() => {
    return [...menus].sort(
      (a, b) => (Number(a.sort || 0) || 0) - (Number(b.sort || 0) || 0),
    )
  }, [menus])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col gap-2">
        <div className="px-1">
          <div className="font-heading">ZTMY Admin</div>
          <div className="text-xs font-mono opacity-70 break-all">{username}</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {sorted.map((m, idx) => {
              const path = String(m.path || "")
              if (!path) return null
              const active = location.pathname === path
              return (
                <SidebarMenuItem key={`${path}-${idx}`}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link to={path}>
                      <span>{m.label || path}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="destructive" className="w-full" onClick={onLogout}>
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

