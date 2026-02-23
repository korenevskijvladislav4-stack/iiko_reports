#!/bin/bash
# Запускать на VPS из корня репозитория после git pull.
# Использование: ./scripts/deploy-vps.sh

set -e
echo "[deploy] Install dependencies..."
npm install
echo "[deploy] Build server + client..."
npm run build
echo "[deploy] Restart service (если настроен systemd)..."
sudo systemctl restart iiko-reports 2>/dev/null || echo "[deploy] Сервис iiko-reports не найден — перезапустите процесс вручную."
echo "[deploy] Готово."
