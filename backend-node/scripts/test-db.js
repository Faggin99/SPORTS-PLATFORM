require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query('SELECT count(*) as n FROM clubs')
  .then(r => console.log('DB OK - clubs:', r.rows[0].n))
  .catch(e => console.log('DB ERROR:', e.message))
  .finally(() => p.end());
