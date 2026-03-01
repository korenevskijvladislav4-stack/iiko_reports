import App from './app.js';

const app = new App();
const server = app.express;

app.connectPrisma().catch((e) => {
  console.error('[server] Prisma connect failed:', e);
  process.exit(1);
});

export default server;
