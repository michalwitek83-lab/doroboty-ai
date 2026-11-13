import { describe, expect, it } from "vitest";
import { initialState, transition } from "@/features/prototype/model";
import { buildCandidateCard, cardSources, isNegatedOwnership } from "./card";
import { rankShortlist } from "./rank";

const criteria = [
  { id: "research", label: "Badania z użytkownikami", evidence: ["wywiad", "badań"] },
  { id: "outcome", label: "Mierzalny wynik", evidence: ["%"] },
  { id: "eval", label: "Ocena jakości", evidence: ["ewaluac"] },
];
const base = { cv: "CV bez konkretów.", sourceNotes: "", generatedAnswer: "" };

describe("candidate card rules", () => {
  it("reads the typed answer when no assistant proposal was generated", () => {
    expect(cardSources({ ...base, answer: "Moja odpowiedź." }).map((x) => x.source)).toEqual([
      "answer",
      "cv",
    ]);
  });
  it("reads the candidate notes, never the generated proposal, when the assistant was used", () => {
    const card = buildCandidateCard(criteria, {
      ...base,
      sourceNotes: "Przeprowadziłam 10 wywiadów.",
      generatedAnswer: "Proponowany tekst: wynik wzrósł o 50%.",
      answer: "Proponowany tekst: wynik wzrósł o 50%.",
    });
    expect(card.criteria.map((x) => x.status)).toEqual(["confirmed", "missing", "missing"]);
    expect(card.criteria[0].quote).toEqual({
      text: "Przeprowadziłam 10 wywiadów.",
      source: "notes",
    });
  });
  it("marks a negated ownership sentence as contradicted and quotes it exactly", () => {
    const card = buildCandidateCard(criteria, {
      ...base,
      answer: "Nie prowadziłem badań z użytkownikami, robił je zespół UX. Czas spadł o 12%.",
    });
    expect(card.criteria[0]).toMatchObject({
      status: "contradicted",
      quote: { text: "Nie prowadziłem badań z użytkownikami, robił je zespół UX." },
    });
    expect(card.criteria[1].status).toBe("confirmed");
    expect(card.question).toContain("Nie prowadziłem badań");
  });
  it("finds a first-person own-work sentence and asks about a missing criterion", () => {
    const card = buildCandidateCard(criteria, {
      ...base,
      answer: "Zbudowałam prototyp i przeprowadziłam wywiady. Wynik poprawił się o 5%.",
    });
    expect(card.ownWork?.text).toBe("Zbudowałam prototyp i przeprowadziłam wywiady.");
    expect(card.question).toContain("„Ocena jakości”");
  });
  it("keeps negation local to the clause and does not split on abbreviations", () => {
    const evidence = [{ id: "prod", label: "Produkcja", evidence: ["wdroż", "produkcj"] }];
    for (const answer of [
      "Wdrożyłem model na produkcję i nie miałem żadnych incydentów.",
      "Nie było łatwo, ale wdrożyłam to na produkcję.",
      "Zbudowałem zespół 5 osób i wdrożyłem produkt.",
      "Mój zespół zbudował prototyp, a ja wdrożyłam go na produkcję.",
    ])
      expect(buildCandidateCard(evidence, { ...base, answer }).criteria[0].status, answer).toBe(
        "confirmed",
      );
    expect(
      buildCandidateCard(evidence, { ...base, answer: "To nie ja wdrożyłem system na produkcję." })
        .criteria[0].status,
    ).toBe("contradicted");
    const card = buildCandidateCard(criteria, {
      ...base,
      answer: "Nie prowadziłam m.in. badań z klientami. Wynik: ok. 30% mniej zgłoszeń.",
    });
    expect(card.criteria[0]).toMatchObject({
      status: "contradicted",
      quote: { text: "Nie prowadziłam m.in. badań z klientami." },
    });
    expect(card.criteria[1].quote?.text).toBe("Wynik: ok. 30% mniej zgłoszeń.");
  });
  it("detects typical ownership denials", () => {
    expect(isNegatedOwnership("Nie jestem autorką komponentu indeksowania.")).toBe(true);
    expect(isNegatedOwnership("Komponent zbudował go zespół danych.")).toBe(true);
    expect(isNegatedOwnership("Samodzielnie poprowadziłam wdrożenie.")).toBe(false);
  });
});

describe("daily shortlist", () => {
  it("ranks the scenario by card, not by Match Score, and keeps at most five", () => {
    const s = initialState();
    const job = s.jobs.find((x) => x.slug === "ai-product-manager")!;
    const list = rankShortlist(
      job.screeningCriteria,
      s.applications.filter((x) => x.jobId === job.id),
    );
    expect(list).toHaveLength(5);
    expect(list.map((x) => x.application.candidateName)).toEqual([
      "Ewa Mazur",
      "Marek Nowak",
      "Natalia Wójcik",
      "Adam Wróbel",
      "Olga Krawczyk",
    ]);
    expect(list.some((x) => x.application.candidateName === "Jakub Lis")).toBe(false);
  });
  it("is empty without criteria and skips closed applications", () => {
    const s = initialState();
    expect(rankShortlist(undefined, s.applications)).toEqual([]);
    const closed = s.applications.map((x) => ({ ...x, stage: "rejected" as const }));
    expect(rankShortlist([criteria[0]], closed)).toEqual([]);
  });
});

describe("criteria history and verbatim text", () => {
  it("keeps the previous criteria when the employer edits them", () => {
    let s = transition(initialState(), { type: "select_person", id: "employer-brightlabs" });
    const job = s.jobs.find((x) => x.slug === "ai-product-manager")!;
    const original = job.screeningCriteria!;
    const changed = original.slice(0, 2);
    s = transition(
      s,
      { type: "publish", job: { ...job, screeningCriteria: changed } },
      "2026-11-11T10:00:00.000Z",
    );
    const edited = s.jobs.find((x) => x.id === job.id)!;
    expect(edited.screeningCriteria).toEqual(changed);
    expect(edited.previousScreeningCriteria).toEqual(original);
    expect(edited.criteriaChangedAt).toBe("2026-11-11T10:00:00.000Z");
    // Republishing without a criteria change keeps the recorded history.
    s = transition(s, { type: "publish", job: { ...edited, previousScreeningCriteria: [] } });
    expect(s.jobs.find((x) => x.id === job.id)!.previousScreeningCriteria).toEqual(original);
  });
  it("stores candidate answer and notes exactly as typed", () => {
    const s = transition(initialState(), { type: "select_person", id: "candidate-anna" });
    const answer = "  Odpowiedź z wcięciem i nową linią.\n\n";
    const notes = "\n  moje notatki  ";
    const next = transition(s, {
      type: "submit",
      jobId: s.jobs[0].id,
      notes,
      generated: "",
      answer,
      consent: true,
    });
    const app = next.applications.find((x) => x.candidateId === "candidate-anna")!;
    expect(app.answer).toBe(answer);
    expect(app.sourceNotes).toBe(notes);
  });
});
