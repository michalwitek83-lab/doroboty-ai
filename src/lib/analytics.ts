import posthog, { type CaptureResult } from "posthog-js";

// Public, write-only project token for the PostHog US Cloud project. PostHog
// project tokens are meant to ship in browser code; this is not a secret.
const POSTHOG_TOKEN = "phc_kxi4ToCPp6Kp9aTvSDcCDTtF6DbVzA5zizXHtrkDjT6f";
const POSTHOG_HOST = "https://us.i.posthog.com";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Local development, Playwright journeys and unit tests never send events. */
export function isAnalyticsHost(hostname: string): boolean {
  return (
    hostname !== "" &&
    !LOCAL_HOSTNAMES.has(hostname) &&
    !hostname.endsWith(".localhost") &&
    !hostname.endsWith(".test")
  );
}

/**
 * Hash routes may carry typed filter text in their query (`#/oferty?q=...`).
 * Keep the route but drop the query so free text never reaches analytics.
 */
export function stripHashQuery(url: string): string {
  const hashIndex = url.indexOf("#");
  if (hashIndex < 0) return url;
  const queryIndex = url.indexOf("?", hashIndex);
  return queryIndex < 0 ? url : url.slice(0, queryIndex);
}

function sanitizeUrls(record: Record<string, unknown> | undefined): void {
  if (!record) return;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && key.toLowerCase().includes("url")) {
      record[key] = stripHashQuery(value);
    }
  }
}

export function sanitizeEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;
  sanitizeUrls(event.properties);
  sanitizeUrls(event.$set);
  sanitizeUrls(event.$set_once);
  return event;
}

export function initAnalytics(): void {
  if (typeof window === "undefined" || !isAnalyticsHost(window.location.hostname)) return;
  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    defaults: "2025-05-24",
    // The app uses HashRouter, so route changes only alter location.hash.
    capture_pageview: { path: true, hash: true },
    capture_pageleave: true,
    autocapture: true,
    person_profiles: "identified_only",
    mask_all_text: false,
    session_recording: { maskAllInputs: true },
    before_send: sanitizeEvent,
  });
}
