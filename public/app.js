/* Fore the Animals! – Golf Safari App */
'use strict';

// ---------------------------------------------------------------------------
// Sprachen / i18n
// ---------------------------------------------------------------------------
let lang = localStorage.getItem('fta-lang') || 'de';

const STRINGS = {
  // Tabs
  tab_rules: { de: '📖 Regeln', en: '📖 Rules' },
  tab_players: { de: '👥 Spieler', en: '👥 Players' },
  tab_entry: { de: '⛳ Eintragen', en: '⛳ Score entry' },
  tab_leaderboard: { de: '🏆 Rangliste', en: '🏆 Leaderboard' },
  // Regeln
  r_how_title: { de: 'So wird gespielt', en: 'How to play' },
  r_how_p1: {
    de: 'Wir spielen <strong>Beat Your Target</strong> als Einzelwettbewerb.',
    en: 'We play <strong>Beat Your Target</strong> as an individual competition.',
  },
  r_how_target: {
    de: '🎯 Dein Ziel: <strong>Par 36 + halbes Handicap</strong>, immer aufgerundet.',
    en: '🎯 Your target: <strong>Par 36 + half your handicap</strong>, always rounded up.',
  },
  r_how_example: {
    de: 'Beispiel: HCP 15 → Ziel = 36 + 8 = <strong>44</strong>',
    en: 'Example: HCP 15 → target = 36 + 8 = <strong>44</strong>',
  },
  r_animals_title: { de: 'Die Tiere', en: 'The animals' },
  r_pos: { de: 'Positiv (+1 Punkt):', en: 'Positive (+1 point):' },
  r_neg: { de: 'Negativ (−1 Punkt):', en: 'Negative (−1 point):' },
  r_zebra: {
    de: '🦓 <strong>Zebra</strong> – Fairway getroffen (nur Par 4 / Par 5)',
    en: '🦓 <strong>Zebra</strong> – fairway hit (Par 4 / Par 5 only)',
  },
  r_giraffe: {
    de: '🦒 <strong>Giraffe</strong> – Grün in Regulation',
    en: '🦒 <strong>Giraffe</strong> – green in regulation',
  },
  r_rabbit: {
    de: '🐇 <strong>Rabbit</strong> – Ein Putt oder eingechippt',
    en: '🐇 <strong>Rabbit</strong> – one putt or chip-in',
  },
  r_scorpion: {
    de: '🦂 <strong>Scorpion</strong> – Ball im Bunker',
    en: '🦂 <strong>Scorpion</strong> – ball finishes in a bunker',
  },
  r_crocodile: {
    de: '🐊 <strong>Crocodile</strong> – Ball im Wasser / Penalty Area',
    en: '🐊 <strong>Crocodile</strong> – ball enters water / penalty area',
  },
  r_snake: {
    de: '🐍 <strong>Snake</strong> – Drei Putts oder mehr',
    en: '🐍 <strong>Snake</strong> – three putts or more',
  },
  r_once: {
    de: 'Auf demselben Loch können mehrere Tiere gesammelt werden. Jedes Tier zählt pro Loch nur einmal.',
    en: 'Different animals can be collected on the same hole. Each animal counts only once per hole.',
  },
  r_final_title: { de: 'Schlussresultat', en: 'Final score' },
  r_final_p: {
    de: '<strong>Punkte = Ziel − Brutto + positive Tiere − negative Tiere.</strong>',
    en: '<strong>Score = target − gross score + positive animals − negative animals.</strong>',
  },
  r_final_win: { de: 'Die höchste Punktzahl gewinnt. 🥇', en: 'Highest score wins. 🥇' },
  r_final_second: {
    de: 'Zweiter Preis: 🥈 die meisten gesammelten Tiere insgesamt.',
    en: 'Second prize: 🥈 most animals collected in total.',
  },
  r_course_title: { de: 'Der Platz – Tee 27', en: 'The course – Tee 27' },
  r_course_hint: { de: 'Distanz in Meter bis Mitte Grün.', en: 'Distance in metres to the middle of the green.' },
  // Platztabelle
  c_hole: { de: 'Loch', en: 'Hole' },
  c_par: { de: 'Par', en: 'Par' },
  c_meters: { de: 'Meter', en: 'Metres' },
  c_index: { de: 'Index', en: 'Index' },
  c_total: { de: 'Total', en: 'Total' },
  // Spieler & Flights
  p_title: { de: 'Spieler erfassen', en: 'Add players' },
  ph_name: { de: 'Name', en: 'Name' },
  ph_hcp: { de: 'HCP', en: 'HCP' },
  p_add: { de: 'Hinzufügen', en: 'Add' },
  p_flights: { de: 'Flights', en: 'Flights' },
  ph_flight: { de: 'Flight-Name (z.B. Flight 1)', en: 'Flight name (e.g. Flight 1)' },
  p_create_flight: { de: 'Flight erstellen', en: 'Create flight' },
  p_none: { de: 'Noch keine Spieler erfasst.', en: 'No players yet.' },
  f_none: { de: 'Noch keine Flights erstellt.', en: 'No flights yet.' },
  p_target: { de: 'Ziel', en: 'Target' },
  f_count: { de: '({n} Spieler)', en: '({n} players)' },
  f_no_avail: { de: 'Keine verfügbaren Spieler', en: 'No available players' },
  p_added: { de: '{name} hinzugefügt 🎉', en: '{name} added 🎉' },
  p_prompt_name: { de: 'Name:', en: 'Name:' },
  p_prompt_hcp: { de: 'Handicap:', en: 'Handicap:' },
  p_confirm_del: {
    de: '{name} wirklich löschen? Alle Scores gehen verloren.',
    en: 'Really delete {name}? All their scores will be lost.',
  },
  f_confirm_del: {
    de: 'Flight «{name}» löschen? (Spieler und Scores bleiben erhalten)',
    en: 'Delete flight “{name}”? (Players and scores are kept)',
  },
  // Zufalls-Flights
  p_randomize: { de: '🎲 Flights zufällig auslosen', en: '🎲 Draw random flights' },
  fr_first: { de: 'Zuerst Spieler erfassen', en: 'Add players first' },
  fr_prompt: { de: 'Maximale Anzahl Spieler pro Flight (2–4):', en: 'Maximum players per flight (2–4):' },
  fr_invalid: { de: 'Bitte 2, 3 oder 4 eingeben', en: 'Please enter 2, 3 or 4' },
  fr_replace: { de: 'Bestehende Flights werden ersetzt. Weiter?', en: 'Existing flights will be replaced. Continue?' },
  fr_done: { de: 'Flights zufällig ausgelost 🎲', en: 'Random flights drawn 🎲' },
  // Eintragen
  e_flight: { de: 'Flight', en: 'Flight' },
  e_hole: { de: 'Loch', en: 'Hole' },
  e_select_first: { de: '– zuerst Flight erstellen –', en: '– create a flight first –' },
  e_hole_info: { de: 'Loch {h} · Par {p} · {d} m · Index {i}', en: 'Hole {h} · Par {p} · {d} m · Index {i}' },
  e_no_zebra: { de: ' · 🦓 Zebra nicht möglich (Par 3)', en: ' · 🦓 no Zebra possible (Par 3)' },
  e_no_players: {
    de: 'Diesem Flight sind noch keine Spieler zugeteilt.<br>👥 Unter «Spieler» Flight erstellen und Spieler zuteilen.',
    en: 'No players assigned to this flight yet.<br>👥 Go to “Players” to create flights and assign players.',
  },
  e_running: { de: 'Ziel {t} · Brutto {g} nach {n} Löchern', en: 'Target {t} · gross {g} after {n} holes' },
  e_gross: { de: 'Brutto:', en: 'Gross:' },
  e_par_n: { de: 'Par {p}', en: 'Par {p}' },
  e_next: { de: '✅ Loch {h} fertig – weiter zu Loch {n}', en: '✅ Hole {h} done – on to hole {n}' },
  e_next_last: { de: '✅ Loch 9 fertig – zur Rangliste 🏆', en: '✅ Hole 9 done – to the leaderboard 🏆' },
  e_missing: { de: 'Noch kein Brutto-Score für: {names}.\nTrotzdem weiter?', en: 'No gross score yet for: {names}.\nContinue anyway?' },
  e_good_luck: { de: 'Loch {h} – gutes Gelingen! ⛳', en: 'Hole {h} – good luck! ⛳' },
  // Rangliste
  lb_title: { de: '🥇 Rangliste – Beat Your Target', en: '🥇 Leaderboard – Beat Your Target' },
  lb_hint: {
    de: 'Punkte = Ziel − Brutto + Tiere. Für noch nicht gespielte Löcher wird Par angenommen (Live-Prognose). Aktualisiert sich automatisch alle 5 Sekunden. Tipp auf einen Spieler zeigt seine Scorekarte.',
    en: 'Score = target − gross + animals. Par is assumed for holes not yet played (live projection). Updates automatically every 5 seconds. Tap a player to see their scorecard.',
  },
  lb_ceremony: { de: '🎉 Preisverleihung', en: '🎉 Prize ceremony' },
  lb_share: { de: '📸 Als Bild teilen', en: '📸 Share as image' },
  lb_second_title: { de: '🥈 Zweiter Preis – Meiste Tiere', en: '🥈 Second prize – Most animals' },
  lb_no_players: { de: 'Noch keine Spieler.', en: 'No players yet.' },
  h_rank: { de: 'Rang', en: 'Rank' },
  h_player: { de: 'Spieler', en: 'Player' },
  h_target: { de: 'Ziel', en: 'Target' },
  h_thru: { de: 'Loch', en: 'Thru' },
  h_gross: { de: 'Brutto', en: 'Gross' },
  h_pos: { de: '➕ Tiere', en: '➕ Animals' },
  h_neg: { de: '➖ Tiere', en: '➖ Animals' },
  h_points: { de: 'Punkte', en: 'Points' },
  h_total: { de: 'Total', en: 'Total' },
  h_rounds: { de: 'Runden', en: 'Rounds' },
  h_wins: { de: '🏆 Siege', en: '🏆 Wins' },
  h_animals: { de: '🐾 Tiere', en: '🐾 Animals' },
  h_best: { de: 'Bestes Resultat', en: 'Best result' },
  // Runde speichern & Archiv
  sr_title: { de: '💾 Runde abschliessen &amp; speichern', en: '💾 Finish &amp; save round' },
  sr_p: {
    de: 'Legt die aktuelle Runde mit Schlussrangliste im Archiv ab und leert die Scores für die nächste Runde. Spieler und Flights bleiben erhalten.',
    en: 'Stores the current round with its final standings in the archive and clears the scores for the next round. Players and flights are kept.',
  },
  sr_btn: { de: 'Runde speichern', en: 'Save round' },
  sr_prompt: { de: 'Name der Runde:', en: 'Round name:' },
  sr_default: { de: 'Runde vom {date}', en: 'Round of {date}' },
  sr_confirm: {
    de: 'Runde jetzt abschliessen und speichern?\nDie Scores werden danach für eine neue Runde geleert.',
    en: 'Finish and save the round now?\nScores will be cleared for a new round afterwards.',
  },
  sr_saved: { de: '«{name}» gespeichert 💾', en: '“{name}” saved 💾' },
  ar_title: { de: '🗂️ Gespeicherte Runden', en: '🗂️ Saved rounds' },
  ar_none: { de: 'Noch keine gespeicherten Runden.', en: 'No saved rounds yet.' },
  ar_winner: { de: 'Sieger', en: 'Winner' },
  ar_delete: { de: '🗑️ Runde löschen', en: '🗑️ Delete round' },
  ar_confirm_del: { de: '«{name}» endgültig löschen?', en: 'Permanently delete “{name}”?' },
  bk_down: { de: '⬇️ Backup herunterladen', en: '⬇️ Download backup' },
  bk_up: { de: '⬆️ Backup wiederherstellen', en: '⬆️ Restore backup' },
  bk_hint: {
    de: 'Das Backup enthält alle Spieler, Flights, Scores und gespeicherten Runden als Datei. Tipp: Nach jedem Turnier herunterladen – so ist alles auch dann gesichert, wenn der Gratis-Server neu aufgesetzt wird.',
    en: 'The backup file contains all players, flights, scores and saved rounds. Tip: download it after every tournament – then nothing is lost even if the free server is reset.',
  },
  bk_done: { de: 'Backup heruntergeladen ⬇️', en: 'Backup downloaded ⬇️' },
  bk_invalid: { de: 'Datei ist kein gültiges Backup', en: 'File is not a valid backup' },
  bk_confirm: {
    de: 'Backup wiederherstellen?\nDer aktuelle Stand auf dem Server wird komplett ersetzt.',
    en: 'Restore this backup?\nThe current state on the server will be completely replaced.',
  },
  bk_restored: { de: 'Wiederhergestellt: {p} Spieler, {r} Runden ✅', en: 'Restored: {p} players, {r} rounds ✅' },
  at_title: { de: '🏅 Ewige Bestenliste', en: '🏅 All-time leaderboard' },
  at_hint: {
    de: 'Über alle gespeicherten Runden. Sortiert nach Siegen, dann bestem Einzelresultat.',
    en: 'Across all saved rounds. Sorted by wins, then best single result.',
  },
  dz_title: { de: '⚠️ Turnier zurücksetzen', en: '⚠️ Reset tournament' },
  dz_p: {
    de: 'Löscht alle eingetragenen Scores (Spieler, Flights und gespeicherte Runden bleiben erhalten).',
    en: 'Deletes all entered scores (players, flights and saved rounds are kept).',
  },
  dz_btn: { de: 'Alle Scores löschen', en: 'Delete all scores' },
  dz_prompt: {
    de: 'Wirklich ALLE Scores löschen? Tippe RESET zum Bestätigen:',
    en: 'Really delete ALL scores? Type RESET to confirm:',
  },
  dz_done: { de: 'Alle Scores gelöscht', en: 'All scores deleted' },
  // Scorekarte
  sc_par: { de: 'Par', en: 'Par' },
  sc_gross: { de: 'Brutto', en: 'Gross' },
  sc_animals: { de: 'Tiere', en: 'Animals' },
  sc_tot: { de: 'Tot', en: 'Tot' },
  sc_legend: {
    de: '🟢 unter Par · ⚪ Par · 🟠 Bogey · 🔴 Doppelbogey+',
    en: '🟢 under par · ⚪ par · 🟠 bogey · 🔴 double bogey+',
  },
  // Preisverleihung
  cer_intro_title: { de: 'Preisverleihung', en: 'Prize ceremony' },
  cer_intro_sub: { de: '9-Hole Golf Safari', en: '9-Hole Golf Safari' },
  cer_p3: { de: '3. Platz', en: '3rd place' },
  cer_p2: { de: '2. Platz', en: '2nd place' },
  cer_second: { de: 'Zweiter Preis – meiste Tiere', en: 'Second prize – most animals' },
  cer_second_sub: { de: '{n} Tiere gesammelt', en: '{n} animals collected' },
  cer_win: { de: 'Und der Sieg geht an…', en: 'And the winner is…' },
  cer_pts: { de: '{pts} Punkte · Brutto {g}', en: '{pts} points · gross {g}' },
  cer_thanks: { de: 'Applaus!', en: 'Applause!' },
  cer_thanks_name: { de: 'Danke fürs Mitspielen', en: 'Thanks for playing' },
  cer_thanks_sub: { de: 'Tippen zum Schliessen', en: 'Tap to close' },
  cer_tap: { de: 'Tippen für weiter', en: 'Tap to continue' },
  cer_no_players: { de: 'Noch keine Spieler erfasst', en: 'No players yet' },
  // Bild-Export
  img_subtitle: { de: '9-Hole Golf Safari · Rigi Holzhäusern', en: '9-Hole Golf Safari · Rigi Holzhäusern' },
  img_most_animals: { de: '🐾 Meiste Tiere: {name} ({n})', en: '🐾 Most animals: {name} ({n})' },
  img_downloaded: { de: 'Bild heruntergeladen 📸', en: 'Image downloaded 📸' },
  // Offline
  off_banner: {
    de: '📶 Kein Empfang – {n} Einträge warten und werden automatisch nachgesendet',
    en: '📶 No signal – {n} entries queued, they will be sent automatically',
  },
};

function t(key, vars) {
  let s = (STRINGS[key] && STRINGS[key][lang]) || (STRINGS[key] && STRINGS[key].de) || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

function dateLocale() { return lang === 'de' ? 'de-CH' : 'en-GB'; }

// Statische Texte im HTML übersetzen
function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    // nur den ersten Textknoten ersetzen, Kind-Elemente (Select etc.) bleiben
    el.childNodes[0].textContent = t(el.dataset.i18nLabel);
  });
  document.getElementById('lang-toggle').textContent = lang === 'de' ? 'EN' : 'DE';
}

// ---------------------------------------------------------------------------
// Platzdaten – Rigi Holzhäusern, Tee 27
// ---------------------------------------------------------------------------
const COURSE = [
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
const PAR_TOTAL = 36;

const ANIMALS = [
  { key: 'zebra',     emoji: '🦓', name: 'Zebra',     type: 'pos', desc: { de: 'Fairway getroffen', en: 'Fairway hit' } },
  { key: 'giraffe',   emoji: '🦒', name: 'Giraffe',   type: 'pos', desc: { de: 'Grün in Regulation', en: 'Green in regulation' } },
  { key: 'rabbit',    emoji: '🐇', name: 'Rabbit',    type: 'pos', desc: { de: 'Ein Putt / Chip-in', en: 'One putt / chip-in' } },
  { key: 'scorpion',  emoji: '🦂', name: 'Scorpion',  type: 'neg', desc: { de: 'Ball im Bunker', en: 'Ball in a bunker' } },
  { key: 'crocodile', emoji: '🐊', name: 'Crocodile', type: 'neg', desc: { de: 'Wasser / Penalty', en: 'Water / penalty' } },
  { key: 'snake',     emoji: '🐍', name: 'Snake',     type: 'neg', desc: { de: '3 Putts oder mehr', en: '3 putts or more' } },
];

// ---------------------------------------------------------------------------
// Globaler Zustand
// ---------------------------------------------------------------------------
let state = { players: [], flights: [], scores: {}, version: 0 };
let currentFlightId = localStorage.getItem('fta-flight') || '';
let currentHole = parseInt(localStorage.getItem('fta-hole') || '1', 10);
let pendingWrites = 0;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function targetFor(hcp) {
  return PAR_TOTAL + Math.ceil(Number(hcp) / 2);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, isError) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'show' + (isError ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, 2200);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
async function api(method, url, body) {
  pendingWrites += method !== 'GET' ? 1 : 0;
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Fehler');
      err.status = res.status; // HTTP-Fehler (Server erreichbar) vs. Netzwerkfehler (kein status)
      throw err;
    }
    return data;
  } finally {
    if (method !== 'GET') pendingWrites = Math.max(0, pendingWrites - 1);
  }
}

async function refresh(force) {
  try {
    const fresh = await api('GET', '/api/state');
    if ((pendingWrites > 0 || queue.length > 0) && !force) return; // eigene Änderung unterwegs – nicht überschreiben
    if (fresh.version !== state.version || force) {
      state = fresh;
      renderAll();
    }
  } catch (err) {
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Offline-Warteschlange: Scores lokal puffern und nachsenden, sobald Netz da ist
// ---------------------------------------------------------------------------
let queue = [];
try { queue = JSON.parse(localStorage.getItem('fta-queue') || '[]'); } catch { queue = []; }
let flushing = false;
let netDown = false; // erst nach einem tatsächlich fehlgeschlagenen Sendeversuch true

function saveQueue() {
  localStorage.setItem('fta-queue', JSON.stringify(queue));
  updateOfflineBanner();
}

// Banner nur zeigen, wenn wirklich kein Netz da ist – nicht während des
// normalen Sendens (sonst blitzt es bei jedem Eintrag kurz auf)
function updateOfflineBanner() {
  const banner = $('#offline-banner');
  const show = netDown && queue.length > 0;
  banner.hidden = !show;
  if (show) banner.textContent = t('off_banner', { n: queue.length });
}

function sendScore(pid, hole, body) {
  queue.push({ pid, hole, body });
  saveQueue();
  flushQueue();
}

async function flushQueue() {
  if (flushing || !queue.length) return;
  flushing = true;
  try {
    while (queue.length) {
      const item = queue[0];
      try {
        const r = await api('PUT', `/api/scores/${item.pid}/${item.hole}`, item.body);
        state.version = r.version;
        netDown = false;
        queue.shift();
        saveQueue();
      } catch (err) {
        if (err.status) {
          // Server hat den Eintrag abgelehnt – verwerfen, sonst hängt die Warteschlange
          netDown = false;
          queue.shift();
          saveQueue();
          toast(err.message, true);
        } else {
          netDown = true; // kein Netz – später erneut versuchen
          updateOfflineBanner();
          break;
        }
      }
    }
  } finally {
    flushing = false;
  }
}

// ---------------------------------------------------------------------------
// Punkteberechnung
// ---------------------------------------------------------------------------
function playerStats(p) {
  const scores = state.scores[p.id] || {};
  let gross = 0, played = 0, pos = 0, neg = 0, parRemaining = 0;
  for (const h of COURSE) {
    const e = scores[h.hole];
    if (e && e.gross != null) { gross += e.gross; played += 1; }
    else parRemaining += h.par;
    if (e && e.animals) {
      for (const a of ANIMALS) {
        if (e.animals[a.key]) { a.type === 'pos' ? pos++ : neg++; }
      }
    }
  }
  const target = targetFor(p.hcp);
  // Prognose: für ungespielte Löcher wird Par angenommen
  const points = target - (gross + parRemaining) + pos - neg;
  return { gross, played, pos, neg, target, points, totalAnimals: pos + neg, finished: played === 9 };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderAll() {
  renderCourseTable();
  renderPlayers();
  renderFlights();
  renderEntry();
  renderLeaderboard();
  renderArchive();
  renderAllTime();
}

// --- Regeln: Platztabelle ---
function renderCourseTable() {
  $('#course-table').innerHTML = `
    <tr><th>${t('c_hole')}</th>${COURSE.map((h) => `<th>${h.hole}</th>`).join('')}<th>${t('c_total')}</th></tr>
    <tr><td>${t('c_par')}</td>${COURSE.map((h) => `<td>${h.par}</td>`).join('')}<td><strong>36</strong></td></tr>
    <tr><td>${t('c_meters')}</td>${COURSE.map((h) => `<td>${h.dist}</td>`).join('')}<td><strong>2682</strong></td></tr>
    <tr><td>${t('c_index')}</td>${COURSE.map((h) => `<td>${h.index}</td>`).join('')}<td></td></tr>`;
}

// --- Spieler ---
function renderPlayers() {
  const list = $('#player-list');
  if (!state.players.length) {
    list.innerHTML = `<p class="empty-note">${t('p_none')}</p>`;
    return;
  }
  list.innerHTML = state.players.map((p) => `
    <div class="player-row">
      <span class="p-name">${esc(p.name)}</span>
      <span class="p-meta">HCP ${p.hcp}</span>
      <span class="badge">${t('p_target')} ${targetFor(p.hcp)}</span>
      <button type="button" class="btn small" data-edit-player="${p.id}">✏️</button>
      <button type="button" class="btn small" data-del-player="${p.id}">🗑️</button>
    </div>`).join('');
}

// --- Flights ---
function renderFlights() {
  const list = $('#flight-list');
  if (!state.flights.length) {
    list.innerHTML = `<p class="empty-note">${t('f_none')}</p>`;
    return;
  }
  list.innerHTML = state.flights.map((f) => {
    const chips = state.players.map((p) => {
      const inFlight = f.playerIds.includes(p.id);
      const elsewhere = !inFlight && state.flights.some((o) => o.id !== f.id && o.playerIds.includes(p.id));
      if (elsewhere) return '';
      return `<span class="member-chip ${inFlight ? 'in' : ''}" data-flight="${f.id}" data-player="${p.id}">
        ${inFlight ? '✓ ' : '+ '}${esc(p.name)}</span>`;
    }).join('');
    return `
      <div class="flight-card">
        <div class="flight-head">
          <h3>⛳ ${esc(f.name)} <small style="font-weight:400;color:var(--muted)">${t('f_count', { n: f.playerIds.length })}</small></h3>
          <button type="button" class="btn small" data-del-flight="${f.id}">🗑️</button>
        </div>
        <div class="flight-members">${chips || `<span class="empty-note">${t('f_no_avail')}</span>`}</div>
      </div>`;
  }).join('');
}

// --- Score-Eintrag ---
function renderEntry() {
  const sel = $('#entry-flight');
  sel.innerHTML = state.flights.length
    ? state.flights.map((f) => `<option value="${f.id}" ${f.id === currentFlightId ? 'selected' : ''}>${esc(f.name)}</option>`).join('')
    : `<option value="">${t('e_select_first')}</option>`;
  if (!state.flights.find((f) => f.id === currentFlightId)) {
    currentFlightId = state.flights[0] ? state.flights[0].id : '';
  }
  sel.value = currentFlightId;

  const flight = state.flights.find((f) => f.id === currentFlightId);

  // Loch-Auswahl
  const picker = $('#hole-picker');
  picker.innerHTML = COURSE.map((h) => {
    const done = flight && flight.playerIds.length > 0 && flight.playerIds.every((pid) => {
      const e = (state.scores[pid] || {})[h.hole];
      return e && e.gross != null;
    });
    return `<button type="button" data-hole="${h.hole}" class="${h.hole === currentHole ? 'active' : ''} ${done ? 'done' : ''}">${h.hole}</button>`;
  }).join('');

  const hInfo = COURSE[currentHole - 1];
  $('#hole-info').textContent =
    t('e_hole_info', { h: hInfo.hole, p: hInfo.par, d: hInfo.dist, i: hInfo.index }) +
    (hInfo.par === 3 ? t('e_no_zebra') : '');

  // Spielerkarten
  const wrap = $('#entry-players');
  if (!flight || !flight.playerIds.length) {
    wrap.innerHTML = `<div class="card"><p class="empty-note">${t('e_no_players')}</p></div>`;
    return;
  }

  const nextLabel = currentHole < 9
    ? t('e_next', { h: currentHole, n: currentHole + 1 })
    : t('e_next_last');
  const nextBtn = `<button type="button" class="btn primary next-hole" id="next-hole-btn">${nextLabel}</button>`;

  wrap.innerHTML = flight.playerIds.map((pid) => {
    const p = state.players.find((x) => x.id === pid);
    if (!p) return '';
    const entry = (state.scores[pid] || {})[currentHole] || { gross: null, animals: {} };
    const st = playerStats(p);
    const grossDisplay = entry.gross != null
      ? `<span class="gross-value">${entry.gross}</span>`
      : `<span class="gross-value empty">–</span>`;
    const animalBtns = ANIMALS.map((a) => {
      const on = !!(entry.animals && entry.animals[a.key]);
      const disabled = a.key === 'zebra' && hInfo.par === 3;
      return `<button type="button" class="animal-btn ${a.type} ${on ? 'on' : ''}" ${disabled ? 'disabled' : ''}
        data-animal="${a.key}" data-player="${pid}">
        <span class="a-pts">${a.type === 'pos' ? '+1' : '−1'}</span>
        <span class="emoji">${a.emoji}</span>
        <span class="a-name">${a.name}</span>
        <span class="a-desc">${a.desc[lang]}</span></button>`;
    }).join('');
    return `
      <div class="entry-player">
        <div class="ep-head">
          <h3>${esc(p.name)}</h3>
          <span class="running">${t('e_running', { t: st.target, g: st.gross, n: st.played })}</span>
        </div>
        <div class="gross-row">
          <span class="gross-label">${t('e_gross')}</span>
          <div class="stepper">
            <button type="button" data-gross="-1" data-player="${pid}">−</button>
            ${grossDisplay}
            <button type="button" data-gross="1" data-player="${pid}">+</button>
          </div>
          <span class="hint">${t('e_par_n', { p: hInfo.par })}</span>
        </div>
        <div class="animal-btns">${animalBtns}</div>
      </div>`;
  }).join('') + nextBtn;
}

// --- Rangliste ---
function medal(rank) {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
}

// Aktuelle Rangliste, sortiert wie in der Hauptwertung
function standings() {
  return state.players
    .map((p) => ({ p, ...playerStats(p) }))
    .sort((a, b) => b.points - a.points || b.totalAnimals - a.totalAnimals || a.gross - b.gross);
}

function renderLeaderboard() {
  const main = $('#lb-main');
  const second = $('#lb-animals');
  if (!state.players.length) {
    main.innerHTML = second.innerHTML = `<tr><td class="empty-note">${t('lb_no_players')}</td></tr>`;
    return;
  }

  const rows = state.players.map((p) => ({ p, ...playerStats(p) }));

  // Hauptwertung: Punkte, dann meiste Tiere, dann tieferes Brutto
  const sorted = [...rows].sort((a, b) =>
    b.points - a.points || b.totalAnimals - a.totalAnimals || a.gross - b.gross);
  main.innerHTML = `
    <tr><th>${t('h_rank')}</th><th style="text-align:left">${t('h_player')}</th><th>HCP</th><th>${t('h_target')}</th><th>${t('h_thru')}</th><th>${t('h_gross')}</th><th>${t('h_pos')}</th><th>${t('h_neg')}</th><th>${t('h_points')}</th></tr>` +
    sorted.map((r, i) => `
      <tr class="rank-${i + 1}" data-pid="${r.p.id}">
        <td>${medal(i + 1)}</td>
        <td class="name-cell">${esc(r.p.name)}</td>
        <td>${r.p.hcp}</td>
        <td>${r.target}</td>
        <td>${r.finished ? 'F' : r.played}</td>
        <td>${r.played ? r.gross : '–'}</td>
        <td>+${r.pos}</td>
        <td>−${r.neg}</td>
        <td class="pts ${r.points < 0 ? 'neg-pts' : ''}">${r.points > 0 ? '+' : ''}${r.points}</td>
      </tr>`).join('');

  // Zweiter Preis: meiste Tiere insgesamt
  const byAnimals = [...rows].sort((a, b) =>
    b.totalAnimals - a.totalAnimals || b.pos - a.pos || b.points - a.points);
  second.innerHTML = `
    <tr><th>${t('h_rank')}</th><th style="text-align:left">${t('h_player')}</th><th>🦓</th><th>🦒</th><th>🐇</th><th>🦂</th><th>🐊</th><th>🐍</th><th>${t('h_total')}</th></tr>` +
    byAnimals.map((r, i) => {
      const counts = {};
      for (const a of ANIMALS) counts[a.key] = 0;
      const scores = state.scores[r.p.id] || {};
      for (const h of COURSE) {
        const e = scores[h.hole];
        if (e && e.animals) for (const a of ANIMALS) if (e.animals[a.key]) counts[a.key]++;
      }
      return `
        <tr class="rank-${i + 1}">
          <td>${medal(i + 1)}</td>
          <td class="name-cell">${esc(r.p.name)}</td>
          ${ANIMALS.map((a) => `<td>${counts[a.key] || ''}</td>`).join('')}
          <td class="pts">${r.totalAnimals}</td>
        </tr>`;
    }).join('');
}

// --- Archiv: gespeicherte Runden ---
function renderArchive() {
  const wrap = $('#archive-list');
  const archive = state.archive || [];
  if (!archive.length) {
    wrap.innerHTML = `<p class="empty-note">${t('ar_none')}</p>`;
    return;
  }
  wrap.innerHTML = archive.map((r) => {
    const date = new Date(r.date).toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    const winner = r.results && r.results[0] ? r.results[0].name : '–';
    const table = `
      <div class="table-scroll">
        <table class="lb-table">
          <tr><th>${t('h_rank')}</th><th style="text-align:left">${t('h_player')}</th><th>HCP</th><th>${t('h_target')}</th><th>${t('h_gross')}</th><th>➕</th><th>➖</th><th>${t('h_points')}</th></tr>
          ${(r.results || []).map((x, i) => `
            <tr class="rank-${i + 1}" data-round="${r.id}" data-rpid="${x.id || ''}">
              <td>${medal(i + 1)}</td>
              <td class="name-cell">${esc(x.name)}</td>
              <td>${x.hcp}</td>
              <td>${x.target}</td>
              <td>${x.gross}</td>
              <td>+${x.pos}</td>
              <td>−${x.neg}</td>
              <td class="pts ${x.points < 0 ? 'neg-pts' : ''}">${x.points > 0 ? '+' : ''}${x.points}</td>
            </tr>`).join('')}
        </table>
      </div>`;
    return `
      <details class="archive-round">
        <summary>
          <span class="ar-name">🏆 ${esc(r.name)}</span>
          <span class="ar-meta">${date} · ${t('ar_winner')}: ${esc(winner)}</span>
        </summary>
        ${table}
        <button type="button" class="btn small danger" data-del-round="${r.id}">${t('ar_delete')}</button>
      </details>`;
  }).join('');
}

// --- Ewige Bestenliste über alle gespeicherten Runden ---
function renderAllTime() {
  const archive = state.archive || [];
  const card = $('#alltime-card');
  card.hidden = !archive.length;
  if (!archive.length) return;

  const map = {};
  for (const r of archive) {
    (r.results || []).forEach((x, i) => {
      const m = map[x.name] || (map[x.name] = { name: x.name, rounds: 0, wins: 0, animals: 0, best: -Infinity });
      m.rounds += 1;
      if (i === 0) m.wins += 1;
      m.animals += x.totalAnimals != null ? x.totalAnimals : (x.pos + x.neg);
      m.best = Math.max(m.best, x.points);
    });
  }
  const list = Object.values(map).sort((a, b) => b.wins - a.wins || b.best - a.best || b.animals - a.animals);
  $('#lb-alltime').innerHTML = `
    <tr><th>${t('h_rank')}</th><th style="text-align:left">${t('h_player')}</th><th>${t('h_rounds')}</th><th>${t('h_wins')}</th><th>${t('h_animals')}</th><th>${t('h_best')}</th></tr>` +
    list.map((m, i) => `
      <tr class="rank-${i + 1}">
        <td>${medal(i + 1)}</td>
        <td class="name-cell">${esc(m.name)}</td>
        <td>${m.rounds}</td>
        <td>${m.wins}</td>
        <td>${m.animals}</td>
        <td class="pts ${m.best < 0 ? 'neg-pts' : ''}">${m.best > 0 ? '+' : ''}${m.best}</td>
      </tr>`).join('');
}

// --- Scorekarten-Ansicht (Modal) ---
function showScorecard(name, hcp, scores) {
  scores = scores || {};
  let gross = 0, played = 0;
  const grossCells = COURSE.map((h) => {
    const e = scores[h.hole];
    if (e && e.gross != null) {
      gross += e.gross; played += 1;
      const d = e.gross - h.par;
      const cls = d < 0 ? 'sc-under' : d === 0 ? 'sc-par' : d === 1 ? 'sc-over' : 'sc-dbl';
      return `<td class="${cls}">${e.gross}</td>`;
    }
    return '<td>–</td>';
  }).join('');
  const animalCells = COURSE.map((h) => {
    const e = scores[h.hole];
    let s = '';
    if (e && e.animals) for (const a of ANIMALS) if (e.animals[a.key]) s += a.emoji;
    return `<td class="sc-animals">${s}</td>`;
  }).join('');

  $('#modal-content').innerHTML = `
    <div class="modal-head">
      <h3>🧾 ${esc(name)}</h3>
      <button type="button" class="btn small" id="modal-close">✕</button>
    </div>
    <p class="hint">HCP ${hcp} · ${t('p_target')} ${targetFor(hcp)}</p>
    <div class="table-scroll">
      <table class="sc-table">
        <tr><th>${t('c_hole')}</th>${COURSE.map((h) => `<th>${h.hole}</th>`).join('')}<th>${t('sc_tot')}</th></tr>
        <tr><td>${t('sc_par')}</td>${COURSE.map((h) => `<td>${h.par}</td>`).join('')}<td>36</td></tr>
        <tr><td>${t('sc_gross')}</td>${grossCells}<td><strong>${played ? gross : '–'}</strong></td></tr>
        <tr><td>${t('sc_animals')}</td>${animalCells}<td></td></tr>
      </table>
    </div>
    <p class="hint">${t('sc_legend')}</p>`;
  $('#modal').hidden = false;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

// Tabs
function switchTab(name) {
  const prev = document.querySelector('.tabs button.active');
  const changed = !prev || prev.dataset.tab !== name;
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
  // Beim Wechsel alles aus dem aktuellen Stand neu aufbauen – sonst zeigt z.B.
  // die Rangliste eigene, gerade eingetragene Scores erst nach einem Reload
  if (changed) renderAll();
  window.scrollTo({ top: 0 });
}
$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  switchTab(btn.dataset.tab);
});

// Sprache wechseln (DE ↔ EN)
$('#lang-toggle').addEventListener('click', () => {
  lang = lang === 'de' ? 'en' : 'de';
  localStorage.setItem('fta-lang', lang);
  applyStatic();
  renderAll();
  saveQueue(); // Banner-Text in neuer Sprache
});

// Spieler hinzufügen
$('#player-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#player-name').value.trim();
  const hcp = $('#player-hcp').value;
  if (!name) return;
  try {
    await api('POST', '/api/players', { name, hcp });
    $('#player-name').value = '';
    $('#player-hcp').value = '';
    toast(t('p_added', { name }));
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// Spieler bearbeiten / löschen
$('#player-list').addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit-player]');
  const delBtn = e.target.closest('[data-del-player]');
  if (editBtn) {
    const p = state.players.find((x) => x.id === editBtn.dataset.editPlayer);
    const name = prompt(t('p_prompt_name'), p.name);
    if (name === null) return;
    const hcp = prompt(t('p_prompt_hcp'), p.hcp);
    if (hcp === null) return;
    try {
      await api('PUT', `/api/players/${p.id}`, { name, hcp });
      refresh(true);
    } catch (err) { toast(err.message, true); }
  }
  if (delBtn) {
    const p = state.players.find((x) => x.id === delBtn.dataset.delPlayer);
    if (!confirm(t('p_confirm_del', { name: p.name }))) return;
    try {
      await api('DELETE', `/api/players/${p.id}`);
      refresh(true);
    } catch (err) { toast(err.message, true); }
  }
});

// Flight erstellen
$('#flight-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('POST', '/api/flights', { name: $('#flight-name').value });
    $('#flight-name').value = '';
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// Flight: Mitglieder zuteilen / Flight löschen
$('#flight-list').addEventListener('click', async (e) => {
  const chip = e.target.closest('.member-chip');
  const delBtn = e.target.closest('[data-del-flight]');
  if (chip) {
    const flight = state.flights.find((f) => f.id === chip.dataset.flight);
    const pid = chip.dataset.player;
    const ids = flight.playerIds.includes(pid)
      ? flight.playerIds.filter((x) => x !== pid)
      : [...flight.playerIds, pid];
    try {
      await api('PUT', `/api/flights/${flight.id}`, { playerIds: ids });
      refresh(true);
    } catch (err) { toast(err.message, true); }
  }
  if (delBtn) {
    const f = state.flights.find((x) => x.id === delBtn.dataset.delFlight);
    if (!confirm(t('f_confirm_del', { name: f.name }))) return;
    try {
      await api('DELETE', `/api/flights/${f.id}`);
      refresh(true);
    } catch (err) { toast(err.message, true); }
  }
});

// Flight-Auswahl beim Eintragen
$('#entry-flight').addEventListener('change', (e) => {
  currentFlightId = e.target.value;
  localStorage.setItem('fta-flight', currentFlightId);
  renderEntry();
});

// Loch-Auswahl
$('#hole-picker').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-hole]');
  if (!btn) return;
  currentHole = parseInt(btn.dataset.hole, 10);
  localStorage.setItem('fta-hole', String(currentHole));
  renderEntry();
});

// Zufällige Flight-Zuteilung
$('#randomize-btn').addEventListener('click', async () => {
  if (state.players.length < 2) return toast(t('fr_first'), true);
  const answer = prompt(t('fr_prompt'), '3');
  if (answer === null) return;
  const size = parseInt(answer, 10);
  if (!(size >= 2 && size <= 4)) return toast(t('fr_invalid'), true);
  if (state.flights.length && !confirm(t('fr_replace'))) return;
  try {
    await api('POST', '/api/flights/randomize', { size });
    toast(t('fr_done'));
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// Brutto & Tiere eintragen + Weiter-Knopf
$('#entry-players').addEventListener('click', async (e) => {
  const grossBtn = e.target.closest('button[data-gross]');
  const animalBtn = e.target.closest('button[data-animal]');
  const nextBtn = e.target.closest('#next-hole-btn');

  if (nextBtn) {
    const flight = state.flights.find((f) => f.id === currentFlightId);
    const missing = flight ? flight.playerIds.filter((pid) => {
      const entry = (state.scores[pid] || {})[currentHole];
      return !entry || entry.gross == null;
    }) : [];
    if (missing.length) {
      const names = missing.map((pid) => (state.players.find((p) => p.id === pid) || {}).name).filter(Boolean).join(', ');
      if (!confirm(t('e_missing', { names }))) return;
    }
    if (currentHole < 9) {
      currentHole += 1;
      localStorage.setItem('fta-hole', String(currentHole));
      renderEntry();
      window.scrollTo({ top: 0 });
      toast(t('e_good_luck', { h: currentHole }));
    } else {
      switchTab('leaderboard');
    }
    return;
  }

  if (grossBtn) {
    const pid = grossBtn.dataset.player;
    const delta = parseInt(grossBtn.dataset.gross, 10);
    const entry = (state.scores[pid] || {})[currentHole] || { gross: null, animals: {} };
    const par = COURSE[currentHole - 1].par;
    let gross;
    if (entry.gross == null) gross = delta > 0 ? par : null; // erster Klick auf «+» startet bei Par
    else gross = entry.gross + delta;
    if (gross != null && gross < 1) gross = null;
    if (gross != null && gross > 20) gross = 20;
    // Optimistisch lokal aktualisieren
    if (!state.scores[pid]) state.scores[pid] = {};
    state.scores[pid][currentHole] = { ...entry, gross };
    renderEntry();
    sendScore(pid, currentHole, { gross });
  }

  if (animalBtn && !animalBtn.disabled) {
    const pid = animalBtn.dataset.player;
    const key = animalBtn.dataset.animal;
    const entry = (state.scores[pid] || {})[currentHole] || { gross: null, animals: {} };
    const animals = { ...(entry.animals || {}) };
    animals[key] = !animals[key];
    if (!state.scores[pid]) state.scores[pid] = {};
    state.scores[pid][currentHole] = { ...entry, animals };
    renderEntry();
    sendScore(pid, currentHole, { animals: { [key]: animals[key] } });
  }
});

// Scorekarte: aktuelle Runde (Tipp auf Zeile in der Rangliste)
$('#lb-main').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-pid]');
  if (!tr) return;
  const p = state.players.find((x) => x.id === tr.dataset.pid);
  if (p) showScorecard(p.name, p.hcp, state.scores[p.id]);
});

// Modal schliessen
$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal' || e.target.closest('#modal-close')) $('#modal').hidden = true;
});

// Preisverleihung
let ceremonySteps = [], ceremonyIdx = 0;

function showCeremonyStep() {
  const s = ceremonySteps[ceremonyIdx];
  const c = $('#ceremony');
  c.innerHTML = `
    <div class="c-emoji">${s.emoji}</div>
    <div class="c-title">${s.title}</div>
    <div class="c-name">${esc(s.name)}</div>
    <div class="c-sub">${esc(s.sub || '')}</div>
    <div class="c-hint">${t('cer_tap')}</div>`;
  if (s.confetti) {
    const colors = ['#f5c542', '#e74c3c', '#3498db', '#2ecc71', '#e67e22', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      const sp = document.createElement('span');
      sp.className = 'confetti';
      sp.style.left = Math.random() * 100 + '%';
      sp.style.background = colors[i % colors.length];
      sp.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
      sp.style.animationDelay = (Math.random() * 1.5) + 's';
      c.appendChild(sp);
    }
  }
}

$('#ceremony-btn').addEventListener('click', () => {
  const rows = standings();
  if (!rows.length) return toast(t('cer_no_players'), true);
  const byAnimals = [...rows].sort((a, b) => b.totalAnimals - a.totalAnimals || b.pos - a.pos);
  const pts = (r) => t('cer_pts', { pts: `${r.points > 0 ? '+' : ''}${r.points}`, g: r.gross });

  ceremonySteps = [
    { emoji: '🎬', title: t('cer_intro_title'), name: 'Fore the Animals!', sub: t('cer_intro_sub') },
  ];
  if (rows[2]) ceremonySteps.push({ emoji: '🥉', title: t('cer_p3'), name: rows[2].p.name, sub: pts(rows[2]) });
  if (rows[1]) ceremonySteps.push({ emoji: '🥈', title: t('cer_p2'), name: rows[1].p.name, sub: pts(rows[1]) });
  if (byAnimals[0] && byAnimals[0].totalAnimals > 0) {
    ceremonySteps.push({ emoji: '🐾', title: t('cer_second'), name: byAnimals[0].p.name, sub: t('cer_second_sub', { n: byAnimals[0].totalAnimals }) });
  }
  ceremonySteps.push({ emoji: '🏆', title: t('cer_win'), name: rows[0].p.name, sub: pts(rows[0]), confetti: true });
  ceremonySteps.push({ emoji: '👏', title: t('cer_thanks'), name: t('cer_thanks_name'), sub: t('cer_thanks_sub') });

  ceremonyIdx = 0;
  showCeremonyStep();
  $('#ceremony').hidden = false;
});

$('#ceremony').addEventListener('click', () => {
  ceremonyIdx += 1;
  if (ceremonyIdx >= ceremonySteps.length) $('#ceremony').hidden = true;
  else showCeremonyStep();
});

// Rangliste als Bild teilen / herunterladen
$('#share-btn').addEventListener('click', () => {
  const rows = standings();
  if (!rows.length) return toast(t('cer_no_players'), true);
  const byAnimals = [...rows].sort((a, b) => b.totalAnimals - a.totalAnimals || b.pos - a.pos);

  const W = 1000, headH = 190, rowH = 62, footH = 120;
  const H = headH + 70 + rows.length * rowH + footH;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#f4f9f6'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d5c3f'; ctx.fillRect(0, 0, W, headH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px sans-serif';
  ctx.fillText('🦓 FORE THE ANIMALS!', 40, 78);
  ctx.font = '26px sans-serif'; ctx.globalAlpha = 0.9;
  ctx.fillText(t('img_subtitle'), 40, 122);
  ctx.fillText(new Date().toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' }), 40, 158);
  ctx.globalAlpha = 1;

  let y = headH + 42;
  ctx.fillStyle = '#1d5c3f'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText(t('h_rank'), 40, y); ctx.fillText(t('h_player'), 150, y);
  ctx.fillText(t('h_gross'), 560, y); ctx.fillText(t('sc_animals'), 700, y); ctx.fillText(t('h_points'), 850, y);
  y += 14;

  rows.forEach((r, i) => {
    const ry = y + i * rowH;
    ctx.fillStyle = i === 0 ? '#fdf6dd' : (i % 2 === 0 ? '#e8f2ec' : '#ffffff');
    ctx.fillRect(24, ry, W - 48, rowH - 4);
    ctx.fillStyle = '#21302a'; ctx.font = 'bold 28px sans-serif';
    ctx.fillText(i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`, 40, ry + 40);
    ctx.fillText(r.p.name.slice(0, 20), 150, ry + 40);
    ctx.font = '28px sans-serif';
    ctx.fillText(String(r.played ? r.gross : '–'), 560, ry + 40);
    ctx.fillText(`+${r.pos} / −${r.neg}`, 700, ry + 40);
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = r.points < 0 ? '#b23a48' : '#1d5c3f';
    ctx.fillText(`${r.points > 0 ? '+' : ''}${r.points}`, 850, ry + 40);
  });

  const fy = y + rows.length * rowH + 52;
  ctx.fillStyle = '#21302a'; ctx.font = '26px sans-serif';
  if (byAnimals[0] && byAnimals[0].totalAnimals > 0) {
    ctx.fillText(t('img_most_animals', { name: byAnimals[0].p.name, n: byAnimals[0].totalAnimals }), 40, fy);
  }

  cv.toBlob(async (blob) => {
    const file = new File([blob], 'fore-the-animals-rangliste.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Fore the Animals! – Rangliste' });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // Nutzer hat abgebrochen
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fore-the-animals-rangliste.png';
    a.click();
    URL.revokeObjectURL(a.href);
    toast(t('img_downloaded'));
  }, 'image/png');
});

// Runde abschliessen & speichern
$('#save-round-btn').addEventListener('click', async () => {
  const name = prompt(t('sr_prompt'), t('sr_default', { date: new Date().toLocaleDateString(dateLocale()) }));
  if (name === null) return;
  if (!confirm(t('sr_confirm'))) return;
  try {
    const r = await api('POST', '/api/rounds', { name });
    toast(t('sr_saved', { name: r.name }));
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// Gespeicherte Runde: Scorekarte anzeigen oder Runde löschen
$('#archive-list').addEventListener('click', async (e) => {
  const tr = e.target.closest('tr[data-round]');
  if (tr && tr.dataset.rpid) {
    const round = (state.archive || []).find((r) => r.id === tr.dataset.round);
    const player = round && (round.players || []).find((p) => p.id === tr.dataset.rpid);
    if (round && player) {
      showScorecard(player.name, player.hcp, (round.scores || {})[player.id]);
      return;
    }
  }
  const btn = e.target.closest('[data-del-round]');
  if (!btn) return;
  const round = (state.archive || []).find((r) => r.id === btn.dataset.delRound);
  if (!round || !confirm(t('ar_confirm_del', { name: round.name }))) return;
  try {
    await api('DELETE', `/api/rounds/${round.id}`);
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// Backup herunterladen
$('#backup-btn').addEventListener('click', () => {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fore-the-animals-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(t('bk_done'));
});

// Backup wiederherstellen
$('#restore-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return toast(t('bk_invalid'), true);
  }
  if (!confirm(t('bk_confirm'))) return;
  try {
    const r = await api('POST', '/api/restore', data);
    toast(t('bk_restored', { p: r.players, r: r.rounds }));
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// Turnier zurücksetzen
$('#reset-btn').addEventListener('click', async () => {
  const answer = prompt(t('dz_prompt'));
  if (answer !== 'RESET') return;
  try {
    await api('POST', '/api/reset', { confirm: 'RESET' });
    toast(t('dz_done'));
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// ---------------------------------------------------------------------------
// Start & Live-Aktualisierung
// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

applyStatic(); // gespeicherte Sprache anwenden

saveQueue();  // Banner-Zustand herstellen (evtl. Reste aus letzter Sitzung)
flushQueue(); // liegengebliebene Einträge sofort nachsenden
window.addEventListener('online', flushQueue);
setInterval(flushQueue, 4000);

refresh(true);
setInterval(() => refresh(false), 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { flushQueue(); refresh(false); }
});
