const express = require('express');
const cors    = require('cors');
const path    = require('path');
const https   = require('https');
const http    = require('http');
require('dotenv').config();
const { pool, testConnection, runMigrations } = require('./db');
const multer  = require('multer');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Serve uploaded images ─────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Multer: image upload ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  destination: (req, file, cb) => {
    const fs = require('fs');
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname) || '.jpg';
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const ok = await testConnection();
  res.json({ status: 'ok', database: ok ? 'connected' : 'disconnected' });
});

// ─── GET all trademarks ───────────────────────────────────────────────────────
app.get('/api/trademarks', async (req, res) => {
  try {
    const { search, stage, status_run, app_type, year, class: cls, limit = 5000, offset = 0 } = req.query;
    let sql = 'SELECT * FROM trademarks WHERE 1=1';
    const params = [];
    let idx = 1;
    if (search) {
      const q = `%${search}%`;
      sql += ` AND (tm_no ILIKE $${idx} OR app_name ILIKE $${idx+1} OR sr_no ILIKE $${idx+2}
                    OR app_cnic ILIKE $${idx+3} OR app_trade ILIKE $${idx+4} OR con_name ILIKE $${idx+5})`;
      params.push(q, q, q, q, q, q); idx += 6;
    }
    if (stage)      { sql += ` AND stage = $${idx++}`;      params.push(stage); }
    if (status_run) { sql += ` AND status_run = $${idx++}`; params.push(status_run); }
    if (app_type)   { sql += ` AND app_type = $${idx++}`;   params.push(app_type); }
    if (year)       { sql += ` AND year = $${idx++}`;        params.push(year); }
    if (cls)        { sql += ` AND class = $${idx++}`;       params.push(cls); }
    sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(parseInt(limit), parseInt(offset));
    const { rows } = await pool.query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET single by TM_NO ─────────────────────────────────────────────────────
app.get('/api/trademarks/tm/:tmNo', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM trademarks WHERE tm_no = $1', [req.params.tmNo]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── GET single by ID ────────────────────────────────────────────────────────
app.get('/api/trademarks/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM trademarks WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── GET stats ────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                        AS total,
        SUM(CASE WHEN status_run = 'Run'        THEN 1 ELSE 0 END)     AS run,
        SUM(CASE WHEN status_run = 'Processing' THEN 1 ELSE 0 END)     AS processing,
        SUM(CASE WHEN status_run = 'Done'       THEN 1 ELSE 0 END)     AS done,
        SUM(CASE WHEN stage ILIKE '%STAGE 1%' OR stage ILIKE '%APPLICATION FILED%' OR stage ILIKE '%ACKNOWLEDGM%' OR stage ILIKE '%EXAMINATION%' THEN 1 ELSE 0 END) AS stage1,
        SUM(CASE WHEN stage ILIKE '%STAGE 2%' OR stage ILIKE '%ASSIGNED%' OR stage ILIKE '%ACCEPTED%' THEN 1 ELSE 0 END) AS stage2,
        SUM(CASE WHEN stage ILIKE '%STAGE 3%' OR stage ILIKE '%PUBLISHED%' OR stage ILIKE '%OPPO%' OR stage ILIKE '%DEMAND%' OR stage ILIKE '%D-NOTE%' THEN 1 ELSE 0 END) AS stage3,
        SUM(CASE WHEN stage ILIKE '%STAGE 4%' OR stage ILIKE '%CERTIF%' OR stage ILIKE '%COMPLETE%' THEN 1 ELSE 0 END) AS stage4,
        SUM(CASE WHEN stage ILIKE '%STOP%' OR stage ILIKE '%ABANDON%' OR stage ILIKE '%HOLD%' OR stage ILIKE '%REFUS%' THEN 1 ELSE 0 END) AS stopped,
        SUM(CASE WHEN stage ILIKE '%COPYRIGHT%' THEN 1 ELSE 0 END)     AS copyright
      FROM trademarks
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── CREATE trademark ─────────────────────────────────────────────────────────
app.post('/api/trademarks', async (req, res) => {
  try {
    const b = req.body;
    if (!b.app_name) return res.status(400).json({ success: false, error: 'app_name is required' });
    const expiry = b.expiry_date || addDays(b.issue_date, 7);
    const { rows } = await pool.query(
      `INSERT INTO trademarks
         (status_run,stage,sr_no,tm_no,folder_name,date_l,class,class_desc,
          app_type,app_name,app_so,app_cnic,issue_date,expiry_date,
          app_trade,app_add,year,con_name,con_add,img,no_img)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING id`,
      [ b.status_run||'Run', b.stage||null, b.sr_no||null, b.tm_no||null,
        b.folder_name||null, b.date_l||null, b.class||null, b.class_desc||null,
        b.app_type||null, b.app_name, b.app_so||null, b.app_cnic||null,
        b.issue_date||null, expiry||null,
        b.app_trade||null, b.app_add||null, b.year||null,
        b.con_name||null, b.con_add||null, b.img||null, b.no_img||null ]
    );
    res.status(201).json({ success: true, id: rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'SR No already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── UPDATE trademark by ID ───────────────────────────────────────────────────
app.patch('/api/trademarks/:id', async (req, res) => {
  try {
    const allowed = ['status_run','stage','sr_no','tm_no','folder_name','date_l',
      'class','class_desc','app_type','app_name','app_so','app_cnic',
      'issue_date','expiry_date','app_trade','app_add','year','con_name','con_add','img','no_img'];
    const body = { ...req.body };
    if (body.issue_date && !body.expiry_date) body.expiry_date = addDays(body.issue_date, 7);
    const fields = Object.keys(body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ success: false, error: 'No valid fields' });
    const sets = fields.map((f, i) => `${f} = $${i+1}`).join(', ');
    const { rowCount } = await pool.query(
      `UPDATE trademarks SET ${sets} WHERE id = $${fields.length+1}`,
      [...fields.map(f => body[f]), req.params.id]
    );
    if (!rowCount) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Updated' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── DELETE trademark by ID ───────────────────────────────────────────────────
app.delete('/api/trademarks/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM trademarks WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── UPLOAD image ─────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  res.json({ success: true, path: '/uploads/' + req.file.filename });
});

// ─── BULK import ──────────────────────────────────────────────────────────────
app.post('/api/import', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || !records.length)
      return res.status(400).json({ success: false, error: 'records array required' });
    let inserted = 0, skipped = 0;
    for (const b of records) {
      try {
        const expiry = b.expiry_date || addDays(b.issue_date, 7);
        await pool.query(
          `INSERT INTO trademarks
             (status_run,stage,sr_no,tm_no,folder_name,date_l,class,class_desc,
              app_type,app_name,app_so,app_cnic,issue_date,expiry_date,
              app_trade,app_add,year,con_name,con_add,img,no_img)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
           ON CONFLICT DO NOTHING`,
          [ b.status_run||'Run', b.stage||null, b.sr_no||null, b.tm_no||null,
            b.folder_name||null, b.date_l||null, b.class||null, b.class_desc||null,
            b.app_type||null, b.app_name||null, b.app_so||null, b.app_cnic||null,
            b.issue_date||null, expiry||null,
            b.app_trade||null, b.app_add||null, b.year||null,
            b.con_name||null, b.con_add||null, b.img||null, b.no_img||null ]
        );
        inserted++;
      } catch { skipped++; }
    }
    res.json({ success: true, inserted, skipped, total: records.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── SYNC from Google Sheets ──────────────────────────────────────────────────
const SHEETS_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzPMvLPhdXugWg7No78vyJXgc3e3h4mKDcQLAAsSvLRWQe36fyqlk7mRwIsQSB7PabmNLqKXG2cz/pub?gid=229416165&single=true&output=csv';

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseSheetCSV(text) {
  const lines = text.split('\n');
  // Row 0 = frozen header — always skipped
  const headers = lines[0].trim().split(',').map(h => h.replace(/"/g,'').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = [];
    let cur = '', inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { vals.push(cur); cur = ''; }
      else cur += c;
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx]||'').trim(); });
    rows.push(obj);
  }
  return rows;
}

function cleanStage(raw) {
  if (!raw) return null;
  return raw.replace(/[^\x00-\x7F]/g,'').replace(/\s+/g,' ').trim().toUpperCase()||null;
}
function inferStatus(stage) {
  if (!stage) return 'Run';
  const s = stage.toUpperCase();
  if (s.includes('STOP')||s.includes('ABANDON')||s.includes('DONE')||s.includes('CERTIF')||s.includes('COMPLETE')) return 'Done';
  if (s.includes('STAGE 3')||s.includes('STAGE 4')||s.includes('OPPO')||s.includes('DEMAND')||s.includes('PUBLISH')) return 'Processing';
  return 'Run';
}
function extractYear(d) { const m=(d||'').match(/\b(20\d{2})\b/); return m?m[1]:null; }

app.post('/api/sync-sheets', async (req, res) => {
  try {
    const csv  = await fetchCSV(SHEETS_CSV);
    const raw  = parseSheetCSV(csv);
    const records = raw
      .filter(r => r['TM NO'] || r['APP NAME'] || r['CASE NO'])
      .map(r => {
        const stage = cleanStage(r['STATUS']);
        const sub   = (r['APPLICATION \nSUB STATUS']||r['APPLICATION SUB STATUS']||'').trim();
        const caseNo = r['CASE NO']==='Not Found'?null:r['CASE NO'];
        return {
          sr_no: caseNo||null, tm_no: r['TM NO']||null,
          app_name: r['APP NAME']||'Unknown', class: r['CLASS']||null,
          date_l: r['DATE']||null, stage: stage||null,
          status_run: inferStatus(stage), year: extractYear(r['DATE']),
          class_desc: sub||null, app_add: r['City']||null, no_img: r['Notes']||null,
        };
      });

    let inserted = 0, skipped = 0;
    for (const b of records) {
      try {
        await pool.query(
          `INSERT INTO trademarks (status_run,stage,sr_no,tm_no,date_l,class,class_desc,app_name,app_add,year,no_img)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
          [b.status_run,b.stage,b.sr_no,b.tm_no,b.date_l,b.class,b.class_desc,b.app_name,b.app_add,b.year,b.no_img]
        );
        inserted++;
      } catch { skipped++; }
    }
    res.json({ success: true, inserted, skipped, total: records.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// GET all assignments (joined with trademark data)
app.get('/api/assignments', async (req, res) => {
  try {
    const { agent, city, status } = req.query;
    let sql = `
      SELECT a.id, a.trademark_id, a.agent_name, a.agent_city,
             a.assigned_at, a.completed_at, a.status, a.notes,
             t.tm_no, t.app_name, t.sr_no, t.class, t.stage,
             t.status_run, t.year, t.img
      FROM assignments a
      JOIN trademarks t ON t.id = a.trademark_id
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (agent)  { sql += ` AND a.agent_name = $${idx++}`; params.push(agent); }
    if (city)   { sql += ` AND a.agent_city = $${idx++}`; params.push(city); }
    if (status) { sql += ` AND a.status = $${idx++}`;     params.push(status); }
    sql += ' ORDER BY a.assigned_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET unassigned queue — stage=ASSIGNED but no assignment record
app.get('/api/assignments/unassigned', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.tm_no, t.app_name, t.sr_no, t.class, t.stage, t.class_desc, t.year, t.img
      FROM trademarks t
      WHERE (t.stage ILIKE '%ASSIGNED%'
          OR t.class_desc ILIKE '%UZMA%' OR t.class_desc ILIKE '%FASIAL%'
          OR t.class_desc ILIKE '%FAISAL%' OR t.class_desc ILIKE '%RASHID%'
          OR t.class_desc ILIKE '%SULMAN%')
        AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.trademark_id = t.id)
      ORDER BY t.created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET assignment stats
app.get('/api/assignments/stats', async (req, res) => {
  try {
    const { rows: totals } = await pool.query(`
      SELECT
        COUNT(*)                                                  AS total,
        SUM(CASE WHEN status='Pending'     THEN 1 ELSE 0 END)   AS pending,
        SUM(CASE WHEN status='In Progress' THEN 1 ELSE 0 END)   AS in_progress,
        SUM(CASE WHEN status='Complete'    THEN 1 ELSE 0 END)   AS complete
      FROM assignments
    `);
    const { rows: byAgent } = await pool.query(`
      SELECT agent_name, agent_city,
             COUNT(*)                                            AS total,
             SUM(CASE WHEN status='Pending'     THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN status='In Progress' THEN 1 ELSE 0 END) AS in_progress,
             SUM(CASE WHEN status='Complete'    THEN 1 ELSE 0 END) AS complete
      FROM assignments
      GROUP BY agent_name, agent_city
      ORDER BY agent_name, agent_city
    `);
    const { rows: unassigned } = await pool.query(`
      SELECT COUNT(*) AS count FROM trademarks t
      WHERE (t.stage ILIKE '%ASSIGNED%'
          OR t.class_desc ILIKE '%UZMA%' OR t.class_desc ILIKE '%FASIAL%'
          OR t.class_desc ILIKE '%RASHID%' OR t.class_desc ILIKE '%SULMAN%')
        AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.trademark_id = t.id)
    `);
    res.json({ success: true, data: { ...totals[0], by_agent: byAgent, unassigned: parseInt(unassigned[0].count)||0 } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST create assignment
app.post('/api/assignments', async (req, res) => {
  try {
    const { trademark_id, agent_name, agent_city, notes } = req.body;
    if (!trademark_id || !agent_name || !agent_city)
      return res.status(400).json({ success: false, error: 'trademark_id, agent_name, agent_city required' });
    const { rows } = await pool.query(
      `INSERT INTO assignments (trademark_id, agent_name, agent_city, notes, status)
       VALUES ($1, $2, $3, $4, 'Pending')
       ON CONFLICT (trademark_id) DO UPDATE
         SET agent_name=$2, agent_city=$3, notes=$4, assigned_at=NOW(), status='Pending', completed_at=NULL
       RETURNING id`,
      [trademark_id, agent_name, agent_city, notes||null]
    );
    // Also update trademark stage to ASSIGNED if not already
    await pool.query(
      `UPDATE trademarks SET stage='ASSIGNED', class_desc=$1 WHERE id=$2 AND (stage IS NULL OR stage NOT ILIKE '%ASSIGNED%')`,
      [`${agent_name} (${agent_city.slice(0,3)})`, trademark_id]
    );
    res.json({ success: true, id: rows[0].id });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH update assignment (status, notes, reassign)
app.patch('/api/assignments/:id', async (req, res) => {
  try {
    const { status, notes, agent_name, agent_city } = req.body;
    const allowed = { status, notes, agent_name, agent_city };
    const fields = Object.keys(allowed).filter(k => allowed[k] !== undefined);
    if (!fields.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
    const sets = [];
    const vals = [];
    let i = 1;
    for (const f of fields) { sets.push(`${f}=$${i++}`); vals.push(allowed[f]); }
    // Auto-set completed_at when marking Complete
    if (status === 'Complete') { sets.push(`completed_at=NOW()`); }
    if (status && status !== 'Complete') { sets.push(`completed_at=NULL`); }
    vals.push(req.params.id);
    const { rowCount } = await pool.query(
      `UPDATE assignments SET ${sets.join(',')} WHERE id=$${i}`, vals
    );
    if (!rowCount) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE remove assignment
app.delete('/api/assignments/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM assignments WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, 'localhost', async () => {
  console.log(`BrandEx API running on http://localhost:${PORT}`);
  await testConnection();
  await runMigrations();
});
