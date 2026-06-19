# BrandEx Law — Trademark Portal · Project Log

> Internal activity log for the BrandEx Law Trademark Portal project.
> Tracks all setup, fixes, imports, and improvements session by session.

---

## Project Overview

A web-based trademark management system for BrandEx Law (Pakistan).
- **Web Portal** — Neo-brutalism UI served at port 5000 (`server.js`)
- **REST API** — Express.js backend at port 3000 (`api/index.js`)
- **Database** — Replit PostgreSQL (auto-provisioned, always accessible)
- **Mobile App** — Expo React Native in `/mobile` (currently paused)

---

## Activity Log

---

### Session 1 — Initial Setup & Google Sheets Integration
**Stack established:**
- Web portal (`index.html`, `styles.css`, `app.js`) with Neo-brutalism theme
- Static file server (`server.js`) on port 5000
- Mobile Expo app in `/mobile` with tab navigation
- Data source: Google Sheets published CSV

**Fonts:** Bebas Neue (headings) · Space Grotesk (body) · DM Mono (labels)
**Colors:** Black `#0C0C0C` · Orange `#C94A00` · Cream `#F5EDD8` · Teal `#0A6B52`

---

### Session 2 — Database Schema V2 (21 Columns)
**Upgraded** trademarks table from 11 → 21 columns (A–U):

| Col | Field | Type |
|-----|-------|------|
| A | status_run | ENUM Run/Processing/Done |
| B | stage | VARCHAR(30) |
| C | sr_no | VARCHAR(60) |
| D | tm_no | VARCHAR(30) |
| E | folder_name | VARCHAR(255) |
| F | date_l | VARCHAR(60) |
| G | class | VARCHAR(10) |
| H | class_desc | TEXT |
| I | app_type | ENUM SOLE/PARTNER/COMPANY |
| J | app_name | VARCHAR(255) |
| K | app_so | VARCHAR(255) |
| L | app_cnic | VARCHAR(20) |
| M | issue_date | VARCHAR(60) |
| N | expiry_date | VARCHAR(60) |
| O | app_trade | VARCHAR(255) |
| P | app_add | TEXT |
| Q | year | VARCHAR(4) |
| R | con_name | VARCHAR(255) |
| S | con_add | TEXT |
| T | img | VARCHAR(255) — Google Drive file ID |
| U | no_img | VARCHAR(255) — fallback text |

---

### Session 3 — MySQL → PostgreSQL Migration
**Problem:** Hostinger shared hosting firewalls port 3306 from external cloud IPs.
- Added Replit IP `34.100.162.117` to Hostinger Remote MySQL whitelist → still blocked
- TCP port 3306 to `srv1928.hstgr.io` / `82.197.82.175` — `ETIMEDOUT` from Replit

**Solution:** Switched to Replit's built-in PostgreSQL (`DATABASE_URL`)
- Installed `pg` driver in `api/`, removed `mysql2`
- Rewrote `api/db.js` — uses `pg.Pool`, connects via `DATABASE_URL`
- Rewrote `api/index.js` — PostgreSQL syntax (`$1/$2` placeholders, `ILIKE`, `RETURNING`, `ON CONFLICT DO NOTHING`)
- Schema auto-creates on API startup via `runMigrations()`
- API health check: `GET /api/health` → `{"database":"connected"}`

---

### Session 4 — Mobile App Paused, WebView Set as Primary
**Change:** Removed `Start Expo (Android)` from auto-start workflow
- Expo workflow still exists in config but no longer runs on project start
- WebView (`Start application` on port 5000) is now the only visible interface
- API (`Start API (MySQL)` — legacy name) runs silently on port 3000

**Workflows active:**
| Workflow | Command | Port | Output |
|----------|---------|------|--------|
| Start application | `node server.js` | 5000 | WebView |
| Start API (MySQL) | `cd api && node index.js` | 3000 | Console |

---

### Session 5 — Google Sheets Data Import (1,728 Records)
**Source:** Published Google Sheets CSV
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzP.../pub?gid=229416165&single=true&output=csv
```

**Script:** `scripts/import-from-sheets.js`
- Fetches CSV (follows redirects)
- Row 0 = frozen header row → **always skipped**
- Data starts at row 1
- Maps old sheet columns → V2 schema:

| Sheet Column | → DB Field | Notes |
|---|---|---|
| DATE | date_l | |
| CASE NO | sr_no | "Not Found" → null |
| APP NAME | app_name | |
| TM NO | tm_no | |
| CLASS | class | |
| STATUS | stage | Emojis stripped (e.g. `STAGE 3️⃣` → `STAGE 3`) |
| APPLICATION SUB STATUS | class_desc | |
| Notes | no_img | |
| City | app_add | |
| Duplicate, TM-11, formula2 | — | Ignored |

- `status_run` inferred from stage: Stage 3/4 → Processing, STOPPED/DONE → Done, else → Run
- `year` extracted from date string via regex

**Result:** 1,728 records imported · 0 skipped

**Stats after import:**

| Metric | Count |
|--------|-------|
| Total | 1,728 |
| Run | 823 |
| Processing | 824 |
| Done | 81 |
| Stage 1 | 229 |
| Stage 2 | 348 |
| Stage 3 | 562 |
| Stage 4 | 262 |
| Stopped | 81 |
| Copyright | 22 |

---

---

### Session 6 — Major UI Rebuild (Bugs + Features)

**Bugs fixed:**
- Stage badges no longer show `?` — full sub-status → stage number mapping in `getStageNum()` including all IPO sub-statuses (APPLICATION FILED, ACKNOWLEDGMENT, ASSIGNED, PUBLISHED, OPPO:*, DEMAND NOTE, CERTIFICATE*, etc.)
- Stage badge now displays clean number **1/2/3/4** (not "S1", "S2") — color coded
- Modal notice no longer says "MySQL database" — fixed to "📡 Changes save directly to database."
- Delete from Search tab now re-runs the search so the deleted card disappears immediately
- Select All + Bulk Delete now functional with confirmation dialog

**New features:**
- **4 renamed tabs**: Dashboard · Search TM · All Records · Assignment
- **Dashboard tab**: stage distribution chart + 8 stats tiles + status chip + Refresh/Sync/Add buttons
- **Search TM tab**: search moved here (result count displayed, delete refreshes results)
- **All Records tab**:
  - Filter dropdowns: Stage / Status / App Type / Year
  - Sort: Newest / Name / Stage / Status
  - Pagination: 50 / 100 / 500 / ALL per page (default 100, most recent first)
  - 25×25 trademark image thumbnail column in table
  - Bulk select (per-page) + bulk delete with confirmation
  - Export to CSV (respects active filters)
- **Assignment tab**: stage hierarchy with live sub-status counts, agent grid (UZMA/FASIAL/RASHID/SULMAN × KARACHI/LAHORE/ISLAMABAD), assigned record table; full DB tracking queued
- **Image upload**: file input in Edit/Add modal — uploads to `/uploads/` via multer, path auto-fills `img` field; falls back to Drive ID thumbnail
- **Sync from Google Sheets**: `POST /api/sync-sheets` endpoint re-imports CSV, button in Dashboard
- **README.md**: full install/run docs, schema table, API endpoints, tab descriptions

**Backend changes:**
- `api/index.js`: added `/api/upload` (multer), `/api/sync-sheets` (fetch → parse → upsert), `/api/import` (bulk)
- `uploads/` directory created at workspace root; served as static files

---

### Session 7 — Neon DB · Logs System · Sheets Write-back · Cleanup

**Database:**
- Switched to **Neon PostgreSQL** (cloud) — `api/.env` updated with new `DATABASE_URL`
- Fixed `api/db.js` dotenv path to use `__dirname` so it loads correctly from any CWD
- New `logs` table auto-created on startup: `id, trademark_id, action, old_values (JSONB), new_values (JSONB), note, created_at`
- Indexes added: `idx_logs_trademark_id`, `idx_logs_created_at`

**API (`api/index.js`):**
- `writeLog(trademark_id, action, old, new, note)` — inserts into `logs` after every change
- `pushToSheet(data, action)` — best-effort POST to Apps Script; never blocks the API response
- `GET /api/logs` — all logs newest-first, `?action=` filter + `?trademark_id=` filter
- `GET /api/logs/:trademark_id` — history for one specific record
- UPDATE endpoint now fetches old record first and records changed field names in the note

**Frontend (`app.js` + `index.html`):**
- **📋 LOGS tab** (5th tab) — table: Date/Time · Action badge (color-coded) · Trademark · TM No · Note
- Action filter dropdown on Logs tab + Refresh button
- **Case History panel** inside every Search result card — collapsible, lazy-loaded on first expand
- `toggleHistory()` caches result so API is only called once per card
- **DATE column** added to All Records table
- App Type options: `SOLE PROPRIETOR`, `PARTNERSHIP`, `COMPANY`, `INDIVIDUAL`
- CNIC label → `CNIC / NTN / PASSPORT` (maxlength 20)

**Apps Script (`scripts/apps-script-doPost.js`):**
- Full replacement `doPost()` + `doGet()` + `_findRow()` + `_jsonResp()`
- 22-column `CMS_COL` map: A=status_run … V=created_at
- Upsert: searches by `sr_no` (col C) first, fallback `tm_no` (col D); updates or appends
- Soft-delete: highlights row light-red, writes `[DELETED IN CMS]` in col U
- All existing functions (TM-11, Folder Search, Duplicate Check) remain unchanged

**Cleanup:**
- Deleted: `zipFile.zip`, `temp-code.js`, `code.js`, `replit.nix`, `.replit`, `replit.md`
- `.gitignore` updated: excludes `uploads/`, `*.zip`, `api/.env`, all `node_modules/`

**Verified:** `✅ PostgreSQL connected successfully` · `✅ Schema migrations complete`

---

## Queued / Upcoming Tasks

| # | Task | Priority |
|---|------|----------|
| 1 | ~~Fix stage badges showing `?`~~ | ✅ Done S6 |
| 2 | ~~Fix modal "MySQL" text~~ | ✅ Done S6 |
| 3 | ~~Delete refreshes search results~~ | ✅ Done S6 |
| 4 | ~~Bulk select + bulk delete~~ | ✅ Done S6 |
| 5 | ~~Sync from Google Sheets button~~ | ✅ Done S6 |
| 6 | ~~Export to CSV~~ | ✅ Done S6 |
| 7 | ~~Filter dropdowns (Stage/Status/Type/Year)~~ | ✅ Done S6 |
| 8 | ~~Pagination (50/100/500/ALL, newest first)~~ | ✅ Done S6 |
| 9 | ~~Image upload + 25x25 thumbnail in table~~ | ✅ Done S6 |
| 10 | ~~4-tab rename (Dashboard/Search TM/All Records/Assignment)~~ | ✅ Done S6 |
| 11 | ~~Assignment tab UI (hierarchy + agents)~~ | ✅ Done S6 |
| 12 | ~~README.md~~ | ✅ Done S6 |
| 13 | ~~Neon PostgreSQL migration (replaced Replit DB)~~ | ✅ Done S7 |
| 14 | ~~Logs table + Logs tab (all changes)~~ | ✅ Done S7 |
| 15 | ~~In-record case history panel~~ | ✅ Done S7 |
| 16 | ~~Sheets write-back via Apps Script (POST on CREATE/UPDATE)~~ | ✅ Done S7 |
| 17 | ~~App Type values fixed to SOLE PROPRIETOR/PARTNERSHIP/COMPANY/INDIVIDUAL~~ | ✅ Done S7 |
| 18 | ~~DATE column added to All Records table~~ | ✅ Done S7 |
| 19 | Full Assignment tracking (DB: assign to agent, timestamps, completion) | 🔴 Next Phase |
| 20 | CSV/Excel file upload import UI | 🟡 Feature |
| 21 | Expiry date alerts (7/30-day colour highlights) | 🟡 Feature |
| 22 | Google Drive image upload via Apps Script | 🟡 Feature |
| 23 | Journal tab — IPO analytics / class breakdown | 🟢 Future |
| 24 | Resume mobile app (Expo) | 🟢 Future |

---

### Session 8 — Database Disconnection & Full Sheets Integration
**Issue:** User encountered PostgreSQL warnings and `package.json` missing errors locally, because the local branch was behind the remote repository which had already removed the PostgreSQL dependencies.
**Changes Pulled from Remote:**
- **PostgreSQL Removed:** Deleted `api/db.js`, `api/schema.sql`, and `api/schema_v2.sql`. The system now completely relies on Google Sheets via `api/sheets.js`.
- **API Server Updates:** `api/index.js` completely rewritten to fetch, insert, update, and soft-delete records directly against Google Sheets using `google-auth-library` and `googleapis`.
- **Audit Logs:** Audit logs are now written to a separate sheet `Logs!A:G` instead of a PostgreSQL table.
- **Node Environment Fixes:** Added `api/package.json` and `api/package-lock.json` so `npm` inside `api/` works properly.

**Result:** The application now runs fully on Google Sheets and no longer connects to PostgreSQL. Local repository is synced with remote.


---

## Known Constraints

- **Hostinger MySQL** — Port 3306 is firewalled from Replit cloud IPs. Cannot be used from this environment. Use PostgreSQL instead.
- **Replit IP** — Outgoing IP (`34.100.162.117`) may change between sessions. Not suitable for IP-whitelisted external DBs.
- **Google Apps Script URL** — Returns health ping only (`{"status":"ok",...}`). Actual data comes from the published CSV URL, not the Apps Script endpoint.

---

## File Structure

```
/
├── index.html              ← Main web portal UI
├── styles.css              ← Neo-brutalism theme
├── app.js                  ← Frontend JS (search, table, modal, CRUD)
├── server.js               ← Static file server + /api/* proxy (port 5000)
├── package.json            ← Root dependencies
├── PROJECT.md              ← This file
├── replit.md               ← Project overview + user preferences
│
├── api/
│   ├── index.js            ← Express REST API (port 3000)
│   ├── db.js               ← PostgreSQL pool + migrations
│   ├── .env                ← Local DB credentials (gitignored)
│   ├── package.json        ← API-specific dependencies (pg, express, cors, dotenv)
│   ├── schema.sql          ← Original schema reference
│   └── schema_v2.sql       ← V2 schema reference
│
├── scripts/
│   └── import-from-sheets.js ← One-time Google Sheets → DB importer
│
└── mobile/                 ← Expo React Native app (PAUSED)
    ├── App.tsx
    ├── screens/
    ├── components/
    └── hooks/useSheet.ts
```
