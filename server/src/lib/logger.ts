const isDev = process.env.NODE_ENV !== 'production';

export default {
  info: (msg: string, ...args: unknown[]) => {
    console.log(`[INFO] ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${msg}`, ...args);
  },
  debug: (msg: string, ...args: unknown[]) => {
    if (isDev) console.debug(`[DEBUG] ${msg}`, ...args);
  },
};
