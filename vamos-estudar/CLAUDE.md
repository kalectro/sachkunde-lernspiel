# Vamos Estudar — Lern-App für 3. Klasse Portugal

## Überblick
Interaktive Lern-App als **einzelne HTML-Datei** (`index.html`) + externe JSON-Datendateien. Für ~25 Familien, gehostet auf GitHub Pages. Zielgruppe: 9-Jährige (3.º ano, Portugal).

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
norm(s) → NFD + strip diacritics + lowercase + trim + collapse whitespace
normN(s) → norm + remove all spaces (für Zahlen: "1 000" == "1000")
```

## Tests
```bash
node vamos-estudar/test/run-tests.mjs
```
Prüft: Datenvalidierung, Normalisierung, Scoring, Profil-Integrität, Migration, UI-Smoke

## Deployment
Push auf `main` → GitHub Actions deployed automatisch. Kein separater Build-Schritt nötig.

## Fragen aktualisieren
1. JSON-Datei in `data/` bearbeiten
2. Alte Prüfung auf `"archived": true` setzen
3. Neue Prüfung hinzufügen mit `"archived": false`
4. Tests laufen lassen: `node vamos-estudar/test/run-tests.mjs`
5. Commit + Push
