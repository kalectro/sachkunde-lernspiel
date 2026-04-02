# 🎓 Vamos Estudar!

Aplicação de estudo interativa para alunos do 3.º ano em Portugal.
Interaktive Lern-App für die 3. Klasse in Portugal.

**🔗 [Abrir / Öffnen](https://kalectro.github.io/sachkunde-lernspiel/vamos-estudar/)**

---

## 🇵🇹 Para pais e alunos

1. Abre o link acima no telemóvel ou computador
2. Cria um perfil com o teu nome
3. Escolhe uma disciplina e começa a estudar!

**Disciplinas:** Português 📚, Matemática 🔢, Estudo do Meio 🌍, Inglês 🇬🇧

Cada disciplina tem 3 níveis com perguntas de escolha múltipla e resposta escrita. Ganha estrelas ⭐ e conquistas 🏆!

As provas já realizadas ficam disponíveis em "Provas passadas" para praticares quando quiseres.

---

## 🇩🇪 Für mich: Fragen aktualisieren

Die Fragen sind in separaten JSON-Dateien gespeichert — kein Code-Change nötig:

```
vamos-estudar/data/
  portugues.json
  matematica.json
  estudo-do-meio.json
  ingles.json
```

### Neue Prüfung hinzufügen
1. In der JSON-Datei die alte Prüfung auf `"archived": true` setzen
2. Neuen Eintrag in `"exams"` mit `"archived": false` hinzufügen
3. Fragen im gleichen Format einfügen (siehe `CLAUDE.md`)
4. Tests laufen lassen und committen

### Lokale Entwicklung
```bash
# HTTP-Server starten (fetch braucht HTTP, kein file://)
python3 -m http.server 8000

# Öffnen:
# http://localhost:8000/vamos-estudar/
```

### Tests ausführen
```bash
node vamos-estudar/test/run-tests.mjs
```

## Projektstruktur

```
vamos-estudar/
  index.html          ← App (HTML + CSS + JS)
  data/
    portugues.json     ← Fragen Português
    matematica.json    ← Fragen Matemática
    estudo-do-meio.json← Fragen Estudo do Meio
    ingles.json        ← Fragen Inglês
  test/
    run-tests.mjs      ← Automatisierte Tests
  CLAUDE.md            ← Technische Doku
  README.md            ← Diese Datei
```
