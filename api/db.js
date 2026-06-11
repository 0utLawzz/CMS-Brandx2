const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    return false;
  }
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS trademarks (
        id          SERIAL PRIMARY KEY,
        status_run  VARCHAR(20)  DEFAULT 'Run',
        stage       VARCHAR(30),
        sr_no       VARCHAR(60),
        tm_no       VARCHAR(30),
        folder_name VARCHAR(255),
        date_l      VARCHAR(60),
        class       VARCHAR(10),
        class_desc  TEXT,
        app_type    VARCHAR(20),
        app_name    VARCHAR(255),
        app_so      VARCHAR(255),
        app_cnic    VARCHAR(20),
        issue_date  VARCHAR(60),
        expiry_date VARCHAR(60),
        app_trade   VARCHAR(255),
        app_add     TEXT,
        year        VARCHAR(4),
        con_name    VARCHAR(255),
        con_add     TEXT,
        img         VARCHAR(255),
        no_img      VARCHAR(255),
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Schema migration complete');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection, runMigrations };
