---
name: Hostinger MySQL blocked
description: Hostinger shared hosting blocks port 3306 from external cloud IPs despite Remote MySQL whitelist.
---

Hostinger shared hosting (srv1928.hstgr.io) firewalls TCP port 3306 from external connections. The "Remote MySQL" whitelist in hPanel only controls MySQL-level access control — the server firewall still blocks the TCP connection entirely, causing ETIMEDOUT errors. Adding IPs or `%` to the whitelist does not fix this.

**Why:** Hostinger shared hosting restricts remote DB access at the OS/firewall level, not just MySQL. Replit runs on Google Cloud IPs (34.x.x.x range) which are blocked.

**How to apply:** Do not attempt to connect to Hostinger MySQL from Replit dev environment. Use Replit's built-in PostgreSQL (DATABASE_URL env var) for development. The API in api/index.js and api/db.js now uses `pg` (node-postgres) with PostgreSQL syntax ($1/$2 placeholders, ILIKE, RETURNING, ON CONFLICT DO NOTHING).
