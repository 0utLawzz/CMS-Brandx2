# BrandEx Law — Trademark Portal

A web-based trademark management system for BrandEx Law (Pakistan).
Neo-brutalism UI · PostgreSQL database · REST API · Google Sheets sync

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Replit account (or any environment with Node.js)

### Installation

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd brandex-portal

# 2. Install root dependencies (web server)
npm install

# 3. Install API dependencies
cd api
npm install
cd ..

# 4. Set environment variables (see below)

# 5. Start the API server (port 3000)
cd api && node index.js

# 6. In another terminal, start the web server (port 5000)
node server.js
```

Open `http://localhost:5000` in your browser.

---

## Environment Variables

Create `api/.env` with the following:

```env
# Database (Replit PostgreSQL — auto-set on Replit)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# OR individual vars (Hostinger / custom MySQL — note: Hostinger shared blocks port 3306 externally)
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASS=your-db-password

# API port
PORT=3000
```

> On Replit, `DATABASE_URL` is set automatically when you add the PostgreSQL integration.

---

## Project Structure

```
brandex-portal/
│
├── index.html              ← Main web portal UI (4 tabs)
├── styles.css              ← Neo-brutalism theme (cream/orange/teal/black)
├── app.js                  ← All frontend JS (search, table, modal, CRUD, export)
├── server.js               ← Static file server + /api/* reverse proxy (port 5000)
├── logo.png                ← Brand logo
├── package.json            ← Root dependencies
├── PROJECT.md              ← Activity log (internal)
├── README.md               ← This file
│
├── api/
│   ├── index.js            ← Express REST API (port 3000)
│   ├── db.js               ← PostgreSQL pool + auto-migrations
│   ├── .env                ← Local credentials (gitignored)
│   ├── .env.example        ← Template for credentials
│   ├── package.json        ← API deps: express, pg, cors, dotenv, multer
│   ├── schema.sql          ← V1 schema reference
│   └── schema_v2.sql       ← V2 schema reference (21 columns)
│
├── scripts/
│   └── import-from-sheets.js ← One-time Google Sheets CSV importer
│
├── uploads/                ← Uploaded trademark images (auto-created)
│
└── mobile/                 ← Expo React Native app (PAUSED)
    ├── App.tsx
    ├── screens/
    ├── components/
    └── hooks/useSheet.ts
```

---

## Database Schema

Table: `trademarks`

| # | Column | Type | Description |
|---|--------|------|-------------|
| — | id | SERIAL PK | Auto-increment ID |
| A | status_run | VARCHAR(20) | Run / Processing / Done |
| B | stage | VARCHAR(30) | Current stage/sub-status |
| C | sr_no | VARCHAR(60) | Serial number (e.g. PB-RWP-…) |
| D | tm_no | VARCHAR(30) | Trademark number |
| E | folder_name | VARCHAR(255) | Google Drive folder name |
| F | date_l | VARCHAR(60) | Filing date (long format) |
| G | class | VARCHAR(10) | Trademark class (01–45) |
| H | class_desc | TEXT | Class/goods description |
| I | app_type | VARCHAR(20) | SOLE / PARTNER / COMPANY |
| J | app_name | VARCHAR(255) | Applicant full name (**required**) |
| K | app_so | VARCHAR(255) | Father's name (S/O) |
| L | app_cnic | VARCHAR(20) | CNIC (XXXXX-XXXXXXX-X) |
| M | issue_date | VARCHAR(60) | Issue date |
| N | expiry_date | VARCHAR(60) | Expiry date (auto: issue + 7 days) |
| O | app_trade | VARCHAR(255) | Business/trade name |
| P | app_add | TEXT | Applicant address |
| Q | year | VARCHAR(4) | Year of application |
| R | con_name | VARCHAR(255) | Consultant name |
| S | con_add | TEXT | Consultant address |
| T | img | VARCHAR(255) | Image path (/uploads/…) or Drive ID |
| U | no_img | VARCHAR(255) | Fallback text if no image |
| — | created_at | TIMESTAMP | Auto-set on insert |

Schema is **auto-created** on API startup via `runMigrations()` in `api/db.js`.

---

## Stage / Sub-Status Hierarchy

| Stage | Sub-Statuses |
|-------|-------------|
| STAGE 1 | APPLICATION FILED · ACKNOWLEDGMENT · EXAMINATION |
| STAGE 2 | ASSIGNED · ACCEPTED · HEARING |
| STAGE 3 | PUBLISHED · OPPO: WITHDRAWN · OPPO: FILED · OPPO: RECEIVED · DEMAND NOTE RECEIVED · DEMAND NOTE PAID |
| STAGE 4 | CERTIFICATE RECEIVED · CERTIFICATE DISPATCH · HEARING · COMPLETE |
| STOPPED | ABANDONED · NOTE · HOLD · REFUSED |
| COPYRIGHT | FILED · IN NEWSPAPERS · ACKNOWLEDGEMENT · EXAMINATION · CERTIFICATE RECEIVED · CERTIFICATE DISPATCHED |

---

## API Endpoints

All endpoints are proxied through the web server at `/api/*` → `localhost:3000/api/*`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Database connection status |
| GET | /api/trademarks | List all trademarks (query: search, stage, status_run, app_type, year, class, limit, offset) |
| GET | /api/trademarks/:id | Get one trademark by ID |
| GET | /api/trademarks/tm/:tmNo | Get one trademark by TM number |
| GET | /api/stats | Stage/status counts for dashboard |
| POST | /api/trademarks | Create new trademark |
| PATCH | /api/trademarks/:id | Update trademark fields |
| DELETE | /api/trademarks/:id | Delete trademark |
| POST | /api/upload | Upload trademark image (multipart/form-data, field: `image`) |
| POST | /api/import | Bulk import (body: `{ records: [...] }`) |
| POST | /api/sync-sheets | Pull latest data from Google Sheets |

---

## Web Portal Tabs

### 1. Dashboard
- Stage distribution bar chart
- Stats tiles: Total, Run, Processing, Done, Stage 1–4
- Refresh + Sync Sheets + Add New buttons

### 2. Search TM
- Full-text search across TM number, app name, CNIC, SR no, trade name, consultant
- Returns rich cards with all details, expand/collapse
- Edit and delete from search results

### 3. All Records
- Paginated table (50 / 100 / 500 / ALL per page)
- Filter dropdowns: Stage, Status, App Type, Year
- Free-text filter on any field
- Sort: Newest / Name / Stage / Status
- Bulk select + bulk delete
- Export to CSV (filtered records)
- 25×25 image thumbnail per row

### 4. Assignment
- Overview of assigned cases
- Stage → Sub-status hierarchy with record counts
- Agent list (UZMA, FASIAL, RASHID, SULMAN × KARACHI, LAHORE, ISLAMABAD)
- Full DB-backed assignment tracking: **queued for next phase**

---

## Data Import

### From Google Sheets (automated)
```bash
node scripts/import-from-sheets.js
```
Or click **⟳ SYNC SHEETS** in the Dashboard tab.

**Sheet column mapping:**

| Sheet Column | → DB Field |
|---|---|
| DATE | date_l |
| CASE NO | sr_no |
| APP NAME | app_name |
| TM NO | tm_no |
| CLASS | class |
| STATUS | stage (emojis stripped) |
| APPLICATION SUB STATUS | class_desc |
| Notes | no_img |
| City | app_add |

Row 1 (frozen header) is always skipped automatically.

### Manual CSV/Excel upload
Use the **+ ADD NEW** button for single records, or the bulk import API for batch inserts.

---

## Image Upload

Trademark mark images can be:
1. **Uploaded directly** via the file input in Add/Edit modal (saved to `/uploads/`)
2. **Linked via Google Drive ID** (paste the Drive file ID)

Uploaded images are stored at `uploads/` in the project root and served at `/uploads/filename.jpg`.

---

## Workflows (Replit)

| Workflow | Command | Port | Type |
|----------|---------|------|------|
| Start application | `node server.js` | 5000 | WebView (primary) |
| Start API (MySQL) | `cd api && node index.js` | 3000 | Console (background) |
| Start Expo (Android) | `cd mobile && npx expo start --tunnel` | 8081 | Console (**paused**) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS · Neo-brutalism design |
| Fonts | Bebas Neue · Space Grotesk · DM Mono |
| Colors | Black `#0C0C0C` · Orange `#C94A00` · Cream `#F5EDD8` · Teal `#0A6B52` |
| Web server | Node.js built-in `http` module |
| API | Express.js 5 |
| Database | PostgreSQL (Replit built-in) |
| File upload | Multer |
| Mobile | Expo React Native (**paused**) |

---

## Known Constraints

- **Hostinger MySQL** — Port 3306 is firewalled from Replit cloud IPs (Google Cloud range). Use Replit PostgreSQL for development.
- **Replit outgoing IP** — Changes between sessions (`34.100.162.117` at last check). Not suitable for IP-whitelisted DBs.
- **Google Apps Script URL** — Returns health ping only. Actual data comes from the published CSV URL.

---

## Queued Features

| # | Feature | Priority |
|---|---------|----------|
| 1 | Full Assignment tracking (DB-backed, agent assignment with timestamps) | 🔴 High |
| 2 | CSV/Excel file upload import UI | 🟡 Medium |
| 3 | Expiry date alerts (7/30-day highlights) | 🟡 Medium |
| 4 | Journal tab — IPO data or class breakdown analytics | 🟢 Future |
| 5 | Resume mobile app (Expo) | 🟢 Future |
