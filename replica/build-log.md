# Build log: Mini-IDEA

App: `apps/mini-idea/`. Plan: `replica/architecture.md` → Build order 1 (vertical slice).
Parity after this round: **25.3 / 100**, must-haves 12 of 30 done, 3 partial (`parity.py`).

| ID | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- |
| S01 Welcome | 2026-11-03 | done | Customize/Plugins/Learn nav entries (later screens), Clone and New Project buttons (S02, S03) | – |
| S01 Trust dialog | 2026-11-03 | done | "trust all projects in folder" option | – |
| S04 Main window | 2026-11-03 | partial | Dockview docking (fixed layout for now), branch widget, run config widget, main menu, search button | – |
| S05 Editor | 2026-11-03 | partial | split editor, breadcrumbs, inlay hints, preview tabs, Ctrl+Tab switcher, caret/scroll restore across restarts | Monaco 0.57 worker path (export map) |
| S06 Project tree | 2026-11-03 | partial | create/rename/delete/move, speed search, Packages/Scratches views | – |
| S10 Completion | 2026-11-03 | done (Java) | completion item resolve (lazy docs), postfix/live templates | **JDT LS:** newest builds need Java 25; pinned 1.61.0 for Java 21. Plain folders needed explicit `java.project.sourcePaths`, else every `package` line is an error |
| S12 Quick doc | 2026-11-03 | partial | Ctrl+Q popup (hover works) | – |
| S17 Run tool window | 2026-11-03 | partial | multiple run tabs, run history, Gradle/Maven/JUnit run types, ANSI colours | – |
| S35 Status bar | 2026-11-03 | partial | clickable widgets (line ending, encoding, indent), background task progress | – |

Not started: S02, S03, S07–S09, S11, S13–S16, S18–S34, S36. They are not stubbed: a desktop IDE has
no routes, and an empty tool window that does nothing is worse than none. Each arrives with its feature.

## Definition of done, how it applies here

- **390px / 1440px:** a desktop IDE has a minimum window of 800×500 (set in `BrowserWindow`). Checked at 1440×900 only.
- **Keyboard only:** the e2e test opens the project, walks the tree, edits, completes, jumps to a definition and runs, all by keyboard (one click on the tree item and one on a tab to keep the test readable).
- **No console errors:** asserted in both e2e tests.
- **Copy:** every label and message was written fresh, in German.
- **Screenshots:** `replica/clone-screens/` (S01-empty, S01-trust, S04-S05-editor, S04-safe-mode, S05-diagnostics, S10-completion, S17-run). There are no reference screenshots of the original yet, so `/replica-diff` can score features but not layout.

## Decisions taken during the build

- **No native modules.** `node:sqlite` (built into Electron 38's Node 22) instead of better-sqlite3, so no rebuild against Electron's ABI. It prints an ExperimentalWarning.
- **esbuild + Vite instead of electron-vite**, fewer moving parts.
- **Minimal own LSP client** instead of `monaco-languageclient` (which pulls in the VS Code API layer). Covers sync, diagnostics, completion, hover, definition. Rename, code actions, references come with S11/S13/S14.
- **Run = javac + java** on the detected source root, output to `.mini-idea/classes` in the project. Enough for the slice; Gradle/Maven runs come with S26.
- **Run tool window is called "Ausgabe"** so the Run button and the tool window toggle have different accessible names.
- **Tailwind spacing keys are pixel values** (`p-12` = 12px) mapped to the space tokens; the first preset used indexes, which would have made every spacing class wrong.

## Next

Must-haves in architecture order: Search Everywhere (S08) and Find in Files (S09) with ripgrep, then Find Usages (S14), Problems (S15), Quick-Fix (S11), Rename (S13), Run configurations editor (S16), Terminal (S20, needs node-pty: a native module, see risk below), Debugger (S18 via DAP), Commit + Diff (S21, S23), Settings + Keymap (S29, S36).

Risk: **node-pty is native.** Its prebuilt binaries come from GitHub releases, which this cloud container cannot reach. On a normal machine `npm install` handles it; in CI it may need `electron-rebuild`.
