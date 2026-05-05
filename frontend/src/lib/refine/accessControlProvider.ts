import type { AccessControlProvider } from "@refinedev/core"
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions"

const resourcePermissionMap: Record<string, string> = {
  systemUsers: ADMIN_PERMISSIONS.SYSTEM_USERS,
  systemRoles: ADMIN_PERMISSIONS.SYSTEM_ROLES,
  systemMenus: ADMIN_PERMISSIONS.SYSTEM_MENUS,
  systemPermissions: ADMIN_PERMISSIONS.SYSTEM_ROLES,
  systemAnnouncements: ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS,
  systemMediaGroups: ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS,
  systemGroupRepair: ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS,
  systemOrphans: ADMIN_PERMISSIONS.SYSTEM_MEDIA_ORPHANS,
  systemMaintenance: ADMIN_PERMISSIONS.SYSTEM_MAINTENANCE,
  systemCache: ADMIN_PERMISSIONS.SYSTEM_CACHE,
  mvs: ADMIN_PERMISSIONS.MVS,
  mvsSettings: ADMIN_PERMISSIONS.MVS,
  artists: ADMIN_PERMISSIONS.ARTISTS,
  albums: ADMIN_PERMISSIONS.ALBUMS,
  appleMusicAlbums: ADMIN_PERMISSIONS.ALBUMS,
  fanart: ADMIN_PERMISSIONS.FANARTS,
  stagingFanarts: ADMIN_PERMISSIONS.STAGING_FANARTS,
  submissions: ADMIN_PERMISSIONS.SUBMISSIONS,
  dicts: ADMIN_PERMISSIONS.SYSTEM_DICTS,
}

export const adminAccessControlProvider = (permissions: string[]): AccessControlProvider => {
  const allowAll = permissions.includes("*")
  const set = new Set(permissions)
  return {
    can: async ({ resource }) => {
      if (allowAll) return { can: true }
      const code = resource ? resourcePermissionMap[resource] : null
      if (!resource) return { can: true }
      if (!code) return { can: false }
      return { can: set.has(code) }
    },
  }
}
