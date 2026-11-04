# Launch plan: Hobel

Hobel is a learning project. "Launch" here means: make it easy for a handful of people to try it
and tell you what breaks. No waitlist, no ads, no Product Hunt day.

## Before anyone else runs it

| item | status | note |
| --- | --- | --- |
| licence file | **open** | pick one; `package.json` says MIT but nobody decided (`pricing.md`) |
| open S1 bugs | none | `replica/bugs.md` |
| open S2 bugs | **1** (BUG-012, intermittent) | say so in the README's "known issues" |
| install path on macOS and Windows | **not tested** | at least one run of `npm install && npm run jdtls:download && npm start` on each |
| builds to download | none | `electron-builder` (dmg, nsis, AppImage) is in the architecture; unsigned builds trigger OS warnings, see `/replica-deploy` |
| crash and error reports | **none, on purpose** | no telemetry is a feature; instead: "Fehler melden" = GitHub issue template with the steps from `bug-report.md` and the path to `<userData>/logs/jdtls.log` |
| landing page | built | `apps/hobel/site/` (static, axe clean at 390 and 1440 px, both themes) |
| listing texts | written | `listing.json` (lint: 0 errors, 0 warnings); for GitHub Releases / Flathub, not the Mac App Store (sandbox) |

## Where to find the first users

The skill says: where the original's unhappy users talk. That list comes from
`/replica-entrepreneur`, which has no data yet, so there are no threads or communities to name.
Do not post into communities of the original with "switch to Hobel": it is not a replacement
today, and that would be the wrong pitch.

For a learning project the better audience is people who want to see how an IDE works inside:

1. Colleagues and friends who write Java: hand them the README and ask for one session each.
2. A short write-up ("Eine Java-IDE in Electron nachbauen: was ich gelernt habe") on your blog or
   the repository's wiki, with the build log and the bugs as the interesting part.
3. Later, if you want reach: a "Show HN" that leads with what you learned (LSP, JDT LS quirks,
   the encoding bugs, the network findings), not with "an alternative to X".

## The first ten conversations

Run them by hand, one at a time, watching the person use it (screen share is fine):

- Task: "Open this project, find the bug in `Kassenbuch`, run it." (`npm run seed` sets it up.)
- Note where they get stuck, what they try first (likely: Shift Shift for search, which does not
  exist yet), and what they expected to happen.
- Ask at the end: "What would make you open Hobel again?"
- Write each session into `replica/reviews.csv`? **No**: those are your own users, not public
  reviews. Keep them in `replica/sessions.md` with first names only and their permission.

## Success for this stage

- Three people other than you have run Hobel on their own machine, on at least two operating systems.
- Every crash or confusion they hit is in `replica/bugs.md`.
- You know which of the top-five packages from `replica/parity.md` they missed most.
