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
  { key: 'scorpion',  emoji: '🦂', name: 'Scorpion',  type: 'neg', desc: 'Bunker' },
  { key: 'crocodile', emoji: '🐊', name: 'Crocodile', type: 'neg', desc: 'Wasser / Penalty' },
  { key: 'snake',     emoji: '🐍', name: 'Snake',     type: 'neg', desc: '3+ Putts' },
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
    if (!res.ok) throw new Error(data.error || 'Fehler');
    return data;
  } finally {
    if (method !== 'GET') pendingWrites = Math.max(0, pendingWrites - 1);
  }
}

async function refresh(force) {
  try {
    const fresh = await api('GET', '/api/state');
    if (pendingWrites > 0 && !force) return; // eigene Änderung unterwegs – nicht überschreiben
    if (fresh.version !== state.version || force) {
      state = fresh;
      renderAll();
    }
  } catch (err) {
    console.error(err);
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
      <button class="btn small" data-edit-player="${p.id}">✏️</button>
      <button class="btn small" data-del-player="${p.id}">🗑️</button>
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
          <button class="btn small" data-del-flight="${f.id}">🗑️</button>
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
    return `<button data-hole="${h.hole}" class="${h.hole === currentHole ? 'active' : ''} ${done ? 'done' : ''}">${h.hole}</button>`;
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
      return `<button class="animal-btn ${a.type} ${on ? 'on' : ''}" ${disabled ? 'disabled' : ''}
        data-animal="${a.key}" data-player="${pid}" title="${a.desc}">
        <span class="emoji">${a.emoji}</span>${a.name}</button>`;
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
            <button data-gross="-1" data-player="${pid}">−</button>
            ${grossDisplay}
            <button data-gross="1" data-player="${pid}">+</button>
          </div>
          <span class="hint">Par ${hInfo.par}</span>
        </div>
        <div class="animal-btns">${animalBtns}</div>
      </div>`;
  }).join('');
}

// --- Rangliste ---
function medal(rank) {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
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
      <tr class="rank-${i + 1}">
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

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

// Tabs
$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b === btn));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + btn.dataset.tab));
  window.scrollTo({ top: 0 });
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

// Brutto & Tiere eintragen
$('#entry-players').addEventListener('click', async (e) => {
  const grossBtn = e.target.closest('button[data-gross]');
  const animalBtn = e.target.closest('button[data-animal]');

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
    try {
      const r = await api('PUT', `/api/scores/${pid}/${currentHole}`, { gross });
      state.version = r.version;
    } catch (err) { toast(err.message, true); refresh(true); }
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
    try {
      const r = await api('PUT', `/api/scores/${pid}/${currentHole}`, { animals: { [key]: animals[key] } });
      state.version = r.version;
    } catch (err) { toast(err.message, true); refresh(true); }
  }
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
refresh(true);
setInterval(() => refresh(false), 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh(false);
});
