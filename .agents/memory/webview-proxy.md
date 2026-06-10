---
name: WebView API Proxy via server.js
description: The WebView (port 5000) proxies /api/* calls to the MySQL API on localhost:3000 so both share one domain and there are no CORS issues.
---

# WebView → MySQL Proxy

server.js checks if req.url starts with /api/ and forwards the full request (method, headers, body) to localhost:3000.

**Why:** The browser preview only exposes port 5000. Without proxying, /api/ calls would be 404. This also avoids CORS issues.

**How to apply:** Any new API endpoint added to api/index.js is automatically available at /api/* in the WebView without extra configuration.
