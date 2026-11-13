# Incident plan (public demo)

Short, provider-specific steps for the public DoRoboty.ai demo on Vercel Hobby. The demo is a static site: there is no server, database or private data to recover. Visitors' data stays in their own browsers.

## Owner and signals

- **Owner:** the repository owner. They own the Vercel project (can roll back and promote) and read `support@doroboty.ai`.
- **How problems arrive:** the uptime monitor (address down or paused), PostHog error tracking (errors in visitors' browsers), failed Vercel builds (Vercel emails the project owner), emails to `support@doroboty.ai` (footer, Settings, crash screen) and the owner's post-publish smoke check.

## Availability monitoring

Vercel emails the owner about failed deployments, but nothing on Vercel Hobby checks that the live address answers. Set up a free external uptime check once:

1. Create an account with an uptime monitoring service (for example UptimeRobot; check its current free-plan terms).
2. Add an **HTTP(s)** monitor (a **keyword** monitor is better: expect the text `DoRoboty.ai`, which is in the page title) for `https://doroboty-ai-three.vercel.app/`, checked every 5 minutes.
3. Set the alert contact to the owner's email and send a **test notification**; confirm it arrives.

The check loads only the 0.6 KB HTML page, so it does not run the app or send PostHog events. It detects an unavailable or paused project, not a broken page after load; those show up in PostHog error tracking (below) and the post-publish smoke check.

## Error tracking

On the published site PostHog captures unhandled errors and promise rejections (`capture_exceptions`), and the crash screen reports errors it catches (`reportError`). Look in PostHog → Error tracking. Only technical error details are sent; form contents and scenario data are not attached. Nothing is sent from local development or tests.

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
