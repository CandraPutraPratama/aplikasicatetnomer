import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};

describe('Static File Server & HTTP Asset Delivery', () => {
  it('serves all frontend assets with 200 OK and valid mime types', async () => {
    const server = http.createServer((req, res) => {
      let filePath = '.' + req.url;
      if (filePath === './') filePath = './index.html';
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const urls = [
      '/',
      '/index.html',
      '/css/style.css',
      '/js/app.js',
      '/js/store.js',
      '/js/ui.js',
      '/manifest.json',
      '/sw.js',
      '/icons/icon.svg'
    ];

    for (const u of urls) {
      const response = await fetch(`http://127.0.0.1:${port}${u}`);
      assert.equal(response.status, 200, `URL ${u} should respond with 200 OK`);
      const text = await response.text();
      assert.ok(text.length > 0, `URL ${u} body should not be empty`);
    }

    await new Promise((resolve) => server.close(resolve));
  });
});
