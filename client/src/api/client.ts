const API_BASE = '/api';

/** Проверяет, что ошибка от API — истёкший или невалидный токен (401). */
export function isTokenExpiredError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /401|Token is expired|invalid token/i.test(msg);
}

export type AuthPayload = {
  serverUrl: string;
  login: string;
  password: string;
};

export async function getToken(payload: AuthPayload): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Ошибка авторизации');
  }
  return res.json();
}

export type OlapPayload = {
  serverUrl: string;
  token: string;
  report: 'SALES' | 'TRANSACTIONS' | 'DELIVERIES' | 'STOCK' | 'BALANCE';
  from: string; // DD.MM.YYYY
  to: string;
  groupByRowFields?: string[];
  groupByColFields?: string[];
  aggregateFields?: string[];
  /** Совместимость: подставляются в groupByRowFields/aggregateFields при отсутствии */
  groupRow?: string[];
  agr?: string[];
  /** Доп. фильтры OLAP (напр. ProductCategory: { filterType, values }) */
  filters?: Record<string, unknown>;
};

/**
 * Загружает OLAP-отчёт. Ответ может быть JSON или XML (iiko Server API).
 */
export async function fetchOlapReport(payload: OlapPayload): Promise<{ data?: unknown; raw?: string; isXml?: boolean }> {
  const res = await fetch(`${API_BASE}/reports/olap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Ошибка загрузки отчёта');
  }
  const raw = await res.text();
  try {
    return { data: JSON.parse(raw) };
  } catch {
    const isXml = /^\s*</.test(raw);
    return { raw, isXml };
  }
}

/** Сохранённые фильтры по хосту (для отчёта по продажам). */
export type HostFilters = {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  groupBy?: 'day' | 'week' | 'month';
  selectedDepartments?: string[];
  selectedPayTypes?: string[];
  /** Порядок торговых предприятий (точек) в таблице и графиках. */
  departmentOrder?: string[];
};

/** Получить сохранённые фильтры для хоста. host — адрес iiko без протокола (например la-poste-co.iiko.it). */
export async function getSettings(host: string): Promise<HostFilters> {
  const res = await fetch(`${API_BASE}/settings?host=${encodeURIComponent(host)}`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  const data = await res.json();
  return (data && typeof data === 'object') ? data : {};
}

/** Сохранить фильтры для хоста. */
export async function saveSettings(host: string, filters: HostFilters): Promise<void> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, filters }),
  });
  if (!res.ok) throw new Error('Не удалось сохранить настройки');
}

/** Список типов оплат из БД для хоста (для фильтров). */
export async function getPayTypes(host: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/pay-types?host=${encodeURIComponent(host)}`);
  if (!res.ok) throw new Error('Не удалось загрузить типы оплат');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Загрузить типы оплат из iiko в БД. Возвращает { count, list }. */
export async function syncPayTypes(serverUrl: string, token: string): Promise<{ count: number; list: string[] }> {
  const res = await fetch(`${API_BASE}/pay-types/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverUrl, token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Ошибка синхронизации');
  }
  const data = (await res.json()) as { count?: number; list?: string[] };
  return { count: data.count ?? 0, list: Array.isArray(data.list) ? data.list : [] };
}

/** Удалить тип оплаты из справочника. */
export async function deletePayType(host: string, payType: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pay-types`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, payType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Не удалось удалить');
  }
}
