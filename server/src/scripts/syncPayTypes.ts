import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { getAccessToken, fetchOlapReportV2 } from '../lib/iikoClient.js';
import { normalizeHostKey } from '../db/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const serverUrl = process.env.IIKO_SERVER_URL;
  const login = process.env.IIKO_LOGIN;
  const password = process.env.IIKO_PASSWORD;

  if (!serverUrl || !login || !password) {
    console.error('[syncPayTypes] IIKO_SERVER_URL, IIKO_LOGIN и IIKO_PASSWORD должны быть заданы в .env');
    process.exit(1);
  }

  console.log('[syncPayTypes] Получаю токен iiko...');
  const token = await getAccessToken(serverUrl, login, password);

  console.log('[syncPayTypes] Загружаю OLAP SALES, группировка по PayTypes...');
  const raw = await fetchOlapReportV2(serverUrl, token, {
    report: 'SALES',
    from: '01.01.2000',
    to: '01.01.2100',
    groupByRowFields: ['PayTypes'],
    aggregateFields: ['DishSumInt'],
  });

  const data = JSON.parse(raw) as Record<string, unknown>;
  const report = (data.report ?? data) as Record<string, unknown>;

  let rows: unknown[] = [];
  if (Array.isArray(report.rows)) rows = report.rows;
  else if (Array.isArray(report.row)) rows = report.row;
  else if (Array.isArray(data.rows)) rows = data.rows as unknown[];
  else if (Array.isArray(data.row)) rows = data.row as unknown[];

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('[syncPayTypes] Нет строк с типами оплат в ответе OLAP.');
    process.exit(0);
  }

  type Row = Record<string, unknown>;
  const set = new Set<string>();
  for (const r of rows as Row[]) {
    const v = (r['PayTypes'] ?? r['payTypes'] ?? r['PayType']) as string | number | undefined;
    const name = v != null ? String(v).trim() : '';
    if (name) set.add(name);
  }

  if (set.size === 0) {
    console.log('[syncPayTypes] Не удалось извлечь ни одного значения PayTypes.');
    process.exit(0);
  }

  const hostKey = normalizeHostKey(serverUrl);
  console.log(`[syncPayTypes] Найдено ${set.size} уникальных типов оплат для хоста ${hostKey}. Сохраняю в MySQL...`);

  const pool = await mysql.createPool({
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'iiko_filters',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const CREATE_PAY_TYPES = `
    CREATE TABLE IF NOT EXISTS pay_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      host_key VARCHAR(512) NOT NULL,
      pay_type VARCHAR(255) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_host_type (host_key, pay_type)
    )
  `.trim();

  await pool.query(CREATE_PAY_TYPES);

  const values = Array.from(set.values());
  for (const name of values) {
    await pool.execute(
      'INSERT IGNORE INTO pay_types (host_key, pay_type, updated_at) VALUES (?, ?, NOW())',
      [hostKey, name]
    );
  }

  console.log('[syncPayTypes] Синхронизация завершена.');
  await pool.end();
}

main().catch((e) => {
  console.error('[syncPayTypes] Ошибка:', e instanceof Error ? e.message : e);
  process.exit(1);
});

