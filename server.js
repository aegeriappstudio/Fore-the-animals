#!/usr/bin/env node
/**
 * Fore the Animals! – 9-Hole Golf Safari
 * Kleiner Turnier-Server ohne externe Abhängigkeiten (nur Node.js Standard-Bibliothek).
 *
 * Start:  node server.js          (Port über PORT-Umgebungsvariable, Standard 3000)
 * Daten:  werden in data.json neben dieser Datei gespeichert.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------------------------------------------------------------------------
// Zustand laden / speichern
// ---------------------------------------------------------------------------

function emptyState() {
  return {
    players: [],   // {id, name, hcp}
    flights: [],   // {id, name, playerIds: []}
    scores: {},    // scores[playerId][hole] = {gross, animals:{zebra,giraffe,rabbit,scorpion,crocodile,snake}}
    archive: [],   // abgeschlossene Runden: {id, name, date, results, players, scores}
    version: 0,
    updatedAt: null,
  };
}

let state = emptyState();
try {
  if (fs.existsSync(DATA_FILE)) {
    state = Object.assign(emptyState(), JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    console.log(`Daten geladen aus ${DATA_FILE}`);
  }
} catch (err) {
  console.error('Konnte data.json nicht lesen, starte mit leerem Zustand:', err.message);
}

let saveTimer = null;
function persist() {
  state.version += 1;
  state.updatedAt = new Date().toISOString();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(state, null, 2), (err) => {
      if (err) return console.error('Speichern fehlgeschlagen:', err.message);
      fs.rename(tmp, DATA_FILE, (err2) => {
        if (err2) console.error('Speichern fehlgeschlagen:', err2.message);
      });
    });
  }, 150);
}

const id = () => crypto.randomBytes(6).toString('hex');

const POS_ANIMALS = ['zebra', 'giraffe', 'rabbit'];
const NEG_ANIMALS = ['scorpion', 'crocodile', 'snake'];
const ANIMALS = [...POS_ANIMALS, ...NEG_ANIMALS];
const PARS = [4, 4, 4, 3, 4, 4, 4, 5, 4];

// Endresultate der aktuellen Runde (für das Archiv), sortiert nach Punkten
function computeResults() {
  return state.players.map((p) => {
    const sc = state.scores[p.id] || {};
    let gross = 0, played = 0, pos = 0, neg = 0;
    const counts = {};
    for (let h = 1; h <= 9; h++) {
      const e = sc[h];
      if (e && e.gross != null) { gross += e.gross; played++; }
      if (e && e.animals) {
        for (const a of ANIMALS) {
          if (e.animals[a]) {
            counts[a] = (counts[a] || 0) + 1;
            POS_ANIMALS.includes(a) ? pos++ : neg++;
          }
        }
      }
    }
    const target = 36 + Math.ceil(Number(p.hcp) / 2);
    return {
      id: p.id, name: p.name, hcp: p.hcp, target, gross, played, pos, neg, counts,
      points: target - gross + pos - neg,
      totalAnimals: pos + neg,
    };
  }).sort((a, b) => b.points - a.points || b.totalAnimals - a.totalAnimals || a.gross - b.gross);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

function json(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => {
      buf += c;
      if (buf.length > 1e6) { reject(new Error('Body zu gross')); req.destroy(); }
    });
    req.on('end', () => {
      if (!buf) return resolve({});
      try { resolve(JSON.parse(buf)); } catch { reject(new Error('Ungültiges JSON')); }
    });
    req.on('error', reject);
  });
}

function sanitizeHcp(v) {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.max(-10, Math.min(54, Math.round(n * 10) / 10));
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]

  // GET /api/state
  if (req.method === 'GET' && url.pathname === '/api/state') {
    return json(res, 200, state);
  }

  // POST /api/players  {name, hcp}
  if (req.method === 'POST' && url.pathname === '/api/players') {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 40);
    if (!name) return json(res, 400, { error: 'Name fehlt' });
    const player = { id: id(), name, hcp: sanitizeHcp(body.hcp) };
    state.players.push(player);
    state.scores[player.id] = {};
    persist();
    return json(res, 200, player);
  }

  // PUT/DELETE /api/players/:id
  if (parts[1] === 'players' && parts[2]) {
    const player = state.players.find((p) => p.id === parts[2]);
    if (!player) return json(res, 404, { error: 'Spieler nicht gefunden' });
    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (body.name !== undefined) {
        const name = String(body.name).trim().slice(0, 40);
        if (name) player.name = name;
      }
      if (body.hcp !== undefined) player.hcp = sanitizeHcp(body.hcp);
      persist();
      return json(res, 200, player);
    }
    if (req.method === 'DELETE') {
      state.players = state.players.filter((p) => p.id !== player.id);
      delete state.scores[player.id];
      state.flights.forEach((f) => {
        f.playerIds = f.playerIds.filter((pid) => pid !== player.id);
      });
      persist();
      return json(res, 200, { ok: true });
    }
  }

  // POST /api/flights  {name}
  if (req.method === 'POST' && url.pathname === '/api/flights') {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 40) || `Flight ${state.flights.length + 1}`;
    const flight = { id: id(), name, playerIds: [] };
    state.flights.push(flight);
    persist();
    return json(res, 200, flight);
  }

  // POST /api/flights/randomize {size} – lost alle Spieler zufällig auf Flights aus
  if (req.method === 'POST' && url.pathname === '/api/flights/randomize') {
    const body = await readBody(req);
    let size = parseInt(body.size, 10);
    if (!(size >= 2 && size <= 4)) size = 3;
    if (!state.players.length) return json(res, 400, { error: 'Keine Spieler erfasst' });
    const ids = state.players.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const count = Math.max(1, Math.ceil(ids.length / size));
    state.flights = Array.from({ length: count }, (_, i) => ({ id: id(), name: `Flight ${i + 1}`, playerIds: [] }));
    ids.forEach((pid, i) => state.flights[i % count].playerIds.push(pid));
    persist();
    return json(res, 200, state.flights);
  }

  // PUT/DELETE /api/flights/:id
  if (parts[1] === 'flights' && parts[2]) {
    const flight = state.flights.find((f) => f.id === parts[2]);
    if (!flight) return json(res, 404, { error: 'Flight nicht gefunden' });
    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (body.name !== undefined) {
        const name = String(body.name).trim().slice(0, 40);
        if (name) flight.name = name;
      }
      if (Array.isArray(body.playerIds)) {
        const valid = new Set(state.players.map((p) => p.id));
        flight.playerIds = body.playerIds.filter((pid) => valid.has(pid));
      }
      persist();
      return json(res, 200, flight);
    }
    if (req.method === 'DELETE') {
      state.flights = state.flights.filter((f) => f.id !== flight.id);
      persist();
      return json(res, 200, { ok: true });
    }
  }

  // PUT /api/scores/:playerId/:hole  {gross?, animals?}
  if (req.method === 'PUT' && parts[1] === 'scores' && parts[2] && parts[3]) {
    const player = state.players.find((p) => p.id === parts[2]);
    const hole = parseInt(parts[3], 10);
    if (!player) return json(res, 404, { error: 'Spieler nicht gefunden' });
    if (!(hole >= 1 && hole <= 9)) return json(res, 400, { error: 'Loch muss 1–9 sein' });
    const body = await readBody(req);

    if (!state.scores[player.id]) state.scores[player.id] = {};
    const entry = state.scores[player.id][hole] || { gross: null, animals: {} };

    if (body.gross !== undefined) {
      if (body.gross === null) entry.gross = null;
      else {
        const g = parseInt(body.gross, 10);
        if (!(g >= 1 && g <= 20)) return json(res, 400, { error: 'Brutto muss 1–20 sein' });
        entry.gross = g;
      }
    }
    if (body.animals && typeof body.animals === 'object') {
      for (const a of ANIMALS) {
        if (body.animals[a] !== undefined) {
          // Zebra gibt es nur auf Par 4/5
          if (a === 'zebra' && PARS[hole - 1] === 3 && body.animals[a]) continue;
          entry.animals[a] = !!body.animals[a];
        }
      }
    }
    state.scores[player.id][hole] = entry;
    persist();
    return json(res, 200, { entry, version: state.version });
  }

  // POST /api/rounds {name?} – aktuelle Runde abschliessen und im Archiv speichern
  if (req.method === 'POST' && url.pathname === '/api/rounds') {
    const body = await readBody(req);
    const hasScores = Object.values(state.scores).some((byHole) =>
      Object.values(byHole || {}).some((e) => e && (e.gross != null || Object.values(e.animals || {}).some(Boolean))));
    if (!hasScores) return json(res, 400, { error: 'Keine Scores vorhanden – nichts zu speichern' });
    const date = new Date();
    const defaultName = `Runde vom ${date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    const round = {
      id: id(),
      name: String(body.name || '').trim().slice(0, 60) || defaultName,
      date: date.toISOString(),
      results: computeResults(),
      players: state.players.map((p) => ({ ...p })),
      scores: JSON.parse(JSON.stringify(state.scores)),
    };
    state.archive.unshift(round);
    for (const pid of Object.keys(state.scores)) state.scores[pid] = {};
    persist();
    return json(res, 200, round);
  }

  // DELETE /api/rounds/:id – gespeicherte Runde löschen
  if (req.method === 'DELETE' && parts[1] === 'rounds' && parts[2]) {
    const before = state.archive.length;
    state.archive = state.archive.filter((r) => r.id !== parts[2]);
    if (state.archive.length === before) return json(res, 404, { error: 'Runde nicht gefunden' });
    persist();
    return json(res, 200, { ok: true });
  }

  // POST /api/restore – kompletten Zustand aus einem Backup wiederherstellen
  if (req.method === 'POST' && url.pathname === '/api/restore') {
    const body = await readBody(req);
    if (!body || !Array.isArray(body.players)) {
      return json(res, 400, { error: 'Ungültiges Backup: players fehlt' });
    }
    const restored = emptyState();
    restored.players = body.players;
    restored.flights = Array.isArray(body.flights) ? body.flights : [];
    restored.scores = (body.scores && typeof body.scores === 'object') ? body.scores : {};
    restored.archive = Array.isArray(body.archive) ? body.archive : [];
    restored.version = state.version;
    state = restored;
    persist();
    return json(res, 200, { ok: true, players: state.players.length, rounds: state.archive.length });
  }

  // POST /api/reset {confirm:"RESET"} – löscht alle Scores (Spieler/Flights bleiben)
  if (req.method === 'POST' && url.pathname === '/api/reset') {
    const body = await readBody(req);
    if (body.confirm !== 'RESET') return json(res, 400, { error: 'Bestätigung fehlt' });
    for (const pid of Object.keys(state.scores)) state.scores[pid] = {};
    persist();
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'Unbekannter API-Pfad' });
}

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
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=86400',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (err) {
    return json(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🦓 Fore the Animals! läuft auf http://localhost:${PORT}`);
});
