# Lernplattform — Frankensteinschule

## Überblick
Lernplattform der Frankensteinschule, gehostet auf GitHub Pages. Root (`/`) ist ein **Hub**, der mehrere Tests als gleichrangige Karten auflistet. Jeder Test lebt in einem eigenen Unterordner.

**Live:** https://kalectro.github.io/sachkunde-lernspiel/

### Verzeichnisstruktur
```
/                       Platform-Hub (index.html): Profilwahl + Testkarten
/sachkunde/             Lernspiel "Das Jahr" (6 Welten, 2. Klasse)
/deutschtest/           Deutschtest (Verben & Wortarten, 2. Klasse)
/vamos-estudar/         Portugiesisch (3. Klasse, eigenes Ecosystem)
/shared/
  engine.js             Gemeinsame Lern-Engine (Audio, Rendering, Scoring)
  platform.css          Gemeinsame Basis-Styles (Hub + Deutschtest)
  i18n/                 Übersetzungen
```

### Hub (`/index.html`)
- Profilwahl (neu anlegen, auswählen, löschen)
- Grid mit allen registrierten Tests (Registry `TESTS` im Script)
- Klick auf Testkarte → `location.href = '<path>/?profile=<NAME>'`
- Speichert aktiven Profilnamen in `sessionStorage` (`lernplattform_current_profile`), damit Reload nicht auf die Profilauswahl zurückfällt
- Neuer Test hinzufügen = ein Eintrag in `TESTS` + ein neues Unterverzeichnis

## Architektur
- Jede App ist **eine HTML-Datei** mit inline CSS+JS, Fragen in externen JSON-Dateien
- Hub + Deutschtest laden `shared/platform.css`; Sachkunde hat historisch eigene Styles (Charaktere, Weltfarben)
- Alle Apps laden `shared/engine.js` (relativer Pfad `../shared/engine.js` aus den Sub-Apps)
- Kein Build-Schritt, kein Framework, keine externen Abhängigkeiten
- Daten in `localStorage` (Key: `frankensteinschule_profiles_v3`)
- `sachkunde/lernspiel.html` ist eine Legacy-Kopie von `sachkunde/index.html`

## Shared Engine (`shared/engine.js`)
Gemeinsame Logik beider Lern-Apps. Exportiert `window.LernEngine`:
- **Audio**: `playTone`, `soundCorrect/Wrong/Click/Achievement`
- **Animationen**: `launchConfetti`
- **UI**: `showScreen`, `buildStars`, `esc`
- **Utils**: `shuffle`
- **Profile**: `loadProfiles(key)`, `saveProfiles(key, data)`
- **Scoring**: `calculateScore`, `recordAttempt`, `isMastered`, `avgStars`
- **Antwort-Checking**: `checkMC`, `checkTF`, `checkText`, `checkSort`
- **Rendering**: `renderMC`, `renderTF`, `renderType`, `renderSort`, `renderScramble`, `renderFill`

Neue Fragetypen oder Bug-Fixes in der Engine wirken automatisch auf beide Apps.

## Spielstruktur

### 6 Welten mit je 18 normalen + 3 Bonusfragen
1. **Mollys Wochentage-Wiese** (Hund) - Wochentage, gestern/morgen
2. **Ellis Monate-Fluss** (Eisvogel) - 12 Monate, Reihenfolge
3. **Oktis Jahreszeiten-Ozean** (Oktopus) - 4 Jahreszeiten, Feiertage
4. **Blitzis Kalender-Koppel** (Pferd) - Tage im Monat, Knöchel-Trick
5. **Datum-Dschungel** (alle Tiere) - Datum schreiben, Feiertage
6. **Weltraum-Abenteuer** (alle Tiere) - Erde, Mond, Sonne

### Fragetypen
- `mc` - Multiple Choice (4 Optionen)
- `tf` - Wahr/Falsch
- `fill` - Lückentext
- `sort` - Sortieraufgabe (Drag & Drop per Klick)
- `scramble` - Buchstabensalat
- `learn` - Lernkarte (kein Scoring)

### Fragenfelder
- `id` - Eindeutige ID (z.B. `w1_01`, `b1_01` für Bonus)
- `w` - Welt-ID (1-6)
- `type` - Fragetyp
- `diff` - Schwierigkeit (1=leicht, 2=mittel, 3=schwer)
- `bonus` - Optional, `true` für Bonusfragen
- `sa` - Self-Assessment IDs (Legacy, nicht mehr aktiv verwendet)
- `hint` - Optionaler Tipp-Text

## Scoring-System

### Sterne (nur normale Fragen)
- 1. Versuch richtig = 3⭐
- 2. Versuch richtig = 2⭐
- 3. Versuch richtig = 1⭐
- Antwort gezeigt = 0⭐
- Tipp benutzt = max 2⭐
- Wahr/Falsch falsch = 0⭐ (Antwort wird sofort gezeigt)

### Anzeige
- Durchschnitt der letzten 2 Versuche pro Frage
- Halbe Sterne möglich (2.5 Sterne)
- 3 Sterne nur bei exakt 3.0 Durchschnitt (nie aufgerundet)
- `buildStars()` rendert volle, halbe und leere (grayscale) Sterne

### Krönchen 👑
- Benötigt: ALLE Fragen (inkl. Bonus!) mindestens 2x hintereinander beim 1. Versuch richtig
- Funktion: `isWorldMastered()` prüft `history[qid].length >= 2 && h[0]===3 && h[1]===3`

### Bonusfragen 🎓
- Zählen NICHT für Sterne-Durchschnitt
- Zählen für Krönchen (müssen auch 2x perfekt sein)
- Werden erst ab >70% beantworteter normaler Fragen freigeschaltet
- 1-2 pro Runde eingemischt
- Eigenes Feedback-Design (kein Sterne-Display)

## Profil-System
Ein Profil ist ein **Container** mit Namespace-Keys pro Test:
```js
profiles = {
  "Max": {
    sachkunde:   { worldProgress, achievements, streak, playDates, ... },
    deutschtest: { progress: { examId: { levels: { levelId: { history, completed } } } }, achievements, ... }
  },
  ...
}
```
- Sachkunde schreibt nur unter `profile.sachkunde`; Deutschtest nur unter `profile.deutschtest`. Der Hub liest beides, schreibt nichts (außer beim Profil-Anlegen/Löschen).
- Migration: Wenn `profile.worldProgress` direkt am Profil hängt (alte flache Struktur), wird sie beim Laden in Sachkunde in `profile.sachkunde` umgehängt.
- Legacy-Key `frankensteinschule_lernspiel_v2` wird beim ersten Laden migriert.
- `worldProgress[wid].history[qid] = [score_neu, score_alt]` (letzte 2 Versuche).

## Fragenauswahl (`selectQuestionsForWorld`)
- 10 Fragen pro Runde
- ≥50% sind "crown-needed" (noch nicht 2x perfekt)
- Priorisierung: schlechte Scores → unbeantwortete → fast gemeistert → Review
- Lernkarte nur beim allerersten Besuch einer Welt
- Sortierung nach Schwierigkeit: leicht → mittel → schwer

## Deployment
Der GitHub-Actions-Workflow (`.github/workflows/pages.yml`) lädt das gesamte Repo als Pages-Artifact hoch. `sachkunde/lernspiel.html` muss beim Ändern von `sachkunde/index.html` nachgezogen werden:
```bash
cp sachkunde/index.html sachkunde/lernspiel.html
git add -A
git commit -m "..."
git push
```

## Vamos Estudar (Portugiesisch)

Separates Lernspiel im Unterverzeichnis `vamos-estudar/`. Siehe `vamos-estudar/CLAUDE.md` für Details.

- **Live:** https://kalectro.github.io/sachkunde-lernspiel/vamos-estudar/
- **localStorage Key:** `vamos_estudar_profiles_v1` (komplett getrennt von `frankensteinschule_profiles_v3`)
- **Tests:** `node vamos-estudar/test/run-tests.mjs`

## Deutschtest (Deutsch 2. Klasse)

Test im Unterverzeichnis `deutschtest/`. Teilt Profile mit dem Rest der Plattform.

- **Live:** https://kalectro.github.io/sachkunde-lernspiel/deutschtest/
- **localStorage Key:** `frankensteinschule_profiles_v3` (plattformweit geteilt)
- **Namespace:** schreibt nur unter `profile.deutschtest`
- **Einstieg:** Testkarte im Plattform-Hub (`/`); Profil wird per `?profile=NAME` übergeben und automatisch vorausgewählt
- **Zurück-Link:** "← Plattform" in Profil- und Home-Screen
- **Daten:** `deutschtest/data/deutsch.json` — Test "Verben & Wortarten" mit 5 Stufen (Nomen/Artikel, Verben erkennen, Personalformen, g/k b/p, Vorsilben/Wortfamilien)

## Einen neuen Test hinzufügen

1. Neuen Unterordner `<test-id>/` anlegen mit eigener `index.html` (Template: `deutschtest/index.html` kopieren)
2. Im Kind-`index.html` `SUBSTATE_KEY` auf eindeutigen String setzen (z.B. `'mathe'`) — bestimmt den Key unter dem Profil-Container
3. Daten unter `<test-id>/data/` ablegen
4. Im Hub (`/index.html`) einen Eintrag in das `TESTS`-Array pushen (id, name, emoji, farbe, path, progress-funktion)
5. Pfad zur Engine ist `../shared/engine.js`, Plattform-CSS via `<link rel="stylesheet" href="../shared/platform.css">`
