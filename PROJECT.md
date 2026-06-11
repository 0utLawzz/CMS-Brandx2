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

## Queued / Upcoming Tasks

| # | Task | Priority |
|---|------|----------|
| 1 | Fix stage badges showing `?` (emojis in stage field from old data) | 🔴 Bug |
| 2 | Fix modal HTML still says "MySQL database" (line 139 index.html) | 🔴 Bug |
| 3 | Fix delete from search results not refreshing the search view | 🔴 Bug |
| 4 | CSV / Excel file upload import | 🟡 Feature |
| 5 | "Sync from Google Sheets" one-click button | 🟡 Feature |
| 6 | Export all/filtered records to CSV | 🟡 Feature |
| 7 | Filter dropdowns (Stage, Status, App Type, Year) in All Records tab | 🟡 Feature |
| 8 | Expiry date alerts (7-day / 30-day warning highlights) | 🟡 Feature |
| 9 | Journal tab — real IPO data or class breakdown analytics | 🟢 Future |
| 10 | Resume mobile app (Expo) when web portal is stable | 🟢 Future |

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
