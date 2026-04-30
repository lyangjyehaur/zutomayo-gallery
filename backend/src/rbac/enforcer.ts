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
