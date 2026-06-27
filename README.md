# BrandEx Law — Trademark Portal

A web-based trademark management system for BrandEx Law (Pakistan).
Features Neo-brutalism UI, Google Sheets as database, and a Node.js REST API.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Google Cloud Service Account (for Sheets API)
- Git

### Installation Method

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd CMS-Brandx2

# 2. Install dependencies for the web server
npm install

# 3. Install dependencies for the API server
cd api
npm install
cd ..

# 4. Configure Environment Variables
# Create an `.env` file in the `api` folder and add your credentials:
# 
# SHEET_ID=your-google-sheet-id
# GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email@...
# GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# PORT=3000

# 5. Start the Application
# This project uses a unified server that serves both the frontend and the API on port 5000.
npm start
# OR manually:
node server.js
```

Open `http://localhost:5000` in your web browser.

---

## Troubleshooting

- **Error: `Cannot find module 'dotenvx'` or similar missing modules**
  - **Solution:** Make sure you ran `npm install` inside both the root folder AND the `api` folder. We have updated the project to use `dotenv` instead of `dotenvx` to avoid package resolution issues.
  - Run `cd api && npm install` to make sure all backend dependencies are installed.

- **Port in use error**
  - **Solution:** Ensure no other process is using port 5000 or 3000. You can change the port in `server.js` or `.env`.

- **Missing Google Sheets credentials**
  - **Solution:** Ensure your `api/.env` file contains valid Google API credentials. For local testing without `.env`, you can provide a `brandex-*.json` service account key file (this should be ignored in git).

- **UI not loading data**
  - **Solution:** Open browser developer tools (F12) -> Network tab to check if API calls to `/api/trademarks` are failing. Check the Node.js console for API connection issues.

---

## Project Structure

```
CMS-Brandx2/
├── index.html              ← Main web portal UI (5 tabs)
├── styles.css              ← Neo-brutalism theme (cream/orange/teal/black)
├── app.js                  ← All frontend JS (search, table, modal, CRUD, export)
├── server.js               ← Unified server serving both static files and API (port 5000)
├── logo.png                ← Brand logo
├── package.json            ← Root dependencies
├── README.md               ← This documentation
│
├── api/
│   ├── index.js            ← Express REST API (used by server.js)
│   ├── sheets.js           ← Google Sheets API client
│   ├── package.json        ← API deps: express, googleapis, cors, dotenv, multer
│
├── uploads/                ← Uploaded trademark images (auto-created)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS · Neo-brutalism design |
| Web server | Express.js (Node.js) |
| API | Express.js 5 |
| Database | Google Sheets API |
| File upload | Multer |
