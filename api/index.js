const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  res.json({ status: 'ok', database: dbOk ? 'connected' : 'disconnected' });
});

// ─── GET all trademarks ──────────────────────────────────────────────────────
// Optional query params: ?search=abc  ?status=STAGE+1  ?city=KARACHI
app.get('/api/trademarks', async (req, res) => {
  try {
    const { search, status, city, limit = 500, offset = 0 } = req.query;

    let sql = 'SELECT * FROM trademarks WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR case_no LIKE ? OR tm_number LIKE ? OR sub_status LIKE ? OR status LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (city) {
      sql += ' AND city = ?';
      params.push(city);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET single trademark by case_no ────────────────────────────────────────
app.get('/api/trademarks/:caseNo', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM trademarks WHERE case_no = ?',
      [req.params.caseNo]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET stats (for dashboard tiles) ────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                                           AS total,
        SUM(sub_status LIKE '%exam%')                     AS examination,
        SUM(sub_status LIKE '%accept%')                   AS accepted,
        SUM(sub_status LIKE '%d-note%' OR sub_status LIKE '%demand note%') AS demand_note,
        SUM((sub_status LIKE '%d-note%' OR sub_status LIKE '%demand note%')
            AND (sub_status LIKE '%submitted%' OR sub_status LIKE '%paid%')) AS demand_note_paid,
        SUM(sub_status LIKE '%cert%' OR status LIKE '%stage 4%') AS certificate,
        SUM(status LIKE '%stage 1%')  AS stage1,
        SUM(status LIKE '%stage 2%')  AS stage2,
        SUM(status LIKE '%stage 3%')  AS stage3,
        SUM(status LIKE '%stage 4%')  AS stage4,
        SUM(status LIKE '%stopped%' OR status LIKE '%abandon%') AS stopped
      FROM trademarks
    `);
    res.json({ success: true, data: totals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CREATE a trademark ──────────────────────────────────────────────────────
app.post('/api/trademarks', async (req, res) => {
  try {
    const { date, case_no, name, tm_number, class: cls, status, sub_status, is_duplicate, tm11, notes, city } = req.body;
    if (!case_no || !name) return res.status(400).json({ success: false, error: 'case_no and name are required' });

    const [result] = await pool.execute(
      `INSERT INTO trademarks (date, case_no, name, tm_number, class, status, sub_status, is_duplicate, tm11, notes, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, case_no, name, tm_number, cls, status, sub_status, is_duplicate ? 1 : 0, tm11, notes, city]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Case number already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── UPDATE a trademark ──────────────────────────────────────────────────────
app.patch('/api/trademarks/:caseNo', async (req, res) => {
  try {
    const allowed = ['name', 'tm_number', 'class', 'status', 'sub_status', 'notes', 'city', 'date', 'is_duplicate', 'tm11'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ success: false, error: 'No valid fields to update' });

    const sql = `UPDATE trademarks SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE case_no = ?`;
    const values = [...fields.map(f => req.body[f]), req.params.caseNo];
    const [result] = await pool.execute(sql, values);

    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE a trademark ──────────────────────────────────────────────────────
app.delete('/api/trademarks/:caseNo', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM trademarks WHERE case_no = ?', [req.params.caseNo]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── BULK import (for migrating from Google Sheets) ─────────────────────────
app.post('/api/import', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || !records.length) {
      return res.status(400).json({ success: false, error: 'records array is required' });
    }

    let inserted = 0, skipped = 0;
    for (const r of records) {
      try {
        await pool.execute(
          `INSERT IGNORE INTO trademarks (date, case_no, name, tm_number, class, status, sub_status, is_duplicate, tm11, notes, city)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.date, r.case_no, r.name, r.tm_number, r.class, r.status, r.sub_status, r.is_duplicate ? 1 : 0, r.tm11, r.notes, r.city]
        );
        inserted++;
      } catch {
        skipped++;
      }
    }
    res.json({ success: true, inserted, skipped, total: records.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, 'localhost', async () => {
  console.log(`BrandEx API running on http://localhost:${PORT}`);
  await testConnection();
});
