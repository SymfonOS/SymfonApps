# Landing page: Hobel

Built as `apps/hobel/site/index.html` (static, no JavaScript, tokens from `replica/design`).
Voice: ruhig, direkt, handwerklich (`replica/brand.md`).

**Ground rule for this page:** every sentence is something Hobel does today and that a test or the
code shows. The positioning from `/replica-entrepreneur` has no evidence yet (sample 0), so there
is no "the others are slow / bloated" section and no comparison with any other IDE. No user
counts, ratings, testimonials or logos: there are none.

## 1. Hero

- Headline: **Java schreiben und ausführen. Ohne Umweg.**
- Line: Eine kleine Desktop-IDE: Projekt öffnen, mit Vervollständigung schreiben, mit einem Klick
  ausführen. Kein Konto, keine Telemetrie.
- Button: **Quellcode ansehen** (→ repository)
- Image: real screenshot `replica/clone-screens/S17-run.png` (editor + run output), alt text says what it shows.

## 2. The problem (replaced for now)

The skill wants the top two "hate" themes here. There are none with evidence yet. Instead, an
honest section on why Hobel exists:

- **Warum es Hobel gibt:** Hobel ist ein Lernprojekt. Es baut den Kern einer Java-IDE nach, Schritt
  für Schritt und offen dokumentiert: wie Editor, Language Server, Prozesse und Dateien
  zusammenspielen.

When `/replica-entrepreneur` has real reviews, this section becomes the top two themes,
paraphrased (never quoted).

## 3. How it works

1. **Ordner öffnen.** Hobel zeigt den Projektbaum und merkt sich das Projekt.
2. **Vertrauen oder nicht.** „Ja, vertrauen“ startet Code-Analyse und Ausführen. „Ohne Ausführen“
   lässt dich lesen und bearbeiten, ohne dass Code aus dem Ordner läuft.
3. **Shift+F10.** Hobel kompiliert und startet die Klasse. Fehler im Stacktrace sind Links zur Zeile.

## 4. Features

Led by what makes Hobel different in behaviour (there are no evidence-backed fixes yet), then the
basics:

- **Erst fragen, dann ausführen.** Kein Build-Skript, kein Language Server, kein Programm läuft,
  bevor du dem Ordner vertraust. Auch die Hauptlogik prüft das, nicht nur ein ausgegrauter Knopf.
  (code: `requireTrusted`, test: safe mode)
- **Nichts geht still verloren.** Beim Schließen mit ungespeicherten Dateien fragt Hobel. Hat sich
  eine Datei auf der Platte geändert, überschreibt Speichern sie nicht ungefragt.
  (tests: F04-E3, F04-E5)
- **Ein Klick zum Lauf.** Das Symbol neben `main` startet sofort, die Ausgabe läuft live mit,
  Stopp mit Ctrl+F2. (tests: F08-H1, F08-E1)
- **Java-Wissen eingebaut.** Vervollständigung, Fehler beim Tippen, Doku beim Drüberfahren,
  Sprung zur Definition, über den Eclipse JDT Language Server. (test: vertical slice)
- **Bleibt auf deinem Rechner.** Kein Konto, keine Telemetrie, Hobel selbst ruft keinen Server auf.
  Einzige Ausnahme: Der mitgelieferte Java-Server fragt beim Start einmal die öffentliche Liste der
  Gradle-Versionen ab. (test: NET-1, run with a recording proxy; found and fixed on the way:
  Chromium's spellchecker fetched dictionaries from Google at every start)
- **Mit der Tastatur bedienbar.** Projektbaum, Tabs, Ausführen und Dialoge per Tastatur; axe-geprüft.
  (tests: F01-H1, F04-E6)

## 5. Pricing

Kostenlos. Lernprojekt, kein Verkauf. See `pricing.md`.

## 6. FAQ

- **Welche Sprachen?** Java. Andere Sprachen kämen über weitere Language Server, sind aber nicht gebaut.
- **Gradle oder Maven?** Hobel erkennt `src/main/java`, importiert aber noch keine Build-Dateien.
  Abhängigkeiten aus Gradle/Maven fehlen deshalb in der Analyse.
- **Debugger, Git, Suche über alle Dateien?** Noch nicht. Heute kann Hobel 12 von 30 Grundfunktionen
  vollständig, die Liste steht offen im Repository.
- **Was brauche ich?** Node 22.13 oder neuer und ein JDK 21 oder neuer.
- **Linux, macOS, Windows?** Getestet ist Linux. macOS und Windows sollten laufen, sind aber nicht geprüft.
- **Ersetzt Hobel meine IDE?** Nein, heute nicht. Es ist zum Lernen und Ausprobieren da.
- **Lizenz?** Noch offen.

## 7. Final call to action

- Line: Hobel ist klein und offen gebaut. Schau rein, probier es aus.
- Button: **Quellcode ansehen**

## Contrast

The page uses only token roles from `replica/design/tokens.css` (copied into `site/`);
`contrast.py` on both token files: 55 pairs each, 0 AA failures (run 2026-11-04).
