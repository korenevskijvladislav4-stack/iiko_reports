# Деплой на VPS (Ubuntu)

Бэкенд и клиент в **одной репозитории**. На VPS собираете всё, поднимаете один процесс Node — он отдаёт и API, и фронт.

## 1. Подготовка VPS

```bash
# Обновление и базовые пакеты
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nodejs npm

# Node 18+ (если в репозитории старая версия)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL (для настроек и справочников)
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Создайте БД и пользователя:

```bash
sudo mysql
```

```sql
CREATE DATABASE iiko_filters CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'iiko'@'localhost' IDENTIFIED BY 'ваш_пароль';
GRANT ALL ON iiko_filters.* TO 'iiko'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 2. Клонирование и сборка

```bash
cd /opt   # или домашний каталог
sudo git clone https://github.com/ВАШ_РЕПО/iiko-olap-reports.git
cd iiko-olap-reports
```

Создайте `.env` в папке **server** и подставьте свои значения:

```bash
cp server/.env.example server/.env
nano server/.env
```

Минимум: `NODE_ENV=production`, `PORT`, параметры MySQL (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`). Остальное — по необходимости.

Сборка (из корня репозитория):

```bash
npm install
npm run build
```

Так собираются и сервер, и клиент. Готовый фронт лежит в `client/dist`, сервер при `NODE_ENV=production` будет отдавать его сам.

## 3. Запуск через systemd

Создайте юнит (одно приложение — один процесс):

```bash
sudo nano /etc/systemd/system/iiko-reports.service
```

Содержимое:

```ini
[Unit]
Description=iiko OLAP Reports
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/iiko-olap-reports
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node server/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Подставьте свой путь в `WorkingDirectory`. Пользователь может быть `www-data` или отдельный (например `iiko`). Запуск:

```bash
sudo systemctl daemon-reload
sudo systemctl enable iiko-reports
sudo systemctl start iiko-reports
sudo systemctl status iiko-reports
```

Логи: `journalctl -u iiko-reports -f`.

## 4. Nginx (обратный прокси)

Приложение слушает порт 3001; Nginx принимает 80/443 и проксирует на него.

Установка Nginx (если ещё не стоит):

```bash
sudo apt install -y nginx
```

Конфиг лежит в репозитории. На VPS из папки проекта:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/iiko-reports
# Отредактируйте server_name (ваш-домен.ru или _ для доступа по IP):
# sudo nano /etc/nginx/sites-available/iiko-reports

sudo ln -sf /etc/nginx/sites-available/iiko-reports /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

SSL (Let's Encrypt):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ваш-домен.ru
```

После certbot Nginx сам подставит `listen 443 ssl` и сертификаты.

## 5. Обновление после изменений в коде

```bash
cd /opt/iiko-olap-reports
sudo -u www-data git pull   # или ваш пользователь
npm install
npm run build
sudo systemctl restart iiko-reports
```

## Кратко

| Вопрос | Ответ |
|--------|--------|
| Бэк и клиент отдельно или вместе? | **Вместе**: одна репа, одна сборка `npm run build`, один процесс Node. |
| Где хранятся настройки/справочники? | В MySQL, параметры в `server/.env`. |
| Какой порт слушает приложение? | По умолчанию 3001 (меняется через `PORT` в `.env`). |
| Откуда отдаётся фронт? | Из того же Node: в production он раздаёт `client/dist` и отдаёт API с `/api`. |
