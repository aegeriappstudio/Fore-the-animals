/* Fore the Animals! – Texte (Deutsch / Englisch) */
'use strict';

window.I18N = (function () {
  var STRINGS = {
    // ---------------- Tabs ----------------
    tab_info: { de: '📖 Info', en: '📖 Info' },
    tab_tournament: { de: '🏌️ Turnier', en: '🏌️ Tournament' },
    tab_entry: { de: '⛳ Eintragen', en: '⛳ Score entry' },
    tab_leaderboard: { de: '🏆 Rangliste', en: '🏆 Leaderboard' },

    // ---------------- Termine ----------------
    d_title: { de: 'Termine & Turniere', en: 'Dates & tournaments' },
    d_intro: {
      de: 'Die nächsten fixen und geplanten Turnier-Termine der Golf Safari.',
      en: 'The next confirmed and planned tournament dates of the Golf Safari.',
    },
    d_lbl_date: { de: 'Datum', en: 'Date' },
    d_lbl_flights: { de: 'Flights', en: 'Tee times' },
    d_lbl_dinner: { de: 'Dinner', en: 'Dinner' },
    d_badge_confirmed: { de: '✅ Bestätigt', en: '✅ Confirmed' },
    d_badge_tentative: { de: '⏳ Vorläufig', en: '⏳ Tentative' },
    d_badge_played: { de: '🏁 Gespielt', en: '🏁 Played' },
    ev_round_played: { de: 'Sieger: {winners} · Rangliste ansehen', en: 'Winner: {winners} · view leaderboard' },
    ev_none: { de: 'Noch keine Termine erfasst.', en: 'No dates yet.' },
    ev_past_title: { de: '🗂️ Vergangene Termine ({n})', en: '🗂️ Past dates ({n})' },
    ev_admin_title: { de: '✏️ Termin erfassen / bearbeiten', en: '✏️ Add / edit date' },
    ev_ph_name: { de: 'Name (z.B. Fore the Animals #3)', en: 'Name (e.g. Fore the Animals #3)' },
    ev_ph_flights: { de: 'Flights (z.B. 18:30 & 18:40 Uhr)', en: 'Tee times (e.g. 18:30 & 18:40)' },
    ev_ph_dinner: { de: 'Dinner (z.B. Albergo)', en: 'Dinner (e.g. Albergo)' },
    ev_ph_note: { de: 'Notiz (optional)', en: 'Note (optional)' },
    ev_confirmed: { de: '✅ Termin ist bestätigt', en: '✅ Date is confirmed' },
    ev_save: { de: '💾 Termin speichern', en: '💾 Save date' },
    ev_cancel: { de: 'Abbrechen', en: 'Cancel' },
    ev_saved: { de: 'Termin «{name}» gespeichert 📅', en: 'Date “{name}” saved 📅' },
    ev_deleted: { de: 'Termin gelöscht', en: 'Date deleted' },
    ev_confirm_del: { de: 'Termin «{name}» löschen?', en: 'Delete date “{name}”?' },
    ev_missing: { de: 'Name und Datum angeben', en: 'Enter name and date' },
    ev_pin_hint: {
      de: 'Zum Speichern oder Löschen von Terminen wird die PIN benötigt.',
      en: 'The PIN is required to save or delete dates.',
    },

    // ---------------- Dialoge ----------------
    dlg_ok: { de: 'OK', en: 'OK' },
    dlg_cancel: { de: 'Abbrechen', en: 'Cancel' },
    dlg_delete: { de: 'Löschen', en: 'Delete' },
    dlg_save: { de: 'Speichern', en: 'Save' },
    dlg_continue: { de: 'Trotzdem weiter', en: 'Continue anyway' },
    dlg_confirm_title: { de: 'Bist du sicher?', en: 'Are you sure?' },

    // ---------------- PIN ----------------
    pin_prompt: { de: '🔐 PIN eingeben', en: '🔐 Enter PIN' },
    pin_unlock: { de: 'Entsperren', en: 'Unlock' },
    pin_denied: { de: 'PIN erforderlich – bitte erneut versuchen', en: 'PIN required – please try again' },

    // ---------------- Regeln ----------------
    r_how_title: { de: 'So wird gespielt', en: 'How to play' },
    r_how_p1: {
      de: 'Wir spielen <strong>Beat Your Target</strong> als Einzelwettbewerb.',
      en: 'We play <strong>Beat Your Target</strong> as an individual competition.',
    },
    r_how_target: {
      de: '🎯 Dein Ziel: <strong>Par 36 + halbes Handicap</strong>, kaufmännisch gerundet.',
      en: '🎯 Your target: <strong>Par 36 + half your handicap</strong>, rounded to the nearest whole number.',
    },
    r_how_example: {
      de: 'Beispiel: HCP 15 → Ziel = 36 + 8 = <strong>44</strong>',
      en: 'Example: HCP 15 → target = 36 + 8 = <strong>44</strong>',
    },
    r_animals_title: { de: 'Die Tiere', en: 'The animals' },
    r_pos: { de: 'Positiv (+1 Punkt):', en: 'Positive (+1 point):' },
    r_neg: { de: 'Negativ (−1 Punkt):', en: 'Negative (−1 point):' },
    r_zebra: {
      de: '🦓 <strong>Zebra</strong> – Fairway getroffen (nur Par 4 / Par 5)',
      en: '🦓 <strong>Zebra</strong> – fairway hit (Par 4 / Par 5 only)',
    },
    r_giraffe: { de: '🦒 <strong>Giraffe</strong> – Grün in Regulation', en: '🦒 <strong>Giraffe</strong> – green in regulation' },
    r_rabbit: { de: '🐇 <strong>Rabbit</strong> – Ein Putt oder eingechippt', en: '🐇 <strong>Rabbit</strong> – one putt or chip-in' },
    r_scorpion: { de: '🦂 <strong>Scorpion</strong> – Ball im Bunker', en: '🦂 <strong>Scorpion</strong> – ball finishes in a bunker' },
    r_crocodile: { de: '🐊 <strong>Crocodile</strong> – Ball im Wasser / Penalty Area', en: '🐊 <strong>Crocodile</strong> – ball enters water / penalty area' },
    r_snake: { de: '🐍 <strong>Snake</strong> – Drei Putts oder mehr', en: '🐍 <strong>Snake</strong> – three putts or more' },
    r_once: {
      de: 'Auf demselben Loch können mehrere Tiere gesammelt werden. Jedes Tier zählt pro Loch nur einmal.',
      en: 'Different animals can be collected on the same hole. Each animal counts only once per hole.',
    },
    r_final_title: { de: 'Schlussresultat', en: 'Final score' },
    r_final_p: {
      de: '<strong>Punkte = Ziel − Brutto + positive Tiere − negative Tiere.</strong>',
      en: '<strong>Score = target − gross score + positive animals − negative animals.</strong>',
    },
    r_final_win: { de: 'Die höchste Punktzahl gewinnt. 🥇', en: 'Highest score wins. 🥇' },
    r_final_second: { de: 'Zweiter Preis: 🥈 die meisten gesammelten Tiere insgesamt.', en: 'Second prize: 🥈 most animals collected in total.' },
    r_open_holes: {
      de: 'Für Löcher ohne eingetragenes Brutto wird <strong>Netto-Par</strong> gerechnet (Par + Vorgabeschläge) – ein offenes Loch bringt weder Vor- noch Nachteil. Solche Spieler sind mit einem <strong>*</strong> markiert.',
      en: 'Holes without a gross score count as <strong>net par</strong> (par + handicap strokes) – an open hole is neither an advantage nor a penalty. Those players are marked with a <strong>*</strong>.',
    },
    r_cap: {
      de: 'Pro Loch zählt höchstens <strong>Netto-Doppelbogey</strong> (Par + 2 + Vorgabeschläge) – ein Katastrophen-Loch ruiniert die Runde nicht. Die Vorgabeschläge werden nach Stroke-Index verteilt.',
      en: 'Each hole counts at most <strong>net double bogey</strong> (par + 2 + handicap strokes) – one disaster hole cannot ruin the round. Handicap strokes are allocated by stroke index.',
    },
    r_tiebreak: {
      de: 'Gleichstand: mehr positive Tiere, dann weniger negative Tiere, dann Countback (letzte 6 · letzte 3 · letztes Loch, netto).',
      en: 'Tie-break: more positive animals, then fewer negative animals, then countback (last 6 · last 3 · last hole, net).',
    },
    r_course_title: { de: 'Der Platz – Tee 27', en: 'The course – Tee 27' },
    r_course_hint: { de: 'Distanz in Meter bis Mitte Grün.', en: 'Distance in metres to the middle of the green.' },
    c_hole: { de: 'Loch', en: 'Hole' },
    c_par: { de: 'Par', en: 'Par' },
    c_meters: { de: 'Meter', en: 'Metres' },
    c_index: { de: 'Index', en: 'Index' },
    c_total: { de: 'Total', en: 'Total' },

    // ---------------- Turnier: Spieler & Flights ----------------
    tn_title: { de: 'Wer spielt heute?', en: 'Who is playing today?' },
    tn_hint: {
      de: 'Markiere mit ✅/💤, wer heute dabei ist, und lose danach die Flights aus. Einzelne Spieler lassen sich nachträglich per Tipp in den Flight-Karten verschieben.',
      en: 'Use ✅/💤 to mark who is in today, then draw the flights. Individual players can be moved afterwards by tapping in the flight cards.',
    },
    tn_summary: { de: '⛳ {n} von {m} Spielern dabei · {f} Flights', en: '⛳ {n} of {m} players in · {f} flights' },
    tn_nobody: { de: 'Noch niemand dabei – markiere die Spieler, die heute spielen.', en: 'Nobody marked as in yet – mark the players playing today.' },
    tn_here: { de: 'dabei', en: 'in' },
    tn_away: { de: 'nicht dabei', en: 'out' },
    tn_now_here: { de: '{name} ist dabei ✅', en: '{name} is in ✅' },
    tn_now_away: { de: '{name} ist heute nicht dabei 💤', en: '{name} is out today 💤' },
    ph_name: { de: 'Name', en: 'Name' },
    ph_hcp: { de: 'HCP', en: 'HCP' },
    p_add: { de: 'Hinzufügen', en: 'Add' },
    p_persist_hint: {
      de: 'Spieler nur einmal erfassen – sie bleiben über alle Runden gespeichert. Vor jeder Runde nur noch das Handicap anpassen.',
      en: 'Add each player only once – they stay saved across all rounds. Before each round just adjust the handicap.',
    },
    p_dup_name: { de: '«{name}» gibt es schon – trotzdem anlegen?', en: '“{name}” already exists – add anyway?' },
    p_rename: { de: 'Name ändern', en: 'Rename' },
    p_hcp_saved: { de: 'HCP von {name} aktualisiert → {hcp}', en: 'HCP for {name} updated → {hcp}' },
    p_none: { de: 'Noch keine Spieler erfasst.', en: 'No players yet.' },
    p_target: { de: 'Ziel', en: 'Target' },
    p_added: { de: '{name} hinzugefügt 🎉', en: '{name} added 🎉' },
    p_prompt_name: { de: '✏️ Name ändern', en: '✏️ Rename' },
    p_confirm_del: {
      de: '{name} wirklich löschen?\nDie Scores der laufenden Runde gehen verloren, gespeicherte Runden bleiben erhalten.',
      en: 'Really delete {name}?\nScores of the current round will be lost, saved rounds are kept.',
    },

    // ---------------- Flights ----------------
    p_flights: { de: 'Flights', en: 'Flights' },
    ph_flight: { de: '✏️ Flight-Name', en: '✏️ Flight name' },
    p_create_flight: { de: 'Flight erstellen', en: 'Create flight' },
    f_add: { de: '＋ Flight', en: '＋ Flight' },
    f_created: { de: '{name} erstellt', en: '{name} created' },
    f_empty: { de: 'Noch niemand zugeteilt', en: 'Nobody assigned yet' },
    f_progress: { de: '{n}/{m} Löcher', en: '{n}/{m} holes' },
    f_not_started: { de: 'noch nicht gestartet', en: 'not started' },
    f_done: { de: '✅ fertig', en: '✅ done' },
    f_at_hole: { de: 'bei Loch {h}', en: 'on hole {h}' },
    f_tee: { de: 'Abschlag', en: 'Tee time' },
    f_tee_saved: { de: 'Abschlagszeit von «{name}» gespeichert 🕐', en: 'Tee time for “{name}” saved 🕐' },
    f_none: { de: 'Noch keine Flights erstellt.', en: 'No flights yet.' },
    f_count: { de: '({n} Spieler)', en: '({n} players)' },
    f_confirm_del: {
      de: 'Flight «{name}» löschen? (Spieler und Scores bleiben erhalten)',
      en: 'Delete flight “{name}”? (Players and scores are kept)',
    },
    p_randomize: { de: '🎲 Flights zufällig auslosen', en: '🎲 Draw random flights' },
    fr_first: { de: 'Zuerst Spieler erfassen', en: 'Add players first' },
    fr_need_present: { de: 'Mindestens 2 anwesende Spieler nötig', en: 'At least 2 players marked as in required' },
    fr_title: { de: '🎲 Flights auslosen', en: '🎲 Draw flights' },
    fr_text_present: {
      de: 'Die {n} anwesenden Spieler werden zufällig auf Flights verteilt.\nWie viele Spieler pro Flight?',
      en: 'The {n} players marked as in will be randomly distributed into flights.\nHow many players per flight?',
    },
    fr_text_redraw: {
      de: 'Die bestehenden Flights werden ersetzt: die {n} anwesenden Spieler werden neu ausgelost.\nWie viele Spieler pro Flight?',
      en: 'The existing flights will be replaced: the {n} players marked as in are redrawn.\nHow many players per flight?',
    },
    fr_done: { de: 'Flights zufällig ausgelost 🎲', en: 'Random flights drawn 🎲' },

    // ---------------- Eintragen ----------------
    e_flight: { de: 'Flight', en: 'Flight' },
    e_hole: { de: 'Loch', en: 'Hole' },
    e_select_first: { de: '– zuerst Flight erstellen –', en: '– create a flight first –' },
    e_hole_info: { de: 'Loch {h} · Par {p} · {d} m · Index {i}', en: 'Hole {h} · Par {p} · {d} m · Index {i}' },
    e_no_zebra: { de: ' · 🦓 Zebra nicht möglich (Par 3)', en: ' · 🦓 no Zebra possible (Par 3)' },
    e_no_players: {
      de: 'Diesem Flight sind noch keine Spieler zugeteilt.<br>🏌️ Unter «Flights» Spieler zuteilen.',
      en: 'No players assigned to this flight yet.<br>🏌️ Go to “Flights” to assign players.',
    },
    e_running: { de: 'Ziel {t} · Brutto {g} nach {n} Löchern', en: 'Target {t} · gross {g} after {n} holes' },
    e_gross: { de: 'Brutto:', en: 'Gross:' },
    e_clear: { de: 'Eintrag löschen', en: 'Clear entry' },
    e_more: { de: 'Höher', en: 'Higher' },
    e_card: { de: '🧾 Karte', en: '🧾 Card' },
    e_flight_card: { de: '🧾 Flight-Karte', en: '🧾 Flight card' },
    e_par_n: { de: 'Par {p}', en: 'Par {p}' },
    e_next: { de: '✅ Loch {h} fertig – weiter zu Loch {n}', en: '✅ Hole {h} done – on to hole {n}' },
    e_next_last: { de: '✅ Loch 9 fertig – zur Rangliste 🏆', en: '✅ Hole 9 done – to the leaderboard 🏆' },
    e_missing: { de: 'Noch kein Brutto-Score für: {names}.\nTrotzdem weiter?', en: 'No gross score yet for: {names}.\nContinue anyway?' },
    e_good_luck: { de: 'Loch {h} – gutes Gelingen! ⛳', en: 'Hole {h} – good luck! ⛳' },

    // ---------------- Rangliste ----------------
    lb_title: { de: '🥇 Rangliste – Beat Your Target', en: '🥇 Leaderboard – Beat Your Target' },
    lb_round_label: { de: 'Runde', en: 'Round' },
    lb_live: { de: 'Laufende Runde', en: 'Current round' },
    lb_live_status: { de: '🔴 Live · {n} von {m} Spielern durch · aktualisiert {time}', en: '🔴 Live · {n} of {m} players through · updated {time}' },
    lb_saved_status: { de: '🏁 Gespeichert am {date}', en: '🏁 Saved on {date}' },
    lb_no_round: {
      de: 'Keine laufende Runde – es sind noch keine Scores eingetragen.',
      en: 'No round in progress – no scores entered yet.',
    },
    lb_hint: {
      de: 'Punkte = Ziel − gewertetes Brutto + positive Tiere − negative Tiere (pro Loch max. Netto-Doppelbogey). <strong>*</strong> = noch nicht alle 9 Löcher eingetragen, offene Löcher zählen als Netto-Par (punkteneutral). Tipp auf einen Spieler zeigt die Scorekarte.',
      en: 'Score = target − counted gross + positive animals − negative animals (net double bogey max per hole). <strong>*</strong> = not all 9 holes entered, open holes count as net par (neutral). Tap a player for the scorecard.',
    },
    lb_ceremony: { de: '🎉 Preisverleihung', en: '🎉 Prize ceremony' },
    lb_share: { de: '📸 Als Bild teilen', en: '📸 Share as image' },
    lb_second_title: { de: '🥈 Zweiter Preis – Meiste Tiere', en: '🥈 Second prize – Most animals' },
    lb_no_players: { de: 'Noch keine Spieler.', en: 'No players yet.' },
    lb_loading: { de: 'Runde wird geladen …', en: 'Loading round …' },
    h_rank: { de: 'Rang', en: 'Rank' },
    h_player: { de: 'Spieler', en: 'Player' },
    h_target: { de: 'Ziel', en: 'Target' },
    h_thru: { de: 'Loch', en: 'Thru' },
    h_gross: { de: 'Brutto', en: 'Gross' },
    h_pos: { de: '➕ Tiere', en: '➕ Animals' },
    h_neg: { de: '➖ Tiere', en: '➖ Animals' },
    h_points: { de: 'Punkte', en: 'Points' },
    h_total: { de: 'Total', en: 'Total' },
    h_rounds: { de: 'Runden', en: 'Rounds' },
    h_wins: { de: '🏆 Siege', en: '🏆 Wins' },
    h_animals: { de: '🐾 Tiere', en: '🐾 Animals' },
    h_best: { de: 'Bestes', en: 'Best' },
    h_avg: { de: 'Ø Punkte', en: 'Ø points' },
    row_meta: { de: 'HCP {hcp} · Ziel {target} · Brutto {gross} · ➕{pos} ➖{neg}', en: 'HCP {hcp} · target {target} · gross {gross} · ➕{pos} ➖{neg}' },

    // ---------------- PIN-Sperre ----------------
    lk_title: { de: 'Rangliste gesperrt', en: 'Leaderboard locked' },
    lk_p: {
      de: 'Die Rangliste bleibt während der Runde geheim. Mit der PIN wird sie sichtbar – gespeichert oder geleert wird dabei nichts.',
      en: 'The leaderboard stays secret during the round. The PIN reveals it – nothing is saved or cleared in the process.',
    },
    lk_ph: { de: 'PIN', en: 'PIN' },
    lk_btn: { de: '🔓 Rangliste anzeigen', en: '🔓 Show leaderboard' },
    lk_wrong: { de: 'Falsche PIN', en: 'Wrong PIN' },
    lk_relock: { de: '🔒 Wieder sperren', en: '🔒 Lock again' },
    lk_locked: { de: 'Rangliste wieder gesperrt 🔒', en: 'Leaderboard locked again 🔒' },

    // ---------------- Runde speichern & Archiv ----------------
    sr_title: { de: '💾 Runde abschliessen &amp; speichern', en: '💾 Finish &amp; save round' },
    sr_p: {
      de: 'Legt die laufende Runde mit Schlussrangliste im Archiv ab und leert die Scores für die nächste Runde. Spieler und Flights bleiben erhalten.',
      en: 'Stores the current round with its final standings in the archive and clears the scores for the next round. Players and flights are kept.',
    },
    sr_btn: { de: 'Runde abschliessen', en: 'Finish round' },
    sr_prompt: { de: 'Name der Runde', en: 'Round name' },
    sr_event: { de: 'Termin', en: 'Date' },
    sr_no_event: { de: '– kein Termin –', en: '– no date –' },
    sr_default: { de: 'Runde vom {date}', en: 'Round of {date}' },
    sr_confirm: {
      de: '{players} Spieler werden gewertet.\nDanach sind die Scores geleert – die Runde liegt im Archiv.',
      en: '{players} players will be scored.\nAfterwards the scores are cleared – the round is in the archive.',
    },
    sr_confirm_open: {
      de: '{players} Spieler werden gewertet.\n⚠️ Noch nicht alle 9 Löcher eingetragen: {open} Spieler – offene Löcher zählen als Netto-Par.\nDanach sind die Scores geleert – die Runde liegt im Archiv.',
      en: '{players} players will be scored.\n⚠️ Not all 9 holes entered: {open} player(s) – open holes count as net par.\nAfterwards the scores are cleared – the round is in the archive.',
    },
    sr_nothing: { de: 'Keine Scores vorhanden – nichts zu speichern', en: 'No scores yet – nothing to save' },
    sr_saved: { de: '«{name}» gespeichert 💾', en: '“{name}” saved 💾' },
    ar_title: { de: '🗂️ Gespeicherte Runden', en: '🗂️ Saved rounds' },
    ar_none: { de: 'Noch keine gespeicherten Runden.', en: 'No saved rounds yet.' },
    ar_winner: { de: 'Sieger', en: 'Winner' },
    ar_players: { de: '{n} Spieler', en: '{n} players' },
    ar_delete: { de: '🗑️ Runde löschen', en: '🗑️ Delete round' },
    ar_confirm_del: { de: '«{name}» endgültig löschen?', en: 'Permanently delete “{name}”?' },
    ar_show: { de: 'In der Rangliste ansehen', en: 'Show on the leaderboard' },
    bk_down: { de: '⬇️ Backup herunterladen', en: '⬇️ Download backup' },
    bk_up: { de: '⬆️ Backup wiederherstellen', en: '⬆️ Restore backup' },
    bk_hint: {
      de: 'Das Backup enthält alle Spieler, Flights, Termine, Scores und gespeicherten Runden als Datei. Tipp: nach jedem Turnier herunterladen.',
      en: 'The backup file contains all players, flights, dates, scores and saved rounds. Tip: download it after every tournament.',
    },
    bk_done: { de: 'Backup heruntergeladen ⬇️', en: 'Backup downloaded ⬇️' },
    bk_invalid: { de: 'Datei ist kein gültiges Backup', en: 'File is not a valid backup' },
    bk_confirm: {
      de: 'Backup wiederherstellen?\nDer aktuelle Stand auf dem Server wird komplett ersetzt.',
      en: 'Restore this backup?\nThe current state on the server will be completely replaced.',
    },
    bk_restored: { de: 'Wiederhergestellt: {p} Spieler, {r} Runden ✅', en: 'Restored: {p} players, {r} rounds ✅' },
    at_title: { de: '🏅 Ewige Bestenliste', en: '🏅 All-time leaderboard' },
    at_hint: {
      de: 'Über alle gespeicherten Runden, pro Spieler zusammengefasst. Sortiert nach Siegen, dann Ø Punkte.',
      en: 'Across all saved rounds, grouped per player. Sorted by wins, then average points.',
    },
    dz_title: { de: '⚠️ Laufende Runde zurücksetzen', en: '⚠️ Reset current round' },
    dz_p: {
      de: 'Löscht alle Scores der laufenden Runde (Spieler, Flights und gespeicherte Runden bleiben erhalten).',
      en: 'Deletes all scores of the current round (players, flights and saved rounds are kept).',
    },
    dz_btn: { de: 'Scores der laufenden Runde löschen', en: 'Delete current round scores' },
    dz_prompt: {
      de: 'Wirklich ALLE Scores der laufenden Runde löschen?\nTippe RESET zum Bestätigen.',
      en: 'Really delete ALL scores of the current round?\nType RESET to confirm.',
    },
    dz_done: { de: 'Scores gelöscht', en: 'Scores deleted' },

    // ---------------- Scorekarte ----------------
    sc_par: { de: 'Par', en: 'Par' },
    sc_gross: { de: 'Brutto', en: 'Gross' },
    sc_animals: { de: 'Tiere', en: 'Animals' },
    sc_tot: { de: 'Tot', en: 'Tot' },
    sc_points: { de: 'Punkte', en: 'Points' },
    sc_legend: { de: '🟢 unter Par · ⚪ Par · 🟠 Bogey · 🔴 Doppelbogey+', en: '🟢 under par · ⚪ par · 🟠 bogey · 🔴 double bogey+' },
    sc_open: { de: '{n} Loch noch offen – gewertet als Netto-Par (punkteneutral).', en: '{n} hole(s) still open – counted as net par (neutral).' },
    sc_capped: {
      de: '{n} Loch über dem Deckel – gewertet als Netto-Doppelbogey (unterstrichen).',
      en: '{n} hole(s) above the cap – counted as net double bogey (underlined).',
    },
    sc_strokes: { de: 'Vorgabe', en: 'Strokes' },
    sc_flight_title: { de: '🧾 {name} – Karte', en: '🧾 {name} – card' },
    sc_hidden: {
      de: 'Punkte bleiben verborgen, solange die Rangliste gesperrt ist.',
      en: 'Points stay hidden while the leaderboard is locked.',
    },

    // ---------------- Preisverleihung ----------------
    cer_intro_title: { de: 'Preisverleihung', en: 'Prize ceremony' },
    cer_intro_sub: { de: '9-Hole Golf Safari', en: '9-Hole Golf Safari' },
    cer_p3: { de: '3. Platz', en: '3rd place' },
    cer_p2: { de: '2. Platz', en: '2nd place' },
    cer_second: { de: 'Zweiter Preis – meiste Tiere', en: 'Second prize – most animals' },
    cer_second_sub: { de: '{n} Tiere gesammelt', en: '{n} animals collected' },
    cer_win: { de: 'Und der Sieg geht an…', en: 'And the winner is…' },
    cer_pts: { de: '{pts} Punkte · Brutto {g}', en: '{pts} points · gross {g}' },
    cer_thanks: { de: 'Applaus!', en: 'Applause!' },
    cer_thanks_name: { de: 'Danke fürs Mitspielen', en: 'Thanks for playing' },
    cer_thanks_sub: { de: 'Tippen zum Schliessen', en: 'Tap to close' },
    cer_tap: { de: 'Tippen für weiter', en: 'Tap to continue' },
    cer_no_players: { de: 'Keine Resultate vorhanden', en: 'No results available' },

    // ---------------- Bild-Export ----------------
    img_subtitle: { de: '9-Hole Golf Safari · Rigi Holzhäusern', en: '9-Hole Golf Safari · Rigi Holzhäusern' },
    img_most_animals: { de: '🐾 Meiste Tiere: {name} ({n})', en: '🐾 Most animals: {name} ({n})' },
    img_downloaded: { de: 'Bild heruntergeladen 📸', en: 'Image downloaded 📸' },

    // ---------------- Verbindung ----------------
    off_banner: {
      de: '📶 Kein Empfang – {n} Einträge warten und werden automatisch nachgesendet',
      en: '📶 No signal – {n} entries queued, they will be sent automatically',
    },
    sync_saving: { de: '💾 {n} Einträge werden gesendet …', en: '💾 sending {n} entries …' },
    err_generic: { de: 'Etwas ist schiefgelaufen', en: 'Something went wrong' },
    sw_update: { de: '🔄 Neue Version – zum Neuladen tippen', en: '🔄 New version – tap to reload' },
  };

  var lang = localStorage.getItem('fta-lang') || 'de';

  function t(key, vars) {
    var entry = STRINGS[key];
    var s = (entry && entry[lang]) || (entry && entry.de) || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(vars[k]);
      });
    }
    return s;
  }

  function dateLocale() { return lang === 'de' ? 'de-CH' : 'en-GB'; }

  function setLang(next) {
    lang = next;
    localStorage.setItem('fta-lang', lang);
  }

  // Statische Texte im HTML übersetzen
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-label]').forEach(function (el) {
      // nur den ersten Textknoten ersetzen, Kind-Elemente (Select etc.) bleiben
      if (el.childNodes[0]) el.childNodes[0].textContent = t(el.dataset.i18nLabel);
    });
    var toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.textContent = lang === 'de' ? 'EN' : 'DE';
  }

  // Beschreibungen der Tiere (die Schlüssel kommen aus shared/model.js)
  var ANIMAL_DESC = {
    zebra: { de: 'Fairway getroffen', en: 'Fairway hit' },
    giraffe: { de: 'Grün in Regulation', en: 'Green in regulation' },
    rabbit: { de: 'Ein Putt / Chip-in', en: 'One putt / chip-in' },
    scorpion: { de: 'Ball im Bunker', en: 'Ball in a bunker' },
    crocodile: { de: 'Wasser / Penalty', en: 'Water / penalty' },
    snake: { de: '3 Putts oder mehr', en: '3 putts or more' },
  };

  function animalDesc(key) {
    var d = ANIMAL_DESC[key];
    return d ? (d[lang] || d.de) : '';
  }

  return {
    t: t,
    setLang: setLang,
    get lang() { return lang; },
    dateLocale: dateLocale,
    applyStatic: applyStatic,
    animalDesc: animalDesc,
  };
}());
