# Production readiness fixes for the public demo

Status: **implemented** on branch `feature/p1-candidate-cards`, committed separately after the P1 commit. Full `./scripts/verify` still needs Node 24 or CI (see Results).

## Source

The production-readiness audit (`docs/production-readiness.html`, audit 2026-11-11) for publishing the prototype as a public demo on a static host (provider not chosen yet). The user asked to fix four findings:

1. `./scripts/verify` fails on a Windows checkout because the repository has no `.gitattributes` and `core.autocrlf=true` writes CRLF into the working tree. Prettier, the design-system kit hashes and the participant packet verifier then fail although the committed files are LF.
2. No post-publish smoke checklist.
3. No crash screen: a render error leaves a blank page.
4. No way to report problems, and the "do not enter real data" warning exists only in settings/privacy/terms.

## Decisions (user, 2026-11-11)

- Support contact: temporary address `support@doroboty.ai`.
- Crash handling is local only: no external error reporting service, nothing leaves the browser.

## Second round (user answers, 2026-11-11)

- Hosting: **Vercel Hobby**. The user assessed the demo as non-commercial (Hobby allows personal, non-commercial use only; this is the user's judgement, not legal advice). Expected use up to about 1,000 visits per month, budget 0 zł; Hobby pauses the project instead of charging when limits are exceeded.
- Owner: the repository owner; they read `support@doroboty.ai` and will own the Vercel project.
- Other tabs: add a warning. Implemented as: on a `storage` event for the scenario key, show a notice and stop saving in this tab until reload (import/reset still replace). Browser test with two pages.
- Old saves: compatibility test only (no UI notice). Unit test reconstructs a pre-P1 save and checks it loads without being blocked.
- Full gate: push the branch and open a PR to `main`, so CI runs `./scripts/verify` on Node 24 with Chromium.
- Docs: Vercel setup/rollback in `docs/release-smoke-check.md` (Hobby Instant Rollback returns only to the previous production deployment and disables auto-assignment until a deployment is promoted, per Vercel docs checked 2026-11-11) and `docs/incident-plan.md`.

## Scope and acceptance criteria

- `.gitattributes` forces LF for text files; working-tree files are converted CRLF→LF in place without discarding uncommitted work. `./scripts/verify` formatting, kit and packet checks no longer fail because of line endings. The immutable kit returns to its committed bytes.
- The readiness report is excluded from Prettier (generated file).
- `docs/release-smoke-check.md` lists what to check right after publishing a static build, who runs it and when to roll back.
- A local crash screen (`CrashRecovery`) catches render errors:
  - route level inside the shell, so header/navigation stay usable and navigating away recovers;
  - top level around the whole app as a last resort.
  - Polish copy; actions: try again, download the saved browser data (raw localStorage, no parsing), reset the scenario with an explicit confirmation step, and the support address.
  - Nothing is sent anywhere; no private text is logged by our code.
- Support contact `support@doroboty.ai` (mailto) in the public footer, in settings, and on the crash screen, with a request not to send personal data.
- The demo-data warning is shown inside the application form and in the public footer.
- Routes affected: all public routes (footer), `/#/aplikuj/:slug` (form intro), `/#/app/settings`, any route on crash. Uses existing host recipes: `Notice`, `prototype-panel`/`prototype-form`, `Button`/`buttonVariants`, footer layout. No new visual family.
- Browser regression: forced render error shows the crash screen inside the shell, export works, try-again recovers; application form shows the warning; footer shows contact.
- FEATURES.md updated for the new/changed behavior.

## Out of scope

Choosing the hosting provider, rollback procedure, incident owner, multi-tab warning, migration test (separate readiness items).

## Results

Executed on 2026-11-11, Windows 11, Node 25.9.0 (project expects 24), no Playwright Chromium installed.

- Line endings: 209 working files converted CRLF→LF in place; `git diff` stayed at the same 13 P1 files before and after. Stat-only index entries of 190 content-identical files were refreshed with `git add` (nothing ends up staged). Kit `.nvmrc` hash matches the committed value again.
- `./scripts/verify`: `format:check` and `verify-kit.mjs` now pass; it stops at `agent-kit` `check.mjs` with "Use Node 24 (see .nvmrc)". Not a code failure; still open until run on Node 24 or in CI.
- The rest of the gate, run step by step: lint, typecheck, `npm test` (6 files / 37 tests), `verify:packet`, `npm run build` — all exit 0.
- Browser journeys: 37/37 passed on Microsoft Edge 157 via a temporary config outside the repo that reuses `playwright.config.ts` with `channel: "msedge"` (CI uses Chromium). Includes the two new tests.
- Visual check in the preview (port 3107): application form notice and crash screen at 1280px and 390px, footer at 1280px; no horizontal overflow. During this check the reset confirmation dropped focus to BODY; fixed (focus moves to "Potwierdź reset", returns to "Resetuj scenariusz" on cancel) and covered by the test.
- Not verified: Chromium/CI run, 320px and intermediate breakpoints for the new panels, screen-reader announcement of the crash screen.
- Readiness report: preparation 9/17 (52%), still "not ready". Remaining items need human decisions (hosting, owner, capacity, rollback, recovery plan, multi-tab, migration).
