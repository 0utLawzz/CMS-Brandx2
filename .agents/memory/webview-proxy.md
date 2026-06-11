---
name: WebView → PostgreSQL proxy
description: How the WebView (port 5000) connects to the API (port 3000) which uses Replit PostgreSQL.
---

server.js runs a static file server on port 5000 and proxies all /api/* requests to localhost:3000 (the Express API in api/index.js). No CORS issues since both share the same origin from the browser's perspective.

The API uses Replit's built-in PostgreSQL via DATABASE_URL environment variable (auto-set by Replit). The `pg` package handles the connection pool in api/db.js. Schema auto-creates on startup via runMigrations().

**Why:** Hostinger MySQL is unreachable from Replit (port 3306 firewalled). Switched to Replit PostgreSQL. The api/ folder has its own package.json and node_modules — always run `npm install` inside api/ separately from the root.

**How to apply:** Any new API endpoint added to api/index.js is automatically available at /api/* in the WebView. The "Start API (MySQL)" workflow name is legacy; it actually runs PostgreSQL now.
