/**
 * BrandEx Law — Google Sheets → MySQL Migration Script
 *
 * HOW TO USE:
 * 1. Copy api/.env.example to api/.env and fill in your Hostinger DB credentials
 * 2. Run the schema: paste api/schema.sql into phpMyAdmin on Hostinger
 * 3. Run this script: node api/migrate-from-sheets.js
 *
 * It will fetch all records from your Google Sheet and insert them into MySQL.
 * Duplicate case numbers are skipped (safe to run multiple times).
 */

require('dotenv').config();
const { pool, testConnection } = require('./db');

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzPMvLPhdXugWg7No78vyJXgc3e3h4mKDcQLAAsSvLRWQe36fyqlk7mRwIsQSB7PabmNLqKXG2cz/pub?gid=229416165&single=true&output=csv';

// Column index mapping (matches your existing sheet layout)
const COL = {
  DATE: 0, CASE_NO: 1, NAME: 2, NUMBER: 3, CLASS: 4,
  STATUS: 5, SUB_STATUS: 6, DUPLICATE: 7, TM11: 8, NOTES: 9, CITY: 10,
};

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
  const rows = lines.slice(1).map(parse).filter(r => r.some(c => c));
  return rows;
}

function toBool(val) {
  const v = (val || '').toLowerCase().trim();
  return v === 'true' || v === 'yes' || v === '1' || v === 'y';
}

async function migrate() {
  console.log('🔄 BrandEx Google Sheets → MySQL Migration');
  console.log('────────────────────────────────────────────');

  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot connect to MySQL. Check your .env credentials.');
    process.exit(1);
  }

  console.log('📥 Fetching data from Google Sheets...');
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  console.log(`   Found ${rows.length} records in sheet`);

  let inserted = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const caseNo = (row[COL.CASE_NO] || '').trim();
    const name   = (row[COL.NAME]    || '').trim();
    if (!caseNo || !name) { skipped++; continue; }

    try {
      const [result] = await pool.execute(
        `INSERT IGNORE INTO trademarks
           (date, case_no, name, tm_number, class, status, sub_status, is_duplicate, tm11, notes, city)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row[COL.DATE]       || null,
          caseNo,
          name,
          row[COL.NUMBER]     || null,
          row[COL.CLASS]      || null,
          row[COL.STATUS]     || null,
          row[COL.SUB_STATUS] || null,
          toBool(row[COL.DUPLICATE]) ? 1 : 0,
          row[COL.TM11]       || null,
          row[COL.NOTES]      || null,
          row[COL.CITY]       || null,
        ]
      );
      if (result.affectedRows) inserted++;
      else skipped++;
    } catch (err) {
      console.error(`  Error on case ${caseNo}:`, err.message);
      errors++;
    }
  }

  console.log('────────────────────────────────────────────');
  console.log(`✅ Inserted : ${inserted}`);
  console.log(`⏭  Skipped  : ${skipped} (already exist or empty)`);
  if (errors) console.log(`❌ Errors   : ${errors}`);
  console.log(`📊 Total    : ${rows.length}`);
  console.log('────────────────────────────────────────────');
  console.log('Migration complete! Your MySQL database is now populated.');

  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
