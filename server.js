'use strict';
const path    = require('path');
const fs      = require('fs');

// Load .env from api/.env (local dev only — Vercel injects vars automatically)
const envPath = path.join(__dirname, 'api', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const express = require('express');
const apiApp  = require('./api/index');

const PORT = process.env.PORT || 3000;

// ─── Serve frontend static files ─────────────────────────────────────────────
apiApp.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
}));

// Fallback: serve index.html for any non-API, non-uploads path
apiApp.get(/.*/, (req, res) => {
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ success: false, error: 'Not found' });
  }
});

// ─── Single listen — only server.js owns the port ────────────────────────────
apiApp.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ BrandEx running on http://localhost:${PORT}`);
});
