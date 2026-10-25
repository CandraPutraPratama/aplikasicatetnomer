/**
 * Zero-dependency local web server for Catet Nomer PWA.
 * Run with: node server.js
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';

let PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let safePath = path.normalize(req.url.split('?')[0]);
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(process.cwd(), safePath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(process.cwd())) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function listen(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Aplikasi Catet Nomer & Voucher Aktif!`);
    console.log(`======================================================`);
    console.log(`💻 Buka di Laptop/PC : http://localhost:${port}`);

    // Print local network IP for mobile phone access
    const networkInterfaces = os.networkInterfaces();
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`📱 Buka di HP (WiFi) : http://${net.address}:${port}`);
        }
      }
    }
    console.log(`======================================================\n`);

    // Otomatis buka browser di laptop
    if (process.env.AUTO_OPEN !== 'false') {
      const openCmd = process.platform === 'win32' ? `start http://localhost:${port}` : `open http://localhost:${port}`;
      exec(openCmd, () => {});
    }
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} sedang dipakai, otomatis beralih ke port ${PORT + 1}...`);
    PORT++;
    listen(PORT);
  } else {
    console.error('Server error:', err);
  }
});

listen(PORT);
