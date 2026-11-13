# Post-publish smoke check (public demo)

Run this right after publishing a static build of the prototype, before sharing the link. It takes about 10 minutes. It checks the published address, not a local preview. Passing it does not replace `./scripts/verify` or CI.

## Before publishing (Vercel Hobby)

Hosting decision (2026-11-11): Vercel Hobby plan, public non-commercial demo, up to about 1,000 visits per month, no paid usage. A full first visit transfers about 16 MB, so 1,000 visits stay far below the Hobby 100 GB monthly transfer. If a Hobby limit is exceeded, Vercel pauses the project instead of charging.

One-time project setup (owner, in the Vercel dashboard):

1. **Add New → Project**, import the GitHub repository and keep the production branch `main`.
2. Framework preset **Vite**; build command `npm run build`; output directory `dist`; install command `npm ci`.
3. In project settings, set the Node.js version to **24.x** (the project requires Node 24, `.nvmrc`).
4. No environment variables or secrets are needed. Do not add any.

Every release:

- Merge to `main` only after CI (`./scripts/verify` on Node 24 with Chromium) is green for that commit. Note the commit SHA.
- Vercel builds `main` automatically and assigns the production domain. Pull requests get preview deployments; use them for a check before merging.
- On Hobby, Instant Rollback can return only to the **immediately previous** production deployment, so publish one verified change at a time.

## Who runs it

The demo owner (repository owner, who publishes and reads `support@doroboty.ai`). If any **stop** check fails, roll back (see the end).

## Checks on the published address

Use a fresh private browser window, so there is no earlier local save. Then repeat the first three checks on a phone or at a narrow window width (390px).

| #   | Check                                                                                                                                                                                                                       | Stop if it fails |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | The address opens over HTTPS without certificate warnings. The home page shows the listing entry and the footer shows `support@doroboty.ai`.                                                                                | Yes              |
| 2   | Open `/#/oferty`, then open one offer. Copy the offer URL into a new tab: the same offer loads (hash deep link, no 404).                                                                                                    | Yes              |
| 3   | DevTools Console has no red errors on the home, listing and offer pages. Network shows requests only to the demo address and PostHog EU (`eu.i.posthog.com`, `eu-assets.i.posthog.com`); PostHog event requests return 200. | Yes              |
| 4   | Choose a candidate persona, open an offer, click "Aplikuj". The form shows the demo-data warning. Write an answer, accept terms, submit.                                                                                    | Yes              |
| 5   | Reload the page: the submitted application is still listed under "Moje aplikacje".                                                                                                                                          | Yes              |
| 6   | Switch to an employer persona: the application is visible under "Kandydaci"; move it to the next stage and reload.                                                                                                          | Yes              |
| 7   | Settings: "Eksportuj dane" downloads a JSON file; "Resetuj scenariusz" asks for confirmation and restores the baseline.                                                                                                     | No, report it    |
| 8   | The fonts and the illustration load (no fallback serif, no broken image).                                                                                                                                                   | No, report it    |

Record the result (date, published address, commit, who ran it, pass/fail per check) in the release notes or in the readiness report.

## Rolling back (Vercel)

1. Project overview → Production Deployment tile → **Instant Rollback**, select the previous deployment, **Continue**, **Confirm Rollback**. The switch is immediate.
2. After a rollback Vercel stops assigning new `main` builds to production. Fix the problem on `main`, check its deployment, then use **Manage** on the production tile (or `vercel promote <deployment>`) to promote the fixed deployment; this restores automatic production updates.
3. To go back more than one version on Hobby, revert the faulty commit on `main` and let Vercel build it.

Visitors keep their own browser data. If a newer version saved data the older version cannot read, the app shows the recovery notice and visitors can download or reset their data in Settings. See [incident-plan.md](incident-plan.md) for who reacts and how.
