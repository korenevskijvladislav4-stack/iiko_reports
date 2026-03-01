import 'dotenv/config';

console.log('[server] Starting...');

import server from './server.js';
import { printAppInfo } from '@/utils/print-app-info.js';
import appConfig from '@/config/app.config.js';
import environment from '@/lib/environment.js';
import prisma from '@/lib/prisma.js';

const port = environment.port;

if (!process.env.DATABASE_URL) {
  console.error('[server] DATABASE_URL is not set. Set it in .env or environment.');
  process.exit(1);
}

const host = process.env.HOST ?? '0.0.0.0';

server
  .listen(port, host, () => {
    const { api } = appConfig;
    const appUrl = environment.appUrl;
    const apiUrl = `${appUrl}/api/${api.version}/${environment.env}`;
    printAppInfo(port, environment.env, appUrl, apiUrl);
    console.log(`[server] Listening on ${host}:${port}`);
  })
  .on('error', (err: NodeJS.ErrnoException) => {
    console.error('[server] Listen failed:', err.message);
    if (err.code === 'EADDRINUSE') console.error(`[server] Port ${port} is already in use.`);
    process.exit(1);
  });

process.on('SIGINT', () => {
  prisma.$disconnect().then(() => {
    console.log('[server] Prisma disconnected.');
    process.exit(0);
  });
});
