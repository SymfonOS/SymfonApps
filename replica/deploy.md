# Deploy: Hobel

Date: 2026-11-04  Build: see the commit of this file  Target: desktop app (Linux, macOS, Windows)
plus a static landing page.

## Verdict: **not deployed. Preflight failed.**

Nothing was published, uploaded, signed or bought. The skill's rule: any failed check stops the
deploy, and nothing goes live without your go. Four checks fail; three of them are decisions
or work only you can unblock.

## Step 1: preflight

| check | command / how | result | |
| --- | --- | --- | --- |
| e2e suite | `xvfb-run -a npm run test:e2e` | 22 pass, 1 todo (BUG-012), 0 fail | pass |
| unit + typecheck | `npm test` | 18 / 18 | pass |
| production build | `npm run build` | passes | pass |
| packaged app works | `electron-builder --linux dir`, then open project → Java ready → run | title "Hobel", Java server starts from `resources/jdtls`, "Hallo, Welt!", code 0 | pass |
| no background network | e2e `NET-1` with a recording proxy | only the documented Buildship request | pass |
| rebrand sweep | `sweep.py` over our own files with `replica/brand.json` | clean, exit 0 | pass |
| listing | `listing.py replica/launch/listing.json` | 0 errors, 0 warnings | pass |
| dependency audit (shipped code) | `npm audit` | nothing ships from `node_modules` (all bundled); 15 moderate findings are in `electron-builder`'s own tool chain (`minimatch` via `@electron/asar`), build-time only, fix needs a breaking `--force` | pass, noted |
| **must-haves** | `parity.py` | **12 of 30**, parity 25.3 | **FAIL** |
| **open S1 / S2 bugs** | `replica/bugs.md` | S1: none. **S2: BUG-012** (intermittent) | **FAIL** |
| **licence** | `LICENSE` file | **none**; `package.json` says MIT but nobody decided | **FAIL** |
| **icon / favicon / OG image are ours** | by eye | **none exist**; the packaged app uses Electron's default icon | **FAIL** |
| privacy policy | page | not needed while Hobel processes no personal data and calls no service of its own; the landing page sets no cookies and loads nothing external. Needed the moment telemetry, crash reporting or a sync service is added | n/a |
| terms | page | not needed for a free tool without accounts; the licence covers use | n/a |
| cookie banner | | no cookies, no analytics | n/a |
| account deletion | | no accounts | n/a |

### What unblocks each failure

1. **Must-haves 12/30.** Not shippable as a replacement. For a learning project you can decide that
   "release" means "early preview, says so on the box"; that is your call, and the listing and
   landing page already say what is missing. Otherwise: `/replica-build` packs 1–5 from `parity.md`.
2. **BUG-012 (S2).** Fix, or decide to ship with it as a known issue (README + release notes).
3. **Licence.** Pick one (MIT or Apache-2.0 are usual), add `LICENSE`, keep `package.json` in sync.
   The bundled language server is EPL-2.0: ship its licence and notices in `resources/jdtls`
   (they are in the downloaded folder) and list it in the release notes.
4. **Icon.** Make the mark from the logo brief in `replica/brand.md`, then add
   `build/icon.png` (1024×1024), `build/icon.icns` and `build/icon.ico`; electron-builder picks them up.

## Step 2: production services

None. Hobel has no server, database, payments, OAuth or email (`replica/backend.md`). The production
"environment" is the user's machine: state in `<userData>/state.db` with migrations run at startup
and a backup before each migration.

## Step 3: distribution and the landing page (prepared, not done)

### Desktop builds

Config is in `apps/hobel/package.json` → `build` (`npm run dist`):

| platform | target | signing | your account step |
| --- | --- | --- | --- |
| Linux | AppImage, deb | none needed | none |
| macOS | dmg | **must be signed and notarised**, or Gatekeeper blocks it | Apple Developer Program ($99/year), a Developer ID certificate; set `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` in CI, never in the repo |
| Windows | nsis installer | unsigned works but SmartScreen warns; signing needs a code-signing certificate (OV/EV or Azure Trusted Signing) | buy/arrange the certificate; `CSC_LINK`, `CSC_KEY_PASSWORD` |

Packaged size (Linux, unpacked): 358 MB, of which Electron ~270 MB, `app.asar` 20 MB, language
server 65 MB. Two findings from the trial package, both fixed: the language server path pointed into
`app.asar` (a JVM cannot run from inside the archive; it now ships as `resources/jdtls`), and all
runtime libraries were shipped twice (already bundled; `app.asar` went from 164 MB to 20 MB).

Note: this environment cannot download Electron or signing tools from GitHub, so the trial package
used the locally installed Electron. On your machine or in CI, `npm run dist` downloads what it needs.
The trial package also contained Electron's `default_app.asar` because of that; an official build does not.

Where to publish: **GitHub Releases** on SymfonOS/SymfonApps (AppImage, deb, dmg, exe + checksums).
Flathub needs a manifest and review; Mac App Store needs the App Sandbox, which an IDE that starts
javac, java and a language server barely fits (`replica/launch/listing.json`).

A release workflow (build on three OS runners, attach to a draft release) is the natural next step
once the four failures are resolved. Not written yet: it would publish, and that needs your go.

### Landing page

`apps/hobel/site/` is static. Simplest hosts: **GitHub Pages** (from the repo, no account beyond
GitHub) or Cloudflare Pages. No domain is needed (`symfonos.github.io/...`).

If you buy a domain (you buy it; for example `hobel.dev` after the checks in `brand.md`):

| record | name | value |
| --- | --- | --- |
| CNAME | www | `symfonos.github.io` (GitHub Pages) |
| A | @ | GitHub Pages' four apex IPs, as listed in GitHub's Pages docs when you set it up |
| TXT | `_github-pages-challenge-symfonos` | the verification value GitHub shows |

Canonical host: `www`, apex redirects to it. HTTPS: tick "Enforce HTTPS" once the certificate is issued.
No email DNS needed: Hobel sends no email.

## Step 4: watch it

By design there is no telemetry, crash reporting or analytics, so watching means:

- **Issues:** a GitHub issue template that asks for the steps, OS, JDK version and
  `<userData>/logs/jdtls.log`.
- **Releases:** download counts on GitHub Releases are the only usage number, and that is enough.
- **First week after a release:** read every issue, reproduce, add a test, fix (the `/replica-test`
  loop). Re-run the full suite on all three OSes before the next release.
- **Landing page:** GitHub Pages has no uptime alerts; if you need them, a free external check on the
  home page is enough.

## Step 5: mobile

Not applicable (desktop IDE).

## Your go

Nothing more happens until you decide on the four failures above. When they are resolved, the next
steps are: release workflow → draft release → you check it → you publish.
