import { getDB } from './db.service.js';
import crypto from 'crypto';

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

  async getPasskeys(): Promise<Passkey[]> {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM auth_passkeys').all() as any[];
    return rows.map(r => ({
      id: r.id,
      publicKey: r.publicKey,
      counter: r.counter,
      transports: r.transports ? JSON.parse(r.transports) : undefined,
      name: r.name,
      createdAt: r.createdAt
    }));
  }

  async savePasskey(passkey: Passkey) {
    const db = getDB();
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO auth_passkeys (id, publicKey, counter, transports, name, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(
      passkey.id,
      passkey.publicKey,
      passkey.counter,
      passkey.transports ? JSON.stringify(passkey.transports) : null,
      passkey.name || null,
      passkey.createdAt
    );
  }

  async removePasskey(id: string) {
    const db = getDB();
    db.prepare('DELETE FROM auth_passkeys WHERE id = ?').run(id);
  }

  async setCurrentChallenge(challenge: string) {
    const db = getDB();
    db.prepare('INSERT OR REPLACE INTO auth_settings (key, value) VALUES (?, ?)').run('currentChallenge', challenge);
  }

  async getCurrentChallenge(): Promise<string | undefined> {
    const db = getDB();
    const row = db.prepare('SELECT value FROM auth_settings WHERE key = ?').get('currentChallenge') as any;
    return row ? row.value : undefined;
  }

  async getPassword(): Promise<string | undefined> {
    const db = getDB();
    const row = db.prepare('SELECT value FROM auth_settings WHERE key = ?').get('password') as any;
    return row ? row.value : undefined;
  }

  async setPassword(password: string) {
    const db = getDB();
    db.prepare('INSERT OR REPLACE INTO auth_settings (key, value) VALUES (?, ?)').run('password', password);
  }

  async updatePasskeyCounter(id: string, counter: number) {
    const db = getDB();
    db.prepare('UPDATE auth_passkeys SET counter = ? WHERE id = ?').run(counter, id);
  }
}

export const authService = new AuthService();