# Incident plan (public demo)

Short, provider-specific steps for the public DoRoboty.ai demo on Vercel Hobby. The demo is a static site: there is no server, database or private data to recover. Visitors' data stays in their own browsers.

## Owner and signals

- **Owner:** the repository owner. They own the Vercel project (can roll back and promote) and read `support@doroboty.ai`.
- **How problems arrive:** emails to `support@doroboty.ai` (shown in the footer, Settings and the crash screen), failed Vercel builds (Vercel emails the project owner), or the owner's own post-publish smoke check. There is no automated error reporting by design.

## When something is wrong

1. **Confirm** in a private browser window on the production address. Note the URL, what fails and whether it fails on the previous deployment too (open it from Vercel → Deployments).
2. **Blank or broken page for everyone after a release:** roll back immediately (Vercel → Production Deployment → Instant Rollback; see [release-smoke-check.md](release-smoke-check.md#rolling-back-vercel)).
3. **Problem for one visitor only:** ask them (without personal data) to open Settings → "Eksportuj dane" if possible, then "Resetuj scenariusz", or to clear site data. Corrupt saves are never overwritten automatically; the crash screen offers the same download/reset.
4. **Project paused by Vercel (usage limit):** the demo stays offline until the limit resets (about 30 days) or the plan changes. Decide whether to wait or move the static `dist/` to another host.
5. **Fix forward:** reproduce locally (`npm run dev`), fix on a branch, pass CI, merge to `main`, check the preview/production deployment, then promote it if a rollback is active.

## Communicating

Reply to the people who reported the problem. For a longer outage, add a short note where the demo link was shared. Never ask visitors for passwords, real CVs or the scenario export file.

## After the incident

Record what happened, the cause and the fix in `docs/tasks/` and add a regression test where possible.
