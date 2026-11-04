# Pricing: Hobel

**Hobel costs nothing and is not sold.** It is a learning project (`replica/recon.md` → "For:
Interne Nutzung / Lernen"). So: no tiers, no trial, no Stripe products, no billing to fix.
This file records that decision and what would change it.

## The original and alternatives

Not filled in with numbers on purpose. The original's pricing page (`jetbrains.com/idea/buy/`) is
unreachable from this environment (network policy), and the only price figures found by web search
came from a third-party aggregator whose numbers contradicted each other (see `replica/recon.md`,
source 8). Writing them here would be guessing.

What is known from the original's own documentation (via search, recon source 2): since 2025.3 it is
one product with a free core and a paid Ultimate subscription; the free tier includes more than the
former Community Edition.

| product | model | price | URL | read on |
| --- | --- | --- | --- | --- |
| the original | free core + paid subscription | **to read** | jetbrains.com/idea/buy | – (blocked) |
| VS Code + Java extensions | free | free | code.visualstudio.com | – (not checked) |
| Eclipse IDE | free, EPL-2.0 | free | eclipseide.org | – (not checked) |
| Apache NetBeans | free, Apache-2.0 | free | netbeans.apache.org | – (not checked) |

## Price and billing complaints from reviews

None: `replica/feedback.md` does not exist yet (sample 0, see `replica/fixes.md`).

## Model

- **Free.** No account, no licence key, no activation.
- **Licence:** **open, your decision.** `apps/hobel/package.json` says `"license": "MIT"`; that was
  set while scaffolding, nobody decided it, and there is no `LICENSE` file. Pick a licence (MIT and
  Apache-2.0 are the usual choices for a tool like this) and add the file before publishing builds.
  Note: the bundled language server is EPL-2.0; shipping it inside an installer needs its licence
  text and notices next to Hobel's.

## If Hobel were ever sold

Do the full exercise then, with evidence: read the original's and two alternatives' public pricing
pages with dates, collect price complaints, and only then pick a model. The obvious constraint:
the main alternatives in this category are free, so a paid Hobel would need a reason people pay
for, not parity.
