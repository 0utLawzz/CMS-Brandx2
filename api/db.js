const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false : { rejectUnauthorized: false },
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

// ─── Parse agent + city from old class_desc values (e.g. "FASIAL (LHR)") ──────
const KNOWN_AGENTS = ['UZMA','FASIAL','FAISAL','RASHID','SULMAN'];
const CITY_MAP = {
  KHI:'KARACHI', KAR:'KARACHI', KARACHI:'KARACHI',
  LHR:'LAHORE',  LAHORE:'LAHORE',
  ISB:'ISLAMABAD', ISL:'ISLAMABAD', ISLAMABAD:'ISLAMABAD',
};

function parseAgent(classDesc) {
  if (!classDesc) return null;
  const s = classDesc.toUpperCase().trim();
  const agentRaw = KNOWN_AGENTS.find(a => s.includes(a));
  if (!agentRaw) return null;
  const agent = agentRaw === 'FAISAL' ? 'FASIAL' : agentRaw;

  let city = null;
  const m = s.match(/\(([^)]+)\)/);
  if (m) city = CITY_MAP[m[1].trim()] || null;
  if (!city) {
    for (const [k, v] of Object.entries(CITY_MAP)) {
      if (s.includes(k)) { city = v; break; }
    }
  }
  return { agent, city: city || 'KARACHI' };
}

// ─── Auto-migrate existing ASSIGNED records from class_desc ──────────────────
async function autoMigrateAssignments(client) {
  try {
    const { rows } = await client.query(`
      SELECT t.id, t.class_desc FROM trademarks t
      WHERE (t.stage ILIKE '%ASSIGNED%' OR t.class_desc ILIKE '%UZMA%'
          OR t.class_desc ILIKE '%FASIAL%' OR t.class_desc ILIKE '%FAISAL%'
          OR t.class_desc ILIKE '%RASHID%' OR t.class_desc ILIKE '%SULMAN%')
        AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.trademark_id = t.id)
    `);
    let migrated = 0;
    for (const row of rows) {
      const parsed = parseAgent(row.class_desc);
      if (!parsed) continue;
      await client.query(
        `INSERT INTO assignments (trademark_id, agent_name, agent_city, status)
         VALUES ($1, $2, $3, 'Pending') ON CONFLICT (trademark_id) DO NOTHING`,
        [row.id, parsed.agent, parsed.city]
      );
      migrated++;
    }
    if (migrated > 0) console.log(`✅ Auto-migrated ${migrated} assignment records`);
  } catch (err) {
    console.warn('Auto-migrate assignments:', err.message);
  }
}

// ─── Migrations ───────────────────────────────────────────────────────────────
async function runMigrations() {
  const client = await pool.connect();
  try {
    // Trademarks table
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

    // Assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id           SERIAL PRIMARY KEY,
        trademark_id INTEGER NOT NULL REFERENCES trademarks(id) ON DELETE CASCADE,
        agent_name   VARCHAR(50)  NOT NULL,
        agent_city   VARCHAR(20)  NOT NULL,
        assigned_at  TIMESTAMP    DEFAULT NOW(),
        completed_at TIMESTAMP,
        status       VARCHAR(20)  DEFAULT 'Pending',
        notes        TEXT,
        UNIQUE(trademark_id)
      )
    `);

    // Logs table — tracks every CREATE / UPDATE / DELETE / SYNC
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id           SERIAL PRIMARY KEY,
        trademark_id INTEGER REFERENCES trademarks(id) ON DELETE SET NULL,
        action       VARCHAR(20)  NOT NULL,
        changed_by   VARCHAR(50)  DEFAULT 'system',
        old_values   JSONB,
        new_values   JSONB,
        note         TEXT,
        created_at   TIMESTAMP    DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_trademark_id ON logs(trademark_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC)
    `);

    // ── Deduplicate trademarks by sr_no (keep lowest id) ──────────────────────
    // Step 1: Move assignments from duplicates to the keeper record, then delete
    await client.query(`
      UPDATE assignments a
      SET trademark_id = keep.keep_id
      FROM (
        SELECT MIN(id) AS keep_id, sr_no
        FROM   trademarks
        WHERE  sr_no IS NOT NULL AND sr_no != ''
        GROUP  BY sr_no
        HAVING COUNT(*) > 1
      ) keep
      WHERE  a.trademark_id IN (
        SELECT id FROM trademarks
        WHERE sr_no = keep.sr_no AND id != keep.keep_id
      )
        AND  NOT EXISTS (
          SELECT 1 FROM assignments x WHERE x.trademark_id = keep.keep_id
        )
    `);

    // Step 2: Delete all remaining duplicates (assignments moved or none)
    const { rowCount: dupsRemoved } = await client.query(`
      DELETE FROM trademarks t1
      USING (
        SELECT MIN(id) AS keep_id, sr_no
        FROM   trademarks
        WHERE  sr_no IS NOT NULL AND sr_no != ''
        GROUP  BY sr_no
        HAVING COUNT(*) > 1
      ) keep
      WHERE  t1.sr_no = keep.sr_no
        AND  t1.id   != keep.keep_id
    `);
    if (dupsRemoved > 0) console.log(`✅ Removed ${dupsRemoved} more duplicate trademark records`);

    // ── Partial unique index on sr_no (allows multiple NULLs) ─────────────────
    await client.query(`DROP INDEX IF EXISTS idx_tm_sr_no`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_sr_no
      ON trademarks(sr_no)
      WHERE sr_no IS NOT NULL AND sr_no != ''
    `);

    console.log('✅ Schema migrations complete');
    await autoMigrateAssignments(client);
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection, runMigrations };
