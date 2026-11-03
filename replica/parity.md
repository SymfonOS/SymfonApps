# Parity: Mini-IDEA vs IntelliJ IDEA

Date: 2026-11-03  Build: `126fd5d`  Matrix: `replica/features.csv` (91 rows, 82 scored, 9 skipped on purpose)

## Verdict: not shippable

| check | result |
| --- | --- |
| overall score | **25.3 / 100** (feature score only, see layout below) |
| must-haves | **12 of 30 done**, 3 partial, 15 missing |
| open S1 bugs | none |
| open S2 bugs | **1** (BUG-012: no Java diagnostics in projects with non-ASCII paths) |
| fixes from `/replica-entrepreneur` | not run yet |

Not shippable on two counts: 18 must-haves are not done, and an S2 is open. For a learning
project "shippable" is not the goal, but the number is still the honest measure of how much of
the original's everyday job Mini-IDEA can do: about a quarter.

What the 25 % is: open a plain Java project, browse it, edit with completion, errors and hover,
jump to definitions, run a class and read the output. That is the core loop from the recon map,
end to end. Everything around it (search, refactoring, Git, debugger, tests, settings) is not built.

## Layout score: not measured

`imgdiff.py` needs a screenshot of the original and of the clone at the same viewport and state.
`replica/screens/` is empty: this environment cannot reach jetbrains.com and has no IntelliJ
installation, and recon said so. The clone's screenshots are in `replica/clone-screens/`
(S01, S04/S05, S05 diagnostics, S10, S17; 1440×900, Electron, dark).

To get the layout score: take the matching IntelliJ screenshots in your own installation, same
window size, same state (Welcome with three recent projects; `hello-java` open with Main.java;
completion popup after `greeter.gr`; Run tool window after a run), save them as
`replica/screens/S01.png`, `S04-S05.png`, `S10.png`, `S17.png`, then:

```bash
for s in S01 S04-S05 S10 S17; do python3 imgdiff.py replica/screens/$s.png replica/clone-screens/$s.png --json > replica/diffs/$s.json; done
python3 parity.py replica/features.csv --visual replica/diffs/*.json --markdown > replica/parity.md
```

Expectation, not a measurement: structure is close where it was copied as a pattern
(tool window stripe left, tree, tabs above editor, run panel below, status bar); it differs in the
main toolbar (no main menu, no run-configuration widget, no branch widget) and on the welcome
screen (no Customize / Plugins / Learn sections).

## Behaviour differences

Compared against IntelliJ's behaviour as described in its public documentation (recon map,
sources 2–6), not against a live session. "Clicks" counts mouse clicks on the happy path.

| flow | original does | clone does | fix or keep |
| --- | --- | --- | --- |
| F01 open project | Open → pick folder → Trust dialog with Preview mode; detects Gradle/Maven and imports | same three steps; "Sicherer Modus" instead of preview; plain folders only, Gradle/Maven not imported | keep the flow; build S26 import |
| F01 restart | restores tabs, carets, tool window layout, scroll | restores tabs and the active tab only | fix (partial row): caret, scroll, layout |
| F01 project switch | each project in its own window | one window, back to the welcome screen in between | keep for now (single window is simpler); BUG-001 fixed the data risk |
| F04 find a file | Shift Shift, type, Enter: 0 clicks | tree only: 1–4 clicks or arrow keys | fix: Search Everywhere (pack 2) |
| F04 quit with unsaved edits | saves automatically (no unsaved state at all) | asks: save all / discard / cancel | keep for now; consider auto-save later, it removes the whole class of BUG-002 |
| F05 fix an error | Alt+Enter quick fixes | error shown, no fixes | fix: pack 1 |
| F07 go to definition | Ctrl+B / Ctrl+click, also into JDK sources | F12 / Ctrl+click inside the project; JDK symbols do not open | fix later (needs decompiled/source jar view) |
| F08 run | gutter icon opens a small menu (Run / Debug / Coverage): 2 clicks | gutter icon runs at once: 1 click | **keep, it is faster**; add the menu when Debug exists |
| F08 run twice | asks or restarts depending on "allow multiple instances" | restarts, old output dropped (BUG-005 fixed) | keep |
| F08 output | console accepts stdin input | no input; programs reading stdin wait until stopped | fix: console input |
| F08 non-UTF-8 systems | sets UTF-8 for console and compiler | same since BUG-003/004 fixes | done |
| everyday Git, debug, tests | built in | missing | packs 3, 6 and test runner |

## Top five things to build next

Ordered by must-haves per unit of work; simulated with `parity.py` on a copy of the matrix:

| # | package | must-haves | parity after (cumulative) | why this order |
| --- | --- | --- | --- | --- |
| 1 | **LSP pack:** Find Usages (S14), Problems (S15), Quick-Fix (S11), Rename (S13) | +4 | 32.3 | JDT LS already delivers all four; mostly client code and three small tool windows |
| 2 | **Search:** Search Everywhere (S08), Find / Replace in Files (S09) | +3 | 37.5 | ripgrep + `workspace/symbol`; biggest speed gain in daily use (F04 from clicks to 0) |
| 3 | **Git:** Commit tool window (S21), Diff viewer (S23) | +2 | 41.0 | git CLI + Monaco's diff editor; unlocks the rest of the VCS area (0 % today) |
| 4 | **Settings + Keymap** (S29, S36) | +2 | 44.5 | needed for the theme switch and to make Ctrl+F4 / Alt+1 etc. configurable |
| 5 | **Run configurations editor (S16) + Terminal (S20)** | +2 | 48.0 | terminal needs node-pty (native module): test the install path on all three OSes first |

After that: debugger via DAP (+2 musts, 51.5), then the remaining partials (implementation
navigation, tree file operations, full state restore), then the should-haves. And BUG-012 (S2)
before any of it counts as "shippable".

Next step: `/replica-build` for pack 1. `/replica-entrepreneur` makes sense once the must-haves are
in; for a learning project it can also run now to pick which IntelliJ pain points to design around
(memory use and indexing time are the usual ones).

---

## Parity: 25.3 / 100

features 25.3  (82 counted, must-haves 12 of 30 done)

Not shippable yet: 18 must-have features are not done.

## By area, weakest first
- search                         0.0  (2 features)
- refactoring                    0.0  (4 features)
- tools                          0.0  (4 features)
- debug                          0.0  (6 features)
- vcs                            0.0  (10 features)
- testing                        0.0  (3 features)
- build                          0.0  (1 features)
- performance                    0.0  (1 features)
- database                       0.0  (1 features)
- plugins                        0.0  (1 features)
- ai                             0.0  (1 features)
- settings                      11.1  (4 features)
- navigation                    12.5  (6 features)
- layout                        16.7  (3 features)
- code intelligence             31.5  (12 features)
- editor                        57.7  (12 features)
- run                           60.0  (4 features)
- projects                      61.8  (7 features)

## Missing, in build order
- [must] code intelligence: Find usages, no  (S14 via LSP)
- [must] code intelligence: Problems tool window, no  (S15)
- [must] code intelligence: Quick fixes (Alt+Enter), no  (LSP code actions)
- [must] debug: Line breakpoints and step over/into/out, no  (via DAP)
- [must] debug: Variables and call stack view, no  (S18)
- [must] navigation: Search Everywhere (files classes symbols actions), no  (S08 fuzzy matching)
- [must] refactoring: Rename refactoring across project, no  (LSP rename)
- [must] run: Run configurations editor, no  (S16)
- [must] search: Find in Files with regex scope and mask, no  (S09 ripgrep)
- [must] search: Replace in Files with preview, no
- [must] settings: Keymap with customizable shortcuts, no  (S36)
- [must] settings: Settings dialog with search, no  (S29)
- [must] tools: Integrated terminal, no  (S20 xterm.js + pty)
- [must] vcs: Commit tool window with file selection, no  (S21)
- [must] vcs: Diff viewer side by side, no  (S23)
- [must] code intelligence: Go to definition and implementation, partial  (via LSP; definition (F12, Ctrl+click, opens tab); no go to implementation)
- [must] navigation: Project tool window file tree, partial  (S06 create rename delete move; browse, open, keyboard, live refresh; no create/rename/delete/move yet)
- [must] projects: Restore open tabs and layout on reopen, partial  (EditorState; tabs and active tab restored; caret, scroll and tool window layout not yet)
- [should] build: Maven and Gradle import and tool window, no  (S26 hard part)
- [should] code intelligence: Optimize imports, no
- [should] code intelligence: Parameter info, no  (LSP signature help)
- [should] debug: Conditional breakpoints and logpoints, no  (Logpoints new in 2026.2)
- [should] debug: Evaluate expression and watches, no
- [should] editor: Breadcrumbs, no
- [should] editor: Code formatting (Reformat Code), no  (LSP formatting)
- [should] editor: Inlay hints for parameters and types, no  (LSP inlay hints)
- [should] editor: Split editor horizontally and vertically, no
- [should] layout: Dockable tool windows (left right bottom floating), no
- [should] layout: Notifications and background tasks in status bar, no  (S33 S35)
- [should] navigation: Recent files and recent locations, no  (Ctrl+E)
- [should] navigation: Structure tool window, no  (S07 LSP document symbols)
- [should] performance: Indexing for large projects, no
- [should] projects: Clone from Git URL, no  (S03)
- [should] projects: New project wizard with generators, no  (S02)
- [should] refactoring: Change signature and move refactorings, no  (hardest refactorings; partly LSP)
- [should] refactoring: Extract variable method constant, no  (LSP code actions; quality depends on server)
- [should] refactoring: Refactoring preview with conflicts, no
- [should] testing: Assertion diff for failed tests, no
- [should] testing: Test runner tree with rerun failed, no  (S19)
- [should] vcs: Branches popup checkout create, no  (S25)
- [should] vcs: Git log graph with filters, no  (S22)
- [should] vcs: Gutter change markers and inline blame, no
- [should] vcs: Local history, no  (S32)
- [should] vcs: Push pull fetch, no
- [should] vcs: Three-way merge conflict resolver, no  (S24 incl. resolve all simple conflicts)
- [should] code intelligence: Quick documentation popup, partial  (LSP hover; hover docs; no Ctrl+Q popup)
- [should] layout: Status bar widgets (encoding line ending caret), partial  (S35; path, LSP state, problems, caret; encoding static, no widgets clickable)
- [should] settings: Light and dark theme, partial  (own palette; both token sets exist; no switch in UI yet, app runs dark)
- [could] ai: AI chat and completion with own API key, no  (e.g. Claude API; not JetBrains AI)
- [could] code intelligence: Multi-language support beyond JVM, no  (swap in more language servers)
- [could] code intelligence: Spellchecking in code and comments, no
- [could] code intelligence: Terraform and TypeScript 7 support, no  (2026.2; via language servers)
- [could] database: Database tool window with SQL console, no  (S28 basic version is in free tier)
- [could] debug: Remote debugging (attach to JVM), no
- [could] debug: Thread and frame view for multiple threads, no
- [could] editor: Live templates and postfix completion, no
- [could] editor: Markdown preview, no
- [could] editor: Scratch files, no
- [could] navigation: Bookmarks with mnemonics, no  (S33)
- [could] navigation: TODO tool window, no
- [could] plugins: Plugin system with own extension API, no  (own API only)
- [could] projects: Project Structure dialog (modules SDKs libraries), no  (S31)
- [could] run: Services tool window, no  (S27)
- [could] settings: Settings import export, no
- [could] testing: Code coverage, no
- [could] tools: Docker and Docker Compose integration, no
- [could] tools: HTTP client (.http files), no
- [could] tools: Kubernetes integration, no
- [could] vcs: GitHub GitLab pull requests, no  (official APIs)
- [could] vcs: Shelve and changelists, no

## Left out on purpose (not scored)
- IntelliJ PSI-level Java and Kotlin analysis: 20+ years of engine work; replaced by open language servers
- JetBrains Marketplace plugins: their ecosystem and partner network
- JetBrains Account licensing and Toolbox: their infrastructure
- Settings sync via JetBrains cloud: their infrastructure
- JetBrains AI Assistant and Junie: their models and service; own AI row above instead
- Code With Me and Remote Development: their infrastructure
- Spring Jakarta EE deep framework support: Ultimate depth; separate L project each
- Profiler (async-profiler integration UI): separate L project
- IntelliJ name logo icons and New UI look 1:1: trademarks and assets; own icons and palette
