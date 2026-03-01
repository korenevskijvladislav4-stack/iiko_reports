# Архитектура приложения: мультитенантность, авторизация, HR и iiko

Бэкенд реализован по шаблону **expressjs-typescript-prisma-boilerplate**: модульная структура (controller / service / route), Prisma ORM, единая точка входа (app → server → index), конфиг, либы, мидлвары.

## Цели

1. **Полноценная авторизация/регистрация** — пользователи входят по email/паролю.
2. **Мультитенантность по компаниям** — разные компании не видят данные друг друга.
3. **Креды iiko на пользователя** — каждый пользователь задаёт свои учётные данные для доступа к iiko (сервер, логин, пароль).
4. **HR-данные** — сотрудники, должности, подразделения, график работы (внутри приложения).

---

## Модель данных

### Сущности

| Сущность | Описание |
|----------|----------|
| **Company** | Компания (арендатор). Все данные привязаны к `company_id`. |
| **User** | Пользователь приложения. Принадлежит одной компании. Вход по email + пароль. |
| **User Iiko Credentials** | Учётные данные iiko для пользователя: serverUrl, login, password (хранится зашифрованно). Один набор на пользователя. |
| **Department** | Подразделение компании (справочник). |
| **Position** | Должность (справочник). |
| **Employee** | Сотрудник: ФИО, подразделение, должность. |
| **EmployeeSchedule** | График: сотрудник, дата, время начала/окончания смены (или тип смены). |

### Изоляция данных

- Все запросы к БД по бизнес-данным фильтруются по `company_id` из JWT текущего пользователя.
- Отчёты и справочники iiko (типы оплат, флаги доставки, фильтры) привязаны к компании и/или к пользователю; при выборке всегда проверяется `company_id`.

---

## База данных (MySQL)

### Новые таблицы

```sql
-- Компании (тенанты)
companies (id, name, created_at)

-- Пользователи приложения
users (id, company_id FK, email UNIQUE, password_hash, name, role, created_at)

-- Учётные данные iiko (на пользователя)
user_iiko_credentials (id, user_id FK, server_url, login, password_encrypted, created_at)
-- один user_id — одна запись (ON DUPLICATE KEY UPDATE при сохранении)

-- Справочники компании
departments (id, company_id FK, name, created_at)
positions (id, company_id FK, name, created_at)

-- Сотрудники
employees (id, company_id FK, department_id FK, position_id FK, name, email NULL, created_at)

-- График сотрудников
employee_schedules (id, company_id FK, employee_id FK, date, start_time, end_time, notes NULL, created_at)
```

### Изменения существующих таблиц

- **host_filters** — ключ `(user_id, host_key)` вместо `host_key`, чтобы фильтры отчётов были у каждого пользователя свои.
- **pay_types**, **delivery_flag_enum** — добавить `company_id`; уникальный ключ `(company_id, host_key, ...)`, чтобы данные iiko были изолированы по компании и по хосту.

---

## Авторизация

### Регистрация

- **POST /api/auth/register**  
  Тело: `{ companyName, email, password, name }`.  
  Создаётся компания и первый пользователь (роль `owner` или `admin`). Пароль хешируется (bcrypt). Возврат: JWT + данные пользователя и компании.

### Вход

- **POST /api/auth/login**  
  Тело: `{ email, password }`.  
  Проверка пароля, выдача JWT. В payload: `userId`, `companyId`, `email`, `role`.

### JWT

- Все защищённые маршруты проверяют JWT (cookie или заголовок `Authorization: Bearer ...`).
- В каждом запросе к БД используется `company_id` из токена — данные другой компании не возвращаются.

---

## Креды iiko

- Пользователь в настройках вводит: адрес сервера iiko, логин, пароль.
- **Сохранение**: пароль шифруется (AES-256 с ключом из env) и сохраняется в `user_iiko_credentials` по `user_id`.
- **Использование**: при запросах отчётов/синхронизации берутся креды текущего пользователя; пароль расшифровывается, вызывается `getAccessToken(serverUrl, login, password)` и далее OLAP/другие вызовы iiko.
- Токен iiko можно не хранить в БД, а получать по требованию (или кэшировать в памяти на короткое время).

---

## API (кратко)

Базовый путь: **`/api/v1/{env}`** (например `/api/v1/development`). Все защищённые маршруты требуют заголовок `Authorization: Bearer <JWT>`.

| Группа | Маршруты | Примечание |
|--------|----------|------------|
| Auth | POST auth/register, POST auth/login, POST auth/token | Без JWT (token — проверка кредов iiko) |
| Me | GET me | Текущий user + company, по JWT |
| Iiko | GET/PUT iiko-credentials | Креды текущего пользователя |
| Reports | POST reports/olap | JWT + креды пользователя из БД |
| Settings | GET/POST settings | Фильтры отчётов по user + host |
| Pay-types | GET pay-types, POST pay-types/sync, DELETE pay-types | По company + host |
| Delivery-flags | GET delivery-flags, POST delivery-flags/sync, DELETE delivery-flags | По company + host |
| HR | CRUD departments, positions, employees, schedules | Все с `company_id` из JWT |

---

## Фронтенд

- **Роуты**: `/login`, `/register`, затем закрытая зона под layout’ом.
- **AuthContext**: хранение JWT, user, company; при 401 — редирект на `/login`.
- **Настройки**: экран «Подключение iiko» — форма serverUrl, login, password (сохранение через API кредов).
- **HR**: разделы «Подразделения», «Должности», «Сотрудники», «График» — списки и формы CRUD, данные только своей компании.

---

## Структура бэкенда (expressjs-typescript-prisma-boilerplate)

```
server/
├── prisma/
│   └── schema.prisma       # Модели Prisma (MySQL)
├── src/
│   ├── index.ts            # Точка входа, запуск сервера
│   ├── app.ts              # Класс App: middlewares, routes, errorHandler
│   ├── server.ts           # Создание app, connectPrisma
│   ├── home.ts             # Роуты /, /health
│   ├── config/            # app.config, env
│   ├── lib/                # prisma, api, errors, logger, environment, iikoClient, cache, encrypt
│   ├── middlewares/        # error-handler, auth (JWT)
│   ├── modules/           # Модули: auth, me, iiko-credentials, reports, settings, pay-types, delivery-flags, departments, positions, employees, schedules
│   │   └── <module>/
│   │       ├── <module>.controller.ts
│   │       ├── <module>.service.ts
│   │       └── <module>.route.ts
│   ├── types/              # common.type (CustomResponse, JwtPayload)
│   └── utils/              # constants, print-app-info
```

Запуск: `npm run dev` (из папки server). Перед первым запуском: скопировать `.env.example` в `.env`, задать `DATABASE_URL`, выполнить `npx prisma migrate dev` или `npx prisma db push`.

---

## Безопасность

- Пароли пользователей: только bcrypt hash в БД.
- Пароли iiko в БД: только в зашифрованном виде (AES, ключ в env).
- На каждом API: проверка JWT и подстановка `company_id` в запросы.
- Регистрация: при необходимости — капча или инвайты, чтобы избежать спама.

Эта схема даёт изолированные по компаниям данные, персональные креды iiko и полноценный учёт сотрудников и графика внутри приложения.
