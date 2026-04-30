import { Request, Response } from 'express';
import { AdminRoleModel } from '../../models/index.js';
import { getEnforcer, reloadEnforcerPolicy } from '../../rbac/enforcer.js';

const normalizeRoleCode = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const getRolePermissions = async (code: string) => {
  const enforcer = await getEnforcer();
  const perms = await enforcer.getPermissionsForUser(code);
  return perms
    .filter(p => p?.[2] === 'access')
    .map(p => String(p?.[1]))
    .filter(Boolean)
    .sort();
};

export const listRoles = async (_req: Request, res: Response) => {
  const rows = await AdminRoleModel.findAll({ order: [['code', 'ASC']] });
  const out: any[] = [];
  for (const row of rows) {
    const data = row.toJSON() as any;
    out.push({
      code: String(data.code),
      name: data.name ?? null,
      description: data.description ?? null,
      permissions: await getRolePermissions(String(data.code)),
    });
  }
  res.json({ success: true, data: out });
};

export const createRole = async (req: Request, res: Response) => {
  const code = normalizeRoleCode(req.body?.code);
  const name = typeof req.body?.name === 'string' ? req.body.name : null;
  const description = typeof req.body?.description === 'string' ? req.body.description : null;

  if (!code || !code.startsWith('role:')) {
    res.status(400).json({ success: false, error: 'INVALID_ROLE_CODE' });
    return;
  }

  const existing = await AdminRoleModel.findOne({ where: { code } as any });
  if (existing) {
    res.status(409).json({ success: false, error: 'ROLE_EXISTS' });
    return;
  }

  await AdminRoleModel.create({ code, name, description } as any);
  res.json({ success: true, data: { code, name, description, permissions: [] } });
};

export const updateRole = async (req: Request, res: Response) => {
  const code = normalizeRoleCode(req.params.code);
  const name = typeof req.body?.name === 'string' ? req.body.name : null;
  const description = typeof req.body?.description === 'string' ? req.body.description : null;

  const role = await AdminRoleModel.findOne({ where: { code } as any });
  if (!role) {
    res.status(404).json({ success: false, error: 'ROLE_NOT_FOUND' });
    return;
  }

  await role.update({ name, description } as any);
  const permissions = await getRolePermissions(code);
  res.json({ success: true, data: { code, name, description, permissions } });
};

export const deleteRole = async (req: Request, res: Response) => {
  const code = normalizeRoleCode(req.params.code);
  if (code === 'role:super_admin') {
    res.status(400).json({ success: false, error: 'CANNOT_DELETE_SUPER_ADMIN' });
    return;
  }

  const role = await AdminRoleModel.findOne({ where: { code } as any });
  if (!role) {
    res.status(404).json({ success: false, error: 'ROLE_NOT_FOUND' });
    return;
  }

  await role.destroy();
  const enforcer = await getEnforcer();
  await enforcer.deleteRole(code);
  await enforcer.removeFilteredPolicy(0, code);
  await enforcer.savePolicy();
  await reloadEnforcerPolicy();
  res.json({ success: true, data: { code } });
};

export const setRolePermissions = async (req: Request, res: Response) => {
  const code = normalizeRoleCode(req.params.code);
  const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
  const nextPerms = Array.from(
    new Set<string>(permissions.filter((p: any): p is string => typeof p === 'string' && p.length > 0))
  ).sort();

  const role = await AdminRoleModel.findOne({ where: { code } as any });
  if (!role) {
    res.status(404).json({ success: false, error: 'ROLE_NOT_FOUND' });
    return;
  }

  const enforcer = await getEnforcer();
  await enforcer.removeFilteredPolicy(0, code);
  for (const p of nextPerms) {
    await enforcer.addPolicy(code, String(p), 'access');
  }
  await enforcer.savePolicy();
  await reloadEnforcerPolicy();

  const data = role.toJSON() as any;
  res.json({
    success: true,
    data: {
      code,
      name: data.name ?? null,
      description: data.description ?? null,
      permissions: nextPerms,
    },
  });
};
