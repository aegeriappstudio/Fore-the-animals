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

## Starten

Es wird nur Node.js (≥ 18) benötigt, keine weiteren Abhängigkeiten:

```bash
node server.js
```

Danach im Browser öffnen: <http://localhost:3000>

Der Port kann mit der Umgebungsvariable `PORT` geändert werden.
Alle Turnierdaten werden in `data.json` gespeichert (wird automatisch erstellt).

## Am Turniertag (mehrere Flights gleichzeitig)

Damit alle Spieler auf dem Platz vom Handy aus eintragen können, muss die App
im Internet erreichbar sein. **👉 Schritt-für-Schritt-Anleitung: [HOSTING.md](HOSTING.md)**
(gratis über Render.com, direkt mit diesem GitHub-Repo verbunden – die
`render.yaml` im Repo konfiguriert alles automatisch).

Alternativen: Railway.app / Fly.io (Start: `node server.js`) oder ein Laptop im
gleichen WLAN (`node server.js` starten und die lokale IP teilen, z.B.
`http://192.168.1.20:3000`).

## Bedienung

1. **👥 Spieler** – alle Spieler mit Name und Handicap erfassen; das Ziel
   (36 + HCP/2, aufgerundet) wird automatisch berechnet. Flights erstellen und
   Spieler per Tipp auf den Namen zuteilen.
2. **⛳ Eintragen** – jeder Flight wählt sich selbst aus, wählt das Loch und
   trägt pro Spieler Bruttoschläge und Tiere ein. Mehrere Flights können
   gleichzeitig eintragen.
3. **🏆 Rangliste** – live: Hauptwertung (Punkte) und zweiter Preis (meiste
   Tiere). Für noch nicht gespielte Löcher wird Par angenommen (Prognose).
   Ein Tipp auf einen Spieler zeigt seine Scorekarte Loch für Loch.

### Weitere Funktionen

- **🎉 Preisverleihung** – Vollbild-Show mit Platz 3 → 2 → Tierpreis → Sieger
  (mit Konfetti), ideal für den Apéro.
- **📸 Als Bild teilen** – erzeugt die Rangliste als Bild für die
  WhatsApp-Gruppe (Teilen-Dialog oder Download).
- **📶 Offline-tolerant** – bei Funklöchern auf dem Platz werden Einträge lokal
  gepuffert und automatisch nachgesendet, sobald wieder Netz da ist.
- **💾 Runden-Archiv** – Runden abschliessen und speichern, inkl. ewiger
  Bestenliste über alle Runden sowie Backup-Download/-Restore.
- **📱 PWA** – «Zum Home-Bildschirm hinzufügen» installiert die App mit eigenem
  Icon und ohne Browser-Leiste.

## Technik

- `server.js` – kleiner HTTP-Server (nur Node-Standardbibliothek) mit JSON-API
  und Datei-Persistenz (`data.json`).
- `public/` – Mobile-first Single-Page-Frontend (Vanilla HTML/CSS/JS), das den
  Server alle 5 Sekunden abfragt.
