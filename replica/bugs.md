# Bugs: Mini-IDEA

Found by `/replica-test` on 2026-11-03, build `ff6305f`, Electron 45.2.1 under Xvfb (Linux, POSIX locale),
window 1440×900. Every bug below was reproduced; failing test names are the evidence.

| ID | sev | title | status |
| --- | --- | --- | --- |
| BUG-001 | S1 | Switching projects shows the previous project's file; saving can overwrite the new project's file | open |
| BUG-002 | S1 | Closing the window with unsaved edits quits without asking; edits are lost | open |
| BUG-003 | S2 | Java language server crashes for project paths with non-ASCII characters when the locale is not UTF-8 | open |
| BUG-004 | S3 | Non-ASCII program output shows as `?` | open |
| BUG-005 | S3 | Run twice quickly: "Prozess gestoppt." of the replaced run leaks into the new output | open |
| BUG-006 | S3 | Stack-trace link to the file that is already open does not jump to the line | open |
| BUG-007 | S3 | Alt+1 shows the project tree but does not focus it; tree loses its expanded folders when hidden | open |
| BUG-008 | S3 | Interactive elements nested in tabs and list options (screen readers cannot reach close / remove) | open |
| BUG-009 | S4 | Landmark and heading structure: no `main`, no `h1`, `toolbar` role on `header`/`nav` | open |
| BUG-010 | – | ~~Status bar shows nothing when the language server keeps crashing~~ | withdrawn: not reproducible |
| BUG-011 | S4 | Language server keeps running for 10–30 s after the app has quit | open |
| BUG-012 | S2 | In projects with non-ASCII paths, Java diagnostics never arrive for open files | open |

---

### BUG-001: Switching projects shows the previous project's file; saving can overwrite the new project's file

- Severity: S1 (data loss)
- Flow / case: F01 / F01-E4
- Screen: S05
- Build: ff6305f  Device: Electron 45, 1440px

Steps
1. Open project A, open `src/com/example/Main.java`.
2. Click the project name (back to the welcome screen).
3. Open project B, which also has `src/com/example/Main.java` with different content.
4. Press Ctrl+S, confirm the "changed outside" prompt.

Expected: B's `Main.java` is shown; saving writes B's content.
Actual: A's `Main.java` is shown under B's tab. Ctrl+S says the file "wurde außerhalb von Mini-IDEA geändert"; confirming writes A's content into B's file.
Evidence: test `F01-E4` fails ("editor must show B's Main.java"); manual repro script confirmed B's file contained A's code after confirming.
Suspected cause: the renderer's model cache (`actions.ts`) is keyed by project-relative path and never cleared when the project changes; the language server client of A also stays attached.
Status: open

### BUG-002: Closing the window with unsaved edits quits without asking; edits are lost

- Severity: S1 (data loss)
- Flow / case: F04 / F04-E5
- Screen: S04

Steps
1. Open a file, type something, do not save.
2. Close the window (window button, Alt+F4, or `BrowserWindow.close()`).

Expected: a prompt: save all / discard / cancel.
Actual: the app quits at once; the edit is not on disk.
Evidence: test `F04-E5` fails (no dialog); repro script: "app quit | edit on disk: false".
Suspected cause: no `close` handling in main, no unsaved-changes check in the renderer.
Status: open

### BUG-003: Java language server crashes for non-ASCII project paths when the locale is not UTF-8

- Severity: S2 (code intelligence broken for those projects, no workaround in the app)
- Flow / case: F01 / F01-E2
- Screen: S04, S35

Steps
1. Start the app with a non-UTF-8 locale (here: POSIX in a container; also Linux desktops and services started without `LANG`). Windows and macOS handle file names differently and were not tested.
2. Open a folder named `Mein Projekt ü 🚀` and trust it.

Expected: "Java bereit", diagnostics work.
Actual: JDT LS exits 4 times (initial + 3 restarts), then stays off.
Evidence: test `F01-E2` times out waiting for "Java bereit"; JDT LS log: `java.nio.file.InvalidPathException: Malformed input or input contains unmappable characters: …/Mein Projekt �� ����`.
Suspected cause: the JVM derives `sun.jnu.encoding` from the locale; child processes inherit the app's locale.
Status: open

### BUG-004: Non-ASCII program output shows as `?`

- Severity: S3
- Flow / case: F08 / F08-E5
- Screen: S17

Steps: run a program printing `Grüße aus Köln 🚀 – €`.
Expected: printed as is. Actual: `Gr??e aus K?ln ? ? ?`.
Evidence: test `F08-E5`.
Suspected cause: same as BUG-003 (JVM `stdout.encoding` follows the locale; macOS apps started from Finder usually get no `LANG` either, not tested); javac also reads sources in the platform encoding.
Status: open

### BUG-005: Run twice quickly: output of the replaced run leaks into the new one

- Severity: S3
- Flow / case: F08 / F08-E4
- Screen: S17

Steps: click Run twice in quick succession.
Expected: one clean output of the new run. Actual: output starts with "Prozess gestoppt." from the replaced run.
Evidence: test `F08-E4` ("output of the replaced run must not leak in").
Suspected cause: while a new run is starting the renderer has no session id yet and accepts output from any session.
Status: open

### BUG-006: Stack-trace link to the already open file does not jump to the line

- Severity: S3
- Flow / case: F08 / F08-E3
- Screen: S17 → S05

Steps: run code that throws in `Main.java` (open in the active tab), click `Main.java:6` in the output.
Expected: caret on line 6. Actual: nothing happens.
Evidence: test `F08-E3` (caret never shows 6:x).
Suspected cause: the reveal runs only when the active tab changes.
Status: open

### BUG-007: Alt+1 shows the project tree but does not focus it

- Severity: S3 (keyboard users)
- Flow / case: F04 / F04-E6
- Screen: S06

Steps: in the editor press Alt+1 (hide), Alt+1 (show).
Expected: tree visible and focused (spec: components.md → ToolWindowStripe). Actual: focus stays in the editor; expanded folders are collapsed again.
Evidence: test `F04-E6`; probe: focus stays on `div.native-edit-context` after the second Alt+1.
Suspected cause: hiding unmounts the tree; it reloads asynchronously, so there is nothing to focus yet.
Status: open

### BUG-008: Interactive elements nested inside tabs and list options

- Severity: S3 (screen readers)
- Flow / case: F01-H1, F08-E1 (axe)
- Screen: S01, S05

Expected: no axe violations. Actual: `nested-interactive (serious)`: the close button sits inside `role=tab`, the remove button inside `role=option`.
Evidence: axe in tests `F08-E1` and `F01-H1`.
Status: open

### BUG-009: Landmark and heading structure

- Severity: S4
- Screen: S01, S04

Actual (axe): `page-has-heading-one`, `landmark-one-main`, `region`, `aria-allowed-role` (`role=toolbar` on `header` and `nav`).
Evidence: axe in tests `F01-H1`, `F08-E1`.
Status: open

### BUG-010: Status bar shows nothing when the language server keeps crashing (withdrawn)

- Severity: –
- Flow / case: F01 / F01-N3

First seen while reproducing BUG-003: a probe read the footer's `innerText` and printed only the path.
Re-checked twice: the footer HTML contains `Java-Server: Fehler` (with the reason as tooltip), and the
new test `F01-N3` (language server that exits at once, restarts give up) passes. Most likely a mistake
in the first probe. Kept `F01-N3` as a regression test.
Status: withdrawn, not reproducible

### BUG-011: Language server keeps running for 10–30 s after the app has quit

- Severity: S4 (no data loss; the JVM ends on its own once it notices its parent is gone)
- Flow / case: F04 / F04-E5 (seen while fixing BUG-002)

Steps: open a trusted project (language server starts), quit the app.
Expected: the language server ends with the app. Actual: Electron exits with code 0, the JDT LS JVM (up to 1 GB heap) stays 10–30 s.
Evidence: probe listing `equinox.launcher` processes every 2 s after quit; now asserted at the end of `F04-E5`.
Suspected cause: `before-quit` started the async shutdown but did not wait for it; the SIGKILL fallback was an `unref`'d timer that never ran.
Status: open

### BUG-012: In projects with non-ASCII paths, Java diagnostics never arrive for open files

- Severity: S2 (code intelligence silently missing for such projects; no workaround found yet)
- Flow / case: F01 / F01-E2b (found after fixing BUG-003)
- Screen: S05, S35

Steps
1. Open and trust `Mein Projekt ü 🚀` (UTF-8 locale or the BUG-003 fix in place).
2. Open `src/com/example/Main.java`, wait for "Java bereit", type an error.

Expected: error squiggle and counter. Actual: "Java bereit", but no diagnostics for the file, ever.
Evidence: test `F01-E2b` (marked `todo` until fixed); captured `publishDiagnostics` only for the invisible project folder, none for Main.java; JDT LS log: `begin problem for /Main.java` (file treated as a loose file, not as part of the project).
What is known: a standalone LSP client that opens the same file with the same percent-encoded URI 8 s after `initialized` does get diagnostics (published with the URI in JDT's own form, `ü` unencoded). Suspected: the file is opened while JDT LS is still creating the invisible project, and with this path it is not re-attached afterwards. Not confirmed.
Status: open

---

## To check (not reproduced, not bugs yet)

- Programs that read from stdin block forever (the console has no input). Stop works. Likely a missing feature (console input), F08-E6.
- Opening a binary file shows garbage instead of a "binary file" notice.
- `fs.watch` recursive on very large repos may hit inotify limits; not measured.
