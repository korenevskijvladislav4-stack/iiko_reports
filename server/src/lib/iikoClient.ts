import crypto from 'node:crypto';

/**
 * Клиент для iiko Server API (BackOffice).
 * Документация: https://ru.iiko.help/articles/api-documentations/iikoserver-api
 * Авторизация: логин и пароль (пароль передаётся в виде SHA1) → GET api/auth?login=&pass=...
 * Все запросы: параметр key=TOKEN в query.
 */

/** Ошибка авторизации iiko (401/403) — токен истёк или недействителен. */
export class IikoAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'IikoAuthError';
  }
}

function normalizeServerUrl(url: string): string {
  const u = url.trim().replace(/\/+$/, '');
  return u + '/resto/';
}

function sha1(text: string): string {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex');
}

/**
 * Получить токен по логину и паролю (iiko Server API).
 * Пароль хешируется в SHA1 перед отправкой.
 * GET {serverUrl}/resto/api/auth?login=...&pass=<sha1(password)>
 */
export async function getAccessToken(
  serverUrl: string,
  login: string,
  password: string
): Promise<string> {
  const base = normalizeServerUrl(serverUrl);
  const passHash = sha1(password);
  const params = new URLSearchParams({ login, pass: passHash });
  const url = `${base}api/auth?${params.toString()}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new IikoAuthError(`iiko auth failed: ${res.status} ${text}`, res.status);
    }
    throw new Error(`iiko auth failed: ${res.status} ${text}`);
  }
  const token = (await res.text()).trim();
  if (!token) throw new Error('iiko auth: empty token');
  return token;
}

export type OlapReportType = 'SALES' | 'TRANSACTIONS' | 'DELIVERIES' | 'STOCK' | 'BALANCE';

export type IikoDepartment = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type IikoProduct = {
  id: string;
  name: string;
  groupName?: string;
};

/**
 * Преобразует DD.MM.YYYY в дату для OLAP v2.
 * Для периода типа DATE время не указывается (только YYYY-MM-DD).
 * toExclusive: true — возвращает следующий день (граница периода [from, to)).
 */
function ddMmYyyyToOlapDate(dateStr: string, toExclusive: boolean): string {
  const parts = dateStr.trim().split(/\./).map(Number);
  let d = parts[0];
  let m = parts[1];
  let y = parts[2];
  if (toExclusive) {
    d += 1;
    const lastDay = new Date(y, m, 0).getDate();
    if (d > lastDay) {
      d = 1;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export type OlapV2Params = {
  report: OlapReportType;
  from: string; // DD.MM.YYYY
  to: string;
  groupByRowFields?: string[];
  groupByColFields?: string[];
  aggregateFields?: string[];
  /** Дополнительные фильтры OLAP (напр. ProductCategory IncludeValues/ExcludeValues). */
  filters?: Record<string, unknown>;
};

/**
 * OLAP v2 — POST с JSON-телом. Документация: https://ru.iiko.help/articles/api-documentations/olap-otchety-v2
 * POST {serverUrl}/resto/api/v2/reports/olap?key=TOKEN
 */
export async function fetchOlapReportV2(
  serverUrl: string,
  token: string,
  params: OlapV2Params
): Promise<string> {
  const base = normalizeServerUrl(serverUrl);
  const fromDate = ddMmYyyyToOlapDate(params.from, false);
  const toDate = ddMmYyyyToOlapDate(params.to, true);

  const fromYear = fromDate.slice(0, 4);
  const toYear = toDate.slice(0, 4);
  const years: string[] = [];
  for (let y = Number(fromYear); y <= Number(toYear); y++) years.push(String(y));

  const filters: Record<string, unknown> = {
    'OpenDate.Typed': {
      filterType: 'DateRange',
      periodType: 'CUSTOM',
      from: fromDate,
      to: toDate,
    },
    "DeletedWithWriteoff": {
            "filterType": "IncludeValues",
            "values": [
                "NOT_DELETED"
            ]
        },
        "YearOpen": {
            "filterType": "IncludeValues", 
            "values": [
                "2025","2026","2027"
            ] 
        }
  };
  if (years.length > 0) filters.YearOpen = { filterType: 'IncludeValues', values: years };
  if (params.filters && Object.keys(params.filters).length > 0) {
    Object.assign(filters, params.filters);
  }

  const body = {
    reportType: params.report,
    buildSummary: true,
    groupByRowFields: params.groupByRowFields ?? ['OpenDate.Typed', 'Department'],
    groupByColFields: params.groupByColFields ?? [],
    aggregateFields: params.aggregateFields ?? [
      'DishSumInt',
      'GuestNum',
      'DishAmountInt',
      'UniqOrderId',
      'DishDiscountSumInt',
      'DishDiscountSumInt.average',
      'DishAmountInt.PerOrder',
      'DishReturnSum',
    ],
    filters,
  };

  const url = `${base}api/v2/reports/olap?key=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new IikoAuthError(`iiko OLAP v2 failed: ${res.status} ${text}`, res.status);
    }
    throw new Error(`iiko OLAP v2 failed: ${res.status} ${text}`);
  }
  return res.text();
}

/**
 * Список подразделений (departments) из iiko.
 * Типичный эндпоинт: GET {serverUrl}/resto/api/departments?key=TOKEN
 */
export async function fetchIikoDepartments(serverUrl: string, token: string): Promise<IikoDepartment[]> {
  const base = normalizeServerUrl(serverUrl);
  const url = `${base}api/departments?key=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    if (res.status === 404) return [];
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new IikoAuthError(`iiko departments failed: ${res.status} ${text}`, res.status);
    }
    throw new Error(`iiko departments failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((d: any) => ({
      id: String(d.id),
      name: String(d.name ?? d.departmentName ?? '').trim(),
      isActive: d.isActive ?? d.active ?? true,
    }))
    .filter((d) => d.id && d.name);
}

/**
 * Справочник номенклатуры (продукты) из iiko.
 * Эндпоинт: GET {serverUrl}/resto/api/v2/entities/products/list?key=TOKEN
 */
export async function fetchIikoProducts(serverUrl: string, token: string): Promise<IikoProduct[]> {
  const base = normalizeServerUrl(serverUrl);
  const url = `${base}api/v2/entities/products/list?key=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new IikoAuthError(`iiko products failed: ${res.status} ${text}`, res.status);
    }
    throw new Error(`iiko products failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((p: any) => ({
      id: String(p.id),
      name: String(p.name ?? p.productName ?? '').trim(),
      groupName: p.parentName ? String(p.parentName).trim() : undefined,
    }))
    .filter((p) => p.id && p.name);
}
