
/**
 * Standalone seed runner
 * Usage: node src/database/seed-runner.js
 */

require('dotenv').config();
const pool = require('./pool');
const seed = require('./seed');

async function run() {
  try {
    await seed(pool);
    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

run();
