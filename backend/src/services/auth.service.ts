import { getDB } from './db.service.js';

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
  async getPasskeys(): Promise<Passkey[]> {
    const db = await getDB();
    const rows = await db.all('SELECT * FROM auth_passkeys');
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
    const db = await getDB();
    await db.run(
      'INSERT OR REPLACE INTO auth_passkeys (id, publicKey, counter, transports, name, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      passkey.id,
      passkey.publicKey,
      passkey.counter,
      passkey.transports ? JSON.stringify(passkey.transports) : null,
      passkey.name || null,
      passkey.createdAt
    );
  }

  async removePasskey(id: string) {
    const db = await getDB();
    await db.run('DELETE FROM auth_passkeys WHERE id = ?', id);
  }

  async setCurrentChallenge(challenge: string) {
    const db = await getDB();
    await db.run('INSERT OR REPLACE INTO auth_settings (key, value) VALUES (?, ?)', 'currentChallenge', challenge);
  }

  async getCurrentChallenge(): Promise<string | undefined> {
    const db = await getDB();
    const row = await db.get('SELECT value FROM auth_settings WHERE key = ?', 'currentChallenge');
    return row ? row.value : undefined;
  }

  async getPassword(): Promise<string | undefined> {
    const db = await getDB();
    const row = await db.get('SELECT value FROM auth_settings WHERE key = ?', 'password');
    return row ? row.value : undefined;
  }

  async setPassword(password: string) {
    const db = await getDB();
    await db.run('INSERT OR REPLACE INTO auth_settings (key, value) VALUES (?, ?)', 'password', password);
  }

  async updatePasskeyCounter(id: string, counter: number) {
    const db = await getDB();
    await db.run('UPDATE auth_passkeys SET counter = ? WHERE id = ?', counter, id);
  }
}

export const authService = new AuthService();