/** PM2: запуск из корня проекта. Переменные из server/.env подхватываются приложением. */
module.exports = {
  apps: [
    {
      name: 'iiko-reports',
      cwd: __dirname,
      script: 'server/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
