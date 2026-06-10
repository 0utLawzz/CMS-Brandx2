const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 5000;
const HOST     = '0.0.0.0';
const API_PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function proxyToAPI(req, res) {
  const options = {
    hostname: 'localhost',
    port: API_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: 'localhost' },
  };

  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    if (body.length) options.headers['content-length'] = body.length;

    const proxy = http.request(options, (apiRes) => {
      res.writeHead(apiRes.statusCode, {
        ...apiRes.headers,
        'access-control-allow-origin': '*',
      });
      apiRes.pipe(res);
    });
    proxy.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'API unavailable: ' + err.message }));
    });
    if (body.length) proxy.write(body);
    proxy.end();
  });
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.url.startsWith('/api/')) {
    return proxyToAPI(req, res);
  }

  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}).listen(PORT, HOST, () => {
  console.log(`BrandEx WebView running at http://${HOST}:${PORT}`);
});
