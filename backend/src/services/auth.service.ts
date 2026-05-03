import { AuthPasskey, AuthSetting } from './pg.service.js';

export interface Passkey {
  id: string;
  user_id?: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  name?: string;
  createdAt: string;
}

interface AuthData {
  passkeys: Passkey[];
  currentChallenge?: string;
  password?: string;
}

const defaultAuthData: AuthData = { passkeys: [] };

export class AuthService {
  async getPasskeys(userId?: string): Promise<Passkey[]> {
    const rows = await AuthPasskey.findAll(userId ? ({ where: { user_id: userId } } as any) : undefined);
    return rows.map(r => {
      const data = r.toJSON() as any;
      let transports;
      if (data.transports) {
        try {
          transports = typeof data.transports === 'string' ? JSON.parse(data.transports) : data.transports;
        } catch (e) {
          transports = [];
        }
      }
      return {
        id: data.id,
        user_id: data.user_id ? String(data.user_id) : undefined,
        publicKey: data.publicKey,
        counter: data.counter,
        transports,
        name: data.name,
        createdAt: data.createdAt
      };
    });
  }

  async savePasskey(passkey: Passkey) {
    await AuthPasskey.upsert({
      id: passkey.id,
      user_id: passkey.user_id || null,
      publicKey: passkey.publicKey,
      counter: passkey.counter,
      transports: passkey.transports ? passkey.transports : null,
      name: passkey.name || null,
      createdAt: passkey.createdAt ? new Date(passkey.createdAt) : new Date()
    } as any);
  }

  async removePasskey(id: string, userId?: string) {
    if (userId) {
      await AuthPasskey.destroy({ where: { id, user_id: userId } as any });
      return;
    }
    await AuthPasskey.destroy({ where: { id } as any });
  }

  async setCurrentChallenge(challenge: string) {
    await AuthSetting.upsert({ key: 'currentChallenge', value: challenge });
  }

  async getCurrentChallenge(): Promise<string | undefined> {
    const row = await AuthSetting.findByPk('currentChallenge');
    return row ? (row.toJSON() as any).value : undefined;
  }

  async getPassword(): Promise<string | undefined> {
    const row = await AuthSetting.findByPk('password');
    return row ? (row.toJSON() as any).value : undefined;
  }

  async setPassword(password: string) {
    await AuthSetting.upsert({ key: 'password', value: password });
  }

  async updatePasskeyCounter(id: string, counter: number) {
    await AuthPasskey.update({ counter }, { where: { id } });
  }
}

export const authService = new AuthService();
