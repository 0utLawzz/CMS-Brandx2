// ─── Config ──────────────────────────────────────────────────────────────────
const API = '/api';
const RUN_COLORS   = { Run:'#2563EB', Processing:'#D4A800', Done:'#0D9970' };
const AVATAR_COLORS = ['#C94A00','#0A6B52','#D4A800','#0D9970','#8B2FC9','#2563EB','#DC2626'];

// ─── CSV Data: Classes ────────────────────────────────────────────────────────
const CLASS_MAP = [
  [1,'CHEMICALS USED IN INDUSTRY, SCIENCE AND PHOTOGRAPHY, AS WELL AS IN AGRICULTURE, HORTICULTURE AND FORESTRY; UNPROCESSED ARTIFICIAL RESINS, UNPROCESSED PLASTICS; MANURES; FIRE EXTINGUISHING COMPOSITIONS; TEMPERING AND SOLDERING PREPARATIONS; CHEMICAL SUBSTANCES FOR PRESERVING FOODSTUFFS; TANNING SUBSTANCES; ADHESIVES USED IN INDUSTRY.'],
  [2,'PAINTS, VARNISHES, LACQUERS; PRESERVATIVES AGAINST RUST AND AGAINST DETERIORATION OF WOOD; COLORANTS; MORDANTS; RAW NATURAL RESINS; METALS IN FOIL AND POWDER FORM FOR PAINTERS, DECORATORS, PRINTERS AND ARTISTS.'],
  [3,'BLEACHING PREPARATIONS AND OTHER SUBSTANCES FOR LAUNDRY USE; CLEANING, POLISHING, SCOURING AND ABRASIVE PREPARATIONS; SOAPS; PERFUMERY, ESSENTIAL OILS, COSMETICS, HAIR LOTIONS; DENTIFRICES.'],
  [4,'INDUSTRIAL OILS AND GREASES; LUBRICANTS; DUST ABSORBING, WETTING AND BINDING COMPOSITIONS; FUELS (INCLUDING MOTOR SPIRIT) AND ILLUMINANTS; CANDLES AND WICKS FOR LIGHTING.'],
  [5,'PHARMACEUTICAL AND VETERINARY PREPARATIONS; SANITARY PREPARATIONS FOR MEDICAL PURPOSES; DIETETIC SUBSTANCES ADAPTED FOR MEDICAL USE, FOOD FOR BABIES; PLASTERS, MATERIALS FOR DRESSINGS; MATERIAL FOR STOPPING TEETH, DENTAL WAX; DISINFECTANTS; PREPARATIONS FOR DESTROYING VERMIN; FUNGICIDES, HERBICIDES.'],
  [6,'COMMON METALS AND THEIR ALLOYS; METAL BUILDING MATERIALS; TRANSPORTABLE BUILDINGS OF METAL; MATERIALS OF METAL FOR RAILWAY TRACKS; NON-ELECTRIC CABLES AND WIRES OF COMMON METAL; IRONMONGERY, SMALL ITEMS OF METAL HARDWARE; PIPES AND TUBES OF METAL; SAFES; GOODS OF COMMON METAL NOT INCLUDED IN OTHER CLASSES; ORES.'],
  [7,'MACHINES AND MACHINE TOOLS; MOTORS AND ENGINES (EXCEPT FOR LAND VEHICLES); MACHINE COUPLING AND TRANSMISSION COMPONENTS (EXCEPT FOR LAND VEHICLES); AGRICULTURAL IMPLEMENTS OTHER THAN HAND-OPERATED; INCUBATORS FOR EGGS.'],
  [8,'HAND TOOLS AND IMPLEMENTS (HAND-OPERATED); CUTLERY; SIDE ARMS; RAZORS; HAMMER, SHOVEL, HANDSAW, SPANNERS, PLIERS, PUNCH PLIERS, HAND DRILLS, GRAVING TOOLS, GRAFTING TOOLS, STAMPS, FULLERS, EMBOSSERS, BIT BRACES, BEING GOODS INCLUDED IN CLASS-08.'],
  [9,'SCIENTIFIC, NAUTICAL, SURVEYING, PHOTOGRAPHIC, CINEMATOGRAPHIC, OPTICAL, WEIGHING, MEASURING, SIGNALLING, CHECKING (SUPERVISION), LIFE-SAVING AND TEACHING APPARATUS AND INSTRUMENTS; APPARATUS AND INSTRUMENTS FOR CONDUCTING, SWITCHING, TRANSFORMING, ACCUMULATING, REGULATING OR CONTROLLING ELECTRICITY; APPARATUS FOR RECORDING, TRANSMISSION OR REPRODUCTION OF SOUND OR IMAGES; MAGNETIC DATA CARRIERS, RECORDING DISCS; AUTOMATIC VENDING MACHINES AND MECHANISMS FOR COIN-OPERATED APPARATUS; CASH REGISTERS, CALCULATING MACHINES, DATA PROCESSING EQUIPMENT AND COMPUTERS; FIRE-EXTINGUISHING APPARATUS.'],
  [10,'SURGICAL, MEDICAL, DENTAL AND VETERINARY APPARATUS AND INSTRUMENTS, ARTIFICIAL LIMBS, EYES AND TEETH; ORTHOPEDIC ARTICLES; SUTURE MATERIALS.'],
  [11,'APPARATUS FOR LIGHTING, HEATING, STEAM GENERATING, COOKING, REFRIGERATING, DRYING, VENTILATING, WATER SUPPLY AND SANITARY PURPOSES.'],
  [12,'VEHICLES; APPARATUS FOR LOCOMOTION BY LAND, AIR OR WATER.'],
  [13,'FIREARMS; AMMUNITION AND PROJECTILES; EXPLOSIVES; FIREWORKS.'],
  [14,'PRECIOUS METALS AND THEIR ALLOYS AND GOODS IN PRECIOUS METALS OR COATED THEREWITH, NOT INCLUDED IN OTHER CLASSES; JEWELLERY, PRECIOUS STONES; HOROLOGICAL AND CHRONOMETRIC INSTRUMENTS.'],
  [15,'MUSICAL INSTRUMENTS.'],
  [16,'PAPER, CARDBOARD AND GOODS MADE FROM THESE MATERIALS, NOT INCLUDED IN OTHER CLASSES; PRINTED MATTER; BOOKBINDING MATERIAL; PHOTOGRAPHS; STATIONERY; ADHESIVES FOR STATIONERY OR HOUSEHOLD PURPOSES; ARTISTS\' MATERIALS; PAINT BRUSHES; TYPEWRITERS AND OFFICE REQUISITES (EXCEPT FURNITURE); INSTRUCTIONAL AND TEACHING MATERIAL (EXCEPT APPARATUS); PLASTIC MATERIALS FOR PACKAGING (NOT INCLUDED IN OTHER CLASSES); PRINTERS\' TYPE; PRINTING BLOCKS.'],
  [17,'RUBBER, GUTTA-PERCHA, GUM, ASBESTOS, MICA AND GOODS MADE FROM THESE MATERIALS AND NOT INCLUDED IN OTHER CLASSES; PLASTICS IN EXTRUDED FORM FOR USE IN MANUFACTURE; PACKING, STOPPING AND INSULATING MATERIALS; FLEXIBLE PIPES, NOT OF METAL.'],
  [18,'LEATHER AND IMITATIONS OF LEATHER, AND GOODS MADE OF THESE MATERIALS AND NOT INCLUDED IN OTHER CLASSES; ANIMAL SKINS, HIDES; TRUNKS AND TRAVELLING BAGS; UMBRELLAS, PARASOLS AND WALKING STICKS; WHIPS, HARNESS AND SADDLERY.'],
  [19,'BUILDING MATERIALS (NON-METALLIC); NON-METALLIC RIGID PIPES FOR BUILDING; ASPHALT, PITCH AND BITUMEN; NON-METALLIC TRANSPORTABLE BUILDINGS; MONUMENTS, NOT OF METAL.'],
  [20,'FURNITURE, MIRRORS, PICTURE FRAMES; GOODS (NOT INCLUDED IN OTHER CLASSES) OF WOOD, CORK, REED, CANE, WICKER, HORN, BONE, IVORY, WHALEBONE, SHELL, AMBER, MOTHER-OF-PEARL, MEERSCHAUM AND SUBSTITUTES FOR ALL THESE MATERIALS, OR OF PLASTICS.'],
  [21,'HOUSEHOLD OR KITCHEN UTENSILS AND CONTAINERS (NOT OF PRECIOUS METAL OR COATED THEREWITH); COMBS AND SPONGES; BRUSHES (EXCEPT PAINT BRUSHES); BRUSH-MAKING MATERIALS; ARTICLES FOR CLEANING PURPOSES; STEELWOOL; UNWORKED OR SEMI-WORKED GLASS (EXCEPT GLASS USED IN BUILDING); GLASSWARE, PORCELAIN AND EARTHENWARE NOT INCLUDED IN OTHER CLASSES.'],
  [22,'ROPES, STRING, NETS, TENTS, AWNINGS, TARPAULINS, SAILS, SACKS AND BAGS (NOT INCLUDED IN OTHER CLASSES); PADDING AND STUFFING MATERIALS (EXCEPT OF RUBBER OR PLASTICS); RAW FIBROUS TEXTILE MATERIALS.'],
  [23,'YARNS AND THREADS, FOR TEXTILE USE.'],
  [24,'TEXTILES AND TEXTILE GOODS, NOT INCLUDED IN OTHER CLASSES; BED AND TABLE COVERS.'],
  [25,'CLOTHING, READY-MADE GARMENTS, CASUAL WEAR, FORMAL WEAR, SPORTSWEAR, UNIFORMS, UNDERGARMENTS, HEADGEAR INCLUDING CAPS, HATS, SCARVES, SHAWLS, STOLES, GLOVES, SOCKS, HOSIERY, FOOTWEAR INCLUDING SHOES, SANDALS, SLIPPERS, BOOTS, JACKETS, COATS, JEANS, SHIRTS, T-SHIRTS, TROUSERS, SUITS, KURTAS, PAJAMAS, ABAYAS, HIJABS, RAINWEAR, OUTERWEAR, INFANT AND CHILDREN\'S CLOTHING.'],
  [26,'LACE AND EMBROIDERY, RIBBONS AND BRAID; BUTTONS, HOOKS AND EYES, PINS AND NEEDLES; ARTIFICIAL FLOWERS.'],
  [27,'CARPETS, RUGS, MATS AND MATTING, LINOLEUM AND OTHER MATERIALS FOR COVERING EXISTING FLOORS; WALL HANGINGS (NON-TEXTILE).'],
  [28,'GAMES AND PLAYTHINGS; GYMNASTIC AND SPORTING ARTICLES NOT INCLUDED IN OTHER CLASSES; DECORATIONS FOR CHRISTMAS TREES.'],
  [29,'NIMKO, SNACKS, POTATO CHIPS, CORN CHIPS, FRIED SNACKS, ROASTED NUTS, SPICED NUTS, SALTED NUTS, PROCESSED PULSES, LENTILS, BEANS, DRIED FRUITS, PRESERVED FRUITS, PICKLES, JAMS, JELLIES, MARMALADE, DAIRY PRODUCTS INCLUDING MILK, BUTTER, CHEESE, YOGHURT, GHEE, CREAM, EDIBLE OILS, MARGARINE, EGGS, MEAT, FISH, POULTRY AND GAME, PRESERVED, DRIED AND COOKED VEGETABLES.'],
  [30,'COFFEE, TEA, COCOA, SUGAR, RICE, TAPIOCA, SAGO, ARTIFICIAL COFFEE; FLOUR AND PREPARATIONS MADE FROM CEREALS, BREAD, PASTRY AND CONFECTIONERY, ICES; HONEY, TREACLE; YEAST, BAKING-POWDER; SALT, MUSTARD; VINEGAR, SAUCES (CONDIMENTS); SPICES; ICE.'],
  [31,'AGRICULTURAL, HORTICULTURAL AND FORESTRY PRODUCTS AND GRAINS NOT INCLUDED IN OTHER CLASSES; LIVE ANIMALS; FRESH FRUITS AND VEGETABLES; SEEDS, NATURAL PLANTS AND FLOWERS; FOODSTUFFS FOR ANIMALS, MALT.'],
  [32,'BEERS; MINERAL AND AERATED WATERS AND OTHER NON-ALCOHOLIC DRINKS; FRUIT DRINKS AND FRUIT JUICES; SYRUPS AND OTHER PREPARATIONS FOR MAKING BEVERAGES.'],
  [33,'ALCOHOLIC BEVERAGES (EXCEPT BEERS).'],
  [34,'TOBACCO; SMOKERS\' ARTICLES; MATCHES.'],
  [35,'RETAIL AND WHOLESALE SERVICES; TRADING, MARKETING, DISTRIBUTION AND SALE SERVICES; BUSINESS MANAGEMENT AND COMMERCIAL ASSISTANCE SERVICES.'],
  [36,'REAL ESTATE AFFAIRS; HOUSING SOCIETY SERVICES; REAL ESTATE DEVELOPMENT; REAL ESTATE MANAGEMENT; REAL ESTATE AGENCIES; LEASING OF REAL ESTATE; SALE, PURCHASE AND RENTAL OF PLOTS, LAND, HOUSES, APARTMENTS, COMMERCIAL AND RESIDENTIAL PROPERTIES; PROPERTY CONSULTANCY; HOUSING SOCIETY MANAGEMENT.'],
  [37,'BUILDING CONSTRUCTION; REPAIR; INSTALLATION SERVICES; AUTOMOBILE WASHING, CLEANING, POLISHING, SERVICING, MAINTENANCE, LUBRICATION, OIL CHANGE, REPAIR OF VEHICLES, AND RELATED GARAGE SERVICES.'],
  [38,'TELECOMMUNICATION SERVICES; PROVIDING FIBER INTERNET SERVICES; BROADBAND COMMUNICATION SERVICES; DATA TRANSMISSION VIA FIBER OPTIC NETWORKS; PROVIDING ACCESS TO THE INTERNET; WIRELESS COMMUNICATION SERVICES.'],
  [39,'TRANSPORT; PACKAGING AND STORAGE OF GOODS; TRAVEL ARRANGEMENT.'],
  [40,'TREATMENT OF MATERIALS.'],
  [41,'EDUCATIONAL SERVICES; SCHOOL EDUCATION SERVICES; PROVIDING CLASSES, LECTURES AND TRAINING PROGRAMS; PRIMARY AND SECONDARY LEVEL TEACHING; CONDUCTING ACADEMIC COURSES, EXAMINATIONS AND ASSESSMENTS.'],
  [42,'SCIENTIFIC AND TECHNOLOGICAL SERVICES AND RESEARCH AND DESIGN RELATING THERETO; INDUSTRIAL ANALYSIS AND RESEARCH SERVICES; DESIGN AND DEVELOPMENT OF COMPUTER HARDWARE AND SOFTWARE.'],
  [43,'SERVICES FOR PROVIDING FOOD AND DRINK; TEMPORARY ACCOMMODATION, FOOD AND DRINK CATERING; RESERVATION SERVICES FOR BOOKING MEALS; PERSONAL CHEF SERVICES; RESTAURANT INFORMATION SERVICES; SUPPLYING OF MEALS FOR IMMEDIATE CONSUMPTION.'],
  [44,'SKIN CARE CLINIC SERVICES; DERMATOLOGY AND AESTHETIC TREATMENT SERVICES; BEAUTY AND COSMETIC TREATMENT; LASER SKIN CARE; FACIAL TREATMENTS; HAIR AND SCALP TREATMENT; MEDICAL SPA SERVICES; BODY CONTOURING AND REJUVENATION.'],
  [45,'LEGAL SERVICES; LEGAL CONSULTANCY AND ADVISORY SERVICES; LEGAL REPRESENTATION; DRAFTING OF LEGAL DOCUMENTS; LITIGATION AND DISPUTE RESOLUTION SERVICES; LEGAL RESEARCH AND OPINIONS; CONSULTANCY RELATING TO LAWS, REGULATIONS AND LEGAL COMPLIANCE.'],
];

// ─── CSV Data: Consultants ────────────────────────────────────────────────────
const CONSULTANTS = [
  {name:'JAN ONLINE SERVICES/ÀDISTAAN',  address:'OPPOSITE GRASSY GROUND, SAIDU SHARIF, SWAT CELL # 0307-9118062, 0343-9832412'},
  {name:'BRANDEX LAW ASSOCIATES',         address:'DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004'},
  {name:'NOOR BAAF LAW ASSOCIATES',       address:'PROPERTY NO.1284, CHOWK FAROOQ-E-AZAM, COLONY NO.1, KHANEWAL 03006339721'},
  {name:'AZIZ LAW ASSOCIATES',            address:'OFFICE NO 1, AL-GHURAIR GIGA PAKISTAN (PVT LTD), DHA 2, ISLAMABAD'},
  {name:'MS TAX & FINANCE CONSULTANT',    address:'OFFICE # FF-275 & FF-183, DEANS TRADE CENTER OPPOSITE STATE BANK PESHAWAR CANTT CELL # 03149090397, 03349027935'},
  {name:'MS BRAND EXPERTS (PVT.) LIMITED',address:'OFFICE NO 06-07, 1ST FLOOR, WALAYAT PLAZA REHMANABAD, MURREE ROAD, RAWALPINDI PHONE # 051-4932363'},
  {name:'KK CONSULTANT SMC-PVT LIMITED',  address:'LG 25, MIDCITY MALL, MURREE ROAD RWALPINDI. PH: 03349590247'},
  {name:'SHEIKH LAW ASSOCIATES',          address:'DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # +92 303 2200723'},
  {name:'M. TARIQ SHAIKH LAW FIRM',       address:'DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004'},
  {name:'CONSULTANCYFIN',                 address:'FLAT # D905, GREY NOOR TOWER, SCHEME 33, KARACHI'},
  {name:'M/S. SOLUTION LEGACY',           address:'F-173/2. MARTIN ROAD KARACHI PH +92 335 4522225'},
  {name:'M/S. BRAND EXPERTS (PVT.) LIMITED',address:'OFFICE NO 06-07, 1ST FLOOR, WALAYAT PLAZA REHMANABAD, MURREE ROAD, RAWALPINDI PHONE # 051-4932363'},
  {name:'S.A.T.H CONSULTANTS',            address:'DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004'},
  {name:'BADAR CONSULTANTS',              address:'OPPOSITE GRASSY GROUND, SAIDU SHARIF, SWAT CELL # 0307-9118062, 0343-9832412'},
  {name:'MS HAFIZ M. ALI WARRAICH',       address:'DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004'},
  {name:'TAXATIONIST CORPORATE CONSULTANTS',address:'DROP AT ABDULLAH CENTRE, JUNEJO COLONY BEHIND PTCL EXCHANGE, TARLAI, ISLAMABAD CELL # 03360015004'},
  {name:'MUHAMMAD ADNAN BIN YOUSAF ASSOCIATES',address:'CHAMBER # 34-A/1, DISTRICT BAR ASSOCIATION FAISALABAD. 03006933982'},
];

// ─── State ───────────────────────────────────────────────────────────────────
let allRecords    = [];
let sortKey       = 'created_at';
let currentPage   = 1;
let pageSize      = 100;
let activeFilters = { stage:'', sub_stage:'', applicant_type:'', city:'', year:'' };
let currentSidebarStage = 'all';

let editingRecord = null;
let isNewRecord   = false;
let lastSearchQuery = '';
const selectedIds = new Set();

// Sub-stage display colors
const SUB_STAGE_COLORS = {
  'APPLICATION FILED':'#2563EB','ACKNOWLEGMENT':'#0D9970','EXAMINATION':'#D4A800',
  'ASSIGNED':'#C94A00','ACCEPTED':'#0A6B52','HEARING':'#7C3AED',
  'PUBLISHED':'#0D9970','OPPOSITION':'#DC2626','DEMAND-NOTE RECEIVED':'#D4A800','TM-11 (D-NOTE) PAID':'#0A6B52',
  'CERTIFICATE RECEIVED':'#0D9970','CERTIFICATE DISPATCH':'#2563EB','HEARING/OPPO':'#DC2626',
  'ABANDONED':'#DC2626','HOLD':'#888','REFUSED':'#DC2626',
  'COPYRIGHT FILED':'#7C3AED','COPYRIGHT ACKNOWLEDGEMENT':'#2563EB','COPYRIGHT CERTIFICATE RECEIVED':'#0D9970',
};
const RUN_COLORS = { 'Run':'#2563EB', 'Processing':'#D4A800', 'Done':'#0D9970' };

// ─── Toast System ────────────────────────────────────────────────────────────
function showToast(msg, type='success'){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg;
  t.className=`toast toast-${type}`;
  t.style.display='block';
  setTimeout(()=>{t.style.display='none';}, 4000);
}

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
  if(/^(APPLICATION FILED|ACKNOWLEGMENT|EXAMINATION)/.test(v)) return 1;
  if(/^(ASSIGNED|ACCEPTED|HEARING$)/.test(v)) return 2;
  if(/^(PUBLISHED|OPPOSITION|DEMAND-NOTE RECEIVED|TM-11 \(D-NOTE\) PAID)/.test(v)) return 3;
  if(/^(CERTIFICATE RECEIVED|CERTIFICATE DISPATCH|HEARING\/OPPO)/.test(v)) return 4;
  if(/^(STOP|ABANDON|HOLD|REFUS|^NOTE$)/.test(v)) return -1;
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

// Format: DD-MM-YYYY HH:MM:SS AM/PM
function formatLongDate(dateStr){
  if(!dateStr) return '';
  try{
    const d=new Date(dateStr);
    if(isNaN(d)) return dateStr;
    const pad=n=>String(n).padStart(2,'0');
    let h=d.getHours();
    const ampm=h>=12?'PM':'AM';
    h=h%12; if(h===0) h=12;
    return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
  }catch(e){return dateStr;}
}

// Convert input datetime-local value to ISO and vice-versa
function isoToDatetimeLocal(iso){
  if(!iso) return '';
  try{
    const d=new Date(iso);
    if(isNaN(d)) return '';
    return d.toISOString().slice(0,16); // YYYY-MM-DDThh:mm
  }catch{return '';}
}

function autoExpiry(issueIsoStr){
  const d=new Date(issueIsoStr); 
  if(isNaN(d)) return '';
  d.setDate(d.getDate()+7);
  return d.toISOString(); // For backend format, UI will show as long date or local
}

function genSrNo(){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 18; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'PB-ISB-' + rand;
}

function buildFolder(){
  const p=document.getElementById('editPrefix').value;
  const c=document.getElementById('editClientNo').value.trim();
  const n=document.getElementById('editCaseNo').value.trim();
  const folderEl=document.getElementById('editFolder');
  if(p && c && n) folderEl.value = `${p}-${c}-${n}`;
  else folderEl.value = '';
}

function getImageSrc(img, sz='80'){
  if(!img) return null;
  if(img.startsWith('/uploads/')||img.startsWith('http')) return img;
  return `https://drive.google.com/thumbnail?id=${img}&sz=w${sz}`;
}

// ─── API Sync ─────────────────────────────────────────────────────────────────
async function triggerSync(){
  const btn = document.getElementById('syncBtn');
  if(!btn) return;
  btn.textContent = 'SYNCING...';
  btn.disabled = true;
  try{
    const res = await fetch(`${API}/sync`, { method:'POST' });
    const j = await res.json();
    if(!j.success) throw new Error(j.error);
    showToast(j.message, 'success');
    loadData();
  }catch(e){
    showToast('Sync failed: ' + e.message, 'error');
  }finally{
    btn.textContent = '⇅ SYNC';
    btn.disabled = false;
  }
}

// ─── Stats & Chart ────────────────────────────────────────────────────────────
async function loadStats(){
  try{
    const r=await fetch(`${API}/stats`);
    const j=await r.json(); if(!j.success) return;
    const s=j.data;

    // Sidebar counts
    document.getElementById('sbCount1').textContent = s.stage1||0;
    document.getElementById('sbCount2').textContent = s.stage2||0;
    document.getElementById('sbCount3').textContent = s.stage3||0;
    document.getElementById('sbCount4').textContent = s.stage4||0;
    
    // Sidebar KPI 
    document.getElementById('kExam').textContent   = s.examination_pending||0;
    document.getElementById('kAssign').textContent = s.assigned_pending||0;
    document.getElementById('kPub').textContent    = s.published_pending||0;
    document.getElementById('kDemand').textContent = s.demand_note_pending||0;
    document.getElementById('kOppo').textContent   = s.opposition_count||0;

    // Dashboard grid
    document.getElementById('s-total').textContent      =(s.total||0).toLocaleString();
    document.getElementById('s-s1').textContent         =(s.stage1||0).toLocaleString();
    document.getElementById('s-s2').textContent         =(s.stage2||0).toLocaleString();
    document.getElementById('s-s3').textContent         =(s.stage3||0).toLocaleString();
    document.getElementById('s-s4').textContent         =(s.stage4||0).toLocaleString();
    document.getElementById('s-stopped').textContent    =(s.stopped||0).toLocaleString();
    
    const total=parseInt(s.total)||1;
    const BARS=[
      {label:'STAGE 4',color:'#0D9970',val:s.stage4},
      {label:'STAGE 3',color:'#D4A800',val:s.stage3},
      {label:'STAGE 2',color:'#0A6B52',val:s.stage2},
      {label:'STAGE 1',color:'#C94A00',val:s.stage1},
    ];
    document.getElementById('chartTotal').textContent=total.toLocaleString()+' TOTAL CASES';
    
    // Bottom-to-top layout
    document.getElementById('stageBars').innerHTML=BARS.map(b=>{
      const pct=Math.round((parseInt(b.val)||0)/total*100);
      return `<div class="bar-col">
        <span class="bar-count-vert" style="color:${b.color}">${parseInt(b.val)||0}</span>
        <div class="bar-track-vert">
          <div class="bar-fill-vert" style="height:${pct}%;background:${b.color}"></div>
        </div>
        <span class="bar-label-vert">${b.label}</span>
      </div>`;
    }).join('');

    // KPI Sub-stage pending grid
    document.getElementById('kpiGrid').innerHTML = `
      <div class="kpi-box"><span>Examination</span><strong>${s.examination_pending||0}</strong></div>
      <div class="kpi-box"><span>Assigned</span><strong>${s.assigned_pending||0}</strong></div>
      <div class="kpi-box"><span>Published</span><strong>${s.published_pending||0}</strong></div>
      <div class="kpi-box"><span>Demand Note</span><strong>${s.demand_note_pending||0}</strong></div>
      <div class="kpi-box" style="border-color:#C94A00;background:rgba(201,74,0,0.05)">
        <span style="color:#C94A00">Opposition</span>
        <strong style="color:#C94A00">${s.opposition_count||0}</strong>
      </div>
    `;

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
    renderCasesTable();
    renderRecordsTable();
  }catch(err){
    chip.className='status-chip error';
    st.textContent='Error: '+err.message;
  }
}

// ─── Sidebar Filtering ────────────────────────────────────────────────────────
function sidebarFilter(stage){
  currentSidebarStage = stage;
  document.querySelectorAll('.sidebar-btn').forEach(b=>b.classList.remove('active'));
  
  let map={'all':'sbAll','1':'sbS1','2':'sbS2','3':'sbS3','4':'sbS4'};
  const btn=document.getElementById(map[stage]);
  if(btn) btn.classList.add('active');
  
  const titleMap = {'all':'📂 ALL CASES','1':'STAGE 1 CASES','2':'STAGE 2 CASES','3':'STAGE 3 CASES','4':'STAGE 4 CASES'};
  document.getElementById('casesTitle').textContent = titleMap[stage];
  
  switchTab('cases');
  renderCasesTable();
}

// ─── Tab 2: Cases Table ───────────────────────────────────────────────────────
function getFilteredCases(){
  let rows = [...allRecords];
  if(currentSidebarStage !== 'all'){
    const stg = parseInt(currentSidebarStage);
    rows = rows.filter(r => getStageNum(r.stage||'') === stg);
  }
  const cityFilter = document.getElementById('casesCityFilter')?.value;
  if(cityFilter) rows = rows.filter(r => r.city === cityFilter);
  
  rows.sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0));
  return rows;
}

function renderCasesTable(){
  const rows = getFilteredCases();
  document.getElementById('casesCount').textContent = rows.length + ' records';
  
  const tbody=document.getElementById('casesTbody');
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:30px;color:#888;font-family:'DM Mono',monospace;font-size:11px">NO CASES FOUND</td></tr>`;
    return;
  }
  
  // Show max 100 on one page per spec
  const pageRows = rows.slice(0, 100); 

  tbody.innerHTML=pageRows.map(r=>{
    const sn=getStageNum(r.stage||'');
    const sc=stageBadgeColor(sn);
    const subColor = SUB_STAGE_COLORS[r.sub_stage] || '#888';
    
    // APPLICATION NAME (fallback applicant_name)
    const appName = r.application_name || r.applicant_name || '—';
    const cLabel = r.class ? `CL ${r.class}` : '';

    return `<tr>
      <td class="td-date">${r.filing_date||'—'}</td>
      <td><div class="stage-badge-num" style="background:${sc};border-color:${sc}">${stageBadgeText(sn)}</div></td>
      <td class="td-case">${r.folder_name||'—'}</td>
      <td class="td-name">${appName}</td>
      <td class="td-tm">™ ${r.tm_no||'—'} <span style="font-size:9px;color:#888">${cLabel}</span></td>
      <td><span class="city-badge">${r.city||'—'}</span></td>
      <td><span style="font-family:'DM Mono',monospace;font-size:9px;color:${subColor};border:1.5px solid ${subColor};border-radius:3px;padding:1px 5px">${r.sub_stage||'—'}</span></td>
      <td class="td-name" style="font-size:10px">${r.consultant_name||'—'}</td>
      <td class="td-name" style="font-size:10px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.notes||'—'}</td>
      <td>
        <button class="action-edit" onclick="openEditModal(${r.id})">✎ EDIT</button>
      </td>
    </tr>`;
  }).join('');
}


// ─── Search card (Short Display) ──────────────────────────────────────────────
function renderCard(rec){
  const sn=getStageNum(rec.stage||'');
  const sc=stageBadgeColor(sn);
  const subColor = SUB_STAGE_COLORS[rec.sub_stage] || '#888';
  const imgSrc=getImageSrc(rec.img);
  const appName = rec.application_name || rec.applicant_name || 'Untitled Mark';
  const initials=avatarInitials(appName);
  const avColor=avatarColor(appName);
  const id='card_'+rec.id;
  const stageLabel=cleanStageText(rec.stage||'');

  const kvRows=[
    ['SR. NO',rec.sr_no],['FOLDER',rec.folder_name],['TM NO',rec.tm_no],
    ['PREFIX',rec.prefix],['CLIENT NO',rec.client_no],['CASE NO',rec.case_no],
    ['DATE',rec.filing_date],['CLASS',rec.class],['CLASS DESC',rec.class_desc],
    ['APP TYPE',rec.application_type || rec.applicant_type],['APP NAME',rec.application_name],['APPLICANT',rec.applicant_name],
    ["FATHER'S NAME",rec.applicant_so],['CNIC',rec.applicant_cnic],['CITY',rec.city],
    ['STAMP ISSUE',formatLongDate(rec.stamp_issue_date||rec.issue_date)],['STAMP EXPIRY',formatLongDate(rec.stamp_expiry_date||rec.expiry_date)],
    ['TRADE NAME',rec.tm_trade],['APP ADDRESS',rec.applicant_address],['YEAR',rec.year],
    ['CON. NAME',rec.consultant_name],['CON. ADDRESS',rec.consultant_address],
    ['JOURNAL',rec.journal_date],['IMG',rec.img],['WORD MARK',rec.mark_text],['NOTES',rec.notes],
  ].map(([k,v])=>`<div class="kv-row"><span class="kv-key">${k}</span><span class="kv-val">${v||'—'}</span></div>`).join('');

  // Short Search Display order per PDF:
  // IMAGE -> APP NAME -> CLASS (number only) -> STAGE -> SUB STAGE -> CITY -> ALL FIELD -> EDIT -> CASE HISTORY

  return `
  <div class="result-card" id="${id}">
    <div class="card-main" style="align-items:center">
      ${imgSrc
        ?`<img src="${imgSrc}" alt="" style="width:48px;height:48px;object-fit:contain;border:2px solid #0C0C0C;border-radius:4px;background:#f0e8d0">`
        :`<div class="avatar" style="width:48px;height:48px;font-size:14px;background:${avColor}"><span>${initials}</span></div>`
      }
      <div class="card-info" style="flex:1">
        <div class="card-name">${appName}</div>
        <div class="card-tm-row">
          <span class="card-class" style="border-color:#555;color:#555">${rec.class||'N/A'}</span>
          <span class="card-stage-text" style="color:${sc};font-weight:600">${stageLabel.toUpperCase()}</span>
          ${rec.sub_stage?`<span style="font-family:'DM Mono',monospace;font-size:9px;color:${subColor};border:1.5px solid ${subColor};border-radius:3px;padding:1px 5px">${rec.sub_stage.toUpperCase()}</span>`:''}
          ${rec.city?`<span class="city-badge">${rec.city}</span>`:''}
        </div>
      </div>
    </div>
    <div class="card-actions" style="margin-top:10px;padding-top:10px;border-top:1px solid #eee">
      <button class="expand-btn" onclick="toggleKV('kv_${id}',this)">&#9660; ALL FIELDS</button>
      <button class="edit-btn"   onclick="openEditModal(${rec.id})">&#9998; EDIT</button>
      <button class="expand-btn" onclick="toggleHistory('hist_${id}',${rec.id},this)">&#128203; CASE HISTORY</button>
    </div>
    <div id="kv_${id}" class="kv-table" style="display:none;margin-top:8px">${kvRows}</div>
    <div id="hist_${id}" style="display:none;margin-top:8px"></div>
  </div>`;
}

function toggleKV(kvId,btn){
  const el=document.getElementById(kvId);
  const hidden=el.style.display==='none';
  el.style.display=hidden?'block':'none';
  btn.textContent=hidden?'▲ HIDE FIELDS':'▼ ALL FIELDS';
}

function toggleHistory(histId,trademarkId,btn){
  const el=document.getElementById(histId);
  if(!el) return;
  const hidden=el.style.display==='none';
  el.style.display=hidden?'block':'none';
  btn.textContent=hidden?'▲ CASE HISTORY':'▼ CASE HISTORY';
  if(hidden && !el.dataset.loaded){
    el.dataset.loaded='1';
    renderTrademarkLogs(trademarkId,histId);
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────
function doSearch(){
  const q=(document.getElementById('searchInput').value||'').trim().toLowerCase();
  lastSearchQuery=q;
  const el=document.getElementById('searchResults');
  const countEl=document.getElementById('searchCount');
  if(!q){
    el.innerHTML=`<div class="no-results"><div class="no-results-title">START SEARCHING</div><p class="no-results-hint">Enter TM Number, app name, CNIC or Folder No.</p></div>`;
    if(countEl) countEl.textContent='';
    return;
  }
  const matches=allRecords.filter(r=>
    (r.tm_no||'').toLowerCase().includes(q)||
    (r.applicant_name||'').toLowerCase().includes(q)||
    (r.application_name||'').toLowerCase().includes(q)||
    (r.folder_name||'').toLowerCase().includes(q)||
    (r.applicant_cnic||'').toLowerCase().includes(q)||
    (r.consultant_name||'').toLowerCase().includes(q)
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
  if(activeFilters.sub_stage) rows=rows.filter(r=>(r.sub_stage||'')==activeFilters.sub_stage);
  if(activeFilters.applicant_type)   rows=rows.filter(r=>(r.applicant_type||'')==activeFilters.applicant_type);
  if(activeFilters.city)       rows=rows.filter(r=>(r.city||'')==activeFilters.city);
  if(activeFilters.year)       rows=rows.filter(r=>(r.year||'')==activeFilters.year);
  rows.sort((a,b)=>{
    if(sortKey==='application_name') return (a.application_name||a.applicant_name||'').localeCompare(b.application_name||b.applicant_name||'');
    if(sortKey==='stage')      return getStageNum(b.stage||'')-getStageNum(a.stage||'');
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
    tbody.innerHTML=`<tr><td colspan="13" style="text-align:center;padding:30px;color:#888;font-family:'DM Mono',monospace;font-size:11px">NO RECORDS</td></tr>`;
    updateBulkBar(); return;
  }
  
  // ALL RECORD SHEET display fields per PDF:
  // SELECT CASE (checkbox), IMAGE (thumbnail), DATE, FOLDER, TM NO, CLASS, STAGE, SUB-STAGE, CITY, ASSIGN TO, NOTES

  tbody.innerHTML=pageRows.map(r=>{
    const sn=getStageNum(r.stage||'');
    const sc=stageBadgeColor(sn);
    const subColor2=SUB_STAGE_COLORS[r.sub_stage]||'#888';
    const isSel=selectedIds.has(r.id);
    const imgSrc=getImageSrc(r.img,'40');
    const imgCell=imgSrc
      ?`<img src="${imgSrc}" alt="" style="width:25px;height:25px;object-fit:contain;border:1.5px solid #0C0C0C;border-radius:3px;background:#f5edd8;vertical-align:middle">`
      :`<div style="width:25px;height:25px;background:#ede0c4;border:1.5px solid #ccc;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#aaa;font-family:'DM Mono',monospace">&#8482;</div>`;
    
    const appName = r.application_name || r.applicant_name || '—';

    return `<tr class="${isSel?'tr-selected':''}" style="cursor:pointer" onclick="if(event.target.tagName!=='INPUT'&&event.target.tagName!=='BUTTON') openEditModal(${r.id})">
      <td onclick="event.stopPropagation()"><input type="checkbox" class="row-check" data-id="${r.id}" ${isSel?'checked':''}></td>
      <td>${imgCell}</td>
      <td class="td-date">${r.filing_date||'&#8212;'}</td>
      <td class="td-case">${r.folder_name||'&#8212;'}</td>
      <td class="td-tm">&#8482; ${r.tm_no||'&#8212;'}</td>
      <td class="td-name">${appName}</td>
      <td><span class="td-cls">${r.class||'&#8212;'}</span></td>
      <td><div class="stage-badge-num" style="background:${sc};border-color:${sc}">${stageBadgeText(sn)}</div></td>
      <td><span style="font-family:'DM Mono',monospace;font-size:9px;color:${subColor2};border:1.5px solid ${subColor2};border-radius:3px;padding:1px 5px">${r.sub_stage||'&#8212;'}</span></td>
      <td><span class="city-badge">${r.city||'—'}</span></td>
      <td class="td-name" style="font-size:10px">${r.assigned_person||'&#8212;'}</td>
      <td class="td-name" style="font-size:10px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.notes||'').replace(/"/g, '&quot;')}">${r.notes||'&#8212;'}</td>
      <td onclick="event.stopPropagation()"><div class="action-cell">
        <button class="action-edit" onclick="openEditModal(${r.id})">✎</button>
        <button class="action-del"  onclick="deleteRec(${r.id},'${(appName).replace(/'/g,"\\'")}',false)">✕</button>
      </div></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.row-check').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const id=String(cb.dataset.id);
      cb.checked?selectedIds.add(id):selectedIds.delete(id);
      updateBulkBar();
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
      if(j.success){allRecords=allRecords.filter(x=>String(x.id)!==String(id));selectedIds.delete(id);deleted++;}
    }catch{}
  }
  await loadStats();
  renderCasesTable();
  renderRecordsTable();
  showToast(`Deleted ${deleted} of ${ids.length} records.`);
}
function bulkClear(){selectedIds.clear();renderRecordsTable();}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteRec(id,name,fromSearch=false){
  if(!confirm(`Delete "${name}" (ID ${id})?\n\nThis will permanently remove it.`)) return;
  try{
    const r=await fetch(`${API}/trademarks/${id}`,{method:'DELETE'});
    const j=await r.json();
    if(!j.success) throw new Error(j.error);
    allRecords=allRecords.filter(x=>String(x.id)!==String(id));
    selectedIds.delete(String(id));
    await loadStats();
    renderCasesTable();
    renderRecordsTable();
    if(fromSearch) doSearch(); 
    showToast('Record deleted.');
  }catch(e){alert('Delete failed: '+e.message);}
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV(){
  const rows=getFilteredRows();
  const cols=['id','prefix','client_no','case_no','folder_name','sr_no','tm_no','application_name','applicant_name','class','class_desc','stage','sub_stage',
              'application_type','applicant_so','applicant_cnic','city','stamp_issue_date','stamp_expiry_date','tm_trade',
              'applicant_address','year','consultant_name','consultant_address','journal_date','filing_date','img','notes','status'];
  const esc=v=>'"'+(v||'').toString().replace(/"/g,'""')+'"';
  const csv=[cols.join(','),...rows.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='brandex_trademarks_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

// ─── Image upload ─────────────────────────────────────────────────────────────
async function handleImageUpload(file, inputId='editImg'){
  if(!file) return;
  const fd=new FormData();
  fd.append('image',file);
  try{
    const res=await fetch(`${API}/upload`,{method:'POST',body:fd});
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    const imgEl=document.getElementById(inputId);
    if(imgEl) {
      imgEl.value=j.path;
      if(inputId==='editImg') updateImgPreview(j.path);
    }
  }catch(e){alert('Upload failed: '+e.message);}
}

function triggerStageUpload(id) {
  document.getElementById(id).click();
}
function handleStageUpload(input, textId) {
  if(input.files && input.files[0]) {
    handleImageUpload(input.files[0], textId);
  }
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
        <button class="btn-outline" onclick="window.location.href='${API}/assignments/export-csv'">↓ EXPORT ASSIGNMENTS (CSV)</button>
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
          ${['KARACHI','LAHORE','ISLAMABAD','PESHAWAR'].map(c=>`<option${assignmentFilter.city===c?' selected':''}>${c}</option>`).join('')}
        </select>
        ${(assignmentFilter.agent||assignmentFilter.status||assignmentFilter.city)?`<button class="btn-outline" style="padding:5px 10px;font-size:9px" onclick="clearAssignFilters()">✕ CLEAR</button>`:''}
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:#888;margin-left:auto">${filtered.length} record${filtered.length!==1?'s':''}</span>
      </div>

      <!-- Assignments table -->
      <div class="table-wrap" style="margin-bottom:24px">
        <table class="records-table">
          <thead><tr>
            <th>FOLDER</th><th>TM NO</th><th>APP NAME</th><th>CLASS</th><th>STAGE</th>
            <th>AGENT</th><th>CITY</th><th>STATUS</th><th>DATE</th><th>ACTIONS</th>
          </tr></thead>
          <tbody>
            ${!filtered.length?`<tr><td colspan="10" style="text-align:center;padding:30px;color:#888;font-family:'DM Mono',monospace;font-size:11px">NO ASSIGNMENTS${(assignmentFilter.agent||assignmentFilter.status||assignmentFilter.city)?' — clear filters to see all':' YET'}</td></tr>`:''}
            ${filtered.map(a=>{
              const sn=getStageNum(a.stage||'');
              const sc=stageBadgeColor(sn);
              const stc=STATUS_COLORS[a.status]||'#888';
              const dt=a.assigned_at?new Date(a.assigned_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
              const safe_tm   =(a.tm_no||'').replace(/'/g,"\\'");
              const safe_name =(a.applicant_name||'').replace(/'/g,"\\'");
              return `<tr>
                <td class="td-case">${a.folder_name||'—'}</td>
                <td class="td-tm">™ ${a.tm_no||'—'}</td>
                <td class="td-name">${a.applicant_name||'—'}</td>
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
                  <button class="action-edit" title="Reassign" onclick="openAssignModal('${a.trademark_id}','${safe_tm}','${safe_name}','${a.id}','${a.agent_name}','${a.agent_city}','${a.status}')">⟳</button>
                  <button class="action-del" onclick="removeAssignment('${a.id}','${safe_name}')">✕</button>
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
            <thead><tr><th>FOLDER</th><th>TM NO</th><th>APP NAME</th><th>CITY</th><th>STAGE</th><th>ACTION</th></tr></thead>
            <tbody>
              ${unassigned.slice(0,50).map(r=>{
                const sn=getStageNum(r.stage||'');
                const safe_tm   =(r.tm_no||'').replace(/'/g,"\\'");
                const safe_name =(r.app_name||'').replace(/'/g,"\\'");
                return `<tr>
                  <td class="td-case">${r.folder_name||'—'}</td>
                  <td class="td-tm">™ ${r.tm_no||'—'}</td>
                  <td class="td-name">${r.app_name||'—'}</td>
                  <td><span class="city-badge">${r.city||'—'}</span></td>
                  <td><div class="stage-badge-num" style="background:${stageBadgeColor(sn)}">${stageBadgeText(sn)}</div></td>
                  <td><button class="btn-assign" onclick="openAssignModal('${r.id}','${safe_tm}','${safe_name}')">⊕ ASSIGN</button></td>
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
    showToast('Assignment saved.');
  }catch(e){alert('Save failed: '+e.message);}
  finally{btn.textContent='ASSIGN';btn.disabled=false;}
}

async function completeAssignment(id){
  try{
    const res=await fetch(`${API}/assignments/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'Complete'})});
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    renderAssignmentTab();
    showToast('Assignment marked Complete.');
  }catch(e){alert('Failed: '+e.message);}
}

async function removeAssignment(id,appName){
  if(!confirm(`Remove assignment for "${appName}"?\n\nThe record will stay in the database, just unassigned.`)) return;
  try{
    const res=await fetch(`${API}/assignments/${id}`,{method:'DELETE'});
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    renderAssignmentTab();
    showToast('Assignment removed.');
  }catch(e){alert('Failed: '+e.message);}
}

// ─── Edit / Add modal ─────────────────────────────────────────────────────────
function populateClassSelect(){
  const sel=document.getElementById('editClass');
  if(!sel) return;
  sel.innerHTML='<option value="">— Select class —</option>';
  CLASS_MAP.forEach(([num,desc])=>{
    const n=String(num).padStart(2,'0');
    const opt=document.createElement('option');
    opt.value=n;
    opt.textContent=n; // Display ONLY number per spec
    opt.title=desc;
    sel.appendChild(opt);
  });
}

function onClassChange(){
  const cv = document.getElementById('editClass').value;
  const cDesc = document.getElementById('editClassDesc');
  if(!cv || !cDesc) return;
  const match = CLASS_MAP.find(c => String(c[0]).padStart(2,'0') === cv);
  if(match) cDesc.value = match[1];
  else cDesc.value = '';
}

function populateConsultantSelect(){
  const sel=document.getElementById('editConName');
  if(!sel) return;
  sel.innerHTML='<option value="">— Select Consultant —</option>';
  CONSULTANTS.forEach(c=>{
    const opt=document.createElement('option');
    opt.value=c.name;
    opt.textContent=c.name;
    sel.appendChild(opt);
  });
}

function onConsultantChange(){
  const sel = document.getElementById('editConName');
  const addr = document.getElementById('editConAdd');
  if(!sel || !addr) return;
  const match = CONSULTANTS.find(c => c.name === sel.value);
  if(match) addr.value = match.address;
}

const SUB_STAGES = {
  'STAGE 1': ['APPLICATION FILED','ACKNOWLEGMENT','EXAMINATION'],
  'STAGE 2': ['ASSIGNED','ACCEPTED','HEARING'],
  'STAGE 3': ['PUBLISHED','OPPOSITION','DEMAND-NOTE RECEIVED','TM-11 (D-NOTE) PAID'],
  'STAGE 4': ['CERTIFICATE RECEIVED','CERTIFICATE DISPATCH','HEARING/OPPO'],
  'STOPPED': ['ABANDONED','HOLD','REFUSED'],
  'COPYRIGHT': ['COPYRIGHT FILED','COPYRIGHT ACKNOWLEDGEMENT','COPYRIGHT CERTIFICATE RECEIVED'],
};

function onStageChange(preserveSubStage){
  const stageEl = document.getElementById('editStage');
  const subEl   = document.getElementById('editSubStage');
  const stage   = stageEl ? stageEl.value : '';

  // Populate sub-stage dropdown
  if(subEl) {
    const saved = preserveSubStage || '';
    const subs  = SUB_STAGES[stage] || [];
    subEl.innerHTML = `<option value="">— Select —</option>`
      + subs.map(s => `<option value="${s}"${s===saved?' selected':''}>${s}</option>`).join('');
    if(!subs.length) {
      subEl.innerHTML = `<option value="">— N/A for this stage —</option>`;
    }
  }

  // Journal section (Stage 3 + PUBLISHED)
  const sub         = subEl ? subEl.value : '';
  const journalSec  = document.getElementById('journalSection');
  const assignSec   = document.getElementById('assignSection');
  const assignCitySec = document.getElementById('assignCitySection');

  if(journalSec) {
    journalSec.style.display = (stage === 'STAGE 3' && sub === 'PUBLISHED') ? 'block' : 'none';
  }
  if(assignSec && assignCitySec) {
    const isStage2 = stage === 'STAGE 2';
    assignSec.style.display = isStage2 ? 'block' : 'none';
    assignCitySec.style.display = isStage2 ? 'block' : 'none';
  }
}

function openEditModal(id){
  isNewRecord=false;
  const rec=allRecords.find(r=>String(r.id)===String(id));
  if(!rec) return;
  editingRecord=rec;
  document.getElementById('modalTitle').textContent='EDIT RECORD';
  document.getElementById('modalCase').textContent=rec.folder_name||'';
  fillModalForm(rec);
  document.getElementById('editModal').classList.add('open');
}

function openAddModal(){
  isNewRecord=true;editingRecord=null;
  document.getElementById('modalTitle').textContent='ADD NEW RECORD';
  document.getElementById('modalCase').textContent='';
  fillModalForm({});
  document.getElementById('editSrNo').value=genSrNo(); // Hidden auto-gen
  const dt = new Date().toISOString().slice(0,10);
  document.getElementById('editDateL').value = dt;
  document.getElementById('editAppDate').value = dt;
  document.getElementById('editModal').classList.add('open');
}

function fillModalForm(rec){
  const f=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val||'';};
  f('editStage',rec.stage);
  onStageChange(rec.sub_stage); // populate sub-stage options then set value
  f('editStatusRun', rec.status_run || ''); // Mail merge process field
  f('editPrefix',rec.prefix);f('editClientNo',rec.client_no);f('editCaseNo',rec.case_no);
  f('editSrNo',rec.sr_no);f('editTmNo',rec.tm_no);
  f('editFolder',rec.folder_name);
  
  // Dates
  if(rec.filing_date) document.getElementById('editDateL').value = new Date(rec.filing_date).toISOString().slice(0,10);
  else document.getElementById('editDateL').value = '';
  
  if(rec.application_date) document.getElementById('editAppDate').value = new Date(rec.application_date).toISOString().slice(0,10);
  else document.getElementById('editAppDate').value = '';
  
  f('editClass',rec.class);f('editClassDesc',rec.class_desc);
  f('editAppType',rec.application_type || rec.applicant_type);
  f('editAppName',rec.application_name || rec.applicant_name); // application_name overrides
  f('editApplicantName',rec.applicant_name); 
  f('editAppSo',rec.applicant_so);f('editAppCnic',rec.applicant_cnic);
  f('editCity',rec.city);
  
  f('editStampIssue',isoToDatetimeLocal(rec.stamp_issue_date||rec.issue_date));
  f('editStampExpiry',isoToDatetimeLocal(rec.stamp_expiry_date||rec.expiry_date));
  
  f('editAppTrade',rec.tm_trade);f('editAppAdd',rec.applicant_address);
  f('editYear',rec.year);f('editConName',rec.consultant_name);
  f('editConAdd',rec.consultant_address);
  f('editJournalDate',rec.journal_date);
  
  f('editAssignPerson',rec.assigned_person);
  f('editAssignCity',rec.assigned_city);
  
  f('editImg',rec.img);f('editMarkText',rec.mark_text);f('editNoImg',rec.notes);
  f('editStatus',rec.status);
  
  updateImgPreview(rec.img);
  const iu=document.getElementById('imgUpload');if(iu)iu.value='';
  
  // Clear stage uploads for UI
  ['stage1ImgId','stage2ImgId','stage3ImgId','stage4ImgId'].forEach(id=>f(id,''));
  
  onStageChange();
}

function closeEditModal(){
  document.getElementById('editModal').classList.remove('open');
  editingRecord=null;
}

const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};

async function saveEdit(){
  // Auto-build folder before save if missing
  buildFolder();
  
  const data={
    sub_stage:gv('editSubStage'),stage:gv('editStage'),
    status_run:gv('editStatusRun'),
    prefix:gv('editPrefix'),client_no:gv('editClientNo'),case_no:gv('editCaseNo'),
    folder_name:gv('editFolder'),sr_no:gv('editSrNo'),tm_no:gv('editTmNo'),
    filing_date:gv('editDateL'), application_date:gv('editAppDate'),
    class:gv('editClass'),class_desc:gv('editClassDesc'),
    application_type:gv('editAppType'),
    application_name:gv('editAppName'), applicant_name:gv('editApplicantName'),
    applicant_so:gv('editAppSo'),applicant_cnic:gv('editAppCnic'),city:gv('editCity'),
    stamp_issue_date:gv('editStampIssue'),stamp_expiry_date:gv('editStampExpiry'),
    tm_trade:gv('editAppTrade'),applicant_address:gv('editAppAdd'),
    year:gv('editYear'),consultant_name:gv('editConName'),
    consultant_address:gv('editConAdd'),
    journal_date:gv('editJournalDate'),
    assigned_person:gv('editAssignPerson'), assigned_city:gv('editAssignCity'),
    img:gv('editImg'),mark_text:gv('editMarkText'),notes:gv('editNoImg'),
    status:gv('editStatus')
  };
  
  if(!data.applicant_name){alert('Applicant Name is required ⭐');return;}
  if(!data.application_name){alert('Application Name is required ⭐');return;}
  
  const btn=document.getElementById('modalSave');
  btn.textContent='SAVING…';btn.disabled=true;
  try{
    let j;
    if(isNewRecord){
      const res=await fetch(`${API}/trademarks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      j=await res.json();
      if(!j.success) throw new Error(j.error);
      showToast('Record created successfully');
      await loadData();
    }else{
      const res=await fetch(`${API}/trademarks/${editingRecord.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      j=await res.json();
      if(!j.success) throw new Error(j.error);
      Object.assign(editingRecord,data);
      renderCasesTable();
      renderRecordsTable();
      await loadStats();
      showToast('Record updated');
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

// ─── Print Functionality ──────────────────────────────────────────────────────
function printRecord() {
  if(!editingRecord) return;
  const pa = document.getElementById('printArea');
  
  const sn=getStageNum(editingRecord.stage||'');
  const sc=stageBadgeColor(sn);
  const imgSrc=getImageSrc(editingRecord.img, '200');
  const appName = editingRecord.application_name || editingRecord.applicant_name;
  
  // Format long dates
  const stampIssue = formatLongDate(editingRecord.stamp_issue_date || editingRecord.issue_date);
  const stampExpiry = formatLongDate(editingRecord.stamp_expiry_date || editingRecord.expiry_date);

  pa.innerHTML = `
    <div class="print-header">
      <div style="font-size:24px;font-weight:bold;margin-bottom:4px">BRANDEX LAW</div>
      <div style="font-size:14px;color:#555">TRADEMARK OFFICIAL RECORD</div>
    </div>
    
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #000">
      <div>
        <div style="font-size:20px;font-weight:bold;margin-bottom:8px">${appName}</div>
        <div><strong>Folder No:</strong> ${editingRecord.folder_name||'—'}</div>
        <div><strong>TM No:</strong> ${editingRecord.tm_no||'—'}</div>
        <div><strong>Class:</strong> ${editingRecord.class||'—'}</div>
      </div>
      <div>
        ${imgSrc ? `<img src="${imgSrc}" style="width:100px;height:100px;object-fit:contain;border:1px solid #ccc;border-radius:4px" />` 
                 : `<div style="width:100px;height:100px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;background:#f5f5f0;font-size:10px">NO IMAGE</div>`}
      </div>
    </div>

    <table class="print-table">
      <tr><td class="lbl">Stage</td><td>${editingRecord.stage||'—'} <span style="font-size:11px;color:#666">(${editingRecord.sub_stage||''})</span></td></tr>
      <tr><td class="lbl">Application Type</td><td>${editingRecord.application_type || editingRecord.applicant_type || '—'}</td></tr>
      <tr><td class="lbl">Filing Date</td><td>${editingRecord.filing_date||'—'}</td></tr>
      <tr><td class="lbl">Applicant Name</td><td>${editingRecord.applicant_name||'—'}</td></tr>
      <tr><td class="lbl">Applicant S/O</td><td>${editingRecord.applicant_so||'—'}</td></tr>
      <tr><td class="lbl">CNIC/NTN</td><td>${editingRecord.applicant_cnic||'—'}</td></tr>
      <tr><td class="lbl">City</td><td>${editingRecord.city||'—'}</td></tr>
      <tr><td class="lbl">Address</td><td>${editingRecord.applicant_address||'—'}</td></tr>
      <tr><td class="lbl">Trade / Brand</td><td>${editingRecord.tm_trade||'—'}</td></tr>
      <tr><td class="lbl">Class Description</td><td>${editingRecord.class_desc||'—'}</td></tr>
      <tr><td class="lbl">Stamp Issue</td><td>${stampIssue||'—'}</td></tr>
      <tr><td class="lbl">Stamp Expiry</td><td>${stampExpiry||'—'}</td></tr>
      <tr><td class="lbl">Consultant</td><td>${editingRecord.consultant_name||'—'}</td></tr>
      ${editingRecord.journal_date ? `<tr><td class="lbl">Journal Date</td><td>${editingRecord.journal_date}</td></tr>` : ''}
      <tr><td class="lbl">Word Mark Text</td><td>${editingRecord.mark_text||'—'}</td></tr>
      <tr><td class="lbl">Notes</td><td>${editingRecord.notes||'—'}</td></tr>
    </table>
    
    <div style="margin-top:40px;text-align:center;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:10px">
      Generated by BrandEx CMS • Serial No: ${editingRecord.sr_no||'—'} • Date: ${new Date().toLocaleString()}
    </div>
  `;
  window.print();
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(id){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+id));
  if(id==='cases')      renderCasesTable();
  if(id==='records')    renderRecordsTable();
  if(id==='assignment') renderAssignmentTab();
  if(id==='logs')       renderLogsTab();
}

// ─── Logs tab ─────────────────────────────────────────────────────────────────
const ACTION_COLORS = { CREATE:'#0D9970', UPDATE:'#2563EB', DELETE:'#DC2626', SYNC:'#8B2FC9' };

function formatLogDate(dt){
  if(!dt) return '—';
  const d=new Date(dt);
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+' '
        +d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}

async function renderLogsTab(){
  const el=document.getElementById('logsContent');
  const countEl=document.getElementById('logsCount');
  if(!el) return;
  const actionFilter=document.getElementById('logsFilterAction')?.value||'';
  el.innerHTML=`<div style="padding:30px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:#888">Loading logs…</div>`;
  try{
    const url=`${API}/logs?limit=500${actionFilter?'&action='+actionFilter:''}`;
    const res=await fetch(url);
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    const logs=j.data;
    if(countEl) countEl.textContent=logs.length.toLocaleString()+' entries';
    if(!logs.length){
      el.innerHTML=`<div class="no-results"><div class="no-results-title">NO LOGS YET</div><p class="no-results-hint">Activity will appear here as records are modified.</p></div>`;
      return;
    }
    el.innerHTML=`
      <div class="table-wrap">
        <table class="records-table">
          <thead><tr>
            <th>DATE &amp; TIME</th>
            <th>ACTION</th>
            <th>TRADEMARK</th>
            <th>TM NO</th>
            <th>NOTE</th>
          </tr></thead>
          <tbody>
            ${logs.map(l=>{
              const ac=ACTION_COLORS[l.action]||'#888';
              const tm=l.application_name||l.applicant_name||(l.new_values?.applicant_name)||'—';
              const tmNo=l.tm_no||(l.new_values?.tm_no)||'—';
              return `<tr>
                <td class="td-date" style="white-space:nowrap">${formatLogDate(l.changed_at)}</td>
                <td><span style="font-family:'DM Mono',monospace;font-size:9px;color:${ac};border:1.5px solid ${ac};border-radius:3px;padding:2px 7px;font-weight:600">${l.action}</span></td>
                <td class="td-name">${tm}</td>
                <td class="td-tm" style="font-size:10px">${tmNo}</td>
                <td style="font-family:'DM Mono',monospace;font-size:9px;color:#555;max-width:300px">${l.note||'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }catch(e){
    el.innerHTML=`<div class="no-results"><div class="no-results-title">ERROR</div><p class="no-results-hint">${e.message}</p></div>`;
  }
}

// ─── Trademark log history ────────────────────────────────────────────────────
async function renderTrademarkLogs(trademarkId, containerId){
  const el=document.getElementById(containerId);
  if(!el) return;
  el.innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:9px;color:#888;padding:6px 0">Loading history…</div>`;
  try{
    const res=await fetch(`${API}/audit-logs/${trademarkId}`);
    const j=await res.json();
    if(!j.success) throw new Error(j.error);
    const logs=j.data;
    if(!logs.length){
      el.innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:9px;color:#bbb;padding:6px 0">No history recorded yet.</div>`;
      return;
    }
    el.innerHTML=logs.map(l=>{
      const ac=ACTION_COLORS[l.action]||'#888';
      return `<div style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;border-bottom:1px solid #f0e8d0">
        <span style="font-family:'DM Mono',monospace;font-size:8px;color:${ac};border:1px solid ${ac};border-radius:2px;padding:1px 5px;white-space:nowrap;flex-shrink:0">${l.action}</span>
        <span style="font-family:'DM Mono',monospace;font-size:8px;color:#888;white-space:nowrap;flex-shrink:0">${formatLogDate(l.changed_at)}</span>
        <span style="font-family:'Space Grotesk',sans-serif;font-size:10px;color:#555;flex:1">${l.note||'—'}</span>
      </div>`;
    }).join('');
  }catch(e){
    el.innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:9px;color:#C94A00">Error: ${e.message}</div>`;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  populateClassSelect();
  populateConsultantSelect();

  document.getElementById('tabNav').addEventListener('click',e=>{
    const btn=e.target.closest('.tab-btn');
    if(btn) switchTab(btn.dataset.tab);
  });

  document.getElementById('searchBtn').addEventListener('click',doSearch);
  document.getElementById('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
  document.getElementById('refreshBtn').addEventListener('click',loadData);
  document.getElementById('syncBtn').addEventListener('click',triggerSync);
  document.getElementById('printRecordBtn').addEventListener('click',printRecord);

  ['addNewBtn','addNewBtn2','addNewBtn3','addNewBtn4'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('click',openAddModal);
  });

  document.getElementById('filterInput').addEventListener('input',()=>{currentPage=1;renderRecordsTable();});

  // Filter dropdowns
  ['filterStage','filterStatus','filterType','filterCity','filterYear'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change',()=>{
      activeFilters.stage      = document.getElementById('filterStage')?.value??'';
      activeFilters.sub_stage = document.getElementById('filterStatus')?.value??'';
      activeFilters.applicant_type   = document.getElementById('filterType')?.value??'';
      activeFilters.city       = document.getElementById('filterCity')?.value??'';
      activeFilters.year       = document.getElementById('filterYear')?.value??'';
      currentPage=1;renderRecordsTable();
    });
  });
  
  // Tab 2 City filter
  document.getElementById('casesCityFilter')?.addEventListener('change',()=>{
    renderCasesTable();
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
    rows.slice(s,en).forEach(r=>e.target.checked?selectedIds.add(String(r.id)):selectedIds.delete(String(r.id)));
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

  const stampIssueEl=document.getElementById('editStampIssue');
  if(stampIssueEl) stampIssueEl.addEventListener('change',()=>{
    const exp=document.getElementById('editStampExpiry');
    if(exp && stampIssueEl.value) {
      exp.value = isoToDatetimeLocal(autoExpiry(stampIssueEl.value));
    }
  });

  const imgEl=document.getElementById('editImg');
  if(imgEl) imgEl.addEventListener('input',()=>updateImgPreview(imgEl.value.trim()));

  const imgUpload=document.getElementById('imgUpload');
  if(imgUpload) imgUpload.addEventListener('change',e=>{
    const file=e.target.files?.[0];
    if(file) handleImageUpload(file, 'editImg');
  });

  window.triggerStageUpload = function(id) {
    const el = document.getElementById(id);
    if(el) el.click();
  };

  window.handleStageUpload = function(inputEl, targetInputId) {
    const file = inputEl.files?.[0];
    if(file) handleImageUpload(file, targetInputId);
  };

  window.handleImageUpload = function(file, targetInputId) {
    if(!file.type.startsWith('image/')) {
      alert('Only images are supported for direct base64 upload.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // Resize if too large to fit in Google Sheets (50k char limit ~ 37KB)
        const MAX_WIDTH = 300;
        if (width > MAX_WIDTH) {
          height = Math.floor(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG format with 0.5 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        
        if (dataUrl.length > 49000) {
          alert('Image is still too large after compression. Please upload a smaller image.');
        } else {
          const targetEl = document.getElementById(targetInputId);
          if (targetEl) {
            targetEl.value = dataUrl;
            if(targetInputId === 'editImg') updateImgPreview(dataUrl);
          }
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Folder auto-build listeners
  ['editPrefix','editClientNo','editCaseNo'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', buildFolder);
  });

  // Logs tab
  document.getElementById('logsRefreshBtn')?.addEventListener('click', renderLogsTab);

  loadData();
});
