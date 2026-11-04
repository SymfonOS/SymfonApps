# Backend: Mini-IDEA

Mini-IDEA is a local desktop app for one person (`architecture.md`). Its "backend" is the
Electron main process: the state database, file access, and the processes it starts
(language server, javac/java). There is **no server, no accounts, no payments, no email**,
and nothing leaves the machine unless the user triggers it.

## What does not apply, and why

| skill section | status | reason |
| --- | --- | --- |
| Auth (sign up, sessions, OAuth, roles) | not applicable | single local user, no accounts. The OS user account is the boundary |
| Account deletion | not applicable | no accounts. Removing a project from the list deletes its rows (cascade, tested); `state.db` is the only store |
| Payments (Stripe) | not applicable | learning project, nothing is sold |
| Transactional email | not applicable | nothing to send |
| Webhooks | not applicable | no inbound or outbound HTTP |
| Third-party integrations with OAuth | none yet | GitHub/GitLab pull requests are a `could` row; if built: official REST APIs, user's own token in the OS keychain, scopes `repo` read only to start |

## What the backend is instead

| part | where | notes |
| --- | --- | --- |
| State database | `src/main/db.ts`, schema `replica/schema.sql` | `node:sqlite` in `<userData>/state.db`, WAL mode, foreign keys on |
| Migrations | `MIGRATIONS` in `src/main/db.ts` | numbered, each in its own transaction, rolled back on failure. The DB file is copied to `state.db.bak-v<n>` before an existing database is migrated. A database newer than the app is refused, not touched |
| Access boundary | `src/preload/index.ts`, `src/main/index.ts`, `src/main/schemas.ts`, `src/main/project.ts` | renderer has no Node; only allowlisted channels; only our own window may call; every input parsed with zod; every path resolved inside the project root **and** checked again after following symlinks |
| Trust gate | `src/main/index.ts` (`requireTrusted`) | language server and run refuse untrusted projects in main, not only in the UI |
| Seed | `npm run seed` | three made-up projects (trusted, trusted with Maven layout and a warning, untrusted empty) and a run configuration |
| Jobs | main process | `lsp` restart with backoff (max 3 in 5 min) is built. `history.snapshot/prune`, `git.autoFetch` come with their features (Local History, Git) |
| Logs | `<userData>/logs/jdtls.log` | language server stderr. No file contents or paths of user files are logged by the app itself |
| Backups | `state.db.bak-v<n>` on migration | the rest of the user's data is their project folders, which the app never deletes |

Access rules, tested with a "second user": for a local app the second party is a **second
project** (and a renderer asking for paths it should not see). `tests/unit/project.test.ts`
checks that one project's id never returns another's state, that unknown ids get nothing,
and that `../`, absolute paths, sibling folders with the same prefix and symlinks pointing
outside are all refused for read, write and list. A mutation check (guard disabled → test fails)
confirmed the symlink test is real.

## External services and downloads

| service | when | how |
| --- | --- | --- |
| Eclipse JDT Language Server | `npm run jdtls:download`, once | official `download.eclipse.org/jdtls/milestones/1.61.0`, EPL-2.0. Pinned because 1.62+ need Java 25 |
| npm registry | install | dependencies only |
| Electron binaries | install | via the `electron` package's installer |

The running app makes no network calls of its own. Checked 2026-11-04 with a recording proxy
(e2e test `NET-1`): the only request while opening and trusting a project is
`services.gradle.org`, made by Buildship inside the Eclipse JDT Language Server (public Gradle
version list, no project data). Two calls were found and removed on the way: Chromium's
spellchecker dictionary download (`redirector.gvt1.com`, now off per session);
Gradle/Maven import is switched off in JDT LS until Hobel supports it (S26).

## Security checklist

- [x] secrets only in env vars, `.env*` in `.gitignore` (`.env.example` tracked, no secrets exist)
- [x] input validated in main with zod on every IPC channel (`schemas.ts`, tested)
- [x] authorisation on every read and write: project id must exist, path must stay inside its root after symlinks; tested with a second project and a symlink escape
- [x] run and language server refused in main for untrusted projects (not just a disabled button)
- [x] renderer locked down: `contextIsolation`, `sandbox`, no `nodeIntegration`, CSP `script-src 'self'`, navigation blocked, new windows denied, http(s) links open in the system browser
- [x] IPC sender check: only the app's own window may invoke
- [x] dependencies audited: `npm audit` → **0 vulnerabilities** after this round (was 1 critical, 2 high, 1 low, see below)
- [x] no user data in logs (only the project root path in the language server log header)
- [ ] rate limits: not applicable (no network surface); long outputs are capped instead (100k lines in the run console, 20 MB max file size)
- [ ] uploads: not applicable
- [ ] privacy policy: not needed while nothing leaves the machine; required if telemetry or a sync service is ever added
- [ ] code signing and auto-update: not set up (only matters when distributing builds, see `/replica-deploy`)
- [ ] `node:sqlite` is still marked experimental in Node 22/24; revisit if its API changes

### Audit fixes in this round

| package | was | now | why |
| --- | --- | --- | --- |
| electron | 38.8.6 (direct) | 45.2.1 | 30+ advisories incl. context isolation bypass (GHSA-h7rp-cf8h-j98x), contextBridge prototype setters (GHSA-ff2p-hmqr-hxm4), redirect into local file loader (GHSA-v64r-4m7r-3mvq). Bundled Node goes 22 → 24 |
| dompurify | 3.4.15 (via monaco-editor) | ≥ 3.4.17 via `overrides` | several DOM XSS advisories; Monaco uses it to render hover docs from the language server. Override instead of downgrading Monaco |
| extract-zip | via electron 38 | gone | came with the old Electron installer |

### Fixes found while writing the tests

- **Symlink escape:** `resolve()` only checked the path text, so a link inside a project could read or write any file the user can. Now `resolveReal()` follows links for every read, write and list.
- **Unchecked read in run configs:** `runConfig.fromContext` read `root + filePath` without any containment check. It now uses the same resolver.

## Next

`/replica-test`. When Git (S21–S25) and Local History (S32) are built, their jobs (`git.autoFetch`, `history.prune`) get the same treatment: retries, a log entry on failure, times in UTC.
