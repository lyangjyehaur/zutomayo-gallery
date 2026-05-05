import { Router } from 'express';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requireAnyPermission, requirePermission } from '../middleware/auth.middleware.js';
import {
  createUser,
  listUsers,
  resetUserPassword,
  setUserRoles,
  updateUser,
} from '../controllers/admin-system/users.controller.js';
import {
  createRole,
  deleteRole,
  listRoles,
  setRolePermissions,
  updateRole,
} from '../controllers/admin-system/roles.controller.js';
import {
  bulkUpdateMenus,
  createMenu,
  deleteMenu,
  listMenus,
  updateMenu,
} from '../controllers/admin-system/menus.controller.js';
import { listAdminPermissions } from '../controllers/admin-system/permissions.controller.js';

const router = Router();

router.get('/users', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), listUsers);
router.post('/users', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), createUser);
router.patch('/users/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), updateUser);
router.post('/users/:id/reset-password', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), resetUserPassword);
router.put('/users/:id/roles', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), setUserRoles);

router.get('/roles', requireAnyPermission([ADMIN_PERMISSIONS.SYSTEM_ROLES, ADMIN_PERMISSIONS.SYSTEM_USERS]), listRoles);
router.post('/roles', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ROLES), createRole);
router.patch('/roles/:code', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ROLES), updateRole);
router.delete('/roles/:code', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ROLES), deleteRole);
router.put('/roles/:code/permissions', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ROLES), setRolePermissions);

router.get('/menus', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), listMenus);
router.post('/menus', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), createMenu);
router.patch('/menus/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), updateMenu);
router.delete('/menus/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), deleteMenu);
router.put('/menus/bulk', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), bulkUpdateMenus);

router.get(
  '/permissions',
  requireAnyPermission([ADMIN_PERMISSIONS.SYSTEM_ROLES, ADMIN_PERMISSIONS.SYSTEM_MENUS]),
  listAdminPermissions
);

export default router;
