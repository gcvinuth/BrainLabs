/**
 * Zero-dependency static server for Brain Lab.
 * Run: node server.js   ->  http://localhost:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html; charset=UTF-8', '.webmanifest': 'application/manifest+json', '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(__dirname, path.normalize(p));
  if (!file.startsWith(__dirname)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': path.basename(file) === 'sw.js' ? 'no-cache' : 'public, max-age=0' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Brain Lab running at http://localhost:${PORT}`));
