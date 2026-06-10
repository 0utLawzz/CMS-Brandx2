// ─── Config ────────────────────────────────────────────────────────────────
const API = '/api';

const STAGE_COLORS = { 1:'#C94A00', 2:'#0A6B52', 3:'#D4A800', 4:'#0D9970', 0:'#888' };
const RUN_COLORS   = { Run:'#2563EB', Processing:'#D4A800', Done:'#0D9970' };
const AVATAR_COLORS = ['#C94A00','#0A6B52','#D4A800','#0D9970','#8B2FC9','#2563EB','#DC2626'];

// ─── State ─────────────────────────────────────────────────────────────────
let allRecords = [];
let sortKey    = 'date_l';
const selectedIds = new Set();
let editingRecord = null;
let isNewRecord   = false;

// ─── Helpers ────────────────────────────────────────────────────────────────
const norm = s => (s||'').toLowerCase().replace(/[^\w\s]/g,'').trim();
function hashCode(str) { let h=0; for (const c of str){h=((h<<5)-h)+c.charCodeAt(0);h|=0;} return Math.abs(h); }
function avatarInitials(name) {
  const w=(name||'TM').replace(/[^a-zA-Z0-9\s]/g,'').trim().split(/\s+/).filter(Boolean);
  return w.slice(0,2).map(x=>x[0].toUpperCase()).join('')||'TM';
}
function avatarColor(name) { return AVATAR_COLORS[hashCode(name||'')%AVATAR_COLORS.length]; }

function getStageNum(stage) {
  const v=norm(stage);
  if(/stage[\s_]*4/.test(v)) return 4;
  if(/stage[\s_]*3/.test(v)) return 3;
  if(/stage[\s_]*2/.test(v)) return 2;
  if(/stage[\s_]*1/.test(v)) return 1;
  return 0;
}

function stageStyle(stage) {
  const v=norm(stage);
  if(/stage.*4|certif|done/.test(v))       return {color:'#0A6B52',bg:'rgba(13,153,112,0.08)',border:'#0D9970'};
  if(/stop|abandon|refus|hold/.test(v))    return {color:'#C94A00',bg:'rgba(201,74,0,0.08)',  border:'#C94A00'};
  if(/stage.*3|oppo|publi|demand/.test(v)) return {color:'#1a4fa0',bg:'rgba(37,99,235,0.07)',border:'#2563EB'};
  if(/stage.*[12]|exam|filed|ack/.test(v)) return {color:'#A07800',bg:'rgba(212,168,0,0.08)', border:'#D4A800'};
  return {color:'#555',bg:'rgba(102,102,102,0.06)',border:'#ccc'};
}

function formatCNIC(val) {
  const d=(val||'').replace(/\D/g,'').slice(0,13);
  if(d.length<=5)  return d;
  if(d.length<=12) return d.slice(0,5)+'-'+d.slice(5);
  return d.slice(0,5)+'-'+d.slice(5,12)+'-'+d.slice(12,13);
}

function autoExpiry(issueStr) {
  const d=new Date(issueStr);
  if(isNaN(d)) return '';
  d.setDate(d.getDate()+7);
  const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${String(d.getDate()).padStart(2,'0')}-${M[d.getMonth()]}-${d.getFullYear()}`;
}

function genSrNo() {
  const ts=Date.now().toString();
  const rnd=Math.floor(Math.random()*1000000).toString().padStart(6,'0');
  return 'PB-RWP-'+(ts+rnd).slice(0,18);
}

function driveThumb(id) {
  return id?`https://drive.google.com/thumbnail?id=${id}&sz=w80`:null;
}

// ─── Stats & Chart ──────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const r=await fetch(`${API}/stats`);
    const j=await r.json();
    if(!j.success) return;
    const s=j.data;
    document.getElementById('s-total').textContent      =(s.total||0).toLocaleString();
    document.getElementById('s-run').textContent        =(s.run||0).toLocaleString();
    document.getElementById('s-processing').textContent =(s.processing||0).toLocaleString();
    document.getElementById('s-done').textContent       =(s.done||0).toLocaleString();
    document.getElementById('s-s1').textContent         =(s.stage1||0).toLocaleString();
    document.getElementById('s-s2').textContent         =(s.stage2||0).toLocaleString();
    document.getElementById('s-s3').textContent         =(s.stage3||0).toLocaleString();
    document.getElementById('s-s4').textContent         =(s.stage4||0).toLocaleString();

    const total=parseInt(s.total)||1;
    const BARS=[
      {label:'STAGE 1',color:'#C94A00',val:s.stage1},
      {label:'STAGE 2',color:'#0A6B52',val:s.stage2},
      {label:'STAGE 3',color:'#D4A800',val:s.stage3},
      {label:'STAGE 4',color:'#0D9970',val:s.stage4},
      {label:'STOPPED',color:'#888',   val:s.stopped},
    ];
    document.getElementById('chartTotal').textContent=total+' TOTAL';
    document.getElementById('stageBars').innerHTML=BARS.map(b=>{
      const pct=Math.round((parseInt(b.val)||0)/total*100);
      return `<div class="bar-row">
        <span class="bar-label">${b.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${b.color}"></div></div>
        <span class="bar-count" style="color:${b.color}">${parseInt(b.val)||0}</span>
      </div>`;
    }).join('');
    document.getElementById('chartCard').style.display='block';
  } catch(e){ console.warn('Stats error:',e); }
}

// ─── Load records ─────────────────────────────────────────────────────────
async function loadData() {
  const chip=document.getElementById('statusChip');
  const st=document.getElementById('statusText');
  chip.className='status-chip';
  st.textContent='Connecting to database…';
  try {
    const res=await fetch(`${API}/trademarks?limit=2000`);
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    allRecords=j.data;
    chip.className='status-chip ok';
    st.textContent=allRecords.length.toLocaleString()+' records ready (MySQL)';
    await loadStats();
    document.getElementById('searchResults').innerHTML=
      `<div class="no-results"><div class="no-results-title">START SEARCHING</div>
       <p class="no-results-hint">Enter TM Number, applicant name, CNIC or serial number above.</p></div>`;
    renderRecordsTable();
  } catch(err){
    chip.className='status-chip error';
    st.textContent='Error: '+err.message;
  }
}

// ─── Render search card ───────────────────────────────────────────────────
function renderCard(rec) {
  const sn=getStageNum(rec.stage||'');
  const sc=STAGE_COLORS[sn]||'#888';
  const runColor=RUN_COLORS[rec.status_run]||'#888';
  const imgSrc=rec.img?driveThumb(rec.img):null;
  const initials=avatarInitials(rec.app_name);
  const avColor=avatarColor(rec.app_name);
  const id='card_'+rec.id;

  const kvRows=[
    ['SR. NO',rec.sr_no],['TM NO',rec.tm_no],['FOLDER',rec.folder_name],
    ['DATE',rec.date_l],['CLASS',rec.class],['CLASS DESC',rec.class_desc],
    ['APP TYPE',rec.app_type],['APP NAME',rec.app_name],["FATHER'S NAME",rec.app_so],
    ['CNIC',rec.app_cnic],['ISSUE DATE',rec.issue_date],['EXPIRY DATE',rec.expiry_date],
    ['TRADE NAME',rec.app_trade],['APP ADDRESS',rec.app_add],['YEAR',rec.year],
    ['CON. NAME',rec.con_name],['CON. ADDRESS',rec.con_add],
    ['IMG ID',rec.img],['NO IMG TEXT',rec.no_img],
  ].map(([k,v])=>`<div class="kv-row"><span class="kv-key">${k}</span><span class="kv-val">${v||'—'}</span></div>`).join('');

  return `
  <div class="result-card" id="${id}">
    <div class="card-top-row">
      <span class="card-date" style="font-size:9px">${rec.sr_no||'—'}</span>
      <div style="display:flex;gap:6px;align-items:center">
        ${rec.year?`<span class="card-city">${rec.year}</span>`:''}
        ${rec.status_run?`<span style="font-family:'DM Mono',monospace;font-size:9px;color:${runColor};border:1.5px solid ${runColor};border-radius:3px;padding:1px 5px">${rec.status_run.toUpperCase()}</span>`:''}
      </div>
    </div>
    <div class="card-main">
      ${imgSrc
        ?`<img src="${imgSrc}" alt="" style="width:52px;height:52px;object-fit:contain;border:2.5px solid #0C0C0C;border-radius:4px;background:#f0e8d0">`
        :`<div class="avatar" style="background:${avColor}"><span>${initials}</span><span class="avatar-tm">™</span></div>`
      }
      <div class="card-info">
        <div class="card-name">${rec.app_name||'Untitled Mark'}</div>
        <div class="card-tm-row">
          <span class="card-tm-icon">™</span>
          <span class="card-tm-no">${rec.tm_no||'—'}</span>
          ${rec.class?`<span class="card-class">CL ${rec.class}</span>`:''}
          ${rec.app_type?`<span class="card-class" style="color:#0A6B52;border-color:#0A6B52">${rec.app_type}</span>`:''}
        </div>
        ${rec.app_trade?`<div style="font-family:'Space Grotesk',sans-serif;font-size:11px;color:#555;font-style:italic;margin-top:2px">${rec.app_trade}</div>`:''}
        ${rec.app_cnic?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:#888;margin-top:2px">CNIC: ${rec.app_cnic}</div>`:''}
      </div>
      <div class="card-stage-box" style="border-color:${sc}">
        <span class="card-stage-text" style="color:${sc}">${sn>0?'S'+sn:'?'}</span>
      </div>
    </div>
    ${rec.stage?`<div class="card-status-bar" style="border-color:${sc}">
      <span class="card-status-label" style="color:${sc}">${rec.stage.toUpperCase()}</span>
    </div>`:''}
    ${rec.con_name?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:#0A6B52;margin-top:4px;padding:3px 8px;background:rgba(10,107,82,0.06);border:1.5px solid rgba(10,107,82,0.2);border-radius:3px;display:inline-block">CON: ${rec.con_name}</div>`:''}
    <div class="card-actions">
      <button class="expand-btn" onclick="toggleKV('kv_${id}',this)">▼ ALL FIELDS</button>
      <button class="edit-btn"   onclick="openEditModal(${rec.id})">✎ EDIT</button>
      <button class="action-del" style="padding:5px 10px;font-size:10px" onclick="deleteRec(${rec.id},'${(rec.app_name||'').replace(/'/g,"\\'")}')">✕</button>
    </div>
    <div id="kv_${id}" class="kv-table" style="display:none">${kvRows}</div>
  </div>`;
}

function toggleKV(kvId,btn) {
  const el=document.getElementById(kvId);
  const hidden=el.style.display==='none';
  el.style.display=hidden?'block':'none';
  btn.textContent=hidden?'▲ HIDE FIELDS':'▼ ALL FIELDS';
}

// ─── Search ──────────────────────────────────────────────────────────────────
function doSearch() {
  const q=(document.getElementById('searchInput').value||'').trim().toLowerCase();
  const el=document.getElementById('searchResults');
  if(!q){
    el.innerHTML=`<div class="no-results"><div class="no-results-title">START SEARCHING</div><p class="no-results-hint">Enter TM Number, app name, CNIC or serial number.</p></div>`;
    return;
  }
  const matches=allRecords.filter(r=>
    (r.tm_no||'').toLowerCase()===q||
    (r.tm_no||'').toLowerCase().includes(q)||
    (r.app_name||'').toLowerCase().includes(q)||
    (r.sr_no||'').toLowerCase().includes(q)||
    (r.app_cnic||'').toLowerCase().includes(q)||
    (r.app_trade||'').toLowerCase().includes(q)||
    (r.con_name||'').toLowerCase().includes(q)
  );
  if(!matches.length){
    el.innerHTML=`<div class="no-results"><div class="no-results-title">NO MATCHES</div><p class="no-results-hint">Nothing found for "${q}".</p></div>`;
    return;
  }
  const hdr=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:8px;border-bottom:2.5px solid #0C0C0C">
    <span style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px">SEARCH RESULTS</span>
    <span style="font-family:'DM Mono',monospace;font-size:11px;color:#C94A00">${matches.length} MATCH${matches.length!==1?'ES':''}</span>
  </div>`;
  el.innerHTML=hdr+matches.map(renderCard).join('');
}

// ─── Records Table ────────────────────────────────────────────────────────────
function renderRecordsTable() {
  const q=(document.getElementById('filterInput')?document.getElementById('filterInput').value:'').trim().toLowerCase();
  let rows=[...allRecords];
  if(q) rows=rows.filter(r=>Object.values(r).some(v=>(v||'').toString().toLowerCase().includes(q)));
  rows.sort((a,b)=>{
    if(sortKey==='app_name')   return (a.app_name||'').localeCompare(b.app_name||'');
    if(sortKey==='stage')      return (a.stage||'').localeCompare(b.stage||'');
    if(sortKey==='status_run') return (a.status_run||'').localeCompare(b.status_run||'');
    return (b.date_l||'').localeCompare(a.date_l||'');
  });
  document.getElementById('recordsCount').textContent=rows.length+' records';
  const tbody=document.getElementById('recordsTbody');
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:30px;color:#888;font-family:'DM Mono',monospace;font-size:11px">NO RECORDS${q?' — clear filter to see all':''}</td></tr>`;
    return;
  }
  tbody.innerHTML=rows.map(r=>{
    const stageN=getStageNum(r.stage||'');
    const sc=STAGE_COLORS[stageN]||'#888';
    const runColor=RUN_COLORS[r.status_run]||'#888';
    const isSel=selectedIds.has(r.id);
    return `<tr class="${isSel?'tr-selected':''}">
      <td><input type="checkbox" class="row-check" data-id="${r.id}" ${isSel?'checked':''}></td>
      <td class="td-case" style="font-size:9px">${r.sr_no||'—'}</td>
      <td class="td-tm">™ ${r.tm_no||'—'}</td>
      <td class="td-name">${r.app_name||'—'}</td>
      <td><span class="td-cls">${r.class||'—'}</span></td>
      <td><span class="stage-badge" style="background:${sc};border-color:${sc}">${stageN>0?'S'+stageN:'?'}</span></td>
      <td><span style="font-family:'DM Mono',monospace;font-size:9px;color:${runColor};border:1.5px solid ${runColor};border-radius:3px;padding:1px 5px">${r.status_run||'—'}</span></td>
      <td>${r.app_type?`<span class="td-city" style="color:#0A6B52;border-color:#0A6B52">${r.app_type}</span>`:'—'}</td>
      <td class="td-date" style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.con_name||''}">${r.con_name||'—'}</td>
      <td><div class="action-cell">
        <button class="action-tick ${isSel?'checked':''}" data-id="${r.id}">✓</button>
        <button class="action-edit" onclick="openEditModal(${r.id})">✎</button>
        <button class="action-del"  onclick="deleteRec(${r.id},'${(r.app_name||'').replace(/'/g,"\\'")}')">✕</button>
      </div></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.row-check').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const id=parseInt(cb.dataset.id);
      cb.checked?selectedIds.add(id):selectedIds.delete(id);
      renderRecordsTable();
    });
  });
  tbody.querySelectorAll('.action-tick').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=parseInt(btn.dataset.id);
      selectedIds.has(id)?selectedIds.delete(id):selectedIds.add(id);
      renderRecordsTable();
    });
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteRec(id,name) {
  if(!confirm(`Delete "${name}" (ID ${id})?\n\nThis will permanently remove it from the database.`)) return;
  try {
    const r=await fetch(`${API}/trademarks/${id}`,{method:'DELETE'});
    const j=await r.json();
    if(!j.success) throw new Error(j.error);
    allRecords=allRecords.filter(x=>x.id!==id);
    renderRecordsTable();
    await loadStats();
  } catch(e){ alert('Delete failed: '+e.message); }
}

// ─── Edit / Add Modal ─────────────────────────────────────────────────────────
function populateClassSelect() {
  const sel=document.getElementById('editClass');
  if(!sel) return;
  sel.innerHTML='<option value="">— Select class —</option>';
  for(let i=1;i<=45;i++) sel.innerHTML+=`<option value="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</option>`;
}

function openEditModal(id) {
  isNewRecord=false;
  const rec=allRecords.find(r=>r.id===id);
  if(!rec) return;
  editingRecord=rec;
  document.getElementById('modalTitle').textContent='EDIT RECORD';
  document.getElementById('modalCase').textContent =rec.sr_no||'';
  document.getElementById('modalNotice').textContent='📡 Changes save directly to MySQL database.';
  fillModalForm(rec);
  document.getElementById('editModal').classList.add('open');
}

function openAddModal() {
  isNewRecord=true; editingRecord=null;
  document.getElementById('modalTitle').textContent='ADD NEW RECORD';
  document.getElementById('modalCase').textContent ='';
  document.getElementById('modalNotice').textContent='📡 New record will be saved to MySQL database.';
  fillModalForm({});
  document.getElementById('editSrNo').value=genSrNo();
  document.getElementById('editModal').classList.add('open');
}

function fillModalForm(rec) {
  const f=(id,val)=>{ const el=document.getElementById(id); if(el) el.value=val||''; };
  f('editStatusRun', rec.status_run); f('editStage',     rec.stage);
  f('editSrNo',      rec.sr_no);     f('editTmNo',       rec.tm_no);
  f('editFolder',    rec.folder_name);f('editDateL',     rec.date_l);
  f('editClass',     rec.class);     f('editClassDesc',  rec.class_desc);
  f('editAppType',   rec.app_type);  f('editAppName',    rec.app_name);
  f('editAppSo',     rec.app_so);    f('editAppCnic',    rec.app_cnic);
  f('editIssueDate', rec.issue_date);f('editExpiryDate', rec.expiry_date);
  f('editAppTrade',  rec.app_trade); f('editAppAdd',     rec.app_add);
  f('editYear',      rec.year);      f('editConName',    rec.con_name);
  f('editConAdd',    rec.con_add);   f('editImg',        rec.img);
  f('editNoImg',     rec.no_img);
  updateImgPreview(rec.img);
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
  editingRecord=null;
}

const gv=id=>{ const el=document.getElementById(id); return el?el.value.trim():''; };

async function saveEdit() {
  const data={
    status_run: gv('editStatusRun'), stage:       gv('editStage'),
    sr_no:      gv('editSrNo'),      tm_no:        gv('editTmNo'),
    folder_name:gv('editFolder'),    date_l:       gv('editDateL'),
    class:      gv('editClass'),     class_desc:   gv('editClassDesc'),
    app_type:   gv('editAppType'),   app_name:     gv('editAppName'),
    app_so:     gv('editAppSo'),     app_cnic:     gv('editAppCnic'),
    issue_date: gv('editIssueDate'), expiry_date:  gv('editExpiryDate'),
    app_trade:  gv('editAppTrade'),  app_add:      gv('editAppAdd'),
    year:       gv('editYear'),      con_name:     gv('editConName'),
    con_add:    gv('editConAdd'),    img:          gv('editImg'),
    no_img:     gv('editNoImg'),
  };
  if(!data.app_name){ alert('App Name (J) is required ⭐'); return; }
  const btn=document.getElementById('modalSave');
  btn.textContent='SAVING…'; btn.disabled=true;
  try {
    let j;
    if(isNewRecord){
      const res=await fetch(`${API}/trademarks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      j=await res.json();
      if(!j.success) throw new Error(j.error);
      await loadData();
    } else {
      const res=await fetch(`${API}/trademarks/${editingRecord.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      j=await res.json();
      if(!j.success) throw new Error(j.error);
      Object.assign(editingRecord,data);
      renderRecordsTable();
      await loadStats();
    }
    closeEditModal();
  } catch(e){ alert('Save failed: '+e.message); }
  finally { btn.textContent='SAVE TO DATABASE'; btn.disabled=false; }
}

function updateImgPreview(fileId) {
  const wrap=document.getElementById('imgPreview');
  const img =document.getElementById('imgPreviewEl');
  if(fileId&&wrap&&img){ img.src=`https://drive.google.com/thumbnail?id=${fileId}&sz=w200`; wrap.style.display='block'; }
  else if(wrap){ wrap.style.display='none'; }
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+id));
  if(id==='records') renderRecordsTable();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  populateClassSelect();

  document.getElementById('tabNav').addEventListener('click',e=>{
    const btn=e.target.closest('.tab-btn');
    if(btn) switchTab(btn.dataset.tab);
  });

  document.getElementById('searchBtn').addEventListener('click', doSearch);
  document.getElementById('searchInput').addEventListener('keydown',e=>{ if(e.key==='Enter') doSearch(); });
  document.getElementById('refreshBtn').addEventListener('click', loadData);

  ['addNewBtn','addNewBtn2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('click', openAddModal);
  });

  document.getElementById('filterInput').addEventListener('input', renderRecordsTable);

  document.querySelectorAll('.sort-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      sortKey=btn.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach(b=>b.classList.toggle('active',b===btn));
      renderRecordsTable();
    });
  });

  document.getElementById('selectAll').addEventListener('change',e=>{
    const check=e.target.checked;
    document.querySelectorAll('.row-check').forEach(cb=>{
      const id=parseInt(cb.dataset.id);
      check?selectedIds.add(id):selectedIds.delete(id);
    });
    renderRecordsTable();
  });

  document.getElementById('modalClose').addEventListener('click',  closeEditModal);
  document.getElementById('modalCancel').addEventListener('click', closeEditModal);
  document.getElementById('modalSave').addEventListener('click',   saveEdit);
  document.getElementById('editModal').addEventListener('click',e=>{
    if(e.target===document.getElementById('editModal')) closeEditModal();
  });

  const cnicEl=document.getElementById('editAppCnic');
  if(cnicEl) cnicEl.addEventListener('input',()=>{ cnicEl.value=formatCNIC(cnicEl.value); });

  const issueDateEl=document.getElementById('editIssueDate');
  if(issueDateEl) issueDateEl.addEventListener('input',()=>{
    const exp=document.getElementById('editExpiryDate');
    if(exp) exp.value=autoExpiry(issueDateEl.value);
  });

  const imgEl=document.getElementById('editImg');
  if(imgEl) imgEl.addEventListener('input',()=>updateImgPreview(imgEl.value.trim()));

  loadData();
});
