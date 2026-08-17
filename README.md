# 🦓 Fore the Animals!

**9-Hole Golf Safari · Rigi Holzhäusern · Tee 27 · Par 36 · 2'682 m**

Turnier-Webseite für das Spassturnier «Beat Your Target» mit Tier-Bonuspunkten.
Mehrere Flights können gleichzeitig von ihren Handys aus Scores eintragen –
die Rangliste aktualisiert sich live.

## Spielregeln

Wir spielen **Beat Your Target** als Einzelwettbewerb.

**🎯 Ziel:** Par 36 + halbes Handicap, immer aufgerundet.

### Tiere

| Tier | Bedeutung | Punkte |
|---|---|---|
| 🦓 Zebra | Fairway getroffen (Par 4/5) | +1 |
| 🦒 Giraffe | Grün in Regulation | +1 |
| 🐇 Rabbit | Ein Putt oder Chip-in | +1 |
| 🦂 Scorpion | Ball im Bunker | −1 |
| 🐊 Crocodile | Ball im Wasser / Penalty Area | −1 |
| 🐍 Snake | Drei Putts oder mehr | −1 |

Auf demselben Loch können mehrere Tiere gesammelt werden, jedes Tier zählt pro Loch nur einmal.

**Schlussresultat:** Ziel − Brutto + positive Tiere − negative Tiere. Höchste Punktzahl gewinnt.
**Zweiter Preis:** die meisten gesammelten Tiere insgesamt.

### Zwei Details, die die App überall gleich handhabt

- **Offene Löcher zählen als Par.** Wer nicht alle 9 Löcher eingetragen hat,
  bekommt für die fehlenden Löcher das Par angerechnet – live wie im
  gespeicherten Schlussresultat. Solche Spieler sind mit einem `*` markiert.
  (Früher rechnete die Live-Ansicht mit Par, das Archiv aber mit 0 Schlägen –
  ein nicht fertig gespielter Spieler landete dadurch mit einem Fantasie-Resultat
  ganz oben.)
- **Gleichstand** wird der Reihe nach entschieden über: mehr positive Tiere,
  weniger negative Tiere, tieferes Brutto. Bleibt es exakt gleich, teilen sich
  beide den Rang.

## Starten

Es wird nur Node.js (≥ 18) benötigt, keine weiteren Abhängigkeiten:

```bash
node server.js      # oder: npm start
npm test            # Tests (node:test, ebenfalls ohne Abhängigkeiten)
```

Danach im Browser öffnen: <http://localhost:3000>

| Umgebungsvariable | Standard | Bedeutung |
|---|---|---|
| `PORT` | `3000` | Port des Webservers |
| `DATA_DIR` | Projektordner | Ablage für `data.json` und `backups/` |
| `LEADERBOARD_PIN` | `1234` | PIN für Rangliste und geschützte Aktionen |

## Am Turniertag (mehrere Flights gleichzeitig)

Damit alle Spieler auf dem Platz vom Handy aus eintragen können, muss die App
im Internet erreichbar sein. **👉 Schritt-für-Schritt-Anleitung: [HOSTING.md](HOSTING.md)**
(gratis über Render.com, direkt mit diesem GitHub-Repo verbunden – die
`render.yaml` im Repo konfiguriert alles automatisch).

Alternativen: Railway.app / Fly.io (Start: `node server.js`) oder ein Laptop im
gleichen WLAN (`node server.js` starten und die lokale IP teilen, z.B.
`http://192.168.1.20:3000`).

## Bedienung – 4 Tabs

1. **📖 Info** – Regeln, Platztabelle und die nächsten Turnier-Termine
   (Datum, Abschlagszeiten, Dinner). Termine sind reine Ankündigungen und
   werden mit der PIN gepflegt.
2. **🏌️ Turnier** – die eine Ansicht für den Turniertag: Spieler erfassen
   (Name/HCP, das Ziel wird automatisch berechnet) und per Tipp auf einen
   Flight-Chip zuteilen. **Wer in einem Flight steht, spielt heute mit** –
   ein separates An-/Abmelden gibt es nicht. «–» heisst: spielt heute nicht.
   ＋ erstellt direkt einen neuen Flight. «🎲 Auslosen» mischt die heute
   zugeteilten Spieler neu (oder alle, wenn noch niemand zugeteilt ist).
   Jeder Flight zeigt seinen Fortschritt (bei welchem Loch, wie viele fertig).
3. **⛳ Eintragen** – jeder Flight wählt sich selbst aus, wählt das Loch und
   tippt pro Spieler direkt die Schlagzahl an (Par ist hervorgehoben, ＋ für
   mehr, ✕ löscht) plus die Tiere. Die 🧾 Flight-Karte zeigt jederzeit alle
   bisherigen Einträge des Flights – ohne Punktestand, die Rangliste bleibt
   geheim. Mehrere Flights können gleichzeitig eintragen.
4. **🏆 Rangliste** – während der Runde hinter der PIN versteckt. Die PIN
   **zeigt** die Rangliste nur an – sie speichert und löscht nichts. Oben lässt
   sich zwischen der laufenden Runde und jeder gespeicherten Runde umschalten.
   Ein Tipp auf einen Spieler zeigt seine Scorekarte Loch für Loch. Die
   Preisverleihung startet man mit dem Knopf «🎉 Preisverleihung», die Runde
   legt man bewusst mit «Runde abschliessen» ins Archiv.

### Weitere Funktionen

- **🔐 PIN-geschützte Admin-Aktionen** – Spieler/Runden löschen, Runde
  abschliessen, zurücksetzen, Backup einspielen und Termine pflegen verlangen
  die PIN (`LEADERBOARD_PIN`, Standard `1234`). Nach zu vielen Fehlversuchen
  bremst der Server das Durchprobieren aus.
- **📅 Termine-Verwaltung** – Turnier-Termine (Datum, Flights, Dinner, Notiz,
  Status) direkt in der App erfassen und bearbeiten, ohne Deploy.
- **🗄️ Tages-Backups** – der Server legt automatisch einmal pro Tag eine
  datierte Kopie der `data.json` unter `backups/` ab (die letzten 14 bleiben).
  Ist die `data.json` einmal defekt, wird sie beiseitegelegt (nicht
  überschrieben) und aus dem jüngsten Backup weitergearbeitet.
- **🎉 Preisverleihung** – Vollbild-Show mit Platz 3 → 2 → Tierpreis → Sieger
  (mit Konfetti), ideal für den Apéro.
- **📸 Als Bild teilen** – erzeugt die Rangliste als Bild für die
  WhatsApp-Gruppe (Teilen-Dialog oder Download).
- **📶 Offline-tolerant** – bei Funklöchern auf dem Platz werden Einträge lokal
  gepuffert und automatisch nachgesendet, sobald wieder Netz da ist. Die
  Live-Aktualisierung läuft dabei weiter: Server-Stand und eigene, noch nicht
  gesendete Eingaben werden übereinandergelegt statt gegeneinander
  ausgespielt. Die App selbst startet dank Cache auch im Funkloch sofort;
  liegt eine neue Version bereit, erscheint ein Hinweis zum Neuladen.
- **💾 Runden-Archiv** – Runden abschliessen und speichern, inkl. ewiger
  Bestenliste über alle Runden (pro Spieler, nicht pro Name) sowie
  Backup-Download/-Restore.
- **📱 PWA** – «Zum Home-Bildschirm hinzufügen» installiert die App mit eigenem
  Icon und ohne Browser-Leiste.
- **🌐 Zweisprachig** – Knopf «EN/DE» in der Navigationsleiste schaltet die
  ganze Oberfläche zwischen Deutsch und Englisch um (Wahl wird pro Gerät
  gespeichert).

## Technik

Keine externen Abhängigkeiten – weder auf dem Server noch im Browser, kein
Build-Schritt.

```
server.js                 HTTP-Server: statische Dateien + Routing
lib/store.js              Laden, Migration alter Dateien, atomares Speichern, Backups
lib/api.js                JSON-API
public/shared/model.js    Spielregeln: Platz, Tiere, Ziel, Punkte, Ranglisten
public/i18n.js            alle Texte (DE/EN)
public/app.js             Oberfläche: Synchronisation und Rendering
test/                     Tests (node --test)
```

**`public/shared/model.js` ist die einzige Quelle der Wahrheit** für Punkte und
Ranglisten und läuft unverändert im Server (`require`) und im Browser
(`<script>`). Damit können Live-Ansicht und gespeichertes Resultat nicht mehr
auseinanderlaufen.

### Datenfluss

- Alle Daten liegen in einer JSON-Datei (`DATA_DIR/data.json`). Jede Änderung
  geht über `store.commit()`, das `rev` hochzählt und gebündelt-synchron auf die
  Platte schreibt; beim Beenden (`SIGTERM`, z.B. bei jedem Render-Deploy) wird
  der letzte Stand noch weggeschrieben.
- Der Client fragt `GET /api/state?rev=<bekannter Stand>` ab und bekommt bei
  unverändertem Stand nur `{unchanged:true}` zurück. Der Zustand enthält
  bewusst **keine** Loch-für-Loch-Scores gespeicherter Runden – die holt der
  Client bei Bedarf über `GET /api/rounds/:id`. Sonst würde jede Abfrage mit
  jedem gespielten Turnier grösser.
- Score-Eingaben werden im Client gebündelt und gehen als ein Request an
  `PUT /api/scores` (statt ein Request pro Tap).

### API

| Methode & Pfad | PIN | Zweck |
|---|---|---|
| `GET /api/state?rev=` | – | Zustand bzw. `{unchanged:true}` |
| `POST /api/players`, `PUT /api/players/:id` | – | Spieler erfassen/ändern; `PUT` mit `{flightId}` teilt einem Flight zu (`null` = spielt heute nicht) |
| `DELETE /api/players/:id` | ✔ | Spieler löschen |
| `POST /api/flights`, `PUT`/`DELETE /api/flights/:id` | – | Flights |
| `POST /api/flights/randomize` | – | Flights auslosen |
| `PUT /api/scores` | – | Scores gebündelt eintragen |
| `GET /api/rounds`, `GET /api/rounds/:id` | – | gespeicherte Runden |
| `POST /api/rounds` | ✔ | Runde abschliessen |
| `DELETE /api/rounds/:id` | ✔ | Runde löschen |
| `POST /api/events`, `PUT`/`DELETE /api/events/:id` | ✔ | Termine pflegen |
| `POST /api/unlock` | – | PIN prüfen |
| `GET /api/backup` | ✔ | vollständiger Zustand als Datei |
| `POST /api/restore` | ✔ | Zustand aus Backup ersetzen |
| `POST /api/reset` | ✔ | Scores der laufenden Runde löschen |

Die PIN wird bei geschützten Aktionen im Header `x-fta-pin` mitgeschickt.
