const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    return false;
  }
}

// ─── Auto-migrate: safely add new V2 columns if they don't exist ─────────────
async function runMigrations() {
  const newCols = [
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS status_run  ENUM('Run','Processing','Done') DEFAULT 'Run'",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS stage       VARCHAR(30)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS sr_no       VARCHAR(60)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS tm_no       VARCHAR(30)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS date_l      VARCHAR(60)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS class_desc  TEXT",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS app_type    ENUM('SOLE','PARTNER','COMPANY')",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS app_name    VARCHAR(255)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS app_so      VARCHAR(255)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS app_cnic    VARCHAR(20)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS issue_date  VARCHAR(60)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(60)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS app_trade   VARCHAR(255)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS app_add     TEXT",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS year        VARCHAR(4)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS con_name    VARCHAR(255)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS con_add     TEXT",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS img         VARCHAR(255)",
    "ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS no_img      VARCHAR(255)",
  ];

  // Seed new cols from old cols for existing records
  const seedSql = `
    UPDATE trademarks SET
      sr_no    = COALESCE(NULLIF(sr_no,''),    case_no),
      app_name = COALESCE(NULLIF(app_name,''), name),
      tm_no    = COALESCE(NULLIF(tm_no,''),    CAST(tm_number AS CHAR)),
      stage    = COALESCE(NULLIF(stage,''),    status),
      date_l   = COALESCE(NULLIF(date_l,''),   date)
    WHERE (sr_no IS NULL OR sr_no = '') AND (case_no IS NOT NULL AND case_no != '')
  `;

  try {
    for (const sql of newCols) {
      try { await pool.execute(sql); } catch (e) {
        if (!e.message.includes('Duplicate column')) console.warn('Migration warn:', e.message);
      }
    }
    try { await pool.execute(seedSql); } catch (e) { console.warn('Seed warn:', e.message); }
    console.log('✅ Schema migration complete (V2 columns ready)');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

module.exports = { pool, testConnection, runMigrations };
