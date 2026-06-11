const https = require('https');
const http  = require('http');

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzPMvLPhdXugWg7No78vyJXgc3e3h4mKDcQLAAsSvLRWQe36fyqlk7mRwIsQSB7PabmNLqKXG2cz/pub?gid=229416165&single=true&output=csv';
const API_URL = 'http://localhost:3000/api/import';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = parseRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseRow(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(obj);
  }
  return rows;
}

function parseRow(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { cols.push(cur); cur = ''; }
    else { cur += c; }
  }
  cols.push(cur);
  return cols;
}

function cleanStage(raw) {
  if (!raw) return null;
  return raw
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\uD83C-\uDBFF\uDC00-\uDFFF]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase() || null;
}

function inferStatus(stage) {
  if (!stage) return 'Run';
  const s = stage.toUpperCase();
  if (s.includes('STOP') || s.includes('ABANDON') || s.includes('DONE') || s.includes('CERTIF')) return 'Done';
  if (s.includes('STAGE 3') || s.includes('STAGE 4')) return 'Processing';
  return 'Run';
}

function extractYear(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/\b(20\d{2})\b/);
  return m ? m[1] : null;
}

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(url, opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('📥 Fetching data from Google Sheets…');
  const csv = await fetchUrl(CSV_URL);
  const raw = parseCSV(csv);
  console.log(`   Found ${raw.length} rows`);

  const records = raw
    .filter(r => r['TM NO'] || r['APP NAME'] || r['CASE NO'])
    .map(r => {
      const stage = cleanStage(r['STATUS']);
      const subStatus = (r['APPLICATION \nSUB STATUS'] || r['APPLICATION SUB STATUS'] || '').trim();
      const notes = r['Notes'] || '';
      const city  = r['City'] || '';
      const caseNo = r['CASE NO'] === 'Not Found' ? null : r['CASE NO'];

      return {
        sr_no:      caseNo || null,
        tm_no:      r['TM NO'] || null,
        app_name:   r['APP NAME'] || 'Unknown',
        class:      r['CLASS'] || null,
        date_l:     r['DATE'] || null,
        stage:      stage || null,
        status_run: inferStatus(stage),
        year:       extractYear(r['DATE']),
        class_desc: subStatus || null,
        app_add:    city || null,
        no_img:     notes || null,
      };
    });

  console.log(`   Mapped ${records.length} valid records`);
  console.log('🚀 Importing into database…');

  const result = await postJSON(API_URL, { records });
  console.log(`✅ Done — inserted: ${result.inserted}, skipped: ${result.skipped}, total: ${result.total}`);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
