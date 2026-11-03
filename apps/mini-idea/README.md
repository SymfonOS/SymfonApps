# Mini-IDEA

A learning rebuild of a desktop Java IDE's core loop: open a project, edit with code
intelligence, run. Clean room: built from `replica/recon.md` and `replica/architecture.md`,
not from any other IDE's code or assets. "Mini-IDEA" is a working name.

## Requirements

- Node 22.13+ (for `node:sqlite`)
- JDK 21+ (`java` and `javac` on the PATH, or `JAVA_HOME` set)

## Setup

```bash
npm install
npm run jdtls:download   # Eclipse JDT Language Server 1.61.0 into .jdtls/ (EPL-2.0)
npm start
```

On Linux as root (containers) Electron needs `--no-sandbox`: `npx electron --no-sandbox .` after `npm run build`.

## What works

- Welcome screen with recent projects, open a folder, trust dialog (safe mode keeps the language server and run off)
- Project tree (keyboard: arrows, Enter), editor tabs, save with Ctrl+S, conflict check when the file changed on disk
- Java: completion, errors and warnings, hover docs, go to definition (F12 / Ctrl+click)
- Run a class with a `main` method: gutter icon or Shift+F10, output with clickable stack traces, stop with Ctrl+F2
- Tool windows: Alt+1 project, Alt+4 output

The full feature list and status is in `replica/features.csv`, the progress in `replica/build-log.md`.

## Demo data

```bash
npm run seed   # three made-up projects in ./.seed
MINI_IDEA_USER_DATA=./.seed/user-data npm start
```

## Tests

```bash
npm test                       # typecheck + unit tests (migrations, access boundary, services)
xvfb-run -a npm run test:e2e   # on Linux without a display; plain `npm run test:e2e` elsewhere
```

The e2e test drives the real app with Playwright: open, trust, complete, see a diagnostic, jump to a
definition, run and read the output. It writes screenshots to `replica/clone-screens/`.

## Layout

```
src/shared/ipc.ts     typed IPC contract (channels and events)
src/main/             Electron main: SQLite state, projects and files, LSP host, run service
src/preload/          allowlisted bridge, no Node in the renderer
src/renderer/         React + Monaco UI, tokens from replica/design
tests/e2e/            Playwright for Electron
```

State lives in `<userData>/state.db` (schema: `replica/schema.sql`, migrations in `src/main/db.ts`), language server logs in `<userData>/logs/`. Security notes: `replica/backend.md`.
