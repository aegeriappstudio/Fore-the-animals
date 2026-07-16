/* Fore the Animals! – Golf Safari App */
'use strict';

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
  { key: 'zebra',     emoji: '🦓', name: 'Zebra',     type: 'pos', desc: 'Fairway getroffen' },
  { key: 'giraffe',   emoji: '🦒', name: 'Giraffe',   type: 'pos', desc: 'Grün in Regulation' },
  { key: 'rabbit',    emoji: '🐇', name: 'Rabbit',    type: 'pos', desc: 'Ein Putt / Chip-in' },
  { key: 'scorpion',  emoji: '🦂', name: 'Scorpion',  type: 'neg', desc: 'Ball im Bunker' },
  { key: 'crocodile', emoji: '🐊', name: 'Crocodile', type: 'neg', desc: 'Wasser / Penalty' },
  { key: 'snake',     emoji: '🐍', name: 'Snake',     type: 'neg', desc: '3 Putts oder mehr' },
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

function saveQueue() {
  localStorage.setItem('fta-queue', JSON.stringify(queue));
  const banner = $('#offline-banner');
  banner.hidden = queue.length === 0;
  $('#queue-count').textContent = queue.length;
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
        queue.shift();
        saveQueue();
      } catch (err) {
        if (err.status) {
          // Server hat den Eintrag abgelehnt – verwerfen, sonst hängt die Warteschlange
          queue.shift();
          saveQueue();
          toast(err.message, true);
        } else {
          break; // kein Netz – später erneut versuchen
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
  const t = $('#course-table');
  t.innerHTML = `
    <tr><th>Loch</th>${COURSE.map((h) => `<th>${h.hole}</th>`).join('')}<th>Total</th></tr>
    <tr><td>Par</td>${COURSE.map((h) => `<td>${h.par}</td>`).join('')}<td><strong>36</strong></td></tr>
    <tr><td>Meter</td>${COURSE.map((h) => `<td>${h.dist}</td>`).join('')}<td><strong>2682</strong></td></tr>
    <tr><td>Index</td>${COURSE.map((h) => `<td>${h.index}</td>`).join('')}<td></td></tr>`;
}

// --- Spieler ---
function renderPlayers() {
  const list = $('#player-list');
  if (!state.players.length) {
    list.innerHTML = '<p class="empty-note">Noch keine Spieler erfasst.</p>';
    return;
  }
  list.innerHTML = state.players.map((p) => `
    <div class="player-row">
      <span class="p-name">${esc(p.name)}</span>
      <span class="p-meta">HCP ${p.hcp}</span>
      <span class="badge">Ziel ${targetFor(p.hcp)}</span>
      <button type="button" class="btn small" data-edit-player="${p.id}">✏️</button>
      <button type="button" class="btn small" data-del-player="${p.id}">🗑️</button>
    </div>`).join('');
}

// --- Flights ---
function renderFlights() {
  const list = $('#flight-list');
  if (!state.flights.length) {
    list.innerHTML = '<p class="empty-note">Noch keine Flights erstellt.</p>';
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
          <h3>⛳ ${esc(f.name)} <small style="font-weight:400;color:var(--muted)">(${f.playerIds.length} Spieler)</small></h3>
          <button type="button" class="btn small" data-del-flight="${f.id}">🗑️</button>
        </div>
        <div class="flight-members">${chips || '<span class="empty-note">Keine verfügbaren Spieler</span>'}</div>
      </div>`;
  }).join('');
}

// --- Score-Eintrag ---
function renderEntry() {
  const sel = $('#entry-flight');
  sel.innerHTML = state.flights.length
    ? state.flights.map((f) => `<option value="${f.id}" ${f.id === currentFlightId ? 'selected' : ''}>${esc(f.name)}</option>`).join('')
    : '<option value="">– zuerst Flight erstellen –</option>';
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
    `Loch ${hInfo.hole} · Par ${hInfo.par} · ${hInfo.dist} m · Index ${hInfo.index}` +
    (hInfo.par === 3 ? ' · 🦓 Zebra nicht möglich (Par 3)' : '');

  // Spielerkarten
  const wrap = $('#entry-players');
  if (!flight || !flight.playerIds.length) {
    wrap.innerHTML = '<div class="card"><p class="empty-note">Diesem Flight sind noch keine Spieler zugeteilt.<br>👥 Unter «Spieler» Flight erstellen und Spieler zuteilen.</p></div>';
    return;
  }

  const nextLabel = currentHole < 9
    ? `✅ Loch ${currentHole} fertig – weiter zu Loch ${currentHole + 1}`
    : '✅ Loch 9 fertig – zur Rangliste 🏆';
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
        <span class="a-desc">${a.desc}</span></button>`;
    }).join('');
    return `
      <div class="entry-player">
        <div class="ep-head">
          <h3>${esc(p.name)}</h3>
          <span class="running">Ziel ${st.target} · Brutto ${st.gross} nach ${st.played} Löchern</span>
        </div>
        <div class="gross-row">
          <span class="gross-label">Brutto:</span>
          <div class="stepper">
            <button type="button" data-gross="-1" data-player="${pid}">−</button>
            ${grossDisplay}
            <button type="button" data-gross="1" data-player="${pid}">+</button>
          </div>
          <span class="hint">Par ${hInfo.par}</span>
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
    main.innerHTML = second.innerHTML = '<tr><td class="empty-note">Noch keine Spieler.</td></tr>';
    return;
  }

  const rows = state.players.map((p) => ({ p, ...playerStats(p) }));

  // Hauptwertung: Punkte, dann meiste Tiere, dann tieferes Brutto
  const sorted = [...rows].sort((a, b) =>
    b.points - a.points || b.totalAnimals - a.totalAnimals || a.gross - b.gross);
  main.innerHTML = `
    <tr><th>Rang</th><th style="text-align:left">Spieler</th><th>HCP</th><th>Ziel</th><th>Loch</th><th>Brutto</th><th>➕ Tiere</th><th>➖ Tiere</th><th>Punkte</th></tr>` +
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
    <tr><th>Rang</th><th style="text-align:left">Spieler</th><th>🦓</th><th>🦒</th><th>🐇</th><th>🦂</th><th>🐊</th><th>🐍</th><th>Total</th></tr>` +
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
    wrap.innerHTML = '<p class="empty-note">Noch keine gespeicherten Runden.</p>';
    return;
  }
  wrap.innerHTML = archive.map((r) => {
    const date = new Date(r.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const winner = r.results && r.results[0] ? r.results[0].name : '–';
    const table = `
      <div class="table-scroll">
        <table class="lb-table">
          <tr><th>Rang</th><th style="text-align:left">Spieler</th><th>HCP</th><th>Ziel</th><th>Brutto</th><th>➕</th><th>➖</th><th>Punkte</th></tr>
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
          <span class="ar-meta">${date} · Sieger: ${esc(winner)}</span>
        </summary>
        ${table}
        <button type="button" class="btn small danger" data-del-round="${r.id}">🗑️ Runde löschen</button>
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
    <tr><th>Rang</th><th style="text-align:left">Spieler</th><th>Runden</th><th>🏆 Siege</th><th>🐾 Tiere</th><th>Bestes Resultat</th></tr>` +
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
    <p class="hint">HCP ${hcp} · Ziel ${targetFor(hcp)}</p>
    <div class="table-scroll">
      <table class="sc-table">
        <tr><th>Loch</th>${COURSE.map((h) => `<th>${h.hole}</th>`).join('')}<th>Tot</th></tr>
        <tr><td>Par</td>${COURSE.map((h) => `<td>${h.par}</td>`).join('')}<td>36</td></tr>
        <tr><td>Brutto</td>${grossCells}<td><strong>${played ? gross : '–'}</strong></td></tr>
        <tr><td>Tiere</td>${animalCells}<td></td></tr>
      </table>
    </div>
    <p class="hint">🟢 unter Par · ⚪ Par · 🟠 Bogey · 🔴 Doppelbogey+</p>`;
  $('#modal').hidden = false;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

// Tabs
function switchTab(name) {
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
  window.scrollTo({ top: 0 });
}
$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  switchTab(btn.dataset.tab);
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
    toast(`${name} hinzugefügt 🎉`);
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// Spieler bearbeiten / löschen
$('#player-list').addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit-player]');
  const delBtn = e.target.closest('[data-del-player]');
  if (editBtn) {
    const p = state.players.find((x) => x.id === editBtn.dataset.editPlayer);
    const name = prompt('Name:', p.name);
    if (name === null) return;
    const hcp = prompt('Handicap:', p.hcp);
    if (hcp === null) return;
    try {
      await api('PUT', `/api/players/${p.id}`, { name, hcp });
      refresh(true);
    } catch (err) { toast(err.message, true); }
  }
  if (delBtn) {
    const p = state.players.find((x) => x.id === delBtn.dataset.delPlayer);
    if (!confirm(`${p.name} wirklich löschen? Alle Scores gehen verloren.`)) return;
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
    if (!confirm(`Flight «${f.name}» löschen? (Spieler und Scores bleiben erhalten)`)) return;
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
  if (state.players.length < 2) return toast('Zuerst Spieler erfassen', true);
  const answer = prompt('Maximale Anzahl Spieler pro Flight (2–4):', '3');
  if (answer === null) return;
  const size = parseInt(answer, 10);
  if (!(size >= 2 && size <= 4)) return toast('Bitte 2, 3 oder 4 eingeben', true);
  if (state.flights.length && !confirm('Bestehende Flights werden ersetzt. Weiter?')) return;
  try {
    await api('POST', '/api/flights/randomize', { size });
    toast('Flights zufällig ausgelost 🎲');
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
      if (!confirm(`Noch kein Brutto-Score für: ${names}.\nTrotzdem weiter?`)) return;
    }
    if (currentHole < 9) {
      currentHole += 1;
      localStorage.setItem('fta-hole', String(currentHole));
      renderEntry();
      window.scrollTo({ top: 0 });
      toast(`Loch ${currentHole} – gutes Gelingen! ⛳`);
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
    <div class="c-hint">Tippen für weiter</div>`;
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
  if (!rows.length) return toast('Noch keine Spieler erfasst', true);
  const byAnimals = [...rows].sort((a, b) => b.totalAnimals - a.totalAnimals || b.pos - a.pos);
  const pts = (r) => `${r.points > 0 ? '+' : ''}${r.points} Punkte · Brutto ${r.gross}`;

  ceremonySteps = [
    { emoji: '🎬', title: 'Preisverleihung', name: 'Fore the Animals!', sub: '9-Hole Golf Safari' },
  ];
  if (rows[2]) ceremonySteps.push({ emoji: '🥉', title: '3. Platz', name: rows[2].p.name, sub: pts(rows[2]) });
  if (rows[1]) ceremonySteps.push({ emoji: '🥈', title: '2. Platz', name: rows[1].p.name, sub: pts(rows[1]) });
  if (byAnimals[0] && byAnimals[0].totalAnimals > 0) {
    ceremonySteps.push({ emoji: '🐾', title: 'Zweiter Preis – meiste Tiere', name: byAnimals[0].p.name, sub: `${byAnimals[0].totalAnimals} Tiere gesammelt` });
  }
  ceremonySteps.push({ emoji: '🏆', title: 'Und der Sieg geht an…', name: rows[0].p.name, sub: pts(rows[0]), confetti: true });
  ceremonySteps.push({ emoji: '👏', title: 'Applaus!', name: 'Danke fürs Mitspielen', sub: 'Tippen zum Schliessen' });

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
  if (!rows.length) return toast('Noch keine Spieler erfasst', true);
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
  ctx.fillText('9-Hole Golf Safari · Rigi Holzhäusern', 40, 122);
  ctx.fillText(new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }), 40, 158);
  ctx.globalAlpha = 1;

  let y = headH + 42;
  ctx.fillStyle = '#1d5c3f'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Rang', 40, y); ctx.fillText('Spieler', 150, y);
  ctx.fillText('Brutto', 560, y); ctx.fillText('Tiere', 700, y); ctx.fillText('Punkte', 850, y);
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
    ctx.fillText(`🐾 Meiste Tiere: ${byAnimals[0].p.name} (${byAnimals[0].totalAnimals})`, 40, fy);
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
    toast('Bild heruntergeladen 📸');
  }, 'image/png');
});

// Runde abschliessen & speichern
$('#save-round-btn').addEventListener('click', async () => {
  const name = prompt('Name der Runde:', `Runde vom ${new Date().toLocaleDateString('de-CH')}`);
  if (name === null) return;
  if (!confirm('Runde jetzt abschliessen und speichern?\nDie Scores werden danach für eine neue Runde geleert.')) return;
  try {
    const r = await api('POST', '/api/rounds', { name });
    toast(`«${r.name}» gespeichert 💾`);
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
  if (!round || !confirm(`«${round.name}» endgültig löschen?`)) return;
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
  toast('Backup heruntergeladen ⬇️');
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
    return toast('Datei ist kein gültiges Backup', true);
  }
  if (!confirm('Backup wiederherstellen?\nDer aktuelle Stand auf dem Server wird komplett ersetzt.')) return;
  try {
    const r = await api('POST', '/api/restore', data);
    toast(`Wiederhergestellt: ${r.players} Spieler, ${r.rounds} Runden ✅`);
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// Turnier zurücksetzen
$('#reset-btn').addEventListener('click', async () => {
  const answer = prompt('Wirklich ALLE Scores löschen? Tippe RESET zum Bestätigen:');
  if (answer !== 'RESET') return;
  try {
    await api('POST', '/api/reset', { confirm: 'RESET' });
    toast('Alle Scores gelöscht');
    refresh(true);
  } catch (err) { toast(err.message, true); }
});

// ---------------------------------------------------------------------------
// Start & Live-Aktualisierung
// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

saveQueue();  // Banner-Zustand herstellen (evtl. Reste aus letzter Sitzung)
flushQueue(); // liegengebliebene Einträge sofort nachsenden
window.addEventListener('online', flushQueue);
setInterval(flushQueue, 4000);

refresh(true);
setInterval(() => refresh(false), 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { flushQueue(); refresh(false); }
});
