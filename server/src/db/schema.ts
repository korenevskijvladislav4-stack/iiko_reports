/**
 * Схема БД для хранения настроек/фильтров по хосту (адрес iiko-сервера).
 * Один ключ на хост — фильтры отчёта по продажам (даты, группировка, выбранные точки).
 */

export const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS host_filters (
  host_key VARCHAR(512) PRIMARY KEY,
  filters JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`.trim();
