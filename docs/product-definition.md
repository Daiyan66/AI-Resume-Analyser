# Product definition (Phase 2)

Status: proposed baseline for the rebuild. This document defines product behavior; it does not change the legacy application. See [permissions and data](permissions-and-data.md), [AI product rules](ai-product-rules.md), [screen wireframes](screen-wireframes.md), and the [legacy inventory](current-state.md).

## Product promise

Help hiring teams make timely, consistent, explainable decisions and help candidates understand where they stand. AI assists with reading and writing; a person owns every hiring decision. The product must still work when AI is unavailable.

## Initial market and scope

- One hosted application serves multiple hiring organizations. Each job belongs to exactly one organization. A candidate can apply to jobs from multiple organizations with one account.
- Each organization has Admin and Recruiter memberships. For the first release, a recruiter or admin belongs to one organization; the data model allows more later. A Candidate is a platform account and is not an organization member.
- The initial release targets small hiring teams that need job postings, applications, structured review, decisions, and candidate updates. Internal platform support tooling, payroll, video interviewing, and marketplace sourcing are outside this release.
- English is the initial interface language. Accessible, responsive layouts and usable keyboard navigation are required from the start.

## Roles and outcomes

| Role | Primary goal | What success looks like |
| --- | --- | --- |
| Candidate | Find a suitable job, apply once, know what happens next | The application is easy to complete, status is accurate, and the candidate can control their data. |
| Recruiter | Fill an opening using a consistent review process | Reviewers can see evidence against the same criteria, collaborate, and communicate decisions promptly. |
| Admin | Run the organization's hiring workspace responsibly | Membership, policies, access, and audit history are visible and manageable. |

## Core journeys

### Candidate

1. Discover a published job, including location, work arrangement, compensation when supplied, required criteria, and process stages.
2. Create an account or sign in; complete a reusable profile and optionally upload a resume. Review and correct extracted fields before using them.
3. Answer job-specific questions and submit an application. See a confirmation and a copy of the submitted information.
4. Track candidate-visible status, receive updates, withdraw if needed, and contact the hiring team through a controlled message channel.
5. Request an export or deletion of personal data, subject to the organization's applicable retention obligations.

### Recruiter

1. Draft a job with required and preferred criteria, screening questions, compensation/location details, and a review rubric. Optionally use AI to draft text; approve it before publication.
2. Publish the job and receive applications in a job-scoped pipeline. Invite another organization member to review if authorized.
3. Open an application, read original material, inspect AI-extracted facts and cited evidence, then record a human review for each criterion.
4. Move the applicant through review and interview stages, record notes and a decision, and send an appropriate candidate update.
5. Close or archive the job and inspect a basic funnel report. Keep access to private applicant material limited to the hiring team.

### Admin

1. Set up the organization and invite recruiters and other admins.
2. Configure organization defaults: candidate status text, data retention, reapplication rules, and AI feature availability.
3. Inspect job and application activity, access history, delivery failures, and review completion.
4. Remove access, handle data requests, and export an audit record when needed.

## Hiring workflow

The application has one internal stage and one candidate-visible status. Stage changes are recorded as events, never silently overwritten. A recruiter can configure labels later, but the initial workflow uses these stages:

| Internal stage | Candidate-visible status | Entry rule |
| --- | --- | --- |
| Submitted | Application received | Candidate submits a completed application. |
| In review | In review | A recruiter starts review. |
| Interview | Interview | A recruiter invites the candidate to an interview. |
| Offer | Offer | An authorized recruiter records an offer. |
| Closed: hired | Hired | An authorized recruiter records the hire. |
| Closed: not selected | Not selected | An authorized recruiter records a rejection and notification. |
| Closed: withdrawn | Withdrawn | The candidate withdraws, or an admin corrects a mistaken record with an audit reason. |

Rules: only a human initiates a stage change; every closed outcome includes who acted and when; candidates see only their own applications. A candidate may have one active application per job. Reapplication after closure follows an organization policy; the default is no automatic cooldown. A job can be drafted, published, paused, closed, or archived. Paused and closed jobs do not accept new applications.

## Release scope by phase

| Phase | Product increment |
| --- | --- |
| 3: Foundation | New app and API skeleton, database migrations, CI, and deployed test environment. |
| 4: Identity | Authentication, organization membership, authorization, audit events, and private documents. |
| 5: Candidate | Profile, published jobs, application, status, and data controls. |
| 6: Recruiter | Job rubric, pipeline, review, stage changes, and decisions. |
| 7: Admin | Membership and organization policy controls. |
| 8: AI | Extraction, cited criterion evidence, drafting, and optional coaching. |
| 9: Quality | Notifications, accessibility, security and AI evaluation, and operational monitoring. |
| 10: Migration | Import verified legacy data, pilot, cutover, and remove old code. |

## Screen and API map

The paths below are proposed contracts for the new app. Phase 3 will define schemas and API conventions before implementation. All list endpoints must paginate. Mutations must validate input and return actionable errors.

| Screen | Purpose | Main API capability |
| --- | --- | --- |
| Public job board and job detail | Let visitors evaluate an opening | List and read published jobs without private applicant data. |
| Sign-in and invitation | Establish identity and organization membership | Sessions, invitations, password recovery. |
| Candidate profile | Maintain reusable information and documents | Read/update own profile; upload, replace, and delete own documents. |
| Application form | Submit profile snapshot and answers to a job | Create and read own application; prevent duplicate active submissions. |
| Candidate applications | Show status history and next steps | List/read own applications; withdraw; list own messages. |
| Recruiter job editor | Draft and publish a job and rubric | Create/update job and criteria within own organization. |
| Recruiter pipeline | Review job applications and move stages | List job-scoped applications; record stage events and decisions. |
| Application review | Inspect source material and record assessments | Read authorized documents and evidence; create human reviews. |
| Admin workspace | Manage members, policy, and audit | Invite/revoke members; read activity; manage retention and AI settings. |
| Notifications | Show timely, role-appropriate events | List/read own notifications and delivery state. |

API resource groups: `/auth`, `/me`, `/organizations/{id}`, `/jobs`, `/applications`, `/documents`, `/reviews`, `/decisions`, `/notifications`, and `/audit`. Public job reads use a separate public route. Each private handler applies the permission rules in [permissions and data](permissions-and-data.md); hiding a button is never the authorization check.

## Success measures for the pilot

- Candidate application completion rate and median time to submit.
- Median time from submission to first human review and to a candidate-visible update.
- Percentage of decisions with a completed criterion-based review and recorded reason.
- Candidate support requests caused by unclear status or missing communication.
- AI factual correction rate, unsupported-claim rate, and reviewer usefulness; measure only after AI is introduced.

Do not claim that a score predicts job performance without evidence. Review these measures with pilot users before expanding scope.

## Phase 2 completion checks

- Each role has a start-to-finish journey, a defined hiring-stage view, and an accountable human action for decisions.
- Each planned screen has a purpose and API capability; the [wireframes](screen-wireframes.md) show the main information hierarchy.
- Private records have an owner and a permission rule, including cross-organization and candidate-to-candidate isolation.
- AI assistance has allowed uses, prohibited uses, provenance, failure behavior, and an evaluation plan.
- Assumptions below are visible for product review before Phase 3 schemas and implementation.

## Decisions to confirm before implementation

1. **Organization model:** Assume multiple independent hiring organizations and one organization membership per recruiter/admin at launch.
2. **Compensation:** Support salary ranges and currency, but allow an organization to omit them where lawful. Do not invent ranges.
3. **Messaging:** Begin with structured status messages and a simple candidate reply channel; no real-time chat.
4. **Reapplication:** Default to no cooldown; organization policy can add one with a clear candidate-facing explanation.
5. **Legacy data:** Migrate only data that is needed, valid, and permitted to retain. Decide exact records during the migration inventory.
