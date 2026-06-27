'use strict';
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const multer   = require('multer');
const fs       = require('fs');

// Load .env only when running locally (Vercel injects env vars automatically)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

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

// ── Field Definitions (for {{tag}} system) ────────────────────────────────────
const FIELD_DEFS = [
  { key: 'sr_no',               tag: '{{sr_no}}',               label: 'Serial No' },
  { key: 'prefix',              tag: '{{prefix}}',              label: 'Prefix (X/A/N)' },
  { key: 'client_no',           tag: '{{client_no}}',           label: 'Client No' },
  { key: 'case_no',             tag: '{{case_no}}',             label: 'Case No' },
  { key: 'folder_name',         tag: '{{folder_name}}',         label: 'Folder No' },
  { key: 'tm_no',               tag: '{{tm_no}}',               label: 'TM Number' },
  { key: 'filing_date',         tag: '{{filing_date}}',         label: 'Filing Date' },
  { key: 'application_date',    tag: '{{application_date}}',    label: 'Application Date' },
  { key: 'application_name',    tag: '{{application_name}}',    label: 'Application Name' },
  { key: 'application_type',    tag: '{{application_type}}',    label: 'Application Type' },
  { key: 'applicant_name',      tag: '{{applicant_name}}',      label: 'Applicant Name' },
  { key: 'applicant_so',        tag: '{{applicant_so}}',        label: "Father's Name (S/O)" },
  { key: 'applicant_cnic',      tag: '{{applicant_cnic}}',      label: 'CNIC / NTN / Passport' },
  { key: 'applicant_type',      tag: '{{applicant_type}}',      label: 'Applicant Type' },
  { key: 'applicant_address',   tag: '{{applicant_address}}',   label: 'Applicant Address' },
  { key: 'city',                tag: '{{city}}',                label: 'City' },
  { key: 'class',               tag: '{{class}}',               label: 'Class (01–45)' },
  { key: 'class_desc',          tag: '{{class_desc}}',          label: 'Class Description' },
  { key: 'tm_trade',            tag: '{{tm_trade}}',            label: 'Trade / Brand Name' },
  { key: 'consultant_name',     tag: '{{consultant_name}}',     label: 'Consultant Name' },
  { key: 'consultant_address',  tag: '{{consultant_address}}',  label: 'Consultant Address' },
  { key: 'stage',               tag: '{{stage}}',               label: 'Stage' },
  { key: 'sub_stage',           tag: '{{sub_stage}}',           label: 'Sub-Stage / Status' },
  { key: 'assigned_person',     tag: '{{assigned_person}}',     label: 'Assigned Person' },
  { key: 'assigned_city',       tag: '{{assigned_city}}',       label: 'Assigned City' },
  { key: 'stamp_issue_date',    tag: '{{stamp_issue_date}}',    label: 'Stamp Issue Date' },
  { key: 'stamp_expiry_date',   tag: '{{stamp_expiry_date}}',   label: 'Stamp Expiry Date' },
  { key: 'issue_date',          tag: '{{issue_date}}',          label: 'Issue Date (legacy)' },
  { key: 'expiry_date',         tag: '{{expiry_date}}',         label: 'Expiry Date (legacy)' },
  { key: 'journal_date',        tag: '{{journal_date}}',        label: 'Journal Date' },
  { key: 'year',                tag: '{{year}}',                label: 'Year' },
  { key: 'img',                 tag: '{{img}}',                 label: 'Image / Drive ID' },
  { key: 'mark_text',           tag: '{{mark_text}}',           label: 'Word Mark (no image)' },
  { key: 'notes',               tag: '{{notes}}',               label: 'Notes' },
  { key: 'status',              tag: '{{status}}',              label: 'Status (Mail Merge Trigger)' },
];

// ── Stage / Sub-Stage Definitions ─────────────────────────────────────────────
const STAGES = {
  'Stage 1': [
    'APPLICATION FILED', 'ACKNOWLEGMENT', 'EXAMINATION',
  ],
  'Stage 2': [
    'ASSIGNED', 'ACCEPTED', 'HEARING',
  ],
  'Stage 3': [
    'PUBLISHED', 'OPPOSITION', 'DEMAND-NOTE RECEIVED', 'TM-11 (D-NOTE) PAID',
  ],
  'Stage 4': [
    'CERTIFICATE RECEIVED', 'CERTIFICATE DISPATCH', 'HEARING/OPPO',
  ],
};

// ── Updated headers to include all new fields ─────────────────────────────────
const ALLOWED_FIELDS = [
  'filing_date','sr_no','tm_no','applicant_name','applicant_so','applicant_cnic',
  'applicant_type','applicant_address','class','class_desc','tm_trade',
  'consultant_name','consultant_address','stage','sub_stage',
  'assigned_person','assigned_city','stamp_issue_date','stamp_expiry_date',
  'issue_date','expiry_date',
  'folder_name','img','notes','year','archived',
  // New fields
  'prefix','client_no','case_no','city',
  'application_name','application_date','application_type',
  'journal_date','mark_text','status','status_run',
];

const HEADERS = [
  'id', 'filing_date', 'sr_no', 'tm_no', 'applicant_name', 'applicant_so',
  'applicant_cnic', 'applicant_type', 'applicant_address', 'class', 'class_desc',
  'tm_trade', 'consultant_name', 'consultant_address', 'stage', 'sub_stage',
  'assigned_person', 'assigned_city', 'stamp_issue_date', 'stamp_expiry_date',
  'issue_date', 'expiry_date',
  'folder_name', 'img', 'notes', 'year', 'archived', 'created_at', 'updated_at',
  // New fields appended (cols AC onwards)
  'prefix', 'client_no', 'case_no', 'city',
  'application_name', 'application_date', 'application_type',
  'journal_date', 'mark_text', 'status', 'status_run',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractYear(d) {
  const m = (d || '').match(/\b(20\d{2})\b/);
  return m ? m[1] : null;
}

/** Resolve stage number from a raw stage string (matches frontend logic) */
function getStageNum(stage) {
  if (!stage) return 0;
  const v = stage.replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF]/gu, '').trim().toUpperCase();
  if (/STAGE[\s_]*4/.test(v))  return 4;
  if (/STAGE[\s_]*3/.test(v))  return 3;
  if (/STAGE[\s_]*2/.test(v))  return 2;
  if (/STAGE[\s_]*1/.test(v))  return 1;
  if (/^(APPLICATION FILED|ACKNOWLEGMENT|EXAMINATION)/.test(v)) return 1;
  if (/^(ASSIGNED|ACCEPTED|HEARING$)/.test(v)) return 2;
  if (/^(PUBLISHED|OPPOSITION|DEMAND-NOTE RECEIVED|TM-11 \(D-NOTE\) PAID)/.test(v)) return 3;
  if (/^(CERTIFICATE RECEIVED|CERTIFICATE DISPATCH|HEARING\/OPPO)/.test(v)) return 4;
  if (/^(STOP|ABANDON|HOLD|REFUS|^NOTE$)/.test(v)) return -1;
  if (/^COPYRIGHT/.test(v)) return -2;
  return 0;
}

/** Auto-generate folder number from prefix, client_no, case_no */
function buildFolderName(prefix, clientNo, caseNo) {
  if (!prefix || !clientNo || !caseNo) return '';
  return `${prefix}-${clientNo}-${caseNo}`;
}

/** Generate SR No: PB-ISB- + 18 alphanumeric characters */
function genSrNo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 18; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'PB-ISB-' + rand;
}

function rowToObject(row) {
  const obj = {};
  HEADERS.forEach((h, i) => { obj[h] = row[i] || ''; });
  obj.id       = obj.id ? String(obj.id) : null;
  obj.archived = obj.archived === 'true' || obj.archived === 'TRUE';
  return obj;
}

function objectToRow(obj) {
  return HEADERS.map(h => {
    if (obj[h] === null || obj[h] === undefined) return '';
    return String(obj[h]);
  });
}

async function getAllRecords() {
  const sheets = getSheetsClient();
  if (!sheets) throw new Error('Sheets client not initialized');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Trademarks!A2:AK',
  });
  const rows = res.data.values || [];
  return rows.map((row, index) => {
    const obj = rowToObject(row);
    obj._sheetRowIndex = index + 2;
    return obj;
  }).filter(r => r.id);
}

async function patchRecord(sheets, id, fields, body, changedBy) {
  const records = await getAllRecords();
  const current = records.find(r => r.id === String(id));
  if (!current) return null;

  if (body.filing_date && !body.year) {
    body.year = extractYear(body.filing_date);
    if (body.year && !fields.includes('year')) fields.push('year');
  }

  // Auto-build folder_name if prefix/client_no/case_no provided
  const pfx = body.prefix || current.prefix;
  const cln = body.client_no || current.client_no;
  const csn = body.case_no || current.case_no;
  if ((body.prefix || body.client_no || body.case_no) && pfx && cln && csn) {
    body.folder_name = buildFolderName(pfx, cln, csn);
    if (!fields.includes('folder_name')) fields.push('folder_name');
  }

  const updatedObj = { ...current };
  fields.forEach(f => updatedObj[f] = body[f]);
  updatedObj.updated_at = new Date().toISOString();
  delete updatedObj._sheetRowIndex;

  const rowNumber = current._sheetRowIndex;
  const row = objectToRow(updatedObj);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Trademarks!A${rowNumber}:AN${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  const changes = {};
  for (const f of fields) {
    changes[f] = { old: current[f], new: body[f] };
  }
  await writeAuditLog(id, changes, changedBy);
  return updatedObj;
}

async function writeAuditLog(recordId, changes, changedBy = 'system') {
  const sheets = getSheetsClient();
  if (!sheets) return;
  const rows = [];
  const now = new Date().toISOString();
  for (const [field, { old: oldVal, new: newVal }] of Object.entries(changes)) {
    if (String(oldVal || '') !== String(newVal || '')) {
      rows.push([
        Date.now() + Math.floor(Math.random() * 1000),
        recordId, field, oldVal ?? '', newVal ?? '', changedBy, now,
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
      console.error('Failed to write audit log:', err.message);
    }
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const ok = getSheetsClient() !== null;
  res.json({ status: 'ok', database: ok ? 'connected' : 'disconnected', spreadsheetId });
});

// ── Field definitions for {{tag}} system ──────────────────────────────────────
app.get('/api/fields', (req, res) => {
  res.json({ success: true, data: FIELD_DEFS });
});

// ── Stage definitions ─────────────────────────────────────────────────────────
app.get('/api/stages', (req, res) => {
  res.json({ success: true, data: STAGES });
});

// ── GET trademarks (paginated, search, filter) ────────────────────────────────
app.get('/api/trademarks', async (req, res) => {
  try {
    const {
      q, stage, sub_stage, assigned_person, assigned_city, year, city,
      archived = 'false',
      page = 1, limit = 50,
    } = req.query;

    let records = await getAllRecords();

    const isArchived = archived === 'true';
    records = records.filter(r => r.archived === isArchived);

    if (q) {
      const qLower = q.toLowerCase();
      records = records.filter(r =>
        (r.tm_no             || '').toLowerCase().includes(qLower) ||
        (r.sr_no             || '').toLowerCase().includes(qLower) ||
        (r.applicant_name    || '').toLowerCase().includes(qLower) ||
        (r.application_name  || '').toLowerCase().includes(qLower) ||
        (r.applicant_cnic    || '').toLowerCase().includes(qLower) ||
        (r.class             || '').toLowerCase().includes(qLower) ||
        (r.folder_name       || '').toLowerCase().includes(qLower) ||
        (r.consultant_name   || '').toLowerCase().includes(qLower)
      );
    }

    if (stage)           records = records.filter(r => r.stage === stage);
    if (sub_stage)       records = records.filter(r => r.sub_stage === sub_stage);
    if (assigned_person) records = records.filter(r => r.assigned_person === assigned_person);
    if (assigned_city)   records = records.filter(r => r.assigned_city === assigned_city);
    if (city)            records = records.filter(r => r.city === city);
    if (year)            records = records.filter(r => r.year === year);

    records.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return (b._sheetRowIndex || 0) - (a._sheetRowIndex || 0);
    });

    const total    = records.length;
    const lim      = parseInt(limit) || 5000;
    const offset   = (parseInt(page) - 1) * lim;
    const paginated = records.slice(offset, offset + lim);
    paginated.forEach(r => delete r._sheetRowIndex);

    res.json({
      success: true, total,
      page: parseInt(page), limit: lim,
      pages: Math.ceil(total / lim),
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
    const record  = records.find(r => r.id === req.params.id);
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
    const now   = new Date().toISOString();
    const obj   = { id: newId };
    ALLOWED_FIELDS.forEach(f => obj[f] = b[f] || '');
    obj.year       = b.year || extractYear(b.filing_date) || '';
    obj.archived   = 'FALSE';
    obj.created_at = now;
    obj.updated_at = now;

    // Auto-generate SR No if not provided
    if (!obj.sr_no) obj.sr_no = genSrNo();

    // Auto-build folder_name from prefix + client_no + case_no
    if (b.prefix && b.client_no && b.case_no) {
      obj.folder_name = buildFolderName(b.prefix, b.client_no, b.case_no);
    }

    const row = objectToRow(obj);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Trademarks!A:AN',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    const changes = {};
    ALLOWED_FIELDS.forEach(f => { const v = obj[f]; if (v) changes[f] = { old: null, new: v }; });
    await writeAuditLog(newId, changes, b._changed_by || 'system');

    res.status(201).json({ success: true, id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── UPDATE trademark ──────────────────────────────────────────────────────────
app.patch('/api/trademarks/:id', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const id        = req.params.id;
    const changedBy = req.body._changed_by || 'system';
    const body      = { ...req.body };
    delete body._changed_by;

    const fields = Object.keys(body).filter(k => ALLOWED_FIELDS.includes(k));
    if (!fields.length) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const updated = await patchRecord(sheets, id, fields, body, changedBy);
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SOFT DELETE (archive) ─────────────────────────────────────────────────────
app.delete('/api/trademarks/:id', async (req, res) => {
  try {
    const sheets    = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');
    const changedBy = req.query.by || 'system';
    const id        = req.params.id;

    const records = await getAllRecords();
    const current = records.find(r => r.id === id);
    if (!current) return res.status(404).json({ success: false, error: 'Not found' });

    const updatedObj = { ...current, archived: true, updated_at: new Date().toISOString() };
    delete updatedObj._sheetRowIndex;
    const rowNumber  = current._sheetRowIndex;
    const row        = objectToRow(updatedObj);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Trademarks!A${rowNumber}:AK${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    await writeAuditLog(id, { archived: { old: false, new: true } }, changedBy);
    res.json({ success: true, message: 'Archived' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 2-Way SYNC (fixes spurious "1 row updated" issue) ────────────────────────
// Only writes rows where sheet data differs from what we'd compute
app.post('/api/sync', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const records = await getAllRecords();
    let updated = 0;
    const now = new Date().toISOString();

    for (const rec of records) {
      const rowIdx = rec._sheetRowIndex;
      if (!rowIdx) continue;

      // Check if folder_name needs rebuild
      let needsUpdate = false;
      const expectedFolder = rec.prefix && rec.client_no && rec.case_no
        ? buildFolderName(rec.prefix, rec.client_no, rec.case_no)
        : rec.folder_name;

      if (expectedFolder && expectedFolder !== rec.folder_name) {
        needsUpdate = true;
        rec.folder_name = expectedFolder;
      }

      if (needsUpdate) {
        rec.updated_at = now;
        delete rec._sheetRowIndex;
        const row = objectToRow(rec);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Trademarks!A${rowIdx}:AK${rowIdx}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] },
        });
        updated++;
      }
    }

    // Log sync event
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Logs!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            Date.now(), 'SYNC', 'sync', '', `${updated} rows updated`, 'system', now,
          ]],
        },
      });
    } catch {}

    res.json({
      success: true,
      message: `Sync complete: ${updated} row${updated !== 1 ? 's' : ''} updated`,
      updated,
      total: records.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET audit logs for a single record ───────────────────────────────────────
app.get('/api/audit-logs/:id', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId, range: 'Logs!A2:G',
    });

    const logs = (resp.data.values || [])
      .filter(r => r[1] === req.params.id)
      .map(r => ({
        id: r[0], record_id: r[1], field_name: r[2],
        old_value: r[3], new_value: r[4], changed_by: r[5], changed_at: r[6],
        action: r[2] === 'created' ? 'CREATE' : (r[2] === 'archived' ? 'DELETE' : 'UPDATE'),
        note: `Changed ${r[2]}`,
      }))
      .sort((a, b) => new Date(b.changed_at || 0) - new Date(a.changed_at || 0));

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET global activity logs ──────────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit) || 500;
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const [logsResp, records] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Logs!A2:G' }),
      getAllRecords(),
    ]);

    const recordsMap = {};
    records.forEach(r => recordsMap[r.id] = r);

    const logs = (logsResp.data.values || [])
      .map(r => {
        const record_id = r[1];
        const tm        = recordsMap[record_id] || {};
        let action      = 'UPDATE';
        if (r[2] === 'created')                       action = 'CREATE';
        if (r[2] === 'archived' && r[4] === 'true')   action = 'DELETE';
        if (r[5] === 'system' && r[2] === 'sync')     action = 'SYNC';
        return {
          id: r[0], record_id,
          field_name: r[2], old_value: r[3], new_value: r[4],
          changed_by: r[5], changed_at: r[6],
          applicant_name: tm.applicant_name || tm.application_name,
          tm_no: tm.tm_no,
          action, note: r[4] || `Changed ${r[2]}`,
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

    let total = 0, active = 0, archived = 0;
    let run = 0, processing = 0, done = 0;
    let stage1 = 0, stage2 = 0, stage3 = 0, stage4 = 0, stopped = 0;
    let examination_pending = 0, assigned_pending = 0, published_pending = 0;
    let demand_note_pending = 0, opposition_count = 0;
    const stageMap = {}, cityMap = {}, consultantMap = {}, personMap = {};

    records.forEach(r => {
      total++;
      if (r.archived) { archived++; return; }
      active++;

      const ss = (r.sub_stage || '').toUpperCase();
      if (ss === 'RUN')        run++;
      else if (ss === 'PROCESSING') processing++;
      else if (ss === 'DONE')  done++;

      const sn = getStageNum(r.stage || '');
      if (sn === 1) stage1++;
      else if (sn === 2) stage2++;
      else if (sn === 3) stage3++;
      else if (sn === 4) stage4++;
      else if (sn === -1 || sn === -2) stopped++;

      // KPI sub-stage pending counts
      if (ss.includes('EXAMINATION'))         examination_pending++;
      if (ss.includes('ASSIGNED') && sn===2)  assigned_pending++;
      if (ss.includes('PUBLISHED'))           published_pending++;
      if (ss.includes('DEMAND NOTE'))         demand_note_pending++;
      if (ss.includes('OPPO') || ss.includes('OPPOSITION')) opposition_count++;

      if (r.stage)           stageMap[r.stage]           = (stageMap[r.stage]           || 0) + 1;
      if (r.city || r.assigned_city) {
        const c = r.city || r.assigned_city;
        cityMap[c] = (cityMap[c] || 0) + 1;
      }
      if (r.consultant_name) consultantMap[r.consultant_name] = (consultantMap[r.consultant_name] || 0) + 1;
      if (r.assigned_person) personMap[r.assigned_person] = (personMap[r.assigned_person] || 0) + 1;
    });

    const formatMap = (map, keyName) =>
      Object.entries(map)
        .map(([k, v]) => ({ [keyName]: k, count: v }))
        .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        total, active, archived,
        run, processing, done,
        stage1, stage2, stage3, stage4, stopped,
        // KPI pending counts
        examination_pending, assigned_pending, published_pending,
        demand_note_pending, opposition_count,
        per_stage:      Object.entries(stageMap).map(([stage, count]) => ({ stage, count })).sort((a, b) => a.stage.localeCompare(b.stage)),
        per_city:       formatMap(cityMap, 'city'),
        per_consultant: formatMap(consultantMap, 'consultant'),
        per_person:     formatMap(personMap, 'person'),
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

// ── ASSIGNMENTS (mapped to trademark fields) ──────────────────────────────────
app.get('/api/assignments/stats', async (req, res) => {
  try {
    const records = await getAllRecords();
    let total = 0, pending = 0, in_progress = 0, complete = 0;
    records.forEach(r => {
      if (!r.archived && r.assigned_person) {
        total++;
        if (r.sub_stage === 'Pending')     pending++;
        if (r.sub_stage === 'In Progress') in_progress++;
        if (r.sub_stage === 'Complete')    complete++;
      }
    });
    res.json({ success: true, data: { total, pending, in_progress, complete } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/assignments', async (req, res) => {
  try {
    const records = await getAllRecords();
    const data = records
      .filter(r => !r.archived && r.assigned_person)
      .map(r => ({
        id: r.id, trademark_id: r.id,
        tm_no: r.tm_no,
        applicant_name: r.application_name || r.applicant_name,
        class: r.class, stage: r.stage,
        city: r.city,
        agent_name: r.assigned_person, agent_city: r.assigned_city,
        status: r.sub_stage, assigned_at: r.updated_at,
        folder_name: r.folder_name,
        notes: r.notes,
      }))
      .sort((a, b) => new Date(b.assigned_at || 0) - new Date(a.assigned_at || 0));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/assignments/unassigned', async (req, res) => {
  try {
    const records = await getAllRecords();
    const data = records
      .filter(r => !r.archived && !r.assigned_person && (r.stage || '').toLowerCase().includes('stage 2'))
      .map(r => ({ ...r, app_name: r.application_name || r.applicant_name }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── EXPORT assignments as CSV ─────────────────────────────────────────────────
app.get('/api/assignments/export-csv', async (req, res) => {
  try {
    const records = await getAllRecords();
    const assigned = records.filter(r => !r.archived && r.assigned_person);

    const cols = ['folder_name','tm_no','application_name','applicant_name','class','stage',
                  'sub_stage','assigned_person','assigned_city','city','updated_at','notes'];
    const esc = v => '"' + (v || '').toString().replace(/"/g, '""') + '"';
    const csv = [cols.join(','), ...assigned.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="brandex_assignments.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assignments — assign a trademark to an agent
app.post('/api/assignments', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const { trademark_id, agent_name, agent_city, notes } = req.body;
    if (!trademark_id || !agent_name || !agent_city) {
      return res.status(400).json({ success: false, error: 'trademark_id, agent_name and agent_city are required' });
    }

    const body   = { assigned_person: agent_name, assigned_city: agent_city, sub_stage: 'Pending' };
    if (notes) body.notes = notes;
    const fields = Object.keys(body);

    const updated = await patchRecord(sheets, String(trademark_id), fields, body, 'system');
    if (!updated) return res.status(404).json({ success: false, error: 'Trademark not found' });

    res.json({ success: true, message: 'Assigned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/assignments/:id — reassign or change status
app.patch('/api/assignments/:id', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const id     = req.params.id;
    const body   = {};
    if (req.body.agent_name)  body.assigned_person = req.body.agent_name;
    if (req.body.agent_city)  body.assigned_city   = req.body.agent_city;
    if (req.body.status)      body.sub_stage        = req.body.status;
    if (req.body.notes)       body.notes            = req.body.notes;
    if (req.body.assigned_person) body.assigned_person = req.body.assigned_person;
    if (req.body.assigned_city)   body.assigned_city   = req.body.assigned_city;
    if (req.body.sub_stage)       body.sub_stage        = req.body.sub_stage;

    const fields = Object.keys(body).filter(k => ALLOWED_FIELDS.includes(k));
    if (!fields.length) {
      return res.status(400).json({ success: false, error: 'No valid fields provided' });
    }

    const updated = await patchRecord(sheets, id, fields, body, 'system');
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/assignments/:id — clear assignment fields
app.delete('/api/assignments/:id', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error('Sheets client not initialized');

    const body   = { assigned_person: '', assigned_city: '', sub_stage: '' };
    const fields = ['assigned_person', 'assigned_city', 'sub_stage'];
    const updated = await patchRecord(sheets, req.params.id, fields, body, 'system');
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Only listen when run directly (not via server.js) ────────────────────────
if (require.main === module) {
  app.listen(PORT, 'localhost', () => {
    console.log(`✅ BrandEx API running on http://localhost:${PORT}`);
    console.log(`📊 Sheet ID: ${spreadsheetId}`);
  });
}

module.exports = app;
