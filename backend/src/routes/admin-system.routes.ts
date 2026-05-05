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
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/users', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), asyncHandler(listUsers));
router.post('/users', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), asyncHandler(createUser));
router.patch('/users/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), asyncHandler(updateUser));
router.post('/users/:id/reset-password', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), asyncHandler(resetUserPassword));
router.put('/users/:id/roles', requirePermission(ADMIN_PERMISSIONS.SYSTEM_USERS), asyncHandler(setUserRoles));

router.get('/roles', requireAnyPermission([ADMIN_PERMISSIONS.SYSTEM_ROLES, ADMIN_PERMISSIONS.SYSTEM_USERS]), asyncHandler(listRoles));
router.post('/roles', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ROLES), asyncHandler(createRole));
router.patch('/roles/:code', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ROLES), asyncHandler(updateRole));
router.delete('/roles/:code', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ROLES), asyncHandler(deleteRole));
router.put('/roles/:code/permissions', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ROLES), asyncHandler(setRolePermissions));

router.get('/menus', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), asyncHandler(listMenus));
router.post('/menus', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), asyncHandler(createMenu));
router.patch('/menus/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), asyncHandler(updateMenu));
router.delete('/menus/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), asyncHandler(deleteMenu));
router.put('/menus/bulk', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MENUS), asyncHandler(bulkUpdateMenus));

router.get(
  '/permissions',
  requireAnyPermission([ADMIN_PERMISSIONS.SYSTEM_ROLES, ADMIN_PERMISSIONS.SYSTEM_MENUS]),
  asyncHandler(listAdminPermissions)
);

export default router;
