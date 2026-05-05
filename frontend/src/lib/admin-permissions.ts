export const ADMIN_PERMISSIONS = {
  MVS: "admin:mvs",
  ARTISTS: "admin:artists",
  ALBUMS: "admin:albums",
  FANARTS: "admin:fanarts",
  STAGING_FANARTS: "admin:staging-fanarts",
  SUBMISSIONS: "admin:submissions",
  SYSTEM_USERS: "admin:system:users",
  SYSTEM_ROLES: "admin:system:roles",
  SYSTEM_MENUS: "admin:system:menus",
  SYSTEM_DICTS: "admin:system:dicts",
  SYSTEM_ANNOUNCEMENTS: "admin:system:announcements",
  SYSTEM_MEDIA_GROUPS: "admin:system:media-groups",
  SYSTEM_MEDIA_ORPHANS: "admin:system:media-orphans",
  SYSTEM_MAINTENANCE: "admin:system:maintenance",
  SYSTEM_CACHE: "admin:system:cache",
  SYSTEM_R2: "admin:system:r2",
} as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS]
