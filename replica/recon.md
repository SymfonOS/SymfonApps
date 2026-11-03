# Recon map: IntelliJ IDEA (Desktop: Windows, macOS, Linux)

Scope: **Alles**, die ganze IDE als Übersichtskarte. Wegen der Größe (XL) ist
das eine Landkarte, aus der danach ein baubarer Ausschnitt gewählt wird
(Empfehlung ganz unten).
For: Interne Nutzung / Lernen (kein Verkauf geplant)
Date: 2026-11-03
Version: IntelliJ IDEA 2026.2 (einheitliche Distribution seit 2025.3)

> **Wie belastbar das ist:** Die Netzwerkrichtlinie dieser Session sperrt
> `www.jetbrains.com`. Gelesen wurde über die Websuche. Bildschirme, Flows und
> Shortcuts stammen aus der öffentlichen Doku, so wie sie bekannt ist, und
> sind nicht live gegengeprüft. Nichts davon stammt aus dem Quellcode von
> IntelliJ: der ist zwar Open Source (Apache 2.0), wird hier aber bewusst
> nicht gelesen (Clean Room). Screenshots unter `replica/screens/` fehlen
> noch. Die kannst du aus deiner eigenen Installation machen.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Produktseite | https://www.jetbrains.com/idea/ | vom Container aus gesperrt, nicht gelesen |
| 2 | Help: unified distribution | https://www.jetbrains.com/help/idea/intellij-idea-single-distribution.html | Free und Ultimate seit 2025.3 in einem Produkt; die kostenlose Stufe enthält Basis-DB-Tools, Nicht-JVM-Sprachen, Kubernetes |
| 3 | Help: Tool windows | https://www.jetbrains.com/idea/help/intellij-idea-tool-windows.html | Tool-Fenster und Alt+Zahl-Shortcuts |
| 4 | Help: Tool windows (2024.3) | https://jetbrains.com/idea/help/tool-windows.html | Commit Alt+0, Terminal Alt+F12 |
| 5 | Blog: 2026.2 | https://blog.jetbrains.com/idea/2026/07/intellij-idea-2026-2/ | Java 27, Kotlin 2.4, Logpoints, Git „Resolve All Simple Conflicts“, Copilot als Agent |
| 6 | Blog: 2026.2.1 | https://blog.jetbrains.com/idea/2026/08/intellij-idea-2026-2-1/ | Bugfix-Release |
| 7 | Snap Store | https://snapcraft.io/intellij-idea-ultimate | Store-Listing |
| 8 | Preise (Dritte) | https://subger.com/en/service/intellij-idea | unzuverlässig: Ultimate ca. 169 $/Jahr. Für Lernzwecke egal |
| 9 | Language Server Protocol | https://microsoft.github.io/language-server-protocol/ | offene Alternative zu IntelliJs eigener PSI-Engine |

## Core loop

Ein Projekt öffnen, Code mit Completion, Navigation und Refactorings
schreiben, dann ausführen oder debuggen, testen und committen, ohne die IDE zu
verlassen. Der eigentliche Mehrwert („was Nutzer bezahlen“) ist die
**Code-Intelligenz**: Code verstehen, sicher umbauen, Fehler finden, bevor sie
laufen.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Welcome screen | App-Start ohne offenes Projekt | Projekte öffnen, neu anlegen, klonen | Recent-Liste, Suche, Buttons New/Open/Clone, Seitennav (Projects, Customize, Plugins, Learn) | leer (keine Projekte), gefüllt |
| S02 | New Project wizard | S01 → New Project | Projekt aus Generator anlegen | Generator-Liste (Java, Kotlin, Maven, Gradle, Spring …), Formular, JDK-Picker | default, Validierungsfehler, JDK fehlt |
| S03 | Get from VCS | S01 → Clone | Repo klonen | URL-Feld, Account-Liste (GitHub, GitLab), Zielordner | default, Auth nötig, Fehler, Fortschritt |
| S04 | Hauptfenster | Projekt geöffnet | Arbeitsfläche | Main Toolbar (Projekt-, Branch-, Run-Widget), Tool-Window-Streifen, Editor, Statusleiste | Indexing läuft, Dumb Mode, bereit |
| S05 | Editor | S04 Mitte | Code bearbeiten | Tabs, Gutter (Zeilennr., Breakpoints, Run-Icons, Änderungen), Inlay Hints, Breadcrumbs, Inspections-Widget, Minimap (nein, nur per Plugin) | leer („Drop files here“, Shortcut-Tipps), gefüllt, Split, Read-only, großer Datei-Modus |
| S06 | Project tool window | Alt+1 | Dateibaum | Tree, Ansichten (Project, Packages, Scratches), Toolbar | gefüllt, Indexing, gefiltert |
| S07 | Structure | Alt+7 | Gliederung der Datei | Tree, Sortierung, Filter | leer, gefüllt |
| S08 | Search Everywhere | Doppel-Shift | Alles finden | Tabs (All, Classes, Files, Symbols, Actions, Text), Ergebnisliste, Vorschau | leer, Ergebnisse, keine Treffer |
| S09 | Find in Files / Replace in Files | Ctrl+Shift+F / R | Volltextsuche | Suchfeld, Regex/Case/Wort, Scope, Dateimaske, Ergebnisliste, Vorschau | leer, Ergebnisse, keine Treffer, Regex-Fehler |
| S10 | Completion-Popup | beim Tippen / Ctrl+Space | Vorschläge | Liste, Icons, Typ-Info, Doku-Popup | Vorschläge, leer, lädt |
| S11 | Quick-Fix / Intentions | Alt+Enter | Vorschläge zur Korrektur | Popup-Liste, Vorschau des Diffs | Liste, keine Aktionen |
| S12 | Quick Documentation | Ctrl+Q / Hover | Doku anzeigen | Popup mit gerendertem Javadoc | gefüllt, „keine Doku“ |
| S13 | Refactoring-Dialoge | Shift+F6, Ctrl+Alt+M … | Umbenennen, Extrahieren, Signatur ändern | Inline-Rename, Dialoge, Konflikt-Vorschau | inline, Dialog, Konflikte, Vorschau |
| S14 | Find Usages | Alt+F7 | Verwendungen | Tool-Window mit gruppiertem Baum, Vorschau | Treffer, keine |
| S15 | Problems | Alt+6 | Fehler und Warnungen | Tabs (File, Project Errors, Server-Side), Baum nach Schwere | leer („No problems“), gefüllt |
| S16 | Run / Debug Configurations | Run-Widget → Edit Configurations | Starts konfigurieren | Liste nach Typ, Formular, Before-Launch-Tasks | leer, gefüllt, ungültig (rotes X) |
| S17 | Run tool window | Alt+4 | Prozessausgabe | Konsole mit Links zu Code, Tabs je Run, Rerun/Stop | läuft, beendet (Exit-Code), Fehler |
| S18 | Debug tool window | Alt+5 | Debuggen | Frames, Threads, Variables, Watches, Konsole, Step-Buttons, Evaluate Expression | läuft, pausiert, beendet, keine Session |
| S19 | Test Runner | Teil von S17 | Testergebnisse | Baum (grün/rot/ignoriert), Fortschritt, Diff-Link bei Fehlern | läuft, alle grün, Fehler, abgebrochen |
| S20 | Terminal | Alt+F12 | Shell | Tabs, Split, Shell-Auswahl | leer, läuft |
| S21 | Commit tool window | Alt+0 | Änderungen committen | Changelists, Datei-Checkboxen, Message-Feld, Pre-Commit-Checks, Commit / Commit and Push | keine Änderungen, Änderungen, Checks laufen, Checks fehlgeschlagen |
| S22 | Git tool window | Alt+9 | Log und Branches | Log-Graph, Filter, Commit-Details, Branch-Baum | gefüllt, gefiltert, leer |
| S23 | Diff-Viewer | aus S21/S22 | Änderungen vergleichen | Side-by-side / unified, Navigation, Inline-Edit | gleich, Unterschiede, binär |
| S24 | Merge-Konflikt-Dialog | bei Konflikt | Konflikte lösen | 3-Wege-Ansicht, Accept Left/Right, Resolve All Simple Conflicts | Konflikte, gelöst |
| S25 | Branches-Popup | Branch-Widget in Toolbar | Branch wechseln/anlegen | Suche, lokal/remote, Aktionen | gefüllt |
| S26 | Build tool window (Maven/Gradle) | rechter Streifen | Build-Tool-Tasks | Baum (Lifecycle, Plugins, Dependencies), Reload | gefüllt, Sync läuft, Sync-Fehler |
| S27 | Services | Alt+8 | laufende Dienste | Baum (Run-Configs, Docker, DBs), Logs | leer, gefüllt |
| S28 | Database tool window | rechter Streifen | DB-Verbindungen | Datenquellen-Baum, Console, Grid-Editor | leer, verbunden, Fehler |
| S29 | Settings | Ctrl+Alt+S | Konfiguration | Baum (Appearance, Keymap, Editor, Plugins, VCS, Build, Languages, Tools), Suche, Reset | default, geändert (Apply aktiv) |
| S30 | Plugins | Settings → Plugins | Erweiterungen | Marketplace / Installed, Karten, Details | gefüllt, Neustart nötig |
| S31 | Project Structure | Ctrl+Alt+Shift+S | Module, SDKs, Libraries | Seitennav, Formulare | gültig, Fehler |
| S32 | Local History | Rechtsklick → Local History | Versionen ohne Git | Liste der Stände, Diff | gefüllt |
| S33 | Bookmarks / TODO / Notifications | Alt+2, TODO-Fenster, Glocke | Hilfslisten | Listen/Bäume | leer, gefüllt |
| S34 | AI Assistant / Chat | rechter Streifen | KI-Chat, Agent, Completion | Chat, Kontext-Chips, Diff-Vorschläge | nicht eingeloggt, leer, Antwort läuft |
| S35 | Statusleiste + Hintergrund-Tasks | unten | Fortschritt, Encoding, Zeilenende, Branch, Navigationspfad | Widgets, Fortschrittsbalken | idle, Indexing |
| S36 | Keymap | Settings → Keymap | Shortcuts anpassen | Baum aller Aktionen, Suche nach Shortcut | default, Konflikt |

## Flows

```
F01 Bestehendes Projekt öffnen und loslegen
    S01 -> (Open) Dateidialog -> S04 (Indexing) -> S06 -> S05
    happy path clicks: 3
    edge: kein JDK konfiguriert, Build-Tool-Sync schlägt fehl, Projekt-Vertrauensdialog ("Trust project?"), sehr großes Repo
```
```
F02 Repo klonen
    S01 -> S03 -> S04 (Sync + Indexing)
    happy path clicks: 3 + URL einfügen
    edge: Auth nötig, Ordner existiert, Netzwerkfehler
```
```
F03 Neues Projekt anlegen
    S01 -> S02 -> S04
    happy path clicks: 4
    edge: kein JDK (Download anbieten), Name ungültig
```
```
F04 Datei finden und bearbeiten
    S04 -> S08 (Doppel-Shift, tippen, Enter) -> S05 -> S10 beim Tippen
    happy path clicks: 0 (nur Tastatur)
    edge: Index noch nicht fertig, Treffer in Bibliotheken, Tippfehler (Fuzzy-Matching)
```
```
F05 Fehler mit Quick-Fix beheben
    S05 (rote Wellenlinie) -> Alt+Enter -> S11 -> Enter
    happy path clicks: 0 (2 Tasten)
    edge: mehrere Fixes, Fix erzeugt neuen Fehler, Fix braucht Import
```
```
F06 Symbol sicher umbenennen
    S05 -> Shift+F6 -> S13 inline -> Enter
    happy path clicks: 0
    edge: Konflikt mit bestehendem Namen, Verwendungen in Strings/Kommentaren, Datei read-only
```
```
F07 Zur Definition / zu Verwendungen
    S05 -> Ctrl+B / Alt+F7 -> S05 oder S14
    happy path clicks: 1
    edge: mehrere Implementierungen (Auswahl-Popup), Symbol in Bibliothek (dekompiliert/Sources)
```
```
F08 Programm ausführen
    S05 Gutter-Run-Icon -> S17
    happy path clicks: 2
    edge: Kompilierfehler, Prozess hängt (Stop), Port belegt
```
```
F09 Debuggen
    S05 Gutter klicken (Breakpoint) -> Debug -> S18 pausiert -> Step / Evaluate -> Resume
    happy path clicks: 4
    edge: Breakpoint wird nie erreicht, bedingter Breakpoint, Logpoint, mehrere Threads
```
```
F10 Tests laufen lassen und Fehler finden
    S05 Gutter-Run-Icon an Testklasse -> S19 -> roten Test klicken -> S05 an der Stelle
    happy path clicks: 3
    edge: Test-Framework fehlt, Rerun Failed, Diff bei assertEquals
```
```
F11 Änderungen committen und pushen
    S21 (Alt+0) -> Dateien prüfen -> S23 -> Message -> Commit and Push -> Push-Dialog
    happy path clicks: 4
    edge: keine Änderungen, Pre-Commit-Checks schlagen fehl, Push abgelehnt (erst pull), keine Remote
```
```
F12 Branch wechseln und Konflikte lösen
    S25 -> Checkout -> (Konflikt) S24 -> Resolve -> S21
    happy path clicks: 3
    edge: lokale Änderungen (Stash/Shelve), komplexer Konflikt
```
```
F13 Textsuche und Ersetzen im Projekt
    S09 -> Suchbegriff -> Ergebnis wählen -> (Replace All)
    happy path clicks: 2
    edge: Regex-Fehler, Treffer in Build-Ordnern, riesige Treffermenge
```
```
F14 Einstellung / Theme / Keymap ändern
    S29 -> Suche -> Wert ändern -> Apply
    happy path clicks: 3
    edge: Shortcut-Konflikt (S36), Neustart nötig
```
```
F15 Plugin installieren
    S29 -> S30 -> Install -> Restart
    happy path clicks: 4
    edge: inkompatibel, Neustart nötig
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, icon, toolbar | default, hover, focus, pressed, disabled | alle |
| Tool-Window-Streifen | links, rechts, unten; Icon-Buttons | aktiv, inaktiv, mit Badge | S04 |
| Tool-Window-Container | docked, floating, undocked, window, split | sichtbar, versteckt, maximiert | S06, S07, S14–S22, S26–S28, S34 |
| Editor-Tabs | normal, gepinnt, Vorschau (kursiv), geändert (*) | aktiv, inaktiv, hover, geschlossen | S05 |
| Code-Editor | Haupt, Diff, Konsole, Dialog-Feld | normal, read-only, Fehler | S05, S23, S24, S17 |
| Gutter | Zeilennummern, Icons, Änderungsmarker, Breakpoints, Folding | default, hover, aktiv | S05, S23 |
| Tree | mit Icons, Checkboxen, Speed Search | expanded, collapsed, selected, loading | S06, S07, S14, S15, S19, S21, S22, S26, S29 |
| Popup-Liste | Completion, Actions, Choose Implementation, Branches | gefüllt, gefiltert, leer | S08, S10, S11, S25 |
| Hover-/Doku-Popup | Doku, Fehler, Typ-Info | gefüllt, lädt | S05, S12 |
| Inline-Eingabe | Rename, Find in File (Ctrl+F) | aktiv, Fehler | S05, S13 |
| Dialog | modal, mit Baum links (Settings) | default, Fehler, Apply aktiv | S02, S13, S16, S29, S31 |
| Formularfelder | Text, Dropdown, Checkbox, Pfad-Picker, JDK-Picker | default, focus, error, disabled | S02, S03, S16, S29 |
| Konsole | Run, Debug, Terminal | läuft, beendet, mit Hyperlinks | S17, S18, S20 |
| Data Grid | Tabelle editierbar | lädt, gefüllt, geändert | S28, S18 (Variables) |
| Log-Graph | Commits mit Branch-Linien | gefüllt, gefiltert | S22 |
| Notification / Balloon | info, warning, error, mit Aktion | eingeblendet, im Center | S33, überall |
| Statusleisten-Widget | Text, Fortschritt, Dropdown | idle, aktiv | S35 |
| Breadcrumbs | — | default, hover | S05 |
| Inlay Hint | Parametername, Typ, Code Vision (Usages, Author) | sichtbar, versteckt | S05 |
| Wellenlinie (Highlighting) | Error, Warning, Weak Warning, Typo | — | S05 |
| Main Toolbar Widget | Projekt, Branch, Run-Konfiguration | default, Popup offen, läuft | S04 |

## Inferred data model

```
Workspace (IDE-Installation)
            settings (json), keymap_id, theme, installed_plugins[], recent_projects[]
            evidence: S01, S29, S30, S36
            confidence: high

Project     id, name, root_path, sdk_id, vcs_roots[], trusted (bool), opened_at
            evidence: S01 Recent-Liste, S31, "Trust project"-Dialog
            confidence: high

Module      id, project_id, name, content_roots[], source_roots[], test_roots[],
            excluded[], dependencies[] (module | library | sdk)
            evidence: S31 Project Structure
            confidence: high

SDK         id, type (jdk | python | node ...), version, home_path
            evidence: S02 JDK-Picker, S31
            confidence: high

Library     id, name, classes_roots[], sources_roots[], scope (compile | test | runtime)
            evidence: S31, S26 Dependencies
            confidence: medium

File        path, language, encoding, line_separator, modified (bool), read_only
            evidence: S05, S35 Statusleiste
            confidence: high

EditorState file_path, caret, selection, scroll, folding, split_group
            evidence: Tabs bleiben nach Neustart offen
            confidence: medium

Index       (abgeleitet) file -> symbols, word index, stub trees
            evidence: "Indexing..." in S35, Dumb Mode
            confidence: medium. Interner Aufbau ist geraten (guess); im Nachbau ersetzt durch LSP + ripgrep/tree-sitter

Symbol      name, kind (class | method | field | ...), file, range, container
            evidence: S07, S08 Symbols-Tab, S14
            confidence: high (als Konzept)

Inspection  id, name, severity, enabled, scope, quick_fixes[]
            evidence: S15, Settings → Editor → Inspections
            confidence: high

Problem     file, range, severity, message, inspection_id
            evidence: S15, Wellenlinien in S05
            confidence: high

RunConfiguration
            id, name, type (application | junit | gradle | maven | npm | docker ...),
            main_target, args, vm_options, env (map), working_dir,
            before_launch[] , shared (bool → .run/ Datei)
            evidence: S16
            confidence: high

RunSession  id, config_id, kind (run | debug), pid, status, exit_code, output (stream)
            evidence: S17, S18
            confidence: high

Breakpoint  id, file, line, kind (line | method | exception | field), condition,
            log_expression, suspend (all | thread | none), enabled
            evidence: S18, Gutter, Blog 2026.2 (Logpoints)
            confidence: high

TestResult  session_id, test_id, name, status (passed | failed | ignored | running),
            duration, message, expected, actual, location
            evidence: S19
            confidence: high

Changelist  id, name, active (bool), files[]
            evidence: S21
            confidence: high

Shelf       id, name, patch, created_at
            evidence: Shelf-Tab in S21
            confidence: high

LocalHistoryEntry  file, timestamp, label, content_snapshot
            evidence: S32
            confidence: high

Bookmark    file, line, mnemonic, description
            evidence: S33
            confidence: high

DataSource  id, driver, url, user, schema_filter
            evidence: S28
            confidence: medium

Plugin      id, name, version, enabled, extension_points
            evidence: S30
            confidence: medium (Extension-Point-Mechanik geraten)
```

Relationships: Workspace 1-n Project, Project 1-n Module, Module n-1 SDK,
Module n-n Library, Project 1-n RunConfiguration, RunConfiguration 1-n
RunSession, RunSession 1-n TestResult, Project 1-n Breakpoint, Project 1-n
Changelist, Changelist 1-n File, File 1-n Problem, File 1-n Bookmark,
File 1-n LocalHistoryEntry, Project 1-n DataSource.

## Feature matrix

See `features.csv`. Must: 30, should: 30, could: 22, skip: 9.

## Out of scope (cannot or should not be cloned)

- **IntelliJs eigene Sprachanalyse (PSI, Inspections für Java/Kotlin):** das
  ist der Kern von über 20 Jahren Arbeit. Im Nachbau kommen die Analysen von
  offenen Language Servern (Eclipse JDT LS, kotlin-lsp, typescript-language-server,
  pyright …). Das ist nachbaubare Funktionalität, nur über einen anderen Weg.
- **JetBrains Marketplace und seine Plugins:** fremdes Ökosystem. Eine eigene
  Plugin-API ist möglich, deren Plugins kommen aber nicht mit.
- **JetBrains Account, Lizenzserver, Toolbox, Settings Sync über JetBrains-Cloud.**
- **JetBrains AI / Junie und deren Modelle:** ein eigener KI-Chat über eine
  eigene API (z. B. Claude) ist dagegen möglich.
- **Code With Me, Remote Development (Gateway):** Infrastruktur von JetBrains.
- **Marken, Logos, Icons, der Name „IntelliJ“, das Theme „Islands/New UI“ 1:1:**
  eigene Icons (z. B. Lucide/Codicons) und eigene Farben verwenden.
- **Ultimate-Framework-Tiefe (Spring, Jakarta EE, Profiler, Datenbank-Engine):**
  jeweils eigenes L-Projekt, als `could`/`skip` markiert.

## Size

Screens 36, flows 15, entities 21. Hard parts:

1. **Code-Intelligenz** (Completion, Navigation, Refactorings, Inspections)
   in IntelliJ-Qualität. Mit LSP bekommt man vielleicht 60–70 % davon,
   Refactorings sind die größte Lücke.
2. **Debugger** (JDWP/DAP, Breakpoints, Variablen, Evaluate Expression).
3. **Build-Tool-Integration** (Gradle/Maven-Import in ein Projektmodell, Sync).
4. **Performance:** Indexing großer Repos, flüssiger Editor bei 100k-Zeilen-Dateien.
5. **Docking-Layout** der Tool-Fenster und die Keymap-/Aktions-Infrastruktur.
6. **Git-Oberfläche** (Log-Graph, 3-Wege-Merge).

Size: **XL, neu zuschneiden.** Die ganze IDE ist ein Mehrjahresprojekt.

### Vorschlag zum Zuschnitt (Lernprojekt)

Ein **„Mini-IDEA“ in Größe L**, gebaut auf Monaco/CodeMirror 6 plus LSP plus
DAP, als Tauri- oder Electron-App:

- Phase 1 (M): Welcome, Projekt öffnen, Dateibaum, Editor mit Tabs,
  Search Everywhere, Find in Files, Terminal, Settings/Keymap → F01, F04, F13, F14
- Phase 2 (M): LSP: Completion, Go to Definition, Find Usages, Rename,
  Quick-Fix, Problems → F05, F06, F07
- Phase 3 (M): Run-Konfigurationen, Run-Konsole, Test-Runner, Debugger über DAP → F08, F09, F10
- Phase 4 (M): Git: Commit, Diff, Log, Branches, Merge → F02, F11, F12
