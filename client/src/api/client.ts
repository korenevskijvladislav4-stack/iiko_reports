const API_ENV = import.meta.env.MODE === 'production' ? 'production' : 'development';
const API_BASE = `/api/v1/${API_ENV}`;

/** Проверяет, что ошибка от API — истёкший или невалидный токен (401). */
export function isTokenExpiredError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /401|Token is expired|invalid token/i.test(msg);
}

async function parseJsonData<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

async function authorizedFetch(
  token: string,
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

// ---------- Auth ----------

export type AuthResult = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
  };
  company: {
    id: string;
    name: string;
  };
};

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Ошибка входа');
  }
  return parseJsonData<AuthResult>(res);
}

export async function register(payload: {
  companyName: string;
  email: string;
  password: string;
  name: string;
}): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Ошибка регистрации');
  }
  return parseJsonData<AuthResult>(res);
}

export async function getMe(token: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  company: { id: string; name: string };
}> {
  const res = await authorizedFetch(token, `${API_BASE}/me`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Не удалось получить профиль');
  }
  return parseJsonData<{
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    company: { id: string; name: string };
  }>(res);
}

// ---------- iiko credentials (per company) ----------

export type IikoCredentials = {
  serverUrl: string;
  login: string;
  password?: string;
};

export async function getIikoCredentials(token: string): Promise<IikoCredentials | null> {
  const res = await authorizedFetch(token, `${API_BASE}/iiko-credentials`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Не удалось загрузить настройки iiko');
  }
  const data = await parseJsonData<{ serverUrl: string; login: string }>(res);
  if (!data) return null;
  return {
    serverUrl: data.serverUrl,
    login: data.login,
  };
}

export async function saveIikoCredentials(token: string, payload: IikoCredentials): Promise<void> {
  const res = await authorizedFetch(token, `${API_BASE}/iiko-credentials`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Не удалось сохранить настройки iiko');
  }
}

// ---------- Reports / OLAP ----------

export type OlapPayload = {
  report: 'SALES' | 'TRANSACTIONS' | 'DELIVERIES' | 'STOCK' | 'BALANCE';
  from: string; // DD.MM.YYYY
  to: string;
  groupByRowFields?: string[];
  groupByColFields?: string[];
  aggregateFields?: string[];
  /** Доп. фильтры OLAP (напр. ProductCategory: { filterType, values }) */
  filters?: Record<string, unknown>;
};

/**
 * Загружает OLAP-отчёт через наш бэкенд. Ответ может быть JSON или XML.
 * Бэкенд сам управляет токеном iiko: при отсутствии/истечении заново логинится и повторяет запрос.
 */
export async function fetchOlapReport(
  token: string,
  payload: OlapPayload
): Promise<{ data?: unknown; raw?: string; isXml?: boolean }> {
  const res = await authorizedFetch(token, `${API_BASE}/reports/olap`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Ошибка загрузки отчёта');
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await parseJsonData<unknown>(res);
    return { data };
  }
  const raw = await res.text();
  const isXml = /^\s*</.test(raw);
  return { raw, isXml };
}

// ---------- Report settings (per user + host inside бэкенда) ----------

export type HostFilters = {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  /** Доставка: пустая строка = все, иначе значение из справочника (Delivery.IsDelivery). */
  deliveryFilter?: string;
  selectedDepartments?: string[];
  selectedPayTypes?: string[];
  /** Порядок торговых предприятий (точек) в таблице и графиках. */
  departmentOrder?: string[];
};

export async function getSettings(token: string): Promise<HostFilters> {
  const res = await authorizedFetch(token, `${API_BASE}/settings`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  const data = await parseJsonData<HostFilters | null>(res);
  return (data && typeof data === 'object') ? data : {};
}

export async function saveSettings(token: string, filters: HostFilters): Promise<void> {
  const res = await authorizedFetch(token, `${API_BASE}/settings`, {
    method: 'POST',
    body: JSON.stringify({ filters }),
  });
  if (!res.ok) throw new Error('Не удалось сохранить настройки');
}

// ---------- Local reference data (pay types, delivery flags) ----------

export async function getDeliveryFlagValues(token: string): Promise<string[]> {
  const res = await authorizedFetch(token, `${API_BASE}/delivery-flags`);
  if (!res.ok) throw new Error('Не удалось загрузить значения фильтра Доставка');
  const data = await parseJsonData<unknown>(res);
  return Array.isArray(data) ? data : [];
}

export async function syncDeliveryFlagValues(token: string): Promise<{ count: number; list: string[] }> {
  const res = await authorizedFetch(token, `${API_BASE}/delivery-flags/sync`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Ошибка синхронизации');
  }
  const data = await parseJsonData<{ count?: number; list?: string[] }>(res);
  return { count: data.count ?? 0, list: Array.isArray(data.list) ? data.list : [] };
}

export async function deleteDeliveryFlagValue(token: string, value: string): Promise<void> {
  const res = await authorizedFetch(token, `${API_BASE}/delivery-flags`, {
    method: 'DELETE',
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Не удалось удалить значение доставки');
  }
}

export async function getPayTypes(token: string): Promise<string[]> {
  const res = await authorizedFetch(token, `${API_BASE}/pay-types`);
  if (!res.ok) throw new Error('Не удалось загрузить типы оплат');
  const data = await parseJsonData<unknown>(res);
  return Array.isArray(data) ? data : [];
}

export async function syncPayTypes(token: string): Promise<{ count: number; list: string[] }> {
  const res = await authorizedFetch(token, `${API_BASE}/pay-types/sync`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Ошибка синхронизации');
  }
  const data = await parseJsonData<{ count?: number; list?: string[] }>(res);
  return { count: data.count ?? 0, list: Array.isArray(data.list) ? data.list : [] };
}

export async function deletePayType(token: string, payType: string): Promise<void> {
  const res = await authorizedFetch(token, `${API_BASE}/pay-types`, {
    method: 'DELETE',
    body: JSON.stringify({ payType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Не удалось удалить');
  }
}

// ---------- HR (departments, positions, employees, schedules) ----------

export async function getDepartments(token: string) {
  const res = await authorizedFetch(token, `${API_BASE}/departments`);
  if (!res.ok) throw new Error('Не удалось загрузить подразделения');
  return parseJsonData<unknown>(res);
}

export async function createDepartment(token: string, name: string) {
  const res = await authorizedFetch(token, `${API_BASE}/departments`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Не удалось создать подразделение');
  return parseJsonData<unknown>(res);
}

export async function updateDepartment(token: string, id: string, name: string) {
  const res = await authorizedFetch(token, `${API_BASE}/departments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Не удалось обновить подразделение');
  return parseJsonData<unknown>(res);
}

export async function deleteDepartment(token: string, id: string) {
  const res = await authorizedFetch(token, `${API_BASE}/departments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Не удалось удалить подразделение');
}

export async function getPositions(token: string) {
  const res = await authorizedFetch(token, `${API_BASE}/positions`);
  if (!res.ok) throw new Error('Не удалось загрузить должности');
  return parseJsonData<unknown>(res);
}

export async function createPosition(token: string, name: string) {
  const res = await authorizedFetch(token, `${API_BASE}/positions`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Не удалось создать должность');
  return parseJsonData<unknown>(res);
}

export async function updatePosition(token: string, id: string, name: string) {
  const res = await authorizedFetch(token, `${API_BASE}/positions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Не удалось обновить должность');
  return parseJsonData<unknown>(res);
}

export async function deletePosition(token: string, id: string) {
  const res = await authorizedFetch(token, `${API_BASE}/positions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Не удалось удалить должность');
}

export async function getEmployees(token: string) {
  const res = await authorizedFetch(token, `${API_BASE}/employees`);
  if (!res.ok) throw new Error('Не удалось загрузить сотрудников');
  return parseJsonData<unknown>(res);
}

export async function createEmployee(
  token: string,
  payload: { name: string; email?: string; departmentId?: string; positionId?: string; hourlyRate?: number }
) {
  const res = await authorizedFetch(token, `${API_BASE}/employees`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Не удалось создать сотрудника');
  return parseJsonData<unknown>(res);
}

export async function updateEmployee(
  token: string,
  id: string,
  payload: { name?: string; email?: string; departmentId?: string; positionId?: string; hourlyRate?: number | null }
) {
  const res = await authorizedFetch(token, `${API_BASE}/employees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Не удалось обновить сотрудника');
  return parseJsonData<unknown>(res);
}

export async function deleteEmployee(token: string, id: string) {
  const res = await authorizedFetch(token, `${API_BASE}/employees/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Не удалось удалить сотрудника');
}

export async function getSchedules(
  token: string,
  params: { employeeId?: string; from?: string; to?: string } = {}
) {
  const search = new URLSearchParams();
  if (params.employeeId) search.set('employeeId', params.employeeId);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const qs = search.toString();
  const res = await authorizedFetch(token, `${API_BASE}/schedules${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Не удалось загрузить график');
  return parseJsonData<unknown>(res);
}

export async function createSchedule(
  token: string,
  payload: { employeeId: string; date: string; startTime?: string; endTime?: string; notes?: string }
) {
  const res = await authorizedFetch(token, `${API_BASE}/schedules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Не удалось создать смену');
  return parseJsonData<unknown>(res);
}

export async function updateSchedule(
  token: string,
  id: string,
  payload: { date?: string; startTime?: string; endTime?: string; notes?: string }
) {
  const res = await authorizedFetch(token, `${API_BASE}/schedules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Не удалось обновить смену');
  return parseJsonData<unknown>(res);
}

export async function deleteSchedule(token: string, id: string) {
  const res = await authorizedFetch(token, `${API_BASE}/schedules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Не удалось удалить смену');
}
