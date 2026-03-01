const env = process.env.NODE_ENV ?? 'development';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost';

export default {
  get env() {
    return env;
  },
  get port() {
    return port;
  },
  get appUrl() {
    return `${appBaseUrl}:${port}`;
  },
  isProd: () => env === 'production',
  isDev: () => env === 'development',
  isTest: () => env === 'test',
};
