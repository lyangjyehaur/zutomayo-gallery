import type { ResourceProps } from "@refinedev/core"
import { AdminPage } from "@/pages/AdminPage"
import { AdminArtistsPage } from "@/pages/AdminArtistsPage"
import { AdminAlbumsPage } from "@/pages/AdminAlbumsPage"
import { AdminAppleMusicAlbumsPage } from "@/pages/AdminAppleMusicAlbumsPage"
import { AdminDictsPage } from "@/pages/AdminDictsPage"
import { AdminFanArtPage } from "@/pages/AdminFanArtPage"
import { AdminStagingFanartPage } from "@/pages/AdminStagingFanartPage"
import { AdminSystemUsersPage } from "@/pages/AdminSystemUsersPage"
import { AdminSystemRolesPage } from "@/pages/AdminSystemRolesPage"
import { AdminSystemMenusPage } from "@/pages/AdminSystemMenusPage"

export const adminResources: ResourceProps[] = [
  { name: "mvs", list: AdminPage, create: AdminPage, edit: AdminPage, show: AdminPage },
  { name: "artists", list: AdminArtistsPage, edit: AdminArtistsPage },
  { name: "albums", list: AdminAlbumsPage, create: AdminAlbumsPage, edit: AdminAlbumsPage },
  { name: "appleMusicAlbums", list: AdminAppleMusicAlbumsPage, edit: AdminAppleMusicAlbumsPage },
  { name: "dicts", list: AdminDictsPage, create: AdminDictsPage, edit: AdminDictsPage },
  { name: "fanart", list: AdminFanArtPage, edit: AdminFanArtPage },
  { name: "stagingFanarts", list: AdminStagingFanartPage, edit: AdminStagingFanartPage },
  { name: "system", meta: { label: "系統管理" } },
  { name: "systemUsers", list: AdminSystemUsersPage, create: AdminSystemUsersPage, edit: AdminSystemUsersPage, meta: { parent: "system" } },
  { name: "systemRoles", list: AdminSystemRolesPage, create: AdminSystemRolesPage, edit: AdminSystemRolesPage, meta: { parent: "system" } },
  { name: "systemMenus", list: AdminSystemMenusPage, create: AdminSystemMenusPage, edit: AdminSystemMenusPage, meta: { parent: "system" } },
  { name: "systemPermissions", meta: { parent: "system" } },
]

