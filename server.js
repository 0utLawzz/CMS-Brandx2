const path    = require('path');
const express = require('express');
const apiApp  = require('./api/index');

const PORT = 5000; // WebView always on 5000

// ─── Serve frontend static files ─────────────────────────────────────────────
apiApp.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
}));

// Fallback: serve index.html for any non-API path
apiApp.get(/.*/, (req, res) => {
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ success: false, error: 'Not found' });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
apiApp.listen(PORT, '0.0.0.0', () => {
  console.log(`BrandEx running on http://0.0.0.0:${PORT}`);
});
