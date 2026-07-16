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

## Wichtig zu wissen (Gratis-Plan)

- **Aufwachzeit:** Nach ca. 15 Minuten ohne Zugriffe legt sich der Dienst
  schlafen. Der erste Aufruf danach dauert dann ~30–60 Sekunden. 
  **Tipp für den Turniertag:** 10 Minuten vor Start einmal die Seite öffnen –
  solange regelmässig eingetragen wird, bleibt sie wach.
- **Daten:** Die Scores liegen in einer Datei auf dem Server. Sie überleben
  das «Einschlafen», gehen aber verloren, wenn Render den Dienst neu aufsetzt
  (z.B. bei einem neuen Deploy während des Turniers). Deshalb: **am
  Turniertag nichts auf GitHub pushen.** Für ein Tagesturnier reicht das
  völlig; wer es dauerhaft sicher will, nimmt den bezahlten Plan mit
  persistentem Volume und setzt die Umgebungsvariable `DATA_DIR` auf dessen
  Pfad.
- **Zugriff:** Die URL ist öffentlich, aber nicht auffindbar – nur wer den
  Link hat, findet die Seite.

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
