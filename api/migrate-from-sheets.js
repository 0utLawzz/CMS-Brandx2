require('dotenv').config();
const { pool, testConnection } = require('./db');

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzPMvLPhdXugWg7No78vyJXgc3e3h4mKDcQLAAsSvLRWQe36fyqlk7mRwIsQSB7PabmNLqKXG2cz/pub?gid=229416165&single=true&output=csv';

function parseCSV(text) {
  const rows = [];
  let cur = [];
  let str = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQ && text[i+1] === '"') { str += '"'; i++; }
      else { inQ = !inQ; }
    } else if (c === ',' && !inQ) {
      cur.push(str.trim()); str = '';
    } else if ((c === '\n' || c === '\r') && !inQ) {
      if (c === '\r' && text[i+1] === '\n') i++;
      cur.push(str.trim()); str = '';
      rows.push(cur); cur = [];
    } else {
      str += c;
    }
  }
  if (str || cur.length) { cur.push(str.trim()); rows.push(cur); }
  return rows.filter(r => r.some(c => c));
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
  if (rows.length === 0) throw new Error("Empty CSV");

  console.log('   Mapping columns dynamically...');
  const headers = rows[0].map(h => h.replace(/\s+/g, ' ').trim().toLowerCase());
  const COL = {};
  headers.forEach((h, i) => {
    if (h.includes('date') && !h.includes('issue') && !h.includes('expiry')) COL.DATE = i;
    if (h.includes('case no') || h.includes('sr no')) COL.CASE_NO = i;
    if (h.includes('app name') || h === 'name') COL.NAME = i;
    if (h.includes('tm no') || h === 'number' || h.includes('tm number')) COL.NUMBER = i;
    if (h === 'class') COL.CLASS = i;
    if (h === 'status' && !h.includes('sub')) COL.STATUS = i;
    if (h.includes('sub status') || h.includes('sub-status')) COL.SUB_STATUS = i;
    if (h.includes('duplicate')) COL.DUPLICATE = i;
    if (h.includes('tm-11') || h.includes('tm11') || h.includes('tm 11')) COL.TM11 = i;
    if (h.includes('notes')) COL.NOTES = i;
    if (h.includes('city')) COL.CITY = i;
  });

  console.log(`   Found ${rows.length - 1} records\n`);

  // Filter valid rows
  const valid = rows.slice(1).filter(r => {
    const caseNo = COL.CASE_NO !== undefined ? (r[COL.CASE_NO] || '').trim() : '';
    const name = COL.NAME !== undefined ? (r[COL.NAME] || '').trim() : '';
    return caseNo || name; // allow if at least one is present or update logic if needed
  });
  console.log(`   Valid rows: ${valid.length} | Skipped empty: ${rows.length - 1 - valid.length}`);

  let inserted = 0, skipped = 0;
  const BATCH_SIZE = 100;

  // Batch insert
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const values = batch.flatMap(r => [
      COL.DATE !== undefined ? r[COL.DATE] || null : null,
      COL.CASE_NO !== undefined ? (r[COL.CASE_NO] || '').trim() : '',
      COL.NAME !== undefined ? (r[COL.NAME] || '').trim() : '',
      COL.NUMBER !== undefined ? r[COL.NUMBER] || null : null,
      COL.CLASS !== undefined ? r[COL.CLASS] || null : null,
      COL.STATUS !== undefined ? r[COL.STATUS] || null : null,
      COL.SUB_STATUS !== undefined ? r[COL.SUB_STATUS] || null : null,
      COL.DUPLICATE !== undefined ? (toBool(r[COL.DUPLICATE]) ? 1 : 0) : 0,
      COL.TM11 !== undefined ? r[COL.TM11] || null : null,
      COL.NOTES !== undefined ? r[COL.NOTES] || null : null,
      COL.CITY !== undefined ? r[COL.CITY] || null : null,
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
