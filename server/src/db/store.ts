import mysql from 'mysql2/promise';
import { CREATE_TABLE, CREATE_DELIVERY_FLAG_TABLE } from './schema.js';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST ?? 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER ?? 'root',
      password: process.env.MYSQL_PASSWORD ?? '',
      database: process.env.MYSQL_DATABASE ?? 'iiko_filters',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (tableReady) return tableReady;
  tableReady = (async () => {
    await getPool().query(CREATE_TABLE);
  })();
  return tableReady;
}

/** Создать таблицы при старте приложения (host_filters, delivery_flag_values и т.д.). */
export async function ensureSchema(): Promise<void> {
  await ensureTable();
  await getPool().query(CREATE_DELIVERY_FLAG_TABLE);
}

/** Нормализованный ключ хоста (без протокола, без слэша в конце). */
export function normalizeHostKey(host: string): string {
  return host.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || host;
}

export type HostFilters = {
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;     // YYYY-MM-DD
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  /** Доставка: пустая = все, иначе значение из справочника Delivery.IsDelivery */
  deliveryFilter?: string;
  selectedDepartments?: string[];
  selectedPayTypes?: string[];
  /** Порядок торговых предприятий (точек) для отчёта по продажам. */
  departmentOrder?: string[];
};

export async function getFilters(host: string): Promise<HostFilters | null> {
  await ensureTable();
  const key = normalizeHostKey(host);
  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
    'SELECT filters FROM host_filters WHERE host_key = ?',
    [key]
  );
  const row = rows[0];
  if (!row || row.filters == null) return null;
  const raw = row.filters;
  if (typeof raw === 'object' && raw !== null) return raw as HostFilters;
  try {
    return typeof raw === 'string' ? (JSON.parse(raw) as HostFilters) : null;
  } catch {
    return null;
  }
}

export async function setFilters(host: string, filters: HostFilters): Promise<void> {
  await ensureTable();
  const key = normalizeHostKey(host);
  const json = JSON.stringify(filters);
  await getPool().execute(
    `INSERT INTO host_filters (host_key, filters, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE filters = VALUES(filters), updated_at = NOW()`,
    [key, json]
  );
}
