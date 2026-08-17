# Fore the Animals! – Hinweise für die Arbeit an diesem Repo

Turnier-App für das Spassturnier «Beat Your Target» (Golfpark Holzhäusern,
Plätze Rigi 9 Loch und Zugersee 18 Loch). Mobile-first, deutschsprachige
Nutzer, Deploy auf Render (zieht automatisch von `main`).

## Eiserne Regeln

- **Keine Abhängigkeiten, kein Build.** Server = Node-Standardbibliothek,
  Frontend = Vanilla JS als klassische `<script>`-Dateien. `npm test` läuft
  mit `node --test`, mehr braucht es nicht. Nichts installieren.
- **`public/shared/model.js` ist die einzige Quelle der Wahrheit** für
  Plätze, Ratings, Tiere, Ziel-/Punkteberechnung und Ranglisten-Sortierung.
  Sie läuft identisch im Server (`require`) und im Browser (UMD, Namensraum
  `FTA`). Spielregel-Logik NIEMALS in `app.js` oder `api.js` duplizieren.
- **`public/sw.js`: bei jeder Änderung an App-Dateien die `CACHE`-Version
  hochzählen** – sonst sehen die Handys die neue Version nicht.
- **Datenänderungen nur über `store.commit()`** (zählt `rev` hoch und
  speichert atomar). Migrationen alter `data.json`-Stände leben in
  `lib/store.js` (`migrate()`, `SCHEMA`-Kommentar dort pflegen).
- **Texte zweisprachig** (DE/EN) in `public/i18n.js`; statische HTML-Texte
  tragen `data-i18n`-Attribute und müssen mit den i18n-Werten synchron sein.
- **Eigene Dialoge statt `prompt()`/`confirm()`** – `showDialog`/
  `confirmDialog`/`promptDialog` in `app.js` verwenden.

## Wichtige Invarianten der Wertung

- Spielvorgabe = `HCP × Anteil × (Slope ÷ 113) + (CR − Par)`, WHS-gerundet
  (,5 aufwärts, `roundHalf` glättet Float-Drift). Die Ratings 2026 stehen in
  der Platz-Registry; die Formel wurde gegen alle 1608 Grenzwerte der
  offiziellen Course-Handicap-Tabellen validiert – bei Änderungen an
  `courseHandicap`/`roundHalf` die Tabellen-Stichproben-Tests beachten.
- Anteil: 9 Loch = halbes, 18 Loch = ganzes Handicap. Damen/Herren haben
  eigene Ratings (`player.gender`), die Wertungs-Tees (`state.tees`) gelten
  pro Runde und werden im Runden-Schnappschuss eingefroren.
- Offene Löcher zählen als Netto-Par (punkteneutral); pro Loch zählt
  höchstens Netto-Doppelbogey; Gleichstand: Tiere, dann Countback.
- Archivierte Runden werden IMMER mit ihrem eigenen Platz (`round.courseId`)
  und ihren Tees (`round.tees`) ausgewertet, egal was gerade aktiv ist.
- Wer nichts eingetragen hat, steht nicht in der Wertung; Netto-Giraffe ist
  bewusst NICHT umgesetzt (Entscheid des Turnierleiters).

## Arbeitsweise

- Tests: `npm test` (node:test, ohne Abhängigkeiten). CI läuft via GitHub
  Actions bei jedem Push/PR.
- Browser-Verifikation: Playwright ist global installiert
  (`require('/opt/node22/lib/node_modules/playwright')` in Test-Skripten im
  Scratchpad); Server für Tests mit eigenem `DATA_DIR` und `PORT` starten.
- Sprache in Commits/PRs/UI: Deutsch (Schweiz: «ss» statt «ß»).
- Der Nutzer will Änderungen live: nach Abschluss committen, pushen, PR
  erstellen und mergen (Render deployt `main` automatisch).
