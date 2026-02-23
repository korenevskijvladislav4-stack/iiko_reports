import mysql from 'mysql2/promise';
import { getPool } from './store.js';
import { normalizeHostKey } from './store.js';
import { fetchOlapReportV2 } from '../lib/iikoClient.js';

const CREATE_PAY_TYPES_TABLE = `
CREATE TABLE IF NOT EXISTS pay_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host_key VARCHAR(512) NOT NULL,
  pay_type VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_host_type (host_key, pay_type)
)
`.trim();

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (tableReady) return tableReady;
  tableReady = getPool().query(CREATE_PAY_TYPES_TABLE).then(() => {});
  return tableReady;
}

export async function getPayTypes(host: string): Promise<string[]> {
  await ensureTable();
  const key = normalizeHostKey(host);
  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
    'SELECT pay_type FROM pay_types WHERE host_key = ? ORDER BY pay_type',
    [key]
  );
  return rows.map((r) => String(r.pay_type ?? ''));
}

/** Синхронизирует справочник типов оплат из OLAP iiko в БД. Возвращает список сохранённых названий. */
export async function syncPayTypesFromOlap(serverUrl: string, token: string): Promise<string[]> {
  await ensureTable();
  // Период: последние 2 года (iiko может не отдавать данные за 2000–2100)
  const to = new Date();
  const from = new Date(to.getFullYear() - 2, to.getMonth(), to.getDate());
  const fromStr = `${String(from.getDate()).padStart(2, '0')}.${String(from.getMonth() + 1).padStart(2, '0')}.${from.getFullYear()}`;
  const toStr = `${String(to.getDate()).padStart(2, '0')}.${String(to.getMonth() + 1).padStart(2, '0')}.${to.getFullYear()}`;

  const raw = await fetchOlapReportV2(serverUrl, token, {
    report: 'SALES',
    from: fromStr,
    to: toStr,
    groupByRowFields: ['PayTypes'],
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

  const set = new Set<string>();
  for (const r of rows) {
    let name = '';
    if (Array.isArray(r)) {
      // Строка как массив значений: [PayTypes, DishSumInt, ...]
      const first = r[0];
      name = first != null ? String(first).trim() : '';
    } else if (r && typeof r === 'object') {
      const row = r as Record<string, unknown>;
      const v = row['PayTypes'] ?? row['payTypes'] ?? row['PayType'];
      name = v != null ? String(v).trim() : '';
    }
    if (name && name !== 'PayTypes' && name.toLowerCase() !== 'paytypes') set.add(name);
  }

  const hostKey = normalizeHostKey(serverUrl);
  const values = Array.from(set.values());
  for (const name of values) {
    await getPool().execute(
      'INSERT IGNORE INTO pay_types (host_key, pay_type, updated_at) VALUES (?, ?, NOW())',
      [hostKey, name]
    );
  }
  return values;
}

/** Удаляет один тип оплаты из справочника для хоста. */
export async function deletePayType(host: string, payType: string): Promise<boolean> {
  await ensureTable();
  const key = normalizeHostKey(host);
  const name = String(payType ?? '').trim();
  if (!name) return false;
  const [result] = await getPool().execute(
    'DELETE FROM pay_types WHERE host_key = ? AND pay_type = ?',
    [key, name]
  );
  const ok = result && typeof (result as { affectedRows?: number }).affectedRows === 'number';
  return ok ? (result as { affectedRows: number }).affectedRows > 0 : false;
}
