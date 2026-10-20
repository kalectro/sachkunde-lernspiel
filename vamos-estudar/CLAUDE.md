# Vamos Estudar — Lern-App für 4. Klasse Portugal

## Überblick
Interaktive Lern-App als **einzelne HTML-Datei** (`index.html`) + externe JSON-Datendateien. Für ~25 Familien, gehostet auf GitHub Pages. Zielgruppe: Klasse 4.º A, Schuljahr 2026/27 (9–10 Jahre, Portugal). Bis Sommer 2026 war es 3.º A; die Prüfungen 2025/26 liegen archiviert unter „Provas passadas“.

**Live:** https://kalectro.github.io/sachkunde-lernspiel/vamos-estudar/

## Architektur
- `index.html`: Komplette App (CSS + JS inline), ~1500 Zeilen
- `data/*.json`: 4 Fachdateien mit Fragen (austauschbar pro Prüfungszyklus)
- Kein Build-Schritt, kein Framework, keine externen Abhängigkeiten
- Fragen werden per `fetch()` geladen → benötigt HTTP-Server (kein `file://`)
- localStorage Key: `vamos_estudar_profiles_v1`

## Fächer & Daten

| Fach | Datei | Farbe |
|------|-------|-------|
| Português | `data/portugues.json` | #FF6B6B |
| Matemática | `data/matematica.json` | #00b894 |
| Estudo do Meio | `data/estudo-do-meio.json` | #0984e3 |
| Inglês | `data/ingles.json` | #6c5ce7 |

## Datenformat (JSON)

```json
{
  "subject": "portugues",
  "name": "Português",
  "emoji": "📚",
  "color": "#FF6B6B",
  "exams": [
    {
      "id": "pt_2p_2026",
      "name": "2.º Período 2025/26",
      "examDate": "2026-03-10",
      "archived": true,
      "levels": [
        {
          "id": 1,
          "name": "Tipos de Palavras",
          "sub": "Beschreibung",
          "questions": [...]
        }
      ]
    }
  ]
}
```

### Fragetypen

**MC** (Multiple Choice):
```json
{"id":"pt2p_1_01", "type":"mc", "diff":1, "q":"Frage?", "options":["A","B","C","D"], "correct":0, "explanation":"Erklärung"}
```

**Type** (Texteingabe):
```json
{"id":"pt2p_1_13", "type":"type", "diff":2, "q":"Frage?", "accept":["antwort1","antwort2"], "explanation":"Erklärung"}
```

**TF** (Wahr/Falsch):
```json
{"id":"x", "type":"tf", "diff":1, "q":"Aussage", "correct":true, "explanation":"Erklärung"}
```

**Sort** (Sortierung):
```json
{"id":"x", "type":"sort", "diff":3, "q":"Anweisung", "items":["A","B","C"], "explanation":"Erklärung"}
```

Optional: `bonus: true`, `hint: "Tipptext"`

## Konzept: Aktive vs. Archivierte Prüfungen

- **`archived: false`** = aktive Prüfung → zählt für Sterne, Kronen, Achievements
- **`archived: true`** = vergangene Prüfung → spielbar zum Üben, zählt NICHT für Gesamtbewertung
- Prüfungswechsel: `"archived": true` setzen, neue Prüfung hinzufügen
- **Platzhalter** (Prüfung mit `"levels": []`, z. B. `pt_3p_2026`, `mat_3p_2026`) werden **weder aktiv noch im Archiv** gelistet. Die Regel sitzt an genau einer Stelle: `getActiveExams` / `getArchivedExams` (vorher nur in der Aktiv-Liste von `renderHome` und in `checkSubjectMastered`, das Archiv hätte leere Karten gezeigt). Test: „exams without levels are hidden …“, Gegenprobe 20.10.2026 rot/grün.
- **Schuljahreswechsel** (zuletzt 20.10.2026, 3.º A → 4.º A): Klassenname in `<title>` und im Profil-Screen von `index.html`, README (pt + de), Überblick oben und Zeile in der Wurzel-`CLAUDE.md`; alle Prüfungen des alten Schuljahrs archivieren.

## Profil-System
- Mehrere Spieler pro Gerät
- Profil-Auswahl-Screen beim Start
- Jedes Profil hat eigenen Fortschritt + Achievements
- Storage: `profiles = { "Name": { progress, archive, achievements, streak, playDates } }`

## Scoring (nur aktive Prüfungen)

### Sterne pro Versuch
- 1. Versuch richtig (ohne Tipp) = 3⭐
- 1. Versuch richtig (mit Tipp) = 2⭐
- 2. Versuch = 2⭐
- 3. Versuch = 1⭐
- Antwort gezeigt = 0⭐
- Wahr/Falsch falsch = 0⭐ (sofort gezeigt)

### History
- Letzte 2 Versuche pro Frage: `history[qid] = [neuester, vorheriger]`
- Durchschnitt für Stern-Anzeige

### Krone 👑
- ALLE Fragen (inkl. Bonus) 2x hintereinander mit 3⭐
- `isLevelMastered()` prüft History

### Archivierte Prüfungen
- Einfaches Prozent-Scoring: 80%+ = 3⭐, 60%+ = 2⭐, sonst 1⭐
- Nur bester Score gespeichert

## Fragenauswahl (`selectQuestions`)
- 10 Fragen pro Runde
- Priorität: schwache → unbeantwortete → fast gemeisterte → Wiederholung
- ≥50% crown-needed Fragen
- Bonus ab 70% beantworteter normaler Fragen (max 2 pro Runde)
- Sortiert nach Schwierigkeit

## Achievements (12)
- primeiro_passo, five_levels, all_levels, perfect, three_stars
- pt_master, mat_master, em_master, en_master, champion
- relampago (5er-Streak), abelha (3 Spieltage)

## Antwort-Normalisierung
```javascript
norm(s) → NFD + strip diacritics + Apostroph-Varianten (’ ‘ ʼ ´ `) → ' + lowercase + trim
          + trailing .!? weg + collapse whitespace
normN(s) → norm + remove all spaces (für Zahlen: "1 000" == "1000")
```
**Warum die Apostroph-Regel (seit 20.10.2026):** iPhone/iPad/Mac tippen mit „Smart Punctuation“ standardmäßig `’` statt `'`. Ohne die Regel wäre „I’m“ / „isn’t“ / „they’re“ falsch gewertet worden — relevant für jede Englisch-Frage mit Kurzform. Der Punkt am Ende („I'm from Portugal.“) wird aus demselben Grund ignoriert. `accept`-Listen brauchen deshalb **keine** Varianten mit `’`, mit Schlusspunkt oder in Großschreibung mehr (ältere Einträge in `ingles.json` haben sie noch, sie schaden nicht). Der **erste** `accept`-Eintrag wird bei falscher Antwort als Lösung angezeigt → ihn sauber schreiben („Portuguese“, „I'm not“).

Bewusst **nicht** normalisiert: Apostroph fehlt ganz („isnt“) oder steht falsch („is'nt“) — bei Kurzform-Fragen ist genau das der Lernstoff.

## Tests
```bash
node vamos-estudar/test/run-tests.mjs
```
Prüft: Datenvalidierung, Normalisierung, Scoring, Profil-Integrität, Migration, UI-Smoke

`norm` / `normN` / `answerCorrect` werden zur Laufzeit **aus `index.html` extrahiert** (`extractFn`), nicht im Test nachgebaut — vorher gab es eine Hand-Kopie, die bei jeder Änderung driften konnte. Gegenprobe am 20.10.2026: Apostroph-Zeile in `index.html` entfernt → Test „curly apostrophe …“ wird rot.

## Deployment
Push auf `main` → GitHub Actions deployed automatisch. Kein separater Build-Schritt nötig.

## Fragen aktualisieren
1. JSON-Datei in `data/` bearbeiten
2. Alte Prüfung auf `"archived": true` setzen
3. Neue Prüfung hinzufügen mit `"archived": false`
4. Tests laufen lassen: `node vamos-estudar/test/run-tests.mjs`
5. Blindtest (siehe unten)
6. Commit + Push

**Benennung:** Perioden-Tests `en_3p_2026` / Fragen `en3p_<stufe>_<nr>`. Kurze Klassen-Tests („Questão de aula“) `en_qa<N>_<Schuljahr>`, z. B. `en_qa1_2627` / Fragen `enqa1_<stufe>_<nr>`. Fragen-IDs nie wiederverwenden (sie sind Schlüssel in der History der Profile).

**Blindtest statt `grade-questions`:** Der Plattform-Skill `grade-questions` schließt `vamos-estudar/` laut seiner SKILL.md aus (`IGNORE_DIRS`), und seine Skripte (`_mathe_quellen/grader/`) lagen am 20.10.2026 nicht unter `/Users/kai/claude/sachkunde`. Bewährter Ersatz (20.10.2026, 108 Fragen): Fragen ohne Lösungen (MC-Optionen/Sort-Items gemischt) als JSON in den Scratchpad → Sonnet-Subagent beantwortet blind, darf `note` bei Mehrdeutigkeit setzen → Auswertung mit der echten `answerCorrect` aus `index.html` → Fehler und Notes einzeln gegen die Daten prüfen.
