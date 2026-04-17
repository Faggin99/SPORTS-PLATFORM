const { Pool, types } = require('pg');

// Return DATE columns as strings (YYYY-MM-DD) instead of JS Date objects
types.setTypeParser(1082, (val) => val); // DATE
types.setTypeParser(1114, (val) => val); // TIMESTAMP WITHOUT TZ
types.setTypeParser(1184, (val) => val); // TIMESTAMPTZ

// Parse DATABASE_URL - use explicit config to ensure password is a string
let poolConfig;
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  poolConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'sports_platform',
    user: process.env.DB_USER || 'sports_admin',
    password: process.env.DB_PASS || '',
  };
}

poolConfig.max = 10;
poolConfig.idleTimeoutMillis = 30000;
poolConfig.connectionTimeoutMillis = 10000;

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
