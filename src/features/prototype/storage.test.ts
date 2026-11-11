import { describe, expect, it } from "vitest";
import { initialState } from "./model";
import {
  MAX_IMPORT_BYTES,
  parseState,
  readState,
  saveState,
  serializeState,
  STORAGE_KEY,
} from "./storage";
function memory(raw: string | null = null) {
  const values = new Map(raw === null ? [] : [[STORAGE_KEY, raw]]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe("browser persistence and recovery", () => {
  it("reads a save written before the P1 shortlist scenario was added", () => {
    // Reconstructs the pre-P1 shape: no screening criteria, no hidden scenario applicants.
    const legacy = JSON.parse(serializeState(initialState()));
    const hidden = new Set(
      legacy.people
        .filter((p: { pickerHidden?: boolean }) => p.pickerHidden)
        .map((p: { id: string }) => p.id),
    );
    expect(hidden.size).toBeGreaterThan(0);
    for (const job of legacy.jobs) {
      delete job.screeningCriteria;
      delete job.previousScreeningCriteria;
      delete job.criteriaChangedAt;
    }
    legacy.people = legacy.people.filter((p: { id: string }) => !hidden.has(p.id));
    legacy.applications = legacy.applications.filter(
      (a: { candidateId: string }) => !hidden.has(a.candidateId),
    );
    const restored = readState(memory(JSON.stringify(legacy)));
    expect(restored.blocked).toBe(false);
    expect(restored.issue).toBe("");
    expect(restored.state.people.some((p) => p.pickerHidden)).toBe(false);
    expect(restored.state.jobs.some((j) => j.screeningCriteria)).toBe(false);
  });
  it("round-trips a complete valid scenario", () => {
    const storage = memory();
    const s = initialState();
    saveState(storage, s);
    expect(readState(storage).state).toEqual(s);
    expect(parseState(serializeState(s))).toEqual(s);
  });
  it("protects incompatible/corrupt original saves", () => {
    for (const raw of ["{", JSON.stringify({ ...initialState(), version: 2 })]) {
      const storage = memory(raw);
      const loaded = readState(storage);
      expect(loaded.blocked).toBe(true);
      expect(loaded.original).toBe(raw);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    }
  });
  it("does not fail startup when storage access is denied", () => {
    expect(readState(null).state.jobs.length).toBeGreaterThan(0);
    expect(
      readState({
        getItem() {
          throw new Error("Denied");
        },
        setItem() {},
      }).blocked,
    ).toBe(true);
  });
  it("reports quota/write failure without altering the original", () => {
    const old = "old";
    const storage = {
      getItem: () => old,
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveState(storage, initialState())).toThrow("Wyeksportuj");
    expect(storage.getItem()).toBe(old);
  });
  it("rejects invalid references and oversized files", () => {
    const s = initialState();
    s.saved = [{ candidateId: "missing", jobId: s.jobs[0].id }];
    expect(() => parseState(JSON.stringify(s))).toThrow("Dotychczasowy stan");
    expect(() => parseState(" ".repeat(MAX_IMPORT_BYTES + 1))).toThrow("za duży");
  });
  it("accepts legacy appearance preferences without changing scenario data", () => {
    const state = initialState();
    for (const theme of ["dark", "system", "light"]) {
      expect(parseState(JSON.stringify({ ...state, theme }))).toEqual(state);
    }
  });
});
