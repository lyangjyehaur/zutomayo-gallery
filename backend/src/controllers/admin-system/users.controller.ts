import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { AdminUserModel } from '../../models/index.js';
import { getEnforcer, reloadEnforcerPolicy } from '../../rbac/enforcer.js';

const normalizeUsername = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const userToDto = async (user: any) => {
  const data = user.toJSON ? (user.toJSON() as any) : (user as any);
  const username = String(data.username);
  const enforcer = await getEnforcer();
  const roles = await enforcer.getRolesForUser(username);
  return {
    id: String(data.id),
    username,
    is_active: Boolean(data.is_active),
    created_at: data.created_at,
    updated_at: data.updated_at,
    roles,
  };
};

export const listUsers = async (_req: Request, res: Response) => {
  const rows = await AdminUserModel.findAll({ order: [['created_at', 'DESC']] });
  const out: any[] = [];
  for (const r of rows) out.push(await userToDto(r));
  res.json({ success: true, data: out });
};

export const createUser = async (req: Request, res: Response) => {
  const username = normalizeUsername(req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const isActive = typeof req.body?.is_active === 'boolean' ? req.body.is_active : true;

  if (!username || username.length < 2) {
    res.status(400).json({ success: false, error: 'INVALID_USERNAME' });
    return;
  }
  if (!password || password.length < 4) {
    res.status(400).json({ success: false, error: 'INVALID_PASSWORD' });
    return;
  }

  const existing = await AdminUserModel.findOne({ where: { username } as any });
  if (existing) {
    res.status(409).json({ success: false, error: 'USERNAME_EXISTS' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const row = await AdminUserModel.create({
    id: nanoid(16),
    username,
    password_hash: passwordHash,
    is_active: isActive,
  } as any);

  const dto = await userToDto(row);
  res.json({ success: true, data: dto });
};

export const updateUserActive = async (req: Request, res: Response) => {
  const id = req.params.id;
  const isActive = req.body?.is_active;
  if (typeof isActive !== 'boolean') {
    res.status(400).json({ success: false, error: 'is_active must be boolean' });
    return;
  }

  const user = await AdminUserModel.findOne({ where: { id } as any });
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  await user.update({ is_active: isActive } as any);
  const dto = await userToDto(user);
  res.json({ success: true, data: dto });
};

export const resetUserPassword = async (req: Request, res: Response) => {
  const id = req.params.id;
  const newPassword = typeof req.body?.new_password === 'string' && req.body.new_password.length >= 4
    ? req.body.new_password
    : nanoid(12);

  const user = await AdminUserModel.findOne({ where: { id } as any });
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await user.update({ password_hash: passwordHash } as any);
  res.json({ success: true, data: { password: newPassword } });
};

export const setUserRoles = async (req: Request, res: Response) => {
  const id = req.params.id;
  const roles = Array.isArray(req.body?.roles) ? req.body.roles : [];
  const nextRoles = Array.from(
    new Set<string>(roles.filter((r: any): r is string => typeof r === 'string' && r.length > 0))
  ).sort();

  const user = await AdminUserModel.findOne({ where: { id } as any });
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const data = user.toJSON() as any;
  const username = String(data.username);
  const enforcer = await getEnforcer();

  const current = await enforcer.getRolesForUser(username);
  for (const r of current) {
    await enforcer.deleteRoleForUser(username, r);
  }
  for (const r of nextRoles) {
    await enforcer.addRoleForUser(username, String(r));
  }
  await enforcer.savePolicy();
  await reloadEnforcerPolicy();

  const dto = await userToDto(user);
  res.json({ success: true, data: dto });
};
