# Architecture: Mini-IDEA (ein Nachbau der Kernfunktionen von IntelliJ IDEA)

Arbeitsname „Mini-IDEA“, bis `/replica-brand` einen echten Namen vergibt.
Grundlage: `replica/recon.md` und `replica/features.csv` vom 2026-11-03.
Zuschnitt: der Vorschlag aus der Recon, eine Lern-IDE in Größe L, gebaut in
vier Phasen.

## Warum nicht der Standard-Stack

Der Standard-Stack von replica (Next.js, Postgres, Auth, Stripe, Vercel) ist
für Web-Apps mit Konten gedacht. Eine IDE ist eine lokale Desktop-App für
einen einzigen Nutzer: kein Server, keine Konten, keine Zahlungen, keine
E-Mails. Was hier stattdessen zählt, sind Prozesse (Language Server,
Debugger, Shells, Builds), das Dateisystem und ein schneller Editor.

## Stack

| layer | choice | why |
| --- | --- | --- |
| app shell | **Electron** + TypeScript | Node im Main-Prozess startet LSP-, DAP- und Shell-Prozesse ohne Umwege; der Weg ist durch VS Code und Theia bewiesen. Tauri wäre schlanker, braucht für alles mit Prozessen aber Rust. Das ist für ein Lernprojekt eine zweite Baustelle |
| build | Vite + electron-vite, pnpm | schneller Dev-Loop mit HMR im Renderer |
| UI | React 19 + Zustand | bekannt, gut dokumentiert. Zustand reicht für den IDE-State ohne Redux-Overhead |
| styling | Tailwind, Tokens aus `/replica-design` | wie im Pack vorgesehen |
| layout | **Dockview** | andockbare, schwebende und geteilte Panels = Tool-Fenster (S04). Eigenbau wäre ein Monatsprojekt |
| editor | **Monaco** + `monaco-languageclient` | Multi-Cursor, Folding, Diff-Editor (S23), Minimap, Find/Replace und LSP-Brücke sind schon da. CodeMirror 6 wäre leichter, braucht für Diff und LSP aber mehr Eigenbau |
| highlighting | Monaco-Grammatiken, später tree-sitter (WASM) | für Breadcrumbs, Structure ohne LSP und schnelleres Highlighting |
| code intelligence | **LSP**: Eclipse JDT LS (Java), kotlin-lsp, typescript-language-server, pyright | ersetzt IntelliJs PSI (skip in der Recon). Ein Server pro Sprache und Projekt, vom Main-Prozess über stdio verwaltet |
| debugger | **DAP**: java-debug (über JDT LS), js-debug, debugpy | ein Protokoll für alle Sprachen, F09 |
| tests | JUnit über JDT-LS-Testerweiterung bzw. Gradle/Maven mit JUnit-XML/Test-Events, Vitest/Jest-Reporter | Ergebnisse landen als Baum in `test_results` |
| terminal | xterm.js + node-pty | Standard, S20 |
| suche | **ripgrep** (gebündelt über `@vscode/ripgrep`) | Find in Files (S09) über ganze Repos in Millisekunden, respektiert .gitignore |
| datei-index | eigener Index im Main-Prozess (Dateiliste + Watcher `@parcel/watcher`), Fuzzy-Matching mit `fzf`-artigem Scoring | Search Everywhere (S08) über Dateinamen. Symbole kommen von `workspace/symbol` |
| git | **git-CLI** über einen dünnen Wrapper (`simple-git`) | volle Kompatibilität, Hooks laufen, kein Nachbau von git |
| build tools | Gradle Tooling API über einen kleinen JVM-Helper, Maven über `mvn`-CLI + `help:effective-pom` | Projektmodell und Tasks (S26). Der härteste Must-nahe Teil |
| lokaler state | **SQLite** (`better-sqlite3`) in `<userData>/state.db` | eine Datei, transaktional, synchron schnell. Schema in `replica/schema.sql` |
| geheimnisse | OS-Keychain über Electrons `safeStorage` | DB-Passwörter, Git-Tokens. Nie in SQLite oder JSON |
| tests der IDE | Vitest (Logik), Playwright für Electron (E2E) | `/replica-test` |
| distribution | electron-builder: dmg, nsis, AppImage/deb | Signierung erst, wenn es mehr als ein Lernprojekt wird |

Ein Prozess-Modell, keine Microservices:

```
Main-Prozess (Node)                         Renderer (React + Monaco + Dockview)
  ProjectService   Dateien, Watcher, Index        Editor, Tool-Fenster, Popups
  LspHost          ein Server pro Sprache  <──>   monaco-languageclient
  DapHost          Debug-Adapter           <──>   Debug-UI
  RunService       Prozesse, PTYs                 Run-Konsole, Terminal
  GitService       git CLI                        Commit, Log, Diff
  BuildService     Gradle/Maven                   Build-Fenster
  StateStore       SQLite                         (nur über IPC)
        ▲
        └── typisierte IPC (contextBridge, Allowlist), keine nodeIntegration im Renderer
```

## Schema

Tables: 20 plus `schema_version`. Access rules: **Prüfung in der Datenschicht.**
Es gibt nur einen lokalen Nutzer, also keine Row-Level-Security. Die Grenze
verläuft zwischen Renderer und Main: nur der Main-Prozess öffnet die
Datenbank und das Dateisystem. Jeder IPC-Handler validiert seine Eingaben
(zod) und prüft, dass Pfade innerhalb des Projekt-Roots liegen. Kein
`nodeIntegration`, `contextIsolation` an, `sandbox` an.

Konventionen: ids als UUID-Text, Zeiten als Epoch-Millisekunden UTC,
Booleans als 0/1 mit Check, JSON als Text mit `json_valid`. Projekt löschen
löscht alles, was dazugehört (`on delete cascade`). Run-Historie überlebt das
Löschen der Konfiguration (`set null` plus Namens-Snapshot).

Bewusst **nicht** in der Datenbank: Dateiinhalte (Platte), Symbol-Index
(Language Server), Module und Libraries (Build-Tool), Git-Zustand (git).

| table | wofür | screens |
| --- | --- | --- |
| projects | Recent-Liste, Vertrauen, Layout | S01, S04 |
| sdks, project_sdks | JDKs und andere Runtimes | S02, S31 |
| settings | global und pro Projekt, Schlüssel als Pfad | S29 |
| keybindings | Abweichungen vom Standard-Keymap | S36 |
| editor_states | offene Tabs, Carets, Splits | S05 |
| recent_files | Ctrl+E | S08 |
| run_configurations | Run/Debug-Konfigurationen | S16 |
| run_sessions | jeder Lauf | S17, S18 |
| test_results | Testbaum pro Lauf | S19 |
| breakpoints, watches | Debugger | S18 |
| bookmarks | Lesezeichen | S33 |
| changelists, changelist_files | Changelists | S21 |
| shelves | Shelve | S21 |
| history_entries, history_blobs | Local History, dedupliziert | S32 |
| data_sources | DB-Verbindungen | S28 |
| plugins | eigene Plugins | S30 |

Harte Constraints aus der Recon, in der Datenbank statt in der UI:

- ein Line-Breakpoint pro Zeile: `unique (project_id, file_path, line) where kind = 'line'`
- eine Datei in genau einer Changelist: Primärschlüssel `(project_id, file_path)`
- genau eine aktive Changelist: `unique (project_id) where active = 1`
- kein Shortcut doppelt im selben Kontext: `unique (shortcut, context)`. Konflikte (S36) zeigt die UI vor dem Speichern an
- Bookmark-Mnemonic eindeutig pro Projekt

Siehe `replica/schema.sql`.

## API

Es gibt keine HTTP-API. Die „Routen“ sind IPC-Kanäle zwischen Renderer und
Main: `invoke` für Anfrage/Antwort, `event` für Streams vom Main zum
Renderer. Alle Kanäle sind in einer gemeinsamen Datei typisiert
(`src/shared/ipc.ts`) und mit zod validiert. „who“ ist immer der Renderer,
eingeschränkt auf das geöffnete Projekt.

### Projekte und Dateien (F01, F02, F03, F04)

| channel | does | input | output | flow |
| --- | --- | --- | --- | --- |
| invoke `project.list` | Recent-Liste | – | Project[] | F01 |
| invoke `project.open` | Ordner öffnen, Vertrauen prüfen, Index starten | path | Project, needsTrust | F01 |
| invoke `project.trust` | Projekt als vertrauenswürdig markieren | projectId | ok | F01 |
| invoke `project.create` | aus Generator anlegen | generator, name, path, sdkId | Project | F03 |
| invoke `project.clone` | git clone mit Fortschritt | url, path | Project | F02 |
| invoke `project.close` / `project.remove` | schließen / aus Liste entfernen | projectId | ok | – |
| invoke `fs.readDir` | Baumknoten laden (lazy) | path | Entry[] | F01 |
| invoke `fs.readFile` / `fs.writeFile` | lesen, speichern (atomar) | path, content, expectedMtime | mtime | F04 |
| invoke `fs.create` / `fs.rename` / `fs.delete` / `fs.move` | Dateioperationen | paths | ok | F04 |
| event `fs.changed` | externe Änderungen vom Watcher | – | path[], kind | F04 |
| event `index.progress` | Indexing-Fortschritt (Statusleiste) | – | done, total | F01 |
| invoke `editorState.save` / `.load` | Tabs wiederherstellen | projectId, states | ok / states | F01 |

### Suche und Navigation (F04, F13)

| channel | does | input | output | flow |
| --- | --- | --- | --- | --- |
| invoke `search.everywhere` | Dateien, Symbole, Aktionen, Settings | query, tab | Result[] (gestreamt) | F04 |
| invoke `search.inFiles` | ripgrep, gestreamt, abbrechbar | query, regex, case, word, scope, mask | searchId | F13 |
| event `search.results` | Treffer-Chunks | – | searchId, matches[] | F13 |
| invoke `search.cancel` | ripgrep beenden | searchId | ok | F13 |
| invoke `search.replaceAll` | ersetzen mit Local-History-Eintrag vorher | searchId, replacement, selection | changedFiles | F13 |
| invoke `recentFiles.list` | Ctrl+E | projectId | RecentFile[] | F04 |

### Code-Intelligenz (F05, F06, F07)

LSP-Nachrichten laufen über einen Kanal-Tunnel, nicht über einzelne Kanäle:

| channel | does | input | output | flow |
| --- | --- | --- | --- | --- |
| invoke `lsp.start` | Server für Sprache starten oder wiederverwenden | projectId, languageId | sessionId, capabilities | F05 |
| invoke/event `lsp.message` | JSON-RPC in beide Richtungen (completion, definition, references, rename, codeAction, diagnostics, inlayHint, formatting ...) | sessionId, payload | payload | F05–F07 |
| event `lsp.status` | starting, ready, crashed | – | sessionId, status | – |
| invoke `lsp.restart` | Server neu starten | sessionId | ok | – |
| invoke `refactor.applyEdit` | WorkspaceEdit anwenden, vorher Local-History-Label | edit | changedFiles | F06 |

### Ausführen, Testen, Debuggen (F08, F09, F10)

| channel | does | input | output | flow |
| --- | --- | --- | --- | --- |
| invoke `runConfig.list` / `.save` / `.delete` | Konfigurationen | projectId, config | RunConfiguration | F08 |
| invoke `runConfig.fromContext` | temporäre Konfiguration aus Gutter-Klick | file, line | RunConfiguration | F08 |
| invoke `run.start` | Prozess starten (run/debug) | configId, mode | sessionId | F08, F09 |
| invoke `run.stop` | stoppen, nach Timeout killen | sessionId | ok | F08 |
| event `run.output` | stdout/stderr-Chunks | – | sessionId, stream, text | F08 |
| event `run.status` | Statuswechsel, Exit-Code | – | sessionId, status, exitCode | F08 |
| event `test.event` | Test gestartet/fertig | – | sessionId, TestResult | F10 |
| invoke `test.rerunFailed` | fehlgeschlagene erneut laufen lassen | sessionId | newSessionId | F10 |
| invoke/event `dap.message` | DAP-Tunnel (setBreakpoints, stackTrace, variables, evaluate, step...) | sessionId, payload | payload | F09 |
| invoke `breakpoint.list` / `.toggle` / `.update` | Breakpoints | projectId, bp | Breakpoint | F09 |
| invoke `watch.list` / `.save` / `.delete` | Watches | projectId, expr | Watch | F09 |
| invoke `pty.create` / `pty.write` / `pty.resize` / `pty.kill`, event `pty.data` | Terminal | shell, cwd, cols, rows | ptyId / data | – |

### Git (F02, F11, F12)

| channel | does | input | output | flow |
| --- | --- | --- | --- | --- |
| invoke `git.status` | geänderte Dateien | projectId | FileStatus[] | F11 |
| invoke `git.diff` | Inhalt für Diff-Viewer | path, ref | left, right | F11 |
| invoke `git.commit` | committen (optional amend), Hooks laufen | files, message, amend | sha | F11 |
| invoke `git.push` / `.pull` / `.fetch` | Remote-Operationen | remote, branch | result | F11 |
| invoke `git.log` | Log seitenweise mit Graph-Daten | filters, cursor | Commit[], next | F12 |
| invoke `git.branches` / `.checkout` / `.createBranch` | Branches | name | ok | F12 |
| invoke `git.conflicts` / `.resolve` | Konflikte lesen, Ergebnis schreiben | path, content | ok | F12 |
| invoke `git.resolveSimple` | alle einfachen Konflikte automatisch | – | resolved[], remaining[] | F12 |
| invoke `git.blame` | Inline-Blame | path | BlameLine[] | – |
| invoke `changelist.*` | Changelists anlegen, Dateien verschieben | ... | Changelist | F11 |
| event `git.changed` | Repo-Zustand geändert (Watcher auf .git) | – | projectId | F11 |

### Build-Tools (F01)

| channel | does | input | output | flow |
| --- | --- | --- | --- | --- |
| invoke `build.detect` | Gradle/Maven/npm erkennen | projectId | tool | F01 |
| invoke `build.sync` | Projektmodell laden | projectId | Model, errors | F01 |
| invoke `build.tasks` / `build.runTask` | Tasks anzeigen und ausführen | task | sessionId | – |

### Settings, Keymap, Local History (F14, F15)

| channel | does | input | output | flow |
| --- | --- | --- | --- | --- |
| invoke `settings.get` / `.set` / `.reset` | Einstellungen | scope, key, value | value | F14 |
| invoke `keymap.get` / `.set` / `.conflicts` | Shortcuts | actionId, shortcut | Keybinding, conflicts | F14 |
| invoke `history.list` / `.content` / `.revert` / `.label` | Local History | path, entryId | Entry[] / content | – |
| invoke `plugins.list` / `.install` / `.toggle` | eigene Plugins | id | Plugin | F15 |

Webhooks in: keine. Webhooks out: keine.
Netzwerk nur, wenn der Nutzer es auslöst: git-Remote, Clone, Download eines
JDK oder Language Servers, optional ein KI-Chat mit eigenem API-Key.

Jobs (im Main-Prozess, kein externer Scheduler):

| job | wann | was |
| --- | --- | --- |
| history.snapshot | bei jedem Speichern und vor Refactorings, Replace All, git checkout | Stand der Datei als Blob ablegen |
| history.prune | beim Start und alle 6 h | Einträge älter als 5 Tage (Setting) löschen, verwaiste Blobs entfernen |
| editorState.flush | 2 s nach letzter Änderung, beim Schließen | Tabs und Carets speichern |
| index.reconcile | beim Öffnen, nach Watcher-Überlauf | Dateiliste neu einlesen |
| lsp.healthcheck | alle 30 s | abgestürzte Server neu starten (max. 3-mal in 5 min) |
| git.autoFetch | alle 15 min, wenn aktiviert | `git fetch` im Hintergrund |

## The parts that bite

- **Prozesse und Absturz:** Language Server, Debug-Adapter und Builds stürzen ab oder hängen. Jeder Kindprozess hat Timeouts, Neustart mit Backoff und wird beim Schließen des Projekts sicher beendet. Unter Windows beendet nur ein Kill des ganzen Prozessbaums auch Gradle-Daemons und Kinder.
- **Race: Editor gegen Platte.** Datei ändert sich extern, während sie im Editor ungespeichert offen ist. Schreiben mit `expectedMtime`: stimmt sie nicht, zeigt die UI den Dialog „Datei wurde extern geändert“ mit Diff statt still zu überschreiben.
- **Race: LSP-Versionen.** Antworten auf veraltete Dokumentversionen verwerfen (Versionsnummer im `didChange`). Sonst springen Quick-Fixes an falsche Stellen.
- **Atomares Speichern:** in eine Temp-Datei schreiben, dann umbenennen. Encoding und Zeilenende der Datei beibehalten (S35).
- **Große Repos:** Watcher-Limits unter Linux (`inotify`), `node_modules`/`build` ausschließen, Index lazy aufbauen. Dateien über ca. 20 MB nur read-only ohne Highlighting öffnen.
- **Riesige Ausgaben:** Run-Konsole und Suchergebnisse streamen und begrenzen (Ringpuffer, z. B. 100k Zeilen), sonst friert der Renderer ein.
- **Idempotenz:** Rerun und Doppelklick auf Run dürfen keine zwei Sessions für dieselbe Single-Instance-Konfiguration starten. Refactoring-Edits nur einmal anwenden (Edit-ID merken).
- **Sicherheit beim Öffnen fremder Projekte:** Gradle-Skripte, npm-Skripte und git-Hooks führen Code aus. Vor dem Vertrauen (`projects.trusted = 0`) läuft kein Build-Sync, kein Language Server mit Build-Ausführung und keine Run-Konfiguration. Das ist F01s „Trust project“-Dialog.
- **Pfade:** Windows-Laufwerke, Groß-/Kleinschreibung auf macOS, Symlinks. Pfade normalisieren und immer prüfen, dass sie unter dem Projekt-Root liegen.
- **Zeit:** nur Zeitstempel in UTC für Historie und Läufe, angezeigt in lokaler Zeit. Keine Termin-Logik, also keine Sommerzeit-Probleme.
- **Keymaps je Betriebssystem:** Ctrl gegen Cmd, Alt+Zahl kollidiert unter macOS mit Sonderzeichen. Zwei Standard-Keymaps (Windows/Linux, macOS).
- **Geheimnisse:** Tokens und Passwörter nur in der OS-Keychain. Umgebungsvariablen von Run-Konfigurationen sind Klartext, in der UI kennzeichnen.
- **DSGVO:** nicht relevant. Keine Daten verlassen das Gerät, keine Telemetrie.

## Build order

1. **Vertical slice** (Ziel: Projekt öffnen, Java-Datei bearbeiten, mit Completion, ausführen, Ausgabe sehen)
   - screens: S01, S04, S05, S06, S10, S17, S35
   - tables: projects, settings, editor_states, run_configurations, run_sessions
   - channels: `project.list/open/trust`, `fs.readDir/readFile/writeFile`, `fs.changed`, `lsp.start`, `lsp.message`, `runConfig.fromContext`, `run.start/stop`, `run.output/status`
   - beweist: Electron + Monaco + JDT LS + Prozessverwaltung + SQLite
2. **Must-haves** (30 in `features.csv`), nach Bereich:
   - **Editor und Navigation:** Tabs, Multi-Cursor, Folding, Find/Replace, Search Everywhere (S08), Find/Replace in Files (S09), Restore Layout. Tabellen: recent_files. Kanäle: `search.*`, `editorState.*`
   - **Code-Intelligenz:** Definition, Usages (S14), Diagnostics, Problems (S15), Quick-Fix (S11), Rename (S13). Kanäle: `lsp.*`, `refactor.applyEdit`
   - **Ausführen und Debuggen:** Run-Konfigurationen (S16), Konsole mit Stacktrace-Links, Terminal (S20), Breakpoints, Steps, Variables (S18). Tabellen: breakpoints. Kanäle: `runConfig.*`, `dap.*`, `pty.*`
   - **Git:** Commit-Fenster (S21), Diff (S23). Kanäle: `git.status/diff/commit`
   - **Settings:** Settings-Dialog (S29), Keymap (S36). Tabellen: keybindings. Kanäle: `settings.*`, `keymap.*`
3. **Should-haves** (30), in dieser Reihenfolge, weil spätere darauf aufbauen:
   1. Dockview-Layout und Themes, Statusleiste, Notifications
   2. Structure (S07), Breadcrumbs, Inlay Hints, Quick Doc, Parameter Info, Formatieren, Optimize Imports
   3. Test-Runner (S19) mit Rerun und Assertion-Diff (Tabelle test_results)
   4. Conditional Breakpoints, Logpoints, Evaluate, Watches (Tabelle watches)
   5. Git: Log (S22), Branches (S25), Push/Pull, Merge (S24), Gutter-Marker, Blame
   6. Local History (S32, Tabellen history_*)
   7. New Project Wizard (S02), Clone (S03)
   8. Gradle/Maven-Integration (S26). Das ist der riskanteste Teil, deshalb mit eigenem Spike vorher
   9. Extract-, Change-Signature- und Move-Refactorings mit Vorschau, soweit die Language Server sie liefern
4. **Could-haves** (22), je nach Lust: Bookmarks, TODO, Scratch Files, Live Templates, weitere Sprachen, Shelve, Services, Docker, Datenbank-Fenster, HTTP-Client, Markdown-Vorschau, Coverage, Plugin-API, KI-Chat mit eigenem Key.
5. **Fixes aus `/replica-entrepreneur`:** noch offen. Für ein Lernprojekt optional, aber nützlich: Nutzer beklagen sich bei IntelliJ oft über Speicherverbrauch und Indexing-Zeiten. Das wäre ein guter Fokus für die eigene Version.

## Risiken

1. **Qualität der Code-Intelligenz:** Mit LSP bleibt man klar unter IntelliJ, vor allem bei Refactorings. Erwartung: 60–70 %. Früh mit JDT LS an einem echten Projekt messen.
2. **Gradle/Maven-Sync:** Projektmodelle sind komplex, Fehlerfälle zahlreich. Erst JDT LS den Import machen lassen (es kann Gradle/Maven selbst), eigener Build-Service nur für das Tool-Fenster.
3. **Performance in Electron:** Speicher und Startzeit. Messen ab dem Vertical Slice: Kaltstart unter 3 s, Tippen unter 16 ms Latenz in einer 10k-Zeilen-Datei.
