# P1 — candidate cards and daily shortlist (proposal)

Status: **implemented, awaiting Playwright run and human recruiter test** on branch `feature/p1-candidate-cards`. Decisions below supersede conflicting lines in the original proposal sections.

## Source and decision

- Idea P1 from the week-2 supersprint ("ponowny zakup pracodawców"), focus OF6 "kilka osób wartych rozmowy": `super-brain-AIPH3/3-Projects/doroboty-ai/supersprint/tydzien-2-ponowny-zakup/04-ideas.md`.
- Decision D1 (closed 2026-11-11): T1 moves to the prototype phase as candidate cards built from the candidate's own text. `decisions/2026-10-31-prototyp-kart-kandydatow-t1.md`.
- T1 check (2026-11-10, synthetic June 2026 data): "all criteria confirmed" 38.9% continuation vs "some contradicted" 13.7%; Match Score ≥75 30.9% vs <75 28.0%. The stop condition was not met. Limits: template data, rule-built cards, invitees only, continuation is not repurchase.
- The supersprint README points to `Tydzien_3/Case Forge/prototyp-p1-karty/`; that folder does not exist, so this proposal is derived from the idea, D1 and the T1 report, not from an existing prototype.

## Decisions from review (Michał, 2026-11-11)

- **Candidate text is stored exactly as typed** (no trimming or normalisation) and is the card's source.
- **No separate consent for the card.** On submit the candidate accepts the DoRoboty.ai terms of service (regulamin), which will contain the consents for using all information the candidate adds. The submit checkbox becomes the terms acceptance; no extra field is added for the card.

## Decisions from review (Michał, 2026-11-11, second round)

- **Restore the candidate assistant (CAN-12) exactly as it worked before** (`97d1df9^`): optional notes field "Twoje notatki do aplikacji (opcjonalnie)", "Przygotuj propozycję z AI", proposal preview, "Użyj propozycji", then the editable answer. Additionally the text the candidate typed is stored verbatim. Card source rule: if the candidate never generated a proposal (`generatedAnswer` empty), the card reads the submitted `answer` (typed by the candidate); otherwise it reads the candidate's `sourceNotes`. Both cases add the CV snapshot. `generatedAnswer` and an assistant-derived `answer` are never quoted.
- **Q1: cards are built from rules** (deterministic, labelled as simulation).
- **Q3: cards follow criteria edits.** When an employer changes criteria, the job keeps the previous set and the change time. The card shows the card for the current criteria and, if there was a change, a second card for the previous criteria. Ranking uses current criteria.
- **Q4: 6 synthetic candidates** are enough for the recruiter test.

What this prototype can and cannot show: it lets a real recruiter try the card and shortlist with synthetic data (weekly deliverable 3). It does not show model quality, hiring probability or repurchase (CASE_PROTOCOL).

## Mapping P1 to the current app

| P1 element                                                         | Current app                                                                                                                                                  | Proposed change                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screening criteria per job                                         | Jobs have no criteria (`jobSchema`)                                                                                                                          | Optional `screeningCriteria` on jobs, edited in the job editor (EMP-05)                                                                                                                                                                                   |
| Candidate's text before assistant edits (`application_answer_raw`) | No assistant since CAN-12 was removed; candidates write `answer` directly. The schema trims leading/trailing whitespace. Legacy saves may hold `sourceNotes` | Store `answer` verbatim (stop trimming it on save; validate the 20-character minimum on the trimmed length only). Card source = submitted `answer` plus the CV snapshot. For legacy records only: prefer non-empty `sourceNotes`. Never `generatedAnswer` |
| Portfolio / profile (`portfolio_raw`)                              | Profile `bio` is live, CV is snapshotted on submit                                                                                                           | Use only the snapshotted CV, so the card does not change when the profile changes (BRIEF: submitted records are immutable)                                                                                                                                |
| Per-criterion status + quote                                       | —                                                                                                                                                            | Card: `potwierdzone` / `brak informacji` / `sprzeczne` with the quoted sentence                                                                                                                                                                           |
| "What the candidate did themselves"                                | —                                                                                                                                                            | One sentence, quoted from first-person ownership statements                                                                                                                                                                                               |
| One question for the first conversation                            | —                                                                                                                                                            | Generated from the first contradicted, else first missing criterion                                                                                                                                                                                       |
| Daily list of up to 5 per job                                      | `/#/app/kandydaci` lists all applications with Match Score                                                                                                   | Section "Od kogo zacząć dziś" per job, max 5; all other applications remain listed below as today                                                                                                                                                         |
| Candidate consent to show raw text                                 | Submit requires the checkbox "Zatwierdzam treść aplikacji i przesłanie profilu oraz przykładowego CV pracodawcy"                                             | Replace it with acceptance of the terms of service, linked to a new `/#/regulamin` page. No separate card consent                                                                                                                                         |

## Proposed scope

1. **Screening criteria (EMP-05).** `screeningCriteria?: { id, label, evidence: string[] }[]`, max 5, optional so existing saves and imports stay valid at `version: 1`. `evidence` holds the phrases the simulation looks for; the editor shows them as "Po czym poznać" so the employer sees what the rule checks. Seed criteria for the BrightLabs "AI Product Manager" job and one Northstar job.
2. **Card builder (simulated).** Pure function in `src/features/shortlist/card.ts`: `buildCandidateCard(job, application) → { criteria: { id, status, quote }[], ownWork, question }`. Deterministic rules on sentences: evidence phrase present → confirmed; evidence phrase inside a negated ownership sentence (e.g. "nie jestem autorką", "nie prowadziłem", "zespół zrobił") → contradicted; otherwise missing with no quote. Quotes are exact sentences from the source text, never paraphrased. Every card carries the label "Symulacja: reguły na tekście kandydata, nie ocena modelu".
3. **Ranking and daily shortlist (EMP-07).** Pure `rankShortlist(job, applications)`: exclude terminal stages (rejected, withdrawn, hired); sort by confirmed count desc, contradicted count asc, earlier submission first; take 5. The list is computed on open and labelled with today's date; there is no scheduler or morning message in this version. Jobs without criteria show no shortlist, only the existing list with a prompt to add criteria. Match Score stays visible in the full list and on detail, but does not affect order.
4. **Card on application detail (EMP-08).** New "Karta" tab in the existing RecordSheet tabs, first in order, next to answer and CV. Status uses text and icon, not colour alone. The recruiter's note and stage actions are unchanged; the card never changes a stage automatically (preserve human decision).
5. **Terms acceptance on submit (CAN-09, CAN-13, new PUB-14).** The submit checkbox reads "Akceptuję regulamin serwisu DoRoboty.ai" with a link to `/#/regulamin`, opened without losing the form state. Submission stays blocked until it is checked, as today. The terms page is a prototype placeholder that lists the planned consents (processing of the answer, CV and profile; showing quotes from them to the employer on the candidate card) and is clearly marked as not a legal document; the final wording comes from the business/legal owner. The application form keeps one caption: the employer will see a card with quotes from this answer and the CV. The domain `submit` action keeps a boolean, renamed in UI only, so version-1 saves are unaffected. Storing the acceptance time or terms version is out of scope (see open questions).
6. **Synthetic scenario (SYS-07).** Add 6 synthetic candidate applications to the BrightLabs AI Product Manager job so a shortlist of 5 from 8 is meaningful. Include: concrete own-work text with low Match Score; polished generic text with high Match Score; an explicit contradiction ("Nie jestem autorką komponentu…", as in C4); a thin text that yields only "brak informacji". These candidates get `pickerHidden: true` (new optional person field) so the person picker still shows only Anna and Marek. Existing browser saves keep their data; the new scenario appears after reset or import (documented in settings help).

## Out of scope

Real model or provider AI; restoring the candidate writing assistant; scheduled daily generation or e-mail (T3 concierge material); P2 questions with follow-up; measuring continuation or repurchase in the app; final legal terms text; changes to the immutable design-system kit.

## Acceptance criteria

- An employer can add, edit and remove up to 5 criteria per own job; validation messages are Polish; other companies' jobs stay read-only.
- For a job with criteria, `/#/app/kandydaci` shows at most 5 active applications under "Od kogo zacząć dziś" in rank order, then all remaining applications as before. A job without criteria shows no shortlist.
- Each card shows every criterion with one of three statuses; confirmed and contradicted statuses show an exact quote from the candidate's submitted text or CV snapshot; `generatedAnswer` is never quoted.
- The card shows one own-work sentence (or "Brak zdania o własnej części pracy") and exactly one question.
- A submitted answer is stored byte-for-byte as typed, including leading/trailing whitespace and line breaks, and the card quotes from that stored text.
- Submission requires the terms checkbox; the link opens `/#/regulamin` and returning keeps the typed answer.
- Changing a candidate profile after submission does not change their card. Changing criteria does change cards (criteria are the employer's current lens) — open question 3.
- Old version-1 saves and exports without the new fields load, export and re-import unchanged.
- Candidate views never show the card, ranking or other candidates.
- Poster People rules: desktop/mobile down to 320px, long quotes wrap, keyboard tab order and arrows in tabs, status not conveyed by colour only.
- `./scripts/verify` passes; FEATURES.md updated (EMP-05, EMP-07, EMP-08, CAN-10, OPS-07, SYS-07, plus new EMP-11 "Daily shortlist" and EMP-12 "Candidate card", status Simulated; new PUB-14 "Terms", status Simulated); separate review pass recorded here.

## Files expected to change

- `src/features/prototype/model.ts` — optional `screeningCriteria`, `pickerHidden`; no new actions beyond `publish`.
- `src/features/shortlist/card.ts`, `rank.ts`, tests `card.test.ts`, `rank.test.ts` — new, pure.
- `src/features/prototype/employer.tsx` — criteria fields in the job editor.
- `src/features/prototype/workspace.tsx` — shortlist section in `ApplicationsPage` (employer); picker filter.
- `src/features/prototype/recruiting-application.tsx` / `application-record.tsx` — "Karta" tab.
- `src/features/prototype/workspace.tsx` (ApplyPage) — terms checkbox and caption; `model.ts` — verbatim `answer`.
- `src/features/prototype/terms.tsx`, `app.tsx`, `shell.tsx` — `/#/regulamin` placeholder page and footer link.
- `src/features/prototype/data/marketplace.json`, `people.json`, `initialState` — synthetic scenario.
- `src/app/*.css` — scoped styles from the kit's C02/C19/C22 roles.
- `tests/e2e/` — one journey: employer adds criteria → opens candidates → shortlist order → card quotes → stage change keeps working.
- `FEATURES.md`, `docs/design-system/HOST-COMPONENTS.md`, this file.

## Risks carried from the supersprint

- Thin candidate text makes the list wrong; the "brak informacji" status must stay visible rather than hidden.
- A shortlist can hide good people; the full list stays one scroll away and is never collapsed.
- Criteria changed after screening (10.3% of conversations, S10) silently re-rank candidates.
- Rule-based quotes on synthetic text say nothing about model accuracy on real text.

## Open questions for review

1. Is a rule-based simulation enough for the recruiter test, or should cards for the seeded scenario be hand-written fixtures (more realistic text, no live rules)?
2. ~~Source text and consent~~ — decided 2026-11-11 (see Decisions from review). Follow-up: should the prototype record when and which terms version the candidate accepted? Not needed for the recruiter test; worth confirming with the legal owner whether consent bundled in terms is enough for showing quotes to employers.
3. Should the card be snapshotted at first view (stable for the recruiter) or recomputed from current criteria (as proposed)?
4. Is 6 hidden synthetic candidates the right size for the recruiter test?

## Proposed order

1. Model fields + card/rank functions with unit tests (no UI).
2. Criteria editor.
3. Shortlist section and card tab.
4. Synthetic scenario, verbatim answer storage, terms checkbox and `/#/regulamin`.
5. FEATURES.md, host component notes, `./scripts/verify`, desktop/mobile/keyboard checks, separate review.

## Implementation (2026-11-11)

- `model.ts`: optional `screeningCriteria`, `previousScreeningCriteria`, `criteriaChangedAt` on jobs; `pickerHidden` on people; candidate `answer`, `sourceNotes`, `generatedAnswer` and draft fields stored verbatim (the 20-character minimum counts the trimmed answer). The `publish` transition owns criteria history (form-supplied history is discarded; one previous version). `draftAnswer` restored. Submit error now asks to accept the terms.
- `src/features/shortlist/`: `card.ts` (source rule, sentence split with Polish abbreviations, clause-local negation, own-work sentence, one question), `rank.ts` (top five), `candidate-card.tsx` (card panel with previous-criteria card, daily shortlist), unit tests.
- Candidate form: assistant restored as in `97d1df9^`; a stale proposal is hidden when notes change but stays stored, so the card never quotes an assistant-derived answer as the candidate's own. Terms checkbox and `/#/regulamin` placeholder; editing the answer no longer clears acceptance.
- Employer: criteria editor in the job form, shortlist above "Wszystkie aplikacje", "Karta" tab first on the employer record. Candidate record unchanged.
- `shortlist-scenario.json`: criteria for AI Product Manager and Staff AI Engineer; six synthetic candidates with neutral summaries.
- FEATURES.md: CAN-10, CAN-12, CAN-13, EMP-05, EMP-07, EMP-08, OPS-06, SYS-07 updated; EMP-11, EMP-12, PUB-14 added.

## Executed checks

Environment: Windows, Node 25.9.0 (project requires 24), `core.autocrlf=true`, no Playwright Chromium installed.

- Passed: `tsc --noEmit`, `eslint --max-warnings=0 .`, `vitest run` (37 tests, 10 new), `vite build` (existing chunk-size warning), Prettier check with `--end-of-line crlf`.
- `design-system:check` and `verify:packet` fail in this checkout only because CRLF working copies change file hashes (`.nvmrc`, baseline CSV). On a clean `core.autocrlf=false` worktree of the same commit: kit hashes verified (67 files) and baseline packet verified (120 journeys). The kit example tests refuse to run on Node 25.
- Not run: Playwright journeys (no Chromium; not installed per AGENTS.md). Existing journeys were updated for the restored assistant, the terms checkbox and the "Karta" tab, and one P1 journey was added; they are unverified until run on Node 24 with Chromium. `./scripts/verify` therefore not run as a whole.
- Manual browser checks (in-app browser, fresh state): shortlist order Ewa, Marek, Natalia, Adam, Olga (Jakub, Match Score 91, excluded); Natalia's card quotes her notes, never the generated proposal; removing a criterion shows the previous-criteria card with change time; candidate flow stores notes byte-for-byte, blocks submit until the terms are accepted, keeps the proposal signal after notes edits; candidate record has no "Karta" tab; picker shows only Anna and Marek; no horizontal overflow at 375px on candidates list, card and job editor.

## Separate review

An independent review of the diff found two issues, both fixed: an assistant-derived answer could be quoted as the candidate's own after editing notes; whole-sentence negation and naive sentence splitting produced false "sprzeczne" results. Also fixed: notes help text, terms acceptance reset on answer edits, criteria validation message, previous card hidden when all criteria are removed.

Known limits, not changed: legacy records created before CAN-12 was removed may have notes written when employers never saw them, and the card can now quote them; only one previous criteria version is kept; an imported evidence phrase containing a comma is split by the editor; the rules are keyword-based and will misjudge real text; settings help does not mention that existing saves need a reset to see the scenario (FEATURES SYS-07 does).
