const { pool } = require('./db');

async function resetDb() {
  const client = await pool.connect();
  try {
    console.log('Truncating tables...');
    await client.query('TRUNCATE TABLE trademarks, audit_logs CASCADE');
    console.log('Database has been reset to 0 records.');
  } catch (err) {
    console.error('Error resetting database:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

resetDb();
