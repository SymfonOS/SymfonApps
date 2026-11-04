# Hobel landing page

Static page, no JavaScript, no external requests. Copy and claims: `replica/launch/landing.md`
(every claim maps to a test or the code).

- `tokens.css` is a copy of `replica/design/tokens.css`; after token changes run
  `python3 replica/design/build_tokens.py` and copy it again.
- `hobel-run.png` is `replica/clone-screens/S17-run.png` from the e2e run.

Preview: `python3 -m http.server -d apps/hobel/site` and open http://localhost:8000.
