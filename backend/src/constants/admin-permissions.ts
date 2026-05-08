export const ADMIN_PERMISSIONS = {
  MVS: 'admin:mvs',
  ARTISTS: 'admin:artists',
  ALBUMS: 'admin:albums',
  FANARTS: 'admin:fanarts',
  ANNOTATIONS: 'admin:annotations',
  STAGING_FANARTS: 'admin:staging-fanarts',
  SUBMISSIONS: 'admin:submissions',
  SYSTEM_USERS: 'admin:system:users',
  SYSTEM_ROLES: 'admin:system:roles',
  SYSTEM_MENUS: 'admin:system:menus',
  SYSTEM_DICTS: 'admin:system:dicts',
  SYSTEM_ANNOUNCEMENTS: 'admin:system:announcements',
  SYSTEM_MEDIA_GROUPS: 'admin:system:media-groups',
  SYSTEM_MEDIA_ORPHANS: 'admin:system:media-orphans',
  SYSTEM_MAINTENANCE: 'admin:system:maintenance',
  SYSTEM_CACHE: 'admin:system:cache',
  SYSTEM_R2: 'admin:system:r2',
} as const;

export const ADMIN_PERMISSION_CODES = Object.values(ADMIN_PERMISSIONS);

export const LEGACY_ADMIN_PERMISSION_ALIASES: Record<string, string[]> = {
  [ADMIN_PERMISSIONS.SYSTEM_DICTS]: ['admin.system.dicts.update'],
  [ADMIN_PERMISSIONS.SYSTEM_MAINTENANCE]: ['admin.system.maintenance.update'],
  [ADMIN_PERMISSIONS.SYSTEM_CACHE]: ['admin.system.cache.clear'],
  [ADMIN_PERMISSIONS.SYSTEM_R2]: ['admin.system.r2.sync', 'admin.system.r2.rebuild'],
};

export const getAdminPermissionCandidates = (permission: string): string[] => {
  return [permission, ...(LEGACY_ADMIN_PERMISSION_ALIASES[permission] || [])];
};

export const normalizeAdminPermissionCodes = (codes: Iterable<string>): string[] => {
  const set = new Set<string>(codes);
  for (const [permission, aliases] of Object.entries(LEGACY_ADMIN_PERMISSION_ALIASES)) {
    if (aliases.some((alias) => set.has(alias))) set.add(permission);
  }
  return Array.from(set);
};
