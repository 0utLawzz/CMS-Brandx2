# BrandEx Law — Trademark Portal

A web-based trademark management system for BrandEx Law (Pakistan).
Neo-brutalism UI · PostgreSQL database · REST API · Google Sheets sync

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL Database (Neon)

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
# Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# API Server
PORT=3000
```

---

## Project Structure

```
CMS-Brandx2/
│
├── index.html              ← Main web portal UI (5 tabs)
├── styles.css              ← Neo-brutalism theme (cream/orange/teal/black)
├── app.js                  ← All frontend JS (search, table, modal, CRUD, export)
├── server.js               ← Static file server + /api/* reverse proxy (port 5000)
├── logo.png                ← Brand logo
├── package.json            ← Root dependencies
├── README.md               ← This file
│
├── api/
│   ├── index.js            ← Express REST API (port 3000)
│   ├── db.js               ← PostgreSQL pool + auto-migrations
│   ├── reset-db.js         ← Script to reset the database to 0
│   ├── .env                ← Local credentials (gitignored)
│   ├── package.json        ← API deps: express, pg, cors, dotenv, multer
│
├── uploads/                ← Uploaded trademark images (auto-created)
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
| D | tm_no | VARCHAR(30) | Trademark number (UNIQUE) |
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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS · Neo-brutalism design |
| Web server | Node.js built-in `http` module |
| API | Express.js 5 |
| Database | PostgreSQL (Neon) |
| File upload | Multer |
