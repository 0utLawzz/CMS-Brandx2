require('dotenv').config();
const { pool, testConnection } = require('./db');

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzPMvLPhdXugWg7No78vyJXgc3e3h4mKDcQLAAsSvLRWQe36fyqlk7mRwIsQSB7PabmNLqKXG2cz/pub?gid=229416165&single=true&output=csv';

const COL = {
  DATE: 0, CASE_NO: 1, NAME: 2, NUMBER: 3, CLASS: 4,
  STATUS: 5, SUB_STATUS: 6, DUPLICATE: 7, TM11: 8, NOTES: 9, CITY: 10,
};

const BATCH_SIZE = 100;

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const parse = (line) => {
    const res = []; let cur = ''; let inQ = false;
    for (const c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    res.push(cur.trim());
    return res;
  };
  return lines.slice(1).map(parse).filter(r => r.some(c => c));
}

function toBool(val) {
  const v = (val || '').toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'yes' || v === 'y';
}

async function migrate() {
  console.log('🔄 BrandEx Google Sheets → MySQL Migration (Batch Mode)');
  console.log('─────────────────────────────────────────────────────────');

  const connected = await testConnection();
  if (!connected) { console.error('Cannot connect to MySQL.'); process.exit(1); }

  console.log('📥 Fetching data from Google Sheets...');
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  console.log(`   Found ${rows.length} records\n`);

  // Filter valid rows
  const valid = rows.filter(r => (r[COL.CASE_NO] || '').trim() && (r[COL.NAME] || '').trim());
  console.log(`   Valid rows: ${valid.length} | Skipped empty: ${rows.length - valid.length}`);

  let inserted = 0, skipped = 0;

  // Batch insert
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const values = batch.flatMap(r => [
      r[COL.DATE]       || null,
      (r[COL.CASE_NO]   || '').trim(),
      (r[COL.NAME]      || '').trim(),
      r[COL.NUMBER]     || null,
      r[COL.CLASS]      || null,
      r[COL.STATUS]     || null,
      r[COL.SUB_STATUS] || null,
      toBool(r[COL.DUPLICATE]) ? 1 : 0,
      r[COL.TM11]       || null,
      r[COL.NOTES]      || null,
      r[COL.CITY]       || null,
    ]);

    try {
      const [result] = await pool.execute(
        `INSERT IGNORE INTO trademarks
           (date, case_no, name, tm_number, class, status, sub_status, is_duplicate, tm11, notes, city)
         VALUES ${placeholders}`,
        values
      );
      inserted += result.affectedRows;
      skipped  += batch.length - result.affectedRows;
      const pct = Math.round(((i + batch.length) / valid.length) * 100);
      process.stdout.write(`\r   Progress: ${i + batch.length}/${valid.length} (${pct}%)`);
    } catch (err) {
      console.error(`\n   Batch error at row ${i}:`, err.message);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`✅ Inserted : ${inserted}`);
  console.log(`⏭  Skipped  : ${skipped} (duplicates or empty)`);
  console.log(`📊 Total    : ${valid.length}`);
  console.log('─────────────────────────────────────────────────────────');
  console.log('✅ Migration complete! Your MySQL database is now populated.');

  await pool.end();
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
