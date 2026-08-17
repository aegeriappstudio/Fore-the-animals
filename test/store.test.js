'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createStore, migrate } = require('../lib/store.js');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fta-store-'));
}

// So sah eine data.json der alten Version aus.
const legacy = {
  players: [
    { id: 'p1', name: 'Anna', hcp: 15, present: true },
    { id: 'p2', name: 'Beat', hcp: 20 },              // ohne present-Feld
  ],
  flights: [
    { id: 'f1', name: 'Flight 1', playerIds: ['p1', 'p2', 'weg'] },
    { id: 'f2', name: 'Flight 2', playerIds: ['p2'] }, // p2 doppelt zugeteilt
  ],
  scores: {
    p1: { 1: { gross: 4, animals: { zebra: true } } },
    geist: { 1: { gross: 3, animals: {} } },           // Spieler existiert nicht mehr
  },
  archive: [{
    id: 'r1',
    name: 'Alte Runde',
    date: '2026-01-01T18:00:00.000Z',
    // damals falsch berechnet: 5 fehlende Löcher zählten als 0 Schläge
    results: [{ id: 'p1', name: 'Anna', hcp: 15, target: 44, gross: 17, played: 4, pos: 0, neg: 0, points: 27 }],
    players: [{ id: 'p1', name: 'Anna', hcp: 15, present: true }],
    scores: {
      p1: {
        1: { gross: 4, animals: {} }, 2: { gross: 4, animals: {} },
        3: { gross: 4, animals: {} }, 4: { gross: 5, animals: { snake: true } },
      },
    },
  }],
  events: [{ id: 'ev1', name: 'Termin', date: '2026-08-06', confirmed: true, playerIds: ['p1', 'weg'] }],
  version: 42,
};

test('Migration: alte Datei wird vollständig übernommen', () => {
  const state = migrate(legacy);
  assert.equal(state.schema, 6);
  assert.equal(state.rev, 42);            // aus `version`
  assert.equal(state.players.length, 2);
});

test('Migration: courseId auf Zustand und Runden (alte Daten = Rigi 9)', () => {
  const state = migrate(legacy);
  assert.equal(state.courseId, 'rigi9');
  assert.equal(state.rounds[0].courseId, 'rigi9');

  // 18-Loch-Zustand bleibt erhalten, Scores bis Loch 18 gültig
  const z = migrate({
    courseId: 'zugersee18',
    players: [{ id: 'p1', name: 'Anna', hcp: 15, present: true }],
    scores: { p1: { 18: { gross: 5, animals: {} }, 19: { gross: 4, animals: {} } } },
  });
  assert.equal(z.courseId, 'zugersee18');
  assert.deepEqual(Object.keys(z.scores.p1), ['18']); // Loch 19 gibt es nicht
});

test('Migration: fehlendes present wird aus Flights/Scores hergeleitet', () => {
  const state = migrate({
    players: [
      { id: 'p1', name: 'Im Flight', hcp: 10 },
      { id: 'p2', name: 'Mit Scores', hcp: 10 },
      { id: 'p3', name: 'Weder noch', hcp: 10 },
      { id: 'p4', name: 'Explizit weg', hcp: 10, present: false },
    ],
    flights: [{ id: 'f1', name: 'Flight 1', playerIds: ['p1'] }],
    scores: { p2: { 1: { gross: 4, animals: {} } } },
  });
  const byId = Object.fromEntries(state.players.map((p) => [p.id, p.present]));
  assert.deepEqual(byId, { p1: true, p2: true, p3: false, p4: false });
});

test('Migration: verwaiste Scores und Flight-Zuteilungen verschwinden', () => {
  const state = migrate(legacy);
  assert.deepEqual(Object.keys(state.scores).sort(), ['p1', 'p2']);
  assert.deepEqual(state.flights[0].playerIds, ['p1', 'p2']);
  assert.deepEqual(state.flights[1].playerIds, []); // p2 nur einmal
  assert.equal(state.events[0].playerIds, undefined); // Anmeldungen verworfen
});

test('Migration: falsch berechnete Archiv-Resultate werden korrigiert', () => {
  const state = migrate(legacy);
  const result = state.rounds[0].results[0];
  // Anna HCP 15, Herren Tee 27 → offizielle Spielvorgabe 6, Ziel 42.
  // 4 gespielte Löcher (17 Schläge, unter dem Deckel) + 5 offene Löcher als
  // Netto-Par: Par 4+4+4+5+4 = 21 plus 2 Vorgabeschläge (Löcher 7 und 9) = 23
  assert.equal(result.target, 42);
  assert.equal(result.gross, 17);
  assert.equal(result.played, 4);
  assert.equal(result.parOpen, 23);
  assert.equal(result.neg, 1);
  assert.equal(result.points, 42 - 40 - 1); // = 1 statt der gespeicherten 27
});

test('Migration: Wertungs-Tees und Geschlecht mit Defaults', () => {
  const state = migrate(legacy);
  assert.deepEqual(state.tees, { m: '27', f: '27' });          // Rigi-Standard
  assert.ok(state.players.every((p) => p.gender === 'm'));     // Altbestand: Herren
  assert.deepEqual(state.rounds[0].tees, { m: '27', f: '27' }); // Runden-Schnappschuss

  const z = migrate({ courseId: 'zugersee18', players: [], tees: { m: '58', f: 'quatsch' } });
  assert.deepEqual(z.tees, { m: '58', f: '49' }); // ungültiges Tee → Standard
});

test('Migration: Backup ohne Loch-Scores behält die alten Punkte', () => {
  const state = migrate({
    players: [],
    archive: [{ id: 'r9', name: 'Sehr alt', date: '2026-01-01T18:00:00.000Z', results: [{ id: 'x', name: 'X', hcp: 10, target: 41, gross: 40, pos: 2, neg: 1, points: 2 }] }],
  });
  assert.equal(state.rounds[0].results[0].points, 2);
});

test('Speichern und erneutes Laden ergibt denselben Zustand', () => {
  const dir = tmpDir();
  const store = createStore({ dataDir: dir, log: false });
  store.load();
  store.commit((s) => { s.players.push({ id: 'p1', name: 'Anna', hcp: 12, present: true }); });
  store.flush();

  const again = createStore({ dataDir: dir, log: false });
  const state = again.load();
  assert.equal(state.players.length, 1);
  assert.equal(state.players[0].name, 'Anna');
  assert.ok(state.rev >= 1);
});

test('commit erhöht rev nur bei echter Änderung', () => {
  const store = createStore({ dataDir: tmpDir(), log: false });
  store.load();
  const before = store.state.rev;
  store.commit(() => false);
  assert.equal(store.state.rev, before);
  store.commit((s) => { s.players.push({ id: 'x', name: 'X', hcp: 0, present: true }); });
  assert.equal(store.state.rev, before + 1);
});

test('defekte data.json wird zur Seite gelegt und aus dem Backup geholt', () => {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, 'backups'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'backups', 'data-2026-08-01.json'), JSON.stringify({
    players: [{ id: 'p1', name: 'Gerettet', hcp: 10, present: true }],
  }));
  fs.writeFileSync(path.join(dir, 'data.json'), '{ kaputt');

  const store = createStore({ dataDir: dir, log: false });
  const state = store.load();
  assert.equal(state.players[0].name, 'Gerettet');
  // Die kaputte Datei ist erhalten geblieben, nicht überschrieben
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('data.json.corrupt-')));
});

test('replace ersetzt den Zustand und zählt rev hoch', () => {
  const store = createStore({ dataDir: tmpDir(), log: false });
  store.load();
  store.commit((s) => { s.players.push({ id: 'a', name: 'A', hcp: 0, present: true }); });
  const before = store.state.rev;
  const next = store.replace({ players: [{ id: 'b', name: 'B', hcp: 5, present: true }] });
  assert.equal(next.players.length, 1);
  assert.equal(next.players[0].name, 'B');
  assert.equal(next.rev, before + 1);
});
