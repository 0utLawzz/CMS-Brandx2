// ─── Config ────────────────────────────────────────────────────────────────
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzPMvLPhdXugWg7No78vyJXgc3e3h4mKDcQLAAsSvLRWQe36fyqlk7mRwIsQSB7PabmNLqKXG2cz/pub?gid=229416165&single=true&output=csv";

const COL = { DATE:0, CASE_NO:1, NAME:2, NUMBER:3, CLASS:4, STATUS:5, SUB_STATUS:6, DUPLICATE:7, TM11:8, NOTES:9, CITY:10 };

const STAGE_COLORS = { 1:'#C94A00', 2:'#0A6B52', 3:'#D4A800', 4:'#0D9970', 0:'#888888' };
const AVATAR_COLORS = ['#C94A00','#0A6B52','#D4A800','#0D9970','#8B2FC9','#2563EB','#DC2626','#7C3AED'];

const STATUS_SUB_MAP = {
  'STAGE 1': ['APPLICATION FILED','ACKNOWLEDGEMENT','EXAMINATION'],
  'STAGE 2': ['ASSIGNED - UZMA (KARACHI)','ASSIGNED - UZMA (LAHORE)','ASSIGNED - FASIAL (KARACHI)','ASSIGNED - RASHID (KARACHI)','ASSIGNED - SULMAN (KARACHI)','ACCEPTED','HEARING'],
  'STAGE 3': ['PUBLISHED','OPPO: WITHDRAWN','OPPO: FILED','OPPO: RECEIVED','DEMAND NOTE RECEIVED','DEMAND NOTE PAID'],
  'STAGE 4': ['CERTIFICATE RECEIVED','CERTIFICATE DISPATCH','HEARING'],
  'STOPPED': ['ABANDONED','NOTE','HOLD','REFUSED'],
  'COPYRIGHT': ['FILED','IN NEWSPAPERS','ACKNOWLEDGEMENT','EXAMINATION','CERTIFICATE RECEIVED','CERTIFICATE DISPATCHED'],
};
const STATUS_LIST = Object.keys(STATUS_SUB_MAP);

// ─── State ─────────────────────────────────────────────────────────────────
let allRows = [], headers = [];
let sortKey = 'date';
let localEdits = {};
const deletedCases = new Set();
const selectedCases = new Set();

// ─── CSV Parser ─────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const parse = (line) => {
    const res = []; let cur = ''; let inQ = false;
    for (let c of line) {
      if (c === '"') { inQ = !inQ; } else if (c === ',' && !inQ) { res.push(cur.trim()); cur = ''; } else { cur += c; }
    }
    res.push(cur.trim()); return res;
  };
  const hdr = parse(lines[0]);
  const rows = lines.slice(1).map(parse).filter(r => r.some(c => c));
  return { headers: hdr, rows };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const norm = s => (s || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
const toBool = s => { const v = norm(s); return v === 'true' || v === '1' || v === 'yes'; };

function getStageNum(status) {
  const v = norm(status);
  if (/stage[\s_]*4/.test(v) || v.includes('4️⃣')) return 4;
  if (/stage[\s_]*3/.test(v) || v.includes('3️⃣')) return 3;
  if (/stage[\s_]*2/.test(v) || v.includes('2️⃣')) return 2;
  if (/stage[\s_]*1/.test(v) || v.includes('1️⃣')) return 1;
  return 0;
}

function getSubStyle(sub) {
  const v = norm(sub);
  if (!v) return { color:'#888', bg:'#f5f5f5', border:'#ccc' };
  if (/(accept|done|certif|stage.*4|4️⃣|registered)/.test(v)) return { color:'#0A6B52', bg:'rgba(13,153,112,0.08)', border:'#0D9970' };
  if (/(stop|abandon|reject|refus|hold|withdraw)/.test(v)) return { color:'#C94A00', bg:'rgba(201,74,0,0.08)', border:'#C94A00' };
  if (/(demand note|d-note|oppo|published)/.test(v)) return { color:'#1a4fa0', bg:'rgba(37,99,235,0.07)', border:'#2563EB' };
  if (/(exam|stage.*[1-3]|filed|ack|process)/.test(v)) return { color:'#A07800', bg:'rgba(212,168,0,0.08)', border:'#D4A800' };
  return { color:'#555', bg:'rgba(102,102,102,0.06)', border:'#ccc' };
}

function hashCode(str) {
  let h = 0;
  for (let c of str) { h = ((h << 5) - h) + c.charCodeAt(0); h |= 0; }
  return Math.abs(h);
}

function avatarInitials(name) {
  const clean = (name || 'TM').replace(/[^a-zA-Z0-9\s]/g,'').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  return words.slice(0,2).map(w => w[0].toUpperCase()).join('') || 'TM';
}

function avatarColor(name) { return AVATAR_COLORS[hashCode(name) % AVATAR_COLORS.length]; }

function getRow(row) {
  const caseNo = row[COL.CASE_NO] || '';
  const edits = localEdits[caseNo];
  if (!edits) return row;
  const merged = [...row];
  Object.entries(edits).forEach(([idx, val]) => { merged[parseInt(idx)] = val; });
  return merged;
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function computeStats(rows) {
  const stages = { s1:0, s2:0, s3:0, s4:0, stopped:0 };
  let exam=0, accepted=0, dnote=0, dpaid=0, cert=0;
  for (const r of rows) {
    const sub = norm(r[COL.SUB_STATUS]||'');
    const st  = norm(r[COL.STATUS]||'');
    const sn = getStageNum(r[COL.STATUS]||'');
    if (sn===1) stages.s1++;
    else if (sn===2) stages.s2++;
    else if (sn===3) stages.s3++;
    else if (sn===4) stages.s4++;
    else if (/abandon|stop|hold|refus/.test(sub||st)) stages.stopped++;
    if (sub.includes('exam')) exam++;
    if (sub.includes('accept')) accepted++;
    if (sub.includes('demand note paid')||sub.includes('d-note paid')) dpaid++;
    else if (sub.includes('demand note')||sub.includes('d-note')) dnote++;
    if (sub.includes('cert')||sn===4) cert++;
  }
  return { total:rows.length, exam, accepted, dnote, dpaid, cert, stages };
}

// ─── Render chart ───────────────────────────────────────────────────────────
function renderChart(stats) {
  const card = document.getElementById('chartCard');
  const barsEl = document.getElementById('stageBars');
  const totalBadge = document.getElementById('chartTotal');
  if (!stats.total) { card.style.display='none'; return; }
  card.style.display='block';
  totalBadge.textContent = stats.total + ' TOTAL';
  const BARS = [
    { key:'s1', label:'STAGE 1', color:'#C94A00' },
    { key:'s2', label:'STAGE 2', color:'#0A6B52' },
    { key:'s3', label:'STAGE 3', color:'#D4A800' },
    { key:'s4', label:'STAGE 4', color:'#0D9970' },
    { key:'stopped', label:'STOPPED', color:'#888' },
  ];
  barsEl.innerHTML = BARS.map(({ key, label, color }) => {
    const count = stats.stages[key] || 0;
    const pct = stats.total ? (count / stats.total * 100) : 0;
    return `<div class="bar-row">
      <span class="bar-label">${label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct,pct>0?1:0)}%;background:${color}"></div></div>
      <span class="bar-count" style="color:${color}">${count}</span>
    </div>`;
  }).join('');
}

// ─── Render stats ────────────────────────────────────────────────────────────
function renderStats(stats) {
  document.getElementById('s-total').textContent    = stats.total.toLocaleString();
  document.getElementById('s-exam').textContent     = stats.exam.toLocaleString();
  document.getElementById('s-accepted').textContent = stats.accepted.toLocaleString();
  document.getElementById('s-dnote').textContent    = stats.dnote.toLocaleString();
  document.getElementById('s-dpaid').textContent    = stats.dpaid.toLocaleString();
  document.getElementById('s-cert').textContent     = stats.cert.toLocaleString();
}

// ─── Render search card ──────────────────────────────────────────────────────
function renderSearchCard(row, hdrs) {
  const r = getRow(row);
  const date     = r[COL.DATE] || '';
  const caseNo   = r[COL.CASE_NO] || '—';
  const name     = r[COL.NAME] || 'Untitled Mark';
  const tmNo     = r[COL.NUMBER] || '—';
  const cls      = r[COL.CLASS] || '';
  const status   = r[COL.STATUS] || '';
  const subStatus= r[COL.SUB_STATUS] || '';
  const city     = r[COL.CITY] || '';
  const isDup    = toBool(r[COL.DUPLICATE]);
  const isTm11   = toBool(r[COL.TM11]);

  const stageNum  = getStageNum(status);
  const stageColor= STAGE_COLORS[stageNum] || '#888';
  const subSt     = getSubStyle(subStatus);
  const initials  = avatarInitials(name);
  const avColor   = avatarColor(name);
  const id        = 'card_' + Math.random().toString(36).slice(2);

  const dupClass  = isDup  ? 'bool-warn' : 'bool-off';
  const tm11Class = isTm11 ? 'bool-pos'  : 'bool-off';
  const dupIcon   = isDup  ? '⚠' : '○';
  const tm11Icon  = isTm11 ? '✓' : '○';

  const kvRows = hdrs.map((h, i) => {
    const val = (r[i]||'').trim();
    return `<div class="kv-row"><span class="kv-key">${h}</span><span class="kv-val">${val||'—'}</span></div>`;
  }).join('');

  return `
  <div class="result-card" id="${id}">
    <div class="card-top-row">
      <span class="card-date">${date}</span>
      ${city ? `<span class="card-city">${city.toUpperCase()}</span>` : ''}
    </div>
    <div class="card-main">
      <div class="avatar" style="background:${avColor}">
        <span>${initials}</span>
        <span class="avatar-tm">™</span>
      </div>
      <div class="card-info">
        <div class="card-name">${name}</div>
        <div class="card-tm-row">
          <span class="card-tm-icon">™</span>
          <span class="card-tm-no">${tmNo}</span>
          ${cls ? `<span class="card-class">CLASS ${cls}</span>` : ''}
        </div>
      </div>
      <div class="card-stage-box">
        <span class="card-stage-text" style="color:${stageColor}">${stageNum > 0 ? 'S'+stageNum : '?'}</span>
      </div>
    </div>
    ${status ? `<div class="card-status-bar" style="border-color:${stageColor}">
      <span class="card-status-label" style="color:${stageColor}">${status.toUpperCase()}</span>
    </div>` : ''}
    ${subStatus ? `<div class="sub-status-badge" style="color:${subSt.color};background:${subSt.bg};border-color:${subSt.border}">${subStatus.toUpperCase()}</div>` : ''}
    <div class="indicators">
      <div class="bool-indicator ${dupClass}">
        <span class="bool-icon">${dupIcon}</span>
        <div class="bool-info">
          <span class="bool-lbl">Duplicate</span>
          <span class="bool-val">${isDup ? 'YES ⚠' : 'NO'}</span>
        </div>
      </div>
      <div class="bool-indicator ${tm11Class}">
        <span class="bool-icon">${tm11Icon}</span>
        <div class="bool-info">
          <span class="bool-lbl">TM-11</span>
          <span class="bool-val">${isTm11 ? 'YES' : 'NO'}</span>
        </div>
      </div>
    </div>
    <div class="card-actions">
      <button class="expand-btn" onclick="toggleKV('kv_${id}', this)">▼ ALL FIELDS</button>
      <button class="edit-btn" onclick="openEditModal(${JSON.stringify(row).replace(/"/g,'&quot;')})">✎ EDIT</button>
    </div>
    <div id="kv_${id}" class="kv-table" style="display:none">${kvRows}</div>
  </div>`;
}

function toggleKV(kvId, btn) {
  const el = document.getElementById(kvId);
  const hidden = el.style.display === 'none';
  el.style.display = hidden ? 'block' : 'none';
  btn.textContent = hidden ? '▲ HIDE FIELDS' : '▼ ALL FIELDS';
}

// ─── Search ──────────────────────────────────────────────────────────────────
function doSearch() {
  const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const resultsEl = document.getElementById('searchResults');
  if (!q) { resultsEl.innerHTML = `<div class="no-results"><div class="no-results-title">START SEARCHING</div><p class="no-results-hint">Enter an app number, TM No or mark name.</p></div>`; return; }
  const matches = allRows.filter(r =>
    (r[COL.NUMBER]||'').toLowerCase() === q ||
    (r[COL.NAME]||'').toLowerCase().includes(q) ||
    (r[COL.CASE_NO]||'').toLowerCase().includes(q)
  );
  if (!matches.length) {
    resultsEl.innerHTML = `<div class="no-results"><div class="no-results-title">NO MATCHES</div><p class="no-results-hint">Nothing found for "${q}".</p></div>`;
    return;
  }
  const header = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:8px;border-bottom:2.5px solid #0C0C0C">
    <span style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px">SEARCH RESULTS</span>
    <span style="font-family:'DM Mono',monospace;font-size:11px;color:#C94A00">${matches.length} MATCH${matches.length !== 1 ? 'ES' : ''}</span>
  </div>`;
  resultsEl.innerHTML = header + matches.map(r => renderSearchCard(r, headers)).join('');
}

// ─── Records Table ────────────────────────────────────────────────────────────
function renderRecordsTable() {
  const q = (document.getElementById('filterInput') ? document.getElementById('filterInput').value : '').trim().toLowerCase();
  let rows = allRows.filter(r => !deletedCases.has(r[COL.CASE_NO]||''));
  if (q) rows = rows.filter(r => r.some(v => (v||'').toLowerCase().includes(q)));

  rows.sort((a, b) => {
    if (sortKey === 'name') return (a[COL.NAME]||'').localeCompare(b[COL.NAME]||'');
    if (sortKey === 'status') return (a[COL.STATUS]||'').localeCompare(b[COL.STATUS]||'');
    if (sortKey === 'city') return (a[COL.CITY]||'').localeCompare(b[COL.CITY]||'');
    return (a[COL.DATE]||'').localeCompare(b[COL.DATE]||'');
  });

  document.getElementById('recordsCount').textContent = rows.length + ' records';

  const tbody = document.getElementById('recordsTbody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#888;font-family:'DM Mono',monospace;font-size:11px">NO RECORDS${q ? ' — clear filter to see all' : ''}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(rawRow => {
    const r = getRow(rawRow);
    const caseNo   = r[COL.CASE_NO] || '—';
    const date     = r[COL.DATE]    || '—';
    const name     = r[COL.NAME]    || '—';
    const tmNo     = r[COL.NUMBER]  || '—';
    const cls      = r[COL.CLASS]   || '—';
    const status   = r[COL.STATUS]  || '';
    const sub      = r[COL.SUB_STATUS] || '';
    const city     = r[COL.CITY]    || '';
    const stageNum = getStageNum(status);
    const sc       = STAGE_COLORS[stageNum] || '#888';
    const subSt    = getSubStyle(sub);
    const isSel    = selectedCases.has(caseNo);
    const rowData  = JSON.stringify(rawRow).replace(/"/g, '&quot;');

    return `<tr class="${isSel ? 'tr-selected' : ''}">
      <td><input type="checkbox" class="row-check" data-case="${caseNo}" ${isSel?'checked':''}></td>
      <td class="td-date">${date}</td>
      <td class="td-case">${caseNo}</td>
      <td class="td-name">${name}</td>
      <td class="td-tm">™&nbsp;${tmNo}</td>
      <td><span class="td-cls">${cls}</span></td>
      <td><span class="stage-badge" style="background:${sc};border-color:${sc}">${stageNum > 0 ? 'S'+stageNum : '?'}</span></td>
      <td>${sub ? `<span class="sub-badge-sm" style="color:${subSt.color};background:${subSt.bg};border-color:${subSt.border}" title="${sub.toUpperCase()}">${sub.toUpperCase()}</span>` : '—'}</td>
      <td>${city ? `<span class="td-city">${city.toUpperCase()}</span>` : '—'}</td>
      <td>
        <div class="action-cell">
          <button class="action-tick ${isSel?'checked':''}" data-case="${caseNo}" title="Select">✓</button>
          <button class="action-edit" onclick="openEditModal(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(rawRow))}')))" title="Edit">✎</button>
          <button class="action-del" onclick="deleteRow('${caseNo.replace(/'/g,"\\'")}')" title="Delete">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Attach checkbox listeners
  tbody.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const cn = cb.dataset.case;
      cb.checked ? selectedCases.add(cn) : selectedCases.delete(cn);
      renderRecordsTable();
    });
  });
  tbody.querySelectorAll('.action-tick').forEach(btn => {
    btn.addEventListener('click', () => {
      const cn = btn.dataset.case;
      selectedCases.has(cn) ? selectedCases.delete(cn) : selectedCases.add(cn);
      renderRecordsTable();
    });
  });
}

function deleteRow(caseNo) {
  if (!confirm(`Remove "${caseNo}" from this session?\n(Does not affect the Google Sheet.)`)) return;
  deletedCases.add(caseNo);
  renderRecordsTable();
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
let editingRow = null;

function populateClassSelect() {
  const sel = document.getElementById('editClass');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select class —</option>';
  for (let i = 1; i <= 45; i++) sel.innerHTML += `<option>${i}</option>`;
}

function populateStatusSelect() {
  const sel = document.getElementById('editStatus');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select status —</option>';
  STATUS_LIST.forEach(s => sel.innerHTML += `<option>${s}</option>`);
}

function syncSubStatus() {
  const status = document.getElementById('editStatus').value;
  const subSel = document.getElementById('editSubStatus');
  const subs = STATUS_SUB_MAP[status] || [];
  subSel.innerHTML = '<option value="">— Select sub-status —</option>';
  subs.forEach(s => subSel.innerHTML += `<option>${s}</option>`);
  subSel.disabled = !subs.length;
}

function openEditModal(row) {
  editingRow = row;
  const r = getRow(row);
  document.getElementById('modalCase').textContent = r[COL.CASE_NO] || '';
  document.getElementById('editName').value = r[COL.NAME] || '';
  document.getElementById('editTmNo').value = r[COL.NUMBER] || '';
  document.getElementById('editNotes').value = r[COL.NOTES] || '';
  document.getElementById('editCity').value = r[COL.CITY] || '';
  document.getElementById('editClass').value = r[COL.CLASS] || '';
  document.getElementById('editStatus').value = r[COL.STATUS] || '';
  syncSubStatus();
  document.getElementById('editSubStatus').value = r[COL.SUB_STATUS] || '';
  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
  editingRow = null;
}

function saveEdit() {
  if (!editingRow) return;
  const caseNo = editingRow[COL.CASE_NO] || '';
  if (!localEdits[caseNo]) localEdits[caseNo] = {};
  localEdits[caseNo][COL.NAME]       = document.getElementById('editName').value;
  localEdits[caseNo][COL.NUMBER]     = document.getElementById('editTmNo').value;
  localEdits[caseNo][COL.CLASS]      = document.getElementById('editClass').value;
  localEdits[caseNo][COL.CITY]       = document.getElementById('editCity').value;
  localEdits[caseNo][COL.STATUS]     = document.getElementById('editStatus').value;
  localEdits[caseNo][COL.SUB_STATUS] = document.getElementById('editSubStatus').value;
  localEdits[caseNo][COL.NOTES]      = document.getElementById('editNotes').value;
  closeEditModal();
  renderRecordsTable();
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-'+id));
  if (id === 'records') renderRecordsTable();
}

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadData() {
  const chip = document.getElementById('statusChip');
  const statusText = document.getElementById('statusText');
  chip.className = 'status-chip';
  statusText.textContent = 'Loading data…';
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const parsed = parseCSV(text);
    headers = parsed.headers;
    allRows = parsed.rows;
    const stats = computeStats(allRows);
    renderChart(stats);
    renderStats(stats);
    chip.className = 'status-chip ok';
    statusText.textContent = allRows.length.toLocaleString() + ' records ready';
    // Pre-render empty search state
    document.getElementById('searchResults').innerHTML = `<div class="no-results"><div class="no-results-title">START SEARCHING</div><p class="no-results-hint">Enter an application number, TM No or mark name above.</p></div>`;
  } catch (err) {
    chip.className = 'status-chip error';
    statusText.textContent = 'Error: ' + err.message;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateClassSelect();
  populateStatusSelect();

  // Tab nav
  document.getElementById('tabNav').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn) switchTab(btn.dataset.tab);
  });

  // Search
  document.getElementById('searchBtn').addEventListener('click', doSearch);
  document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  // Refresh
  document.getElementById('refreshBtn').addEventListener('click', loadData);

  // Filter records
  document.getElementById('filterInput').addEventListener('input', renderRecordsTable);

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sortKey = btn.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderRecordsTable();
    });
  });

  // Select all
  document.getElementById('selectAll').addEventListener('change', e => {
    const check = e.target.checked;
    document.querySelectorAll('.row-check').forEach(cb => {
      const cn = cb.dataset.case;
      check ? selectedCases.add(cn) : selectedCases.delete(cn);
    });
    renderRecordsTable();
  });

  // Modal
  document.getElementById('editStatus').addEventListener('change', syncSubStatus);
  document.getElementById('modalClose').addEventListener('click', closeEditModal);
  document.getElementById('modalCancel').addEventListener('click', closeEditModal);
  document.getElementById('modalSave').addEventListener('click', saveEdit);
  document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editModal')) closeEditModal();
  });

  loadData();
});
