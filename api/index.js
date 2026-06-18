'use strict';
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const https    = require('https');
const http     = require('http');
const multer   = require('multer');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { pool, testConnection, runMigrations } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Uploads ──────────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
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

// ── Stage / Sub-Stage Definitions ────────────────────────────────────────────
const STAGES = {
  'Stage 1 – Application': [
    'Application Prepared',
    'Application Filed',
    'TM Assigned',
    'Acknowledgement Received',
    'Examination Received',
  ],
  'Stage 2 – Examination': [
    'Assigned',
    'Under Review',
    'Hearing Scheduled',
    'Hearing Completed',
    'Approved',
  ],
  'Stage 3 – Publication': [
    'Published In Journal',
    'Waiting Period',
    'Demand Note Received',
    'Demand Note Paid',
    'Opposition',
  ],
  'Stage 4 – Registration': [
    'Certificate Received',
    'Certificate Dispatched',
    'Closed',
  ],
};

const ALLOWED_FIELDS = [
  'filing_date','sr_no','tm_no','applicant_name','applicant_so','applicant_cnic',
  'applicant_type','applicant_address','class','class_desc','tm_trade',
  'consultant_name','consultant_address','stage','sub_stage',
  'assigned_person','assigned_city','issue_date','expiry_date',
  'folder_name','img','notes','year','archived',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractYear(d) {
  const m = (d || '').match(/\b(20\d{2})\b/);
  return m ? m[1] : null;
}

async function writeAuditLog(client, recordId, changes, changedBy = 'system') {
  for (const [field, { old: oldVal, new: newVal }] of Object.entries(changes)) {
    if (String(oldVal || '') !== String(newVal || '')) {
      await client.query(
        `INSERT INTO audit_logs (record_id, field_name, old_value, new_value, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [recordId, field, oldVal ?? null, newVal ?? null, changedBy]
      );
    }
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const ok = await testConnection();
  res.json({ status: 'ok', database: ok ? 'connected' : 'disconnected' });
});

// ── Stage definitions ─────────────────────────────────────────────────────────
app.get('/api/stages', (req, res) => {
  res.json({ success: true, data: STAGES });
});

// ── GET trademarks (paginated, search, filter) ────────────────────────────────
app.get('/api/trademarks', async (req, res) => {
  try {
    const {
      q, stage, sub_stage, assigned_person, assigned_city, year,
      archived = 'false',
      page = 1, limit = 50,
    } = req.query;

    const params = [];
    let idx = 1;
    let where = [];

    // Archived filter
    where.push(`archived = $${idx++}`);
    params.push(archived === 'true');

    // Full-text search across key fields
    if (q) {
      const pat = `%${q}%`;
      where.push(`(
        tm_no            ILIKE $${idx}   OR
        sr_no            ILIKE $${idx+1} OR
        applicant_name   ILIKE $${idx+2} OR
        applicant_cnic   ILIKE $${idx+3} OR
        class            ILIKE $${idx+4} OR
        consultant_name  ILIKE $${idx+5}
      )`);
      params.push(pat, pat, pat, pat, pat, pat);
      idx += 6;
    }

    if (stage)           { where.push(`stage = $${idx++}`);           params.push(stage); }
    if (sub_stage)       { where.push(`sub_stage = $${idx++}`);       params.push(sub_stage); }
    if (assigned_person) { where.push(`assigned_person = $${idx++}`); params.push(assigned_person); }
    if (assigned_city)   { where.push(`assigned_city = $${idx++}`);   params.push(assigned_city); }
    if (year)            { where.push(`year = $${idx++}`);            params.push(year); }

    const offset  = (parseInt(page) - 1) * parseInt(limit);
    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // Count
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM trademarks ${whereSQL}`, params
    );
    const total = parseInt(countRows[0].total);

    // Data
    const { rows } = await pool.query(
      `SELECT id, filing_date, sr_no, tm_no, applicant_name, class, stage, sub_stage,
              assigned_person, assigned_city, year, archived, updated_at
       FROM trademarks ${whereSQL}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx+1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET single trademark ──────────────────────────────────────────────────────
app.get('/api/trademarks/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM trademarks WHERE id = $1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CREATE trademark ──────────────────────────────────────────────────────────
app.post('/api/trademarks', async (req, res) => {
  const client = await pool.connect();
  try {
    const b = req.body;
    if (!b.applicant_name) {
      return res.status(400).json({ success: false, error: 'applicant_name is required' });
    }

    const year = b.year || extractYear(b.filing_date);
    const fields = ALLOWED_FIELDS.filter(f => f !== 'archived');

    const cols   = [...fields, 'year'];
    const vals   = fields.map(f => b[f] || null);
    vals.push(year);

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await client.query(
      `INSERT INTO trademarks (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      vals
    );

    const newId = rows[0].id;

    // Audit: creation
    const changes = {};
    for (const f of cols) {
      const v = b[f] || null;
      if (v) changes[f] = { old: null, new: v };
    }
    await writeAuditLog(client, newId, changes, b._changed_by || 'system');

    res.status(201).json({ success: true, id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ── UPDATE trademark (with audit log) ────────────────────────────────────────
app.patch('/api/trademarks/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const id = req.params.id;
    const changedBy = req.body._changed_by || 'system';
    const body = { ...req.body };
    delete body._changed_by;

    const fields = Object.keys(body).filter(k => ALLOWED_FIELDS.includes(k));
    if (!fields.length) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    // Fetch current values for audit
    const { rows: current } = await client.query(
      'SELECT * FROM trademarks WHERE id = $1', [id]
    );
    if (!current.length) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    // Auto-extract year if filing_date changed
    if (body.filing_date && !body.year) {
      body.year = extractYear(body.filing_date);
      if (body.year && !fields.includes('year')) fields.push('year');
    }

    const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const { rowCount } = await client.query(
      `UPDATE trademarks SET ${sets} WHERE id = $${fields.length + 1}`,
      [...fields.map(f => body[f]), id]
    );
    if (!rowCount) return res.status(404).json({ success: false, error: 'Not found' });

    // Write audit log for changed fields
    const changes = {};
    for (const f of fields) {
      changes[f] = { old: current[0][f], new: body[f] };
    }
    await writeAuditLog(client, id, changes, changedBy);

    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ── SOFT DELETE (archive) ─────────────────────────────────────────────────────
app.delete('/api/trademarks/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const changedBy = req.query.by || 'system';
    const { rowCount } = await client.query(
      'UPDATE trademarks SET archived = TRUE WHERE id = $1', [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ success: false, error: 'Not found' });
    await writeAuditLog(client, req.params.id, {
      archived: { old: false, new: true }
    }, changedBy);
    res.json({ success: true, message: 'Archived' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ── GET audit logs for a record ───────────────────────────────────────────────
app.get('/api/audit-logs/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM audit_logs WHERE record_id = $1 ORDER BY changed_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET global audit logs ─────────────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const { rows } = await pool.query(
      `SELECT a.*, t.applicant_name, t.tm_no 
       FROM audit_logs a 
       LEFT JOIN trademarks t ON a.record_id = t.id 
       ORDER BY a.changed_at DESC LIMIT $1`,
      [limit]
    );
    
    // Map the action field for frontend compatibility
    const mappedRows = rows.map(r => {
      let action = 'UPDATE';
      if (r.field_name === 'created') action = 'CREATE';
      if (r.field_name === 'archived' && r.new_value === 'true') action = 'DELETE';
      if (r.changed_by === 'system' && r.field_name === 'created') action = 'SYNC';
      return { ...r, action, note: `Changed ${r.field_name}` };
    });
    res.json({ success: true, count: mappedRows.length, data: mappedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Dashboard stats ───────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [totals, perStage, perCity, perConsultant, perPerson] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int                                                   AS total,
          SUM(CASE WHEN archived = FALSE THEN 1 ELSE 0 END)::int         AS active,
          SUM(CASE WHEN archived = TRUE  THEN 1 ELSE 0 END)::int         AS archived,
          SUM(CASE WHEN sub_stage ILIKE '%Hearing Scheduled%' AND archived=FALSE THEN 1 ELSE 0 END)::int AS hearings_pending,
          SUM(CASE WHEN sub_stage ILIKE '%Opposition%' AND archived=FALSE       THEN 1 ELSE 0 END)::int AS opposition,
          SUM(CASE WHEN sub_stage ILIKE '%Certificate%' AND archived=FALSE AND sub_stage NOT ILIKE '%Dispatched%' THEN 1 ELSE 0 END)::int AS certificates_pending
        FROM trademarks
      `),
      pool.query(`
        SELECT stage, COUNT(*)::int AS count
        FROM trademarks
        WHERE archived = FALSE AND stage IS NOT NULL
        GROUP BY stage ORDER BY stage
      `),
      pool.query(`
        SELECT assigned_city AS city, COUNT(*)::int AS count
        FROM trademarks
        WHERE archived = FALSE AND assigned_city IS NOT NULL
        GROUP BY assigned_city ORDER BY count DESC
      `),
      pool.query(`
        SELECT consultant_name AS consultant, COUNT(*)::int AS count
        FROM trademarks
        WHERE archived = FALSE AND consultant_name IS NOT NULL
        GROUP BY consultant_name ORDER BY count DESC
      `),
      pool.query(`
        SELECT assigned_person AS person, COUNT(*)::int AS count
        FROM trademarks
        WHERE archived = FALSE AND assigned_person IS NOT NULL
        GROUP BY assigned_person ORDER BY count DESC
      `),
    ]);

    res.json({
      success: true,
      data: {
        ...totals.rows[0],
        per_stage:      perStage.rows,
        per_city:       perCity.rows,
        per_consultant: perConsultant.rows,
        per_person:     perPerson.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── UPLOAD image ──────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  res.json({ success: true, path: '/uploads/' + req.file.filename });
});

// ── BULK import ───────────────────────────────────────────────────────────────
app.post('/api/import', async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || !records.length)
    return res.status(400).json({ success: false, error: 'records[] required' });

  let inserted = 0, skipped = 0;
  for (const b of records) {
    try {
      const year = b.year || extractYear(b.filing_date);
      await pool.query(
        `INSERT INTO trademarks
           (filing_date,sr_no,tm_no,applicant_name,applicant_so,applicant_cnic,
            applicant_type,applicant_address,class,class_desc,tm_trade,
            consultant_name,consultant_address,stage,sub_stage,
            assigned_person,assigned_city,issue_date,expiry_date,
            folder_name,img,notes,year)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         ON CONFLICT DO NOTHING`,
        [
          b.filing_date||null, b.sr_no||null, b.tm_no||null,
          b.applicant_name||'Unknown', b.applicant_so||null, b.applicant_cnic||null,
          b.applicant_type||null, b.applicant_address||null,
          b.class||null, b.class_desc||null, b.tm_trade||null,
          b.consultant_name||null, b.consultant_address||null,
          b.stage||null, b.sub_stage||null,
          b.assigned_person||null, b.assigned_city||null,
          b.issue_date||null, b.expiry_date||null,
          b.folder_name||null, b.img||null, b.notes||null, year,
        ]
      );
      inserted++;
    } catch { skipped++; }
  }
  res.json({ success: true, inserted, skipped, total: records.length });
});

// ── SYNC from Google Sheets ───────────────────────────────────────────────────
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
  const headers = lines[0].trim().split(',').map(h => h.replace(/"/g, '').trim());
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
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });
    rows.push(obj);
  }
  return rows;
}

app.post('/api/sync-sheets', async (req, res) => {
  try {
    const csv     = await fetchCSV(SHEETS_CSV);
    const rawRows = parseSheetCSV(csv);

    const records = rawRows
      .filter(r => r['TM NO'] || r['APP NAME'] || r['CASE NO'])
      .map(r => {
        const filingDate = r['DATE'] || r['FILING DATE'] || null;
        return {
          filing_date:    filingDate,
          sr_no:          r['CASE NO'] !== 'Not Found' ? r['CASE NO'] : null,
          tm_no:          r['TM NO']   || null,
          applicant_name: r['APP NAME'] || r['APPLICANT NAME'] || 'Unknown',
          applicant_cnic: r['CNIC']    || null,
          class:          r['CLASS']   || null,
          class_desc:     r['APPLICATION\nSUB STATUS'] || r['APPLICATION SUB STATUS'] || r['CLASS DESC'] || null,
          consultant_name:r['CONSULTANT'] || r['CON NAME'] || null,
          stage:          r['STAGE']   || r['STATUS'] || null,
          sub_stage:      r['SUB STAGE'] || r['SUB STATUS'] || null,
          assigned_person:r['ASSIGNED PERSON'] || r['PERSON'] || null,
          assigned_city:  r['ASSIGNED CITY'] || r['CITY'] || r['City'] || null,
          notes:          r['NOTES']   || r['Notes'] || null,
          year:           extractYear(filingDate),
        };
      });

    let inserted = 0, skipped = 0;
    for (const b of records) {
      try {
        await pool.query(
          `INSERT INTO trademarks
             (filing_date,sr_no,tm_no,applicant_name,applicant_cnic,class,class_desc,
              consultant_name,stage,sub_stage,assigned_person,assigned_city,notes,year)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT DO NOTHING`,
          [b.filing_date,b.sr_no,b.tm_no,b.applicant_name,b.applicant_cnic,
           b.class,b.class_desc,b.consultant_name,b.stage,b.sub_stage,
           b.assigned_person,b.assigned_city,b.notes,b.year]
        );
        inserted++;
      } catch { skipped++; }
    }
    res.json({ success: true, inserted, skipped, total: records.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, 'localhost', async () => {
    console.log(`BrandEx API running on http://localhost:${PORT}`);
    await testConnection();
    await runMigrations();
  });
}// ── ASSIGNMENTS (MAPPED TO TRADEMARKS) ───────────────────────────────────────
app.get('/api/assignments/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE sub_stage = 'Pending') as pending,
        COUNT(*) FILTER (WHERE sub_stage = 'In Progress') as in_progress,
        COUNT(*) FILTER (WHERE sub_stage = 'Complete') as complete
      FROM trademarks 
      WHERE assigned_person IS NOT NULL AND assigned_person != '' AND archived = FALSE
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/assignments', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, id as trademark_id, tm_no, applicant_name as app_name, class, stage, 
             assigned_person as agent_name, assigned_city as agent_city, 
             sub_stage as status, updated_at as assigned_at
      FROM trademarks
      WHERE assigned_person IS NOT NULL AND assigned_person != '' AND archived = FALSE
      ORDER BY updated_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/assignments/unassigned', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM trademarks 
      WHERE (assigned_person IS NULL OR assigned_person = '') 
        AND stage ILIKE '%Stage 2%' AND archived = FALSE
    `);
    // Alias applicant_name to app_name for the frontend
    const mapped = rows.map(r => ({...r, app_name: r.applicant_name}));
    res.json({ success: true, data: mapped });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/assignments', async (req, res) => {
  try {
    const { trademark_id, agent_name, agent_city, notes } = req.body;
    await pool.query(
      `UPDATE trademarks 
       SET assigned_person = $1, assigned_city = $2, sub_stage = 'Pending' 
       WHERE id = $3`,
      [agent_name, agent_city, trademark_id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.patch('/api/assignments/:id', async (req, res) => {
  try {
    const { agent_name, agent_city, status, notes } = req.body;
    let sets = []; let vals = []; let idx = 1;
    if (agent_name !== undefined) { sets.push(`assigned_person = $${idx++}`); vals.push(agent_name); }
    if (agent_city !== undefined) { sets.push(`assigned_city = $${idx++}`); vals.push(agent_city); }
    if (status !== undefined)     { sets.push(`sub_stage = $${idx++}`); vals.push(status); }
    
    if (!sets.length) return res.json({ success: true });
    
    vals.push(req.params.id);
    await pool.query(
      `UPDATE trademarks SET ${sets.join(', ')} WHERE id = $${idx}`,
      vals
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/assignments/:id', async (req, res) => {
  try {
    await pool.query(
      `UPDATE trademarks 
       SET assigned_person = NULL, assigned_city = NULL, sub_stage = NULL 
       WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = app;
