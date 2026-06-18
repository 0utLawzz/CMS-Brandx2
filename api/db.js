const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT NOW() AS now');
    console.log('✅ PostgreSQL connected —', rows[0].now);
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
    // ── Create trademarks table (minimal skeleton, safe for fresh DB) ────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS trademarks (
        id         SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Add new columns if they don't exist (safe for existing tables) ───────────
    const newCols = [
      ['created_at',         'TIMESTAMP DEFAULT NOW()'],
      ['updated_at',         'TIMESTAMP DEFAULT NOW()'],
      ['filing_date',        'VARCHAR(60)'],
      ['sr_no',              'VARCHAR(60)'],
      ['tm_no',              'VARCHAR(30)'],
      ['applicant_name',     'VARCHAR(255)'],
      ['applicant_so',       'VARCHAR(255)'],
      ['applicant_cnic',     'VARCHAR(20)'],
      ['applicant_type',     'VARCHAR(20)'],
      ['applicant_address',  'TEXT'],
      ['class',              'VARCHAR(10)'],
      ['class_desc',         'TEXT'],
      ['tm_trade',           'VARCHAR(255)'],
      ['consultant_name',    'VARCHAR(255)'],
      ['consultant_address', 'TEXT'],
      ['stage',              'VARCHAR(80)'],
      ['sub_stage',          'VARCHAR(120)'],
      ['assigned_person',    'VARCHAR(50)'],
      ['assigned_city',      'VARCHAR(50)'],
      ['issue_date',         'VARCHAR(60)'],
      ['expiry_date',        'VARCHAR(60)'],
      ['folder_name',        'VARCHAR(255)'],
      ['img',                'VARCHAR(255)'],
      ['notes',              'TEXT'],
      ['year',               'VARCHAR(4)'],
      ['archived',           'BOOLEAN DEFAULT FALSE'],
    ];
    for (const [col, type] of newCols) {
      await client.query(
        `ALTER TABLE trademarks ADD COLUMN IF NOT EXISTS ${col} ${type}`
      );
    }

    // ── One-time data migration from old column names (silently skip if n/a) ─────
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trademarks' AND column_name='app_name') THEN
          UPDATE trademarks SET applicant_name = app_name   WHERE applicant_name IS NULL AND app_name IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trademarks' AND column_name='case_no') THEN
          UPDATE trademarks SET sr_no = case_no              WHERE sr_no IS NULL AND case_no IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trademarks' AND column_name='tm_number') THEN
          UPDATE trademarks SET tm_no = tm_number            WHERE tm_no IS NULL AND tm_number IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trademarks' AND column_name='date_l') THEN
          UPDATE trademarks SET filing_date = date_l         WHERE filing_date IS NULL AND date_l IS NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trademarks' AND column_name='status') THEN
          UPDATE trademarks SET stage = status               WHERE stage IS NULL AND status IS NOT NULL;
        END IF;
      END
      $$;
    `);

    // ── Audit Logs table ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id           SERIAL PRIMARY KEY,
        record_id    INTEGER REFERENCES trademarks(id) ON DELETE SET NULL,
        field_name   VARCHAR(100),
        old_value    TEXT,
        new_value    TEXT,
        changed_by   VARCHAR(100) DEFAULT 'system',
        changed_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Indexes ───────────────────────────────────────────────────────────────────
    const indexes = [
      ['idx_tm_sr_no',       'sr_no'],
      ['idx_tm_tm_no',       'tm_no'],
      ['idx_tm_app_name',    'applicant_name'],
      ['idx_tm_cnic',        'applicant_cnic'],
      ['idx_tm_class',       'class'],
      ['idx_tm_consultant',  'consultant_name'],
      ['idx_tm_stage',       'stage'],
      ['idx_tm_sub_stage',   'sub_stage'],
      ['idx_tm_person',      'assigned_person'],
      ['idx_tm_city',        'assigned_city'],
      ['idx_tm_year',        'year'],
      ['idx_tm_archived',    'archived'],
    ];
    for (const [name, col] of indexes) {
      await client.query(`CREATE INDEX IF NOT EXISTS ${name} ON trademarks(${col})`);
    }
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_record_id ON audit_logs(record_id)`);

    // ── Auto-update updated_at trigger ────────────────────────────────────────────
    await client.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS trademarks_updated_at ON trademarks;
      CREATE TRIGGER trademarks_updated_at
        BEFORE UPDATE ON trademarks
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    console.log('✅ DB migrations complete');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection, runMigrations };
