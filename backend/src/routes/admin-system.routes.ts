import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.middleware.js';
import {
  createUser,
  listUsers,
  resetUserPassword,
  setUserRoles,
  updateUserActive,
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

router.use(requireAdmin);

router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUserActive);
router.post('/users/:id/reset-password', resetUserPassword);
router.put('/users/:id/roles', setUserRoles);

router.get('/roles', listRoles);
router.post('/roles', createRole);
router.patch('/roles/:code', updateRole);
router.delete('/roles/:code', deleteRole);
router.put('/roles/:code/permissions', setRolePermissions);

router.get('/menus', listMenus);
router.post('/menus', createMenu);
router.patch('/menus/:id', updateMenu);
router.delete('/menus/:id', deleteMenu);
router.put('/menus/bulk', bulkUpdateMenus);

router.get('/permissions', listAdminPermissions);

export default router;
