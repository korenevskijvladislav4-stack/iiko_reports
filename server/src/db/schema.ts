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

/**
 * Справочник значений поля Delivery.IsDelivery (DeliveryFlag) — загружается из iiko OLAP (sync), как типы оплат.
 * Отдельная таблица delivery_flag_enum, чтобы не менять старую delivery_flag_values (value_delivery/value_onsite).
 */
export const CREATE_DELIVERY_FLAG_TABLE = `
CREATE TABLE IF NOT EXISTS delivery_flag_enum (
  host_key VARCHAR(512) NOT NULL,
  value VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_host_value (host_key, value)
)
`.trim();
