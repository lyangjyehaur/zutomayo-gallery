import bcrypt from 'bcrypt';
import { AdminRoleModel, AdminUserModel, AdminMenuModel } from '../models/index.js';
import { getEnforcer, reloadEnforcerPolicy } from '../rbac/enforcer.js';

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
    const password = process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_PASSWORD || 'zutomayo';
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await AdminUserModel.create({ username, password_hash: passwordHash, is_active: true } as any);
    await enforcer.addRoleForUser(String((user.toJSON() as any).username), 'role:super_admin');
  }

  const defaults = [
    { label: 'MV 管理', path: '/admin/mvs', sort: 10, permission: 'admin:mvs' },
    { label: '畫師管理', path: '/admin/artists', sort: 20, permission: 'admin:artists' },
    { label: '專輯管理', path: '/admin/albums', sort: 30, permission: 'admin:albums' },
    { label: 'Apple Music', path: '/admin/apple-music-albums', sort: 40, permission: 'admin:albums' },
    { label: 'FanArt 管理', path: '/admin/fanart', sort: 50, permission: 'admin:fanarts' },
    { label: 'Staging FanArt', path: '/admin/staging-fanarts', sort: 60, permission: 'admin:staging-fanarts' },
    { label: '投稿審核', path: '/admin/submissions', sort: 65, permission: 'admin:submissions' },
    { label: '字典管理', path: '/admin/dicts', sort: 70, permission: 'admin:system:menus' },
    { label: '系統：使用者', path: '/admin/system/users', sort: 100, permission: 'admin:system:users' },
    { label: '系統：角色', path: '/admin/system/roles', sort: 110, permission: 'admin:system:roles' },
    { label: '系統：菜單', path: '/admin/system/menus', sort: 120, permission: 'admin:system:menus' },
  ];
  for (const m of defaults) {
    const existing = await AdminMenuModel.findOne({ where: { path: m.path } as any });
    if (!existing) await AdminMenuModel.create(m as any);
  }

  await enforcer.savePolicy();
  await reloadEnforcerPolicy();
};
