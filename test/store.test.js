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
  assert.equal(state.schema, 4);
  assert.equal(state.rev, 42);            // aus `version`
  assert.equal(state.players.length, 2);
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
  // 4 gespielte Löcher (17 Schläge, alle unter dem Deckel) + 5 offene Löcher
  // als Netto-Par: Par 4+4+4+5+4 = 21 plus 4 Vorgabeschläge (Loch 5 hat bei
  // Spielvorgabe 8 keinen) = 25
  assert.equal(result.gross, 17);
  assert.equal(result.played, 4);
  assert.equal(result.parOpen, 25);
  assert.equal(result.neg, 1);
  assert.equal(result.points, 44 - 42 - 1); // = 1 statt der gespeicherten 27
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
