# 🌍 Hosting-Anleitung: Die App für alle erreichbar machen

Damit alle Flights auf dem Platz vom Handy aus eintragen können, muss die App
im Internet laufen. GitHub selbst kann nur statische Seiten hosten (GitHub
Pages) – unsere App braucht aber einen kleinen Server für die gemeinsame
Rangliste. Die Lösung: **Render.com hostet die App gratis, direkt verbunden
mit diesem GitHub-Repo.** Einrichtung dauert ca. 5 Minuten und muss nur einmal
gemacht werden.

## Schritt für Schritt (einmalig)

1. **Konto erstellen:** Auf <https://render.com> gehen und **«Sign in with
   GitHub»** wählen. Damit ist Render direkt mit deinem GitHub-Konto verbunden
   – kein separates Passwort nötig.

2. **Neuen Dienst anlegen:** Im Render-Dashboard oben auf **«New +» →
   «Web Service»** klicken.

3. **Repo auswählen:** In der Liste das Repository **`Fore-the-animals`**
   auswählen (beim ersten Mal fragt GitHub, welchen Repos Render zugreifen
   darf – dieses Repo freigeben). 

4. **Einstellungen prüfen:** Dank der Datei `render.yaml` im Repo ist fast
   alles vorausgefüllt. Kontrollieren:
   - **Branch:** `main` (oder der Branch, auf dem die App liegt)
   - **Build Command:** leer lassen
   - **Start Command:** `node server.js`
   - **Instance Type / Plan:** **Free**

5. **«Create Web Service»** klicken. Render baut und startet die App – nach
   ca. 1 Minute erscheint oben die öffentliche Adresse, z.B.:

   > `https://fore-the-animals.onrender.com`

6. **URL an die Gruppe schicken** (WhatsApp o.ä.). Fertig! Alle öffnen die
   Seite auf dem Handy – Spieler erfassen, Flights bilden, lospielen. 🦓

Bei jedem Push auf GitHub aktualisiert Render die Seite automatisch neu.

## Wichtig zu wissen: Daten dauerhaft speichern (Persistent Disk)

**Ohne extra Disk verliert Render die Daten – auch auf dem bezahlten
Starter-Plan!** Das Dateisystem des Dienstes ist flüchtig: Bei jedem Deploy
(jeder Push auf den verbundenen Branch), bei jedem Neustart und auf dem
Free-Plan zusätzlich bei jedem Aufwachen aus dem Standby startet ein frischer
Container – die `data.json` mit allen Spielern und Scores ist dann weg.

So werden die Daten dauerhaft (einmalig, braucht Starter-Plan oder höher):

1. Im Render-Dashboard den Dienst öffnen → Menüpunkt **«Disks»** →
   **«Add Disk»**.
2. Einstellungen: Name z.B. `fta-data`, **Mount Path:** `/var/data`,
   **Size:** 1 GB (kleinste Grösse, kostet ca. $0.25/Monat).
3. Unter **«Environment» → «Add Environment Variable»** die Variable
   `DATA_DIR` mit dem Wert `/var/data` anlegen und speichern.
4. Render startet den Dienst neu – ab jetzt liegt die `data.json` auf der
   Disk und überlebt Deploys und Neustarts. ✅

Danach einmal kontrollieren: Spieler erfassen, im Dashboard **«Manual Deploy»**
auslösen – die Spieler müssen nach dem Deploy noch da sein.

Weitere Hinweise:

- **Free-Plan:** Legt sich nach ca. 15 Minuten ohne Zugriffe schlafen
  (erster Aufruf danach dauert ~30–60 Sekunden) und unterstützt keine Disks.
  Der Starter-Plan läuft dauerhaft.
- **Sicherheitsnetz:** Im Rangliste-Tab gibt es «Backup herunterladen» /
  «Backup wiederherstellen» – nach jedem Turnier ein Backup ziehen schadet nie.
  Zusätzlich legt der Server einmal pro Tag automatisch eine datierte Kopie
  der `data.json` im Ordner `backups/` auf der Disk ab (die letzten 14 bleiben
  erhalten), und Render erstellt alle 24 h einen Disk-Snapshot. Sollte die
  `data.json` je defekt sein, überschreibt der Server sie nicht, sondern legt
  sie als `data.json.corrupt-…` beiseite und startet aus dem jüngsten Backup.
- **Deploy mitten im Turnier:** Der Server schreibt beim Herunterfahren
  (`SIGTERM`) den letzten Stand noch auf die Disk – ein Deploy während der
  Runde kostet keine Eingaben.
- **Zugriff:** Die URL ist öffentlich, aber nicht auffindbar – nur wer den
  Link hat, findet die Seite.
- **Neue App-Version:** Nach einem Deploy zeigt die geöffnete App einen
  Hinweis «Neue Version – zum Neuladen tippen». Niemand muss den Cache leeren.

## Rangliste & Preisverleihung: PIN

Die Rangliste ist während der Runde gesperrt. Wer die PIN eingibt, **sieht** die
Rangliste – mehr passiert dabei nicht: Es wird nichts gespeichert und nichts
gelöscht. Ein neugieriger Blick zwischendurch ist damit gefahrlos.

Der Ablauf am Turnierabend:

1. PIN eingeben → Rangliste erscheint.
2. Knopf **«🎉 Preisverleihung»** → Vollbild-Show mit Platz 3, 2, Tierpreis und
   Sieger.
3. Knopf **«Runde abschliessen»** → die Runde wandert mit ihrer
   Schlussrangliste ins Archiv, die Scores werden für die nächste Runde
   geleert. Vorher zeigt eine Rückfrage, wie viele Spieler gewertet werden und
   ob jemand noch nicht alle 9 Löcher eingetragen hat.

- **Standard-PIN:** `1234`
- **Eigene PIN setzen:** Im Render-Dashboard beim Dienst unter
  **Environment → Add Environment Variable** die Variable `LEADERBOARD_PIN`
  mit dem gewünschten Wert anlegen und speichern (Render startet den Dienst
  danach automatisch neu).

Die gleiche PIN schützt auch die heiklen Aktionen: Spieler oder gespeicherte
Runden löschen, laufende Runde zurücksetzen, Backup einspielen, Runde
abschliessen und Termine bearbeiten. Nach zu vielen Fehlversuchen bremst der
Server das Durchprobieren aus.

Die Sperre ist ein einfacher Schutz gegen neugierige Blicke während der Runde –
kein Hochsicherheits-Login. Für ein Spassturnier reicht das.

## Zum Handy-Startbildschirm hinzufügen (optional)

Fühlt sich wie eine App an:

- **iPhone:** Seite in Safari öffnen → Teilen-Symbol → «Zum Home-Bildschirm».
- **Android:** Seite in Chrome öffnen → Menü (⋮) → «Zum Startbildschirm
  hinzufügen».

## Alternative: GitHub Pages

Echtes Hosting auf `github.io` ginge nur mit einem Umbau: statische Seite plus
externe Gratis-Datenbank (z.B. Google Firebase) für die gemeinsamen Scores.
Das braucht ein zusätzliches Google-Konto und mehr Konfiguration – unterm
Strich aufwändiger als die Render-Lösung oben. Bei Bedarf lässt sich die App
entsprechend umbauen.
