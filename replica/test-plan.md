# Test plan: Mini-IDEA

Build: see the commit of this file  Date: 2026-11-03  Env: local Electron 45.2.1 under Xvfb, Linux,
JDK 21, JDT LS 1.61.0, throwaway copies of `tests/fixtures/hello-java` (and `npm run seed` for manual runs).

Automated = Playwright for Electron (`apps/mini-idea/tests/e2e/`), every spec fails on page/console
errors, axe scans on welcome, trust dialog, workspace and workspace with run panel.
Unit = `apps/mini-idea/tests/unit/` (node:test).

Web-app edge cases from the skill list mapped to a desktop IDE: "refresh mid-flow" = Ctrl+R /
window reload, "back button" = going back to the welcome screen, "second user's data" = a second
project, "two tabs at once" = double Run / two projects, "slow network / offline" = the language
server being slow or gone, "mobile width" = not applicable (minimum window 800×500).

Result column: **pass**, **fail → BUG-nnn**, **n/b** (flow not built yet), **manual** (in the manual list).

## Built flows

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F01-H1 | open project | happy | welcome → Ordner öffnen → Vertrauen | tree shows project; welcome, dialog, workspace pass axe | e2e f01 | |
| F01-E1 | | edge: empty folder | open an empty folder | "Dieser Ordner ist leer." | e2e f01 | |
| F01-E2 | | edge: spaces, umlauts, emoji in path | open `Mein Projekt ü 🚀`, type an error | error counter shows ≥ 1 | e2e f01 | |
| F01-E3 | | edge: restart | open 2 files, quit, start again, open from list | both tabs back, last one active, no trust prompt | e2e f01 | |
| F01-E4 | | edge: switch project ("back button") | A: open Main.java → back → B: open Main.java | editor shows B's file | e2e f01 | |
| F01-E5 | | edge: untrusted (safe mode) | open → Sicherer Modus → Shift+F10 | run disabled, message shown, no language server | e2e vertical-slice | |
| F01-E6 | | edge: keyboard only | Tab to list, Enter; dialog default button Enter | opens without mouse | e2e vertical-slice | |
| F01-N1 | | negative: deleted folder | recent project whose folder was removed | alert "konnte nicht geöffnet werden", no crash | e2e f01 | |
| F01-N2 | | negative: path escape | renderer asks for `../`, abs path, sibling prefix, symlink out | refused | unit project | |
| F04-H1 | edit a file | happy | open Main.java, type umlauts + emoji, Ctrl+S | file on disk has the text, dirty marker gone | e2e f04 | |
| F04-H2 | | happy: keyboard tree | arrows + Enter in tree | file opens | e2e vertical-slice | |
| F04-E1 | | edge: close dirty tab | type, click × | confirm; cancel keeps tab | e2e f04 | |
| F04-E2 | | edge: external change, clean file | change file on disk | editor reloads | e2e f04 | |
| F04-E3 | | edge: external change, dirty file | type, change on disk, Ctrl+S | conflict prompt, cancel keeps disk | e2e f04 + unit | |
| F04-E4 | | edge: refresh mid-flow | type, Ctrl+R | no reload, edits kept | e2e f04 | |
| F04-E5 | | edge: quit with unsaved edits | type, close window | in-app prompt: cancel keeps working, save-all saves and quits | e2e f04 | |
| F04-E6 | | edge: keyboard only | Alt+1 twice, Escape | tree hides/shows and focuses, Escape back to editor | e2e f04 | |
| F04-E7 | | edge: very long file name | 60-char file name | tab truncates, full name in tooltip | manual | |
| F04-E8 | | edge: big file | 25 MB file | refused with message, no freeze | manual | |
| F05-H1 | see and fix an error | happy (display only) | type invalid code | squiggle + counter, gone after fixing | e2e vertical-slice | |
| F05-H2 | | happy: quick fix (Alt+Enter) | | | – | n/b |
| F07-H1 | go to definition | happy | F12 on `Greeter` | Greeter.java opens, selected | e2e vertical-slice | |
| F07-E1 | | edge: symbol in JDK | F12 on `String` | nothing breaks (no tab for jar contents yet) | manual | |
| F07-H2 | | find usages (Alt+F7) | | | – | n/b |
| F08-H1 | run | happy | Shift+F10 | output, "Prozess beendet mit Code 0" | e2e vertical-slice | |
| F08-E1 | | edge: endless program | run `while(true)`, Stop | "Prozess gestoppt.", status gestoppt | e2e f08 | |
| F08-E2 | | edge: compile error | run code with a type error | "Kompilieren fehlgeschlagen", javac message, non-zero code | e2e f08 | |
| F08-E3 | | edge: exception | run code that throws | stack trace, link `Main.java:6` jumps to line 6 | e2e f08 | |
| F08-E4 | | edge: double submit | click Run twice fast | one finished run, no leaked output from the replaced run | e2e f08 | |
| F08-E5 | | edge: non-ASCII output | print `Grüße aus Köln 🚀 – €` | shown intact | e2e f08 | |
| F08-E6 | | edge: program reads stdin | `Scanner(System.in).nextLine()` | can type input, or at least Stop works | manual | |
| F08-N1 | | negative: untrusted | safe mode → Shift+F10 | blocked in main and UI | e2e vertical-slice + unit | |
| F08-N2 | | negative: no JDK on PATH | run with PATH without java | clear message, no hang | manual | |

## Flows not built yet

| flow | cases | result |
| --- | --- | --- |
| F02 clone repository | H1, E auth, E folder exists, N network | n/b |
| F03 new project | H1, E no JDK, N invalid name | n/b |
| F06 rename symbol | H1, E name conflict, E read-only | n/b |
| F09 debug | H1, E breakpoint never hit, E conditional, E logpoint | n/b |
| F10 run tests | H1, E rerun failed, E assertion diff | n/b |
| F11 commit and push | H1, E nothing to commit, E hook fails, N push rejected | n/b |
| F12 branch and merge | H1, E local changes, E complex conflict | n/b |
| F13 find/replace in files | H1, E regex error, E huge result | n/b |
| F14 settings / keymap | H1, E shortcut conflict | n/b |
| F15 install plugin | H1, E incompatible | n/b |

## Manual pass

To do by hand on a real desktop (cannot be judged headless): F04-E7 long names, F04-E8 big file,
F07-E1 JDK symbol, F08-E6 stdin, F08-N2 no JDK, high-DPI rendering, a real screen reader (Orca /
NVDA / VoiceOver) through welcome → tree → editor → run.
