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
    r_how_flow: {
      de: 'Jeder spielt seine eigene Runde gegen sein persönliches Ziel: pro Loch werden die Bruttoschläge und die gesammelten Tiere eingetragen. Am Ende zählt, wie stark du dein Ziel geschlagen hast – dadurch sind alle Handicaps direkt vergleichbar.',
      en: 'Everyone plays their own round against their personal target: for each hole you enter the gross strokes and the animals collected. What counts in the end is how much you beat your target by – which makes all handicaps directly comparable.',
    },
    r_how_zero: {
      de: '🎯 <strong>0 Punkte heisst: genau auf deinem Handicap gespielt.</strong> Plus ist besser, Minus ist schlechter – egal ob HCP 4 oder HCP 36.',
      en: '🎯 <strong>0 points means: you played exactly to your handicap.</strong> Plus is better, minus is worse – whether you play off 4 or 36.',
    },

    // ---------------- Berechnungsgrundlagen ----------------
    rc_target_title: { de: 'Dein Ziel & deine Vorgabeschläge', en: 'Your target & your handicap strokes' },
    rc_target_p1: {
      de: '<strong>Ziel = Platz-Par + Handicap-Anteil</strong>, kaufmännisch gerundet (7,4 → 7 · 7,5 → 8): auf dem 9-Loch-Platz zählt das halbe Handicap, auf 18 Löchern das ganze. Das Ziel ist die Schlagzahl, mit der du genau auf 0 Punkte kommst.',
      en: '<strong>Target = course par + handicap share</strong>, rounded to the nearest whole number (7.4 → 7 · 7.5 → 8): half your handicap on the 9-hole course, your full handicap on 18 holes. The target is the score that puts you at exactly 0 points.',
    },
    rc_target_p2: {
      de: 'Beispiel HCP 15: Rigi (9 Loch, Par 36): 15 ÷ 2 = 7,5 → gerundet 8 → Ziel <strong>44</strong>. Zugersee (18 Loch, Par 72): Ziel = 72 + 15 = <strong>87</strong>. Die Differenz zum Par ist deine <strong>Spielvorgabe</strong>.',
      en: 'Example HCP 15: Rigi (9 holes, par 36): 15 ÷ 2 = 7.5 → rounded 8 → target <strong>44</strong>. Zugersee (18 holes, par 72): target = 72 + 15 = <strong>87</strong>. The difference to par is your <strong>playing handicap</strong>.',
    },
    rc_strokes_p: {
      de: 'Die Spielvorgabe wird als <strong>Vorgabeschläge</strong> auf die Löcher verteilt, wie im offiziellen Handicap-System nach Stroke-Index: Schlag 1 aufs schwerste Loch (Index 1), Schlag 2 aufs zweitschwerste … Schlag 10 wieder aufs schwerste. Bei einem Plus-Handicap wird ab dem leichtesten Loch abgezogen.',
      en: 'The playing handicap is distributed across the holes as <strong>handicap strokes</strong>, like in the official handicap system by stroke index: stroke 1 on the hardest hole (index 1), stroke 2 on the second hardest … stroke 10 on the hardest again. A plus handicap gives strokes back starting at the easiest hole.',
    },
    rc_calc_label: { de: 'Rechne es für dein Handicap nach:', en: 'Check it for your handicap:' },
    rc_calc_summary: { de: 'Ziel {target} · Spielvorgabe {ch}', en: 'Target {target} · playing handicap {ch}' },
    rc_row_max: { de: 'Max. zählt', en: 'Max counts' },
    rc_calc_hint: {
      de: '«Max. zählt» = Netto-Doppelbogey (Par + 2 + Vorgabeschläge): Eintragen kannst du mehr, gewertet wird höchstens diese Zahl.',
      en: '“Max counts” = net double bogey (par + 2 + handicap strokes): you can enter more, but at most this number is counted.',
    },
    rc_points_title: { de: 'So werden die Punkte gerechnet', en: 'How the points are calculated' },
    rc_formula: {
      de: '<strong>Punkte = Ziel − gewertetes Brutto + positive Tiere − negative Tiere.</strong> Die höchste Punktzahl gewinnt. 🥇',
      en: '<strong>Points = target − counted gross + positive animals − negative animals.</strong> Highest score wins. 🥇',
    },
    rc_rule_cap: {
      de: '<strong>1 · Deckel pro Loch:</strong> Gewertet wird höchstens Netto-Doppelbogey (Par + 2 + Vorgabeschläge). Eine 12 an einem Par 4 mit einem Vorgabeschlag zählt als 7 – ein Katastrophen-Loch ruiniert die Runde nicht. Auf der Scorekarte sind gedeckelte Löcher unterstrichen.',
      en: '<strong>1 · Cap per hole:</strong> At most net double bogey is counted (par + 2 + handicap strokes). A 12 on a par 4 with one stroke counts as 7 – one disaster hole cannot ruin the round. Capped holes are underlined on the scorecard.',
    },
    rc_rule_open: {
      de: '<strong>2 · Offene Löcher:</strong> Ein Loch ohne eingetragenes Brutto zählt als Netto-Par (Par + Vorgabeschläge) – das ist exakt punkteneutral. Abbrechen oder Auslassen bringt weder Vor- noch Nachteil; solche Spieler sind in der Rangliste mit <strong>*</strong> markiert.',
      en: '<strong>2 · Open holes:</strong> A hole without a gross score counts as net par (par + handicap strokes) – exactly neutral. Skipping or stopping is neither an advantage nor a penalty; those players are marked with <strong>*</strong> on the leaderboard.',
    },
    rc_rule_animals: {
      de: '<strong>3 · Tiere:</strong> Jedes positive Tier +1, jedes negative −1 – unabhängig vom Handicap, jedes Tier pro Loch nur einmal.',
      en: '<strong>3 · Animals:</strong> Each positive animal +1, each negative one −1 – independent of handicap, each animal only once per hole.',
    },
    rc_example_title: { de: 'Rechenbeispiel', en: 'Worked example' },
    rc_example: {
      de: 'Anna (HCP 15 → Ziel 44, Spielvorgabe 8) braucht <strong>43 Schläge</strong>, darunter eine 9 an Loch 2 (Par 4 + 1 Vorgabeschlag → Deckel 7). Gewertet werden 43 − 9 + 7 = <strong>41</strong>. Sie sammelt 🦓🦓🐇 (+3) und 🐍 (−1).<br>Punkte = 44 − 41 + 3 − 1 = <strong>+5</strong>',
      en: 'Anna (HCP 15 → target 44, playing handicap 8) takes <strong>43 strokes</strong>, including a 9 on hole 2 (par 4 + 1 stroke → cap 7). Counted: 43 − 9 + 7 = <strong>41</strong>. She collects 🦓🦓🐇 (+3) and 🐍 (−1).<br>Points = 44 − 41 + 3 − 1 = <strong>+5</strong>',
    },
    rc_tiebreak: {
      de: '<strong>Gleichstand:</strong> Es gewinnt, wer mehr positive Tiere hat; dann, wer weniger negative hat; dann der Countback wie im Golf üblich – das bessere Netto-Resultat auf den letzten 6 Löchern, dann den letzten 3, dann auf dem letzten Loch. Ist auch das gleich, teilen sich beide den Rang.',
      en: '<strong>Tie-break:</strong> More positive animals wins; then fewer negative ones; then the usual golf countback – the better net result on the last 6 holes, then the last 3, then the last hole. If still equal, the rank is shared.',
    },
    rc_second: {
      de: '<strong>Zweiter Preis:</strong> 🥈 die meisten gesammelten Tiere insgesamt – positive wie negative zählen. Bei Gleichstand gewinnen die positiven.',
      en: '<strong>Second prize:</strong> 🥈 most animals collected in total – positive and negative both count. Ties go to the positive ones.',
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
    r_course_title: { de: 'Der Platz – {name}', en: 'The course – {name}' },
    cs_label: { de: 'Platz', en: 'Course' },
    cs_hint: {
      de: 'Der Platz gilt für die laufende Runde. Wechseln geht nur, solange noch keine Scores eingetragen sind (PIN nötig).',
      en: 'The course applies to the current round. Switching is only possible while no scores are entered yet (PIN required).',
    },
    cs_confirm: {
      de: 'Auf «{name}» wechseln?\nZiel und Vorgabeschläge aller Spieler werden für diesen Platz gerechnet.',
      en: 'Switch to “{name}”?\nTargets and handicap strokes will be calculated for this course.',
    },
    cs_switched: { de: 'Platz gewechselt: {name} ⛳', en: 'Course switched: {name} ⛳' },
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
    e_next_last: { de: '✅ Loch {h} fertig – zur Rangliste 🏆', en: '✅ Hole {h} done – to the leaderboard 🏆' },
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
      de: 'Punkte = Ziel − gewertetes Brutto + positive Tiere − negative Tiere (pro Loch max. Netto-Doppelbogey). <strong>*</strong> = noch nicht alle Löcher eingetragen, offene zählen als Netto-Par (punkteneutral). Tipp auf einen Spieler zeigt die Scorekarte.',
      en: 'Score = target − counted gross + positive animals − negative animals (net double bogey max per hole). <strong>*</strong> = not all holes entered, open holes count as net par (neutral). Tap a player for the scorecard.',
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
      de: '{players} Spieler werden gewertet.\n⚠️ Noch nicht alle Löcher eingetragen: {open} Spieler – offene Löcher zählen als Netto-Par.\nDanach sind die Scores geleert – die Runde liegt im Archiv.',
      en: '{players} players will be scored.\n⚠️ Not all holes entered: {open} player(s) – open holes count as net par.\nAfterwards the scores are cleared – the round is in the archive.',
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
