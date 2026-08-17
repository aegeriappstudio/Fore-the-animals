'use strict';

const test = require('node:test');
const assert = require('node:assert');
const M = require('../public/shared/model.js');

const anna = { id: 'a', name: 'Anna', hcp: 15 };

// vollständige Runde: 39 Schläge, 1 Zebra, 1 Snake
const fullRound = {
  1: { gross: 5, animals: { zebra: true } },
  2: { gross: 4, animals: {} },
  3: { gross: 4, animals: {} },
  4: { gross: 3, animals: {} },
  5: { gross: 4, animals: {} },
  6: { gross: 4, animals: {} },
  7: { gross: 5, animals: { snake: true } },
  8: { gross: 6, animals: {} },
  9: { gross: 4, animals: {} },
};

test('Platz: 9 Löcher, Par 36, 2682 m', () => {
  assert.equal(M.HOLES, 9);
  assert.equal(M.PAR_TOTAL, 36);
  assert.equal(M.DIST_TOTAL, 2682);
});

test('Ziel = 36 + halbes Handicap, aufgerundet', () => {
  assert.equal(M.targetFor(15), 44);
  assert.equal(M.targetFor(14), 43);
  assert.equal(M.targetFor(0), 36);
  assert.equal(M.targetFor(36), 54);
  assert.equal(M.targetFor(-2), 35);
});

test('Punkte einer fertigen Runde: Ziel − Brutto + positive − negative Tiere', () => {
  const r = M.playerResult(anna, fullRound);
  assert.equal(r.gross, 39);
  assert.equal(r.played, 9);
  assert.equal(r.complete, true);
  assert.equal(r.pos, 1);
  assert.equal(r.neg, 1);
  assert.equal(r.points, 44 - 39 + 1 - 1);
});

test('offene Löcher zählen als Par – nicht als 0 Schläge', () => {
  const partial = Object.assign({}, fullRound);
  delete partial[8];  // Par 5
  delete partial[9];  // Par 4
  const r = M.playerResult(anna, partial);
  assert.equal(r.gross, 29);
  assert.equal(r.played, 7);
  assert.equal(r.complete, false);
  assert.equal(r.parOpen, 9);
  assert.equal(r.projected, 38);
  // Ohne Par-Projektion wären das 44 − 29 = +15 gewesen (der alte Fehler).
  assert.equal(r.points, 44 - 38 + 1 - 1);
});

test('live und Schlussresultat rechnen identisch', () => {
  const live = M.playerResult(anna, fullRound);
  const saved = M.resultsFor([anna], { a: fullRound })[0];
  assert.deepEqual(live, saved);
});

test('Gleichstand: mehr positive Tiere gewinnt, negative helfen nicht', () => {
  const rows = [
    { name: 'Viele Krokodile', points: 5, pos: 1, neg: 4, totalAnimals: 5, projected: 40 },
    { name: 'Saubere Runde', points: 5, pos: 3, neg: 0, totalAnimals: 3, projected: 40 },
  ];
  const ranked = M.ranked(rows, M.compareMain);
  assert.equal(ranked[0].name, 'Saubere Runde');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].rank, 2);
});

test('exakt gleichwertige Resultate teilen sich den Rang', () => {
  const rows = [
    { name: 'B', points: 4, pos: 1, neg: 1, totalAnimals: 2, projected: 40 },
    { name: 'A', points: 4, pos: 1, neg: 1, totalAnimals: 2, projected: 40 },
    { name: 'C', points: 2, pos: 0, neg: 0, totalAnimals: 0, projected: 42 },
  ];
  const ranked = M.ranked(rows, M.compareMain);
  assert.deepEqual(ranked.map((r) => [r.name, r.rank, r.tie]), [
    ['A', 1, true], ['B', 1, true], ['C', 3, false],
  ]);
});

test('Zweiter Preis zählt alle Tiere, Gleichstand über positive', () => {
  const rows = [
    { name: 'A', points: 1, pos: 2, neg: 2, totalAnimals: 4 },
    { name: 'B', points: 1, pos: 4, neg: 0, totalAnimals: 4 },
    { name: 'C', points: 9, pos: 1, neg: 0, totalAnimals: 1 },
  ];
  const ranked = M.ranked(rows, M.compareAnimals);
  assert.deepEqual(ranked.map((r) => r.name), ['B', 'A', 'C']);
});

test('Zebra ist auf Par 3 nicht möglich', () => {
  assert.equal(M.parFor(4), 3);
  assert.equal(M.animalAllowed('zebra', 4), false);
  assert.equal(M.animalAllowed('zebra', 1), true);
  assert.equal(M.animalAllowed('snake', 4), true);
  const entry = M.mergeEntry(null, { animals: { zebra: true } }, 4);
  assert.deepEqual(entry.animals, {});
});

test('mergeEntry ändert nur die mitgeschickten Felder', () => {
  const base = { gross: 5, animals: { zebra: true, snake: true } };
  const onlyGross = M.mergeEntry(base, { gross: 6 }, 1);
  assert.equal(onlyGross.gross, 6);
  assert.deepEqual(onlyGross.animals, { zebra: true, snake: true });

  const offSnake = M.mergeEntry(base, { animals: { snake: false } }, 1);
  assert.equal(offSnake.gross, 5);
  assert.deepEqual(offSnake.animals, { zebra: true });

  const cleared = M.mergeEntry(base, { gross: null }, 1);
  assert.equal(cleared.gross, null);
});

test('Brutto wird auf 1–20 begrenzt, Unsinn wird zu null', () => {
  assert.equal(M.normalizeGross(0), 1);
  assert.equal(M.normalizeGross(99), 20);
  assert.equal(M.normalizeGross('7'), 7);
  assert.equal(M.normalizeGross(''), null);
  assert.equal(M.normalizeGross('abc'), null);
});

test('normalizeScores wirft verwaiste Spieler und ungültige Löcher weg', () => {
  const clean = M.normalizeScores({
    a: { 1: { gross: 4, animals: {} }, 12: { gross: 4, animals: {} }, x: { gross: 3 } },
    geist: { 1: { gross: 4, animals: {} } },
  }, ['a']);
  assert.deepEqual(Object.keys(clean), ['a']);
  assert.deepEqual(Object.keys(clean.a), ['1']);
});

test('hasScores erkennt auch reine Tier-Einträge', () => {
  assert.equal(M.hasScores({}), false);
  assert.equal(M.hasScores({ 1: { gross: null, animals: {} } }), false);
  assert.equal(M.hasScores({ 1: { gross: null, animals: { snake: true } } }), true);
  assert.equal(M.hasScores({ 1: { gross: 4, animals: {} } }), true);
});

test('ewige Bestenliste gruppiert nach Spieler-ID, nicht nach Name', () => {
  // Chris spielt dieselbe Runde, hat aber ein tieferes Handicap → weniger Punkte
  const rounds = [
    {
      date: '2026-01-01T10:00:00.000Z',
      results: [
        M.playerResult({ id: 'p1', name: 'Beat', hcp: 20 }, fullRound),
        M.playerResult({ id: 'p2', name: 'Chris', hcp: 4 }, fullRound),
      ],
    },
    {
      date: '2026-02-01T10:00:00.000Z',
      // gleicher Spieler, neuer Name
      results: [
        M.playerResult({ id: 'p1', name: 'Beat Müller', hcp: 20 }, fullRound),
        M.playerResult({ id: 'p2', name: 'Chris', hcp: 4 }, fullRound),
      ],
    },
  ];
  const table = M.allTime(rounds);
  const beat = table.find((m) => m.id === 'p1');
  assert.equal(table.length, 2);
  assert.equal(beat.rounds, 2);
  assert.equal(beat.wins, 2);
  assert.equal(beat.name, 'Beat Müller'); // jüngster Name
});

test('todaysPlayers: Flight-Zuteilung oder vorhandene Scores', () => {
  const players = [
    { id: 'a', name: 'A', hcp: 10 },
    { id: 'b', name: 'B', hcp: 10 },
    { id: 'c', name: 'C', hcp: 10 },
  ];
  const flights = [{ id: 'f1', name: 'Flight 1', playerIds: ['a'] }];
  // B hat Scores, steht aber in keinem Flight (z.B. Flight gelöscht) – zählt trotzdem
  const scores = { b: { 1: { gross: 4, animals: {} } } };
  const today = M.todaysPlayers(players, flights, scores);
  assert.deepEqual(today.map((p) => p.id), ['a', 'b']);
});

test('flightProgress: fertig, gestartet, aktuelles Loch', () => {
  const flight = { id: 'f1', name: 'Flight 1', playerIds: ['a', 'b'] };
  const none = M.flightProgress(flight, {});
  assert.equal(none.started, false);
  assert.equal(none.done, 0);

  const partial = M.flightProgress(flight, {
    a: { 1: { gross: 4, animals: {} }, 2: { gross: 5, animals: {} } },
    b: { 1: { gross: 4, animals: {} } },
  });
  assert.equal(partial.done, 1);      // Loch 1 haben beide
  assert.equal(partial.current, 2);   // auf Loch 2 ist schon etwas eingetragen
  assert.equal(partial.finished, false);

  const all = {};
  ['a', 'b'].forEach((id) => {
    all[id] = {};
    for (let h = 1; h <= 9; h++) all[id][h] = { gross: 4, animals: {} };
  });
  assert.equal(M.flightProgress(flight, all).finished, true);
});

test('flightOf findet den Flight eines Spielers', () => {
  const flights = [
    { id: 'f1', playerIds: ['a'] },
    { id: 'f2', playerIds: ['b'] },
  ];
  assert.equal(M.flightOf(flights, 'b').id, 'f2');
  assert.equal(M.flightOf(flights, 'x'), null);
});

test('roundSummary nennt alle Sieger bei Gleichstand', () => {
  const round = {
    id: 'r1', name: 'Test', date: '2026-01-01T10:00:00.000Z',
    results: [
      M.playerResult({ id: 'p1', name: 'A', hcp: 10 }, fullRound),
      M.playerResult({ id: 'p2', name: 'B', hcp: 10 }, fullRound),
    ],
  };
  const summary = M.roundSummary(round);
  assert.equal(summary.playerCount, 2);
  assert.equal(summary.winners.length, 2);
});
