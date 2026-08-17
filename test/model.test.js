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

test('Spielvorgabe nach offizieller Formel (Rigi Herren Tee 27: CR 34,2 · Slope 125)', () => {
  // CH = HCP/2 × (125/113) + (34,2 − 36), WHS-gerundet – Werte aus der
  // offiziellen Course-Handicap-Tabelle 2026
  assert.equal(M.courseHandicap(15, 'rigi9', 'm', '27'), 6);
  assert.equal(M.targetFor(15, 'rigi9', 'm', '27'), 42);
  assert.equal(M.courseHandicap(0, 'rigi9', 'm', '27'), -2);   // CR unter Par
  assert.equal(M.courseHandicap(36, 'rigi9', 'm', '27'), 18);
  assert.equal(M.courseHandicap(15.1, 'rigi9', 'm', '27'), 7); // Tabellengrenze 15,1–16,8 → 7
  // Damen haben eigene Ratings (CR 37,1 · Slope 128)
  assert.equal(M.courseHandicap(15, 'rigi9', 'f', '27'), 10);
  assert.equal(M.targetFor(15, 'rigi9', 'f', '27'), 46);
});

test('WHS-Rundung: ,5 rundet aufwärts, Float-Grenzfälle exakt', () => {
  assert.equal(M.roundHalf(11.5), 12);
  assert.equal(M.roundHalf(-4.5), -4);           // Tabelle Zugersee Tee 49, HCP 0
  assert.equal(M.roundHalf(11.3 * (127 / 113) - 1.2), 12); // 11,5 trotz Float-Drift
  assert.equal(M.courseHandicap(0, 'zugersee18', 'm', '49'), -4);
});

test('Stichproben gegen die offiziellen Tabellen 2026', () => {
  assert.equal(M.courseHandicap(22.6, 'rigi9', 'm', '28'), 12);
  assert.equal(M.courseHandicap(33.9, 'zugersee18', 'f', '56'), 46);
  assert.equal(M.courseHandicap(15, 'zugersee18', 'm', '51'), 13);
  assert.equal(M.courseHandicap(30, 'zugersee18', 'f', '49'), 34);
});

test('Vorgabeschläge werden nach Stroke-Index verteilt', () => {
  // HCP 15, Rigi Herren Tee 27 → Spielvorgabe 6: die 6 schwersten Löcher
  // (Index 1–11) bekommen einen Schlag, die drei leichtesten gehen leer aus.
  const s6 = M.strokesFor(15, 'rigi9', 'm', '27');
  assert.equal(Object.values(s6).reduce((a, b) => a + b, 0), 6);
  assert.equal(s6[5], 0);  // Index 17
  assert.equal(s6[6], 0);  // Index 15
  assert.equal(s6[8], 0);  // Index 13
  assert.equal(s6[7], 1);  // Index 1 – schwerstes Loch
  // HCP 54 → Spielvorgabe 28: dreimal rundum plus 1 aufs schwerste Loch
  const s28 = M.strokesFor(54, 'rigi9', 'm', '27');
  assert.equal(Object.values(s28).reduce((a, b) => a + b, 0), 28);
  assert.equal(s28[7], 4);
  // Plus-Handicap: Schläge werden ab dem leichtesten Loch zurückgegeben
  const sMinus = M.strokesFor(-2, 'rigi9', 'm', '27'); // Spielvorgabe −3
  assert.equal(sMinus[5], -1);
  assert.equal(sMinus[7], 0);
});

test('Punkte einer fertigen Runde: Ziel − Brutto + positive − negative Tiere', () => {
  const r = M.playerResult(anna, fullRound); // Rigi, Herren, Tee 27 → Ziel 42
  assert.equal(r.target, 42);
  assert.equal(r.gross, 39);
  assert.equal(r.played, 9);
  assert.equal(r.complete, true);
  assert.equal(r.pos, 1);
  assert.equal(r.neg, 1);
  assert.equal(r.points, 42 - 39 + 1 - 1);
});

test('offene Löcher zählen als Netto-Par und sind punkteneutral', () => {
  const partial = Object.assign({}, fullRound);
  delete partial[8];  // Par 5, kein Vorgabeschlag (Index 13, Spielvorgabe 6)
  delete partial[9];  // Par 4, 1 Vorgabeschlag (Index 7)
  const r = M.playerResult(anna, partial);
  assert.equal(r.gross, 29);
  assert.equal(r.played, 7);
  assert.equal(r.complete, false);
  assert.equal(r.parOpen, 5 + 0 + 4 + 1); // Netto-Par beider offener Löcher
  assert.equal(r.projected, 29 + 10);
  assert.equal(r.points, 42 - 39 + 1 - 1);
});

test('gar nichts eingetragen → exakt 0 Punkte (abbrechen lohnt sich nicht)', () => {
  // Der alte Par-Ansatz gab hier +8 – je höher das Handicap, desto mehr.
  const r = M.playerResult(anna, {});
  assert.equal(r.points, 0);
  const hoch = M.playerResult({ id: 'x', name: 'X', hcp: 30 }, {});
  assert.equal(hoch.points, 0);
});

test('pro Loch zählt höchstens Netto-Doppelbogey', () => {
  // Anna (HCP 15, Vorgabe 6) hat auf Loch 1 (Par 4, 1 Vorgabeschlag) den Deckel bei 7
  const blowUp = Object.assign({}, fullRound, { 1: { gross: 12, animals: { zebra: true } } });
  const r = M.playerResult(anna, blowUp);
  assert.equal(r.gross, 39 - 5 + 12);   // eingetragen bleibt die echte Zahl
  assert.equal(r.adjusted, 39 - 5 + 7); // gewertet wird der Deckel
  assert.equal(r.cappedHoles, 1);
  assert.equal(r.points, 42 - 41 + 1 - 1);
});

test('Countback: letzte 6, dann letzte 3, dann letztes Loch (netto)', () => {
  // Zwei identische Punktzahlen und Tiere – B ist auf den letzten 3 besser
  const a = M.playerResult({ id: 'a', name: 'A', hcp: 0 }, {
    1: { gross: 4, animals: {} }, 2: { gross: 4, animals: {} }, 3: { gross: 4, animals: {} },
    4: { gross: 3, animals: {} }, 5: { gross: 4, animals: {} }, 6: { gross: 4, animals: {} },
    7: { gross: 5, animals: {} }, 8: { gross: 5, animals: {} }, 9: { gross: 4, animals: {} },
  });
  const b = M.playerResult({ id: 'b', name: 'B', hcp: 0 }, {
    1: { gross: 5, animals: {} }, 2: { gross: 4, animals: {} }, 3: { gross: 4, animals: {} },
    4: { gross: 3, animals: {} }, 5: { gross: 4, animals: {} }, 6: { gross: 4, animals: {} },
    7: { gross: 4, animals: {} }, 8: { gross: 5, animals: {} }, 9: { gross: 4, animals: {} },
  });
  assert.equal(a.points, b.points);
  // HCP 0 hat Spielvorgabe −2 (CR unter Par): auf den zwei leichtesten
  // Löchern (5 und 6) wird je ein Schlag abgezogen → netto +1 dort
  assert.equal(a.cb6, 27);
  assert.equal(b.cb6, 26);             // B war auf den letzten 6 besser …
  const ranked = M.ranked([a, b], M.compareMain);
  assert.equal(ranked[0].name, 'B');   // … und gewinnt darum den Gleichstand
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].rank, 2);
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

test('todaysPlayers: anwesend markiert oder vorhandene Scores', () => {
  const players = [
    { id: 'a', name: 'A', hcp: 10, present: true },
    { id: 'b', name: 'B', hcp: 10, present: false },
    { id: 'c', name: 'C', hcp: 10, present: false },
  ];
  // B hat Scores, ist aber (versehentlich) abgemeldet – zählt trotzdem
  const scores = { b: { 1: { gross: 4, animals: {} } } };
  const today = M.todaysPlayers(players, scores);
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

test('Zugersee: 18 Loch, Par 72, ganzes Handicap im Ziel', () => {
  assert.equal(M.courseById('zugersee18').holeCount, 18);
  assert.equal(M.courseById('zugersee18').par, 72);
  // Standard-Tees: Herren 51 (CR 68,2 · Slope 125), Rigi Herren 27
  assert.equal(M.targetFor(15, 'zugersee18'), 85);   // volles HCP: CH 13
  assert.equal(M.targetFor(15, 'rigi9'), 42);        // halbes HCP: CH 6
  assert.equal(M.courseHandicap(14.4, 'zugersee18'), 12);
});

test('Zugersee: Vorgabeschläge über 18 Löcher nach Stroke-Index', () => {
  const s = M.strokesFor(15, 'zugersee18'); // Spielvorgabe 13 (Herren Tee 51)
  assert.equal(Object.values(s).reduce((a, b) => a + b, 0), 13);
  assert.equal(s[5], 1);   // Index 1 – bekommt einen Schlag
  assert.equal(s[10], 0);  // Index 18 – geht leer aus
  assert.equal(s[15], 0);  // Index 16 – ebenfalls
  const s54 = M.strokesFor(54, 'zugersee18'); // Spielvorgabe 56
  assert.equal(Object.values(s54).reduce((a, b) => a + b, 0), 56);
});

test('Zugersee: leere Runde ist punkteneutral, Loch 10-18 gültig', () => {
  const r = M.playerResult({ id: 'x', name: 'X', hcp: 20 }, {}, 'zugersee18');
  assert.equal(r.points, 0);
  assert.equal(r.complete, false);
  assert.equal(M.normalizeHole(18, 'zugersee18'), 18);
  assert.equal(M.normalizeHole(18, 'rigi9'), null);
  // Zebra auf den Par-3-Löchern des Zugersees nicht möglich
  assert.equal(M.animalAllowed('zebra', 11, 'zugersee18'), false);
  assert.equal(M.animalAllowed('zebra', 12, 'zugersee18'), true);
});

test('setCourse steuert die Getter, courseId-Argumente stechen', () => {
  M.setCourse('zugersee18');
  assert.equal(M.HOLES, 18);
  assert.equal(M.PAR_TOTAL, 72);
  assert.equal(M.targetFor(15), 85);
  assert.equal(M.targetFor(15, 'rigi9'), 42); // explizit gewinnt
  M.setCourse('rigi9');
  assert.equal(M.HOLES, 9);
});

test('Geschlecht und Tee fliessen ins Resultat ein', () => {
  const lady = { id: 'l', name: 'Lea', hcp: 15, gender: 'f' };
  const r = M.playerResult(lady, {}, 'rigi9', { m: '27', f: '27' });
  assert.equal(r.target, 46);   // Damen Tee 27: CR 37,1 · Slope 128 → CH 10
  assert.equal(r.gender, 'f');
  assert.equal(r.tee, '27');
  assert.equal(r.points, 0);    // leer bleibt neutral
  // Anderes Tee = andere Vorgabe
  const r49 = M.playerResult({ id: 'x', name: 'X', hcp: 15, gender: 'm' }, {}, 'zugersee18', { m: '49', f: '49' });
  assert.equal(r49.target, 72 + M.courseHandicap(15, 'zugersee18', 'm', '49'));
});
