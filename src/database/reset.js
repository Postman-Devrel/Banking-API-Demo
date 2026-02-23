
/**
 * Workshop Reset Script
 * Drops all tables, recreates schema, and re-seeds data.
 * Usage: node src/database/reset.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');
const seed = require('./seed');

async function reset() {
  console.log('Resetting workshop database...');

  await pool.query('DROP TABLE IF EXISTS transactions CASCADE');
  await pool.query('DROP TABLE IF EXISTS accounts CASCADE');
  await pool.query('DROP TABLE IF EXISTS api_keys CASCADE');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  await seed(pool);

  console.log('Workshop database reset complete.');
  await pool.end();
}

reset().catch(err => {
  console.error('Reset failed:', err);
  throw err;
});
