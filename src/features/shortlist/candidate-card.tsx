import { Link } from "react-router";
import { AlertTriangle, CheckCircle2, CircleHelp } from "lucide-react";
import type { Application, ScreeningCriterion, State } from "@/features/prototype/model";
import { MatchScore } from "@/features/prototype/match-score";
import {
  buildCandidateCard,
  sourceLabels,
  statusLabels,
  type CandidateCard,
  type CriterionStatus,
} from "./card";
import { rankShortlist } from "./rank";

const statusIcons: Record<CriterionStatus, typeof CheckCircle2> = {
  confirmed: CheckCircle2,
  missing: CircleHelp,
  contradicted: AlertTriangle,
};
const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });

export const SIMULATION_NOTE = "Symulacja: reguły na tekście kandydata, nie ocena modelu.";

function CardBody({ card, headingId }: { card: CandidateCard; headingId: string }) {
  return (
    <>
      <ul className="candidate-card-criteria" aria-labelledby={headingId}>
        {card.criteria.map((criterion) => {
          const Icon = statusIcons[criterion.status];
          return (
            <li key={criterion.id} data-status={criterion.status}>
              <div className="candidate-card-criterion">
                <strong>{criterion.label}</strong>
                <span className="candidate-card-status" data-status={criterion.status}>
                  <Icon aria-hidden="true" size={16} />
                  {statusLabels[criterion.status]}
                </span>
              </div>
              {criterion.quote && (
                <figure className="candidate-card-quote">
                  <blockquote>„{criterion.quote.text}”</blockquote>
                  <figcaption>Źródło: {sourceLabels[criterion.quote.source]}</figcaption>
                </figure>
              )}
            </li>
          );
        })}
      </ul>
      <dl className="candidate-card-facts">
        <div>
          <dt>Co kandydat zrobił sam</dt>
          <dd>
            {card.ownWork ? (
              <>
                „{card.ownWork.text}” <span>({sourceLabels[card.ownWork.source]})</span>
              </>
            ) : (
              "Brak zdania o własnej części pracy."
            )}
          </dd>
        </div>
        <div>
          <dt>Pytanie na pierwszą rozmowę</dt>
          <dd>{card.question}</dd>
        </div>
      </dl>
    </>
  );
}

/** Card for current criteria and, after an edit, a second card for the previous criteria. */
export function CandidateCardPanel({
  job,
  application,
}: {
  job: State["jobs"][number] | undefined;
  application: Application;
}) {
  const previous: ScreeningCriterion[] | undefined = job?.previousScreeningCriteria;
  if (!job || (!job.screeningCriteria?.length && !previous?.length))
    return (
      <>
        <h3>Karta kandydata</h3>
        <p>
          To ogłoszenie nie ma kryteriów screeningu. Dodaj je w edycji oferty, aby zobaczyć kartę.
        </p>
      </>
    );
  return (
    <div className="candidate-card">
      <h3 id="card-current">Karta kandydata — bieżące kryteria</h3>
      <p className="record-caption">{SIMULATION_NOTE}</p>
      {job.screeningCriteria?.length ? (
        <CardBody
          card={buildCandidateCard(job.screeningCriteria, application)}
          headingId="card-current"
        />
      ) : (
        <p>Ogłoszenie nie ma teraz kryteriów screeningu.</p>
      )}
      {previous?.length ? (
        <section className="candidate-card-previous" aria-labelledby="card-previous">
          <h3 id="card-previous">Poprzednie kryteria</h3>
          <p className="record-caption">
            Kryteria zmieniono{" "}
            {job.criteriaChangedAt && (
              <time dateTime={job.criteriaChangedAt}>
                {dateFormat.format(new Date(job.criteriaChangedAt))}
              </time>
            )}
            . Tak wyglądała karta przed zmianą.
          </p>
          <CardBody card={buildCandidateCard(previous, application)} headingId="card-previous" />
        </section>
      ) : null}
    </div>
  );
}

/** "Od kogo zacząć dziś": up to five active applications per own job, ordered by the card. */
export function DailyShortlists({ state, companyId }: { state: State; companyId?: string }) {
  const jobs = state.jobs.filter((job) => job.companyId === companyId);
  const lists = jobs
    .map((job) => ({
      job,
      entries: rankShortlist(
        job.screeningCriteria,
        state.applications.filter((application) => application.jobId === job.id),
      ),
    }))
    .filter((list) => list.entries.length > 0);
  if (!lists.length) return null;
  return (
    <section className="daily-shortlists" aria-labelledby="daily-shortlists-title">
      <h2 id="daily-shortlists-title">Od kogo zacząć dziś</h2>
      <p className="record-caption">
        {dayFormat.format(new Date())}. Kolejność według karty kandydata, nie według Match Score.{" "}
        {SIMULATION_NOTE} Wszystkie aplikacje są niżej.
      </p>
      {lists.map(({ job, entries }) => (
        <section key={job.id} className="daily-shortlist" aria-labelledby={`shortlist-${job.id}`}>
          <h3 id={`shortlist-${job.id}`}>{job.title}</h3>
          <ol>
            {entries.map(({ application, card }) => (
              <li key={application.id}>
                <div className="daily-shortlist-row">
                  <Link to={`/app/kandydaci/${application.id}`}>{application.candidateName}</Link>
                  <span className="daily-shortlist-counts">
                    Potwierdzone: {card.confirmed}/{card.criteria.length}
                    {card.contradicted > 0 && ` · sprzeczne: ${card.contradicted}`}
                  </span>
                  <MatchScore score={application.score} />
                </div>
                <p>{card.question}</p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </section>
  );
}
