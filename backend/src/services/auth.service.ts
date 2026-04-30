import crypto from 'crypto';
import { AuthPasskey, AuthSetting, sequelize } from './pg.service.js';

export interface Passkey {
  id: string;
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
  private sessionTokens: Set<string> = new Set();

  public generateSessionToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.sessionTokens.add(token);
    // Token 過期時間：24 小時
    setTimeout(() => {
      this.sessionTokens.delete(token);
    }, 24 * 60 * 60 * 1000);
    return token;
  }

  public isValidSessionToken(token: string): boolean {
    return this.sessionTokens.has(token);
  }

  public revokeSessionToken(token: string): boolean {
    return this.sessionTokens.delete(token);
  }

  async getPasskeys(): Promise<Passkey[]> {
    const rows = await AuthPasskey.findAll();
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
      publicKey: passkey.publicKey,
      counter: passkey.counter,
      transports: passkey.transports ? passkey.transports : null,
      name: passkey.name || null,
      createdAt: passkey.createdAt ? new Date(passkey.createdAt) : new Date()
    } as any);
  }

  async removePasskey(id: string) {
    await AuthPasskey.destroy({ where: { id } });
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
