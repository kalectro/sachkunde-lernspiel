# Lernspiel "Das Jahr" - Frankensteinschule 2. Klasse

## Überblick
Interaktives Lernspiel als **einzelne HTML-Datei** (`lernspiel.html` / `index.html`) für Zweitklässler der Frankensteinschule zum Thema "Das Jahr". Gehostet auf GitHub Pages.

**Live:** https://kalectro.github.io/sachkunde-lernspiel/

## Architektur
- CSS + JS in `index.html`, SVG-Grafiken inline; Fragen in externen JSON-Dateien (`data/welt*.json`)
- Gemeinsame Engine: `shared/engine.js` — geladen von beiden Apps (Deutsch + Portugiesisch)
- Kein Build-Schritt, kein Framework, keine externen Abhängigkeiten
- `lernspiel.html` ist eine Kopie von `index.html` für GitHub Pages
- Daten werden in `localStorage` gespeichert (Key: `frankensteinschule_profiles_v3`)

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
- Mehrere Spieler pro Gerät (`profiles = { "Max": {...}, "Lisa": {...} }`)
- Migration alter Daten aus `frankensteinschule_lernspiel_v2`
- `worldProgress[wid].history[qid] = [score_neu, score_alt]` (letzte 2 Versuche)

## Fragenauswahl (`selectQuestionsForWorld`)
- 10 Fragen pro Runde
- ≥50% sind "crown-needed" (noch nicht 2x perfekt)
- Priorisierung: schlechte Scores → unbeantwortete → fast gemeistert → Review
- Lernkarte nur beim allerersten Besuch einer Welt
- Sortierung nach Schwierigkeit: leicht → mittel → schwer

## Deployment
```bash
cp lernspiel.html index.html
git add lernspiel.html index.html
git commit -m "..."
git push
```
GitHub Actions Workflow (`.github/workflows/pages.yml`) deployed automatisch auf GitHub Pages.

## Vamos Estudar (Portugiesisch)

Separates Lernspiel im Unterverzeichnis `vamos-estudar/`. Siehe `vamos-estudar/CLAUDE.md` für Details.

- **Live:** https://kalectro.github.io/sachkunde-lernspiel/vamos-estudar/
- **localStorage Key:** `vamos_estudar_profiles_v1` (komplett getrennt von `frankensteinschule_profiles_v3`)
- **Tests:** `node vamos-estudar/test/run-tests.mjs`
