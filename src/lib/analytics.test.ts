import { describe, expect, it, vi } from "vitest";
import posthog, { type CaptureResult } from "posthog-js";
import { isAnalyticsHost, reportError, sanitizeEvent, stripHashQuery } from "./analytics";

describe("analytics host guard", () => {
  it("stays off for local and test hosts", () => {
    for (const host of ["", "localhost", "127.0.0.1", "[::1]", "app.localhost", "doroboty.test"]) {
      expect(isAnalyticsHost(host)).toBe(false);
    }
  });

  it("runs on the deployed host", () => {
    expect(isAnalyticsHost("doroboty-ai-three.vercel.app")).toBe(true);
  });
});

describe("analytics URL sanitising", () => {
  it("drops the query inside a hash route", () => {
    expect(stripHashQuery("https://x.app/#/oferty?q=moje+dane&page=2")).toBe(
      "https://x.app/#/oferty",
    );
    expect(stripHashQuery("https://x.app/#/oferty/abc")).toBe("https://x.app/#/oferty/abc");
    expect(stripHashQuery("https://x.app/?utm_source=a")).toBe("https://x.app/?utm_source=a");
  });

  it("sanitises URL properties and keeps other properties", () => {
    const event = {
      event: "$pageview",
      properties: {
        $current_url: "https://x.app/#/oferty?q=tekst",
        $prev_pageview_url: "https://x.app/#/app/aplikacje?wyslano=1",
        $pathname: "/",
      },
      $set_once: { $initial_current_url: "https://x.app/#/oferty?q=tekst" },
    } as unknown as CaptureResult;

    const result = sanitizeEvent(event);
    expect(result?.properties.$current_url).toBe("https://x.app/#/oferty");
    expect(result?.properties.$prev_pageview_url).toBe("https://x.app/#/app/aplikacje");
    expect(result?.properties.$pathname).toBe("/");
    expect(result?.$set_once?.$initial_current_url).toBe("https://x.app/#/oferty");
    expect(sanitizeEvent(null)).toBeNull();
  });
});

describe("error reporting", () => {
  it("sends nothing while analytics is not initialised (local, tests)", () => {
    const capture = vi.spyOn(posthog, "captureException");
    reportError(new Error("test"), "crash-recovery");
    expect(capture).not.toHaveBeenCalled();
    capture.mockRestore();
  });
});
