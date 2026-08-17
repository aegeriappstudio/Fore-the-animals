/**
 * Fore the Animals! – gemeinsames Domain-Modell
 *
 * Diese Datei ist die EINZIGE Quelle für Platzdaten, Tiere, Ziel- und
 * Punkteberechnung sowie für die Sortierung der Ranglisten. Sie läuft
 * unverändert im Browser (als klassisches <script>, Namensraum `FTA`) und im
 * Server (`require('./public/shared/model.js')`) – so können Live-Rangliste
 * und gespeichertes Resultat gar nicht mehr auseinanderlaufen.
 *
 * Plätze: Es gibt mehrere Plätze (Rigi 9 Loch, Zugersee 18 Loch). Der aktive
 * Platz wird mit `setCourse(id)` gesetzt; `COURSE`, `HOLES`, `PAR_TOTAL` sind
 * Getter auf den aktiven Platz. Alle Rechenfunktionen nehmen optional eine
 * courseId entgegen – damit lassen sich archivierte Runden immer mit dem
 * Platz auswerten, auf dem sie gespielt wurden.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FTA = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Plätze – Golfpark Holzhäusern
  // dists: Meter pro Abschlag (Tee), Schlüssel = Tee-Bezeichnung
  // hcpShare: Anteil des Handicaps im Ziel (9 Loch = halbes, 18 Loch = ganzes)
  // -------------------------------------------------------------------------
  var COURSES = [
    {
      id: 'rigi9',
      name: 'Rigi',
      label: 'Rigi · 9 Loch',
      hcpShare: 0.5,
      tees: ['27'],
      defaultTee: '27',
      holes: [
        { hole: 1, par: 4, index: 9, dists: { 27: 295 } },
        { hole: 2, par: 4, index: 3, dists: { 27: 333 } },
        { hole: 3, par: 4, index: 11, dists: { 27: 254 } },
        { hole: 4, par: 3, index: 5, dists: { 27: 165 } },
        { hole: 5, par: 4, index: 17, dists: { 27: 262 } },
        { hole: 6, par: 4, index: 15, dists: { 27: 274 } },
        { hole: 7, par: 4, index: 1, dists: { 27: 357 } },
        { hole: 8, par: 5, index: 13, dists: { 27: 422 } },
        { hole: 9, par: 4, index: 7, dists: { 27: 320 } },
      ],
    },
    {
      id: 'zugersee18',
      name: 'Zugersee',
      label: 'Zugersee · 18 Loch',
      hcpShare: 1,
      tees: ['58', '56', '51', '49'],
      defaultTee: '51',
      holes: [
        { hole: 1, par: 4, index: 7, dists: { 58: 355, 56: 339, 51: 306, 49: 292 } },
        { hole: 2, par: 4, index: 3, dists: { 58: 338, 56: 322, 51: 298, 49: 293 } },
        { hole: 3, par: 5, index: 13, dists: { 58: 451, 56: 440, 51: 390, 49: 381 } },
        { hole: 4, par: 3, index: 9, dists: { 58: 179, 56: 167, 51: 142, 49: 136 } },
        { hole: 5, par: 4, index: 1, dists: { 58: 307, 56: 292, 51: 277, 49: 263 } },
        { hole: 6, par: 4, index: 5, dists: { 58: 338, 56: 321, 51: 305, 49: 291 } },
        { hole: 7, par: 4, index: 15, dists: { 58: 314, 56: 307, 51: 275, 49: 265 } },
        { hole: 8, par: 3, index: 17, dists: { 58: 120, 56: 113, 51: 100, 49: 90 } },
        { hole: 9, par: 4, index: 11, dists: { 58: 299, 56: 299, 51: 292, 49: 285 } },
        { hole: 10, par: 5, index: 18, dists: { 58: 438, 56: 420, 51: 357, 49: 348 } },
        { hole: 11, par: 3, index: 14, dists: { 58: 163, 56: 163, 51: 144, 49: 132 } },
        { hole: 12, par: 4, index: 2, dists: { 58: 374, 56: 361, 51: 336, 49: 317 } },
        { hole: 13, par: 4, index: 10, dists: { 58: 348, 56: 332, 51: 310, 49: 292 } },
        { hole: 14, par: 4, index: 4, dists: { 58: 345, 56: 325, 51: 301, 49: 286 } },
        { hole: 15, par: 3, index: 16, dists: { 58: 138, 56: 138, 51: 118, 49: 118 } },
        { hole: 16, par: 5, index: 6, dists: { 58: 464, 56: 452, 51: 395, 49: 373 } },
        { hole: 17, par: 5, index: 12, dists: { 58: 492, 56: 475, 51: 425, 49: 414 } },
        { hole: 18, par: 4, index: 8, dists: { 58: 352, 56: 352, 51: 331, 49: 331 } },
      ],
    },
  ];
  var DEFAULT_COURSE = 'rigi9';

  // Abgeleitete Werte pro Platz einmal vorberechnen
  COURSES.forEach(function (c) {
    c.par = c.holes.reduce(function (s, h) { return s + h.par; }, 0);
    c.holeCount = c.holes.length;
    // Löcher in der Reihenfolge, in der Vorgabeschläge verteilt werden
    // (schwerstes Loch = tiefster Stroke-Index zuerst)
    c.strokeOrder = c.holes.slice().sort(function (a, b) { return a.index - b.index; })
      .map(function (h) { return h.hole; });
    c.distTotals = {};
    c.tees.forEach(function (tee) {
      c.distTotals[tee] = c.holes.reduce(function (s, h) { return s + (h.dists[tee] || 0); }, 0);
    });
  });

  function courseById(id) {
    return COURSES.find(function (c) { return c.id === id; }) || null;
  }

  var current = courseById(DEFAULT_COURSE);

  function setCourse(id) {
    current = courseById(id) || courseById(DEFAULT_COURSE);
    return current;
  }

  // courseId-Argumente sind überall optional – ohne gilt der aktive Platz.
  function resolve(courseId) {
    return (courseId && courseById(courseId)) || current;
  }

  var MIN_GROSS = 1;
  var MAX_GROSS = 20;
  var MIN_HCP = -10;
  var MAX_HCP = 54;

  // -------------------------------------------------------------------------
  // Tiere (Texte/Beschreibungen liegen in der i18n-Datei)
  // -------------------------------------------------------------------------
  var ANIMALS = [
    { key: 'zebra', emoji: '🦓', name: 'Zebra', type: 'pos', par3: false },
    { key: 'giraffe', emoji: '🦒', name: 'Giraffe', type: 'pos', par3: true },
    { key: 'rabbit', emoji: '🐇', name: 'Rabbit', type: 'pos', par3: true },
    { key: 'scorpion', emoji: '🦂', name: 'Scorpion', type: 'neg', par3: true },
    { key: 'crocodile', emoji: '🐊', name: 'Crocodile', type: 'neg', par3: true },
    { key: 'snake', emoji: '🐍', name: 'Snake', type: 'neg', par3: true },
  ];
  var ANIMAL_KEYS = ANIMALS.map(function (a) { return a.key; });
  var POS_KEYS = ANIMALS.filter(function (a) { return a.type === 'pos'; }).map(function (a) { return a.key; });
  var NEG_KEYS = ANIMALS.filter(function (a) { return a.type === 'neg'; }).map(function (a) { return a.key; });

  function holeDef(hole, courseId) {
    return resolve(courseId).holes[Number(hole) - 1] || null;
  }

  function parFor(hole, courseId) {
    var h = holeDef(hole, courseId);
    return h ? h.par : null;
  }

  function distFor(hole, tee, courseId) {
    var h = holeDef(hole, courseId);
    return h ? h.dists[tee] || null : null;
  }

  // Zebra (Fairway getroffen) gibt es auf Par 3 nicht.
  function animalAllowed(key, hole, courseId) {
    var def = ANIMALS.find(function (a) { return a.key === key; });
    if (!def) return false;
    return def.par3 || parFor(hole, courseId) !== 3;
  }

  // -------------------------------------------------------------------------
  // Normalisierung – jede Eingabe läuft hier durch, egal ob von der API, aus
  // einem Backup oder aus einer alten data.json.
  // -------------------------------------------------------------------------
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function normalizeHcp(value) {
    var n = Number(value);
    if (!isFinite(n)) return 0;
    return clamp(Math.round(n * 10) / 10, MIN_HCP, MAX_HCP);
  }

  // gibt null (kein Score) oder eine gültige Schlagzahl zurück
  function normalizeGross(value) {
    if (value === null || value === undefined || value === '') return null;
    var n = parseInt(value, 10);
    if (!isFinite(n)) return null;
    return clamp(n, MIN_GROSS, MAX_GROSS);
  }

  function normalizeHole(value, courseId) {
    var n = parseInt(value, 10);
    return n >= 1 && n <= resolve(courseId).holeCount ? n : null;
  }

  function normalizeAnimals(raw, hole, courseId) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    ANIMAL_KEYS.forEach(function (key) {
      if (raw[key] && (hole == null || animalAllowed(key, hole, courseId))) out[key] = true;
    });
    return out;
  }

  // {gross, animals} – leere Einträge werden als null zurückgegeben, damit sie
  // gar nicht erst gespeichert werden.
  function normalizeEntry(raw, hole, courseId) {
    if (!raw || typeof raw !== 'object') return null;
    var gross = normalizeGross(raw.gross);
    var animals = normalizeAnimals(raw.animals, hole, courseId);
    if (gross === null && Object.keys(animals).length === 0) return null;
    return { gross: gross, animals: animals };
  }

  // scores[playerId][hole] = {gross, animals}
  function normalizeScores(raw, validPlayerIds, courseId) {
    var valid = validPlayerIds ? new Set(validPlayerIds) : null;
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (pid) {
      if (valid && !valid.has(pid)) return;         // verwaiste Scores entfernen
      var byHole = raw[pid];
      if (!byHole || typeof byHole !== 'object') return;
      var clean = {};
      Object.keys(byHole).forEach(function (rawHole) {
        var hole = normalizeHole(rawHole, courseId);
        if (hole === null) return;
        var entry = normalizeEntry(byHole[rawHole], hole, courseId);
        if (entry) clean[hole] = entry;
      });
      out[pid] = clean;
    });
    return out;
  }

  // Score-Eintrag zusammenführen: nur mitgeschickte Felder werden geändert.
  function mergeEntry(current_, patch, hole, courseId) {
    var base = current_ && typeof current_ === 'object' ? current_ : { gross: null, animals: {} };
    var next = { gross: base.gross === undefined ? null : base.gross, animals: {} };
    ANIMAL_KEYS.forEach(function (key) {
      if (base.animals && base.animals[key]) next.animals[key] = true;
    });
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'gross')) {
      next.gross = normalizeGross(patch.gross);
    }
    if (patch && patch.animals && typeof patch.animals === 'object') {
      ANIMAL_KEYS.forEach(function (key) {
        if (!Object.prototype.hasOwnProperty.call(patch.animals, key)) return;
        if (patch.animals[key] && animalAllowed(key, hole, courseId)) next.animals[key] = true;
        else delete next.animals[key];
      });
    }
    return next;
  }

  // -------------------------------------------------------------------------
  // Ziel, Vorgabeschläge & Punkte – die eine Formel
  // -------------------------------------------------------------------------

  // Kaufmännisch runden (±0,5 weg von Null): 7,05 → 7 · 7,5 → 8.
  function roundHalf(x) {
    return Math.sign(x) * Math.round(Math.abs(x));
  }

  // Ziel = Platz-Par + Handicap-Anteil (9 Loch: halbes, 18 Loch: ganzes HCP)
  function targetFor(hcp, courseId) {
    var c = resolve(courseId);
    return c.par + roundHalf(normalizeHcp(hcp) * c.hcpShare);
  }

  // Spielvorgabe für den Platz (= Ziel − Par)
  function courseHandicap(hcp, courseId) {
    var c = resolve(courseId);
    return targetFor(hcp, c.id) - c.par;
  }

  /**
   * Vorgabeschläge pro Loch, verteilt nach Stroke-Index (wie im offiziellen
   * Handicap-System): Schlag 1 aufs schwerste Loch, danach der Reihe nach,
   * dann wieder von vorn. Plus-Handicaps geben Schläge zurück, beginnend beim
   * leichtesten Loch. Rückgabe: {loch: schläge}.
   */
  function strokesFor(hcp, courseId) {
    var c = resolve(courseId);
    var ch = courseHandicap(hcp, c.id);
    var per = {};
    c.holes.forEach(function (h) { per[h.hole] = 0; });
    var order = ch >= 0 ? c.strokeOrder : c.strokeOrder.slice().reverse();
    var n = Math.abs(ch);
    for (var s = 0; s < n; s++) per[order[s % c.holeCount]] += ch >= 0 ? 1 : -1;
    return per;
  }

  // Höchstes zählendes Ergebnis pro Loch: Netto-Doppelbogey
  // (Par + 2 + Vorgabeschläge, wie im offiziellen Handicap-System).
  function capFor(hole, strokes, courseId) {
    return parFor(hole, courseId) + 2 + (strokes || 0);
  }

  /**
   * Resultat eines Spielers.
   *
   * Punkte = Ziel − gewertetes Brutto + positive Tiere − negative Tiere
   *
   *  - Pro Loch zählt höchstens Netto-Doppelbogey (Par + 2 + Vorgabeschläge);
   *    eingetragen bleibt die echte Schlagzahl (`gross`), gewertet wird
   *    `adjusted`.
   *  - Offene Löcher zählen als Netto-Par (Par + Vorgabeschläge) und sind
   *    damit exakt punkteneutral.
   *  - `cb6/cb3/cb1` sind die Netto-Summen der letzten 6/3/1 Löcher für den
   *    Countback beim Gleichstand.
   *
   * Live-Ansicht und Archiv rechnen identisch.
   */
  function playerResult(player, byHole, courseId) {
    var c = resolve(courseId);
    var scores = byHole || {};
    var strokes = strokesFor(player.hcp, c.id);
    var gross = 0;
    var adjusted = 0;
    var openNet = 0;
    var played = 0;
    var cappedHoles = 0;
    var pos = 0;
    var neg = 0;
    var counts = {};
    var netByHole = {};
    ANIMAL_KEYS.forEach(function (key) { counts[key] = 0; });

    c.holes.forEach(function (h) {
      var st = strokes[h.hole];
      var entry = scores[h.hole] || scores[String(h.hole)];
      var g = entry ? normalizeGross(entry.gross) : null;
      if (g !== null) {
        var counted = Math.min(g, capFor(h.hole, st, c.id));
        if (counted < g) cappedHoles += 1;
        gross += g;
        adjusted += counted;
        played += 1;
        netByHole[h.hole] = counted - st;
      } else {
        openNet += h.par + st;      // Netto-Par: punkteneutral
        netByHole[h.hole] = h.par;  // im Countback ebenfalls neutral
      }
      if (entry && entry.animals) {
        ANIMAL_KEYS.forEach(function (key) {
          if (!entry.animals[key]) return;
          counts[key] += 1;
          if (POS_KEYS.indexOf(key) !== -1) pos += 1; else neg += 1;
        });
      }
    });

    function lastHoles(from) {
      var sum = 0;
      for (var hole = from; hole <= c.holeCount; hole++) sum += netByHole[hole];
      return sum;
    }

    var target = targetFor(player.hcp, c.id);
    var projected = adjusted + openNet;
    return {
      id: player.id,
      name: player.name,
      hcp: normalizeHcp(player.hcp),
      target: target,
      gross: gross,
      adjusted: adjusted,
      cappedHoles: cappedHoles,
      played: played,
      complete: played === c.holeCount,
      parOpen: openNet,
      projected: projected,
      pos: pos,
      neg: neg,
      counts: counts,
      totalAnimals: pos + neg,
      points: target - projected + pos - neg,
      cb6: lastHoles(c.holeCount - 5),
      cb3: lastHoles(c.holeCount - 2),
      cb1: lastHoles(c.holeCount),
    };
  }

  function resultsFor(players, scores, courseId) {
    var all = scores || {};
    return (players || []).map(function (p) { return playerResult(p, all[p.id], courseId); });
  }

  // -------------------------------------------------------------------------
  // Sortierung & Ränge
  // -------------------------------------------------------------------------
  function byName(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''), 'de');
  }

  // Hauptwertung: Punkte, dann mehr positive Tiere, dann weniger negative,
  // dann Countback wie im Golf üblich (letzte 6 Löcher, letzte 3, letztes
  // Loch – jeweils netto, tiefer gewinnt). Sehr alte Archiv-Einträge ohne
  // Countback-Felder gelten in diesem Kriterium als gleich.
  // Der Name gehört bewusst NICHT dazu: Gibt die Funktion 0 zurück, ist es ein
  // echter Gleichstand und beide teilen sich den Rang.
  function compareMain(a, b) {
    return (b.points - a.points)
      || (b.pos - a.pos)
      || (a.neg - b.neg)
      || ((a.cb6 || 0) - (b.cb6 || 0))
      || ((a.cb3 || 0) - (b.cb3 || 0))
      || ((a.cb1 || 0) - (b.cb1 || 0));
  }

  // Zweiter Preis: meiste gesammelte Tiere insgesamt (positive wie negative –
  // so steht es in den Turnierregeln), Gleichstand über positive Tiere.
  function compareAnimals(a, b) {
    return (b.totalAnimals - a.totalAnimals)
      || (b.pos - a.pos)
      || (b.points - a.points);
  }

  // Sortiert und vergibt Ränge; exakt gleichwertige Resultate teilen sich den
  // Rang (1, 1, 3). Innerhalb eines Gleichstands wird alphabetisch sortiert,
  // damit die Reihenfolge stabil bleibt.
  function ranked(rows, compare) {
    var cmp = compare || compareMain;
    var sorted = (rows || []).slice().sort(function (a, b) { return cmp(a, b) || byName(a, b); });
    var out = [];
    var rank = 0;
    sorted.forEach(function (row, i) {
      var prev = sorted[i - 1];
      var tie = !!prev && cmp(prev, row) === 0;
      if (!tie) rank = i + 1;
      out.push(Object.assign({}, row, { rank: rank, tie: tie }));
    });
    // nachgelagert markieren, dass auch der erste einer Gruppe geteilt ist
    out.forEach(function (row, i) {
      if (out[i + 1] && out[i + 1].rank === row.rank) row.tie = true;
    });
    return out;
  }

  // -------------------------------------------------------------------------
  // Runden & ewige Bestenliste
  // -------------------------------------------------------------------------
  // Ränge einer gespeicherten Runde – Sieger ist alles mit Rang 1.
  function roundStandings(round) {
    return ranked((round && round.results) || [], compareMain);
  }

  function roundSummary(round) {
    var standings = roundStandings(round);
    var winners = standings.filter(function (r) { return r.rank === 1; });
    return {
      id: round.id,
      name: round.name,
      date: round.date,
      eventId: round.eventId || null,
      courseId: round.courseId || DEFAULT_COURSE,
      playerCount: standings.length,
      winners: winners.map(function (w) { return { id: w.id, name: w.name, points: w.points }; }),
    };
  }

  /**
   * Ewige Bestenliste über alle gespeicherten Runden.
   * Gruppiert nach Spieler-ID; der zuletzt verwendete Name wird angezeigt.
   */
  function allTime(rounds) {
    var map = new Map();
    var ordered = (rounds || []).slice().sort(function (a, b) {
      return String(a.date || '').localeCompare(String(b.date || ''));
    });

    ordered.forEach(function (round) {
      roundStandings(round).forEach(function (r) {
        var key = r.id || ('name:' + r.name);
        var m = map.get(key);
        if (!m) {
          m = { key: key, id: r.id || null, name: r.name, rounds: 0, wins: 0, podiums: 0, animals: 0, pos: 0, neg: 0, points: 0, best: null };
          map.set(key, m);
        }
        m.name = r.name; // jüngster bekannter Name gewinnt
        m.rounds += 1;
        if (r.rank === 1) m.wins += 1;
        if (r.rank <= 3) m.podiums += 1;
        m.animals += r.totalAnimals;
        m.pos += r.pos;
        m.neg += r.neg;
        m.points += r.points;
        m.best = m.best === null ? r.points : Math.max(m.best, r.points);
      });
    });

    return Array.from(map.values()).map(function (m) {
      return Object.assign({}, m, { avg: m.rounds ? Math.round((m.points / m.rounds) * 10) / 10 : 0 });
    }).sort(function (a, b) {
      return (b.wins - a.wins) || (b.avg - a.avg) || (b.best - a.best) || (b.rounds - a.rounds) || byName(a, b);
    });
  }

  // -------------------------------------------------------------------------
  // Hilfen für die Runden-Verwaltung
  // -------------------------------------------------------------------------
  // Hat dieser Spieler auf irgendeinem Loch etwas eingetragen?
  function hasScores(byHole) {
    var all = byHole || {};
    return Object.keys(all).some(function (hole) {
      var e = all[hole];
      return !!e && (e.gross != null || Object.keys(e.animals || {}).length > 0);
    });
  }

  function hasAnyScore(scores) {
    var all = scores || {};
    return Object.keys(all).some(function (pid) { return hasScores(all[pid]); });
  }

  /**
   * Wer spielt heute mit? Die als anwesend markierten Spieler (`present`);
   * ein Spieler mit bereits eingetragenem Score zählt ebenfalls dazu.
   */
  function todaysPlayers(players, scores) {
    return (players || []).filter(function (p) {
      return p.present === true || hasScores((scores || {})[p.id]);
    });
  }

  function flightOf(flights, playerId) {
    return (flights || []).find(function (f) {
      return (f.playerIds || []).indexOf(playerId) !== -1;
    }) || null;
  }

  /**
   * Fortschritt eines Flights.
   *  done    – Löcher, auf denen ALLE Spieler des Flights ein Brutto haben
   *  current – höchstes Loch, auf dem irgendetwas eingetragen ist
   */
  function flightProgress(flight, scores, courseId) {
    var c = resolve(courseId);
    var ids = (flight && flight.playerIds) || [];
    var done = 0;
    var currentHole = 0;
    if (ids.length) {
      c.holes.forEach(function (h) {
        var entries = ids.map(function (id) { return ((scores || {})[id] || {})[h.hole]; });
        if (entries.every(function (e) { return e && e.gross != null; })) done += 1;
        if (entries.some(function (e) { return e && (e.gross != null || Object.keys(e.animals || {}).length > 0); })) currentHole = h.hole;
      });
    }
    return {
      done: done,
      holes: c.holeCount,
      current: currentHole || 1,
      started: currentHole > 0,
      finished: ids.length > 0 && done === c.holeCount,
    };
  }

  // -------------------------------------------------------------------------
  // Export – COURSE/HOLES/PAR_TOTAL sind Getter auf den aktiven Platz, damit
  // bestehender Code nach setCourse() automatisch den richtigen Platz sieht.
  // -------------------------------------------------------------------------
  var API = {
    COURSES: COURSES,
    DEFAULT_COURSE: DEFAULT_COURSE,
    courseById: courseById,
    setCourse: setCourse,
    MIN_GROSS: MIN_GROSS,
    MAX_GROSS: MAX_GROSS,
    MIN_HCP: MIN_HCP,
    MAX_HCP: MAX_HCP,
    ANIMALS: ANIMALS,
    ANIMAL_KEYS: ANIMAL_KEYS,
    POS_KEYS: POS_KEYS,
    NEG_KEYS: NEG_KEYS,
    parFor: parFor,
    distFor: distFor,
    animalAllowed: animalAllowed,
    clamp: clamp,
    roundHalf: roundHalf,
    courseHandicap: courseHandicap,
    strokesFor: strokesFor,
    capFor: capFor,
    normalizeHcp: normalizeHcp,
    normalizeGross: normalizeGross,
    normalizeHole: normalizeHole,
    normalizeAnimals: normalizeAnimals,
    normalizeEntry: normalizeEntry,
    normalizeScores: normalizeScores,
    mergeEntry: mergeEntry,
    targetFor: targetFor,
    playerResult: playerResult,
    resultsFor: resultsFor,
    compareMain: compareMain,
    compareAnimals: compareAnimals,
    ranked: ranked,
    roundStandings: roundStandings,
    roundSummary: roundSummary,
    allTime: allTime,
    hasScores: hasScores,
    hasAnyScore: hasAnyScore,
    todaysPlayers: todaysPlayers,
    flightOf: flightOf,
    flightProgress: flightProgress,
  };

  Object.defineProperty(API, 'course', { get: function () { return current; } });
  Object.defineProperty(API, 'COURSE', { get: function () { return current.holes; } });
  Object.defineProperty(API, 'HOLES', { get: function () { return current.holeCount; } });
  Object.defineProperty(API, 'PAR_TOTAL', { get: function () { return current.par; } });
  Object.defineProperty(API, 'DIST_TOTAL', {
    get: function () { return current.distTotals[current.defaultTee]; },
  });

  return API;
}));
