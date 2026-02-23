import mysql from 'mysql2/promise';
import { getPool, normalizeHostKey } from './store.js';
import { CREATE_DELIVERY_FLAG_TABLE } from './schema.js';
import { fetchOlapReportV2 } from '../lib/iikoClient.js';

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (tableReady) return tableReady;
  tableReady = getPool().query(CREATE_DELIVERY_FLAG_TABLE).then(() => {});
  return tableReady;
}

/** Список значений поля Delivery.IsDelivery для хоста (из справочника, загружается через sync). */
export async function getDeliveryFlagValues(host: string): Promise<string[]> {
  await ensureTable();
  const key = normalizeHostKey(host);
  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
    'SELECT value FROM delivery_flag_enum WHERE host_key = ? ORDER BY value',
    [key]
  );
  return rows.map((r) => String(r.value ?? ''));
}

/** Синхронизирует справочник значений Delivery.IsDelivery из OLAP iiko в БД. */
export async function syncDeliveryFlagValuesFromOlap(serverUrl: string, token: string): Promise<string[]> {
  await ensureTable();
  const to = new Date();
  const from = new Date(to.getFullYear() - 2, to.getMonth(), to.getDate());
  const fromStr = `${String(from.getDate()).padStart(2, '0')}.${String(from.getMonth() + 1).padStart(2, '0')}.${from.getFullYear()}`;
  const toStr = `${String(to.getDate()).padStart(2, '0')}.${String(to.getMonth() + 1).padStart(2, '0')}.${to.getFullYear()}`;

  const raw = await fetchOlapReportV2(serverUrl, token, {
    report: 'SALES',
    from: fromStr,
    to: toStr,
    groupByRowFields: ['Delivery.IsDelivery'],
    aggregateFields: ['DishSumInt'],
  });

  const data = JSON.parse(raw) as Record<string, unknown>;
  const report = (data.report ?? data) as Record<string, unknown>;

  let rows: unknown[] = [];
  if (Array.isArray(report?.rows)) rows = report.rows;
  else if (Array.isArray(report?.row)) rows = report.row;
  else if (Array.isArray((report as Record<string, unknown>)?.data)) rows = (report as Record<string, unknown>).data as unknown[];
  else if (Array.isArray(data.rows)) rows = data.rows as unknown[];
  else if (Array.isArray(data.row)) rows = data.row as unknown[];
  else if (Array.isArray(data.data)) rows = data.data as unknown[];
  else if (Array.isArray(data)) rows = data as unknown[];

  const keyName = 'Delivery.IsDelivery';
  const altKeys = ['delivery.isDelivery', 'DeliveryIsDelivery', 'DeliveryFlag'];
  const set = new Set<string>();
  for (const r of rows) {
    let val = '';
    if (Array.isArray(r)) {
      val = r[0] != null ? String(r[0]).trim() : '';
    } else if (r && typeof r === 'object') {
      const row = r as Record<string, unknown>;
      const v = row[keyName] ?? altKeys.map((k) => row[k]).find((x) => x != null);
      val = v != null ? String(v).trim() : '';
    }
    if (val && val.toLowerCase() !== keyName.toLowerCase()) set.add(val);
  }

  const hostKey = normalizeHostKey(serverUrl);
  await getPool().execute('DELETE FROM delivery_flag_enum WHERE host_key = ?', [hostKey]);
  const values = Array.from(set);
  for (const value of values) {
    await getPool().execute(
      'INSERT INTO delivery_flag_enum (host_key, value, updated_at) VALUES (?, ?, NOW())',
      [hostKey, value]
    );
  }
  return values;
}
