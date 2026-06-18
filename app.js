/* ═══════════════════════════════════════════════════════════════════
   BrandEx CMS — app.js  (Frontend SPA Logic)
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
const API = '';   // same-origin; server.js serves both

// ── Stage Definitions ─────────────────────────────────────────────────────────
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

// Stage → CSS class
function stageClass(stage) {
  if (!stage) return '';
  if (stage.includes('1')) return 'badge-stage1';
  if (stage.includes('2')) return 'badge-stage2';
  if (stage.includes('3')) return 'badge-stage3';
  if (stage.includes('4')) return 'badge-stage4';
  return 'badge-gold';
}

// Bar colors for charts
const BAR_COLORS = [
  '#f0c030','#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#ec4899','#6366f1',
];

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  records: {
    data: [],
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
    sort: 'created_at',
    sortDir: 'desc',
  },
  filters: {
    q: '',
    stage: '',
    sub_stage: '',
    assigned_person: '',
    assigned_city: '',
    year: '',
    archived: false,
  },
  panel: {
    open: false,
    recordId: null,
    currentTab: 'detail',
    record: null,
    editRecord: null,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

function fmt(v) { return v || '—'; }
function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Page Navigation ───────────────────────────────────────────────────────────
function showPage(name) {
  ['dashboard','records','archived'].forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.classList.add('hidden');
    const nav = document.getElementById(`nav-${p}`);
    if (nav) nav.classList.remove('active');
  });

  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.remove('hidden');
  const nav = document.getElementById(`nav-${name}`);
  if (nav) nav.classList.add('active');

  document.getElementById('page-title').textContent =
    name === 'dashboard' ? 'Dashboard' :
    name === 'records'   ? 'Trademark Records' :
    name === 'archived'  ? 'Archived Cases' : '';

  state.currentPage = name;
  closeSidebar();

  if (name === 'dashboard') loadStats();
  if (name === 'records')   { state.filters.archived = false; loadRecords(); }
  if (name === 'archived')  { state.filters.archived = true;  loadArchived(); }
}

// ── Sidebar (mobile) ──────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const { data } = await apiFetch('/api/stats');

    document.getElementById('stat-total').textContent      = data.total ?? 0;
    document.getElementById('stat-active').textContent     = data.active ?? 0;
    document.getElementById('stat-hearings').textContent   = data.hearings_pending ?? 0;
    document.getElementById('stat-opposition').textContent = data.opposition ?? 0;
    document.getElementById('stat-certs').textContent      = data.certificates_pending ?? 0;
    document.getElementById('stat-archived').textContent   = data.archived ?? 0;

    renderBars('stage-bars',      data.per_stage,      'stage',       'count', data.active);
    renderBars('city-bars',       data.per_city,       'city',        'count', data.active);
    renderBars('consultant-bars', data.per_consultant, 'consultant',  'count', data.active);
    renderBars('person-bars',     data.per_person,     'person',      'count', data.active);
  } catch (err) {
    console.error('Stats error:', err);
    toast('Failed to load dashboard stats', 'error');
  }
}

function renderBars(containerId, rows, labelKey, countKey, total) {
  const el = document.getElementById(containerId);
  if (!rows || !rows.length) {
    el.innerHTML = '<div class="text-gray text-sm">No data yet</div>';
    return;
  }
  const max = Math.max(...rows.map(r => r[countKey]), 1);
  el.innerHTML = rows.map((r, i) => {
    const pct = Math.round((r[countKey] / max) * 100);
    const color = BAR_COLORS[i % BAR_COLORS.length];
    return `<div class="stage-bar-item">
      <span class="stage-bar-label">${esc(r[labelKey] || 'Unknown')}</span>
      <div class="stage-bar-track">
        <div class="stage-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="stage-bar-count">${r[countKey]}</span>
    </div>`;
  }).join('');
}

// ── Records Table ─────────────────────────────────────────────────────────────
let _searchTimer = null;
function debounceSearch() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    state.filters.q = document.getElementById('search-input').value.trim();
    state.records.page = 1;
    loadRecords();
  }, 350);
}

function toggleFilters() {
  document.getElementById('filters-row').classList.toggle('hidden');
}

function applyFilters() {
  state.filters.stage           = document.getElementById('f-stage').value;
  state.filters.sub_stage       = document.getElementById('f-sub-stage').value;
  state.filters.assigned_person = document.getElementById('f-person').value;
  state.filters.assigned_city   = document.getElementById('f-city').value;
  state.filters.year            = document.getElementById('f-year').value;
  state.records.page = 1;
  loadRecords();
}

function clearFilters() {
  ['f-stage','f-sub-stage','f-person','f-city','f-year'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('search-input').value = '';
  state.filters = { q:'', stage:'', sub_stage:'', assigned_person:'', assigned_city:'', year:'', archived: false };
  state.records.page = 1;
  loadRecords();
}

// Populate sub-stage dropdown based on selected stage
function populateSubStage(subId, stageId) {
  const stage = document.getElementById(stageId)?.value || '';
  const sel = document.getElementById(subId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Sub Stage</option>';
  const subs = STAGES[stage] || [];
  subs.forEach(s => {
    sel.innerHTML += `<option>${esc(s)}</option>`;
  });
}

// Populate years filter from data
function populateYearFilter() {
  const sel = document.getElementById('f-year');
  const currentYear = new Date().getFullYear();
  sel.innerHTML = '<option value="">All Years</option>';
  for (let y = currentYear; y >= 2015; y--) {
    sel.innerHTML += `<option>${y}</option>`;
  }
}

function sortBy(col) {
  if (state.records.sort === col) {
    state.records.sortDir = state.records.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.records.sort = col;
    state.records.sortDir = 'asc';
  }
  // Update sort icons
  document.querySelectorAll('.sort-icon').forEach(s => s.textContent = '');
  const icon = document.querySelector(`.sort-icon[data-col="${col}"]`);
  if (icon) icon.textContent = state.records.sortDir === 'asc' ? ' ▲' : ' ▼';
  loadRecords();
}

async function loadRecords() {
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="10"><div class="spinner"></div></td></tr>';

  try {
    const { q, stage, sub_stage, assigned_person, assigned_city, year } = state.filters;
    const { page, limit } = state.records;
    const params = new URLSearchParams({
      page, limit,
      archived: 'false',
      ...(q              && { q }),
      ...(stage          && { stage }),
      ...(sub_stage      && { sub_stage }),
      ...(assigned_person && { assigned_person }),
      ...(assigned_city  && { assigned_city }),
      ...(year           && { year }),
    });

    const res = await apiFetch(`/api/trademarks?${params}`);
    state.records = { ...state.records, ...res };
    renderTable(res.data, tbody);
    renderPagination();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--danger);padding:24px">Error: ${esc(err.message)}</td></tr>`;
  }
}

function renderTable(rows, tbody) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10">
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No records found</div>
        <div class="empty-sub text-gray">Try adjusting your search or filters</div>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr onclick="openPanel(${r.id})" tabindex="0" onkeydown="if(event.key==='Enter')openPanel(${r.id})">
      <td class="td-mono">${esc(fmtDate(r.filing_date))}</td>
      <td class="td-mono">${esc(r.sr_no || '—')}</td>
      <td class="td-mono" style="color:var(--gold-200)">${esc(r.tm_no || '—')}</td>
      <td class="td-name">${esc(r.applicant_name || '—')}</td>
      <td><span class="badge badge-gold">${esc(r.class || '—')}</span></td>
      <td>${r.stage ? `<span class="badge ${stageClass(r.stage)}">${esc(r.stage)}</span>` : '—'}</td>
      <td style="color:var(--gray-400);font-size:12px">${esc(r.sub_stage || '—')}</td>
      <td>${esc(r.assigned_person || '—')}</td>
      <td>${esc(r.assigned_city || '—')}</td>
      <td style="text-align:center;" onclick="event.stopPropagation()">
        <button class="btn btn-icon btn-sm" title="Quick edit" onclick="openPanel(${r.id});switchTab('edit')">✏️</button>
      </td>
    </tr>
  `).join('');
}

function renderPagination() {
  const { total, page, limit, pages } = state.records;
  const from = ((page - 1) * limit) + 1;
  const to   = Math.min(page * limit, total);

  document.getElementById('pagination-info').textContent =
    total ? `Showing ${from}–${to} of ${total} records` : 'No records';

  const ctrl = document.getElementById('pagination-controls');
  const range = [];
  // Always show first, last, and pages around current
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) range.push(p);
  }

  let html = '';
  let prev = null;
  for (const p of range) {
    if (prev !== null && p - prev > 1) html += `<span style="padding:0 6px;color:var(--gray-600)">…</span>`;
    html += `<button class="page-btn ${p === page ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
    prev = p;
  }

  ctrl.innerHTML =
    `<button class="page-btn" onclick="goToPage(${page-1})" ${page<=1?'disabled':''}>‹</button>` +
    html +
    `<button class="page-btn" onclick="goToPage(${page+1})" ${page>=pages?'disabled':''}>›</button>`;
}

function goToPage(p) {
  if (p < 1 || p > state.records.pages) return;
  state.records.page = p;
  if (state.filters.archived) loadArchived();
  else loadRecords();
  // Scroll table into view
  document.getElementById('records-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Archived ──────────────────────────────────────────────────────────────────
async function loadArchived() {
  const tbody = document.getElementById('archived-tbody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7"><div class="spinner"></div></td></tr>';
  try {
    const res = await apiFetch('/api/trademarks?archived=true&limit=200&page=1');
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <div class="empty-icon">🗄️</div>
        <div class="empty-title">No archived cases</div>
      </div></td></tr>`;
      return;
    }
    tbody.innerHTML = res.data.map(r => `
      <tr>
        <td class="td-mono">${esc(fmtDate(r.filing_date))}</td>
        <td class="td-mono">${esc(r.sr_no || '—')}</td>
        <td class="td-mono" style="color:var(--gold-200)">${esc(r.tm_no || '—')}</td>
        <td class="td-name">${esc(r.applicant_name || '—')}</td>
        <td>${esc(r.class || '—')}</td>
        <td>${r.stage ? `<span class="badge ${stageClass(r.stage)}">${esc(r.stage)}</span>` : '—'}</td>
        <td style="text-align:center">
          <button class="btn btn-sm btn-secondary" onclick="restoreRecord(${r.id})">↩ Restore</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger);padding:24px;text-align:center">${esc(err.message)}</td></tr>`;
  }
}

async function restoreRecord(id) {
  try {
    await apiFetch(`/api/trademarks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: false, _changed_by: 'user' }),
    });
    toast('Case restored successfully', 'success');
    loadArchived();
  } catch (err) { toast('Restore failed: ' + err.message, 'error'); }
}

// ── Slide Panel ───────────────────────────────────────────────────────────────
async function openPanel(id) {
  state.panel.recordId = id;
  state.panel.open = true;

  document.getElementById('panel-overlay').classList.add('open');
  document.getElementById('slide-panel').classList.add('open');
  document.getElementById('panel-title').textContent = 'Loading…';
  document.getElementById('panel-subtitle').textContent = '';
  document.getElementById('panel-body').innerHTML = '<div class="spinner" style="margin:40px auto;display:block"></div>';

  switchTab('detail');

  try {
    const { data } = await apiFetch(`/api/trademarks/${id}`);
    state.panel.record = data;
    document.getElementById('panel-title').textContent = data.applicant_name || 'Case Detail';
    document.getElementById('panel-subtitle').textContent =
      [data.tm_no && `TM: ${data.tm_no}`, data.sr_no && `SR: ${data.sr_no}`].filter(Boolean).join(' · ') || '';

    // Show/hide archive button based on archived status
    const archBtn = document.getElementById('archive-btn');
    if (data.archived) {
      archBtn.textContent = '↩ Restore';
      archBtn.onclick = () => restoreRecord(id);
    } else {
      archBtn.textContent = '🗄 Archive';
      archBtn.onclick = archiveCurrentRecord;
    }

    renderDetail(data);
  } catch (err) {
    document.getElementById('panel-body').innerHTML =
      `<div style="color:var(--danger);padding:24px">Error: ${esc(err.message)}</div>`;
  }
}

function closePanel() {
  document.getElementById('panel-overlay').classList.remove('open');
  document.getElementById('slide-panel').classList.remove('open');
  state.panel.open = false;
  state.panel.recordId = null;
  state.panel.record = null;
}

function switchTab(tab) {
  state.panel.currentTab = tab;
  ['detail','edit','audit'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.classList.toggle('hidden', tab !== 'edit');

  if (!state.panel.recordId) return;

  if (tab === 'detail') renderDetail(state.panel.record);
  if (tab === 'edit')   renderEdit(state.panel.record);
  if (tab === 'audit')  loadAuditLog(state.panel.recordId);
}

function renderDetail(r) {
  if (!r) return;
  document.getElementById('panel-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Applicant</div>
      <div class="detail-grid">
        <div class="detail-field full">
          <div class="detail-field-label">Applicant Name</div>
          <div class="detail-field-value" style="font-size:16px;font-weight:700">${esc(r.applicant_name)}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Son / Daughter / Wife Of</div>
          <div class="detail-field-value ${!r.applicant_so?'empty':''}">${esc(r.applicant_so || 'Not specified')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">CNIC</div>
          <div class="detail-field-value font-mono ${!r.applicant_cnic?'empty':''}">${esc(r.applicant_cnic || 'Not specified')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Type</div>
          <div class="detail-field-value">${r.applicant_type ? `<span class="badge badge-gold">${esc(r.applicant_type)}</span>` : '<span class="detail-field-value empty">Not set</span>'}</div>
        </div>
        <div class="detail-field full">
          <div class="detail-field-label">Address</div>
          <div class="detail-field-value ${!r.applicant_address?'empty':''}">${esc(r.applicant_address || 'Not specified')}</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Trademark</div>
      <div class="detail-grid">
        <div class="detail-field">
          <div class="detail-field-label">TM Number</div>
          <div class="detail-field-value font-mono text-gold">${esc(r.tm_no || '—')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">SR Number</div>
          <div class="detail-field-value font-mono">${esc(r.sr_no || '—')}</div>
        </div>
        <div class="detail-field full">
          <div class="detail-field-label">Trade Mark / Brand</div>
          <div class="detail-field-value" style="font-size:15px;font-weight:600">${esc(r.tm_trade || '—')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Class</div>
          <div class="detail-field-value">${r.class ? `<span class="badge badge-gold">${esc(r.class)}</span>` : '—'}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Filing Date</div>
          <div class="detail-field-value">${esc(fmtDate(r.filing_date))}</div>
        </div>
        <div class="detail-field full">
          <div class="detail-field-label">Class Description</div>
          <div class="detail-field-value ${!r.class_desc?'empty':''}">${esc(r.class_desc || 'Not specified')}</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Stage & Assignment</div>
      <div class="detail-grid">
        <div class="detail-field">
          <div class="detail-field-label">Stage</div>
          <div class="detail-field-value">${r.stage ? `<span class="badge ${stageClass(r.stage)}">${esc(r.stage)}</span>` : '—'}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Sub Stage</div>
          <div class="detail-field-value">${esc(r.sub_stage || '—')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Assigned Person</div>
          <div class="detail-field-value font-bold">${esc(r.assigned_person || '—')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Assigned City</div>
          <div class="detail-field-value">${esc(r.assigned_city || '—')}</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Consultant</div>
      <div class="detail-grid">
        <div class="detail-field">
          <div class="detail-field-label">Consultant Name</div>
          <div class="detail-field-value">${esc(r.consultant_name || '—')}</div>
        </div>
        <div class="detail-field full">
          <div class="detail-field-label">Consultant Address</div>
          <div class="detail-field-value ${!r.consultant_address?'empty':''}">${esc(r.consultant_address || 'Not specified')}</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Dates & Filing</div>
      <div class="detail-grid">
        <div class="detail-field">
          <div class="detail-field-label">Issue Date</div>
          <div class="detail-field-value">${esc(fmtDate(r.issue_date))}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Expiry Date</div>
          <div class="detail-field-value">${esc(fmtDate(r.expiry_date))}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Year</div>
          <div class="detail-field-value">${esc(r.year || '—')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Folder Name</div>
          <div class="detail-field-value ${!r.folder_name?'empty':''}">${esc(r.folder_name || 'Not specified')}</div>
        </div>
        <div class="detail-field full">
          <div class="detail-field-label">Notes</div>
          <div class="detail-field-value ${!r.notes?'empty':''}">${esc(r.notes || 'No notes')}</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">System</div>
      <div class="detail-grid">
        <div class="detail-field">
          <div class="detail-field-label">Created At</div>
          <div class="detail-field-value text-sm">${esc(fmtDate(r.created_at))}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Last Updated</div>
          <div class="detail-field-value text-sm">${esc(fmtDate(r.updated_at))}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Record ID</div>
          <div class="detail-field-value font-mono text-sm">#${esc(r.id)}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Status</div>
          <div class="detail-field-value">${r.archived ? '<span class="badge badge-archived">Archived</span>' : '<span class="badge badge-stage4">Active</span>'}</div>
        </div>
      </div>
    </div>
  `;
}

// ── Edit Form ─────────────────────────────────────────────────────────────────
function renderEdit(r) {
  if (!r) return;

  // Build sub-stage options for current stage
  const subStages = STAGES[r.stage] || [];
  const subOpts = `<option value="">Select Sub Stage</option>` +
    subStages.map(s => `<option ${r.sub_stage === s ? 'selected' : ''}>${esc(s)}</option>`).join('');

  const stageOpts = Object.keys(STAGES).map(s =>
    `<option ${r.stage === s ? 'selected' : ''}>${esc(s)}</option>`
  ).join('');

  const persons = ['UZMA','FAISAL','RASHID','SULMAN'];
  const personOpts = `<option value="">Select Person</option>` +
    persons.map(p => `<option ${r.assigned_person === p ? 'selected' : ''}>${p}</option>`).join('');

  const cities = ['KARACHI','LAHORE','ISLAMABAD','PESHAWAR'];
  const cityOpts = `<option value="">Select City</option>` +
    cities.map(c => `<option ${r.assigned_city === c ? 'selected' : ''}>${c}</option>`).join('');

  document.getElementById('panel-body').innerHTML = `
    <form class="form-grid" id="edit-form">
      <div style="grid-column:1/-1" class="detail-section-title">Applicant</div>
      <div class="form-group full">
        <label class="form-label">Applicant Name</label>
        <input class="form-control" name="applicant_name" value="${esc(r.applicant_name||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Son/Daughter/Wife Of</label>
        <input class="form-control" name="applicant_so" value="${esc(r.applicant_so||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">CNIC</label>
        <input class="form-control" name="applicant_cnic" value="${esc(r.applicant_cnic||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-control" name="applicant_type">
          <option value="">Select type</option>
          ${['SOLE','PARTNER','COMPANY'].map(t => `<option ${r.applicant_type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Address</label>
        <textarea class="form-control" name="applicant_address" rows="2">${esc(r.applicant_address||'')}</textarea>
      </div>

      <div style="grid-column:1/-1" class="detail-section-title mt-3">Trademark</div>
      <div class="form-group">
        <label class="form-label">TM Number</label>
        <input class="form-control" name="tm_no" value="${esc(r.tm_no||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">SR Number</label>
        <input class="form-control" name="sr_no" value="${esc(r.sr_no||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Trade Mark / Brand</label>
        <input class="form-control" name="tm_trade" value="${esc(r.tm_trade||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Class</label>
        <input class="form-control" name="class" value="${esc(r.class||'')}" />
      </div>
      <div class="form-group full">
        <label class="form-label">Class Description</label>
        <textarea class="form-control" name="class_desc" rows="2">${esc(r.class_desc||'')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Filing Date</label>
        <input class="form-control" type="date" name="filing_date" value="${esc(r.filing_date||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Year</label>
        <input class="form-control" name="year" value="${esc(r.year||'')}" maxlength="4" />
      </div>

      <div style="grid-column:1/-1" class="detail-section-title mt-3">Stage & Assignment</div>
      <div class="form-group">
        <label class="form-label">Stage</label>
        <select class="form-control" name="stage" id="edit-stage" onchange="populateSubStage('edit-sub-stage','edit-stage')">
          <option value="">Select Stage</option>
          ${stageOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sub Stage</label>
        <select class="form-control" name="sub_stage" id="edit-sub-stage">
          ${subOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Assigned Person</label>
        <select class="form-control" name="assigned_person">${personOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Assigned City</label>
        <select class="form-control" name="assigned_city">${cityOpts}</select>
      </div>

      <div style="grid-column:1/-1" class="detail-section-title mt-3">Consultant</div>
      <div class="form-group">
        <label class="form-label">Consultant Name</label>
        <input class="form-control" name="consultant_name" value="${esc(r.consultant_name||'')}" />
      </div>
      <div class="form-group full">
        <label class="form-label">Consultant Address</label>
        <textarea class="form-control" name="consultant_address" rows="2">${esc(r.consultant_address||'')}</textarea>
      </div>

      <div style="grid-column:1/-1" class="detail-section-title mt-3">Dates & Notes</div>
      <div class="form-group">
        <label class="form-label">Issue Date</label>
        <input class="form-control" type="date" name="issue_date" value="${esc(r.issue_date||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Expiry Date</label>
        <input class="form-control" type="date" name="expiry_date" value="${esc(r.expiry_date||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Folder Name</label>
        <input class="form-control" name="folder_name" value="${esc(r.folder_name||'')}" />
      </div>
      <div class="form-group full">
        <label class="form-label">Notes</label>
        <textarea class="form-control" name="notes" rows="3">${esc(r.notes||'')}</textarea>
      </div>
    </form>
  `;
}

async function saveEdit() {
  const form = document.getElementById('edit-form');
  if (!form) return;
  const data = Object.fromEntries(new FormData(form).entries());
  data._changed_by = 'user';

  const saveBtn = document.getElementById('save-btn');
  saveBtn.textContent = '⏳ Saving…';
  saveBtn.disabled = true;

  try {
    await apiFetch(`/api/trademarks/${state.panel.recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    toast('Changes saved successfully', 'success');
    // Reload record
    const { data: updated } = await apiFetch(`/api/trademarks/${state.panel.recordId}`);
    state.panel.record = updated;
    switchTab('detail');
    loadRecords(); // refresh table
  } catch (err) {
    toast('Save failed: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = '💾 Save Changes';
    saveBtn.disabled = false;
  }
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
async function loadAuditLog(id) {
  const body = document.getElementById('panel-body');
  body.innerHTML = '<div class="spinner" style="margin:40px auto;display:block"></div>';
  try {
    const { data, count } = await apiFetch(`/api/audit-logs/${id}`);
    if (!count) {
      body.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No audit history yet</div>
        <div class="empty-sub text-gray">Changes to this record will appear here</div>
      </div>`;
      return;
    }
    body.innerHTML = `
      <div class="mb-3 text-sm text-gray">${count} change${count !== 1 ? 's' : ''} recorded</div>
      <div class="audit-timeline">
        ${data.map(e => `
          <div class="audit-entry">
            <div class="audit-field">${esc(e.field_name)}</div>
            <div class="audit-change">
              <span class="old-val">${esc(e.old_value ?? 'empty')}</span>
              <span>→</span>
              <span class="new-val">${esc(e.new_value ?? 'empty')}</span>
            </div>
            <div class="audit-meta">
              by <strong>${esc(e.changed_by)}</strong> · ${esc(fmtDate(e.changed_at))}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color:var(--danger);padding:24px">Error: ${esc(err.message)}</div>`;
  }
}

// ── Archive ───────────────────────────────────────────────────────────────────
async function archiveCurrentRecord() {
  if (!state.panel.recordId) return;
  if (!confirm('Archive this case? It will be hidden from the main list but not deleted.')) return;
  try {
    await apiFetch(`/api/trademarks/${state.panel.recordId}?by=user`, { method: 'DELETE' });
    toast('Case archived', 'info');
    closePanel();
    loadRecords();
  } catch (err) { toast('Archive failed: ' + err.message, 'error'); }
}

// ── Add Modal ─────────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById('add-modal-overlay').classList.add('open');
  document.getElementById('add-form').reset();
}

function closeAddModal() {
  document.getElementById('add-modal-overlay').classList.remove('open');
}

function closeAddModalOnBg(e) {
  if (e.target === e.currentTarget) closeAddModal();
}

async function submitAddForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  // Auto-fill year from filing_date
  if (data.filing_date && !data.year) {
    const m = data.filing_date.match(/(\d{4})/);
    if (m) data.year = m[1];
  }

  try {
    const res = await apiFetch('/api/trademarks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    toast(`Case created — ID #${res.id}`, 'success');
    closeAddModal();
    showPage('records');
    loadRecords();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

// ── Print ─────────────────────────────────────────────────────────────────────
function printRecord() {
  const r = state.panel.record;
  if (!r) { toast('No record loaded', 'error'); return; }

  const printView = document.getElementById('print-view');
  printView.innerHTML = `
    <div class="print-header">
      <div>
        <div class="print-firm-name">BRANDEX LAW ASSOCIATES</div>
        <div class="print-firm-sub">Trademark Attorneys &amp; IP Consultants</div>
      </div>
      <div>
        <div class="print-doc-title">TRADEMARK APPLICATION</div>
        <div class="print-doc-ref">SR: ${r.sr_no || '—'} &nbsp;|&nbsp; TM: ${r.tm_no || '—'}</div>
        <div class="print-doc-ref">Date: ${fmtDate(r.filing_date) || new Date().toLocaleDateString('en-GB')}</div>
      </div>
    </div>

    <div class="print-section-title">Applicant Information</div>
    <table class="print-table">
      <tr>
        <th>Name of Applicant</th>
        <td colspan="3" class="applicant-name">${r.applicant_name || '—'}</td>
      </tr>
      <tr>
        <th>Son / Daughter / Wife of</th>
        <td colspan="3">${r.applicant_so || '—'}</td>
      </tr>
      <tr>
        <th>CNIC No.</th>
        <td>${r.applicant_cnic || '—'}</td>
        <th>Type</th>
        <td>${r.applicant_type || '—'}</td>
      </tr>
      <tr>
        <th>Address</th>
        <td colspan="3">${r.applicant_address || '—'}</td>
      </tr>
    </table>

    <div class="print-section-title">Trademark / Brand Details</div>
    <table class="print-table">
      <tr>
        <th>Trade Mark / Brand Name</th>
        <td colspan="3" class="big-val">${r.tm_trade || '—'}</td>
      </tr>
      <tr>
        <th>Class No.</th>
        <td class="big-val">${r.class || '—'}</td>
        <th>TM Number</th>
        <td class="big-val">${r.tm_no || '—'}</td>
      </tr>
      <tr>
        <th>Class Description</th>
        <td colspan="3">${r.class_desc || '—'}</td>
      </tr>
    </table>

    <div class="print-section-title">Filing & Case Information</div>
    <table class="print-table">
      <tr>
        <th>SR Number</th>
        <td>${r.sr_no || '—'}</td>
        <th>Filing Date</th>
        <td>${fmtDate(r.filing_date) || '—'}</td>
      </tr>
      <tr>
        <th>Stage</th>
        <td>${r.stage || '—'}</td>
        <th>Sub Stage</th>
        <td>${r.sub_stage || '—'}</td>
      </tr>
      <tr>
        <th>Assigned Person</th>
        <td>${r.assigned_person || '—'}</td>
        <th>Assigned City</th>
        <td>${r.assigned_city || '—'}</td>
      </tr>
      <tr>
        <th>Issue Date</th>
        <td>${fmtDate(r.issue_date) || '—'}</td>
        <th>Expiry Date</th>
        <td>${fmtDate(r.expiry_date) || '—'}</td>
      </tr>
    </table>

    <div class="print-section-title">Consultant Information</div>
    <table class="print-table">
      <tr>
        <th>Consultant Name</th>
        <td>${r.consultant_name || '—'}</td>
        <th>Folder Reference</th>
        <td>${r.folder_name || '—'}</td>
      </tr>
      <tr>
        <th>Consultant Address</th>
        <td colspan="3">${r.consultant_address || '—'}</td>
      </tr>
    </table>

    ${r.notes ? `
    <div class="print-section-title">Notes / Remarks</div>
    <table class="print-table">
      <tr><td>${r.notes}</td></tr>
    </table>` : ''}

    <div class="print-footer">
      <div>
        <div class="print-sig-line">Applicant Signature</div>
      </div>
      <div>
        <div class="print-sig-line">Consultant Signature</div>
      </div>
      <div>
        <div class="print-sig-line">Office Stamp &amp; Signature</div>
      </div>
    </div>

    <div style="margin-top:12pt;font-size:7pt;color:#999;text-align:center;border-top:0.5pt solid #ddd;padding-top:4pt">
      Generated by BrandEx CMS · ${new Date().toLocaleString('en-GB')} · Record ID #${r.id}
    </div>
  `;

  window.print();
}

// ── Sync Sheets ───────────────────────────────────────────────────────────────
async function syncSheets() {
  const btn = document.getElementById('sync-btn');
  btn.textContent = '⏳ Syncing…';
  btn.disabled = true;
  try {
    const res = await apiFetch('/api/sync-sheets', { method: 'POST' });
    toast(`✅ Synced: ${res.inserted} new, ${res.skipped} skipped`, 'success');
    if (state.currentPage === 'records') loadRecords();
    if (state.currentPage === 'dashboard') loadStats();
  } catch (err) {
    toast('Sync failed: ' + err.message, 'error');
  } finally {
    btn.textContent = '🔄 Sync';
    btn.disabled = false;
  }
}

// ── CSV Export ────────────────────────────────────────────────────────────────
async function exportCSV() {
  try {
    const { q, stage, sub_stage, assigned_person, assigned_city, year } = state.filters;
    const params = new URLSearchParams({
      limit: 9999, page: 1, archived: 'false',
      ...(q && { q }), ...(stage && { stage }),
      ...(sub_stage && { sub_stage }),
      ...(assigned_person && { assigned_person }),
      ...(assigned_city && { assigned_city }),
      ...(year && { year }),
    });
    const res = await apiFetch(`/api/trademarks?${params}`);
    const cols = ['id','filing_date','sr_no','tm_no','applicant_name','class','stage','sub_stage','assigned_person','assigned_city','year'];
    const header = cols.join(',');
    const rows = res.data.map(r => cols.map(c => `"${(r[c]||'').toString().replace(/"/g,'""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandex-trademarks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported', 'success');
  } catch (err) {
    toast('Export failed: ' + err.message, 'error');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateYearFilter();
  // Populate sub-stage on filter change
  document.getElementById('f-stage').addEventListener('change', () => {
    const stage = document.getElementById('f-stage').value;
    const sel = document.getElementById('f-sub-stage');
    sel.innerHTML = '<option value="">All Sub-Stages</option>';
    (STAGES[stage] || []).forEach(s => {
      sel.innerHTML += `<option>${esc(s)}</option>`;
    });
    applyFilters();
  });

  showPage('dashboard');
});

// Keyboard shortcut — Escape closes panel/modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('add-modal-overlay').classList.contains('open')) {
      closeAddModal();
    } else if (state.panel.open) {
      closePanel();
    }
  }
});
