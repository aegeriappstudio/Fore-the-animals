#!/usr/bin/env node
/**
 * Fore the Animals! – 9-Hole Golf Safari
 * Turnier-Server ohne externe Abhängigkeiten (nur Node.js Standard-Bibliothek).
 *
 * Start:  node server.js          (Port über PORT, Standard 3000)
 * Daten:  DATA_DIR/data.json      (Standard: Projektordner)
 * PIN:    LEADERBOARD_PIN         (Standard: 1234)
 *
 * Aufteilung:
 *   lib/store.js             – Laden, Migration, Speichern, Backups
 *   lib/api.js               – JSON-API
 *   public/shared/model.js   – Spielregeln, Punkte, Ranglisten (auch im Browser)
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const { createStore } = require('./lib/store.js');
const { createApi, json } = require('./lib/api.js');

const PORT = process.env.PORT || 3000;
const PIN = process.env.LEADERBOARD_PIN || '1234';
const DATA_DIR = process.env.DATA_DIR || __dirname;
const PUBLIC_DIR = path.join(__dirname, 'public');

const store = createStore({ dataDir: DATA_DIR });
store.load();
const api = createApi(store, { pin: PIN });

// ---------------------------------------------------------------------------
// Statische Dateien
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const full = path.join(PUBLIC_DIR, path.normalize(decodeURIComponent(requested)));
  if (full !== PUBLIC_DIR && !full.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const ext = path.extname(full).toLowerCase();
    const isCode = ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': isCode ? 'no-cache' : 'public, max-age=86400',
    });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api.handle(req, res, url);
    return serveStatic(req, res, url);
  } catch (err) {
    if (res.headersSent) return res.end();
    return json(res, err.code === 413 ? 413 : 400, { error: err.message });
  }
});

store.installShutdownHooks((signal) => {
  console.log(`${signal} – Daten gesichert, Server wird beendet.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🦓 Fore the Animals! läuft auf http://localhost:${PORT}`);
    console.log(`   Daten: ${store.dataFile}`);
  });
}

module.exports = { server, store, api };
