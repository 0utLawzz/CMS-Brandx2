// ─── Config ──────────────────────────────────────────────────────────────────
const API = '/api';
const RUN_COLORS   = { Run:'#2563EB', Processing:'#D4A800', Done:'#0D9970' };
const AVATAR_COLORS = ['#C94A00','#0A6B52','#D4A800','#0D9970','#8B2FC9','#2563EB','#DC2626'];

// ─── State ───────────────────────────────────────────────────────────────────
let allRecords    = [];
let sortKey       = 'created_at';
let currentPage   = 1;
let pageSize      = 100;
let activeFilters = { stage:'', status_run:'', app_type:'', year:'' };
let editingRecord = null;
let isNewRecord   = false;
let lastSearchQuery = '';
const selectedIds = new Set();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hashCode(str){ let h=0; for(const c of str){h=((h<<5)-h)+c.charCodeAt(0);h|=0;} return Math.abs(h); }
function avatarInitials(name){
  const w=(name||'TM').replace(/[^a-zA-Z0-9\s]/g,'').trim().split(/\s+/).filter(Boolean);
  return w.slice(0,2).map(x=>x[0].toUpperCase()).join('')||'TM';
}
function avatarColor(name){ return AVATAR_COLORS[hashCode(name||'')%AVATAR_COLORS.length]; }

function cleanStageText(stage){
  if(!stage) return '';
  return stage.replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\u200D\uFE0F\uFEFF]/gu,'').replace(/\s+/g,' ').trim();
}

function getStageNum(stage){
  if(!stage) return 0;
  const v = cleanStageText(stage).toUpperCase();

  if(/STAGE[\s_]*4/.test(v))  return 4;
  if(/STAGE[\s_]*3/.test(v))  return 3;
  if(/STAGE[\s_]*2/.test(v))  return 2;
  if(/STAGE[\s_]*1/.test(v))  return 1;

  // Stage 1 sub-statuses
  if(/^(APPLICATION FILED|ACKNOWLEDGMENT|ACKNOWLEDGEMENT|EXAMINATION)/.test(v)) return 1;
  // Stage 2 sub-statuses
  if(/^(ASSIGNED|ACCEPTED|HEARING)/.test(v)) return 2;
  // Stage 3 sub-statuses
  if(/^(PUBLISHED|OPPO|DEMAND NOTE|D-NOTE|D NOTE|DEMAND)/.test(v)) return 3;
  // Stage 4 sub-statuses
  if(/^(CERTIFICATE|CERTIF|COMPLETE)/.test(v)) return 4;
  // Stopped
  if(/^(STOP|ABANDON|HOLD|REFUS|^NOTE$)/.test(v)) return -1;
  // Copyright
  if(/^COPYRIGHT/.test(v)) return -2;

  return 0;
}

function stageBadgeText(sn){
  if(sn===-1) return 'X';
  if(sn===-2) return '©';
  if(sn>0) return String(sn);
  return '?';
}
function stageBadgeColor(sn){
  const m={1:'#C94A00',2:'#0A6B52',3:'#D4A800',4:'#0D9970','-1':'#888','-2':'#8B2FC9'};
  return m[sn]||'#bbb';
}

function formatCNIC(val){
  const d=(val||'').replace(/\D/g,'').slice(0,13);
  if(d.length<=5) return d;
  if(d.length<=12) return d.slice(0,5)+'-'+d.slice(5);
  return d.slice(0,5)+'-'+d.slice(5,12)+'-'+d.slice(12,13);
}

function autoExpiry(issueStr){
  const d=new Date(issueStr); if(isNaN(d)) return '';
  d.setDate(d.getDate()+7);
  const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${String(d.getDate()).padStart(2,'0')}-${M[d.getMonth()]}-${d.getFullYear()}`;
}

function genSrNo(){
  const ts=Date.now().toString();
  const rnd=Math.floor(Math.random()*1000000).toString().padStart(6,'0');
  return 'PB-RWP-'+(ts+rnd).slice(0,18);
}

function getImageSrc(img, sz='80'){
  if(!img) return null;
  if(img.startsWith('/uploads/')||img.startsWith('http')) return img;
  return `https://drive.google.com/thumbnail?id=${img}&sz=w${sz}`;
}

// ─── Stats & Chart ────────────────────────────────────────────────────────────
async function loadStats(){
  try{
    const r=await fetch(`${API}/stats`);
    const j=await r.json(); if(!j.success) return;
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
    document.getElementById('chartTotal').textContent=total.toLocaleString()+' TOTAL';
    document.getElementById('stageBars').innerHTML=BARS.map(b=>{
      const pct=Math.round((parseInt(b.val)||0)/total*100);
      return `<div class="bar-row">
        <span class="bar-label">${b.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${b.color}"></div></div>
        <span class="bar-count" style="color:${b.color}">${parseInt(b.val)||0}</span>
      </div>`;
    }).join('');
    document.getElementById('chartCard').style.display='block';
  }catch(e){console.warn('Stats:',e);}
}

// ─── Load records ─────────────────────────────────────────────────────────────
async function loadData(){
  const chip=document.getElementById('statusChip');
  const st=document.getElementById('statusText');
  chip.className='status-chip';
  st.textContent='Connecting to database…';
  try{
    const res=await fetch(`${API}/trademarks?limit=5000`);
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    allRecords=j.data;
    chip.className='status-chip ok';
    st.textContent=allRecords.length.toLocaleString()+' records ready';
    await loadStats();
    renderRecordsTable();
  }catch(err){
    chip.className='status-chip error';
    st.textContent='Error: '+err.message;
  }
}

// ─── Search card ──────────────────────────────────────────────────────────────
function renderCard(rec){
  const sn=getStageNum(rec.stage||'');
  const sc=stageBadgeColor(sn);
  const runColor=RUN_COLORS[rec.status_run]||'#888';
  const imgSrc=getImageSrc(rec.img);
  const initials=avatarInitials(rec.app_name);
  const avColor=avatarColor(rec.app_name);
  const id='card_'+rec.id;
  const stageLabel=cleanStageText(rec.stage||'');

  const kvRows=[
    ['SR. NO',rec.sr_no],['TM NO',rec.tm_no],['FOLDER',rec.folder_name],
    ['DATE',rec.date_l],['CLASS',rec.class],['CLASS DESC',rec.class_desc],
    ['APP TYPE',rec.app_type],['APP NAME',rec.app_name],["FATHER'S NAME",rec.app_so],
    ['CNIC',rec.app_cnic],['ISSUE DATE',rec.issue_date],['EXPIRY DATE',rec.expiry_date],
    ['TRADE NAME',rec.app_trade],['APP ADDRESS',rec.app_add],['YEAR',rec.year],
    ['CON. NAME',rec.con_name],['CON. ADDRESS',rec.con_add],
    ['IMG',rec.img],['NO IMG TEXT',rec.no_img],
  ].map(([k,v])=>`<div class="kv-row"><span class="kv-key">${k}</span><span class="kv-val">${v||'—'}</span></div>`).join('');

  return `
  <div class="result-card" id="${id}">
    <div class="card-top-row">
      <span style="font-family:'DM Mono',monospace;font-size:9px;color:#888">${rec.sr_no||'—'}</span>
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
      <div class="card-stage-box" style="background:${sc};border-color:${sc}">
        <span class="card-stage-text" style="color:white">${stageBadgeText(sn)}</span>
      </div>
    </div>
    ${stageLabel?`<div class="card-status-bar" style="border-color:${sc}">
      <span class="card-status-label" style="color:${sc}">${stageLabel.toUpperCase()}</span>
    </div>`:''}
    ${rec.con_name?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:#0A6B52;margin-top:4px;padding:3px 8px;background:rgba(10,107,82,0.06);border:1.5px solid rgba(10,107,82,0.2);border-radius:3px;display:inline-block">CON: ${rec.con_name}</div>`:''}
    <div class="card-actions">
      <button class="expand-btn" onclick="toggleKV('kv_${id}',this)">▼ ALL FIELDS</button>
      <button class="edit-btn"   onclick="openEditModal(${rec.id})">✎ EDIT</button>
      <button class="action-del" style="padding:5px 10px;font-size:10px" onclick="deleteRec(${rec.id},'${(rec.app_name||'').replace(/'/g,"\\'")}',true)">✕</button>
    </div>
    <div id="kv_${id}" class="kv-table" style="display:none">${kvRows}</div>
  </div>`;
}

function toggleKV(kvId,btn){
  const el=document.getElementById(kvId);
  const hidden=el.style.display==='none';
  el.style.display=hidden?'block':'none';
  btn.textContent=hidden?'▲ HIDE FIELDS':'▼ ALL FIELDS';
}

// ─── Search ───────────────────────────────────────────────────────────────────
function doSearch(){
  const q=(document.getElementById('searchInput').value||'').trim().toLowerCase();
  lastSearchQuery=q;
  const el=document.getElementById('searchResults');
  const countEl=document.getElementById('searchCount');
  if(!q){
    el.innerHTML=`<div class="no-results"><div class="no-results-title">START SEARCHING</div><p class="no-results-hint">Enter TM Number, app name, CNIC or serial number.</p></div>`;
    if(countEl) countEl.textContent='';
    return;
  }
  const matches=allRecords.filter(r=>
    (r.tm_no||'').toLowerCase().includes(q)||
    (r.app_name||'').toLowerCase().includes(q)||
    (r.sr_no||'').toLowerCase().includes(q)||
    (r.app_cnic||'').toLowerCase().includes(q)||
    (r.app_trade||'').toLowerCase().includes(q)||
    (r.con_name||'').toLowerCase().includes(q)
  );
  if(countEl) countEl.textContent=matches.length+' result'+(matches.length!==1?'s':'');
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

// ─── Records table ────────────────────────────────────────────────────────────
function getFilteredRows(){
  const q=(document.getElementById('filterInput')?document.getElementById('filterInput').value:'').trim().toLowerCase();
  let rows=[...allRecords];
  if(q) rows=rows.filter(r=>Object.values(r).some(v=>(v||'').toString().toLowerCase().includes(q)));
  if(activeFilters.stage!=='')      rows=rows.filter(r=>getStageNum(r.stage||'')==parseInt(activeFilters.stage));
  if(activeFilters.status_run) rows=rows.filter(r=>(r.status_run||'')==activeFilters.status_run);
  if(activeFilters.app_type)   rows=rows.filter(r=>(r.app_type||'')==activeFilters.app_type);
  if(activeFilters.year)       rows=rows.filter(r=>(r.year||'')==activeFilters.year);
  rows.sort((a,b)=>{
    if(sortKey==='app_name')   return (a.app_name||'').localeCompare(b.app_name||'');
    if(sortKey==='stage')      return getStageNum(b.stage||'')-getStageNum(a.stage||'');
    if(sortKey==='status_run') return (a.status_run||'').localeCompare(b.status_run||'');
    return new Date(b.created_at||0)-new Date(a.created_at||0);
  });
  return rows;
}

function renderRecordsTable(){
  const rows=getFilteredRows();
  const total=rows.length;
  const totalPages=pageSize===0?1:Math.ceil(total/pageSize);
  if(currentPage>totalPages) currentPage=Math.max(1,totalPages);
  const start=pageSize===0?0:(currentPage-1)*pageSize;
  const end=pageSize===0?total:Math.min(start+pageSize,total);
  const pageRows=rows.slice(start,end);

  document.getElementById('recordsCount').textContent=total.toLocaleString()+' records';
  renderPagination(total,totalPages,'paginationBar');
  renderPagination(total,totalPages,'paginationBarBottom');

  const tbody=document.getElementById('recordsTbody');
  if(!pageRows.length){
    tbody.innerHTML=`<tr><td colspan="11" style="text-align:center;padding:30px;color:#888;font-family:'DM Mono',monospace;font-size:11px">NO RECORDS</td></tr>`;
    updateBulkBar(); return;
  }
  tbody.innerHTML=pageRows.map(r=>{
    const sn=getStageNum(r.stage||'');
    const sc=stageBadgeColor(sn);
    const runColor=RUN_COLORS[r.status_run]||'#888';
    const isSel=selectedIds.has(r.id);
    const imgSrc=getImageSrc(r.img,'40');
    const imgCell=imgSrc
      ?`<img src="${imgSrc}" alt="" style="width:25px;height:25px;object-fit:contain;border:1.5px solid #0C0C0C;border-radius:3px;background:#f5edd8;vertical-align:middle">`
      :`<div style="width:25px;height:25px;background:#ede0c4;border:1.5px solid #ccc;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#aaa;font-family:'DM Mono',monospace">™</div>`;
    return `<tr class="${isSel?'tr-selected':''}">
      <td><input type="checkbox" class="row-check" data-id="${r.id}" ${isSel?'checked':''}></td>
      <td>${imgCell}</td>
      <td class="td-case">${r.sr_no||'—'}</td>
      <td class="td-tm">™ ${r.tm_no||'—'}</td>
      <td class="td-name">${r.app_name||'—'}</td>
      <td><span class="td-cls">${r.class||'—'}</span></td>
      <td><div class="stage-badge-num" style="background:${sc};border-color:${sc}">${stageBadgeText(sn)}</div></td>
      <td><span style="font-family:'DM Mono',monospace;font-size:9px;color:${runColor};border:1.5px solid ${runColor};border-radius:3px;padding:1px 5px">${r.status_run||'—'}</span></td>
      <td>${r.app_type?`<span class="td-city" style="color:#0A6B52;border-color:#0A6B52">${r.app_type}</span>`:'—'}</td>
      <td class="td-date" style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.con_name||''}">${r.con_name||'—'}</td>
      <td><div class="action-cell">
        <button class="action-tick ${isSel?'checked':''}" data-id="${r.id}">✓</button>
        <button class="action-edit" onclick="openEditModal(${r.id})">✎</button>
        <button class="btn-assign" style="padding:3px 6px;font-size:9px" title="Assign to agent" onclick="openAssignModal(${r.id},'${(r.tm_no||'').replace(/'/g,"\\'")}','${(r.app_name||'').replace(/'/g,"\\'")}')">⊕</button>
        <button class="action-del"  onclick="deleteRec(${r.id},'${(r.app_name||'').replace(/'/g,"\\'")}',false)">✕</button>
      </div></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.row-check').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const id=parseInt(cb.dataset.id);
      cb.checked?selectedIds.add(id):selectedIds.delete(id);
      updateBulkBar();
    });
  });
  tbody.querySelectorAll('.action-tick').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=parseInt(btn.dataset.id);
      selectedIds.has(id)?selectedIds.delete(id):selectedIds.add(id);
      renderRecordsTable();
    });
  });
  updateBulkBar();
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination(total,totalPages,containerId){
  const el=document.getElementById(containerId);
  if(!el) return;
  if(totalPages<=1&&pageSize!==0){el.innerHTML='';return;}
  const start=pageSize===0?1:(currentPage-1)*pageSize+1;
  const end=pageSize===0?total:Math.min(currentPage*pageSize,total);
  let nums='';
  for(let p=Math.max(1,currentPage-2);p<=Math.min(totalPages,currentPage+2);p++){
    nums+=`<button class="pg-btn${p===currentPage?' active':''}" onclick="gotoPage(${p})">${p}</button>`;
  }
  el.innerHTML=`<div class="pagination-row">
    <span class="pg-info">${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}</span>
    <div class="pg-pages">
      <button class="pg-btn" onclick="gotoPage(${currentPage-1})" ${currentPage<=1?'disabled':''}>‹</button>
      ${nums}
      <button class="pg-btn" onclick="gotoPage(${currentPage+1})" ${currentPage>=totalPages?'disabled':''}>›</button>
    </div>
    <div class="pg-sizes">
      <span class="sort-label">PER PAGE</span>
      ${[50,100,500,0].map(n=>`<button class="pg-btn${pageSize===n?' active':''}" onclick="setPageSize(${n})">${n===0?'ALL':n}</button>`).join('')}
    </div>
  </div>`;
}
function gotoPage(p){currentPage=Math.max(1,p);renderRecordsTable();}
function setPageSize(n){pageSize=n;currentPage=1;renderRecordsTable();}

// ─── Bulk actions ─────────────────────────────────────────────────────────────
function updateBulkBar(){
  const bar=document.getElementById('bulkBar');
  if(!bar) return;
  if(selectedIds.size===0){bar.style.display='none';return;}
  bar.style.display='flex';
  document.getElementById('bulkCount').textContent=selectedIds.size+' selected';
}
async function bulkDelete(){
  if(!selectedIds.size) return;
  if(!confirm(`Delete ${selectedIds.size} selected records?\n\nThis cannot be undone.`)) return;
  const ids=[...selectedIds];
  let deleted=0;
  for(const id of ids){
    try{
      const r=await fetch(`${API}/trademarks/${id}`,{method:'DELETE'});
      const j=await r.json();
      if(j.success){allRecords=allRecords.filter(x=>x.id!==id);selectedIds.delete(id);deleted++;}
    }catch{}
  }
  await loadStats();
  renderRecordsTable();
  alert(`Deleted ${deleted} of ${ids.length} records.`);
}
function bulkClear(){selectedIds.clear();renderRecordsTable();}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteRec(id,name,fromSearch=false){
  if(!confirm(`Delete "${name}" (ID ${id})?\n\nThis will permanently remove it.`)) return;
  try{
    const r=await fetch(`${API}/trademarks/${id}`,{method:'DELETE'});
    const j=await r.json();
    if(!j.success) throw new Error(j.error);
    allRecords=allRecords.filter(x=>x.id!==id);
    selectedIds.delete(id);
    await loadStats();
    renderRecordsTable();
    if(fromSearch) doSearch(); // re-run search to remove deleted card
  }catch(e){alert('Delete failed: '+e.message);}
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV(){
  const rows=getFilteredRows();
  const cols=['id','sr_no','tm_no','app_name','class','class_desc','stage','status_run',
              'app_type','app_so','app_cnic','issue_date','expiry_date','app_trade',
              'app_add','year','con_name','con_add','date_l','folder_name','img','no_img'];
  const esc=v=>'"'+(v||'').toString().replace(/"/g,'""')+'"';
  const csv=[cols.join(','),...rows.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='brandex_trademarks_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

// ─── Sync from Google Sheets ──────────────────────────────────────────────────
async function syncFromSheets(){
  const btn=document.getElementById('syncBtn');
  if(!btn) return;
  const orig=btn.textContent;
  btn.textContent='⏳ SYNCING…';btn.disabled=true;
  try{
    const res=await fetch(`${API}/sync-sheets`,{method:'POST'});
    const j=await res.json();
    if(!j.success) throw new Error(j.error||'Sync failed');
    alert(`✅ Sync complete!\nNew records: ${j.inserted} | Skipped: ${j.skipped}`);
    await loadData();
  }catch(e){alert('Sync failed: '+e.message);}
  finally{btn.textContent=orig;btn.disabled=false;}
}

// ─── Image upload ─────────────────────────────────────────────────────────────
async function handleImageUpload(file){
  if(!file) return;
  const fd=new FormData();
  fd.append('image',file);
  try{
    const res=await fetch(`${API}/upload`,{method:'POST',body:fd});
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    const imgEl=document.getElementById('editImg');
    if(imgEl) imgEl.value=j.path;
    updateImgPreview(j.path);
  }catch(e){alert('Upload failed: '+e.message);}
}

// ─── Assignment system ────────────────────────────────────────────────────────
let assignmentFilter = { agent:'', status:'', city:'' };
let assigningTrademarkId = null;
let editingAssignmentId  = null;

const STATUS_COLORS = { Pending:'#D4A800', 'In Progress':'#2563EB', Complete:'#0D9970' };
const AGENTS = ['UZMA','FASIAL','RASHID','SULMAN'];

async function renderAssignmentTab(){
  const el=document.getElementById('assignmentContent');
  if(!el) return;
  el.innerHTML=`<div style="padding:40px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:#888">Loading assignments…</div>`;

  try{
    const [statsRes,assignRes,unassignedRes]=await Promise.all([
      fetch(`${API}/assignments/stats`),
      fetch(`${API}/assignments`),
      fetch(`${API}/assignments/unassigned`),
    ]);
    const [statsJ,assignJ,unassignedJ]=await Promise.all([
      statsRes.json(),assignRes.json(),unassignedRes.json()
    ]);
    if(!assignJ.success) throw new Error(assignJ.error);

    const stats     =statsJ.data||{};
    const allAssign =assignJ.data||[];
    const unassigned=unassignedJ.data||[];

    // Filter
    let filtered=allAssign;
    if(assignmentFilter.agent)  filtered=filtered.filter(a=>a.agent_name===assignmentFilter.agent);
    if(assignmentFilter.city)   filtered=filtered.filter(a=>a.agent_city===assignmentFilter.city);
    if(assignmentFilter.status) filtered=filtered.filter(a=>a.status===assignmentFilter.status);

    // Agent breakdown
    const aStats={};
    AGENTS.forEach(a=>{aStats[a]={total:0,pending:0,inProgress:0,complete:0};});
    allAssign.forEach(a=>{
      if(!aStats[a.agent_name]) aStats[a.agent_name]={total:0,pending:0,inProgress:0,complete:0};
      aStats[a.agent_name].total++;
      if(a.status==='Pending')     aStats[a.agent_name].pending++;
      if(a.status==='In Progress') aStats[a.agent_name].inProgress++;
      if(a.status==='Complete')    aStats[a.agent_name].complete++;
    });

    el.innerHTML=`
      <!-- Stats -->
      <div class="assign-header">
        <div class="assign-stat-row">
          <div class="assign-stat"><span class="assign-stat-val" style="color:#0C0C0C">${parseInt(stats.total)||0}</span><span class="assign-stat-lbl">TOTAL</span></div>
          <div class="assign-stat"><span class="assign-stat-val" style="color:#D4A800">${parseInt(stats.pending)||0}</span><span class="assign-stat-lbl">PENDING</span></div>
          <div class="assign-stat"><span class="assign-stat-val" style="color:#2563EB">${parseInt(stats.in_progress)||0}</span><span class="assign-stat-lbl">IN PROGRESS</span></div>
          <div class="assign-stat"><span class="assign-stat-val" style="color:#0D9970">${parseInt(stats.complete)||0}</span><span class="assign-stat-lbl">COMPLETE</span></div>
          ${unassigned.length?`<div class="assign-stat" style="border-color:#C94A00"><span class="assign-stat-val" style="color:#C94A00">${unassigned.length}</span><span class="assign-stat-lbl">UNASSIGNED</span></div>`:''}
        </div>
      </div>

      <!-- Agent cards -->
      <div class="agent-breakdown-row">
        ${AGENTS.map(agent=>{
          const s=aStats[agent];
          const active=assignmentFilter.agent===agent;
          return `<div class="agent-breakdown-card${active?' active':''}" onclick="filterAssignByAgent('${active?'':agent}')">
            <div class="agent-breakdown-name">${agent}</div>
            <div class="agent-breakdown-total">${s.total}</div>
            <div class="agent-breakdown-bars">
              <div class="agent-sub-stat"><span style="color:#D4A800">${s.pending}</span><span>Pending</span></div>
              <div class="agent-sub-stat"><span style="color:#2563EB">${s.inProgress}</span><span>Active</span></div>
              <div class="agent-sub-stat"><span style="color:#0D9970">${s.complete}</span><span>Done</span></div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Filter + count row -->
      <div class="assign-filter-bar">
        <select class="filter-select" onchange="filterAssignByStatus(this.value)">
          <option value="">All Status</option>
          ${['Pending','In Progress','Complete'].map(s=>`<option${assignmentFilter.status===s?' selected':''}>${s}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="filterAssignByCity(this.value)">
          <option value="">All Cities</option>
          ${['KARACHI','LAHORE','ISLAMABAD'].map(c=>`<option${assignmentFilter.city===c?' selected':''}>${c}</option>`).join('')}
        </select>
        ${(assignmentFilter.agent||assignmentFilter.status||assignmentFilter.city)?`<button class="btn-outline" style="padding:5px 10px;font-size:9px" onclick="clearAssignFilters()">✕ CLEAR</button>`:''}
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:#888;margin-left:auto">${filtered.length} record${filtered.length!==1?'s':''}</span>
      </div>

      <!-- Assignments table -->
      <div class="table-wrap" style="margin-bottom:24px">
        <table class="records-table">
          <thead><tr>
            <th>TM NO</th><th>APP NAME</th><th>CLASS</th><th>STAGE</th>
            <th>AGENT</th><th>CITY</th><th>STATUS</th><th>DATE</th><th>ACTIONS</th>
          </tr></thead>
          <tbody>
            ${!filtered.length?`<tr><td colspan="9" style="text-align:center;padding:30px;color:#888;font-family:'DM Mono',monospace;font-size:11px">NO ASSIGNMENTS${(assignmentFilter.agent||assignmentFilter.status||assignmentFilter.city)?' — clear filters to see all':' YET'}</td></tr>`:''}
            ${filtered.map(a=>{
              const sn=getStageNum(a.stage||'');
              const sc=stageBadgeColor(sn);
              const stc=STATUS_COLORS[a.status]||'#888';
              const dt=a.assigned_at?new Date(a.assigned_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
              const safe_tm   =(a.tm_no||'').replace(/'/g,"\\'");
              const safe_name =(a.app_name||'').replace(/'/g,"\\'");
              return `<tr>
                <td class="td-tm">™ ${a.tm_no||'—'}</td>
                <td class="td-name">${a.app_name||'—'}</td>
                <td><span class="td-cls">${a.class||'—'}</span></td>
                <td><div class="stage-badge-num" style="background:${sc}">${stageBadgeText(sn)}</div></td>
                <td style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600">${a.agent_name}</td>
                <td style="font-family:'DM Mono',monospace;font-size:10px;color:#555">${a.agent_city}</td>
                <td><span class="assign-status-badge" style="color:${stc};border-color:${stc}">${a.status}</span></td>
                <td class="td-date">${dt}</td>
                <td><div class="action-cell" style="gap:4px;flex-wrap:wrap">
                  ${a.status!=='Complete'
                    ?`<button class="btn-assign-complete" onclick="completeAssignment(${a.id})">✓</button>`
                    :`<span style="font-family:'DM Mono',monospace;font-size:9px;color:#0D9970;padding:2px 4px">✓</span>`
                  }
                  <button class="action-edit" title="Reassign" onclick="openAssignModal(${a.trademark_id},'${safe_tm}','${safe_name}',${a.id},'${a.agent_name}','${a.agent_city}','${a.status}')">⟳</button>
                  <button class="action-del" onclick="removeAssignment(${a.id},'${safe_name}')">✕</button>
                </div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Unassigned Queue -->
      ${unassigned.length?`
      <div class="assign-panel">
        <div class="assign-panel-title" style="color:#C94A00">
          UNASSIGNED QUEUE — ${unassigned.length} record${unassigned.length!==1?'s':''} in ASSIGNED stage without a formal assignment
        </div>
        <div class="table-wrap" style="margin-top:10px">
          <table class="records-table">
            <thead><tr><th>TM NO</th><th>APP NAME</th><th>CLASS</th><th>STAGE</th><th>SUB-STATUS</th><th>ACTION</th></tr></thead>
            <tbody>
              ${unassigned.slice(0,50).map(r=>{
                const sn=getStageNum(r.stage||'');
                const safe_tm   =(r.tm_no||'').replace(/'/g,"\\'");
                const safe_name =(r.app_name||'').replace(/'/g,"\\'");
                return `<tr>
                  <td class="td-tm">™ ${r.tm_no||'—'}</td>
                  <td class="td-name">${r.app_name||'—'}</td>
                  <td><span class="td-cls">${r.class||'—'}</span></td>
                  <td><div class="stage-badge-num" style="background:${stageBadgeColor(sn)}">${stageBadgeText(sn)}</div></td>
                  <td style="font-family:'DM Mono',monospace;font-size:9px;color:#C94A00">${cleanStageText(r.class_desc||'')||'—'}</td>
                  <td><button class="btn-assign" onclick="openAssignModal(${r.id},'${safe_tm}','${safe_name}')">⊕ ASSIGN</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${unassigned.length>50?`<div style="text-align:center;padding:8px;font-family:'DM Mono',monospace;font-size:9px;color:#888">Showing 50 of ${unassigned.length}</div>`:''}
      </div>`:''}
    `;
  }catch(e){
    el.innerHTML=`<div class="no-results"><div class="no-results-title">ERROR</div><p class="no-results-hint">${e.message}</p></div>`;
  }
}

function filterAssignByAgent(a){ assignmentFilter.agent=a; renderAssignmentTab(); }
function filterAssignByStatus(s){ assignmentFilter.status=s; renderAssignmentTab(); }
function filterAssignByCity(c){ assignmentFilter.city=c; renderAssignmentTab(); }
function clearAssignFilters(){ assignmentFilter={agent:'',status:'',city:''}; renderAssignmentTab(); }

// ─── Assign modal ─────────────────────────────────────────────────────────────
function openAssignModal(trademarkId,tmNo,appName,assignId,agent,city,status){
  assigningTrademarkId=trademarkId;
  editingAssignmentId=assignId||null;
  document.getElementById('assignModalTitle').textContent=assignId?'REASSIGN RECORD':'ASSIGN RECORD';
  document.getElementById('assignModalCase').textContent=tmNo?`TM ${tmNo}`:'';
  document.getElementById('assignAgent').value=agent||'';
  document.getElementById('assignCity').value=city||'';
  document.getElementById('assignStatus').value=status||'Pending';
  document.getElementById('assignNotes').value='';
  const preview=document.getElementById('assignRecordPreview');
  const info=document.getElementById('assignRecordInfo');
  if(appName){preview.style.display='block';info.textContent=appName+(tmNo?` · TM ${tmNo}` :'');}
  else preview.style.display='none';
  document.getElementById('assignModal').classList.add('open');
}

function closeAssignModal(){
  document.getElementById('assignModal').classList.remove('open');
  assigningTrademarkId=null;
  editingAssignmentId=null;
}

async function saveAssignment(){
  const agent =document.getElementById('assignAgent').value;
  const city  =document.getElementById('assignCity').value;
  const status=document.getElementById('assignStatus').value;
  const notes =document.getElementById('assignNotes').value.trim();
  if(!agent||!city){alert('Select an agent and city.');return;}
  const btn=document.getElementById('assignModalSave');
  btn.textContent='SAVING…';btn.disabled=true;
  try{
    let j;
    if(editingAssignmentId){
      const res=await fetch(`${API}/assignments/${editingAssignmentId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_name:agent,agent_city:city,status,notes:notes||null})});
      j=await res.json();
    }else{
      const res=await fetch(`${API}/assignments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trademark_id:assigningTrademarkId,agent_name:agent,agent_city:city,notes:notes||null})});
      j=await res.json();
    }
    if(!j.success) throw new Error(j.error);
    closeAssignModal();
    renderAssignmentTab();
  }catch(e){alert('Save failed: '+e.message);}
  finally{btn.textContent='ASSIGN';btn.disabled=false;}
}

async function completeAssignment(id){
  try{
    const res=await fetch(`${API}/assignments/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'Complete'})});
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    renderAssignmentTab();
  }catch(e){alert('Failed: '+e.message);}
}

async function removeAssignment(id,appName){
  if(!confirm(`Remove assignment for "${appName}"?\n\nThe record will stay in the database, just unassigned.`)) return;
  try{
    const res=await fetch(`${API}/assignments/${id}`,{method:'DELETE'});
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    renderAssignmentTab();
  }catch(e){alert('Failed: '+e.message);}
}

// ─── Edit / Add modal ─────────────────────────────────────────────────────────
function populateClassSelect(){
  const sel=document.getElementById('editClass');
  if(!sel) return;
  sel.innerHTML='<option value="">— Select class —</option>';
  for(let i=1;i<=45;i++) sel.innerHTML+=`<option value="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</option>`;
}

function openEditModal(id){
  isNewRecord=false;
  const rec=allRecords.find(r=>r.id===id);
  if(!rec) return;
  editingRecord=rec;
  document.getElementById('modalTitle').textContent='EDIT RECORD';
  document.getElementById('modalCase').textContent=rec.sr_no||'';
  document.getElementById('modalNotice').textContent='📡 Changes save directly to database.';
  fillModalForm(rec);
  document.getElementById('editModal').classList.add('open');
}

function openAddModal(){
  isNewRecord=true;editingRecord=null;
  document.getElementById('modalTitle').textContent='ADD NEW RECORD';
  document.getElementById('modalCase').textContent='';
  document.getElementById('modalNotice').textContent='📡 New record will be saved to database.';
  fillModalForm({});
  document.getElementById('editSrNo').value=genSrNo();
  document.getElementById('editModal').classList.add('open');
}

function fillModalForm(rec){
  const f=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val||'';};
  f('editStatusRun',rec.status_run);f('editStage',rec.stage);
  f('editSrNo',rec.sr_no);f('editTmNo',rec.tm_no);
  f('editFolder',rec.folder_name);f('editDateL',rec.date_l);
  f('editClass',rec.class);f('editClassDesc',rec.class_desc);
  f('editAppType',rec.app_type);f('editAppName',rec.app_name);
  f('editAppSo',rec.app_so);f('editAppCnic',rec.app_cnic);
  f('editIssueDate',rec.issue_date);f('editExpiryDate',rec.expiry_date);
  f('editAppTrade',rec.app_trade);f('editAppAdd',rec.app_add);
  f('editYear',rec.year);f('editConName',rec.con_name);
  f('editConAdd',rec.con_add);f('editImg',rec.img);f('editNoImg',rec.no_img);
  updateImgPreview(rec.img);
  const iu=document.getElementById('imgUpload');if(iu)iu.value='';
}

function closeEditModal(){
  document.getElementById('editModal').classList.remove('open');
  editingRecord=null;
}

const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};

async function saveEdit(){
  const data={
    status_run:gv('editStatusRun'),stage:gv('editStage'),
    sr_no:gv('editSrNo'),tm_no:gv('editTmNo'),
    folder_name:gv('editFolder'),date_l:gv('editDateL'),
    class:gv('editClass'),class_desc:gv('editClassDesc'),
    app_type:gv('editAppType'),app_name:gv('editAppName'),
    app_so:gv('editAppSo'),app_cnic:gv('editAppCnic'),
    issue_date:gv('editIssueDate'),expiry_date:gv('editExpiryDate'),
    app_trade:gv('editAppTrade'),app_add:gv('editAppAdd'),
    year:gv('editYear'),con_name:gv('editConName'),
    con_add:gv('editConAdd'),img:gv('editImg'),no_img:gv('editNoImg'),
  };
  if(!data.app_name){alert('App Name (J) is required ⭐');return;}
  const btn=document.getElementById('modalSave');
  btn.textContent='SAVING…';btn.disabled=true;
  try{
    let j;
    if(isNewRecord){
      const res=await fetch(`${API}/trademarks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      j=await res.json();
      if(!j.success) throw new Error(j.error);
      await loadData();
    }else{
      const res=await fetch(`${API}/trademarks/${editingRecord.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      j=await res.json();
      if(!j.success) throw new Error(j.error);
      Object.assign(editingRecord,data);
      renderRecordsTable();
      await loadStats();
    }
    closeEditModal();
  }catch(e){alert('Save failed: '+e.message);}
  finally{btn.textContent='SAVE TO DATABASE';btn.disabled=false;}
}

function updateImgPreview(src){
  const wrap=document.getElementById('imgPreview');
  const img=document.getElementById('imgPreviewEl');
  const s=getImageSrc(src,'200');
  if(s&&wrap&&img){img.src=s;wrap.style.display='block';}
  else if(wrap) wrap.style.display='none';
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(id){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+id));
  if(id==='records')    renderRecordsTable();
  if(id==='assignment') renderAssignmentTab(); // async — updates DOM when done
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  populateClassSelect();

  document.getElementById('tabNav').addEventListener('click',e=>{
    const btn=e.target.closest('.tab-btn');
    if(btn) switchTab(btn.dataset.tab);
  });

  document.getElementById('searchBtn').addEventListener('click',doSearch);
  document.getElementById('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
  document.getElementById('refreshBtn').addEventListener('click',loadData);
  document.getElementById('syncBtn').addEventListener('click',syncFromSheets);

  ['addNewBtn','addNewBtn2','addNewBtn3'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('click',openAddModal);
  });

  document.getElementById('filterInput').addEventListener('input',()=>{currentPage=1;renderRecordsTable();});

  // Filter dropdowns
  ['filterStage','filterStatus','filterType','filterYear'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change',()=>{
      activeFilters.stage      = document.getElementById('filterStage')?.value??'';
      activeFilters.status_run = document.getElementById('filterStatus')?.value??'';
      activeFilters.app_type   = document.getElementById('filterType')?.value??'';
      activeFilters.year       = document.getElementById('filterYear')?.value??'';
      currentPage=1;renderRecordsTable();
    });
  });

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      sortKey=btn.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach(b=>b.classList.toggle('active',b===btn));
      currentPage=1;renderRecordsTable();
    });
  });

  // Select all
  document.getElementById('selectAll').addEventListener('change',e=>{
    const rows=getFilteredRows();
    const s=pageSize===0?0:(currentPage-1)*pageSize;
    const en=pageSize===0?rows.length:Math.min(s+pageSize,rows.length);
    rows.slice(s,en).forEach(r=>e.target.checked?selectedIds.add(r.id):selectedIds.delete(r.id));
    renderRecordsTable();
  });

  document.getElementById('bulkDelBtn').addEventListener('click',bulkDelete);
  document.getElementById('bulkClrBtn').addEventListener('click',bulkClear);
  document.getElementById('exportBtn').addEventListener('click',exportCSV);

  // Assign modal
  document.getElementById('assignModalClose').addEventListener('click',closeAssignModal);
  document.getElementById('assignModalCancel').addEventListener('click',closeAssignModal);
  document.getElementById('assignModalSave').addEventListener('click',saveAssignment);
  document.getElementById('assignModal').addEventListener('click',e=>{
    if(e.target===document.getElementById('assignModal')) closeAssignModal();
  });

  // Edit modal
  document.getElementById('modalClose').addEventListener('click',closeEditModal);
  document.getElementById('modalCancel').addEventListener('click',closeEditModal);
  document.getElementById('modalSave').addEventListener('click',saveEdit);
  document.getElementById('editModal').addEventListener('click',e=>{
    if(e.target===document.getElementById('editModal')) closeEditModal();
  });

  const cnicEl=document.getElementById('editAppCnic');
  if(cnicEl) cnicEl.addEventListener('input',()=>{cnicEl.value=formatCNIC(cnicEl.value);});

  const issueDateEl=document.getElementById('editIssueDate');
  if(issueDateEl) issueDateEl.addEventListener('input',()=>{
    const exp=document.getElementById('editExpiryDate');
    if(exp) exp.value=autoExpiry(issueDateEl.value);
  });

  const imgEl=document.getElementById('editImg');
  if(imgEl) imgEl.addEventListener('input',()=>updateImgPreview(imgEl.value.trim()));

  const imgUpload=document.getElementById('imgUpload');
  if(imgUpload) imgUpload.addEventListener('change',e=>{
    const file=e.target.files?.[0];
    if(file) handleImageUpload(file);
  });

  loadData();
});
