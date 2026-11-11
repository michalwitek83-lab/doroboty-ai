import { z } from "zod";
import marketplace from "./data/marketplace.json" with { type: "json" };
import people from "./data/people.json" with { type: "json" };
import shortlistScenario from "./data/shortlist-scenario.json" with { type: "json" };
import type { JobWithCompany } from "@/features/jobs/types";

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const shortText = z.string().trim().min(1).max(200);
const text = z.string().trim().max(12000);
/** Candidate-authored text is stored exactly as typed: no trimming or normalisation. */
const verbatimText = z.string().max(12000);
export const MIN_APPLICATION_ANSWER_LENGTH = 20;
export const MAX_SCREENING_CRITERIA = 5;
export const screeningCriterionSchema = z.object({
  id,
  label: shortText,
  evidence: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
});
export type ScreeningCriterion = z.infer<typeof screeningCriterionSchema>;
const criteriaList = z.array(screeningCriterionSchema).max(MAX_SCREENING_CRITERIA);
const companySchema = z.object({
  id,
  slug: id,
  name: shortText,
  summary: text,
  description: text,
  websiteUrl: z.string().max(500),
  location: shortText,
  sizeLabel: shortText,
  logoUrl: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional(),
});
export const jobSchema = z
  .object({
    id,
    slug: id,
    companyId: id,
    title: shortText,
    summary: text.min(10),
    description: text.min(30),
    category: z.enum(["build", "apply", "lead"]),
    function: z.enum(["product", "engineering", "data", "design", "marketing", "operations"]),
    remoteStatus: z.enum(["onsite", "hybrid", "remote"]),
    locations: z.array(shortText).min(1).max(10),
    coordinates: z
      .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
      .optional(),
    seniority: z.enum(["junior", "mid", "senior", "lead"]),
    contract: z.enum(["employment", "b2b", "mandate"]),
    salaryMin: z.number().nonnegative().optional(),
    salaryMax: z.number().nonnegative().optional(),
    salaryCurrency: z.enum(["PLN", "EUR"]).optional(),
    salaryPeriod: z.enum(["month", "year"]).optional(),
    salaryKind: z.enum(["gross", "net"]).optional(),
    publicationStatus: z.enum(["draft", "review", "published", "hidden", "expired", "archived"]),
    publishedAt: z.iso.datetime(),
    expiryAt: z.iso.datetime(),
    verificationStatus: z.enum(["unverified", "editorial", "employer_verified"]),
    sourceBrief: text.optional(),
    generatedDescription: text.optional(),
    screeningCriteria: criteriaList.optional(),
    previousScreeningCriteria: criteriaList.optional(),
    criteriaChangedAt: z.iso.datetime().optional(),
  })
  .refine(
    (job) =>
      job.salaryMin === undefined || job.salaryMax === undefined || job.salaryMin <= job.salaryMax,
    { path: ["salaryMax"], message: "Salary maximum must not be below minimum" },
  );
export const profileSchema = z.object({
  name: shortText,
  headline: shortText,
  bio: text,
  location: shortText,
});
const personSchema = profileSchema.extend({
  id,
  role: z.enum(["candidate", "employer", "operator"]),
  companyId: id.optional(),
  cv: text,
  exampleScore: z.number().int().min(0).max(100),
  exampleSummary: text,
  /** Synthetic scenario applicants that are not offered in the person picker. */
  pickerHidden: z.boolean().optional(),
});
export const stages = [
  "submitted",
  "reviewed",
  "interview_invited",
  "first_conversation_held",
  "continued",
  "rejected",
  "withdrawn",
  "hired",
] as const;
export type Stage = (typeof stages)[number];
export const stageLabels: Record<Stage, string> = {
  submitted: "Aplikacja wysłana",
  reviewed: "W przeglądzie",
  interview_invited: "Zaproszenie na rozmowę",
  first_conversation_held: "Pierwsza rozmowa odbyta",
  continued: "Kolejny etap",
  rejected: "Proces zakończony",
  withdrawn: "Wycofana",
  hired: "Zatrudnienie",
};
export const nextStages: Record<Stage, Stage[]> = {
  submitted: ["reviewed", "rejected"],
  reviewed: ["interview_invited", "rejected"],
  interview_invited: ["first_conversation_held", "rejected"],
  first_conversation_held: ["continued", "rejected"],
  continued: ["hired", "rejected"],
  rejected: [],
  withdrawn: [],
  hired: [],
};
const applicationSchema = z.object({
  id,
  candidateId: id,
  jobId: id,
  companyId: id,
  jobTitle: shortText,
  candidateName: shortText,
  cv: text.min(20),
  answer: verbatimText.refine((value) => value.trim().length >= MIN_APPLICATION_ANSWER_LENGTH),
  sourceNotes: verbatimText,
  generatedAnswer: verbatimText,
  score: z.number().int().min(0).max(100),
  summary: text,
  stage: z.enum(stages),
  events: z
    .array(z.object({ stage: z.enum(stages), at: z.iso.datetime(), note: text }))
    .min(1)
    .max(30),
});
const draftSchema = z.object({
  candidateId: id,
  jobId: id,
  notes: verbatimText,
  generated: verbatimText,
  answer: verbatimText,
});
export const stateSchema = z
  .object({
    version: z.literal(1),
    activePersonId: id.nullable(),
    companies: z.array(companySchema).min(1).max(200),
    jobs: z.array(jobSchema).min(1).max(1000),
    people: z.array(personSchema).min(1).max(100),
    applications: z.array(applicationSchema).max(2000),
    saved: z.array(z.object({ candidateId: id, jobId: id })).max(5000),
    drafts: z.array(draftSchema).max(1000),
  })
  .superRefine((s, ctx) => {
    const problem = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const list of [s.companies, s.jobs, s.people, s.applications]) {
      if (new Set(list.map((x) => x.id)).size !== list.length) problem("Duplicate identifiers");
    }
    if (
      new Set(s.jobs.map((x) => x.slug)).size !== s.jobs.length ||
      new Set(s.companies.map((x) => x.slug)).size !== s.companies.length
    )
      problem("Duplicate slugs");
    const companyIds = new Set(s.companies.map((x) => x.id));
    const jobs = new Map(s.jobs.map((x) => [x.id, x]));
    const candidates = new Set(s.people.filter((x) => x.role === "candidate").map((x) => x.id));
    if (s.activePersonId !== null && !s.people.some((x) => x.id === s.activePersonId))
      problem("Unknown active person");
    for (const p of s.people)
      if (p.role === "employer" && (!p.companyId || !companyIds.has(p.companyId)))
        problem("Unknown employer company");
    for (const j of s.jobs) if (!companyIds.has(j.companyId)) problem("Unknown job company");
    const keys = new Set<string>();
    for (const a of s.applications) {
      const key = `${a.candidateId}:${a.jobId}`;
      if (
        !candidates.has(a.candidateId) ||
        jobs.get(a.jobId)?.companyId !== a.companyId ||
        keys.has(key)
      )
        problem("Invalid application reference");
      keys.add(key);
      if (a.events[0]?.stage !== "submitted" || a.events.at(-1)?.stage !== a.stage)
        problem("Invalid application history");
      for (let i = 1; i < a.events.length; i++) {
        const before = a.events[i - 1];
        const after = a.events[i];
        if (!(
          nextStages[before.stage].includes(after.stage) ||
          (after.stage === "withdrawn" &&
            !["hired", "rejected", "withdrawn"].includes(before.stage))
        ))
          problem("Invalid stage transition");
        if (after.at < before.at) problem("Invalid event order");
      }
    }
    for (const list of [s.saved, s.drafts]) {
      const pairs = new Set<string>();
      for (const item of list) {
        const key = `${item.candidateId}:${item.jobId}`;
        if (!candidates.has(item.candidateId) || !jobs.has(item.jobId) || pairs.has(key))
          problem("Invalid candidate/job reference");
        pairs.add(key);
      }
    }
  });
export type State = z.infer<typeof stateSchema>;
export type Person = State["people"][number];
export type Application = State["applications"][number];
export type Action =
  | { type: "select_person"; id: string | null }
  | { type: "profile"; value: z.infer<typeof profileSchema> }
  | { type: "toggle_saved"; jobId: string }
  | { type: "draft"; jobId: string; notes: string; generated: string; answer: string }
  | {
      type: "submit";
      jobId: string;
      notes: string;
      generated: string;
      answer: string;
      consent: boolean;
    }
  | { type: "stage"; applicationId: string; stage: Stage; note: string }
  | { type: "withdraw"; applicationId: string }
  | { type: "publish"; job: z.infer<typeof jobSchema> }
  | { type: "company"; name: string; description: string };

export function initialState(): State {
  const state = stateSchema.parse({
    version: 1,
    activePersonId: null,
    ...marketplace,
    people,
    applications: [],
    saved: [],
    drafts: [],
  });
  const bob = state.people.find((x) => x.id === "candidate-marek")!;
  const job = state.jobs[0];
  state.applications.push({
    id: "application-example",
    candidateId: bob.id,
    jobId: job.id,
    companyId: job.companyId,
    jobTitle: job.title,
    candidateName: bob.name,
    cv: bob.cv,
    answer:
      "Pracowałem nad automatyzacją obsługi zgłoszeń. Poprowadziłem badania z użytkownikami i wdrożenie, które skróciło czas odpowiedzi o 25%. Chętnie opowiem o decyzjach i ograniczeniach tego projektu.",
    sourceNotes: "",
    generatedAnswer: "",
    score: bob.exampleScore,
    summary: bob.exampleSummary,
    stage: "submitted",
    events: [{ stage: "submitted", at: "2026-11-02T09:00:00.000Z", note: "" }],
  });
  addShortlistScenario(state);
  return stateSchema.parse(state);
}
/** P1 scenario: screening criteria and six synthetic applicants (pickerHidden). */
function addShortlistScenario(state: State) {
  const criteria = shortlistScenario.criteria as Record<string, ScreeningCriterion[]>;
  for (const job of state.jobs) if (criteria[job.slug]) job.screeningCriteria = criteria[job.slug];
  state.people.push(...shortlistScenario.people.map((person) => personSchema.parse(person)));
  const job = state.jobs.find((x) => x.slug === "ai-product-manager")!;
  for (const item of shortlistScenario.applications) {
    const person = state.people.find((x) => x.id === item.candidateId)!;
    const notes = item.sourceNotes ?? "";
    const generated = item.useAssistant ? draftAnswer(person, job.title, notes) : "";
    state.applications.push({
      id: `application-${person.id.replace("candidate-", "")}`,
      candidateId: person.id,
      jobId: job.id,
      companyId: job.companyId,
      jobTitle: job.title,
      candidateName: person.name,
      cv: person.cv,
      answer: item.answer ?? generated,
      sourceNotes: notes,
      generatedAnswer: generated,
      score: person.exampleScore,
      summary: person.exampleSummary,
      stage: "submitted",
      events: [{ stage: "submitted", at: item.submittedAt, note: "" }],
    });
  }
}
export function publishedJobs(state: State): JobWithCompany[] {
  return state.jobs
    .filter((x) => x.publicationStatus === "published")
    .map((job) => ({ ...job, company: state.companies.find((x) => x.id === job.companyId)! }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
/** Simulated candidate assistant: a deterministic template, not a provider model. */
export function draftAnswer(person: Person, title: string, notes: string) {
  return `Aplikuję na stanowisko ${title}. ${person.headline}.\n\n${person.cv.slice(0, 650)}${notes.trim() ? `\n\n${notes.trim().slice(0, 9000)}` : ""}\n\nChętnie przedstawię sposób pracy i decyzje podjęte w opisanych projektach.`;
}
export function currentPerson(state: State) {
  return state.people.find((x) => x.id === state.activePersonId);
}
export function transition(
  state: State,
  action: Action,
  now = new Date().toISOString(),
  newId: string = crypto.randomUUID(),
): State {
  const s = structuredClone(state);
  const person = currentPerson(s);
  const fail = (message: string): never => {
    throw new Error(message);
  };
  const candidate = () => {
    if (person?.role !== "candidate") return fail("Wybierz profil kandydata.");
    return person;
  };
  const employer = () => {
    if (person?.role !== "employer") return fail("Wybierz profil pracodawcy.");
    return person;
  };
  if (action.type === "select_person") {
    if (action.id !== null && !s.people.some((x) => x.id === action.id))
      fail("Nie znaleziono osoby.");
    s.activePersonId = action.id;
  } else if (action.type === "profile")
    Object.assign(candidate(), profileSchema.parse(action.value));
  else if (action.type === "toggle_saved") {
    const p = candidate();
    if (!s.jobs.some((x) => x.id === action.jobId)) fail("Nie znaleziono oferty.");
    const index = s.saved.findIndex((x) => x.candidateId === p.id && x.jobId === action.jobId);
    if (index >= 0) s.saved.splice(index, 1);
    else s.saved.push({ candidateId: p.id, jobId: action.jobId });
  } else if (action.type === "draft") {
    const p = candidate();
    const draft = draftSchema.parse({ candidateId: p.id, ...action });
    s.drafts = s.drafts.filter((x) => !(x.candidateId === p.id && x.jobId === action.jobId));
    s.drafts.push(draft);
  } else if (action.type === "submit") {
    const p = candidate();
    const job = s.jobs.find((x) => x.id === action.jobId && x.publicationStatus === "published");
    if (!job) return fail("Oferta nie jest dostępna.");
    if (!action.consent) fail("Zaakceptuj regulamin, aby wysłać aplikację.");
    if (s.applications.some((x) => x.candidateId === p.id && x.jobId === job.id))
      fail("Aplikacja na tę ofertę została już wysłana.");
    s.applications.push(
      applicationSchema.parse({
        id: newId,
        candidateId: p.id,
        jobId: job.id,
        companyId: job.companyId,
        jobTitle: job.title,
        candidateName: p.name,
        cv: p.cv,
        answer: action.answer,
        sourceNotes: action.notes,
        generatedAnswer: action.generated,
        score: p.exampleScore,
        summary: p.exampleSummary,
        stage: "submitted",
        events: [{ stage: "submitted", at: now, note: "" }],
      }),
    );
    s.drafts = s.drafts.filter((x) => !(x.candidateId === p.id && x.jobId === job.id));
  } else if (action.type === "stage" || action.type === "withdraw") {
    const application = s.applications.find((x) => x.id === action.applicationId);
    if (!application) return fail("Nie znaleziono aplikacji.");
    const stage = action.type === "withdraw" ? "withdrawn" : action.stage;
    if (action.type === "withdraw") {
      const p = candidate();
      if (
        application.candidateId !== p.id ||
        ["hired", "rejected", "withdrawn"].includes(application.stage)
      )
        fail("Nie można wycofać tej aplikacji.");
    } else {
      const p = employer();
      if (application.companyId !== p.companyId || !nextStages[application.stage].includes(stage))
        fail("Ta zmiana etapu nie jest dostępna.");
    }
    application.stage = stage;
    application.events.push({ stage, at: now, note: action.type === "stage" ? action.note : "" });
  } else if (action.type === "publish") {
    const p = employer();
    const job = jobSchema.parse(action.job);
    if (job.companyId !== p.companyId) fail("Wybierz ofertę własnej firmy.");
    const index = s.jobs.findIndex((x) => x.id === job.id);
    const before = index >= 0 ? s.jobs[index] : undefined;
    if (before && before.companyId !== p.companyId) fail("Nie można zmienić tej oferty.");
    // Criteria history is owned by the domain, never by the submitted form.
    delete job.previousScreeningCriteria;
    delete job.criteriaChangedAt;
    if (before?.previousScreeningCriteria) {
      job.previousScreeningCriteria = before.previousScreeningCriteria;
      job.criteriaChangedAt = before.criteriaChangedAt;
    }
    if (
      before?.screeningCriteria?.length &&
      JSON.stringify(before.screeningCriteria) !== JSON.stringify(job.screeningCriteria ?? [])
    ) {
      job.previousScreeningCriteria = before.screeningCriteria;
      job.criteriaChangedAt = now;
    }
    if (index >= 0) {
      s.jobs[index] = job;
    } else s.jobs.unshift(job);
  } else if (action.type === "company") {
    const p = employer();
    Object.assign(
      s.companies.find((x) => x.id === p.companyId)!,
      { name: shortText.parse(action.name), description: text.parse(action.description) },
    );
  }
  return stateSchema.parse(s);
}
