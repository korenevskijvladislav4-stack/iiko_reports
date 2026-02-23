/**
 * Простой in-memory кэш с TTL (время жизни записи).
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 минут

export function set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function get<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/** Стабильный ключ кэша по параметрам запроса (не включайте token). */
export function cacheKey(prefix: string, params: Record<string, unknown>): string {
  return prefix + JSON.stringify(params);
}
