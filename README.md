# BrandEx Law — Trademark Portal

A web-based trademark management system for BrandEx Law (Pakistan).
Neo-brutalism UI · PostgreSQL database · REST API · Google Sheets sync

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Replit account (or any environment with Node.js)
- MySQL Database (either a local instance or a remote database like Hostinger's)

### Installation

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd CMS-Brandx2

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
CMS-Brandx2/
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
│   ├── migrate-from-sheets.js ← One-time Google Sheets CSV importer
│   ├── .env                ← Local credentials (gitignored)
│   ├── .env.example        ← Template for credentials
│   ├── package.json        ← API deps: express, pg, cors, dotenv, multer
│   ├── schema.sql          ← V1 schema reference
│   └── schema_v2.sql       ← V2 schema reference (21 columns)
│
├── uploads/                ← Uploaded trademark images (auto-created)
│
└── mobile/                 ← Expo React Native app (PAUSED)
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

## Data Import & Syncing

### From Google Sheets (automated)
```bash
cd api
node migrate-from-sheets.js
```
Or click **⟳ SYNC SHEETS** in the Dashboard tab (if available).

### Sheet Structure Requirements

Because the migration script reads column names dynamically, **the exact column index (order) does not matter**. You can add new columns anywhere. However, the script looks for specific **Header Names** (row 1) to map standard fields into the database.

Here are the recommended column headers and how they are detected:

| Sheet Header Name | Mapped Database Field | Description |
|-------------------|-----------------------|-------------|
| **Date** | `date` | The date of the trademark filing |
| **Case No** or **Sr No** | `case_no` / `sr_no` | The primary serial / case number (Required) |
| **App Name** or **Name** | `name` / `app_name` | The name of the applicant (Required) |
| **TM No** or **Number** | `tm_number` / `tm_no`| The Trademark number |
| **Class** | `class` | The trademark class (e.g., 35) |
| **Status** | `status` | The main status |
| **Sub Status** or **Application \nSub Status** | `sub_status` | The sub-status or stage |
| **Duplicate** | `is_duplicate` | TRUE / FALSE |
| **TM-11** | `tm11` | Status of TM-11 filing |
| **Notes** | `notes` | Any multi-line notes |
| **City** | `city` | The city of the applicant |

*(Note: If you add new columns that aren't on this list, they will be safely ignored unless you update the mapping logic in `api/migrate-from-sheets.js`.)*

### Manual CSV/Excel upload
Use the **+ ADD NEW** button for single records, or the bulk import API for batch inserts.

---

## Deploying to Hostinger

1. Upload your code via FTP or Git to your Hostinger Web Hosting.
2. In Hostinger **hPanel**, go to **Advanced** → **Node.js**.
3. Create a new Node.js App.
4. Set the Start Command to `node server.js` or `node index.js` (depending on how you structure your live backend).
5. Add your `.env` variables directly in the Hostinger Node.js interface.
6. For the Database, use Hostinger's **MySQL Databases** panel to create a user and database, and import your `api/schema.sql` via phpMyAdmin.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS · Neo-brutalism design |
| Fonts | Bebas Neue · Space Grotesk · DM Mono |
| Colors | Black `#0C0C0C` · Orange `#C94A00` · Cream `#F5EDD8` · Teal `#0A6B52` |
| Web server | Node.js built-in `http` module |
| API | Express.js 5 |
| Database | PostgreSQL (Replit built-in) or MySQL (Hostinger) |
| File upload | Multer |
| Mobile | Expo React Native (**paused**) |
