import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import appConfig from '@/config/app.config.js';
import environment from '@/lib/environment.js';
import errorHandler from '@/middlewares/error-handler.js';
import routes from '@/modules/index.js';
import home from './home.js';
import prisma from '@/lib/prisma.js';

class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.setMiddlewares();
    this.express.disable('x-powered-by');
    this.setRoutes();
    this.express.use(errorHandler);
  }

  private setMiddlewares(): void {
    this.express.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
    this.express.use(morgan(environment.isDev() ? 'dev' : 'combined'));
    this.express.use(helmet());
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
  }

  private setRoutes(): void {
    const { version } = appConfig.api;
    const env = environment.env;
    this.express.use('/', home);
    this.express.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));
    this.express.use(`/api/${version}/${env}`, routes);
  }

  public async connectPrisma(): Promise<void> {
    await prisma.$connect();
  }
}

export default App;
