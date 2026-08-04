module.exports = {
  apps: [{
    name: 'sports-api-staging',
    script: 'server.js',
    cwd: '/var/www/sports-platform-staging/backend-node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'staging',
      PORT: 3002,
    },
    error_file: '/var/log/sports-platform-staging/sports-api-error.log',
    out_file: '/var/log/sports-platform-staging/sports-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
