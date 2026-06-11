const express = require('express');
const cors    = require('cors');
require('dotenv').config();
const { pool, testConnection, runMigrations } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
    const { search, stage, status_run, app_type, year, class: cls, limit = 2000, offset = 0 } = req.query;

    let sql = 'SELECT * FROM trademarks WHERE 1=1';
    const params = [];
    let idx = 1;

    if (search) {
      const q = `%${search}%`;
      sql += ` AND (tm_no ILIKE $${idx} OR app_name ILIKE $${idx+1} OR sr_no ILIKE $${idx+2}
                    OR app_cnic ILIKE $${idx+3} OR app_trade ILIKE $${idx+4} OR con_name ILIKE $${idx+5})`;
      params.push(q, q, q, q, q, q);
      idx += 6;
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

// ─── GET single trademark by TM_NO ───────────────────────────────────────────
app.get('/api/trademarks/tm/:tmNo', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM trademarks WHERE tm_no = $1', [req.params.tmNo]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET single trademark by ID ───────────────────────────────────────────────
app.get('/api/trademarks/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM trademarks WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET stats ────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        SUM(CASE WHEN status_run = 'Run'        THEN 1 ELSE 0 END) AS run,
        SUM(CASE WHEN status_run = 'Processing' THEN 1 ELSE 0 END) AS processing,
        SUM(CASE WHEN status_run = 'Done'       THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN stage ILIKE '%STAGE 1%'   THEN 1 ELSE 0 END) AS stage1,
        SUM(CASE WHEN stage ILIKE '%STAGE 2%'   THEN 1 ELSE 0 END) AS stage2,
        SUM(CASE WHEN stage ILIKE '%STAGE 3%'   THEN 1 ELSE 0 END) AS stage3,
        SUM(CASE WHEN stage ILIKE '%STAGE 4%'   THEN 1 ELSE 0 END) AS stage4,
        SUM(CASE WHEN stage ILIKE '%STOPPED%'   THEN 1 ELSE 0 END) AS stopped,
        SUM(CASE WHEN stage ILIKE '%COPYRIGHT%' THEN 1 ELSE 0 END) AS copyright
      FROM trademarks
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CREATE trademark ─────────────────────────────────────────────────────────
app.post('/api/trademarks', async (req, res) => {
  try {
    const b = req.body;
    if (!b.app_name) return res.status(400).json({ success: false, error: 'app_name is required' });

    const expiry = b.expiry_date || addDays(b.issue_date, 7);

    const { rows } = await pool.query(
      `INSERT INTO trademarks
         (status_run, stage, sr_no, tm_no, folder_name, date_l, class, class_desc,
          app_type, app_name, app_so, app_cnic, issue_date, expiry_date,
          app_trade, app_add, year, con_name, con_add, img, no_img)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING id`,
      [
        b.status_run || 'Run', b.stage || null, b.sr_no || null, b.tm_no || null,
        b.folder_name || null, b.date_l || null, b.class || null, b.class_desc || null,
        b.app_type || null, b.app_name, b.app_so || null, b.app_cnic || null,
        b.issue_date || null, expiry || null,
        b.app_trade || null, b.app_add || null, b.year || null,
        b.con_name || null, b.con_add || null,
        b.img || null, b.no_img || null,
      ]
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
    const allowed = [
      'status_run', 'stage', 'sr_no', 'tm_no', 'folder_name', 'date_l',
      'class', 'class_desc', 'app_type', 'app_name', 'app_so', 'app_cnic',
      'issue_date', 'expiry_date', 'app_trade', 'app_add', 'year',
      'con_name', 'con_add', 'img', 'no_img',
    ];
    const body = { ...req.body };

    if (body.issue_date && !body.expiry_date) {
      body.expiry_date = addDays(body.issue_date, 7);
    }

    const fields = Object.keys(body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ success: false, error: 'No valid fields to update' });

    const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = [...fields.map(f => body[f]), req.params.id];
    const sql = `UPDATE trademarks SET ${sets} WHERE id = $${fields.length + 1}`;

    const { rowCount } = await pool.query(sql, values);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE trademark by ID ───────────────────────────────────────────────────
app.delete('/api/trademarks/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM trademarks WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── BULK import ──────────────────────────────────────────────────────────────
app.post('/api/import', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || !records.length)
      return res.status(400).json({ success: false, error: 'records array required' });

    let inserted = 0, skipped = 0;
    const BATCH = 50;

    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      for (const b of batch) {
        try {
          const expiry = b.expiry_date || addDays(b.issue_date, 7);
          await pool.query(
            `INSERT INTO trademarks
               (status_run,stage,sr_no,tm_no,folder_name,date_l,class,class_desc,
                app_type,app_name,app_so,app_cnic,issue_date,expiry_date,
                app_trade,app_add,year,con_name,con_add,img,no_img)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
             ON CONFLICT DO NOTHING`,
            [
              b.status_run || 'Run', b.stage || null, b.sr_no || null, b.tm_no || null,
              b.folder_name || null, b.date_l || null, b.class || null, b.class_desc || null,
              b.app_type || null, b.app_name || null, b.app_so || null, b.app_cnic || null,
              b.issue_date || null, expiry || null,
              b.app_trade || null, b.app_add || null, b.year || null,
              b.con_name || null, b.con_add || null,
              b.img || null, b.no_img || null,
            ]
          );
          inserted++;
        } catch { skipped++; }
      }
    }
    res.json({ success: true, inserted, skipped, total: records.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, 'localhost', async () => {
  console.log(`BrandEx API running on http://localhost:${PORT}`);
  await testConnection();
  await runMigrations();
});
