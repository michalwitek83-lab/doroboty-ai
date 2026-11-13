# PostHog browser analytics

## Intent and acceptance

Add the PostHog browser library (`posthog-js`) to the deployed static prototype at https://doroboty-ai-three.vercel.app/ so the course team can observe page views and interface interactions in the PostHog US Cloud project.

- Initialise PostHog once at startup from `src/lib/analytics.ts`, with the public project token and the US ingestion host. The `phc_` project token is a write-only public key by design; it is not a secret.
- Capture page views for hash-route changes, page leaves and autocaptured clicks. Use anonymous events only (`person_profiles: "identified_only"`, no `identify` call) and never send typed field contents or persona/scenario data explicitly.
- Do not send events from local development, Playwright journeys or Vitest: analytics stays off on `localhost`, `127.0.0.1`, `[::1]` and non-browser environments.
- Update the privacy page (PUB-09) and FEATURES.md (SYS-03, limits) so they no longer state that nothing is sent to an analytics system.
- Run ./scripts/verify and confirm in the built app that initialisation is skipped locally.

Deployment to Vercel and arrival of production events in PostHog must be verified separately after release.

## Validation (2026-11-13)

- `./scripts/verify` stopped at `design-system:check`: the agent-kit check requires Node 24 and this machine has Node 25.9.0 only. Formatting and the 67-file kit integrity check passed before that.
- Ran the remaining `npm run check` steps manually on Node 25: lint, typecheck, 42 unit tests (including 4 new analytics tests), `verify:packet` and the static build passed.
- `npm run test:e2e` did not run: all 38 journeys failed at browser launch because the Playwright Chromium headless shell is not provisioned. Not installed automatically, per AGENTS.md.
- Built preview at http://127.0.0.1:3107: the privacy page shows the new analytics paragraph, posthog-js does not initialise, no request goes to posthog.com, no `ph_` storage or cookies, no console errors.
- Not verified: event delivery from https://doroboty-ai-three.vercel.app/ (requires a deploy and a check in PostHog Activity).
