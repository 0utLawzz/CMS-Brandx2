# BrandEx API — Setup Guide

This is the Node.js + MySQL backend API for BrandEx Law Trademark Portal.
It replaces Google Sheets with your secure Hostinger MySQL database.

---

## Step 1 — Set Up the Database on Hostinger

1. Open **Hostinger hPanel** → **Websites** → **MySQL Databases**
2. Open **phpMyAdmin** for `u472671597_test2`
3. Click the **SQL** tab at the top
4. Copy the entire contents of `api/schema.sql` and paste it there
5. Click **Go** — this creates the `trademarks` table

---

## Step 2 — Configure Your Credentials

1. Copy `api/.env.example` to `api/.env`
2. Fill in your Hostinger MySQL details:

```
DB_HOST=your-mysql-hostname (check Hostinger panel, looks like: mysql.hostinger.com or an IP)
DB_PORT=3306
DB_NAME=u472671597_test2
DB_USER=u472671597_antig
DB_PASS=your-actual-password
PORT=3000
```

---

## Step 3 — Migrate Your Google Sheets Data

Once credentials are set, run this **one time**:

```
cd api
npm install
node migrate-from-sheets.js
```

This pulls all records from Google Sheets and inserts them into MySQL.
It is safe to run multiple times — duplicates are skipped.

---

## Step 4 — Run the API

```
cd api
node index.js
```

The API runs on `http://localhost:3000`.

---

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/api/health` | Check if API + DB are working |
| GET | `/api/trademarks` | Get all records (supports `?search=`, `?status=`, `?city=`) |
| GET | `/api/trademarks/:caseNo` | Get one record by case number |
| GET | `/api/stats` | Get dashboard statistics |
| POST | `/api/trademarks` | Add a new trademark record |
| PATCH | `/api/trademarks/:caseNo` | Edit a record |
| DELETE | `/api/trademarks/:caseNo` | Delete a record |
| POST | `/api/import` | Bulk import records |

---

## Deploying to Hostinger

1. Upload the `api/` folder to your Hostinger Node.js hosting
2. Set environment variables in Hostinger's **Node.js** panel
3. Set the **start command** to: `node index.js`
4. Your API will be live at your Hostinger domain (e.g. `https://yourdomain.com/api/`)
