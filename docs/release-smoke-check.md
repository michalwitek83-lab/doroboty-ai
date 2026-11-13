# Post-publish smoke check (public demo)

Run this right after publishing a static build of the prototype, before sharing the link. It takes about 10 minutes. It checks the published address, not a local preview. Passing it does not replace `./scripts/verify` or CI.

## Before publishing (Vercel Hobby)

Hosting decision (2026-11-11): Vercel Hobby plan, public non-commercial demo, up to about 1,000 visits per month, no paid usage. A full first visit transfers about 16 MB, so 1,000 visits stay far below the Hobby 100 GB monthly transfer. If a Hobby limit is exceeded, Vercel pauses the project instead of charging.

Current project setup (done 2026-11-13):

- Vercel project `doroboty-ai` in the Hobby team `dorobotyai`, production URL https://doroboty-ai-three.vercel.app.
- The first deployment was made with the Vercel CLI from `feature/p1-candidate-cards`. Vercel assigns a project's first deployment to production.
- The project is connected to GitHub `michalwitek83-lab/doroboty-ai` through the Vercel GitHub app (access to this repository only). Production branch: `main`.
- Framework preset **Vite** (detected), build command `npm run build`, default install and output settings (`dist`).
- Node.js version **26.x** (Vercel default). The owner chose to keep it; `package.json` allows `>=24 <27`. CI still verifies on Node 24 (`.nvmrc`).
- No environment variables or secrets. Do not add any.
- `.vercelignore` limits CLI uploads to the static build inputs. Git builds clone the repository instead.
- The repository is a fork, so GitHub disabled its workflows until the owner enabled them in the Actions tab (done 2026-11-13). If CI does not start on a pull request, check that tab first.

CLI deploys (`npx vercel deploy`, `--prod` for production) still work, but use them only for an emergency fix; normal releases go through `main`. On Windows PowerShell, call `npx.cmd` if script execution is disabled.

Every release:

- Merge to `main` only after CI (`./scripts/verify` on Node 24 with Chromium) is green for that commit. Note the commit SHA.
- Vercel builds `main` automatically and assigns the production domain. Pull requests get preview deployments; use them for a check before merging.
- On Hobby, Instant Rollback can return only to the **immediately previous** production deployment, so publish one verified change at a time.

## Who runs it

The demo owner (repository owner, who publishes and reads `support@doroboty.ai`). If any **stop** check fails, roll back (see the end).

## Checks on the published address

Use a fresh private browser window, so there is no earlier local save. Then repeat the first three checks on a phone or at a narrow window width (390px).

| #   | Check                                                                                                                                        | Stop if it fails |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | The address opens over HTTPS without certificate warnings. The home page shows the listing entry and the footer shows `support@doroboty.ai`. | Yes              |
| 2   | Open `/#/oferty`, then open one offer. Copy the offer URL into a new tab: the same offer loads (hash deep link, no 404).                     | Yes              |
| 3   | DevTools Console has no red errors on the home, listing and offer pages. Network shows no requests to hosts other than the demo address.     | Yes              |
| 4   | Choose a candidate persona, open an offer, click "Aplikuj". The form shows the demo-data warning. Write an answer, accept terms, submit.     | Yes              |
| 5   | Reload the page: the submitted application is still listed under "Moje aplikacje".                                                           | Yes              |
| 6   | Switch to an employer persona: the application is visible under "Kandydaci"; move it to the next stage and reload.                           | Yes              |
| 7   | Settings: "Eksportuj dane" downloads a JSON file; "Resetuj scenariusz" asks for confirmation and restores the baseline.                      | No, report it    |
| 8   | The fonts and the illustration load (no fallback serif, no broken image).                                                                    | No, report it    |

Record the result (date, published address, commit, who ran it, pass/fail per check) in the release notes or in the readiness report.

## Rolling back (Vercel)

1. Project overview → Production Deployment tile → **Instant Rollback**, select the previous deployment, **Continue**, **Confirm Rollback**. The switch is immediate.
2. After a rollback Vercel stops assigning new `main` builds to production. Fix the problem on `main`, check its deployment, then use **Manage** on the production tile (or `vercel promote <deployment>`) to promote the fixed deployment; this restores automatic production updates.
3. To go back more than one version on Hobby, revert the faulty commit on `main` and let Vercel build it.

Visitors keep their own browser data. If a newer version saved data the older version cannot read, the app shows the recovery notice and visitors can download or reset their data in Settings. See [incident-plan.md](incident-plan.md) for who reacts and how.
