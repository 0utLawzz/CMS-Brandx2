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
// Query params: ?search= ?stage= ?status_run= ?app_type= ?year= ?class= ?limit= ?offset=
app.get('/api/trademarks', async (req, res) => {
  try {
    const { search, stage, status_run, app_type, year, class: cls, limit = 2000, offset = 0 } = req.query;

    let sql = 'SELECT * FROM trademarks WHERE 1=1';
    const params = [];

    if (search) {
      sql += ` AND (tm_no LIKE ? OR app_name LIKE ? OR sr_no LIKE ?
                    OR app_cnic LIKE ? OR app_trade LIKE ? OR con_name LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q);
    }
    if (stage)      { sql += ' AND stage = ?';      params.push(stage); }
    if (status_run) { sql += ' AND status_run = ?'; params.push(status_run); }
    if (app_type)   { sql += ' AND app_type = ?';   params.push(app_type); }
    if (year)       { sql += ' AND year = ?';        params.push(year); }
    if (cls)        { sql += ' AND class = ?';       params.push(cls); }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET single trademark by TM_NO (primary searchable key) ──────────────────
app.get('/api/trademarks/tm/:tmNo', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM trademarks WHERE tm_no = ?', [req.params.tmNo]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET single trademark by ID ───────────────────────────────────────────────
app.get('/api/trademarks/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM trademarks WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET stats ────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                              AS total,
        SUM(status_run = 'Run')               AS run,
        SUM(status_run = 'Processing')        AS processing,
        SUM(status_run = 'Done')              AS done,
        SUM(stage LIKE '%STAGE 1%')           AS stage1,
        SUM(stage LIKE '%STAGE 2%')           AS stage2,
        SUM(stage LIKE '%STAGE 3%')           AS stage3,
        SUM(stage LIKE '%STAGE 4%')           AS stage4,
        SUM(stage LIKE '%STOPPED%')           AS stopped,
        SUM(stage LIKE '%COPYRIGHT%')         AS copyright
      FROM trademarks
    `);
    res.json({ success: true, data: totals });
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

    const [result] = await pool.execute(
      `INSERT INTO trademarks
         (status_run, stage, sr_no, tm_no, folder_name, date_l, class, class_desc,
          app_type, app_name, app_so, app_cnic, issue_date, expiry_date,
          app_trade, app_add, year, con_name, con_add, img, no_img)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'SR No already exists' });
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

    const sql = `UPDATE trademarks SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
    const values = [...fields.map(f => body[f]), req.params.id];
    const [result] = await pool.execute(sql, values);

    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE trademark by ID ───────────────────────────────────────────────────
app.delete('/api/trademarks/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM trademarks WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Record not found' });
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

    const BATCH = 100;
    let inserted = 0, skipped = 0;

    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const ph = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const vals = batch.flatMap(b => {
        const expiry = b.expiry_date || addDays(b.issue_date, 7);
        return [
          b.status_run || 'Run', b.stage || null, b.sr_no || null, b.tm_no || null,
          b.folder_name || null, b.date_l || null, b.class || null, b.class_desc || null,
          b.app_type || null, b.app_name || null, b.app_so || null, b.app_cnic || null,
          b.issue_date || null, expiry || null,
          b.app_trade || null, b.app_add || null, b.year || null,
          b.con_name || null, b.con_add || null,
          b.img || null, b.no_img || null,
        ];
      });
      try {
        const [r] = await pool.execute(
          `INSERT IGNORE INTO trademarks
             (status_run,stage,sr_no,tm_no,folder_name,date_l,class,class_desc,
              app_type,app_name,app_so,app_cnic,issue_date,expiry_date,
              app_trade,app_add,year,con_name,con_add,img,no_img)
           VALUES ${ph}`,
          vals
        );
        inserted += r.affectedRows;
        skipped  += batch.length - r.affectedRows;
      } catch { skipped += batch.length; }
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
