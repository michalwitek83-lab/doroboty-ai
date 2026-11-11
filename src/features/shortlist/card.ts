/**
 * P1 candidate card: a deterministic, rule-based simulation over the candidate's own text.
 * It is not a model assessment and must be labelled as a simulation wherever it is shown.
 */
import type { Application, ScreeningCriterion } from "@/features/prototype/model";

export type CriterionStatus = "confirmed" | "missing" | "contradicted";
export type SourceKind = "answer" | "notes" | "cv";
export type Quote = { text: string; source: SourceKind };
export type CriterionResult = {
  id: string;
  label: string;
  status: CriterionStatus;
  quote?: Quote;
};
export type CandidateCard = {
  criteria: CriterionResult[];
  ownWork?: Quote;
  question: string;
  confirmed: number;
  missing: number;
  contradicted: number;
};

export const statusLabels: Record<CriterionStatus, string> = {
  confirmed: "potwierdzone",
  missing: "brak informacji",
  contradicted: "sprzeczne",
};
export const sourceLabels: Record<SourceKind, string> = {
  answer: "odpowiedź kandydata",
  notes: "notatki kandydata",
  cv: "CV",
};

type CardInput = Pick<Application, "answer" | "sourceNotes" | "generatedAnswer" | "cv">;

/**
 * The candidate's own text: the typed answer when no assistant proposal was generated,
 * otherwise the notes typed before the assistant. The CV snapshot is always included.
 * Generated proposals and assistant-derived answers are never quoted.
 */
export function cardSources(application: CardInput): { source: SourceKind; text: string }[] {
  const own: { source: SourceKind; text: string } =
    application.generatedAnswer.trim() === ""
      ? { source: "answer", text: application.answer }
      : { source: "notes", text: application.sourceNotes };
  const cv: { source: SourceKind; text: string } = { source: "cv", text: application.cv };
  return [own, cv].filter((item) => item.text.trim() !== "");
}

/** Polish abbreviations whose final dot does not end a sentence. */
const abbreviation =
  /(^|\s)(m\.in|np|ok|tj|tzn|tzw|itp|itd|ds|wg|ang|r|ul|nr|dr|prof|mgr|inż)\.$/iu;

export function sentences(text: string): string[] {
  const parts = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const merged: string[] = [];
  for (const part of parts) {
    const previous = merged.at(-1);
    if (previous !== undefined && abbreviation.test(previous))
      merged[merged.length - 1] += ` ${part}`;
    else merged.push(part);
  }
  return merged;
}

const lower = (value: string) => value.toLocaleLowerCase("pl");

/** A clause in which the candidate denies or hands over ownership of the work. */
const negatedOwnership =
  /(^|[\s(])nie\s+(ja|jestem|byłem|byłam|prowadzi|robi|zrobi|budowa|zbudowa|projektowa|zaprojektowa|pisa|napisa|wdraża|wdroży|odpowiada|tworzy|stworzy)|^\s*(mój\s+|nasz\s+|inny\s+)?zespół\s+(zrobił|zbudował|prowadził|przygotował|napisał)|(zrobił|zbudował|prowadził|robił|przygotował|napisał)\w*\s+(go|ją|je|to)\s+(zespół|ktoś inny|inna osoba)|tylko\s+(pomaga|wspiera|obserwowa)/u;

/** Clauses split on commas, semicolons and contrastive conjunctions, so negation stays local. */
function clauses(sentence: string) {
  return lower(sentence).split(/[,;:]|\s(?:ale|lecz|jednak|natomiast|a)\s/u);
}

export function isNegatedOwnership(text: string) {
  return clauses(text).some((clause) => negatedOwnership.test(clause.trim()));
}

/** Negation that applies to the clause where one of the evidence phrases appears. */
function contradicts(sentence: string, evidence: string[]) {
  return (
    clauses(sentence).some(
      (clause) =>
        evidence.some((phrase) => clause.includes(lower(phrase.trim()))) &&
        negatedOwnership.test(clause.trim()),
    ) || negatedHandover(sentence, evidence)
  );
}

/** "…autorką komponentu, zbudował go zespół danych": the handover clause follows the hit. */
function negatedHandover(sentence: string, evidence: string[]) {
  const parts = clauses(sentence);
  return parts.some(
    (clause, index) =>
      evidence.some((phrase) => clause.includes(lower(phrase.trim()))) &&
      /^\s*(zrobił|zbudował|prowadził|robił|przygotował|napisał)\w*\s+(go|ją|je|to)\s+(zespół|ktoś inny|inna osoba)/u.test(
        parts[index + 1] ?? "",
      ),
  );
}

/** First-person past-tense statement, e.g. "zbudowałam", "poprowadziłem". */
const firstPersonWork = /\p{L}+(łem|łam)(?![\p{L}])/u;

function matches(sentence: string, evidence: string[]) {
  const value = lower(sentence);
  return evidence.some((phrase) => value.includes(lower(phrase.trim())));
}

export function buildCandidateCard(
  criteria: ScreeningCriterion[],
  application: CardInput,
): CandidateCard {
  const units = cardSources(application).flatMap(({ source, text }) =>
    sentences(text).map((sentence) => ({ source, text: sentence })),
  );
  const results = criteria.map<CriterionResult>((criterion) => {
    const hits = units.filter((unit) => matches(unit.text, criterion.evidence));
    // A contradiction is surfaced even when another sentence confirms: it is worth asking about.
    const contradiction = hits.find((unit) => contradicts(unit.text, criterion.evidence));
    if (contradiction)
      return {
        id: criterion.id,
        label: criterion.label,
        status: "contradicted",
        quote: contradiction,
      };
    if (hits[0])
      return { id: criterion.id, label: criterion.label, status: "confirmed", quote: hits[0] };
    return { id: criterion.id, label: criterion.label, status: "missing" };
  });
  const ownWork = units.find(
    (unit) => firstPersonWork.test(lower(unit.text)) && !isNegatedOwnership(unit.text),
  );
  const count = (status: CriterionStatus) => results.filter((x) => x.status === status).length;
  return {
    criteria: results,
    ownWork,
    question: firstQuestion(results),
    confirmed: count("confirmed"),
    missing: count("missing"),
    contradicted: count("contradicted"),
  };
}

/** Quote inside a question without doubling the sentence's own final punctuation. */
const inline = (quote: Quote) => `„${quote.text.replace(/[.!?]+$/u, "")}”`;

function firstQuestion(results: CriterionResult[]) {
  const contradicted = results.find((x) => x.status === "contradicted");
  if (contradicted)
    return `Napisano: ${inline(contradicted.quote!)}. Jaka była Twoja część pracy w obszarze „${contradicted.label}”?`;
  const missing = results.find((x) => x.status === "missing");
  if (missing)
    return `Opowiedz o konkretnym przykładzie z obszaru „${missing.label}”. Co w nim zrobiłeś lub zrobiłaś samodzielnie?`;
  const first = results.find((x) => x.quote);
  if (first)
    return `Napisano: ${inline(first.quote!)}. Jak zmierzono ten wynik i co było Twoją decyzją?`;
  return "Opowiedz o projekcie, w którym Twoja praca najbardziej wpłynęła na wynik.";
}
