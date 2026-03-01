import App from './app.js';

const app = new App();
const server = app.express;

app.connectPrisma().catch((e) => {
  const err = e instanceof Error ? e : new Error(String(e));
  console.error('[server] Prisma connect failed:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err);
  process.exit(1);
});

export default server;
