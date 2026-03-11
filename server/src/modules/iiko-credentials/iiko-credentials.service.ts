import prisma from '@/lib/prisma.js';
import { getAccessToken, IikoAuthError } from '@/lib/iikoClient.js';
import { HttpBadRequestError, HttpNotFoundError } from '@/lib/errors.js';

function normalizeHostKey(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || url;
}

export type IikoTokenResult = {
  serverUrl: string;
  token: string;
  hostKey: string;
  /** id записи в iiko_access_tokens — для пометки истёкшим при 401/403 */
  tokenId?: string;
};

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

  /**
   * Возвращает токен из таблицы iiko_access_tokens (последний не истёкший)
   * или запрашивает новый у iiko, сохраняет в БД и возвращает его.
   */
  async getToken(companyId: string): Promise<IikoTokenResult> {
    const creds = await this.getHashed(companyId);
    if (!creds) throw new HttpNotFoundError('iiko credentials not set');

    const existing = await prisma.iikoAccessToken.findFirst({
      where: { companyId, isExpired: false },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      const hostKey = normalizeHostKey(creds.serverUrl);
      return {
        serverUrl: creds.serverUrl,
        token: existing.token,
        hostKey,
        tokenId: existing.id,
      };
    }

    const token = await getAccessToken(creds.serverUrl, creds.login, creds.password);
    const hostKey = normalizeHostKey(creds.serverUrl);
    const created = await prisma.iikoAccessToken.create({
      data: { companyId, token },
    });
    return { serverUrl: creds.serverUrl, token, hostKey, tokenId: created.id };
  }

  /** Пометить токен как истёкший (после 401/403). */
  async markTokenExpired(tokenId: string): Promise<void> {
    await prisma.iikoAccessToken.update({
      where: { id: tokenId },
      data: { isExpired: true },
    });
  }

  /**
   * Выполнить операцию с токеном; при IikoAuthError пометить токен истёкшим и один раз повторить с новым токеном.
   */
  async withToken<T>(
    companyId: string,
    fn: (creds: IikoTokenResult) => Promise<T>
  ): Promise<T> {
    const creds = await this.getToken(companyId);
    try {
      return await fn(creds);
    } catch (e) {
      if (e instanceof IikoAuthError && creds.tokenId) {
        await this.markTokenExpired(creds.tokenId);
        const fresh = await this.getToken(companyId);
        return fn(fresh);
      }
      throw e;
    }
  }
}
