/**
 * Fore the Animals! – gemeinsames Domain-Modell
 *
 * Diese Datei ist die EINZIGE Quelle für Platzdaten, Tiere, Ziel- und
 * Punkteberechnung sowie für die Sortierung der Ranglisten. Sie läuft
 * unverändert im Browser (als klassisches <script>, Namensraum `FTA`) und im
 * Server (`require('./public/shared/model.js')`) – so können Live-Rangliste
 * und gespeichertes Resultat gar nicht mehr auseinanderlaufen.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FTA = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Platz: Rigi Holzhäusern, Tee 27
  // -------------------------------------------------------------------------
  var COURSE = [
    { hole: 1, par: 4, dist: 295, index: 9 },
    { hole: 2, par: 4, dist: 333, index: 3 },
    { hole: 3, par: 4, dist: 254, index: 11 },
    { hole: 4, par: 3, dist: 165, index: 5 },
    { hole: 5, par: 4, dist: 262, index: 17 },
    { hole: 6, par: 4, dist: 274, index: 15 },
    { hole: 7, par: 4, dist: 357, index: 1 },
    { hole: 8, par: 5, dist: 422, index: 13 },
    { hole: 9, par: 4, dist: 320, index: 7 },
  ];
  var HOLES = COURSE.length;                                   // 9
  var PAR_TOTAL = COURSE.reduce(function (s, h) { return s + h.par; }, 0); // 36
  var DIST_TOTAL = COURSE.reduce(function (s, h) { return s + h.dist; }, 0);

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

  function parFor(hole) {
    var h = COURSE[Number(hole) - 1];
    return h ? h.par : null;
  }

  // Zebra (Fairway getroffen) gibt es auf Par 3 nicht.
  function animalAllowed(key, hole) {
    var def = ANIMALS.find(function (a) { return a.key === key; });
    if (!def) return false;
    return def.par3 || parFor(hole) !== 3;
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

  function normalizeHole(value) {
    var n = parseInt(value, 10);
    return n >= 1 && n <= HOLES ? n : null;
  }

  function normalizeAnimals(raw, hole) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    ANIMAL_KEYS.forEach(function (key) {
      if (raw[key] && (hole == null || animalAllowed(key, hole))) out[key] = true;
    });
    return out;
  }

  // {gross, animals} – leere Einträge werden als null zurückgegeben, damit sie
  // gar nicht erst gespeichert werden.
  function normalizeEntry(raw, hole) {
    if (!raw || typeof raw !== 'object') return null;
    var gross = normalizeGross(raw.gross);
    var animals = normalizeAnimals(raw.animals, hole);
    if (gross === null && Object.keys(animals).length === 0) return null;
    return { gross: gross, animals: animals };
  }

  // scores[playerId][hole] = {gross, animals}
  function normalizeScores(raw, validPlayerIds) {
    var valid = validPlayerIds ? new Set(validPlayerIds) : null;
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (pid) {
      if (valid && !valid.has(pid)) return;         // verwaiste Scores entfernen
      var byHole = raw[pid];
      if (!byHole || typeof byHole !== 'object') return;
      var clean = {};
      Object.keys(byHole).forEach(function (rawHole) {
        var hole = normalizeHole(rawHole);
        if (hole === null) return;
        var entry = normalizeEntry(byHole[rawHole], hole);
        if (entry) clean[hole] = entry;
      });
      out[pid] = clean;
    });
    return out;
  }

  // Score-Eintrag zusammenführen: nur mitgeschickte Felder werden geändert.
  function mergeEntry(current, patch, hole) {
    var base = current && typeof current === 'object' ? current : { gross: null, animals: {} };
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
        if (patch.animals[key] && animalAllowed(key, hole)) next.animals[key] = true;
        else delete next.animals[key];
      });
    }
    return next;
  }

  // -------------------------------------------------------------------------
  // Ziel & Punkte – die eine Formel
  // -------------------------------------------------------------------------
  function targetFor(hcp) {
    return PAR_TOTAL + Math.ceil(normalizeHcp(hcp) / 2);
  }

  /**
   * Resultat eines Spielers.
   *
   * Punkte = Ziel − (Brutto + Par für noch offene Löcher) + positive Tiere
   *          − negative Tiere
   *
   * Für eine fertig gespielte Runde ist «Par für offene Löcher» 0, die Formel
   * entspricht dann exakt der Turnierregel. Während der Runde ist sie eine
   * Prognose. Wichtig: Live-Ansicht und Archiv rechnen damit identisch – ein
   * fehlendes Loch kann das Resultat nicht mehr künstlich aufblähen.
   */
  function playerResult(player, byHole) {
    var scores = byHole || {};
    var gross = 0;
    var played = 0;
    var parOpen = 0;
    var pos = 0;
    var neg = 0;
    var counts = {};
    ANIMAL_KEYS.forEach(function (key) { counts[key] = 0; });

    COURSE.forEach(function (h) {
      var entry = scores[h.hole] || scores[String(h.hole)];
      var g = entry ? normalizeGross(entry.gross) : null;
      if (g !== null) { gross += g; played += 1; } else { parOpen += h.par; }
      if (entry && entry.animals) {
        ANIMAL_KEYS.forEach(function (key) {
          if (!entry.animals[key]) return;
          counts[key] += 1;
          if (POS_KEYS.indexOf(key) !== -1) pos += 1; else neg += 1;
        });
      }
    });

    var target = targetFor(player.hcp);
    return {
      id: player.id,
      name: player.name,
      hcp: normalizeHcp(player.hcp),
      target: target,
      gross: gross,
      played: played,
      complete: played === HOLES,
      parOpen: parOpen,
      projected: gross + parOpen,
      pos: pos,
      neg: neg,
      counts: counts,
      totalAnimals: pos + neg,
      points: target - (gross + parOpen) + pos - neg,
    };
  }

  function resultsFor(players, scores) {
    var all = scores || {};
    return (players || []).map(function (p) { return playerResult(p, all[p.id]); });
  }

  // -------------------------------------------------------------------------
  // Sortierung & Ränge
  // -------------------------------------------------------------------------
  function byName(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''), 'de');
  }

  // Hauptwertung: Punkte, dann mehr positive Tiere, dann weniger negative,
  // dann tieferes Brutto. (Früher entschied pos+neg – wer mehr Krokodile
  // sammelte, gewann den Gleichstand.)
  // Der Name gehört bewusst NICHT dazu: Gibt die Funktion 0 zurück, ist es ein
  // echter Gleichstand und beide teilen sich den Rang.
  function compareMain(a, b) {
    return (b.points - a.points)
      || (b.pos - a.pos)
      || (a.neg - b.neg)
      || (a.projected - b.projected);
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
      playerCount: standings.length,
      winners: winners.map(function (w) { return { id: w.id, name: w.name, points: w.points }; }),
    };
  }

  /**
   * Ewige Bestenliste über alle gespeicherten Runden.
   * Gruppiert nach Spieler-ID (früher nach Name – dadurch spaltete ein
   * Umbenennen die Historie und Namensgleichheit führte sie zusammen).
   * Der zuletzt verwendete Name wird angezeigt.
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

  function presentPlayers(players) {
    // Altbestand ohne das Feld gilt als anwesend
    return (players || []).filter(function (p) { return p.present !== false; });
  }

  return {
    COURSE: COURSE,
    HOLES: HOLES,
    PAR_TOTAL: PAR_TOTAL,
    DIST_TOTAL: DIST_TOTAL,
    MIN_GROSS: MIN_GROSS,
    MAX_GROSS: MAX_GROSS,
    MIN_HCP: MIN_HCP,
    MAX_HCP: MAX_HCP,
    ANIMALS: ANIMALS,
    ANIMAL_KEYS: ANIMAL_KEYS,
    POS_KEYS: POS_KEYS,
    NEG_KEYS: NEG_KEYS,
    parFor: parFor,
    animalAllowed: animalAllowed,
    clamp: clamp,
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
    presentPlayers: presentPlayers,
  };
}));
