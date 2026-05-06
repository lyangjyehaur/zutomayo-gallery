import bcrypt from 'bcrypt';
import { AdminRoleModel, AdminUserModel, AdminMenuModel } from '../models/index.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { getEnforcer, reloadEnforcerPolicy } from '../rbac/enforcer.js';
import { logger } from '../utils/logger.js';

export const seedAdminRBAC = async (): Promise<void> => {
  const enforcer = await getEnforcer();

  const superRole = await AdminRoleModel.findOne({ where: { code: 'role:super_admin' } as any });
  if (!superRole) {
    await AdminRoleModel.create({ code: 'role:super_admin', name: 'Super Admin' } as any);
  }

  const hasSuperPolicy = (await enforcer.getPermissionsForUser('role:super_admin'))
    .some(p => p?.[1] === '*' && p?.[2] === 'access');
  if (!hasSuperPolicy) {
    await enforcer.addPolicy('role:super_admin', '*', 'access');
  }

  const userCount = await AdminUserModel.count();
  if (userCount === 0) {
    const username = process.env.ADMIN_SEED_USERNAME || 'admin';
    const password = process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_PASSWORD;
    if (!password) {
      logger.warn('No admin password configured (ADMIN_SEED_PASSWORD or ADMIN_PASSWORD). Skipping admin user creation. Set the env var and restart to seed the admin user.');
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await AdminUserModel.create({ username, password_hash: passwordHash, is_active: true } as any);
      await enforcer.addRoleForUser(String((user.toJSON() as any).username), 'role:super_admin');
      logger.info({ username }, 'Admin user seeded successfully');
    }
  }

  const defaults = [
    { label: 'MV 管理', path: '/admin/mvs', sort: 10, permission: ADMIN_PERMISSIONS.MVS },
    { label: '畫師管理', path: '/admin/artists', sort: 20, permission: ADMIN_PERMISSIONS.ARTISTS },
    { label: '專輯管理', path: '/admin/albums', sort: 30, permission: ADMIN_PERMISSIONS.ALBUMS },
    { label: 'Apple Music', path: '/admin/apple-music-albums', sort: 40, permission: ADMIN_PERMISSIONS.ALBUMS },
    { label: 'FanArt 管理', path: '/admin/fanart', sort: 50, permission: ADMIN_PERMISSIONS.FANARTS },
    { label: 'Staging FanArt', path: '/admin/staging-fanarts', sort: 60, permission: ADMIN_PERMISSIONS.STAGING_FANARTS },
    { label: '投稿審核', path: '/admin/submissions', sort: 65, permission: ADMIN_PERMISSIONS.SUBMISSIONS },
    { label: '字典管理', path: '/admin/dicts', sort: 70, permission: ADMIN_PERMISSIONS.SYSTEM_DICTS },
    { label: '系統：使用者', path: '/admin/system/users', sort: 100, permission: ADMIN_PERMISSIONS.SYSTEM_USERS },
    { label: '系統：角色', path: '/admin/system/roles', sort: 110, permission: ADMIN_PERMISSIONS.SYSTEM_ROLES },
    { label: '系統：菜單', path: '/admin/system/menus', sort: 120, permission: ADMIN_PERMISSIONS.SYSTEM_MENUS },
    { label: '全局設定', path: '/admin/mvs/settings', sort: 130, permission: ADMIN_PERMISSIONS.MVS },
    { label: '公告管理', path: '/admin/system/announcements', sort: 140, permission: ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS },
    { label: '推文修復', path: '/admin/system/group-repair', sort: 150, permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS },
    { label: '推文分組', path: '/admin/system/media-groups', sort: 160, permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS },
    { label: '未歸屬媒體', path: '/admin/system/orphans', sort: 170, permission: ADMIN_PERMISSIONS.SYSTEM_MEDIA_ORPHANS },
    { label: '錯誤日誌', path: '/admin/system/errors', sort: 180, permission: ADMIN_PERMISSIONS.SYSTEM_CACHE },
  ];
  const legacyPermissionByPath = new Map<string, string>([
    ['/admin/dicts', 'admin:system:menus'],
  ]);
  for (const m of defaults) {
    const existing = await AdminMenuModel.findOne({ where: { path: m.path } as any });
    if (!existing) {
      await AdminMenuModel.create(m as any);
      continue;
    }

    const data = existing.toJSON() as any;
    if (data.permission === legacyPermissionByPath.get(m.path)) {
      await existing.update({ permission: m.permission } as any);
    }
  }

  await enforcer.savePolicy();
  await reloadEnforcerPolicy();
};
