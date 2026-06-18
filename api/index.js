'use strict';
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const multer   = require('multer');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { getSheetsClient, spreadsheetId } = require('./sheets');

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
  'folder_name','img','notes','year','archived'
];

const HEADERS = [
  'id', 'filing_date', 'sr_no', 'tm_no', 'applicant_name', 'applicant_so',
  'applicant_cnic', 'applicant_type', 'applicant_address', 'class', 'class_desc',
  'tm_trade', 'consultant_name', 'consultant_address', 'stage', 'sub_stage',
  'assigned_person', 'assigned_city', 'issue_date', 'expiry_date', 'folder_name',
  'img', 'notes', 'year', 'archived', 'created_at', 'updated_at'
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractYear(d) {
  const m = (d || '').match(/\b(20\d{2})\b/);
  return m ? m[1] : null;
}

// Convert an array row from Sheets to an object
function rowToObject(row) {
  const obj = {};
  HEADERS.forEach((h, i) => {
    obj[h] = row[i] || '';
  });
  // Type casting
  obj.id = obj.id ? String(obj.id) : null;
  obj.archived = obj.archived === 'true' || obj.archived === 'TRUE';
  return obj;
}

// Convert an object to an array row for Sheets
function objectToRow(obj) {
  return HEADERS.map(h => {
    if (obj[h] === null || obj[h] === undefined) return '';
    return String(obj[h]);
  });
}

// Fetch all rows from the Trademarks sheet
async function getAllRecords() {
  const sheets = getSheetsClient();
  if (!sheets) throw new Error('Sheets client not initialized');
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Trademarks!A2:AA',
  });
  
  const rows = res.data.values || [];
  // Store the row index (A2 is row index 2 in sheets, but 0 in this array)
  return rows.map((row, index) => {
    const obj = rowToObject(row);
    obj._sheetRowIndex = index + 2; // Keep track of the actual row number for updates
    return obj;
  }).filter(r => r.id); // Only return rows that have an ID
}

async function writeAuditLog(recordId, changes, changedBy = 'system') {
  const sheets = getSheetsClient();
  if (!sheets) return;
  
  const rows = [];
  const now = new Date().toISOString();
  
  for (const [field, { old: oldVal, new: newVal }] of Object.entries(changes)) {
    if (String(oldVal || '') !== String(newVal || '')) {
      rows.push([
        Date.now() + Math.floor(Math.random() * 1000), // Log ID
        recordId,
        field,
        oldVal ?? '',
        newVal ?? '',
        changedBy,
        now
      ]);
    }
  }
  
  if (rows.length > 0) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Logs!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    } catch (err) {
      console.error('Failed to write audit log to Sheets:', err.message);
    }
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const ok = getSheetsClient() !== null;
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

    let records = await getAllRecords();

    // Filters
    const isArchived = archived === 'true';
    records = records.filter(r => r.archived === isArchived);

    if (q) {
      const qLower = q.toLowerCase();
      records = records.filter(r => 
        (r.tm_no || '').toLowerCase().includes(qLower) ||
        (r.sr_no || '').toLowerCase().includes(qLower) ||
        (r.applicant_name || '').toLowerCase().includes(qLower) ||
        (r.applicant_cnic || '').toLowerCase().includes(qLower) ||
        (r.class || '').toLowerCase().includes(qLower) ||
        (r.consultant_name || '').toLowerCase().includes(qLower)
      );
    }

    if (stage) records = records.filter(r => r.stage === stage);
    if (sub_stage) records = records.filter(r => r.sub_stage === sub_stage);
    if (assigned_person) records = records.filter(r => r.assigned_person === assigned_person);
    if (assigned_city) records = records.filter(r => r.assigned_city === assigned_city);
    if (year) records = records.filter(r => r.year === year);

    // Sort by created_at DESC (if available) or by row index DESC (newest at bottom of sheet)
    records.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return b._sheetRowIndex - a._sheetRowIndex;
    });

    const total = records.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginated = records.slice(offset, offset + parseInt(limit));

    // Remove _sheetRowIndex before sending to client
    paginated.forEach(r => delete r._sheetRowIndex);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      data: paginated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET single trademark ──────────────────────────────────────────────────────
app.get('/api/trademarks/:id', async (req, res) => {
  try {
    const records = await getAllRecords();
    const record = records.find(r => r.id === req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    
    delete record._sheetRowIndex;
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CREATE trademark ──────────────────────────────────────────────────────────
app.post('/api/trademarks', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const b = req.body;
    if (!b.applicant_name) {
      return res.status(400).json({ success: false, error: 'applicant_name is required' });
    }

    const newId = String(Date.now() + Math.floor(Math.random() * 1000));
    const now = new Date().toISOString();
    
    const obj = { id: newId };
    ALLOWED_FIELDS.forEach(f => obj[f] = b[f] || '');
    
    obj.year = b.year || extractYear(b.filing_date) || '';
    obj.archived = 'FALSE';
    obj.created_at = now;
    obj.updated_at = now;

    const row = objectToRow(obj);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Trademarks!A:AA',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    // Audit: creation
    const changes = {};
    ALLOWED_FIELDS.forEach(f => {
      const v = obj[f];
      if (v) changes[f] = { old: null, new: v };
    });
    await writeAuditLog(newId, changes, b._changed_by || 'system');

    res.status(201).json({ success: true, id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── UPDATE trademark (with audit log) ────────────────────────────────────────
app.patch('/api/trademarks/:id', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const id = req.params.id;
    const changedBy = req.body._changed_by || 'system';
    const body = { ...req.body };
    delete body._changed_by;

    const fields = Object.keys(body).filter(k => ALLOWED_FIELDS.includes(k));
    if (!fields.length) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const records = await getAllRecords();
    const current = records.find(r => r.id === id);
    
    if (!current) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    // Auto-extract year if filing_date changed
    if (body.filing_date && !body.year) {
      body.year = extractYear(body.filing_date);
      if (body.year && !fields.includes('year')) fields.push('year');
    }

    // Apply updates
    const updatedObj = { ...current };
    fields.forEach(f => updatedObj[f] = body[f]);
    updatedObj.updated_at = new Date().toISOString();

    const rowNumber = current._sheetRowIndex;
    const row = objectToRow(updatedObj);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Trademarks!A${rowNumber}:AA${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    // Write audit log for changed fields
    const changes = {};
    for (const f of fields) {
      changes[f] = { old: current[f], new: body[f] };
    }
    await writeAuditLog(id, changes, changedBy);

    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SOFT DELETE (archive) ─────────────────────────────────────────────────────
app.delete('/api/trademarks/:id', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const changedBy = req.query.by || 'system';
    const id = req.params.id;

    const records = await getAllRecords();
    const current = records.find(r => r.id === id);
    
    if (!current) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    const updatedObj = { ...current, archived: true, updated_at: new Date().toISOString() };
    const rowNumber = current._sheetRowIndex;
    const row = objectToRow(updatedObj);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Trademarks!A${rowNumber}:AA${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    await writeAuditLog(id, {
      archived: { old: false, new: true }
    }, changedBy);
    
    res.json({ success: true, message: 'Archived' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET audit logs for a record ───────────────────────────────────────────────
app.get('/api/audit-logs/:id', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Logs!A2:G',
    });

    const logs = (resp.data.values || [])
      .filter(r => r[1] === req.params.id)
      .map(r => ({
        id: r[0],
        record_id: r[1],
        field_name: r[2],
        old_value: r[3],
        new_value: r[4],
        changed_by: r[5],
        changed_at: r[6]
      }))
      .sort((a, b) => new Date(b.changed_at || 0) - new Date(a.changed_at || 0));

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET global audit logs ─────────────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const [logsResp, records] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Logs!A2:G',
      }),
      getAllRecords()
    ]);

    const recordsMap = {};
    records.forEach(r => recordsMap[r.id] = r);

    let logs = (logsResp.data.values || [])
      .map(r => {
        const record_id = r[1];
        const tm = recordsMap[record_id] || {};
        
        let action = 'UPDATE';
        if (r[2] === 'created') action = 'CREATE';
        if (r[2] === 'archived' && r[4] === 'true') action = 'DELETE';
        if (r[5] === 'system' && r[2] === 'created') action = 'SYNC';

        return {
          id: r[0],
          record_id,
          field_name: r[2],
          old_value: r[3],
          new_value: r[4],
          changed_by: r[5],
          changed_at: r[6],
          applicant_name: tm.applicant_name,
          tm_no: tm.tm_no,
          action,
          note: `Changed ${r[2]}`
        };
      })
      .sort((a, b) => new Date(b.changed_at || 0) - new Date(a.changed_at || 0))
      .slice(0, limit);

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Dashboard stats ───────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const records = await getAllRecords();
    
    let total = 0, active = 0, archived = 0, hearings_pending = 0, opposition = 0, certificates_pending = 0;
    const stageMap = {}, cityMap = {}, consultantMap = {}, personMap = {};

    records.forEach(r => {
      total++;
      if (r.archived) {
        archived++;
        return; // Skip archived for stats
      }
      active++;

      const subStage = r.sub_stage || '';
      if (subStage.toLowerCase().includes('hearing scheduled')) hearings_pending++;
      if (subStage.toLowerCase().includes('opposition')) opposition++;
      if (subStage.toLowerCase().includes('certificate') && !subStage.toLowerCase().includes('dispatched')) certificates_pending++;

      if (r.stage) stageMap[r.stage] = (stageMap[r.stage] || 0) + 1;
      if (r.assigned_city) cityMap[r.assigned_city] = (cityMap[r.assigned_city] || 0) + 1;
      if (r.consultant_name) consultantMap[r.consultant_name] = (consultantMap[r.consultant_name] || 0) + 1;
      if (r.assigned_person) personMap[r.assigned_person] = (personMap[r.assigned_person] || 0) + 1;
    });

    const formatMap = (map, keyName) => Object.entries(map)
      .map(([k, v]) => ({ [keyName]: k, count: v }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        total, active, archived, hearings_pending, opposition, certificates_pending,
        per_stage: Object.entries(stageMap).map(([stage, count]) => ({ stage, count })).sort((a, b) => a.stage.localeCompare(b.stage)),
        per_city: formatMap(cityMap, 'city'),
        per_consultant: formatMap(consultantMap, 'consultant'),
        per_person: formatMap(personMap, 'person'),
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
// We can temporarily disable bulk imports or rewrite it simply
app.post('/api/import', async (req, res) => {
  res.status(501).json({ success: false, error: 'Bulk import via API is disabled when using Google Sheets directly. Copy paste into sheet instead.' });
});

app.post('/api/sync-sheets', async (req, res) => {
  res.status(501).json({ success: false, error: 'Sync not needed when using Sheets as primary database.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, 'localhost', () => {
    console.log(`BrandEx API running on http://localhost:${PORT}`);
  });
}

// ── ASSIGNMENTS (MAPPED TO TRADEMARKS) ───────────────────────────────────────
app.get('/api/assignments/stats', async (req, res) => {
  try {
    const records = await getAllRecords();
    let total = 0, pending = 0, in_progress = 0, complete = 0;
    
    records.forEach(r => {
      if (!r.archived && r.assigned_person) {
        total++;
        if (r.sub_stage === 'Pending') pending++;
        if (r.sub_stage === 'In Progress') in_progress++;
        if (r.sub_stage === 'Complete') complete++;
      }
    });
    res.json({ success: true, data: { total, pending, in_progress, complete } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/assignments', async (req, res) => {
  try {
    const records = await getAllRecords();
    const data = records
      .filter(r => !r.archived && r.assigned_person)
      .map(r => ({
        id: r.id,
        trademark_id: r.id,
        tm_no: r.tm_no,
        app_name: r.applicant_name,
        class: r.class,
        stage: r.stage,
        agent_name: r.assigned_person,
        agent_city: r.assigned_city,
        status: r.sub_stage,
        assigned_at: r.updated_at
      }))
      .sort((a, b) => new Date(b.assigned_at || 0) - new Date(a.assigned_at || 0));
    
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/assignments/unassigned', async (req, res) => {
  try {
    const records = await getAllRecords();
    const data = records
      .filter(r => !r.archived && !r.assigned_person && (r.stage || '').toLowerCase().includes('stage 2'))
      .map(r => ({ ...r, app_name: r.applicant_name }));
      
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/assignments', async (req, res) => {
  try {
    const { trademark_id, agent_name, agent_city, notes } = req.body;
    
    // Simulate patch to update
    req.params = { id: trademark_id };
    req.body = { assigned_person: agent_name, assigned_city: agent_city, sub_stage: 'Pending', _changed_by: 'system' };
    
    // We can't trivially call the other route, so let's copy the logic or direct them
    return res.status(501).json({ success: false, error: 'Please use the standard PATCH endpoint for assignments.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.patch('/api/assignments/:id', async (req, res) => {
  try {
    // Should be handled by standard trademark patch now
    res.status(501).json({ success: false, error: 'Use PATCH /api/trademarks/:id directly' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/assignments/:id', async (req, res) => {
  try {
    // Handled by standard trademark patch
    res.status(501).json({ success: false, error: 'Use PATCH /api/trademarks/:id directly' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = app;
