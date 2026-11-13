import type { Application, ScreeningCriterion } from "@/features/prototype/model";
import { buildCandidateCard, type CandidateCard } from "./card";

export const SHORTLIST_SIZE = 5;
const closedStages: Application["stage"][] = ["rejected", "withdrawn", "hired"];

export type ShortlistEntry = { application: Application; card: CandidateCard };

/**
 * Orders active applications by the P1 card: most confirmed criteria, fewest contradictions,
 * then earliest submission. Match Score does not take part in the order.
 */
export function rankShortlist(
  criteria: ScreeningCriterion[] | undefined,
  applications: Application[],
  size = SHORTLIST_SIZE,
): ShortlistEntry[] {
  if (!criteria?.length) return [];
  return applications
    .filter((application) => !closedStages.includes(application.stage))
    .map((application) => ({ application, card: buildCandidateCard(criteria, application) }))
    .sort(
      (a, b) =>
        b.card.confirmed - a.card.confirmed ||
        a.card.contradicted - b.card.contradicted ||
        a.application.events[0].at.localeCompare(b.application.events[0].at),
    )
    .slice(0, size);
}
