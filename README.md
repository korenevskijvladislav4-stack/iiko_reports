# iiko OLAP — веб-приложение для просмотра отчётов

Приложение для просмотра OLAP-отчётов сервиса iiko: **Node.js (Express)** + **React (TypeScript)** + **Ant Design**. Используется **iiko Server API** (BackOffice), авторизация — по логину и паролю.

## Стек

- **Backend:** Express, TypeScript, прокси к iiko Server API
- **Frontend:** React 18, TypeScript, Vite, Ant Design 5, React Router
- **Визуализация:** Ant Design (таблицы, карточки, формы)

## Документация API iiko

- **iiko Server API:** [ru.iiko.help — iikoServer API](https://ru.iiko.help/articles/api-documentations/iikoserver-api)
- Поддержка: api@iiko.ru

Авторизация: логин и пароль пользователя iikoOffice (BackOffice). Запрос токена: `GET {serverUrl}/resto/api/auth?login=...&pass=...` — в ответе строка с токеном. Все последующие запросы — с параметром `key=TOKEN` в URL.

## Установка и запуск

1. Установить зависимости:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

2. В каталоге `server` при необходимости создать `.env` из примера:
   ```bash
   cd server
   copy .env.example .env
   ```
   Указать `IIKO_SERVER_URL` (адрес вашего сервера iiko), если нужен по умолчанию. Токен не задаётся в .env — вход выполняется в интерфейсе (логин/пароль).

3. Запуск в режиме разработки (бэкенд + фронтенд):
   ```bash
   npm run dev
   ```
   - Фронтенд: http://localhost:5173  
   - Бэкенд: http://localhost:3001  

4. Сборка для продакшена:
   ```bash
   npm run build
   npm run start
   ```

## Структура проекта

```
├── client/                 # React + Vite + Ant Design
│   ├── src/
│   │   ├── api/            # запросы к /api
│   │   ├── components/
│   │   └── pages/
│   └── ...
├── server/                 # Express + TypeScript
│   ├── src/
│   │   ├── lib/            # iikoClient
│   │   └── routes/         # auth, reports (OLAP proxy)
│   └── ...
├── package.json
└── README.md
```

## API бэкенда

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/token` | Получение токена (body: `serverUrl`, `login`, `password`) |
| POST | `/api/reports/olap` | Запрос OLAP-отчёта (body: `serverUrl`, `token`, `report`, `from`, `to`, …) |
| GET  | `/api/health`       | Проверка работы сервера |

Типы отчёта: `SALES`, `TRANSACTIONS`, `DELIVERIES`, `STOCK`. Даты `from`, `to` — в формате **DD.MM.YYYY** (iiko OLAP принимает только этот формат с точками).
