import type { ResourceProps } from "@refinedev/core"

export const adminResources: ResourceProps[] = [
  { name: "mvs", list: "/admin/mvs", create: "/admin/mvs", edit: "/admin/mvs", show: "/admin/mvs" },
  { name: "mvsSettings", list: "/admin/mvs/settings", meta: { parent: "mvs" } },
  { name: "artists", list: "/admin/artists", edit: "/admin/artists" },
  { name: "albums", list: "/admin/albums", create: "/admin/albums", edit: "/admin/albums" },
  { name: "appleMusicAlbums", list: "/admin/apple-music-albums", edit: "/admin/apple-music-albums" },
  { name: "dicts", list: "/admin/dicts", create: "/admin/dicts", edit: "/admin/dicts" },
  { name: "fanart", list: "/admin/fanart", edit: "/admin/fanart" },
  { name: "stagingFanarts", list: "/admin/staging-fanarts", edit: "/admin/staging-fanarts" },
  { name: "submissions", list: "/admin/submissions" },
  { name: "annotations", list: "/admin/annotations", create: "/admin/annotations", edit: "/admin/annotations" },
  { name: "system", meta: { label: "系統管理" } },
  { name: "systemUsers", list: "/admin/system/users", create: "/admin/system/users", edit: "/admin/system/users", meta: { parent: "system" } },
  { name: "systemRoles", list: "/admin/system/roles", create: "/admin/system/roles", edit: "/admin/system/roles", meta: { parent: "system" } },
  { name: "systemMenus", list: "/admin/system/menus", create: "/admin/system/menus", edit: "/admin/system/menus", meta: { parent: "system" } },
  { name: "systemAnnouncements", list: "/admin/system/announcements", meta: { parent: "system" } },
  { name: "systemMediaGroups", list: "/admin/system/media-groups", meta: { parent: "system" } },
  { name: "systemGroupRepair", list: "/admin/system/group-repair", meta: { parent: "system" } },
  { name: "systemOrphans", list: "/admin/system/orphans", meta: { parent: "system" } },
  { name: "systemPermissions", meta: { parent: "system" } },
]
