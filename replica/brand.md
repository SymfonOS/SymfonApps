# Brand: Hobel

Replaces the working name "Mini-IDEA", which contained the original's product name.
App: `apps/hobel/`. Guard file for the sweep: `replica/brand.json`.

Angle: **open**. `/replica-entrepreneur` could not collect reviews (all sources blocked, sample 0),
so the name follows the working hypothesis from `replica/fixes.md`: a lean IDE that takes away
what you do not need. Revisit the name if the evidence points elsewhere.

## Name

**Hobel** (German: a woodworking plane). It takes off what is not needed and leaves a clean
surface. Short, two syllables, easy to spell after hearing it once, no awkward meaning found in
English, Spanish, French or German slang. A German word, which fits SymfonApps.

### Candidates

20 generated, across styles:

| style | candidates |
| --- | --- |
| descriptive | Quellwerk, Klassenbank, Codebank, Kernwerk |
| compound | Leanbench, Slimforge, Featherbench, Kernbench |
| invented | Velko, Orrin, Tamso, Mollu |
| metaphor | **Hobel**, Feder, Lotse, Spindel, Zirkel, Werkbank |
| verb | Tüftel, Schmied |

Cut: anything with "Java" (an Oracle trademark), "Werkbank" (generic word, weak as a mark),
"Featherbench" and "Slimforge" (close to existing tool names), "Tüftel" (umlaut is hard
internationally). Nothing that sounds like, looks like or means the original's name.

Shortlist and screening, run 2026-11-04 from this environment:

| name | developer tools on the web | npm package | verdict |
| --- | --- | --- | --- |
| **Hobel** | none; nearest: "Hob", an inactive Haskell editor (2014) on Hackage | free | **chosen** |
| Lotse | none found | free | good; harder to say outside German |
| Zirkel | none found | free | good; no link to the angle |
| Feder | none by that name; "FED", an old folding text editor, sounds close | free | weaker |
| Spindel | "Spindle", an Eclipse IDE plugin for Tapestry | **taken** | out |

Web screen sources: [Hackage: hob](https://hackage.haskell.org/package/hob), [FED editor](https://www.shawnhargreaves.com/fed/), [Spindle on SourceForge](https://sourceforge.net/projects/spindle/).

### Checks for "Hobel"

These are screening checks, not legal clearance. A trademark lawyer should search before money
goes into the name. **to run** means nobody ran it yet; this environment cannot reach those sites.

| check | where | result |
| --- | --- | --- |
| US trademark, classes 9 and 42 | tmsearch.uspto.gov | **to run** (host blocked here) |
| EU trademark | euipo.europa.eu eSearch / TMview | **to run** (host blocked here) |
| German trademark (DPMA) | register.dpma.de | **to run** |
| Canada | ised-isde.canada.ca | **to run** |
| global | WIPO Global Brand Database | **to run** (host blocked here) |
| domain hobel.dev / hobel.app / gethobel.com | registrar search or `whois` | **to run** (no whois, RDAP blocked here) |
| App Store, Play, Snap, Flathub, Homebrew | search the exact name | **to run** |
| handles: GitHub, X, Mastodon, Bluesky | search | **to run** (GitHub CLI not logged in here) |
| npm package `hobel` | `npm view hobel` | free (E404), 2026-11-04 |
| the web: "Hobel" + IDE / code editor / developer tool | web search | no developer tool found, 2026-11-04 |

Note: "Hobel" is a common German noun. A word mark for software in classes 9/42 is likely
possible, but common words are weaker marks; a logo mark helps.

## Palette

The original uses a blue accent (its New UI) and a pink/orange/blue logo. Hobel's working
palette used a blue accent too (`#3a66d9`), so that changed.

| role | dark | light | note |
| --- | --- | --- | --- |
| accent | `#0e7a6f` | `#0b6b61` | petrol/teal: different hue family from the original's blue, pink and orange |
| accent-hover | `#0b6b61` | `#095a52` | |
| on-accent | `#ffffff` | `#ffffff` | |
| focus-ring | `#3fbfae` | `#0e7a6f` | |
| link, info | `#5cc8b8` | `#09665c` / `#0a6a60` | |
| selection | `#1d3a38` | `#cdebe6` | tinted towards the accent |
| editor-selection | `#204b47` | `#c4e5df` | |

Everything else (greys, syntax, danger/warning/success, VCS colours) stays: those are semantic,
not brand. Contrast: `contrast.py` on both token files: **55 pairs each, 0 AA failures**.
The retired blues and the original's brand colours are in `brand.json`, so the sweep catches them.

## Logo brief

- **Idea:** a single plane shaving curling off a straight line: something taken away, something
  clean left. Lean, not heavy.
- **Mark type:** symbol plus wordmark. The symbol alone must carry the app icon.
- **Shape language:** one curl (the shaving) over one straight stroke (the surface). No brackets,
  no cursor, no gradient square.
- **Colour:** accent `#0e7a6f` on near-black `#1b1d21`, and the reverse. One colour, no gradient.
- **Wordmark:** "hobel" in lower case, a humanist sans (Inter at 600 is fine as a start).
- **Must work at:** 16 px favicon (the curl alone, 2 px stroke minimum) and 1024 px app icon.
- **Deliverables:** SVG (symbol, wordmark, lock-up), app icon 1024×1024 without transparency
  (macOS/iOS), Windows `.ico` (16–256), Linux PNG set (16–512), favicon set, social image 1200×630.
- **Must not resemble the original's mark:** no square tile with a black inner square, no
  diagonal multi-colour gradient, no two-letter monogram, no pink/orange/blue colour pair. Put the
  original's icon next to the drafts at 32 px and check that nobody could mix them up in a dock.

## Voice

Three words, with what each does not mean:

- **ruhig** (calm), not mute: say what happened and what to do, no exclamation marks, no alarm.
- **direkt** (direct), not blunt: the answer first, the reason second; "du", never "Sie".
- **handwerklich** (crafted), not technocratic: name the thing the user sees ("Platte", "Lauf"),
  not internals ("PSI", "JSON-RPC"); a workshop word now and then, never a pun.

Do and don't:

| do | don't |
| --- | --- |
| "Noch kein Lauf." | "Es wurden bisher keine Ausführungen gestartet." |
| "Ja, vertrauen" | "OK" |
| "Java: läuft nicht" with the reason as tooltip | "Fehler!" |
| "Diesen Ordner kann Hobel nicht öffnen: …" | "Ein unerwarteter Fehler ist aufgetreten." |
| "Weiterarbeiten" | "Abbrechen" when nothing is being cancelled |

### Rewritten strings

The ten most-seen strings, now in this voice (source and tests updated together):

| where | before | after |
| --- | --- | --- |
| S01 empty | Noch keine Projekte / Öffne einen Ordner mit Java-Code, um loszulegen. | Noch kein Projekt geöffnet / Öffne einen Ordner mit Java-Code. Hobel merkt ihn sich hier. |
| trust title | Projekt „X“ vertrauen? | Code aus „X“ ausführen lassen? |
| trust body | Beim Laden und Ausführen kann Code … laufen … | Für Code-Analyse und Ausführen startet Hobel Werkzeuge, die auch Build-Skripte aus diesem Ordner laufen lassen. Sag nur Ja, wenn du weißt, woher der Code kommt. |
| trust buttons | Vertrauen und öffnen / Sicherer Modus | Ja, vertrauen / Ohne Ausführen |
| status bar | Java bereit / Java-Server startet… / Java-Server: Fehler | Java: bereit / Java: startet… / Java: läuft nicht |
| run empty | Noch nichts ausgeführt. … | Noch kein Lauf. Öffne eine Klasse mit main-Methode, dann Shift+F10. |
| run end | Prozess beendet mit Code 0 / Prozess gestoppt. | Beendet mit Code 0 / Gestoppt. |
| compile error | Kompilieren fehlgeschlagen (Code n). | Nicht kompiliert (Code n). Die Fehler stehen oben. |
| run blocked | Ausführen ist im sicheren Modus gesperrt. … | Ausführen ist aus, weil dieses Projekt ohne Ausführen geöffnet ist. Schließ es und öffne es mit „Ja, vertrauen“ neu. |
| save conflict | „X“ wurde außerhalb von … geändert. … | „X“ hat sich auf der Platte geändert, seit du sie geöffnet hast. OK: deine Fassung speichern (die andere geht verloren). |
| quit dialog | Ungespeicherte Änderungen / Alle speichern und beenden / Abbrechen | Noch nicht gespeichert / Speichern und beenden / Weiterarbeiten |

## Sweep

`replica/brand.json`: avoid `IntelliJ`, `JetBrains`, `Jet Brains`, `Mini IDEA`; domains
`jetbrains.com`, `jb.gg`, `intellij.com`; the original's brand colours (approximate) and the
retired placeholder blues.

Result on our own files (every tracked or new file, i.e. without `node_modules`, build output
and the downloaded language server): **clean, exit 0**.

Known, accepted hits outside our code: the downloaded Eclipse JDT Language Server
(`apps/hobel/.jdtls/`, not in Git) bundles two Apache-2.0 libraries published by JetBrains
(the Fernflower decompiler and the annotations jar). That is a dependency with its licence
notice, not use of their brand. If Hobel ever ships the language server inside its installer,
the notices go into the third-party licences file.

The planning folder `replica/` names the original on purpose (recon, parity) and is skipped by
the sweep.

By eye: window title "Hobel", welcome heading "Hobel", screen-reader `h1` "… – Hobel",
`productName` "Hobel". There is no favicon, app icon or OG image yet (logo brief above).
