module.exports = {
  apps: [{
    name: 'sports-api',
    script: 'server.js',
    cwd: '/var/www/sports-platform/backend-node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: '/var/log/sports-platform/sports-api-error.log',
    out_file: '/var/log/sports-platform/sports-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
