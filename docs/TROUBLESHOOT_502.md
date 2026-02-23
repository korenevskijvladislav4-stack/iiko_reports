# 502 Bad Gateway — что проверить

502 значит: Nginx не может получить ответ от приложения на порту 3001.

## 1. Запущено ли приложение

```bash
sudo systemctl status iiko-reports
```

Должно быть `active (running)`. Если `failed` или `inactive` — запустите:

```bash
sudo systemctl start iiko-reports
```

## 2. Слушает ли порт 3001

```bash
sudo ss -tlnp | grep 3001
# или
curl -s http://127.0.0.1:3001/api/health
```

Если порт не слушается или curl даёт «Connection refused» — процесс не запущен или упал. Смотрите логи:

```bash
journalctl -u iiko-reports -n 50 --no-pager
```

## 3. Типичные причины

- **Нет .env или неверный путь** — приложение ищет `server/.env`. Запуск из корня проекта: `WorkingDirectory=/var/www/iiko_reports` (или где у вас репа), в нём должна быть папка `server` с `.env`.
- **Ошибка MySQL** — в логах будет «ECONNREFUSED» или «Access denied». Проверьте в `.env`: `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`; что MySQL запущен: `sudo systemctl status mysql`.
- **Нет NODE_ENV=production** — в unit-файле должно быть `Environment=NODE_ENV=production`.
- **Права** — процесс должен запускаться от пользователя, у которого есть доступ к папке проекта и к `server/.env`.

## 4. Конфиг Nginx

Директива `root /var/www/iiko_reports/dist;` при текущем `location /` не используется (всё уходит в proxy_pass). Её можно убрать. Важно: приложение должно быть запущено и слушать **127.0.0.1:3001** или **0.0.0.0:3001**.
