/** PM2: cwd должен быть server/, чтобы dotenv подхватил server/.env */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'iiko-reports',
      cwd: path.join(__dirname, 'server'),
      script: 'dist/index.js',
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
