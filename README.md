# 🦓 Fore the Animals!

**Golf Safari · Golfpark Holzhäusern · Rigi (9 Loch, Par 36) & Zugersee (18 Loch, Par 72)**

Turnier-Webseite für das Spassturnier «Beat Your Target» mit Tier-Bonuspunkten.
Mehrere Flights können gleichzeitig von ihren Handys aus Scores eintragen –
die Rangliste aktualisiert sich live.

## Spielregeln

Wir spielen **Beat Your Target** als Einzelwettbewerb.

**🎯 Ziel:** Par 36 + halbes Handicap, kaufmännisch gerundet.

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

### Zwei Plätze

Die App kennt beide Plätze des Golfparks Holzhäusern und rechnet je nach
Platz richtig:

| Platz | Löcher | Par | Ziel | Abschläge |
|---|---|---|---|---|
| **Rigi** | 9 | 36 | Par + **halbes** HCP | 27 |
| **Zugersee** | 18 | 72 | Par + **ganzes** HCP | 58 · 56 · 51 · 49 |

Der Platz wird im Turnier-Tab gewählt (PIN nötig) und gilt für die laufende
Runde; gewechselt werden kann nur, solange noch keine Scores eingetragen
sind. Jede gespeicherte Runde merkt sich ihren Platz und wird auch später
mit ihm ausgewertet – Scorekarten alter Zugersee-Runden zeigen also 18
Löcher, egal welcher Platz gerade aktiv ist. Der angezeigte Abschlag (Tee)
für die Distanzen ist pro Gerät wählbar.

### Fairness-Regeln, die die App überall gleich handhabt

- **Vorgabeschläge nach Stroke-Index.** Die Spielvorgabe (Ziel − Par) wird wie
  im offiziellen Handicap-System auf die Löcher verteilt: Schlag 1 aufs
  schwerste Loch (Index 1), Schlag 10 wieder aufs schwerste usw. Die
  Scorekarte zeigt die Vorgabe pro Loch als Punkte (`•`).
- **Offene Löcher zählen als Netto-Par** (Par + Vorgabeschläge) – exakt
  punkteneutral. Abbrechen bringt weder Vor- noch Nachteil, und Flights auf
  verschiedenen Löchern sind live fair vergleichbar. Nicht fertige Spieler
  sind mit `*` markiert. (Reines Par wäre ein *gutes* Resultat: ein HCP 30,
  der nach einem Loch aufhörte, hätte +13 Punkte geerbt.)
- **Pro Loch zählt höchstens Netto-Doppelbogey** (Par + 2 + Vorgabeschläge,
  WHS-Standard) – ein Katastrophen-Loch ruiniert die Runde nicht. Eingetragen
  wird die echte Schlagzahl, gewertet der Deckel; die Scorekarte markiert
  solche Löcher.
- **Gleichstand** wird der Reihe nach entschieden über: mehr positive Tiere,
  weniger negative Tiere, dann Countback wie im Golf üblich (letzte 6 Löcher,
  letzte 3, letztes Loch – netto). Bleibt es exakt gleich, teilen sich beide
  den Rang.

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
   werden mit der PIN gepflegt. Durchgeführte und vergangene Termine wandern
   zuunterst in einen zugeklappten Block «🗂️ Vergangene Termine».
2. **🏌️ Turnier** – die eine Ansicht für den Turniertag: Spieler erfassen
   (Name/HCP, das Ziel wird automatisch berechnet) und mit ✅/💤 markieren,
   wer heute dabei ist (neue Spieler sind automatisch dabei). Die Flights
   entstehen per **«🎲 Auslosen»** aus den Anwesenden – danach lassen sich
   einzelne Spieler per Tipp in den Flight-Karten verschieben (✕ nimmt raus,
   «+ Name» holt rein). Wer sich abmeldet, fliegt automatisch aus seinem
   Flight; bereits eingetragene Scores bleiben. Jeder Flight zeigt seinen
   Fortschritt (bei welchem Loch, wie viele fertig).
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
  Status) direkt in der App erfassen und bearbeiten, ohne Deploy. Beim
  Abschliessen einer Runde lässt sie sich mit einem Termin verknüpfen (der
  heutige ist vorgewählt und liefert den Rundennamen gleich mit): die
  Termin-Karte zeigt danach «🏁 Gespielt» mit Sieger und springt per Tipp
  direkt zur gespeicherten Rangliste.
- **🗄️ Tages-Backups** – der Server legt automatisch einmal pro Tag eine
  datierte Kopie der `data.json` unter `backups/` ab (die letzten 14 bleiben).
  Ist die `data.json` einmal defekt, wird sie beiseitegelegt (nicht
  überschrieben) und aus dem jüngsten Backup weitergearbeitet.
- **🎉 Preisverleihung** – Vollbild-Show mit Platz 3 → 2 → Tierpreis → Sieger
  (mit Konfetti), ideal für den Apéro.
- **📸 Als Bild teilen** – erzeugt die Rangliste als Bild für die
  WhatsApp-Gruppe (Teilen-Dialog oder Download): Podest für die Top 3
  (Gleichstände teilen sich einen Block), kompakte Liste ab Platz 4,
  Tierpreis-Band und der Name der Runde im Kopf.
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
