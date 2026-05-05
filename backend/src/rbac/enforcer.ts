import { newEnforcer, newModelFromString } from 'casbin';
import { SequelizeAdapter } from 'casbin-sequelize-adapter';
import type { Enforcer } from 'casbin';

let enforcerPromise: Promise<Enforcer> | null = null;

const modelText = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = (g(r.sub, p.sub) || r.sub == p.sub) && (p.obj == "*" || r.obj == p.obj) && (p.act == "*" || r.act == p.act)
`.trim();

const getDbOptions = () => {
  const host = process.env.DB_HOST;
  const portRaw = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const username = process.env.DB_USER;
  const password = process.env.DB_PASS;

  if (!host || !database || !username || !password) {
    throw new Error('DB env missing for RBAC');
  }
  const port = portRaw ? Number(portRaw) : 5432;
  return { dialect: 'postgres', host, port, database, username, password } as any;
};

export const getEnforcer = async (): Promise<Enforcer> => {
  if (!enforcerPromise) {
    enforcerPromise = (async () => {
      try {
        const adapter = await SequelizeAdapter.newAdapter({ ...getDbOptions(), tableName: 'casbin_rule' });
        const model = newModelFromString(modelText);
        const e = await newEnforcer(model, adapter);
        return e;
      } catch (err) {
        enforcerPromise = null;
        throw err;
      }
    })();
  }
  return enforcerPromise;
};

export const reloadEnforcerPolicy = async (): Promise<void> => {
  const e = await getEnforcer();
  await e.loadPolicy();
};

// === RBAC 內存緩存 ===
// Casbin + Sequelize Adapter 的 enforce/getRolesForUser 每次都查庫
// 這裡加一層短期內存緩存，減少 DB 查詢壓力

interface RbacCacheEntry {
  value: any;
  expireAt: number;
}

const rbacCache = new Map<string, RbacCacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 分鐘

const getCacheKey = (method: string, ...args: string[]) => `${method}:${args.join('|')}`;

const getCached = (key: string): RbacCacheEntry | undefined => {
  const entry = rbacCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expireAt) {
    rbacCache.delete(key);
    return undefined;
  }
  return entry;
};

const setCached = (key: string, value: any) => {
  rbacCache.set(key, { value, expireAt: Date.now() + CACHE_TTL_MS });
};

/** 帶緩存的 enforce 檢查 */
export const cachedEnforce = async (sub: string, obj: string, act: string): Promise<boolean> => {
  const key = getCacheKey('enforce', sub, obj, act);
  const cached = getCached(key);
  if (cached !== undefined) return cached.value;

  const e = await getEnforcer();
  const result = await e.enforce(sub, obj, act);
  setCached(key, result);
  return result;
};

/** 帶緩存的 getRolesForUser */
export const cachedGetRolesForUser = async (user: string): Promise<string[]> => {
  const key = getCacheKey('roles', user);
  const cached = getCached(key);
  if (cached !== undefined) return cached.value;

  const e = await getEnforcer();
  const result = await e.getRolesForUser(user);
  setCached(key, result);
  return result;
};

/** 清除指定用戶的 RBAC 緩存（用戶角色變更時調用） */
export const invalidateRbacCache = (user?: string) => {
  if (user) {
    for (const key of rbacCache.keys()) {
      if (key.includes(user)) rbacCache.delete(key);
    }
  } else {
    rbacCache.clear();
  }
};
