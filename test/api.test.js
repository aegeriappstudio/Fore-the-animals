'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createStore } = require('../lib/store.js');
const { createApi } = require('../lib/api.js');

const PIN = '4711';

// Startet einen Server auf einem freien Port und liefert einen kleinen Client.
async function startServer(initial) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fta-api-'));
  if (initial) fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(initial));
  const store = createStore({ dataDir: dir, log: false });
  store.load();
  const api = createApi(store, { pin: PIN });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    api.handle(req, res, url).catch((err) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function call(method, url, body, pin) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (pin) headers['x-fta-pin'] = pin;
    const res = await fetch(base + url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  }

  return {
    call,
    store,
    dir,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function addPlayer(srv, name, hcp) {
  const res = await srv.call('POST', '/api/players', { name, hcp });
  assert.equal(res.status, 200);
  return res.body.player;
}

test('GET /api/state antwortet knapp, wenn sich nichts geändert hat', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());

  const first = await srv.call('GET', '/api/state');
  assert.equal(first.status, 200);
  assert.ok(Array.isArray(first.body.players));

  const again = await srv.call('GET', `/api/state?rev=${first.body.rev}`);
  assert.deepEqual(again.body, { unchanged: true, rev: first.body.rev });

  await addPlayer(srv, 'Anna', 15);
  const third = await srv.call('GET', `/api/state?rev=${first.body.rev}`);
  assert.equal(third.body.unchanged, undefined);
  assert.equal(third.body.players.length, 1);
});

test('gespeicherte Runden kommen ohne Loch-Scores in den State', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 1, gross: 4 }] });
  await srv.call('POST', '/api/rounds', { name: 'Runde 1' }, PIN);

  const state = await srv.call('GET', '/api/state');
  assert.equal(state.body.rounds.length, 1);
  assert.equal(state.body.rounds[0].scores, undefined);
  assert.equal(state.body.rounds[0].playerCount, 1);
  assert.equal(state.body.rounds[0].winners[0].name, 'Anna');

  // Details gibt es einzeln
  const detail = await srv.call('GET', `/api/rounds/${state.body.rounds[0].id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.round.scores[anna.id]['1'].gross, 4);
});

test('Scores kommen gebündelt und werden zusammengeführt', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  const beat = await addPlayer(srv, 'Beat', 20);

  const res = await srv.call('PUT', '/api/scores', {
    entries: [
      { playerId: anna.id, hole: 1, gross: 4 },
      { playerId: anna.id, hole: 1, animals: { zebra: true } },
      { playerId: beat.id, hole: 1, gross: 6, animals: { snake: true } },
    ],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.applied.length, 3);
  assert.equal(res.body.rejected.length, 0);

  const state = await srv.call('GET', '/api/state');
  assert.deepEqual(state.body.scores[anna.id]['1'], { gross: 4, animals: { zebra: true } });
  assert.deepEqual(state.body.scores[beat.id]['1'], { gross: 6, animals: { snake: true } });
});

test('ungültige Einträge werden einzeln abgelehnt, gültige trotzdem gebucht', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);

  const res = await srv.call('PUT', '/api/scores', {
    entries: [
      { playerId: anna.id, hole: 1, gross: 4 },
      { playerId: anna.id, hole: 99, gross: 4 },
      { playerId: 'gibtsnicht', hole: 2, gross: 4 },
      { playerId: anna.id, hole: 2, gross: 'viele' },
    ],
  });
  assert.equal(res.body.applied.length, 1);
  assert.equal(res.body.rejected.length, 3);
});

test('Zebra lässt sich auf Par 3 nicht setzen', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 4, gross: 3, animals: { zebra: true } }] });
  const state = await srv.call('GET', '/api/state');
  assert.deepEqual(state.body.scores[anna.id]['4'], { gross: 3, animals: {} });
});

test('leerer Eintrag löscht das Loch wieder', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 1, gross: 4 }] });
  await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 1, gross: null }] });
  const state = await srv.call('GET', '/api/state');
  assert.deepEqual(state.body.scores[anna.id], {});
});

test('Runde abschliessen: nur wer eingetragen hat, wird gewertet', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  await addPlayer(srv, 'Nichtstarter', 30);
  await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 1, gross: 4 }] });

  const saved = await srv.call('POST', '/api/rounds', { name: 'Testrunde' }, PIN);
  assert.equal(saved.status, 200);
  assert.equal(saved.body.round.playerCount, 1);

  const state = await srv.call('GET', '/api/state');
  assert.equal(state.body.scores[anna.id] && Object.keys(state.body.scores[anna.id]).length, 0);
  assert.equal(state.body.players.length, 2);
});

test('Runde abschliessen ohne Scores wird abgelehnt', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  await addPlayer(srv, 'Anna', 15);
  const res = await srv.call('POST', '/api/rounds', {}, PIN);
  assert.equal(res.status, 400);
});

test('geschützte Aktionen brauchen die PIN', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  assert.equal((await srv.call('DELETE', `/api/players/${anna.id}`)).status, 403);
  assert.equal((await srv.call('POST', '/api/rounds', {})).status, 403);
  assert.equal((await srv.call('GET', '/api/backup')).status, 403);
  assert.equal((await srv.call('POST', '/api/reset', { confirm: 'RESET' })).status, 403);
  assert.equal((await srv.call('POST', '/api/events', { name: 'X', date: '2026-01-01' })).status, 403);
  // Score-Eingabe bleibt für alle offen
  assert.equal((await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 1, gross: 4 }] })).status, 200);
});

test('falsche PIN wird abgewiesen, richtige akzeptiert', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  assert.equal((await srv.call('POST', '/api/unlock', { pin: 'falsch' })).status, 403);
  assert.equal((await srv.call('POST', '/api/unlock', { pin: PIN })).status, 200);
});

test('ein Spieler ist immer nur in einem Flight', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  const f1 = (await srv.call('POST', '/api/flights', { name: 'Flight 1' })).body.flight;
  const f2 = (await srv.call('POST', '/api/flights', { name: 'Flight 2' })).body.flight;

  await srv.call('PUT', `/api/flights/${f1.id}`, { playerIds: [anna.id] });
  await srv.call('PUT', `/api/flights/${f2.id}`, { playerIds: [anna.id] });

  const state = await srv.call('GET', '/api/state');
  const byId = Object.fromEntries(state.body.flights.map((f) => [f.id, f.playerIds]));
  assert.deepEqual(byId[f1.id], []);
  assert.deepEqual(byId[f2.id], [anna.id]);
});

test('flightId auf einem Spieler setzt und entfernt die Zuteilung', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  const f1 = (await srv.call('POST', '/api/flights', { name: 'Flight 1' })).body.flight;
  const f2 = (await srv.call('POST', '/api/flights', { name: 'Flight 2' })).body.flight;

  // zuteilen
  await srv.call('PUT', `/api/players/${anna.id}`, { flightId: f1.id });
  let state = await srv.call('GET', '/api/state');
  assert.deepEqual(state.body.flights.find((f) => f.id === f1.id).playerIds, [anna.id]);

  // in anderen Flight wechseln – aus dem alten verschwindet sie
  await srv.call('PUT', `/api/players/${anna.id}`, { flightId: f2.id });
  state = await srv.call('GET', '/api/state');
  assert.deepEqual(state.body.flights.find((f) => f.id === f1.id).playerIds, []);
  assert.deepEqual(state.body.flights.find((f) => f.id === f2.id).playerIds, [anna.id]);

  // null = spielt heute nicht mit
  await srv.call('PUT', `/api/players/${anna.id}`, { flightId: null });
  state = await srv.call('GET', '/api/state');
  assert.ok(state.body.flights.every((f) => f.playerIds.length === 0));

  // unbekannter Flight → 404
  const bad = await srv.call('PUT', `/api/players/${anna.id}`, { flightId: 'gibtsnicht' });
  assert.equal(bad.status, 404);
});

test('Backup und Wiederherstellung', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 1, gross: 4 }] });
  await srv.call('POST', '/api/rounds', { name: 'Runde 1' }, PIN);

  const backup = (await srv.call('GET', '/api/backup', null, PIN)).body;
  assert.equal(backup.rounds[0].scores[anna.id]['1'].gross, 4);

  await srv.call('POST', '/api/reset', { confirm: 'RESET' }, PIN);
  await srv.call('DELETE', `/api/players/${anna.id}`, null, PIN);
  assert.equal((await srv.call('GET', '/api/state')).body.players.length, 0);

  const restored = await srv.call('POST', '/api/restore', backup, PIN);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.players, 1);
  assert.equal(restored.body.rounds, 1);
  const state = await srv.call('GET', '/api/state');
  assert.equal(state.body.players[0].name, 'Anna');
  assert.equal(state.body.rounds.length, 1);
});

test('Termin-Anmeldung existiert nicht mehr', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  const ev = (await srv.call('POST', '/api/events', { name: 'Turnier', date: '2026-08-06' }, PIN)).body.event;
  assert.equal(ev.playerIds, undefined);
  assert.equal((await srv.call('POST', `/api/events/${ev.id}/signup`, { playerId: anna.id, attending: true }, PIN)).status, 404);
  assert.equal((await srv.call('POST', `/api/events/${ev.id}/apply-attendance`, {}, PIN)).status, 404);
});

test('ewige Bestenliste kommt fertig vom Server', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const anna = await addPlayer(srv, 'Anna', 15);
  await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 1, gross: 4 }] });
  await srv.call('POST', '/api/rounds', { name: 'Runde 1' }, PIN);
  await srv.call('PUT', '/api/scores', { entries: [{ playerId: anna.id, hole: 1, gross: 5 }] });
  await srv.call('POST', '/api/rounds', { name: 'Runde 2' }, PIN);

  const state = await srv.call('GET', '/api/state');
  assert.equal(state.body.allTime.length, 1);
  assert.equal(state.body.allTime[0].rounds, 2);
  assert.equal(state.body.allTime[0].wins, 2);
});

test('unbekannte Pfade ergeben 404', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  assert.equal((await srv.call('GET', '/api/gibtsnicht')).status, 404);
});
