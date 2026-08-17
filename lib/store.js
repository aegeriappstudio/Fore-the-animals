/**
 * Fore the Animals! – Persistenz
 *
 * Zuständig für: Laden inkl. Migration alter Dateien, Rettung bei defekter
 * data.json, atomares und serialisiertes Speichern, Flush beim Herunterfahren
 * sowie die datierten Tages-Backups.
 *
 * Der Zustand ist bewusst ein einfaches Objekt; jede Änderung geht über
 * `store.commit(fn)`, damit `rev` und `updatedAt` nie vergessen gehen.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const M = require('../public/shared/model.js');

// 1 = Urversion, 2 = rounds/rev, 3 = ohne Termin-Anmeldungen,
// 4 = `present` wieder da, 5 = Platz-Auswahl (courseId auf Zustand und Runden)
const SCHEMA = 5;
const KEEP_BACKUPS = 14;
// Schreiben wird kurz gebündelt (viele Taps hintereinander = ein Schreibvorgang),
// aber nie länger als MAX_DELAY aufgeschoben.
const WRITE_DELAY = 200;
const WRITE_MAX_DELAY = 1500;

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

function str(value, max) {
  return String(value === undefined || value === null ? '' : value).trim().slice(0, max);
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

// Abschlagszeit im Format des <input type="datetime-local">, z.B. 2026-08-06T18:30
function normalizeTeeTime(value) {
  const s = str(value, 20);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s : null;
}

function emptyState() {
  return {
    schema: SCHEMA,
    rev: 0,
    updatedAt: null,
    courseId: M.DEFAULT_COURSE, // aktiver Platz der laufenden Runde
    players: [],   // {id, name, hcp, present}
    flights: [],   // {id, name, playerIds, teeTime}
    events: [],    // {id, name, date, flights, dinner, note, confirmed}
    scores: {},    // scores[playerId][hole] = {gross, animals}
    rounds: [],    // {id, name, date, eventId, results, players, scores}
  };
}

function seedEvents() {
  return [
    { id: 'ev-seed-1', name: 'Fore the Animals #1', date: '2026-08-06', flights: '18:30 & 18:40 Uhr', dinner: 'Albergo', note: '', confirmed: true },
    { id: 'ev-seed-2', name: 'Fore the Animals #2', date: '2026-08-26', flights: '', dinner: '', note: 'Wird in Kürze bestätigt.', confirmed: false },
  ];
}

// ---------------------------------------------------------------------------
// Migration / Normalisierung
// ---------------------------------------------------------------------------

function normalizePlayers(raw) {
  const seen = new Set();
  return (Array.isArray(raw) ? raw : []).map((p) => {
    if (!p || typeof p !== 'object') return null;
    let id = str(p.id, 40) || newId();
    while (seen.has(id)) id = newId();
    seen.add(id);
    const name = str(p.name, 40);
    if (!name) return null;
    // `present` = spielt heute mit. Fehlt das Feld (Datenstand von Schema 3,
    // als die Anwesenheit aus der Flight-Zuteilung abgeleitet wurde), wird es
    // in migrate() aus Flights/Scores hergeleitet.
    return {
      id,
      name,
      hcp: M.normalizeHcp(p.hcp),
      present: typeof p.present === 'boolean' ? p.present : null,
    };
  }).filter(Boolean);
}

function normalizeFlights(raw, playerIds) {
  const valid = new Set(playerIds);
  const used = new Set();
  return (Array.isArray(raw) ? raw : []).map((f, i) => {
    if (!f || typeof f !== 'object') return null;
    // Ein Spieler kann nur in einem Flight sein – doppelte Zuteilungen aus
    // älteren Dateien werden hier bereinigt.
    const ids = (Array.isArray(f.playerIds) ? f.playerIds : []).filter((pid) => {
      if (!valid.has(pid) || used.has(pid)) return false;
      used.add(pid);
      return true;
    });
    return {
      id: str(f.id, 40) || newId(),
      name: str(f.name, 40) || `Flight ${i + 1}`,
      playerIds: ids,
      teeTime: normalizeTeeTime(f.teeTime),
    };
  }).filter(Boolean);
}

// Termine sind reine Ankündigungen – die frühere Anmeldung pro Termin
// (`playerIds`) gibt es nicht mehr und wird beim Laden verworfen.
function normalizeEvents(raw) {
  return (Array.isArray(raw) ? raw : []).map((e) => {
    if (!e || typeof e !== 'object') return null;
    const name = str(e.name, 60);
    if (!name) return null;
    return {
      id: str(e.id, 40) || newId(),
      name,
      date: isDate(e.date) ? e.date : '',
      flights: str(e.flights, 80),
      dinner: str(e.dinner, 80),
      note: str(e.note, 200),
      confirmed: !!e.confirmed,
    };
  }).filter(Boolean);
}

/**
 * Gespeicherte Runden.
 *
 * Wichtig: Die Resultate werden – wo die Loch-für-Loch-Scores mitgespeichert
 * sind – aus diesen Scores neu berechnet. Ältere Runden wurden mit einer
 * anderen Formel abgelegt (fehlende Löcher zählten als 0 Schläge und ergaben
 * viel zu gute Punkte); die Neuberechnung korrigiert das rückwirkend.
 */
function normalizeRounds(raw) {
  return (Array.isArray(raw) ? raw : []).map((r) => {
    if (!r || typeof r !== 'object') return null;
    // Auf welchem Platz wurde die Runde gespielt? Alte Runden: Rigi 9 Loch.
    const courseId = M.courseById(r.courseId) ? r.courseId : M.DEFAULT_COURSE;
    const players = normalizePlayers(r.players);
    // Im Runden-Schnappschuss ist die Anwesenheit bedeutungslos – wer drin
    // steht, hat mitgespielt.
    players.forEach((p) => { p.present = true; });
    const scores = M.normalizeScores(r.scores, players.map((p) => p.id), courseId);
    const storedResults = Array.isArray(r.results) ? r.results : [];

    let results;
    if (storedResults.length && Object.keys(scores).length) {
      // Teilnehmerkreis und Handicap kommen aus dem gespeicherten Resultat,
      // die Schläge aus den gespeicherten Scores.
      results = storedResults.map((x) => {
        const player = { id: str(x.id, 40), name: str(x.name, 40), hcp: x.hcp };
        return M.playerResult(player, scores[player.id], courseId);
      });
    } else if (storedResults.length) {
      // Keine Scores dabei (sehr altes Backup): Felder auffüllen, Punkte so
      // lassen, wie sie damals berechnet wurden.
      results = storedResults.map((x) => {
        const pos = Number(x.pos) || 0;
        const neg = Number(x.neg) || 0;
        const counts = {};
        M.ANIMAL_KEYS.forEach((k) => { counts[k] = Number((x.counts || {})[k]) || 0; });
        const holeCount = M.courseById(courseId).holeCount;
        const played = x.played == null ? holeCount : Number(x.played) || 0;
        return {
          id: str(x.id, 40) || newId(),
          name: str(x.name, 40),
          hcp: M.normalizeHcp(x.hcp),
          target: Number(x.target) || M.targetFor(x.hcp, courseId),
          gross: Number(x.gross) || 0,
          played,
          complete: played === holeCount,
          parOpen: 0,
          projected: Number(x.gross) || 0,
          pos,
          neg,
          counts,
          totalAnimals: x.totalAnimals == null ? pos + neg : Number(x.totalAnimals),
          points: Number(x.points) || 0,
        };
      });
    } else {
      results = M.resultsFor(players, scores, courseId);
    }

    const date = r.date && !isNaN(new Date(r.date)) ? new Date(r.date).toISOString() : new Date(0).toISOString();
    return {
      id: str(r.id, 40) || newId(),
      name: str(r.name, 60) || 'Runde',
      date,
      eventId: str(r.eventId, 40) || null,
      courseId,
      results,
      players,
      scores,
    };
  }).filter(Boolean);
}

/**
 * Beliebige (auch sehr alte) Datei in die aktuelle Struktur überführen.
 * Wird beim Start und beim Wiederherstellen eines Backups verwendet.
 */
function migrate(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const state = emptyState();

  state.courseId = M.courseById(input.courseId) ? input.courseId : M.DEFAULT_COURSE;
  state.players = normalizePlayers(input.players);
  const ids = state.players.map((p) => p.id);
  state.flights = normalizeFlights(input.flights, ids);
  state.scores = M.normalizeScores(input.scores, ids, state.courseId);
  // Jeder Spieler hat einen (evtl. leeren) Score-Eintrag
  ids.forEach((id) => { if (!state.scores[id]) state.scores[id] = {}; });

  // Fehlende Anwesenheit herleiten: Wer in einem Flight steht oder Scores in
  // der laufenden Runde hat, ist dabei (Datenstand ohne `present`-Feld).
  const assigned = new Set();
  state.flights.forEach((f) => f.playerIds.forEach((pid) => assigned.add(pid)));
  state.players.forEach((p) => {
    if (p.present === null) p.present = assigned.has(p.id) || M.hasScores(state.scores[p.id]);
  });

  const events = normalizeEvents(input.events);
  // Datei ohne jeglichen Termin-Eintrag (Erststart): Beispieltermine setzen.
  state.events = Array.isArray(input.events) ? events : seedEvents();

  // `archive` hiess die Liste in älteren Versionen
  state.rounds = normalizeRounds(input.rounds || input.archive);
  state.rounds.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  state.rev = Number(input.rev) || Number(input.version) || 0;
  state.updatedAt = input.updatedAt || null;
  state.schema = SCHEMA;
  return state;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function createStore(options) {
  const opts = options || {};
  const dataDir = opts.dataDir || __dirname;
  const dataFile = opts.dataFile || path.join(dataDir, 'data.json');
  const backupDir = opts.backupDir || path.join(dataDir, 'backups');
  const log = opts.log === false ? () => {} : (opts.log || console.log);
  const logError = opts.log === false ? () => {} : (opts.logError || console.error);

  let state = emptyState();
  let writeTimer = null;
  let firstDirtyAt = 0;
  let lastBackupDay = null;

  function readFileSafe(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      return undefined;
    }
  }

  // Neueste Backup-Datei zuerst
  function backupFiles() {
    try {
      return fs.readdirSync(backupDir)
        .filter((f) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  function load() {
    let raw;
    try {
      raw = readFileSafe(dataFile);
      if (raw !== undefined) log(`Daten geladen aus ${dataFile}`);
    } catch (err) {
      // Defekte Datei NICHT überschreiben – zur Seite legen und aus dem
      // jüngsten Tages-Backup weiterarbeiten.
      const quarantine = `${dataFile}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      logError(`data.json ist unlesbar (${err.message}) – gesichert als ${path.basename(quarantine)}`);
      try { fs.renameSync(dataFile, quarantine); } catch (e) { logError('Sichern fehlgeschlagen:', e.message); }
      for (const file of backupFiles()) {
        try {
          raw = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));
          log(`Aus Backup ${file} wiederhergestellt`);
          break;
        } catch { /* nächstes Backup versuchen */ }
      }
    }
    state = migrate(raw);
    return state;
  }

  function writeNow() {
    clearTimeout(writeTimer);
    writeTimer = null;
    firstDirtyAt = 0;
    const tmp = `${dataFile}.tmp`;
    try {
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      // Synchron schreiben: die Datei ist klein und so können sich zwei
      // Schreibvorgänge nicht überholen oder gegenseitig zerschneiden.
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
      fs.renameSync(tmp, dataFile);
    } catch (err) {
      logError('Speichern fehlgeschlagen:', err.message);
      return false;
    }
    dailyBackup();
    return true;
  }

  // Einmal pro Tag eine datierte Kopie ablegen (die letzten 14 bleiben).
  function dailyBackup() {
    const stamp = new Date().toISOString().slice(0, 10);
    if (lastBackupDay === stamp) return;
    try {
      const file = path.join(backupDir, `data-${stamp}.json`);
      if (fs.existsSync(file)) { lastBackupDay = stamp; return; }
      fs.mkdirSync(backupDir, { recursive: true });
      fs.copyFileSync(dataFile, file);
      lastBackupDay = stamp;
      const old = fs.readdirSync(backupDir)
        .filter((f) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f))
        .sort();
      while (old.length > KEEP_BACKUPS) fs.unlinkSync(path.join(backupDir, old.shift()));
    } catch (err) {
      logError('Tages-Backup fehlgeschlagen:', err.message);
    }
  }

  function scheduleWrite() {
    const now = Date.now();
    if (!firstDirtyAt) firstDirtyAt = now;
    clearTimeout(writeTimer);
    const waited = now - firstDirtyAt;
    const delay = Math.max(0, Math.min(WRITE_DELAY, WRITE_MAX_DELAY - waited));
    writeTimer = setTimeout(writeNow, delay);
    if (writeTimer.unref) writeTimer.unref();
  }

  /**
   * Einzige Schreib-Schnittstelle: `fn(state)` darf den Zustand verändern.
   * Gibt `fn` explizit `false` zurück, gilt die Änderung als nicht erfolgt
   * (kein neuer rev, kein Schreibvorgang).
   */
  function commit(fn) {
    const result = fn(state);
    if (result === false) return result;
    state.rev += 1;
    state.updatedAt = new Date().toISOString();
    scheduleWrite();
    return result;
  }

  function replace(raw) {
    const next = migrate(raw);
    next.rev = state.rev + 1;
    next.updatedAt = new Date().toISOString();
    state = next;
    scheduleWrite();
    return state;
  }

  function flush() {
    if (writeTimer) return writeNow();
    return true;
  }

  // Render (und jeder andere Hoster) schickt beim Deploy SIGTERM – ohne diesen
  // Flush gingen die letzten bis zu 1,5 Sekunden an Eingaben verloren.
  function installShutdownHooks(onExit) {
    const done = (signal) => {
      flush();
      if (onExit) onExit(signal);
    };
    process.on('SIGTERM', () => done('SIGTERM'));
    process.on('SIGINT', () => done('SIGINT'));
    process.on('exit', () => { flush(); });
  }

  return {
    get state() { return state; },
    load,
    commit,
    replace,
    flush,
    installShutdownHooks,
    dataFile,
    backupDir,
  };
}

module.exports = {
  SCHEMA,
  createStore,
  migrate,
  emptyState,
  seedEvents,
  newId,
  str,
  isDate,
  normalizeTeeTime,
};
