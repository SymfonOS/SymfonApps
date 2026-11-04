# Fixes and angle: Mini-IDEA

Status 2026-11-04: **blocked, no reviews collected (sample size 0).**
There are no lists, no fix plan and no positioning in this file yet, on purpose: every item
must rest on verbatim, linked user feedback, and none could be collected from this environment.

## Why

This cloud session's network policy refuses every review source (HTTP 403 at the proxy):

| source | host | result |
| --- | --- | --- |
| Hacker News (official Algolia API) | hn.algolia.com | blocked |
| JetBrains' public issue tracker (YouTrack REST API, vote counts) | youtrack.jetbrains.com | blocked |
| Reddit (r/IntelliJIDEA, r/java) | www.reddit.com | blocked |
| G2 | www.g2.com | blocked |
| Capterra | www.capterra.com | blocked |
| Trustpilot | www.trustpilot.com | blocked |
| JetBrains blog / docs | www.jetbrains.com, blog.jetbrains.com | blocked (only search snippets reachable) |

Web search works, but it returns model-written summaries, not the reviewers' own words, so it
cannot be used for quotes. Nothing was filled in from memory.

## How to unblock (either way works)

**A. Let this environment reach the official feeds**, then run `/replica-entrepreneur` again.
Allow these hosts in the environment's network settings:
`hn.algolia.com`, `youtrack.jetbrains.com` (and, if you want Reddit through its API under its
terms, `oauth.reddit.com` plus your own Reddit app credentials).
Docs: https://code.claude.com/docs/en/cloud-environments#network-access

**B. Collect by hand** (G2, Capterra, Trustpilot and the JetBrains Marketplace do not allow
scraping; read them in your browser and copy rows):

- File: `replica/reviews.csv`, columns `source,url,date,rating,text`
- `text` copied exactly, `url` of the single review or comment, `date` as YYYY-MM-DD,
  `rating` 1–5 or empty for forum posts
- Aim: 100+ rows, at least 3 sources, last 18 months first, include 3–4 star reviews
- Searches worth doing: "IntelliJ slow", "IntelliJ memory", "IntelliJ indexing",
  "switched from IntelliJ", "IntelliJ alternative", "IntelliJ vs VS Code", "new UI IntelliJ",
  YouTrack issues sorted by votes

Then:

```bash
python3 /path/to/replica-entrepreneur/reviews.py replica/reviews.csv --themes replica/themes-ide.json --out replica/feedback.md
```

`replica/themes-ide.json` is ready: the 14 base themes plus 12 IDE themes (performance, memory,
indexing, startup, freezes, Gradle/Maven sync, update regressions, new UI, AI features pushed,
licensing, plugin breakage, learning curve).

## Hypotheses to test (not findings)

What the collected reviews should confirm or kill. None of this is evidence, and none of it goes
into `features.csv` until it is:

1. Memory use and indexing time are the most common complaints about IntelliJ (`memory`,
   `indexing`, `performance` themes). If true, a lean editor with lazy, per-language servers is
   the natural angle for Mini-IDEA.
2. The new UI / removed main menu annoys long-time users (`new_ui`).
3. Updates regularly break plugins or Gradle sync (`updates`, `plugins`, `build_sync`).
4. The free/paid split after the 2025.3 unified distribution confuses people (`licensing`).

For a learning project the outcome is a design brief, not a market: which of these pains
Mini-IDEA should be built around from the start (for example a hard memory budget measured in CI).

## Next

Unblock with A or B and run `/replica-entrepreneur` again. `/replica-brand` can start without it
(name, palette, voice), but the positioning line stays open until there is evidence.
