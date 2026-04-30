import type { AccessControlProvider } from "@refinedev/core"

const resourcePermissionMap: Record<string, string> = {
  systemUsers: "admin:system:users",
  systemRoles: "admin:system:roles",
  systemMenus: "admin:system:menus",
  systemPermissions: "admin:system:roles",
  mvs: "admin:mvs",
  artists: "admin:artists",
  albums: "admin:albums",
  appleMusicAlbums: "admin:albums",
  fanart: "admin:fanarts",
  stagingFanarts: "admin:staging-fanarts",
  dicts: "admin:system:menus",
}

export const adminAccessControlProvider = (permissions: string[]): AccessControlProvider => {
  const allowAll = permissions.includes("*")
  const set = new Set(permissions)
  return {
    can: async ({ resource }) => {
      if (allowAll) return { can: true }
      const code = resource ? resourcePermissionMap[resource] : null
      if (!code) return { can: true }
      return { can: set.has(code) }
    },
  }
}

