/* Fore the Animals! – Golf Safari App
 *
 * Aufbau dieser Datei:
 *   1. Hilfen (DOM, Toast)
 *   2. Zustand: Server-Schnappschuss + lokale, noch nicht gesendete Eingaben
 *   3. API & Synchronisation
 *   4. Rendering (immer nur der sichtbare Tab)
 *   5. Bedienung (Events)
 *
 * Zum Datenfluss: Der Server-Stand (`srv`) wird nie von lokalen Eingaben
 * überschrieben und lokale Eingaben nie vom Server. Getippte, noch nicht
 * bestätigte Werte liegen in `pending` und werden beim Lesen über den
 * Server-Stand gelegt. Dadurch kann die Live-Aktualisierung immer laufen –
 * auch während eigene Einträge unterwegs sind.
 *
 * Wer heute mitspielt, ergibt sich allein aus der Flight-Zuteilung; ein
 * eigenes Anwesenheits-Feld gibt es nicht.
 */
'use strict';

(function () {
  var M = window.FTA;
  var I = window.I18N;
  var t = I.t;

  // ---------------------------------------------------------------------------
  // 1. Hilfen
  // ---------------------------------------------------------------------------
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, isError) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'show' + (isError ? ' error' : '');
    el.onclick = null;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = ''; }, 2600);
  }

  // Bleibt stehen, bis jemand tippt – für den Hinweis auf eine neue Version.
  function stickyToast(msg, onClick) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'show action';
    clearTimeout(el._t);
    el.onclick = onClick;
  }

  function signed(n) { return (n > 0 ? '+' : '') + n; }

  function formatTime(ts) {
    if (!ts) return '–';
    return new Date(ts).toLocaleTimeString(I.dateLocale(), { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(value, withWeekday) {
    var d = new Date(value);
    if (isNaN(d)) return '';
    var opts = withWeekday
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' };
    return d.toLocaleDateString(I.dateLocale(), opts);
  }

  // "2026-08-06T18:30" → "Do. 06.08.2026, 18:30"
  function formatTee(teeTime, timeOnly) {
    if (!teeTime) return '';
    var d = new Date(teeTime);
    if (isNaN(d)) return '';
    var time = d.toLocaleTimeString(I.dateLocale(), { hour: '2-digit', minute: '2-digit' });
    if (timeOnly) return time;
    return d.toLocaleDateString(I.dateLocale(), { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + time;
  }

  // ---------------------------------------------------------------------------
  // 2. Zustand
  // ---------------------------------------------------------------------------
  var srv = {
    rev: -1, players: [], flights: [], events: [], scores: {}, rounds: [], allTime: [], updatedAt: null,
  };

  var ui = {
    tab: 'info',
    flightId: localStorage.getItem('fta-flight') || '',
    hole: parseInt(localStorage.getItem('fta-hole') || '1', 10) || 1,
    unlocked: sessionStorage.getItem('fta-unlocked') === '1',
    lbRound: 'live',                 // 'live' oder die ID einer gespeicherten Runde
  };

  var roundCache = new Map();        // id → vollständige Runde (inkl. Scores)
  var lastPullAt = 0;
  var netDown = false;

  // --- Noch nicht gesendete Score-Eingaben --------------------------------
  var pending = new Map();           // "pid|hole" → {playerId, hole, gross?, animals, seq}
  var seq = 0;

  function pkey(pid, hole) { return pid + '|' + hole; }

  function loadPending() {
    try {
      var raw = JSON.parse(localStorage.getItem('fta-pending') || '[]');
      raw.forEach(function (item) {
        if (!item || !item.playerId) return;
        item.animals = item.animals || {};
        item.seq = ++seq;
        pending.set(pkey(item.playerId, item.hole), item);
      });
    } catch (err) { /* kaputter Eintrag – verwerfen */ }

    // Warteschlange der Vorgängerversion übernehmen: Wer die App mitten in
    // einer Runde aktualisiert, verliert so keine ungesendeten Einträge.
    try {
      var old = JSON.parse(localStorage.getItem('fta-queue') || '[]');
      old.forEach(function (item) {
        if (!item || !item.pid || !item.body) return;
        queuePatch(item.pid, item.hole, item.body);
      });
      if (old.length) localStorage.removeItem('fta-queue');
    } catch (err) {
      localStorage.removeItem('fta-queue');
    }
  }

  function savePending() {
    try {
      localStorage.setItem('fta-pending', JSON.stringify(Array.from(pending.values())));
    } catch (err) { /* Speicher voll – Einträge bleiben wenigstens im RAM */ }
    updateSyncBanner();
  }

  function queuePatch(playerId, hole, patch) {
    var k = pkey(playerId, hole);
    var cur = pending.get(k) || { playerId: playerId, hole: hole, animals: {} };
    if (Object.prototype.hasOwnProperty.call(patch, 'gross')) cur.gross = patch.gross;
    if (patch.animals) {
      Object.keys(patch.animals).forEach(function (key) { cur.animals[key] = !!patch.animals[key]; });
    }
    cur.seq = ++seq;
    pending.set(k, cur);
    savePending();
    scheduleFlush();
  }

  // Score eines Spielers auf einem Loch: Serverstand + eigene, noch offene Eingabe
  function entryFor(playerId, hole) {
    var base = (srv.scores[playerId] || {})[hole] || null;
    var patch = pending.get(pkey(playerId, hole));
    if (!patch) return base;
    return M.mergeEntry(base, patch, hole);
  }

  function scoresFor(playerId) {
    var out = {};
    M.COURSE.forEach(function (h) {
      var e = entryFor(playerId, h.hole);
      if (e && (e.gross != null || Object.keys(e.animals || {}).length)) out[h.hole] = e;
    });
    return out;
  }

  // Alle Scores der laufenden Runde inklusive offener Eingaben
  function liveScores() {
    var out = {};
    srv.players.forEach(function (p) { out[p.id] = scoresFor(p.id); });
    return out;
  }

  function todaysPlayers() {
    return M.todaysPlayers(srv.players, srv.flights, liveScores());
  }

  function playerById(id) {
    return srv.players.find(function (p) { return p.id === id; });
  }

  function flightsSorted() {
    return srv.flights.slice().sort(function (a, b) {
      if (!!a.teeTime !== !!b.teeTime) return a.teeTime ? -1 : 1;
      if (a.teeTime !== b.teeTime) return String(a.teeTime).localeCompare(String(b.teeTime));
      return String(a.name).localeCompare(String(b.name));
    });
  }

  // Kurzbezeichnung für die Zuteilungs-Chips: «Flight 2» → «2»
  function flightLabel(flight) {
    var match = /^\s*Flight\s*(\d+)\s*$/i.exec(flight.name || '');
    return match ? match[1] : String(flight.name || '?').slice(0, 8);
  }

  function progressText(flight) {
    var p = M.flightProgress(flight, liveScores());
    if (p.finished) return t('f_done');
    if (!p.started) return t('f_not_started');
    return t('f_progress', { n: p.done, m: p.holes }) + ' · ' + t('f_at_hole', { h: p.current });
  }

  // ---------------------------------------------------------------------------
  // 3. API & Synchronisation
  // ---------------------------------------------------------------------------
  async function api(method, url, body) {
    var headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    var pin = sessionStorage.getItem('fta-pin');
    // Die PIN geht bei Schreibzugriffen mit – und beim Backup, dem einzigen
    // geschützten GET. Die regelmässigen Abfragen bleiben dadurch PIN-frei.
    if (pin && (method !== 'GET' || url.indexOf('/api/backup') === 0)) headers['x-fta-pin'] = pin;
    var res = await fetch(url, {
      method: method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    var data;
    try { data = await res.json(); } catch (err) { data = {}; }
    if (!res.ok) {
      // 403 heisst: PIN fehlt, ist falsch oder wurde am Server geändert
      if (res.status === 403 && url !== '/api/unlock') sessionStorage.removeItem('fta-pin');
      var error = new Error(data.error || t('err_generic'));
      error.status = res.status; // HTTP-Fehler vs. Netzwerkfehler (dann kein status)
      throw error;
    }
    return data;
  }

  async function ensurePin() {
    if (sessionStorage.getItem('fta-pin')) return true;
    var pin = prompt(t('pin_prompt'));
    if (!pin) return false;
    try {
      await api('POST', '/api/unlock', { pin: pin });
      sessionStorage.setItem('fta-pin', pin);
      return true;
    } catch (err) {
      toast(err.status === 403 ? err.message : t('err_generic'), true);
      return false;
    }
  }

  function apiError(err) {
    toast(err.status === 403 ? t('pin_denied') : (err.message || t('err_generic')), true);
  }

  // --- Holen -------------------------------------------------------------
  var pulling = false;

  async function pull(force) {
    // Bei schlechtem Empfang können Abfragen lange hängen – dann nicht immer
    // weitere hinterherschicken.
    if (pulling) return false;
    pulling = true;
    try {
      var data = await api('GET', '/api/state' + (force ? '' : '?rev=' + srv.rev));
      lastPullAt = Date.now();
      netDown = false;
      updateSyncBanner();
      if (data.unchanged) return false;
      srv = data;
      roundCache.forEach(function (_, id) {
        if (!srv.rounds.some(function (r) { return r.id === id; })) roundCache.delete(id);
      });
      render();
      return true;
    } catch (err) {
      if (!err.status) { netDown = true; updateSyncBanner(); }
      return false;
    } finally {
      pulling = false;
    }
  }

  var roundLoading = new Set();

  async function loadRound(id) {
    if (roundCache.has(id)) return roundCache.get(id);
    if (roundLoading.has(id)) return null;   // läuft schon – nicht doppelt holen
    roundLoading.add(id);
    try {
      var data = await api('GET', '/api/rounds/' + id);
      roundCache.set(id, data.round);
      render();
      return data.round;
    } catch (err) {
      toast(err.message || t('err_generic'), true);
      return null;
    } finally {
      roundLoading.delete(id);
    }
  }

  // --- Senden ------------------------------------------------------------
  var flushTimer = null;
  var flushing = false;

  function scheduleFlush(delay) {
    clearTimeout(flushTimer);
    // Kurz bündeln: mehrere Taps hintereinander gehen als ein Request raus.
    flushTimer = setTimeout(flush, delay === undefined ? 400 : delay);
  }

  async function flush() {
    if (flushing || !pending.size) return;
    flushing = true;
    var batch = Array.from(pending.values()).slice(0, 100).map(function (p) {
      return { playerId: p.playerId, hole: p.hole, gross: p.gross, animals: Object.assign({}, p.animals), seq: p.seq };
    });
    try {
      var res = await api('PUT', '/api/scores', { entries: batch });
      netDown = false;
      // Nur die Einträge entfernen, die seither nicht erneut angetippt wurden
      batch.forEach(function (sent) {
        var k = pkey(sent.playerId, sent.hole);
        var cur = pending.get(k);
        if (cur && cur.seq === sent.seq) pending.delete(k);
      });
      (res.applied || []).forEach(function (a) {
        if (!srv.scores[a.playerId]) srv.scores[a.playerId] = {};
        if (a.entry) srv.scores[a.playerId][a.hole] = a.entry;
        else delete srv.scores[a.playerId][a.hole];
      });
      if (res.rev != null) srv.rev = res.rev;
      savePending();
      if (res.rejected && res.rejected.length) {
        toast(res.rejected[0].error, true);
        pull(true);
      }
      render();
      if (pending.size) scheduleFlush(0);
    } catch (err) {
      if (err.status) {
        // Der Server hat abgelehnt – verwerfen, sonst hängt die Warteschlange
        // für immer. Danach den echten Stand holen.
        batch.forEach(function (sent) {
          var k = pkey(sent.playerId, sent.hole);
          var cur = pending.get(k);
          if (cur && cur.seq === sent.seq) pending.delete(k);
        });
        savePending();
        toast(err.message || t('err_generic'), true);
        pull(true);
      } else {
        netDown = true;      // kein Netz – der Takt versucht es später erneut
        updateSyncBanner();
      }
    } finally {
      flushing = false;
    }
  }

  function updateSyncBanner() {
    var banner = $('#offline-banner');
    if (!banner) return;
    var show = netDown && pending.size > 0;
    banner.hidden = !show;
    if (show) banner.textContent = t('off_banner', { n: pending.size });
  }

  // --- Takt --------------------------------------------------------------
  function pollInterval() {
    if (pending.size) return 4000;
    if (ui.tab === 'entry') return 5000;
    if (ui.tab === 'leaderboard' && ui.unlocked) return 5000;
    return 20000;
  }

  function tick() {
    if (document.hidden) return;
    if (pending.size) flush();
    if (Date.now() - lastPullAt >= pollInterval()) pull(false);
  }

  // ---------------------------------------------------------------------------
  // 4. Rendering
  // ---------------------------------------------------------------------------
  var RENDER = {
    info: renderInfo,
    tournament: renderTournament,
    entry: renderEntry,
    leaderboard: renderLeaderboard,
  };

  // Es wird immer nur der sichtbare Tab neu aufgebaut – das spart Arbeit und
  // stört keine Eingabefelder in den anderen Tabs.
  function render() {
    var fn = RENDER[ui.tab];
    if (fn) fn();
  }

  // --- Info: Termine + Regeln ---------------------------------------------
  function renderInfo() {
    renderDates();
    renderCourseTable();
  }

  function renderCourseTable() {
    $('#course-table').innerHTML =
      '<tr><th>' + t('c_hole') + '</th>' + M.COURSE.map(function (h) { return '<th>' + h.hole + '</th>'; }).join('') + '<th>' + t('c_total') + '</th></tr>' +
      '<tr><td>' + t('c_par') + '</td>' + M.COURSE.map(function (h) { return '<td>' + h.par + '</td>'; }).join('') + '<td><strong>' + M.PAR_TOTAL + '</strong></td></tr>' +
      '<tr><td>' + t('c_meters') + '</td>' + M.COURSE.map(function (h) { return '<td>' + h.dist + '</td>'; }).join('') + '<td><strong>' + M.DIST_TOTAL + '</strong></td></tr>' +
      '<tr><td>' + t('c_index') + '</td>' + M.COURSE.map(function (h) { return '<td>' + h.index + '</td>'; }).join('') + '<td></td></tr>';
  }

  function renderDates() {
    var wrap = $('#event-list');
    var today = new Date().toISOString().slice(0, 10);
    // Kommende Termine zuerst (chronologisch), vergangene danach
    var events = srv.events.slice().sort(function (a, b) {
      var pastA = String(a.date) < today;
      var pastB = String(b.date) < today;
      if (pastA !== pastB) return pastA ? 1 : -1;
      return pastA ? String(b.date).localeCompare(String(a.date)) : String(a.date).localeCompare(String(b.date));
    });
    if (!events.length) {
      wrap.innerHTML = '<div class="card"><p class="empty-note">' + t('ev_none') + '</p></div>';
      return;
    }
    wrap.innerHTML = events.map(function (ev) {
      // T12:00 verhindert, dass die Zeitzone das Datum um einen Tag verschiebt
      var dateStr = ev.date ? formatDate(ev.date + 'T12:00', true) : '';
      var past = String(ev.date) < today;
      var facts = [];
      if (dateStr) facts.push('<li><span class="ef-icon">📅</span><span class="ef-label">' + t('d_lbl_date') + '</span><span class="ef-val">' + esc(dateStr) + '</span></li>');
      if (ev.flights) facts.push('<li><span class="ef-icon">⛳</span><span class="ef-label">' + t('d_lbl_flights') + '</span><span class="ef-val">' + esc(ev.flights) + '</span></li>');
      if (ev.dinner) facts.push('<li><span class="ef-icon">🍽️</span><span class="ef-label">' + t('d_lbl_dinner') + '</span><span class="ef-val">' + esc(ev.dinner) + '</span></li>');

      return '<div class="card event ' + (ev.confirmed ? 'event-confirmed' : 'event-tentative') + (past ? ' event-past' : '') + '">' +
        '<div class="event-head"><h2>' + esc(ev.name) + '</h2>' +
        '<span class="event-badge ' + (ev.confirmed ? 'confirmed' : 'tentative') + '">' + t(ev.confirmed ? 'd_badge_confirmed' : 'd_badge_tentative') + '</span></div>' +
        '<ul class="event-facts">' + facts.join('') + '</ul>' +
        (ev.note ? '<p class="hint">' + esc(ev.note) + '</p>' : '') +
        '<div class="event-actions">' +
        '<button type="button" class="btn small" data-edit-event="' + ev.id + '">✏️</button>' +
        '<button type="button" class="btn small" data-del-event="' + ev.id + '">🗑️</button>' +
        '</div></div>';
    }).join('');
  }

  // --- Turnier: Spieler + Flights -----------------------------------------
  function renderTournament() {
    renderPlayers();
    renderFlights();
  }

  function renderPlayers() {
    var list = $('#player-list');
    var summary = $('#today-summary');
    if (!srv.players.length) {
      list.innerHTML = '<p class="empty-note">' + t('p_none') + '</p>';
      summary.textContent = '';
      return;
    }
    // Nicht neu aufbauen, während ein HCP-Feld bearbeitet wird
    if (list.contains(document.activeElement) && document.activeElement.classList.contains('p-hcp-input')) return;

    var today = todaysPlayers();
    summary.textContent = today.length
      ? t('tn_summary', { n: today.length, m: srv.players.length, f: srv.flights.length })
      : t('tn_nobody');

    var flights = flightsSorted();
    list.innerHTML = srv.players.map(function (p) {
      var mine = M.flightOf(srv.flights, p.id);
      var chips = '<button type="button" class="fchip ' + (mine ? '' : 'on') + '" data-assign="' + p.id + '" data-flight="" title="' + t('tn_out') + '">–</button>' +
        flights.map(function (f) {
          return '<button type="button" class="fchip ' + (mine && mine.id === f.id ? 'on' : '') + '" data-assign="' + p.id + '" data-flight="' + f.id + '" title="' + esc(f.name) + '">' + esc(flightLabel(f)) + '</button>';
        }).join('') +
        '<button type="button" class="fchip new" data-assign="' + p.id + '" data-flight="new" title="' + t('f_add') + '">＋</button>';

      return '<div class="player-row ' + (mine ? 'playing' : 'out') + '">' +
        '<span class="p-name">' + esc(p.name) + '</span>' +
        '<label class="p-hcp">' + t('ph_hcp') +
        '<input type="number" class="p-hcp-input" data-hcp-player="' + p.id + '" value="' + esc(p.hcp) + '" step="0.1" min="' + M.MIN_HCP + '" max="' + M.MAX_HCP + '" inputmode="decimal" aria-label="' + t('ph_hcp') + ' ' + esc(p.name) + '"></label>' +
        '<span class="badge" data-target-for="' + p.id + '">' + t('p_target') + ' ' + M.targetFor(p.hcp) + '</span>' +
        '<button type="button" class="btn small" data-edit-player="' + p.id + '" title="' + t('p_rename') + '">✏️</button>' +
        '<button type="button" class="btn small" data-del-player="' + p.id + '">🗑️</button>' +
        '<div class="p-flights">' + chips + '</div>' +
        '</div>';
    }).join('');
  }

  function renderFlights() {
    var list = $('#flight-list');
    if (!srv.flights.length) {
      list.innerHTML = '<p class="empty-note">' + t('f_none') + '</p>';
      return;
    }
    // Nicht neu aufbauen, während der Datums-Picker offen ist
    if (list.contains(document.activeElement) && document.activeElement.classList.contains('tee-input')) return;
    list.innerHTML = flightsSorted().map(function (f) {
      var members = f.playerIds.map(function (pid) {
        var p = playerById(pid);
        if (!p) return '';
        return '<span class="member-chip in" data-remove-player="' + pid + '">' + esc(p.name) + ' ✕</span>';
      }).join('');
      return '<div class="flight-card">' +
        '<div class="flight-head">' +
        '<h3>⛳ ' + esc(f.name) + ' <small>' + t('f_count', { n: f.playerIds.length }) + '</small></h3>' +
        '<div class="fh-actions">' +
        '<button type="button" class="btn small" data-rename-flight="' + f.id + '" title="' + t('p_rename') + '">✏️</button>' +
        '<button type="button" class="btn small" data-del-flight="' + f.id + '">🗑️</button></div></div>' +
        '<div class="flight-progress">' + progressText(f) + '</div>' +
        '<label class="flight-tee">🕐 ' + t('f_tee') +
        '<input type="datetime-local" class="tee-input" data-tee-flight="' + f.id + '" value="' + esc(f.teeTime || '') + '">' +
        (f.teeTime ? '<span class="tee-pretty">' + formatTee(f.teeTime) + '</span>' : '') + '</label>' +
        '<div class="flight-members">' + (members || '<span class="empty-note">' + t('f_empty') + '</span>') + '</div>' +
        '</div>';
    }).join('');
  }

  // --- Eintragen -----------------------------------------------------------
  function grossPicker(pid, entry, par) {
    var cur = entry && entry.gross != null ? entry.gross : null;
    var values = [];
    for (var v = Math.max(M.MIN_GROSS, par - 2); v <= par + 4; v++) values.push(v);
    if (cur !== null && values.indexOf(cur) === -1) values.push(cur);
    values.sort(function (a, b) { return a - b; });

    var buttons = values.map(function (value) {
      return '<button type="button" class="g-btn ' + (value === cur ? 'on' : '') + (value === par ? ' par' : '') +
        '" data-gross-set="' + value + '" data-player="' + pid + '">' + value + '</button>';
    }).join('');
    var more = cur !== null && cur < M.MAX_GROSS
      ? '<button type="button" class="g-btn more" data-gross-more="1" data-player="' + pid + '" title="' + t('e_more') + '">＋</button>'
      : '';
    var clear = cur !== null
      ? '<button type="button" class="g-btn clear" data-gross-set="" data-player="' + pid + '" title="' + t('e_clear') + '">✕</button>'
      : '';
    return '<div class="gross-picker">' + buttons + more + clear + '</div>';
  }

  function renderEntry() {
    var sel = $('#entry-flight');
    var sorted = flightsSorted();
    if (!srv.flights.some(function (f) { return f.id === ui.flightId; })) {
      ui.flightId = sorted[0] ? sorted[0].id : '';
    }
    sel.innerHTML = sorted.length
      ? sorted.map(function (f) {
          var tee = f.teeTime ? ' · ' + formatTee(f.teeTime, true) : '';
          return '<option value="' + f.id + '"' + (f.id === ui.flightId ? ' selected' : '') + '>' + esc(f.name) + esc(tee) + '</option>';
        }).join('')
      : '<option value="">' + t('e_select_first') + '</option>';
    sel.value = ui.flightId;

    var flight = srv.flights.find(function (f) { return f.id === ui.flightId; });
    var info = M.COURSE[ui.hole - 1];

    $('#hole-picker').innerHTML = M.COURSE.map(function (h) {
      var done = flight && flight.playerIds.length > 0 && flight.playerIds.every(function (pid) {
        var e = entryFor(pid, h.hole);
        return e && e.gross != null;
      });
      return '<button type="button" data-hole="' + h.hole + '" class="' + (h.hole === ui.hole ? 'active' : '') + ' ' + (done ? 'done' : '') + '">' + h.hole + '</button>';
    }).join('');

    $('#hole-info').textContent =
      t('e_hole_info', { h: info.hole, p: info.par, d: info.dist, i: info.index }) +
      (info.par === 3 ? t('e_no_zebra') : '') +
      (flight && flight.teeTime ? ' · 🕐 ' + formatTee(flight.teeTime, true) : '');

    $('#entry-progress').textContent = flight ? progressText(flight) : '';
    $('#flight-card-btn').hidden = !flight || !flight.playerIds.length;

    var wrap = $('#entry-players');
    if (!flight || !flight.playerIds.length) {
      wrap.innerHTML = '<div class="card"><p class="empty-note">' + t('e_no_players') + '</p></div>';
      return;
    }

    var nextLabel = ui.hole < M.HOLES ? t('e_next', { h: ui.hole, n: ui.hole + 1 }) : t('e_next_last');

    wrap.innerHTML = flight.playerIds.map(function (pid) {
      var p = playerById(pid);
      if (!p) return '';
      var entry = entryFor(pid, ui.hole) || { gross: null, animals: {} };
      var stats = M.playerResult(p, scoresFor(pid));
      var animalBtns = M.ANIMALS.map(function (a) {
        var on = !!(entry.animals && entry.animals[a.key]);
        var disabled = !M.animalAllowed(a.key, ui.hole);
        return '<button type="button" class="animal-btn ' + a.type + ' ' + (on ? 'on' : '') + '"' + (disabled ? ' disabled' : '') +
          ' data-animal="' + a.key + '" data-player="' + pid + '">' +
          '<span class="a-pts">' + (a.type === 'pos' ? '+1' : '−1') + '</span>' +
          '<span class="emoji">' + a.emoji + '</span>' +
          '<span class="a-name">' + a.name + '</span>' +
          '<span class="a-desc">' + esc(I.animalDesc(a.key)) + '</span></button>';
      }).join('');
      return '<div class="entry-player">' +
        '<div class="ep-head"><h3>' + esc(p.name) + '</h3>' +
        '<button type="button" class="btn small" data-card="' + pid + '">' + t('e_card') + '</button></div>' +
        '<div class="ep-sub">' + t('e_running', { t: stats.target, g: stats.gross, n: stats.played }) + '</div>' +
        '<div class="gross-row"><span class="gross-label">' + t('e_gross') + '</span>' +
        grossPicker(pid, entry, info.par) + '</div>' +
        '<div class="animal-btns">' + animalBtns + '</div></div>';
    }).join('') + '<button type="button" class="btn primary next-hole" id="next-hole-btn">' + nextLabel + '</button>';
  }

  // --- Rangliste -----------------------------------------------------------
  function medal(rank) {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
  }

  /**
   * Was zeigt die Rangliste gerade?
   *  live    – die laufende Runde (Server-Stand + eigene offene Eingaben)
   *  saved   – eine gespeicherte Runde
   *  loading – gespeicherte Runde wird gerade geholt
   *  empty   – es gibt (noch) nichts zu zeigen
   */
  function leaderboardData() {
    if (ui.lbRound !== 'live') {
      var round = roundCache.get(ui.lbRound);
      if (!round) { loadRound(ui.lbRound); return { kind: 'loading', rows: [], waiting: [] }; }
      return { kind: 'saved', round: round, rows: round.results || [], waiting: [] };
    }
    var rows = [];
    var waiting = [];
    todaysPlayers().forEach(function (p) {
      var scores = scoresFor(p.id);
      var result = M.playerResult(p, scores);
      // Wer noch nichts eingetragen hat, steht nicht in der Wertung – sonst
      // würde die Par-Prognose Spieler mit hohem Handicap nach vorne spülen.
      if (M.hasScores(scores)) rows.push(result); else waiting.push(result);
    });
    return { kind: rows.length ? 'live' : 'empty', rows: rows, waiting: waiting };
  }

  function renderLeaderboard() {
    $('#lb-lock').hidden = ui.unlocked;
    $('#lb-content').hidden = !ui.unlocked;
    if (!ui.unlocked) return;

    renderRoundPicker();
    renderLeaderboardTables(leaderboardData());
    renderArchive();
    renderAllTime();
    $('#save-round-card').hidden = ui.lbRound !== 'live';
  }

  function renderRoundPicker() {
    var sel = $('#lb-round');
    var options = ['<option value="live">' + t('lb_live') + '</option>'];
    srv.rounds.forEach(function (r) {
      options.push('<option value="' + r.id + '">' + esc(r.name) + ' · ' + esc(formatDate(r.date)) + '</option>');
    });
    sel.innerHTML = options.join('');
    if (ui.lbRound !== 'live' && !srv.rounds.some(function (r) { return r.id === ui.lbRound; })) ui.lbRound = 'live';
    sel.value = ui.lbRound;
    sel.parentElement.hidden = srv.rounds.length === 0;
  }

  function statusLine(data) {
    if (data.kind === 'saved') return t('lb_saved_status', { date: formatDate(data.round.date) });
    if (data.kind === 'live') {
      var done = data.rows.filter(function (r) { return r.complete; }).length;
      return t('lb_live_status', { n: done, m: data.rows.length, time: formatTime(lastPullAt) });
    }
    return '';
  }

  function renderLeaderboardTables(data) {
    var main = $('#lb-main');
    var second = $('#lb-animals');
    $('#lb-status').textContent = statusLine(data);

    if (data.kind === 'loading') {
      main.innerHTML = second.innerHTML = '<tr><td class="empty-note">' + t('lb_loading') + '</td></tr>';
      return;
    }
    if (!data.rows.length) {
      var note = !srv.players.length ? t('lb_no_players') : t('lb_no_round');
      main.innerHTML = second.innerHTML = '<tr><td class="empty-note">' + note + '</td></tr>';
      return;
    }

    var ranked = M.ranked(data.rows, M.compareMain);
    main.innerHTML =
      '<tr><th>' + t('h_rank') + '</th><th class="col-name">' + t('h_player') + '</th>' +
      '<th class="col-detail">HCP</th><th class="col-detail">' + t('h_target') + '</th>' +
      '<th>' + t('h_thru') + '</th><th class="col-detail">' + t('h_gross') + '</th>' +
      '<th class="col-detail">' + t('h_pos') + '</th><th class="col-detail">' + t('h_neg') + '</th>' +
      '<th>' + t('h_points') + '</th></tr>' +
      ranked.map(function (r) {
        return '<tr class="rank-' + r.rank + '" data-pid="' + esc(r.id) + '">' +
          '<td>' + medal(r.rank) + '</td>' +
          '<td class="col-name name-cell">' + esc(r.name) + (r.complete ? '' : ' <span class="open-mark" title="' + t('sc_open', { n: M.HOLES - r.played }) + '">*</span>') +
          '<span class="row-meta">' + t('row_meta', { hcp: r.hcp, target: r.target, gross: r.gross, pos: r.pos, neg: r.neg }) + '</span></td>' +
          '<td class="col-detail">' + r.hcp + '</td>' +
          '<td class="col-detail">' + r.target + '</td>' +
          '<td>' + (r.complete ? 'F' : r.played) + '</td>' +
          '<td class="col-detail">' + (r.played ? r.gross : '–') + '</td>' +
          '<td class="col-detail">+' + r.pos + '</td>' +
          '<td class="col-detail">−' + r.neg + '</td>' +
          '<td class="pts ' + (r.points < 0 ? 'neg-pts' : '') + '">' + signed(r.points) + '</td>' +
          '</tr>';
      }).join('') +
      (data.waiting && data.waiting.length
        ? '<tr><td colspan="9" class="lb-waiting">⏳ ' + data.waiting.map(function (r) { return esc(r.name); }).join(', ') + '</td></tr>'
        : '');

    var byAnimals = M.ranked(data.rows, M.compareAnimals);
    second.innerHTML =
      '<tr><th>' + t('h_rank') + '</th><th class="col-name">' + t('h_player') + '</th>' +
      M.ANIMALS.map(function (a) { return '<th class="col-detail">' + a.emoji + '</th>'; }).join('') +
      '<th>' + t('h_total') + '</th></tr>' +
      byAnimals.map(function (r) {
        var strip = M.ANIMALS.map(function (a) {
          var n = r.counts[a.key] || 0;
          return n ? '<span class="ani-chip ' + a.type + '">' + a.emoji + (n > 1 ? '&times;' + n : '') + '</span>' : '';
        }).join('');
        return '<tr class="rank-' + r.rank + '">' +
          '<td>' + medal(r.rank) + '</td>' +
          '<td class="col-name name-cell">' + esc(r.name) + '<span class="row-meta ani-strip">' + (strip || '–') + '</span></td>' +
          M.ANIMALS.map(function (a) { return '<td class="col-detail">' + (r.counts[a.key] || '') + '</td>'; }).join('') +
          '<td class="pts">' + r.totalAnimals + '</td></tr>';
      }).join('');
  }

  function renderArchive() {
    var wrap = $('#archive-list');
    if (!srv.rounds.length) {
      wrap.innerHTML = '<p class="empty-note">' + t('ar_none') + '</p>';
      return;
    }
    wrap.innerHTML = srv.rounds.map(function (r) {
      var winners = (r.winners || []).map(function (w) { return esc(w.name) + ' (' + signed(w.points) + ')'; }).join(', ') || '–';
      return '<div class="archive-round ' + (r.id === ui.lbRound ? 'current' : '') + '">' +
        '<div class="ar-head"><span class="ar-name">🏆 ' + esc(r.name) + '</span>' +
        '<span class="ar-meta">' + esc(formatDate(r.date)) + ' · ' + t('ar_players', { n: r.playerCount }) + ' · ' + t('ar_winner') + ': ' + winners + '</span></div>' +
        '<div class="ar-actions">' +
        '<button type="button" class="btn small" data-show-round="' + r.id + '">' + t('ar_show') + '</button>' +
        '<button type="button" class="btn small danger" data-del-round="' + r.id + '">' + t('ar_delete') + '</button>' +
        '</div></div>';
    }).join('');
  }

  function renderAllTime() {
    var card = $('#alltime-card');
    var rows = srv.allTime || [];
    card.hidden = !rows.length;
    if (!rows.length) { $('#lb-alltime').innerHTML = ''; return; }
    $('#lb-alltime').innerHTML =
      '<tr><th>' + t('h_rank') + '</th><th class="col-name">' + t('h_player') + '</th><th>' + t('h_rounds') + '</th>' +
      '<th>' + t('h_wins') + '</th><th class="col-detail">' + t('h_avg') + '</th>' +
      '<th class="col-detail">' + t('h_animals') + '</th><th>' + t('h_best') + '</th></tr>' +
      rows.map(function (m, i) {
        return '<tr class="rank-' + (i + 1) + '">' +
          '<td>' + medal(i + 1) + '</td>' +
          '<td class="col-name name-cell">' + esc(m.name) +
          '<span class="row-meta">Ø ' + signed(m.avg) + ' · 🐾 ' + m.animals + '</span></td>' +
          '<td>' + m.rounds + '</td><td>' + m.wins + '</td>' +
          '<td class="col-detail">' + signed(m.avg) + '</td>' +
          '<td class="col-detail">' + m.animals + '</td>' +
          '<td class="pts ' + (m.best < 0 ? 'neg-pts' : '') + '">' + signed(m.best) + '</td></tr>';
      }).join('');
  }

  // --- Scorekarten ---------------------------------------------------------
  function openModal(html) {
    $('#modal-content').innerHTML = html;
    $('#modal').hidden = false;
  }

  function modalHead(title) {
    return '<div class="modal-head"><h3>' + title + '</h3>' +
      '<button type="button" class="btn small" id="modal-close">✕</button></div>';
  }

  // Solange die Rangliste gesperrt ist, zeigt die Karte keine Punkte – sonst
  // könnte man die Spannung über den Umweg der Scorekarte umgehen.
  function showScorecard(player, scores) {
    var result = M.playerResult(player, scores || {});
    var showPoints = ui.unlocked;
    var grossCells = M.COURSE.map(function (h) {
      var e = (scores || {})[h.hole];
      if (e && e.gross != null) {
        var d = e.gross - h.par;
        var cls = d < 0 ? 'sc-under' : d === 0 ? 'sc-par' : d === 1 ? 'sc-over' : 'sc-dbl';
        return '<td class="' + cls + '">' + e.gross + '</td>';
      }
      return '<td>–</td>';
    }).join('');
    var animalCells = M.COURSE.map(function (h) {
      var e = (scores || {})[h.hole];
      var s = '';
      if (e && e.animals) M.ANIMALS.forEach(function (a) { if (e.animals[a.key]) s += a.emoji; });
      return '<td class="sc-animals">' + s + '</td>';
    }).join('');

    openModal(
      modalHead('🧾 ' + esc(player.name)) +
      '<p class="hint">HCP ' + result.hcp + ' · ' + t('p_target') + ' ' + result.target +
      (showPoints ? ' · ' + t('sc_points') + ' <strong>' + signed(result.points) + '</strong>' : '') + '</p>' +
      '<div class="table-scroll"><table class="sc-table">' +
      '<tr><th>' + t('c_hole') + '</th>' + M.COURSE.map(function (h) { return '<th>' + h.hole + '</th>'; }).join('') + '<th>' + t('sc_tot') + '</th></tr>' +
      '<tr><td>' + t('sc_par') + '</td>' + M.COURSE.map(function (h) { return '<td>' + h.par + '</td>'; }).join('') + '<td>' + M.PAR_TOTAL + '</td></tr>' +
      '<tr><td>' + t('sc_gross') + '</td>' + grossCells + '<td><strong>' + (result.played ? result.gross : '–') + '</strong></td></tr>' +
      '<tr><td>' + t('sc_animals') + '</td>' + animalCells + '<td>+' + result.pos + ' −' + result.neg + '</td></tr>' +
      '</table></div>' +
      '<p class="hint">' + t('sc_legend') + '</p>' +
      (result.complete ? '' : '<p class="hint">⚠️ ' + t('sc_open', { n: M.HOLES - result.played }) + '</p>') +
      (showPoints ? '' : '<p class="hint">🔒 ' + t('sc_hidden') + '</p>')
    );
  }

  // Karte des ganzen Flights – Loch für Loch, ohne Punktestand
  function showFlightCard(flight) {
    var rows = flight.playerIds.map(function (pid) {
      var p = playerById(pid);
      if (!p) return '';
      var scores = scoresFor(pid);
      var result = M.playerResult(p, scores);
      var cells = M.COURSE.map(function (h) {
        var e = scores[h.hole];
        var animals = '';
        if (e && e.animals) M.ANIMALS.forEach(function (a) { if (e.animals[a.key]) animals += a.emoji; });
        var gross = e && e.gross != null ? e.gross : '–';
        var cls = '';
        if (e && e.gross != null) {
          var d = e.gross - h.par;
          cls = d < 0 ? 'sc-under' : d === 0 ? 'sc-par' : d === 1 ? 'sc-over' : 'sc-dbl';
        }
        return '<td class="' + cls + '"><span class="fc-gross">' + gross + '</span>' +
          (animals ? '<span class="fc-ani">' + animals + '</span>' : '') + '</td>';
      }).join('');
      return '<tr><td class="fc-name">' + esc(p.name) + '</td>' + cells +
        '<td><strong>' + (result.played ? result.gross : '–') + '</strong></td></tr>';
    }).join('');

    openModal(
      modalHead(t('sc_flight_title', { name: esc(flight.name) })) +
      '<div class="table-scroll"><table class="sc-table fc-table">' +
      '<tr><th>' + t('c_hole') + '</th>' + M.COURSE.map(function (h) { return '<th>' + h.hole + '</th>'; }).join('') + '<th>' + t('sc_tot') + '</th></tr>' +
      '<tr><td>' + t('sc_par') + '</td>' + M.COURSE.map(function (h) { return '<td>' + h.par + '</td>'; }).join('') + '<td>' + M.PAR_TOTAL + '</td></tr>' +
      rows + '</table></div>' +
      '<p class="hint">' + t('sc_legend') + '</p>' +
      (ui.unlocked ? '' : '<p class="hint">🔒 ' + t('sc_hidden') + '</p>')
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Bedienung
  // ---------------------------------------------------------------------------
  function switchTab(name) {
    ui.tab = name;
    $$('.tabs button[data-tab]').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === name); });
    $$('.tab').forEach(function (section) { section.classList.toggle('active', section.id === 'tab-' + name); });
    render();
    window.scrollTo({ top: 0 });
    if (name === 'entry' || name === 'leaderboard' || name === 'tournament') pull(false);
  }

  $('#tabs').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-tab]');
    if (btn) switchTab(btn.dataset.tab);
  });

  $('#lang-toggle').addEventListener('click', function () {
    I.setLang(I.lang === 'de' ? 'en' : 'de');
    I.applyStatic();
    render();
    updateSyncBanner();
  });

  // --- Termine ------------------------------------------------------------
  function fillEventForm(ev) {
    $('#ev-id').value = ev ? ev.id : '';
    $('#ev-name').value = ev ? ev.name : '';
    $('#ev-date').value = ev ? ev.date : '';
    $('#ev-flights').value = ev ? ev.flights || '' : '';
    $('#ev-dinner').value = ev ? ev.dinner || '' : '';
    $('#ev-note').value = ev ? ev.note || '' : '';
    $('#ev-confirmed').checked = ev ? !!ev.confirmed : false;
    $('#ev-cancel').hidden = !ev;
  }

  $('#event-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = $('#ev-name').value.trim();
    var date = $('#ev-date').value;
    if (!name || !date) return toast(t('ev_missing'), true);
    if (!(await ensurePin())) return;
    var body = {
      name: name, date: date,
      flights: $('#ev-flights').value,
      dinner: $('#ev-dinner').value,
      note: $('#ev-note').value,
      confirmed: $('#ev-confirmed').checked,
    };
    var evId = $('#ev-id').value;
    try {
      await api(evId ? 'PUT' : 'POST', evId ? '/api/events/' + evId : '/api/events', body);
      fillEventForm(null);
      toast(t('ev_saved', { name: name }));
      pull(true);
    } catch (err) { apiError(err); }
  });

  $('#ev-cancel').addEventListener('click', function () { fillEventForm(null); });

  $('#event-list').addEventListener('click', async function (e) {
    var editBtn = e.target.closest('[data-edit-event]');
    var delBtn = e.target.closest('[data-del-event]');
    if (editBtn) {
      var editEv = srv.events.find(function (x) { return x.id === editBtn.dataset.editEvent; });
      if (!editEv) return;
      fillEventForm(editEv);
      $('.event-admin').open = true;
      $('#event-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (delBtn) {
      var delEv = srv.events.find(function (x) { return x.id === delBtn.dataset.delEvent; });
      if (!delEv) return;
      if (!(await ensurePin())) return;
      if (!confirm(t('ev_confirm_del', { name: delEv.name }))) return;
      try {
        await api('DELETE', '/api/events/' + delEv.id);
        if ($('#ev-id').value === delEv.id) fillEventForm(null);
        toast(t('ev_deleted'));
        pull(true);
      } catch (err) { apiError(err); }
    }
  });

  // --- Spieler ------------------------------------------------------------
  $('#player-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = $('#player-name').value.trim();
    if (!name) return;
    var duplicate = srv.players.some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); });
    if (duplicate && !confirm(t('p_dup_name', { name: name }))) return;
    try {
      await api('POST', '/api/players', { name: name, hcp: $('#player-hcp').value });
      $('#player-name').value = '';
      $('#player-hcp').value = '';
      toast(t('p_added', { name: name }));
      pull(true);
    } catch (err) { apiError(err); }
  });

  $('#player-list').addEventListener('click', async function (e) {
    var assignBtn = e.target.closest('[data-assign]');
    var editBtn = e.target.closest('[data-edit-player]');
    var delBtn = e.target.closest('[data-del-player]');

    if (assignBtn) {
      var p = playerById(assignBtn.dataset.assign);
      if (!p) return;
      var target = assignBtn.dataset.flight;
      try {
        if (target === 'new') {
          var created = await api('POST', '/api/flights', { name: '' });
          target = created.flight.id;
        }
        await api('PUT', '/api/players/' + p.id, { flightId: target || null });
        await pull(true);
        var flight = M.flightOf(srv.flights, p.id);
        toast(flight ? t('tn_assigned', { name: p.name, flight: flight.name }) : t('tn_removed', { name: p.name }));
      } catch (err) { apiError(err); }
      return;
    }
    if (editBtn) {
      var ep = playerById(editBtn.dataset.editPlayer);
      if (!ep) return;
      var name = prompt(t('p_prompt_name'), ep.name);
      if (name === null || !name.trim()) return;
      try {
        await api('PUT', '/api/players/' + ep.id, { name: name });
        pull(true);
      } catch (err) { apiError(err); }
      return;
    }
    if (delBtn) {
      var dp = playerById(delBtn.dataset.delPlayer);
      if (!dp) return;
      if (!(await ensurePin())) return;
      if (!confirm(t('p_confirm_del', { name: dp.name }))) return;
      try {
        await api('DELETE', '/api/players/' + dp.id);
        pull(true);
      } catch (err) { apiError(err); }
    }
  });

  // Handicap inline anpassen – Ziel rechnet live nach, gespeichert beim Verlassen
  $('#player-list').addEventListener('input', function (e) {
    var inp = e.target.closest('.p-hcp-input');
    if (!inp || inp.value === '') return;
    var badge = $('[data-target-for="' + inp.dataset.hcpPlayer + '"]');
    if (badge) badge.textContent = t('p_target') + ' ' + M.targetFor(inp.value);
  });

  $('#player-list').addEventListener('change', async function (e) {
    var inp = e.target.closest('.p-hcp-input');
    if (!inp) return;
    var p = playerById(inp.dataset.hcpPlayer);
    if (!p) return;
    if (inp.value === '') { inp.value = p.hcp; return; }
    try {
      var res = await api('PUT', '/api/players/' + p.id, { hcp: inp.value });
      p.hcp = res.player.hcp;
      inp.value = res.player.hcp;
      var badge = $('[data-target-for="' + p.id + '"]');
      if (badge) badge.textContent = t('p_target') + ' ' + M.targetFor(res.player.hcp);
      toast(t('p_hcp_saved', { name: p.name, hcp: res.player.hcp }));
    } catch (err) {
      apiError(err);
      inp.value = p.hcp;
    }
  });

  // --- Flights ------------------------------------------------------------
  $('#add-flight-btn').addEventListener('click', async function () {
    try {
      var res = await api('POST', '/api/flights', { name: '' });
      toast(t('f_created', { name: res.flight.name }));
      pull(true);
    } catch (err) { apiError(err); }
  });

  $('#flight-list').addEventListener('change', async function (e) {
    var inp = e.target.closest('.tee-input');
    if (!inp) return;
    var f = srv.flights.find(function (x) { return x.id === inp.dataset.teeFlight; });
    if (!f) return;
    try {
      var res = await api('PUT', '/api/flights/' + f.id, { teeTime: inp.value || null });
      f.teeTime = res.flight.teeTime;
      toast(t('f_tee_saved', { name: f.name }));
      var pretty = inp.parentElement.querySelector('.tee-pretty');
      if (pretty) pretty.textContent = formatTee(f.teeTime);
    } catch (err) {
      apiError(err);
      inp.value = f.teeTime || '';
    }
  });

  $('#flight-list').addEventListener('click', async function (e) {
    var removeChip = e.target.closest('[data-remove-player]');
    var renameBtn = e.target.closest('[data-rename-flight]');
    var delBtn = e.target.closest('[data-del-flight]');

    if (removeChip) {
      var pid = removeChip.dataset.removePlayer;
      try {
        await api('PUT', '/api/players/' + pid, { flightId: null });
        pull(true);
      } catch (err) { apiError(err); }
      return;
    }
    if (renameBtn) {
      var rf = srv.flights.find(function (x) { return x.id === renameBtn.dataset.renameFlight; });
      if (!rf) return;
      var name = prompt(t('ph_flight'), rf.name);
      if (name === null || !name.trim()) return;
      try {
        await api('PUT', '/api/flights/' + rf.id, { name: name });
        pull(true);
      } catch (err) { apiError(err); }
      return;
    }
    if (delBtn) {
      var f = srv.flights.find(function (x) { return x.id === delBtn.dataset.delFlight; });
      if (!f) return;
      if (!confirm(t('f_confirm_del', { name: f.name }))) return;
      try {
        await api('DELETE', '/api/flights/' + f.id);
        pull(true);
      } catch (err) { apiError(err); }
    }
  });

  $('#randomize-btn').addEventListener('click', async function () {
    if (!srv.players.length) return toast(t('fr_first'), true);
    var assigned = todaysPlayers();
    var pool = assigned.length ? assigned : srv.players;
    if (pool.length < 2) return toast(t('fr_first'), true);
    var answer = prompt(t('fr_prompt'), '3');
    if (answer === null) return;
    var size = parseInt(answer, 10);
    if (!(size >= 2 && size <= 4)) return toast(t('fr_invalid'), true);
    var message = assigned.length
      ? t('fr_confirm_assigned', { n: pool.length, size: size })
      : t('fr_confirm_all', { n: pool.length, size: size });
    if (!confirm(message)) return;
    try {
      await api('POST', '/api/flights/randomize', { size: size, playerIds: pool.map(function (p) { return p.id; }) });
      toast(t('fr_done'));
      pull(true);
    } catch (err) { apiError(err); }
  });

  // --- Eintragen ----------------------------------------------------------
  $('#entry-flight').addEventListener('change', function (e) {
    ui.flightId = e.target.value;
    localStorage.setItem('fta-flight', ui.flightId);
    renderEntry();
  });

  $('#hole-picker').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-hole]');
    if (btn) setHole(parseInt(btn.dataset.hole, 10));
  });

  function setHole(hole) {
    ui.hole = hole;
    localStorage.setItem('fta-hole', String(hole));
    renderEntry();
  }

  $('#flight-card-btn').addEventListener('click', function () {
    var flight = srv.flights.find(function (f) { return f.id === ui.flightId; });
    if (flight) showFlightCard(flight);
  });

  $('#entry-players').addEventListener('click', function (e) {
    var setBtn = e.target.closest('[data-gross-set]');
    var moreBtn = e.target.closest('[data-gross-more]');
    var animalBtn = e.target.closest('button[data-animal]');
    var cardBtn = e.target.closest('[data-card]');
    var nextBtn = e.target.closest('#next-hole-btn');

    if (nextBtn) {
      var flight = srv.flights.find(function (f) { return f.id === ui.flightId; });
      var missing = flight ? flight.playerIds.filter(function (pid) {
        var entry = entryFor(pid, ui.hole);
        return !entry || entry.gross == null;
      }) : [];
      if (missing.length) {
        var names = missing.map(function (pid) { var p = playerById(pid); return p ? p.name : null; })
          .filter(Boolean).join(', ');
        if (!confirm(t('e_missing', { names: names }))) return;
      }
      if (ui.hole < M.HOLES) {
        setHole(ui.hole + 1);
        window.scrollTo({ top: 0 });
        toast(t('e_good_luck', { h: ui.hole }));
      } else {
        switchTab('leaderboard');
      }
      return;
    }

    if (cardBtn) {
      var cp = playerById(cardBtn.dataset.card);
      if (cp) showScorecard(cp, scoresFor(cp.id));
      return;
    }

    if (setBtn) {
      var value = setBtn.dataset.grossSet;
      queuePatch(setBtn.dataset.player, ui.hole, { gross: value === '' ? null : parseInt(value, 10) });
      renderEntry();
      return;
    }

    if (moreBtn) {
      var pid = moreBtn.dataset.player;
      var cur = entryFor(pid, ui.hole);
      var next = Math.min(M.MAX_GROSS, (cur && cur.gross != null ? cur.gross : M.parFor(ui.hole)) + 1);
      queuePatch(pid, ui.hole, { gross: next });
      renderEntry();
      return;
    }

    if (animalBtn && !animalBtn.disabled) {
      var apid = animalBtn.dataset.player;
      var key = animalBtn.dataset.animal;
      var entry = entryFor(apid, ui.hole);
      var on = !!(entry && entry.animals && entry.animals[key]);
      var patch = { animals: {} };
      patch.animals[key] = !on;
      queuePatch(apid, ui.hole, patch);
      renderEntry();
    }
  });

  // --- Rangliste ----------------------------------------------------------
  $('#lb-round').addEventListener('change', function (e) {
    ui.lbRound = e.target.value;
    renderLeaderboard();
  });

  $('#lb-main').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-pid]');
    if (!tr) return;
    var pid = tr.dataset.pid;
    if (ui.lbRound === 'live') {
      var p = playerById(pid);
      if (p) showScorecard(p, scoresFor(pid));
      return;
    }
    var round = roundCache.get(ui.lbRound);
    if (!round) return;
    var player = (round.players || []).find(function (x) { return x.id === pid; })
      || (round.results || []).find(function (x) { return x.id === pid; });
    if (player) showScorecard(player, (round.scores || {})[pid] || {});
  });

  $('#modal').addEventListener('click', function (e) {
    if (e.target.id === 'modal' || e.target.closest('#modal-close')) $('#modal').hidden = true;
  });

  // PIN-Sperre: entsperren zeigt die Rangliste – es wird nichts gespeichert
  // und nichts geleert.
  $('#unlock-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var pin = $('#pin-input').value;
    if (!pin) return;
    try {
      await api('POST', '/api/unlock', { pin: pin });
      ui.unlocked = true;
      sessionStorage.setItem('fta-unlocked', '1');
      sessionStorage.setItem('fta-pin', pin);
      $('#pin-input').value = '';
      await pull(true);
      renderLeaderboard();
    } catch (err) {
      toast(err.status === 403 ? err.message : t('err_generic'), true);
    }
  });

  $('#relock-btn').addEventListener('click', function () {
    ui.unlocked = false;
    sessionStorage.removeItem('fta-unlocked');
    sessionStorage.removeItem('fta-pin');
    renderLeaderboard();
    toast(t('lk_locked'));
  });

  // --- Preisverleihung ----------------------------------------------------
  var ceremonySteps = [];
  var ceremonyIdx = 0;

  function showCeremonyStep() {
    var s = ceremonySteps[ceremonyIdx];
    var c = $('#ceremony');
    c.innerHTML =
      '<div class="c-emoji">' + s.emoji + '</div>' +
      '<div class="c-title">' + esc(s.title) + '</div>' +
      '<div class="c-name">' + esc(s.name) + '</div>' +
      '<div class="c-sub">' + esc(s.sub || '') + '</div>' +
      '<div class="c-hint">' + t('cer_tap') + '</div>';
    if (s.confetti) {
      var colors = ['#f5c542', '#e74c3c', '#3498db', '#2ecc71', '#e67e22', '#ffffff'];
      for (var i = 0; i < 90; i++) {
        var sp = document.createElement('span');
        sp.className = 'confetti';
        sp.style.left = Math.random() * 100 + '%';
        sp.style.background = colors[i % colors.length];
        sp.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
        sp.style.animationDelay = (Math.random() * 1.5) + 's';
        c.appendChild(sp);
      }
    }
  }

  function startCeremony() {
    var data = leaderboardData();
    if (!data.rows.length) return toast(t('cer_no_players'), true);
    var rows = M.ranked(data.rows, M.compareMain);
    var byAnimals = M.ranked(data.rows, M.compareAnimals);
    var pts = function (r) { return t('cer_pts', { pts: signed(r.points), g: r.gross }); };
    var names = function (rank) {
      return rows.filter(function (r) { return r.rank === rank; }).map(function (r) { return r.name; }).join(' & ');
    };

    ceremonySteps = [{ emoji: '🎬', title: t('cer_intro_title'), name: 'Fore the Animals!', sub: t('cer_intro_sub') }];
    var third = rows.find(function (r) { return r.rank === 3; });
    var second = rows.find(function (r) { return r.rank === 2; });
    if (third) ceremonySteps.push({ emoji: '🥉', title: t('cer_p3'), name: names(3), sub: pts(third) });
    if (second) ceremonySteps.push({ emoji: '🥈', title: t('cer_p2'), name: names(2), sub: pts(second) });
    if (byAnimals[0] && byAnimals[0].totalAnimals > 0) {
      var topAnimals = byAnimals.filter(function (r) { return r.rank === 1; });
      ceremonySteps.push({
        emoji: '🐾', title: t('cer_second'),
        name: topAnimals.map(function (r) { return r.name; }).join(' & '),
        sub: t('cer_second_sub', { n: byAnimals[0].totalAnimals }),
      });
    }
    ceremonySteps.push({ emoji: '🏆', title: t('cer_win'), name: names(1), sub: pts(rows[0]), confetti: true });
    ceremonySteps.push({ emoji: '👏', title: t('cer_thanks'), name: t('cer_thanks_name'), sub: t('cer_thanks_sub') });

    ceremonyIdx = 0;
    showCeremonyStep();
    $('#ceremony').hidden = false;
  }

  $('#ceremony-btn').addEventListener('click', startCeremony);
  $('#ceremony').addEventListener('click', function () {
    ceremonyIdx += 1;
    if (ceremonyIdx >= ceremonySteps.length) $('#ceremony').hidden = true;
    else showCeremonyStep();
  });

  // --- Rangliste als Bild -------------------------------------------------
  $('#share-btn').addEventListener('click', function () {
    var data = leaderboardData();
    if (!data.rows.length) return toast(t('cer_no_players'), true);
    var rows = M.ranked(data.rows, M.compareMain);
    var byAnimals = M.ranked(data.rows, M.compareAnimals);

    var W = 1000, headH = 190, rowH = 62, footH = 120;
    var H = headH + 70 + rows.length * rowH + footH;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');

    ctx.fillStyle = '#f4f9f6'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1d5c3f'; ctx.fillRect(0, 0, W, headH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('🦓 FORE THE ANIMALS!', 40, 78);
    ctx.font = '26px sans-serif'; ctx.globalAlpha = 0.9;
    ctx.fillText(t('img_subtitle'), 40, 122);
    ctx.fillText(data.kind === 'saved' ? data.round.name + ' · ' + formatDate(data.round.date) : formatDate(Date.now()), 40, 158);
    ctx.globalAlpha = 1;

    var y = headH + 42;
    ctx.fillStyle = '#1d5c3f'; ctx.font = 'bold 24px sans-serif';
    ctx.fillText(t('h_rank'), 40, y);
    ctx.fillText(t('h_player'), 150, y);
    ctx.fillText(t('h_gross'), 560, y);
    ctx.fillText(t('sc_animals'), 700, y);
    ctx.fillText(t('h_points'), 850, y);
    y += 14;

    rows.forEach(function (r, i) {
      var ry = y + i * rowH;
      ctx.fillStyle = r.rank === 1 ? '#fdf6dd' : (i % 2 === 0 ? '#e8f2ec' : '#ffffff');
      ctx.fillRect(24, ry, W - 48, rowH - 4);
      ctx.fillStyle = '#21302a'; ctx.font = 'bold 28px sans-serif';
      ctx.fillText(medal(r.rank), 40, ry + 40);
      ctx.fillText(r.name.slice(0, 20) + (r.complete ? '' : ' *'), 150, ry + 40);
      ctx.font = '28px sans-serif';
      ctx.fillText(String(r.played ? r.gross : '–'), 560, ry + 40);
      ctx.fillText('+' + r.pos + ' / −' + r.neg, 700, ry + 40);
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = r.points < 0 ? '#b23a48' : '#1d5c3f';
      ctx.fillText(signed(r.points), 850, ry + 40);
    });

    var fy = y + rows.length * rowH + 52;
    ctx.fillStyle = '#21302a'; ctx.font = '26px sans-serif';
    if (byAnimals[0] && byAnimals[0].totalAnimals > 0) {
      ctx.fillText(t('img_most_animals', { name: byAnimals[0].name, n: byAnimals[0].totalAnimals }), 40, fy);
    }

    cv.toBlob(async function (blob) {
      var file = new File([blob], 'fore-the-animals-rangliste.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Fore the Animals! – Rangliste' });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'fore-the-animals-rangliste.png';
      a.click();
      URL.revokeObjectURL(a.href);
      toast(t('img_downloaded'));
    }, 'image/png');
  });

  // --- Runde abschliessen -------------------------------------------------
  $('#save-round-btn').addEventListener('click', async function () {
    var data = leaderboardData();
    if (data.kind !== 'live' || !data.rows.length) return toast(t('sr_nothing'), true);
    if (!(await ensurePin())) return;
    // Offene Einträge zuerst wegschicken, damit nichts verloren geht
    if (pending.size) { await flush(); await pull(true); }

    var name = prompt(t('sr_prompt'), t('sr_default', { date: formatDate(Date.now()) }));
    if (name === null) return;
    var rows = leaderboardData().rows;
    var open = rows.filter(function (r) { return !r.complete; }).length;
    var message = open
      ? t('sr_confirm_open', { name: name, players: rows.length, open: open })
      : t('sr_confirm', { name: name, players: rows.length });
    if (!confirm(message)) return;
    try {
      var res = await api('POST', '/api/rounds', { name: name });
      toast(t('sr_saved', { name: res.round.name }));
      ui.lbRound = res.round.id;
      await pull(true);
      renderLeaderboard();
    } catch (err) { apiError(err); }
  });

  // --- Archiv -------------------------------------------------------------
  $('#archive-list').addEventListener('click', async function (e) {
    var showBtn = e.target.closest('[data-show-round]');
    var delBtn = e.target.closest('[data-del-round]');
    if (showBtn) {
      ui.lbRound = showBtn.dataset.showRound;
      renderLeaderboard();
      $('#lb-main').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (delBtn) {
      var round = srv.rounds.find(function (r) { return r.id === delBtn.dataset.delRound; });
      if (!round) return;
      if (!(await ensurePin())) return;
      if (!confirm(t('ar_confirm_del', { name: round.name }))) return;
      try {
        await api('DELETE', '/api/rounds/' + round.id);
        roundCache.delete(round.id);
        if (ui.lbRound === round.id) ui.lbRound = 'live';
        pull(true);
      } catch (err) { apiError(err); }
    }
  });

  // --- Backup -------------------------------------------------------------
  $('#backup-btn').addEventListener('click', async function () {
    if (!(await ensurePin())) return;
    try {
      // Das Backup kommt vom Server – nur dort liegen auch die Loch-für-Loch-
      // Scores der gespeicherten Runden.
      var full = await api('GET', '/api/backup');
      var blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'fore-the-animals-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast(t('bk_done'));
    } catch (err) { apiError(err); }
  });

  $('#restore-file').addEventListener('change', async function (e) {
    var file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var data;
    try { data = JSON.parse(await file.text()); } catch (err) { return toast(t('bk_invalid'), true); }
    if (!data || !Array.isArray(data.players)) return toast(t('bk_invalid'), true);
    if (!(await ensurePin())) return;
    if (!confirm(t('bk_confirm'))) return;
    try {
      var res = await api('POST', '/api/restore', data);
      roundCache.clear();
      ui.lbRound = 'live';
      toast(t('bk_restored', { p: res.players, r: res.rounds }));
      pull(true);
    } catch (err) { apiError(err); }
  });

  $('#reset-btn').addEventListener('click', async function () {
    if (!(await ensurePin())) return;
    var answer = prompt(t('dz_prompt'));
    if (answer !== 'RESET') return;
    try {
      await api('POST', '/api/reset', { confirm: 'RESET' });
      pending.clear();
      savePending();
      toast(t('dz_done'));
      pull(true);
    } catch (err) { apiError(err); }
  });

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
    // Der Service Worker meldet sich, wenn eine neue App-Version bereitliegt.
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'fta-updated') {
        stickyToast(t('sw_update'), function () { location.reload(); });
      }
    });
  }

  loadPending();
  I.applyStatic();
  updateSyncBanner();
  render();

  pull(true).then(function () { if (pending.size) flush(); });

  setInterval(tick, 2000);
  window.addEventListener('online', function () { flush(); pull(false); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { flush(); pull(false); }
  });
  // Beim Schliessen den letzten Stand noch loswerden
  window.addEventListener('pagehide', function () {
    if (!pending.size || !navigator.sendBeacon) return;
    var entries = Array.from(pending.values());
    navigator.sendBeacon('/api/scores', new Blob([JSON.stringify({ entries: entries })], { type: 'application/json' }));
  });
}());
