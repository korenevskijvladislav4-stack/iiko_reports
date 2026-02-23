import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env из папки server (важно при запуске через npm run dev --prefix server)
dotenv.config({ path: path.join(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { reportsRouter } from './routes/reports.js';
import { authRouter } from './routes/auth.js';
import { settingsRouter } from './routes/settings.js';
import { payTypesRouter } from './routes/payTypes.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/pay-types', payTypesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// В production отдаём собранный клиент (одно приложение на один порт)
if (isProduction) {
  const clientDir = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }
}

function startServer(port: number) {
  const server = app.listen(port, () => {
    console.log(`[server] http://localhost:${port}`);
    if (port !== PORT) {
      console.warn(`Если запросы к /api не проходят, в client/vite.config.ts укажите proxy target: http://localhost:${port}`);
    }
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Порт ${port} занят, пробуем ${port + 1}...`);
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}
startServer(PORT);
