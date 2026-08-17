/**
 * Fore the Animals! – JSON-API
 *
 * Grundsätze:
 *  - Der Client fragt mit `?rev=` an und bekommt bei unverändertem Stand nur
 *    eine winzige Antwort zurück (statt jedes Mal den ganzen Zustand).
 *  - `/api/state` enthält NIE die Loch-für-Loch-Scores gespeicherter Runden –
 *    die holt der Client bei Bedarf einzeln. Sonst wächst jede Abfrage mit
 *    jedem Turnier weiter an.
 *  - Score-Eingaben kommen gebündelt (ein Request statt einer pro Tap).
 *  - Alles, was Daten verändert, läuft über `store.commit`.
 */
'use strict';

const M = require('../public/shared/model.js');
const { newId, str, isDate, normalizeTeeTime, normalizeTees } = require('./store.js');

const MAX_BODY = 2 * 1024 * 1024;
const MAX_BATCH = 200;

function json(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (chunk) => {
      buf += chunk;
      if (buf.length > MAX_BODY) {
        reject(Object.assign(new Error('Anfrage zu gross'), { code: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!buf) return resolve({});
      try { resolve(JSON.parse(buf)); } catch { reject(Object.assign(new Error('Ungültiges JSON'), { code: 400 })); }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// PIN – Header bei geschützten Aktionen, Formular beim Entsperren
// ---------------------------------------------------------------------------
function createGuard(pin) {
  const failures = new Map(); // ip -> {count, until}

  function clientIp(req) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
  }

  function headerOk(req) {
    return req.headers['x-fta-pin'] === pin;
  }

  // Bremst das Durchprobieren der PIN, ohne echte Nutzer auszusperren.
  async function check(req, candidate) {
    const ip = clientIp(req);
    const entry = failures.get(ip) || { count: 0, until: 0 };
    const now = Date.now();
    if (entry.until > now) {
      return { ok: false, retryAfter: Math.ceil((entry.until - now) / 1000) };
    }
    if (String(candidate || '') === pin) {
      failures.delete(ip);
      return { ok: true };
    }
    entry.count += 1;
    entry.until = entry.count >= 10 ? now + 5 * 60 * 1000 : 0;
    failures.set(ip, entry);
    await new Promise((r) => setTimeout(r, Math.min(2000, 250 * entry.count)));
    return { ok: false, retryAfter: entry.until > now ? Math.ceil((entry.until - now) / 1000) : 0 };
  }

  return { headerOk, check };
}

// ---------------------------------------------------------------------------
// Antwort-Nutzlasten
// ---------------------------------------------------------------------------

// Der Zustand für den Client: laufende Runde vollständig, gespeicherte Runden
// nur als Zusammenfassung.
function publicState(state) {
  return {
    schema: state.schema,
    rev: state.rev,
    // `version` bleibt als Alias erhalten, damit eine noch im Cache liegende
    // alte App-Version nach einem Deploy nicht sofort stolpert.
    version: state.rev,
    updatedAt: state.updatedAt,
    courseId: state.courseId,
    tees: state.tees,
    players: state.players,
    flights: state.flights,
    events: state.events,
    scores: state.scores,
    rounds: state.rounds.map((r) => M.roundSummary(r)),
    allTime: M.allTime(state.rounds),
  };
}

function findPlayer(state, id) {
  return state.players.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function createApi(store, options) {
  const opts = options || {};
  const guard = createGuard(opts.pin);

  function requirePin(req, res) {
    if (guard.headerOk(req)) return true;
    json(res, 403, { error: 'PIN erforderlich' });
    return false;
  }

  async function handle(req, res, url) {
    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    const seg = (i) => parts[i];
    const method = req.method;
    const state = store.state;

    // --- Zustand ----------------------------------------------------------
    if (method === 'GET' && url.pathname === '/api/state') {
      const raw = url.searchParams.get('rev');
      const since = raw === null || raw === '' ? NaN : Number(raw);
      if (Number.isFinite(since) && since === state.rev) {
        return json(res, 200, { unchanged: true, rev: state.rev });
      }
      return json(res, 200, publicState(state));
    }

    // --- Platz & Wertungs-Tees --------------------------------------------
    if (method === 'PUT' && url.pathname === '/api/course') {
      if (!requirePin(req, res)) return;
      const body = await readBody(req);
      const course = body.courseId !== undefined ? M.courseById(str(body.courseId, 20)) : M.courseById(state.courseId);
      if (!course) return json(res, 400, { error: 'Unbekannter Platz' });
      const nextTees = normalizeTees({
        m: body.teeM !== undefined ? body.teeM : (course.id === state.courseId ? state.tees.m : undefined),
        f: body.teeF !== undefined ? body.teeF : (course.id === state.courseId ? state.tees.f : undefined),
      }, course.id);
      const changes = course.id !== state.courseId
        || nextTees.m !== state.tees.m || nextTees.f !== state.tees.f;
      if (changes && M.hasAnyScore(state.scores)) {
        // Platz oder Tee mitten in der Runde zu wechseln würde die laufenden
        // Resultate umrechnen – zuerst abschliessen oder zurücksetzen.
        return json(res, 409, { error: 'Zuerst die laufende Runde abschliessen oder zurücksetzen' });
      }
      store.commit((s) => {
        if (!changes) return false;
        s.courseId = course.id;
        s.tees = nextTees;
        return true;
      });
      return json(res, 200, { courseId: state.courseId, tees: state.tees, rev: state.rev });
    }

    // --- Spieler ----------------------------------------------------------
    if (method === 'POST' && url.pathname === '/api/players') {
      const body = await readBody(req);
      const name = str(body.name, 40);
      if (!name) return json(res, 400, { error: 'Name fehlt' });
      const player = { id: newId(), name, hcp: M.normalizeHcp(body.hcp), gender: M.normalizeGender(body.gender), present: true };
      store.commit((s) => {
        s.players.push(player);
        s.scores[player.id] = {};
      });
      return json(res, 200, { player, rev: state.rev });
    }

    if (seg(1) === 'players' && seg(2)) {
      const player = findPlayer(state, seg(2));
      if (!player) return json(res, 404, { error: 'Spieler nicht gefunden' });

      if (method === 'PUT') {
        const body = await readBody(req);
        if (body.flightId) {
          const exists = state.flights.some((f) => f.id === body.flightId);
          if (!exists) return json(res, 404, { error: 'Flight nicht gefunden' });
        }
        const changed = store.commit((s) => {
          let touched = false;
          if (body.name !== undefined) {
            const name = str(body.name, 40);
            if (name && name !== player.name) { player.name = name; touched = true; }
          }
          if (body.hcp !== undefined) {
            const hcp = M.normalizeHcp(body.hcp);
            if (hcp !== player.hcp) { player.hcp = hcp; touched = true; }
          }
          if (body.gender !== undefined) {
            const gender = M.normalizeGender(body.gender);
            if (gender !== player.gender) { player.gender = gender; touched = true; }
          }
          // Anwesenheit: Abwesende fliegen aus allen Flights (Scores bleiben)
          if (body.present !== undefined && !!body.present !== player.present) {
            player.present = !!body.present;
            touched = true;
            if (!player.present) {
              s.flights.forEach((f) => { f.playerIds = f.playerIds.filter((pid) => pid !== player.id); });
            }
          }
          // `flightId` verschiebt den Spieler in einen Flight (null = aus dem
          // Flight nehmen) – für die Handkorrektur nach der Auslosung.
          // Nur Anwesende können zugeteilt werden.
          if (body.flightId !== undefined && (player.present || !body.flightId)) {
            const target = body.flightId ? s.flights.find((f) => f.id === body.flightId) : null;
            s.flights.forEach((f) => {
              const had = f.playerIds.indexOf(player.id) !== -1;
              const should = !!target && f.id === target.id;
              if (had && !should) { f.playerIds = f.playerIds.filter((pid) => pid !== player.id); touched = true; }
              if (!had && should) { f.playerIds.push(player.id); touched = true; }
            });
          }
          return touched ? true : false;
        });
        return json(res, 200, { player, rev: state.rev, changed: changed !== false });
      }

      if (method === 'DELETE') {
        if (!requirePin(req, res)) return;
        store.commit((s) => {
          s.players = s.players.filter((p) => p.id !== player.id);
          delete s.scores[player.id];
          s.flights.forEach((f) => { f.playerIds = f.playerIds.filter((pid) => pid !== player.id); });
        });
        return json(res, 200, { ok: true, rev: state.rev });
      }
    }

    // --- Flights ----------------------------------------------------------
    if (method === 'POST' && url.pathname === '/api/flights') {
      const body = await readBody(req);
      const flight = {
        id: newId(),
        name: str(body.name, 40) || `Flight ${state.flights.length + 1}`,
        playerIds: [],
        teeTime: normalizeTeeTime(body.teeTime),
      };
      store.commit((s) => { s.flights.push(flight); });
      return json(res, 200, { flight, rev: state.rev });
    }

    // {size, playerIds?} – ohne playerIds werden die heute zugeteilten Spieler
    // neu gemischt, und falls noch niemand zugeteilt ist, alle Spieler.
    if (method === 'POST' && url.pathname === '/api/flights/randomize') {
      const body = await readBody(req);
      let size = parseInt(body.size, 10);
      if (!(size >= 2 && size <= 4)) size = 3;
      // Ausgelost werden die anwesenden Spieler; eine mitgeschickte Liste
      // wird zusätzlich auf Anwesende gefiltert.
      const present = new Set(state.players.filter((p) => p.present).map((p) => p.id));
      let candidates;
      if (Array.isArray(body.playerIds) && body.playerIds.length) {
        candidates = body.playerIds.filter((pid) => present.has(pid));
      } else {
        candidates = Array.from(present);
      }
      if (candidates.length < 2) return json(res, 400, { error: 'Mindestens 2 anwesende Spieler nötig' });
      store.commit((s) => {
        const ids = candidates.slice();
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        const count = Math.max(1, Math.ceil(ids.length / size));
        s.flights = Array.from({ length: count }, (_, i) => ({
          id: newId(), name: `Flight ${i + 1}`, playerIds: [], teeTime: null,
        }));
        ids.forEach((pid, i) => s.flights[i % count].playerIds.push(pid));
      });
      return json(res, 200, { flights: state.flights, rev: state.rev });
    }

    if (seg(1) === 'flights' && seg(2)) {
      const flight = state.flights.find((f) => f.id === seg(2));
      if (!flight) return json(res, 404, { error: 'Flight nicht gefunden' });

      if (method === 'PUT') {
        const body = await readBody(req);
        store.commit((s) => {
          if (body.name !== undefined) {
            const name = str(body.name, 40);
            if (name) flight.name = name;
          }
          if (body.teeTime !== undefined) flight.teeTime = normalizeTeeTime(body.teeTime);
          if (Array.isArray(body.playerIds)) {
            const allowed = new Set(s.players.filter((p) => p.present).map((p) => p.id));
            const ids = [];
            body.playerIds.forEach((pid) => {
              if (allowed.has(pid) && ids.indexOf(pid) === -1) ids.push(pid);
            });
            flight.playerIds = ids;
            // Ein Spieler gehört zu genau einem Flight – aus allen anderen entfernen.
            s.flights.forEach((other) => {
              if (other.id === flight.id) return;
              other.playerIds = other.playerIds.filter((pid) => ids.indexOf(pid) === -1);
            });
          }
        });
        return json(res, 200, { flight, rev: state.rev });
      }

      if (method === 'DELETE') {
        store.commit((s) => { s.flights = s.flights.filter((f) => f.id !== flight.id); });
        return json(res, 200, { ok: true, rev: state.rev });
      }
    }

    // --- Scores -----------------------------------------------------------
    // Gebündelt: PUT /api/scores {entries:[{playerId, hole, gross?, animals?}]}
    // POST wird ebenfalls akzeptiert – `navigator.sendBeacon` (letzter Stand
    // beim Schliessen der App) kann nur POST.
    if ((method === 'PUT' || method === 'POST') && url.pathname === '/api/scores') {
      const body = await readBody(req);
      const entries = Array.isArray(body.entries) ? body.entries : [];
      if (!entries.length) return json(res, 400, { error: 'Keine Einträge' });
      if (entries.length > MAX_BATCH) return json(res, 400, { error: 'Zu viele Einträge auf einmal' });

      const applied = [];
      const rejected = [];
      store.commit((s) => {
        entries.forEach((raw) => {
          const playerId = str(raw && raw.playerId, 40);
          const hole = M.normalizeHole(raw && raw.hole, s.courseId);
          if (!findPlayer(s, playerId)) {
            return rejected.push({ playerId, hole, error: 'Spieler nicht gefunden' });
          }
          if (hole === null) {
            return rejected.push({ playerId, hole: raw && raw.hole, error: `Loch muss 1–${M.courseById(s.courseId).holeCount} sein` });
          }
          if (raw.gross !== undefined && raw.gross !== null && M.normalizeGross(raw.gross) === null) {
            return rejected.push({ playerId, hole, error: `Brutto muss ${M.MIN_GROSS}–${M.MAX_GROSS} sein` });
          }
          if (!s.scores[playerId]) s.scores[playerId] = {};
          const merged = M.mergeEntry(s.scores[playerId][hole], raw, hole, s.courseId);
          if (merged.gross === null && Object.keys(merged.animals).length === 0) delete s.scores[playerId][hole];
          else s.scores[playerId][hole] = merged;
          applied.push({ playerId, hole, entry: s.scores[playerId][hole] || null });
        });
        return applied.length > 0;
      });
      return json(res, applied.length ? 200 : 400, { applied, rejected, rev: state.rev });
    }

    // Einzeleintrag – bleibt für ältere, noch gecachte App-Versionen bestehen.
    if (method === 'PUT' && seg(1) === 'scores' && seg(2) && seg(3)) {
      const playerId = seg(2);
      const hole = M.normalizeHole(seg(3), state.courseId);
      if (!findPlayer(state, playerId)) return json(res, 404, { error: 'Spieler nicht gefunden' });
      if (hole === null) return json(res, 400, { error: `Loch muss 1–${M.courseById(state.courseId).holeCount} sein` });
      const body = await readBody(req);
      if (body.gross !== undefined && body.gross !== null && M.normalizeGross(body.gross) === null) {
        return json(res, 400, { error: `Brutto muss ${M.MIN_GROSS}–${M.MAX_GROSS} sein` });
      }
      let entry = null;
      store.commit((s) => {
        if (!s.scores[playerId]) s.scores[playerId] = {};
        const merged = M.mergeEntry(s.scores[playerId][hole], body, hole, s.courseId);
        if (merged.gross === null && Object.keys(merged.animals).length === 0) delete s.scores[playerId][hole];
        else s.scores[playerId][hole] = merged;
        entry = s.scores[playerId][hole] || null;
      });
      return json(res, 200, { entry, rev: state.rev, version: state.rev });
    }

    // --- Runden -----------------------------------------------------------
    if (method === 'GET' && url.pathname === '/api/rounds') {
      return json(res, 200, { rounds: state.rounds.map((r) => M.roundSummary(r)), rev: state.rev });
    }

    if (method === 'POST' && url.pathname === '/api/rounds') {
      if (!requirePin(req, res)) return;
      const body = await readBody(req);
      if (!M.hasAnyScore(state.scores)) {
        return json(res, 400, { error: 'Keine Scores vorhanden – nichts zu speichern' });
      }
      const date = new Date();
      const defaultName = `Runde vom ${date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      let round;
      store.commit((s) => {
        // Nur wer tatsächlich etwas eingetragen hat, kommt in die Wertung –
        // sonst stünde ein zugeteilter, aber nicht gestarteter Spieler mit der
        // reinen Par-Prognose in der Schlussrangliste.
        const players = s.players.filter((p) => M.hasScores(s.scores[p.id]));
        round = {
          id: newId(),
          name: str(body.name, 60) || defaultName,
          date: date.toISOString(),
          // Verknüpfung zum Termin – nur wenn es den Termin wirklich gibt
          eventId: s.events.some((ev) => ev.id === str(body.eventId, 40)) ? str(body.eventId, 40) : null,
          courseId: s.courseId,
          tees: Object.assign({}, s.tees),
          results: M.resultsFor(players, s.scores, s.courseId, s.tees),
          players: players.map((p) => Object.assign({}, p)),
          scores: JSON.parse(JSON.stringify(s.scores)),
        };
        s.rounds.unshift(round);
        s.scores = {};
        s.players.forEach((p) => { s.scores[p.id] = {}; });
      });
      return json(res, 200, { round: M.roundSummary(round), rev: state.rev });
    }

    if (seg(1) === 'rounds' && seg(2)) {
      const round = state.rounds.find((r) => r.id === seg(2));
      if (!round) return json(res, 404, { error: 'Runde nicht gefunden' });
      if (method === 'GET') return json(res, 200, { round, rev: state.rev });
      if (method === 'DELETE') {
        if (!requirePin(req, res)) return;
        store.commit((s) => { s.rounds = s.rounds.filter((r) => r.id !== round.id); });
        return json(res, 200, { ok: true, rev: state.rev });
      }
    }

    // --- Termine ----------------------------------------------------------
    if (method === 'POST' && url.pathname === '/api/events') {
      if (!requirePin(req, res)) return;
      const body = await readBody(req);
      const name = str(body.name, 60);
      const date = str(body.date, 10);
      if (!name) return json(res, 400, { error: 'Name fehlt' });
      if (!isDate(date)) return json(res, 400, { error: 'Datum fehlt oder ungültig' });
      const ev = {
        id: newId(),
        name,
        date,
        flights: str(body.flights, 80),
        dinner: str(body.dinner, 80),
        note: str(body.note, 200),
        confirmed: !!body.confirmed,
      };
      store.commit((s) => { s.events.push(ev); });
      return json(res, 200, { event: ev, rev: state.rev });
    }

    if (seg(1) === 'events' && seg(2)) {
      const ev = state.events.find((x) => x.id === seg(2));
      if (!ev) return json(res, 404, { error: 'Termin nicht gefunden' });

      if (!requirePin(req, res)) return;

      if (method === 'PUT') {
        const body = await readBody(req);
        store.commit(() => {
          if (body.name !== undefined) {
            const name = str(body.name, 60);
            if (name) ev.name = name;
          }
          if (body.date !== undefined && isDate(str(body.date, 10))) ev.date = str(body.date, 10);
          if (body.flights !== undefined) ev.flights = str(body.flights, 80);
          if (body.dinner !== undefined) ev.dinner = str(body.dinner, 80);
          if (body.note !== undefined) ev.note = str(body.note, 200);
          if (body.confirmed !== undefined) ev.confirmed = !!body.confirmed;
        });
        return json(res, 200, { event: ev, rev: state.rev });
      }

      if (method === 'DELETE') {
        store.commit((s) => { s.events = s.events.filter((x) => x.id !== ev.id); });
        return json(res, 200, { ok: true, rev: state.rev });
      }
    }

    // --- PIN, Backup, Reset ------------------------------------------------
    if (method === 'POST' && url.pathname === '/api/unlock') {
      const body = await readBody(req);
      const result = await guard.check(req, body.pin);
      if (!result.ok) {
        return json(res, 403, {
          error: result.retryAfter ? `Zu viele Versuche – in ${result.retryAfter} s erneut versuchen` : 'Falsche PIN',
          retryAfter: result.retryAfter || 0,
        });
      }
      return json(res, 200, { ok: true, rev: state.rev });
    }

    // Vollständiger Zustand inklusive aller Runden-Scores – Grundlage für das
    // Backup, das der Client als Datei ablegt.
    if (method === 'GET' && url.pathname === '/api/backup') {
      if (!requirePin(req, res)) return;
      return json(res, 200, state);
    }

    if (method === 'POST' && url.pathname === '/api/restore') {
      if (!requirePin(req, res)) return;
      const body = await readBody(req);
      if (!body || !Array.isArray(body.players)) {
        return json(res, 400, { error: 'Ungültiges Backup: players fehlt' });
      }
      // Backups ohne Termine (sehr alte Dateien) sollen die aktuellen Termine
      // nicht wegwerfen.
      const incoming = Object.assign({}, body);
      if (!Array.isArray(incoming.events)) incoming.events = state.events;
      const next = store.replace(incoming);
      return json(res, 200, {
        ok: true,
        players: next.players.length,
        rounds: next.rounds.length,
        rev: next.rev,
      });
    }

    if (method === 'POST' && url.pathname === '/api/reset') {
      if (!requirePin(req, res)) return;
      const body = await readBody(req);
      if (body.confirm !== 'RESET') return json(res, 400, { error: 'Bestätigung fehlt' });
      store.commit((s) => {
        s.scores = {};
        s.players.forEach((p) => { s.scores[p.id] = {}; });
      });
      return json(res, 200, { ok: true, rev: state.rev });
    }

    return json(res, 404, { error: 'Unbekannter API-Pfad' });
  }

  return { handle, json, publicState };
}

module.exports = { createApi, json, readBody, publicState };
