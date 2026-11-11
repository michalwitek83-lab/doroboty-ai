# Post-publish smoke check (public demo)

Run this right after publishing a static build of the prototype, before sharing the link. It takes about 10 minutes. It checks the published address, not a local preview. Passing it does not replace `./scripts/verify` or CI.

## Before publishing

- Note the exact commit you build: `git rev-parse HEAD`. The working tree must be clean.
- `./scripts/verify` passed for that commit (locally or in CI).
- Build with `npm run build` and publish the whole `dist/` directory. Keep the previous deployment available on the host, so you can roll back to it.

## Who runs it

The person who published the build. If any **stop** check fails, they roll back (see the end) and report it to the demo owner.

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

## Rolling back

Re-publish the previous deployment from the host's deployment history, or rebuild and publish the previous good commit. Visitors keep their own browser data; if the newer version saved data the older version cannot read, the app shows the recovery notice and visitors can export or reset in Settings.
