import crypto from 'crypto';
import prisma from '@/lib/prisma.js';
import { getAccessToken } from '@/lib/iikoClient.js';
import { HttpBadRequestError, HttpNotFoundError } from '@/lib/errors.js';

function normalizeHostKey(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || url;
}

export type IikoCredentialsInput = {
  serverUrl: string;
  login: string;
  password: string;
};

export default class IikoCredentialsService {
  async get(companyId: string) {
    const row = await prisma.companyIikoCredentials.findUnique({
      where: { companyId },
    });
    if (!row) return null;
    return {
      serverUrl: row.serverUrl,
      login: row.login,
      password: '[REDACTED]',
    };
  }

  async save(companyId: string, data: IikoCredentialsInput): Promise<void> {
    const serverUrl = (data.serverUrl ?? '').trim();
    const login = (data.login ?? '').trim();
    const password = (data.password ?? '').trim();
    if (!serverUrl || !login || !password) throw new HttpBadRequestError('serverUrl, login and password required');
    // В БД храним исходный пароль, а SHA1 считаем уже при отправке в iiko (getAccessToken)
    const storedPassword = password;
    await prisma.companyIikoCredentials.upsert({
      where: { companyId },
      create: { companyId, serverUrl, login, passwordHash: storedPassword },
      update: { serverUrl, login, passwordHash: storedPassword },
    });
  }

  async getHashed(companyId: string): Promise<{ serverUrl: string; login: string; password: string } | null> {
    const row = await prisma.companyIikoCredentials.findUnique({
      where: { companyId },
    });
    if (!row) return null;
    return {
      serverUrl: row.serverUrl,
      login: row.login,
      password: row.passwordHash,
    };
  }

  async getToken(companyId: string): Promise<{ serverUrl: string; token: string; hostKey: string }> {
    const creds = await this.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');
    // getAccessToken сам хеширует пароль в SHA1 перед запросом в iiko
    const token = await getAccessToken(creds.serverUrl, creds.login, creds.password);
    const hostKey = normalizeHostKey(creds.serverUrl);
    return { serverUrl: creds.serverUrl, token, hostKey };
  }
}
