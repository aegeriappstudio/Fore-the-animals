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

  // ---------------------------------------------------------------------------
  // Eigene Dialoge – Ersatz für prompt()/confirm(), die auf dem Handy hässlich
  // und im Home-Bildschirm-Modus teils unzuverlässig sind. Promise-basiert:
  //   await showDialog({title, text, input, buttons}) → {button, value} | null
  // Abbrechen (Knopf, Backdrop, Escape) ergibt null.
  // ---------------------------------------------------------------------------
  var dialogResolve = null;
  var dialogButtons = [];

  function closeDialog(result) {
    if (!dialogResolve) return;
    var resolve = dialogResolve;
    dialogResolve = null;
    $('#dialog').hidden = true;
    resolve(result);
  }

  function showDialog(opts) {
    return new Promise(function (resolve) {
      if (dialogResolve) dialogResolve(null); // offener Dialog wird verworfen
      dialogResolve = resolve;
      dialogButtons = opts.buttons || [
        { label: t('dlg_cancel'), value: null, kind: 'plain' },
        { label: t('dlg_ok'), value: 'ok', kind: 'primary' },
      ];
      var inp = opts.input;
      var sel = opts.select; // {label, value, options: [{value, label}]}
      $('#dialog-content').innerHTML =
        (opts.title ? '<div class="dlg-title">' + esc(opts.title) + '</div>' : '') +
        (opts.text ? '<p class="dlg-text">' + esc(opts.text).replace(/\n/g, '<br>') + '</p>' : '') +
        (sel
          ? (sel.label ? '<label class="dlg-label" for="dialog-select">' + esc(sel.label) + '</label>' : '') +
            '<select class="dlg-input" id="dialog-select">' + (sel.options || []).map(function (o) {
              return '<option value="' + esc(o.value) + '"' + (o.value === sel.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
            }).join('') + '</select>'
          : '') +
        (inp
          ? (inp.label ? '<label class="dlg-label" for="dialog-input">' + esc(inp.label) + '</label>' : '') +
            '<input class="dlg-input" id="dialog-input" type="' + esc(inp.type || 'text') + '"' +
            ' value="' + esc(inp.value || '') + '" placeholder="' + esc(inp.placeholder || '') + '"' +
            (inp.inputmode ? ' inputmode="' + esc(inp.inputmode) + '"' : '') +
            ' maxlength="' + (inp.maxlength || 60) + '" autocomplete="off" enterkeyhint="done">'
          : '') +
        '<div class="dlg-buttons">' + dialogButtons.map(function (b, i) {
          var kind = b.kind === 'primary' ? 'primary' : b.kind === 'danger' ? 'danger' : 'plain';
          // type=button: Enter im Eingabefeld löst über submit den Primär-Knopf aus
          return '<button type="button" class="btn ' + kind + '" data-dlg="' + i + '">' + esc(b.label) + '</button>';
        }).join('') + '</div>';
      $('#dialog').hidden = false;
      var field = $('#dialog-input');
      if (field) { field.focus(); field.select(); }
    });
  }

  function resolveDialogButton(index) {
    var btn = dialogButtons[index];
    if (!btn || btn.value === null || btn.value === undefined) return closeDialog(null);
    var field = $('#dialog-input');
    var select = $('#dialog-select');
    closeDialog({
      button: btn.value,
      value: field ? field.value : undefined,
      select: select ? select.value : undefined,
    });
  }

  $('#dialog').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-dlg]');
    if (btn) return resolveDialogButton(parseInt(btn.dataset.dlg, 10));
    if (e.target.id === 'dialog') closeDialog(null); // Tipp neben den Dialog
  });

  // Enter im Eingabefeld = Primär-Knopf (das <form> fängt den Submit)
  $('#dialog-content').addEventListener('submit', function (e) {
    e.preventDefault();
    var primary = dialogButtons.findIndex(function (b) { return b.kind === 'primary'; });
    resolveDialogButton(primary === -1 ? dialogButtons.length - 1 : primary);
  });

  document.addEventListener('keydown', function (e) {
    if ($('#dialog').hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(null); }
  });

  // confirm()-Ersatz: true/false
  async function confirmDialog(text, opts) {
    opts = opts || {};
    var res = await showDialog({
      title: opts.title || t('dlg_confirm_title'),
      text: text,
      buttons: [
        { label: t('dlg_cancel'), value: null, kind: 'plain' },
        { label: opts.okLabel || t('dlg_ok'), value: 'ok', kind: opts.danger ? 'danger' : 'primary' },
      ],
    });
    return !!res;
  }

  // prompt()-Ersatz: String oder null
  async function promptDialog(opts) {
    var res = await showDialog({
      title: opts.title,
      text: opts.text,
      input: {
        value: opts.value, placeholder: opts.placeholder, type: opts.type,
        inputmode: opts.inputmode, maxlength: opts.maxlength,
      },
      buttons: [
        { label: t('dlg_cancel'), value: null, kind: 'plain' },
        { label: opts.okLabel || t('dlg_ok'), value: 'ok', kind: 'primary' },
      ],
    });
    return res ? res.value : null;
  }

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

  // Letzten Serverstand lokal vorhalten – im Funkloch startet die App damit
  // sofort mit Spielern, Flights und Scores statt mit einer leeren Seite.
  // Eigene, noch nicht gesendete Eingaben liegen zusätzlich in `pending` und
  // werden beim Anzeigen wie immer darübergelegt.
  function persistState() {
    try { localStorage.setItem('fta-state', JSON.stringify(srv)); } catch (err) { /* Speicher voll */ }
  }

  function loadCachedState() {
    try {
      var cached = JSON.parse(localStorage.getItem('fta-state') || 'null');
      if (cached && Array.isArray(cached.players) && cached.rev !== undefined) {
        srv = cached;
        M.setCourse(srv.courseId);
        return true;
      }
    } catch (err) { /* kaputter Cache – frisch laden */ }
    return false;
  }

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

  // Gewählter Abschlag (Tee) für Distanz-Anzeigen – pro Gerät und Platz
  function displayTee(course) {
    var c = course || M.course;
    var saved = localStorage.getItem('fta-tee:' + c.id);
    return c.tees.indexOf(saved) !== -1 ? saved : c.defaultTee;
  }

  function todaysPlayers() {
    return M.todaysPlayers(srv.players, liveScores());
  }

  // Resultat/Ziel mit den Wertungs-Tees der laufenden Runde
  function liveResult(p) {
    return M.playerResult(p, scoresFor(p.id), srv.courseId, srv.tees);
  }

  function playerTarget(p, hcpOverride) {
    var gender = M.normalizeGender(p.gender);
    var tee = srv.tees ? srv.tees[gender] : undefined;
    return M.targetFor(hcpOverride !== undefined ? hcpOverride : p.hcp, srv.courseId, gender, tee);
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
    var pin = await promptDialog({
      title: t('pin_prompt'),
      type: 'password',
      inputmode: 'numeric',
      maxlength: 20,
      okLabel: t('pin_unlock'),
    });
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
      M.setCourse(srv.courseId); // Getter im Modell zeigen auf den aktiven Platz
      persistState();
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
      persistState();
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
    renderCalc();
  }

  /**
   * Vorgabe-Rechner in den Regeln: zeigt für ein beliebiges Handicap Ziel,
   * Spielvorgabe, Vorgabeschläge und Deckel pro Loch. Rechnet mit denselben
   * Funktionen wie die Wertung – kann also nie von ihr abweichen.
   * Das Eingabefeld ist statisches HTML und wird hier nie neu aufgebaut,
   * damit der 5-Sekunden-Takt die Eingabe nicht stört.
   */
  function renderCalc() {
    var input = $('#calc-hcp');
    if (!input) return;
    var gender = $('#calc-gender').dataset.value === 'f' ? 'f' : 'm';
    // Platz-Wahl des Rechners – unabhängig vom aktiven Platz, Start = aktiv
    var courseSel = $('#calc-course');
    if (!courseSel.dataset.ready) {
      courseSel.innerHTML = M.COURSES.map(function (cc) {
        return '<option value="' + cc.id + '">' + esc(cc.label) + '</option>';
      }).join('');
      courseSel.value = srv.courseId || M.DEFAULT_COURSE;
      courseSel.dataset.ready = '1';
    }
    var c = M.courseById(courseSel.value) || M.course;
    var teeSel = $('#calc-tee');
    var wanted = teeSel.dataset.course === c.id && teeSel.value
      ? teeSel.value
      : (c.id === srv.courseId && srv.tees ? srv.tees[gender] : null);
    var tee = M.normalizeTee(wanted, gender, c.id);
    teeSel.innerHTML = c.ratedTees.map(function (k) {
      return '<option value="' + k + '"' + (k === tee ? ' selected' : '') + '>Tee ' + k + '</option>';
    }).join('');
    teeSel.value = tee;
    teeSel.dataset.course = c.id;

    var hcp = input.value === '' ? null : M.normalizeHcp(input.value);
    if (hcp === null) {
      $('#calc-summary').textContent = '';
      $('#calc-table').innerHTML = '';
      return;
    }
    var rating = M.ratingFor(c.id, gender, tee);
    var strokes = M.strokesFor(hcp, c.id, gender, tee);
    var ch = M.courseHandicap(hcp, c.id, gender, tee);
    $('#calc-summary').textContent = t('rc_calc_summary', { target: M.targetFor(hcp, c.id, gender, tee), ch: signed(ch) }) +
      ' · CR ' + rating.cr + ' · Slope ' + rating.slope;
    $('#calc-table').innerHTML =
      '<tr><th>' + t('c_hole') + '</th>' + c.holes.map(function (h) { return '<th>' + h.hole + '</th>'; }).join('') + '<th>' + t('c_total') + '</th></tr>' +
      '<tr><td>' + t('c_par') + '</td>' + c.holes.map(function (h) { return '<td>' + h.par + '</td>'; }).join('') + '<td>' + c.par + '</td></tr>' +
      '<tr><td>' + t('c_index') + '</td>' + c.holes.map(function (h) { return '<td>' + h.index + '</td>'; }).join('') + '<td></td></tr>' +
      '<tr><td>' + t('sc_strokes') + '</td>' + c.holes.map(function (h) {
        var n = strokes[h.hole];
        return '<td class="sc-strokes">' + (n > 0 ? '•'.repeat(n) : n < 0 ? '−1' : '') + '</td>';
      }).join('') + '<td>' + signed(ch) + '</td></tr>' +
      '<tr><td>' + t('rc_row_max') + '</td>' + c.holes.map(function (h) {
        return '<td><strong>' + M.capFor(h.hole, strokes[h.hole], c.id) + '</strong></td>';
      }).join('') + '<td></td></tr>';
  }

  function renderHero() {
    var c = M.course;
    var tee = displayTee(c);
    $('#hero-sub').textContent = c.label + ' · Par ' + c.par + ' · ' +
      c.distTotals[tee].toLocaleString('de-CH') + ' m · Golfpark Holzhäusern';
  }

  // Beide Plätze sind immer sichtbar – der aktive trägt ein Badge.
  function renderCourseTable() {
    renderHero();
    $('#course-cards').innerHTML = M.COURSES.map(function (c) {
      var tee = displayTee(c);
      var chips = c.tees.length > 1
        ? '<div class="tee-picker">' + c.tees.map(function (key) {
            return '<button type="button" class="tee-chip ' + (key === tee ? 'on' : '') + '" data-course="' + c.id + '" data-tee="' + key + '">Tee ' + key + '</button>';
          }).join('') + '</div>'
        : '';
      var rm = c.ratings.m[tee];
      var rf = c.ratings.f[tee];
      // Ratings des angezeigten Tees – ohne Rating (z.B. reine Distanz-Tees)
      // entfällt die Zeile
      var ratingLine = rm && rf
        ? '<p class="hint">Tee ' + tee + ': ♂ CR ' + rm.cr + ' · Slope ' + rm.slope +
          ' — ♀ CR ' + rf.cr + ' · Slope ' + rf.slope + '</p>'
        : '';
      var table =
        '<tr><th>' + t('c_hole') + '</th>' + c.holes.map(function (h) { return '<th>' + h.hole + '</th>'; }).join('') + '<th>' + t('c_total') + '</th></tr>' +
        '<tr><td>' + t('c_par') + '</td>' + c.holes.map(function (h) { return '<td>' + h.par + '</td>'; }).join('') + '<td><strong>' + c.par + '</strong></td></tr>' +
        '<tr><td>' + t('c_meters') + '</td>' + c.holes.map(function (h) { return '<td>' + (h.dists[tee] || '–') + '</td>'; }).join('') + '<td><strong>' + (c.distTotals[tee] || '–') + '</strong></td></tr>' +
        '<tr><td>' + t('c_index') + '</td>' + c.holes.map(function (h) { return '<td>' + h.index + '</td>'; }).join('') + '<td></td></tr>';
      return '<div class="card">' +
        '<div class="event-head"><h2>' + t('r_course_title', { name: c.label }) + '</h2>' +
        (c.id === srv.courseId ? '<span class="event-badge confirmed">' + t('c_active') + '</span>' : '') + '</div>' +
        chips +
        '<div class="table-scroll"><table class="course-table">' + table + '</table></div>' +
        ratingLine +
        '<p class="hint">' + t('r_course_hint') + '</p>' +
        '</div>';
    }).join('');
  }

  function renderDates() {
    var wrap = $('#event-list');
    var today = new Date().toISOString().slice(0, 10);
    if (!srv.events.length) {
      wrap.innerHTML = '<div class="card"><p class="empty-note">' + t('ev_none') + '</p></div>';
      return;
    }
    // Durchgeführt = Datum vorbei ODER schon eine Runde dazu gespeichert –
    // diese Termine wandern zuunterst in einen zugeklappten Archiv-Block.
    function isDone(ev) {
      return String(ev.date) < today || srv.rounds.some(function (r) { return r.eventId === ev.id; });
    }
    var upcoming = srv.events.filter(function (ev) { return !isDone(ev); })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var done = srv.events.filter(isDone)
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

    wrap.innerHTML = upcoming.map(eventCard).join('') +
      (done.length
        ? '<details class="event-archive"><summary>' + t('ev_past_title', { n: done.length }) + '</summary>' +
          done.map(eventCard).join('') + '</details>'
        : '');

    function eventCard(ev) {
      // T12:00 verhindert, dass die Zeitzone das Datum um einen Tag verschiebt
      var dateStr = ev.date ? formatDate(ev.date + 'T12:00', true) : '';
      var past = isDone(ev);
      var facts = [];
      if (dateStr) facts.push('<li><span class="ef-icon">📅</span><span class="ef-label">' + t('d_lbl_date') + '</span><span class="ef-val">' + esc(dateStr) + '</span></li>');
      if (ev.flights) facts.push('<li><span class="ef-icon">⛳</span><span class="ef-label">' + t('d_lbl_flights') + '</span><span class="ef-val">' + esc(ev.flights) + '</span></li>');
      if (ev.dinner) facts.push('<li><span class="ef-icon">🍽️</span><span class="ef-label">' + t('d_lbl_dinner') + '</span><span class="ef-val">' + esc(ev.dinner) + '</span></li>');

      // Ist zu diesem Termin schon eine Runde gespeichert? Dann Resultat zeigen.
      // (Nur abgeschlossene Runden – die laufende Rangliste bleibt geheim.)
      var linked = srv.rounds.filter(function (r) { return r.eventId === ev.id; });
      var results = linked.map(function (r) {
        var winners = (r.winners || []).map(function (w) { return esc(w.name) + ' (' + signed(w.points) + ')'; }).join(' & ') || '–';
        return '<button type="button" class="event-round" data-open-round="' + r.id + '">🏁 ' +
          t('ev_round_played', { winners: winners }) + '</button>';
      }).join('');
      var badge = linked.length
        ? '<span class="event-badge played">' + t('d_badge_played') + '</span>'
        : '<span class="event-badge ' + (ev.confirmed ? 'confirmed' : 'tentative') + '">' + t(ev.confirmed ? 'd_badge_confirmed' : 'd_badge_tentative') + '</span>';

      return '<div class="card event ' + (ev.confirmed ? 'event-confirmed' : 'event-tentative') + (past ? ' event-past' : '') + '">' +
        '<div class="event-head"><h2>' + esc(ev.name) + '</h2>' + badge + '</div>' +
        '<ul class="event-facts">' + facts.join('') + '</ul>' +
        (ev.note ? '<p class="hint">' + esc(ev.note) + '</p>' : '') +
        results +
        '<div class="event-actions">' +
        '<button type="button" class="btn small" data-edit-event="' + ev.id + '">✏️</button>' +
        '<button type="button" class="btn small" data-del-event="' + ev.id + '">🗑️</button>' +
        '</div></div>';
    }
  }

  // --- Turnier: Spieler + Flights -----------------------------------------
  function renderTournament() {
    renderCoursePicker();
    renderPlayers();
    renderFlights();
  }

  function renderCoursePicker() {
    var sel = $('#course-select');
    sel.innerHTML = M.COURSES.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === srv.courseId ? ' selected' : '') + '>' +
        esc(c.label) + ' · Par ' + c.par + '</option>';
    }).join('');
    sel.value = srv.courseId;

    // Wertungs-Tees pro Geschlecht – mit CR/Slope zur Orientierung
    var c = M.courseById(srv.courseId) || M.course;
    ['m', 'f'].forEach(function (g) {
      var teeSel = $(g === 'm' ? '#tee-select-m' : '#tee-select-f');
      var chosen = M.normalizeTee(srv.tees && srv.tees[g], g, c.id);
      teeSel.innerHTML = c.ratedTees.map(function (tee) {
        var r = c.ratings[g][tee];
        return '<option value="' + tee + '"' + (tee === chosen ? ' selected' : '') + '>Tee ' + tee +
          ' · CR ' + r.cr + ' · Slope ' + r.slope + '</option>';
      }).join('');
      teeSel.value = chosen;
    });
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

    list.innerHTML = srv.players.map(function (p) {
      var here = p.present === true;
      return '<div class="player-row ' + (here ? 'playing' : 'out') + '">' +
        '<button type="button" class="presence-chip ' + (here ? 'on' : '') + '" data-presence="' + p.id + '">' +
        (here ? '✅ ' + t('tn_here') : '💤 ' + t('tn_away')) + '</button>' +
        '<span class="p-name">' + esc(p.name) + '</span>' +
        '<label class="p-hcp">' + t('ph_hcp') +
        '<input type="number" class="p-hcp-input" data-hcp-player="' + p.id + '" value="' + esc(p.hcp) + '" step="0.1" min="' + M.MIN_HCP + '" max="' + M.MAX_HCP + '" inputmode="decimal" aria-label="' + t('ph_hcp') + ' ' + esc(p.name) + '"></label>' +
        '<button type="button" class="btn small gender" data-gender="' + p.id + '" title="' + t('p_gender') + '">' + (M.normalizeGender(p.gender) === 'f' ? '♀' : '♂') + '</button>' +
        '<span class="badge" data-target-for="' + p.id + '">' + t('p_target') + ' ' + playerTarget(p) + '</span>' +
        '<button type="button" class="btn small" data-edit-player="' + p.id + '" title="' + t('p_rename') + '">✏️</button>' +
        '<button type="button" class="btn small" data-del-player="' + p.id + '">🗑️</button>' +
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
    // Anwesende ohne Flight können per Tipp in jeden Flight geholt werden
    var unassigned = srv.players.filter(function (p) {
      return p.present === true && !M.flightOf(srv.flights, p.id);
    });
    list.innerHTML = flightsSorted().map(function (f) {
      var members = f.playerIds.map(function (pid) {
        var p = playerById(pid);
        if (!p) return '';
        return '<span class="member-chip in" data-remove-player="' + pid + '">' + esc(p.name) + ' ✕</span>';
      }).join('') + unassigned.map(function (p) {
        return '<span class="member-chip" data-add-player="' + p.id + '" data-flight="' + f.id + '">+ ' + esc(p.name) + '</span>';
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
    if (ui.hole > M.HOLES) setHole(1);
    var info = M.COURSE[ui.hole - 1];

    $('#hole-picker').innerHTML = M.COURSE.map(function (h) {
      var done = flight && flight.playerIds.length > 0 && flight.playerIds.every(function (pid) {
        var e = entryFor(pid, h.hole);
        return e && e.gross != null;
      });
      return '<button type="button" data-hole="' + h.hole + '" class="' + (h.hole === ui.hole ? 'active' : '') + ' ' + (done ? 'done' : '') + '">' + h.hole + '</button>';
    }).join('');

    $('#hole-info').textContent =
      t('e_hole_info', { h: info.hole, p: info.par, d: info.dists[displayTee()] || '?', i: info.index }) +
      (info.par === 3 ? t('e_no_zebra') : '') +
      (flight && flight.teeTime ? ' · 🕐 ' + formatTee(flight.teeTime, true) : '');

    $('#entry-progress').textContent = flight ? progressText(flight) : '';
    $('#flight-card-btn').hidden = !flight || !flight.playerIds.length;

    var wrap = $('#entry-players');
    if (!flight || !flight.playerIds.length) {
      wrap.innerHTML = '<div class="card"><p class="empty-note">' + t('e_no_players') + '</p></div>';
      return;
    }

    var nextLabel = ui.hole < M.HOLES ? t('e_next', { h: ui.hole, n: ui.hole + 1 }) : t('e_next_last', { h: M.HOLES });

    wrap.innerHTML = flight.playerIds.map(function (pid) {
      var p = playerById(pid);
      if (!p) return '';
      var entry = entryFor(pid, ui.hole) || { gross: null, animals: {} };
      var stats = liveResult(p);
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
      var result = liveResult(p);
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
      var linkedEv = r.eventId && srv.events.find(function (ev) { return ev.id === r.eventId; });
      return '<div class="archive-round ' + (r.id === ui.lbRound ? 'current' : '') + '">' +
        '<div class="ar-head"><span class="ar-name">🏆 ' + esc(r.name) + '</span>' +
        '<span class="ar-meta">' + esc(formatDate(r.date)) +
        (linkedEv && linkedEv.name !== r.name ? ' · 📅 ' + esc(linkedEv.name) : '') +
        ' · ' + t('ar_players', { n: r.playerCount }) + ' · ' + t('ar_winner') + ': ' + winners + '</span></div>' +
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
  function showScorecard(player, scores, courseId, tees) {
    var c = M.courseById(courseId) || M.course;
    var useTees = tees || srv.tees;
    var gender = M.normalizeGender(player.gender);
    var tee = M.normalizeTee(useTees && useTees[gender], gender, c.id);
    var result = M.playerResult(player, scores || {}, c.id, useTees);
    var strokes = M.strokesFor(player.hcp, c.id, gender, tee);
    var showPoints = ui.unlocked;
    var grossCells = c.holes.map(function (h) {
      var e = (scores || {})[h.hole];
      if (e && e.gross != null) {
        var d = e.gross - h.par;
        var cls = d < 0 ? 'sc-under' : d === 0 ? 'sc-par' : d === 1 ? 'sc-over' : 'sc-dbl';
        // Über dem Netto-Doppelbogey-Deckel: gewertet wird weniger als eingetragen
        var capped = e.gross > M.capFor(h.hole, strokes[h.hole], c.id);
        return '<td class="' + cls + (capped ? ' sc-capped' : '') + '">' + e.gross + '</td>';
      }
      return '<td>–</td>';
    }).join('');
    var animalCells = c.holes.map(function (h) {
      var e = (scores || {})[h.hole];
      var s = '';
      if (e && e.animals) M.ANIMALS.forEach(function (a) { if (e.animals[a.key]) s += a.emoji; });
      return '<td class="sc-animals">' + s + '</td>';
    }).join('');
    // Vorgabeschläge pro Loch (•, •• …) – nur zeigen, wenn es welche gibt
    var hasStrokes = c.holes.some(function (h) { return strokes[h.hole] !== 0; });
    var strokeRow = hasStrokes
      ? '<tr><td>' + t('sc_strokes') + '</td>' + c.holes.map(function (h) {
          var n = strokes[h.hole];
          var dots = n > 0 ? '•'.repeat(n) : n < 0 ? '+' : '';
          return '<td class="sc-strokes">' + dots + '</td>';
        }).join('') + '<td>' + signed(M.courseHandicap(player.hcp, c.id, gender, tee)) + '</td></tr>'
      : '';

    openModal(
      modalHead('🧾 ' + esc(player.name)) +
      '<p class="hint">HCP ' + result.hcp + ' · ' + (gender === 'f' ? '♀' : '♂') + ' Tee ' + tee + ' · ' + t('p_target') + ' ' + result.target +
      (showPoints ? ' · ' + t('sc_points') + ' <strong>' + signed(result.points) + '</strong>' : '') + '</p>' +
      '<div class="table-scroll"><table class="sc-table">' +
      '<tr><th>' + t('c_hole') + '</th>' + c.holes.map(function (h) { return '<th>' + h.hole + '</th>'; }).join('') + '<th>' + t('sc_tot') + '</th></tr>' +
      '<tr><td>' + t('sc_par') + '</td>' + c.holes.map(function (h) { return '<td>' + h.par + '</td>'; }).join('') + '<td>' + c.par + '</td></tr>' +
      strokeRow +
      '<tr><td>' + t('sc_gross') + '</td>' + grossCells + '<td><strong>' + (result.played ? result.gross : '–') + '</strong></td></tr>' +
      '<tr><td>' + t('sc_animals') + '</td>' + animalCells + '<td>+' + result.pos + ' −' + result.neg + '</td></tr>' +
      '</table></div>' +
      '<p class="hint">' + t('sc_legend') + '</p>' +
      (result.cappedHoles ? '<p class="hint">🧢 ' + t('sc_capped', { n: result.cappedHoles }) + '</p>' : '') +
      (result.complete ? '' : '<p class="hint">⚠️ ' + t('sc_open', { n: c.holeCount - result.played }) + '</p>') +
      (showPoints ? '' : '<p class="hint">🔒 ' + t('sc_hidden') + '</p>')
    );
  }

  // Karte des ganzen Flights – Loch für Loch, ohne Punktestand
  function showFlightCard(flight) {
    var rows = flight.playerIds.map(function (pid) {
      var p = playerById(pid);
      if (!p) return '';
      var scores = scoresFor(pid);
      var result = liveResult(p);
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
      '<tr><th>' + t('c_hole') + '</th>' + c.holes.map(function (h) { return '<th>' + h.hole + '</th>'; }).join('') + '<th>' + t('sc_tot') + '</th></tr>' +
      '<tr><td>' + t('sc_par') + '</td>' + c.holes.map(function (h) { return '<td>' + h.par + '</td>'; }).join('') + '<td>' + c.par + '</td></tr>' +
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

  $('#calc-hcp').addEventListener('input', renderCalc);
  $('#calc-tee').addEventListener('change', renderCalc);
  $('#calc-course').addEventListener('change', renderCalc);
  $('#calc-gender').addEventListener('click', function () {
    var next = this.dataset.value === 'f' ? 'm' : 'f';
    this.dataset.value = next;
    this.textContent = next === 'f' ? '♀' : '♂';
    renderCalc();
  });

  $('#new-gender').addEventListener('click', function () {
    var next = this.dataset.value === 'f' ? 'm' : 'f';
    this.dataset.value = next;
    this.textContent = next === 'f' ? '♀' : '♂';
  });

  // Platz wechseln (PIN; nur ohne Scores in der laufenden Runde)
  $('#course-select').addEventListener('change', async function (e) {
    var course = M.courseById(e.target.value);
    if (!course || course.id === srv.courseId) return;
    var revert = function () { e.target.value = srv.courseId; };
    if (!(await ensurePin())) return revert();
    if (!(await confirmDialog(t('cs_confirm', { name: course.label }), { okLabel: t('dlg_ok') }))) return revert();
    try {
      await api('PUT', '/api/course', { courseId: course.id });
      toast(t('cs_switched', { name: course.name }));
      await pull(true);
      renderInfo(); // Hero, Platz-Karte und Rechner nachführen
    } catch (err) {
      apiError(err);
      revert();
    }
  });

  ['m', 'f'].forEach(function (g) {
    $(g === 'm' ? '#tee-select-m' : '#tee-select-f').addEventListener('change', async function (e) {
      var body = {};
      body[g === 'm' ? 'teeM' : 'teeF'] = e.target.value;
      var revert = function () { renderCoursePicker(); };
      if (!(await ensurePin())) return revert();
      try {
        await api('PUT', '/api/course', body);
        toast(t('cs_tee_saved'));
        pull(true);
      } catch (err) {
        apiError(err);
        revert();
      }
    });
  });

  // Abschlag (Tee) für Distanz-Anzeigen wählen – rein lokal pro Gerät
  $('#course-cards').addEventListener('click', function (e) {
    var chip = e.target.closest('[data-tee]');
    if (!chip) return;
    localStorage.setItem('fta-tee:' + chip.dataset.course, chip.dataset.tee);
    renderCourseTable();
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
    var openRound = e.target.closest('[data-open-round]');
    var editBtn = e.target.closest('[data-edit-event]');
    var delBtn = e.target.closest('[data-del-event]');
    if (openRound) {
      // Zur gespeicherten Runde springen – die PIN-Sperre der Rangliste
      // greift wie gewohnt, falls dieses Gerät noch gesperrt ist.
      ui.lbRound = openRound.dataset.openRound;
      switchTab('leaderboard');
      return;
    }
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
      if (!(await confirmDialog(t('ev_confirm_del', { name: delEv.name }), { danger: true, okLabel: t('dlg_delete') }))) return;
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
    if (duplicate && !(await confirmDialog(t('p_dup_name', { name: name }), { okLabel: t('p_add') }))) return;
    try {
      await api('POST', '/api/players', {
        name: name,
        hcp: $('#player-hcp').value,
        gender: $('#new-gender').dataset.value || 'm',
      });
      $('#player-name').value = '';
      $('#player-hcp').value = '';
      toast(t('p_added', { name: name }));
      pull(true);
    } catch (err) { apiError(err); }
  });

  $('#player-list').addEventListener('click', async function (e) {
    var presBtn = e.target.closest('[data-presence]');
    var genderBtn = e.target.closest('[data-gender]');
    var editBtn = e.target.closest('[data-edit-player]');
    var delBtn = e.target.closest('[data-del-player]');

    if (genderBtn) {
      var gp = playerById(genderBtn.dataset.gender);
      if (!gp) return;
      var next = M.normalizeGender(gp.gender) === 'f' ? 'm' : 'f';
      try {
        await api('PUT', '/api/players/' + gp.id, { gender: next });
        pull(true);
      } catch (err) { apiError(err); }
      return;
    }

    if (presBtn) {
      var p = playerById(presBtn.dataset.presence);
      if (!p) return;
      var present = p.present !== true;
      try {
        await api('PUT', '/api/players/' + p.id, { present: present });
        toast(t(present ? 'tn_now_here' : 'tn_now_away', { name: p.name }));
        pull(true);
      } catch (err) { apiError(err); }
      return;
    }
    if (editBtn) {
      var ep = playerById(editBtn.dataset.editPlayer);
      if (!ep) return;
      var name = await promptDialog({ title: t('p_prompt_name'), value: ep.name, maxlength: 40, okLabel: t('dlg_save') });
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
      if (!(await confirmDialog(t('p_confirm_del', { name: dp.name }), { danger: true, okLabel: t('dlg_delete') }))) return;
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
    var lp = playerById(inp.dataset.hcpPlayer);
    var badge = $('[data-target-for="' + inp.dataset.hcpPlayer + '"]');
    if (badge && lp) badge.textContent = t('p_target') + ' ' + playerTarget(lp, inp.value);
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
      if (badge) badge.textContent = t('p_target') + ' ' + playerTarget(res.player);
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
    var addChip = e.target.closest('[data-add-player]');
    var renameBtn = e.target.closest('[data-rename-flight]');
    var delBtn = e.target.closest('[data-del-flight]');

    if (addChip) {
      try {
        await api('PUT', '/api/players/' + addChip.dataset.addPlayer, { flightId: addChip.dataset.flight });
        pull(true);
      } catch (err) { apiError(err); }
      return;
    }
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
      var name = await promptDialog({ title: t('ph_flight'), value: rf.name, maxlength: 40, okLabel: t('dlg_save') });
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
      if (!(await confirmDialog(t('f_confirm_del', { name: f.name }), { danger: true, okLabel: t('dlg_delete') }))) return;
      try {
        await api('DELETE', '/api/flights/' + f.id);
        pull(true);
      } catch (err) { apiError(err); }
    }
  });

  $('#randomize-btn').addEventListener('click', async function () {
    if (!srv.players.length) return toast(t('fr_first'), true);
    var pool = srv.players.filter(function (p) { return p.present === true; });
    if (pool.length < 2) return toast(t('fr_need_present'), true);
    // Ein Dialog: Text erklärt, was passiert, die Knöpfe 2/3/4 wählen die
    // Flight-Grösse und bestätigen zugleich.
    var res = await showDialog({
      title: t('fr_title'),
      text: t(srv.flights.length ? 'fr_text_redraw' : 'fr_text_present', { n: pool.length }),
      buttons: [
        { label: t('dlg_cancel'), value: null, kind: 'plain' },
        { label: '2', value: 2 },
        { label: '3', value: 3, kind: 'primary' },
        { label: '4', value: 4 },
      ],
    });
    if (!res) return;
    try {
      await api('POST', '/api/flights/randomize', { size: res.button, playerIds: pool.map(function (p) { return p.id; }) });
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

  $('#entry-players').addEventListener('click', async function (e) {
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
        if (!(await confirmDialog(t('e_missing', { names: names }), { okLabel: t('dlg_continue') }))) return;
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
    if (player) showScorecard(player, (round.scores || {})[pid] || {}, round.courseId, round.tees);
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
  // Abgerundetes Rechteck (roundRect() fehlt in älteren Safari-Versionen)
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Schrift so weit verkleinern, bis der Text in die Breite passt
  function fitFont(ctx, text, maxWidth, size, weight) {
    for (; size > 18; size -= 2) {
      ctx.font = (weight || 'bold') + ' ' + size + 'px sans-serif';
      if (ctx.measureText(text).width <= maxWidth) break;
    }
    return size;
  }

  $('#share-btn').addEventListener('click', function () {
    var data = leaderboardData();
    if (!data.rows.length) return toast(t('cer_no_players'), true);
    var rows = M.ranked(data.rows, M.compareMain);
    var byAnimals = M.ranked(data.rows, M.compareAnimals);

    // Podest: Gleichstände teilen sich einen Block («Anna & Beat»)
    function group(rank) {
      var g = rows.filter(function (r) { return r.rank === rank; });
      if (!g.length) return null;
      return {
        names: g.map(function (r) { return r.name + (r.complete ? '' : ' *'); }).join(' & '),
        points: g[0].points,
        gross: g.map(function (r) { return r.played ? r.gross : '–'; }).join(' & '),
        pos: g[0].pos, neg: g[0].neg, single: g.length === 1,
      };
    }
    var podium = [group(1), group(2), group(3)];
    var rest = rows.filter(function (r) { return r.rank > 3; });
    var topAnimals = byAnimals.filter(function (r) { return r.rank === 1 && r.totalAnimals > 0; });

    var W = 1080, headH = 230, podH = 350;
    var restH = rest.length ? rest.length * 56 + 24 : 0;
    var aniH = topAnimals.length ? 108 : 0;
    var footH = 104;
    var H = headH + podH + restH + aniH + footH;

    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.textBaseline = 'alphabetic';

    // Hintergrund + Kopf
    ctx.fillStyle = '#f4f9f6'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1d5c3f'; ctx.fillRect(0, 0, W, headH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🦓 FORE THE ANIMALS!', W / 2, 88);
    ctx.font = '26px sans-serif'; ctx.globalAlpha = 0.85;
    ctx.fillText(t('img_subtitle'), W / 2, 132);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f5c542';
    var headline = data.kind === 'saved'
      ? data.round.name + ' · ' + formatDate(data.round.date)
      : t('lb_live') + ' · ' + formatDate(Date.now());
    ctx.font = 'bold ' + fitFont(ctx, headline, W - 120, 30) + 'px sans-serif';
    ctx.fillText(headline, W / 2, 188);

    // Podest: 2. links, 1. in der Mitte (am höchsten), 3. rechts
    var base = headH + podH - 34;
    var blocks = [
      { g: podium[1], x: 30, w: 320, h: 140, medal: '🥈', bg: '#f2f2f2', edge: '#c9ccc9' },
      { g: podium[0], x: 380, w: 320, h: 200, medal: '🥇', bg: '#fdf6dd', edge: '#e3c761' },
      { g: podium[2], x: 730, w: 320, h: 110, medal: '🥉', bg: '#f9ede0', edge: '#d9b38c' },
    ];
    blocks.forEach(function (b) {
      if (!b.g) return;
      var top = base - b.h;
      var cx = b.x + b.w / 2;
      ctx.fillStyle = b.bg;
      rrect(ctx, b.x, top, b.w, b.h, 14); ctx.fill();
      ctx.strokeStyle = b.edge; ctx.lineWidth = 3;
      rrect(ctx, b.x, top, b.w, b.h, 14); ctx.stroke();
      // Medaille über dem Block
      ctx.font = '58px sans-serif'; ctx.fillStyle = '#21302a';
      ctx.fillText(b.medal, cx, top - 16);
      // Name, Punkte, Detail im Block
      var nameSize = fitFont(ctx, b.g.names, b.w - 36, 32);
      ctx.font = 'bold ' + nameSize + 'px sans-serif'; ctx.fillStyle = '#21302a';
      ctx.fillText(b.g.names, cx, top + 46);
      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = b.g.points < 0 ? '#b23a48' : '#1d5c3f';
      ctx.fillText(signed(b.g.points), cx, top + 96);
      if (b.h >= 140) {
        ctx.font = '22px sans-serif'; ctx.fillStyle = '#6b7d74';
        ctx.fillText(t('h_gross') + ' ' + b.g.gross + ' · ➕' + b.g.pos + ' ➖' + b.g.neg, cx, top + b.h - 22);
      }
    });

    // Ab Platz 4: kompakte Zeilen
    var y = headH + podH + 10;
    ctx.textAlign = 'left';
    rest.forEach(function (r, i) {
      var ry = y + i * 56;
      ctx.fillStyle = i % 2 === 0 ? '#eaf3ee' : '#ffffff';
      rrect(ctx, 30, ry, W - 60, 50, 10); ctx.fill();
      ctx.fillStyle = '#6b7d74'; ctx.font = 'bold 26px sans-serif';
      ctx.fillText(r.rank + '.', 52, ry + 35);
      ctx.fillStyle = '#21302a';
      ctx.font = 'bold ' + fitFont(ctx, r.name, 430, 28) + 'px sans-serif';
      ctx.fillText(r.name + (r.complete ? '' : ' *'), 110, ry + 35);
      ctx.fillStyle = '#6b7d74'; ctx.font = '24px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(t('h_gross') + ' ' + (r.played ? r.gross : '–') + ' · ➕' + r.pos + ' ➖' + r.neg, W - 170, ry + 35);
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = r.points < 0 ? '#b23a48' : '#1d5c3f';
      ctx.fillText(signed(r.points), W - 56, ry + 36);
      ctx.textAlign = 'left';
    });

    // Tierpreis-Band
    if (topAnimals.length) {
      var ay = headH + podH + restH + 12;
      ctx.fillStyle = '#f7f3e8';
      rrect(ctx, 30, ay, W - 60, 78, 14); ctx.fill();
      ctx.strokeStyle = '#e3d9bd'; ctx.lineWidth = 2;
      rrect(ctx, 30, ay, W - 60, 78, 14); ctx.stroke();
      var aniText = t('img_most_animals', {
        name: topAnimals.map(function (r) { return r.name; }).join(' & '),
        n: topAnimals[0].totalAnimals,
      });
      ctx.fillStyle = '#7a5c1e'; ctx.textAlign = 'center';
      ctx.font = 'bold ' + fitFont(ctx, aniText, W - 140, 30) + 'px sans-serif';
      ctx.fillText(aniText, W / 2, ay + 49);
    }

    // Fusszeile
    ctx.textAlign = 'center';
    ctx.font = '30px sans-serif'; ctx.fillStyle = '#21302a';
    ctx.fillText('🦓 🦒 🐇 🦂 🐊 🐍', W / 2, H - 56);
    ctx.font = '20px sans-serif'; ctx.fillStyle = '#6b7d74';
    ctx.fillText('Fore the Animals! · ' + t('img_subtitle'), W / 2, H - 24);
    ctx.textAlign = 'left';

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

    var rows = leaderboardData().rows;
    var open = rows.filter(function (r) { return !r.complete; }).length;

    // Termin-Auswahl: der heutige (bzw. der nächstliegende innerhalb einer
    // Woche) ist vorgewählt; die Wahl füllt den Rundennamen gleich mit aus.
    var today = new Date();
    var defaultName = t('sr_default', { date: formatDate(today) });
    var candidates = srv.events.filter(function (ev) { return ev.date; }).map(function (ev) {
      return { ev: ev, dist: Math.abs(new Date(ev.date + 'T12:00') - today) };
    }).sort(function (a, b) { return a.dist - b.dist; });
    var preselected = candidates.length && candidates[0].dist <= 7 * 24 * 3600 * 1000 ? candidates[0].ev : null;
    var eventOptions = [{ value: '', label: t('sr_no_event') }].concat(
      srv.events.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
        .map(function (ev) { return { value: ev.id, label: ev.name + (ev.date ? ' · ' + formatDate(ev.date + 'T12:00') : '') }; })
    );

    var dlgPromise = showDialog({
      title: t('sr_title').replace('&amp;', '&'),
      text: t(open ? 'sr_confirm_open' : 'sr_confirm', { players: rows.length, open: open }),
      select: { label: t('sr_event'), value: preselected ? preselected.id : '', options: eventOptions },
      input: {
        label: t('sr_prompt'),
        value: preselected ? preselected.name : defaultName,
        placeholder: t('sr_prompt'),
        maxlength: 60,
      },
      buttons: [
        { label: t('dlg_cancel'), value: null, kind: 'plain' },
        { label: t('sr_btn'), value: 'ok', kind: 'primary' },
      ],
    });
    // Termin gewählt → Name übernehmen, solange er nicht von Hand geändert wurde
    var nameField = $('#dialog-input');
    var eventField = $('#dialog-select');
    var nameTouched = false;
    nameField.addEventListener('input', function () { nameTouched = true; });
    eventField.addEventListener('change', function () {
      if (nameTouched) return;
      var ev = srv.events.find(function (x) { return x.id === eventField.value; });
      nameField.value = ev ? ev.name : defaultName;
    });

    var dlg = await dlgPromise;
    if (!dlg) return;
    try {
      var res = await api('POST', '/api/rounds', { name: dlg.value, eventId: dlg.select || null });
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
      if (!(await confirmDialog(t('ar_confirm_del', { name: round.name }), { danger: true, okLabel: t('dlg_delete') }))) return;
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
    if (!(await confirmDialog(t('bk_confirm'), { danger: true, okLabel: t('bk_up').replace('⬆️ ', '') }))) return;
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
    var answer = await promptDialog({
      title: t('dz_title'),
      text: t('dz_prompt'),
      placeholder: 'RESET',
      okLabel: t('dlg_delete'),
    });
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

  loadCachedState(); // sofort etwas zeigen – auch ohne Netz
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
