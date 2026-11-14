# Permissions and data model (Phase 2)

This document defines the authorization and record boundaries for the [new product](product-definition.md). It is a design contract for later phases, not a description of current legacy behavior.

## Authorization rules

Every private API operation checks identity and the target record. Recruiter and Admin rights are scoped to an organization. A user can have more than one role in the data model, but an action must specify and validate its organization context. A candidate never gains recruiter access by changing a client-side role value.

| Capability | Candidate | Recruiter | Admin |
| --- | --- | --- | --- |
| Read published jobs | Yes | Yes | Yes |
| Edit candidate profile and documents | Own only | No | No |
| Submit or withdraw an application | Own only | No | No |
| Read application status and candidate messages | Own only | For jobs in own organization | For jobs in own organization |
| Read candidate resume and answers | Own only | For jobs in own organization | For jobs in own organization, with audited access |
| Read employer-facing AI evidence | No; candidate sees only their own extraction and optional coaching | For jobs in own organization | For jobs in own organization |
| Create and edit jobs and criteria | No | Own organization | Own organization |
| Publish, pause, or close a job | No | Own organization | Own organization |
| Record criterion reviews and stage changes | No | Own organization | Own organization |
| Record offer, hire, or rejection | No | Own organization | Own organization |
| Invite or revoke organization members | No | No | Own organization |
| Change organization retention or AI settings | No | No | Own organization |
| Read organization audit events | No | No | Own organization |
| Export or request deletion of candidate data | Own data request | No | Process requests for own organization |

The first release gives Admin access to applicant records for oversight; every document access is audited. Later, an organization can narrow access to assigned hiring teams without changing record ownership rules. Public document URLs are never used. Document downloads require authorization and short-lived links.

## Principal records

| Record | Important fields and relationships | Owner / retention boundary |
| --- | --- | --- |
| `User` | ID, verified email, authentication identity, account state | Platform identity; avoid storing passwords when using managed identity. |
| `Organization` | ID, name, settings, retention policy | Owns jobs, memberships, and hiring activity. |
| `Membership` | User, organization, Admin or Recruiter role, state | Unique per user and organization; can be revoked without deleting history. |
| `CandidateProfile` | User, contact information, employment/education entries, preferences | Candidate-owned; may be shared as a snapshot in each application. |
| `Document` | Owner, storage key, MIME type, checksum, scan status, upload time | Private object storage; no raw file in the database. |
| `Job` | Organization, creator, title, location, compensation, state, timestamps | Organization-owned; published content is publicly readable. |
| `JobCriterion` | Job, required/preferred flag, description, review guidance, order | Versioned when the published rubric changes. |
| `JobQuestion` | Job, prompt, answer type, required flag, order | Versioned with the job; answers are captured at submission. |
| `Application` | Job, candidate, submitted profile snapshot, answers, stage, source, timestamps | Shared between candidate and hiring organization with role-specific visibility. |
| `StageEvent` | Application, old/new stage, actor, reason, timestamp | Append-only explanation of status changes. |
| `Review` | Application, reviewer, criterion ratings, comments, timestamp | Human assessment; edit history retained. |
| `Decision` | Application, outcome, actor, reason, timestamp | Human-owned; distinct from AI analysis. |
| `Interview` | Application, stage, schedule, scorecards | Organization-owned, candidate sees only invitation details. |
| `AIAnalysis` | Application/job/document reference, model and prompt versions, source citations, output, status | Derived data; can be replaced without changing a human decision. |
| `Message` / `Notification` | Recipient, channel, content/template, delivery status | Scoped to recipient and related application or organization. |
| `ConsentRecord` | User, purpose, version, choice, timestamp | Evidence of an explicit choice where required. |
| `AuditEvent` | Actor, organization, action, record type/ID, timestamp, outcome | Append-only; never include resume text or secrets in logs. |

Use stable opaque IDs, database migrations, created/updated timestamps, and soft deletion where retention or audit obligations require it. Define database constraints for unique active applications, membership uniqueness, job-criterion ordering, and immutable decision history. Use an outbox or equivalent durable event mechanism for email and background work so a database transaction cannot silently lose a notification.

## Privacy and lifecycle

1. Collect only information needed for hiring. Do not request protected characteristics for AI analysis.
2. Store documents in private object storage; validate size/type, scan uploads, and encrypt data in transit and at rest.
3. Record when an organization gains access to an application and when a person views or downloads its documents.
4. Retain application and audit data according to a documented organization policy and applicable law. Default values must be reviewed before deployment; do not assume one global period fits every jurisdiction.
5. Support candidate export and deletion requests, including a clear explanation when some records must be retained temporarily.
6. Do not send full resumes, credentials, or sensitive messages to analytics, logs, or email templates. AI provider data handling must be assessed before enabling a provider.

## Required authorization checks

Phase 4 tests must prove: candidate A cannot read candidate B's application; recruiter A cannot read another organization's application or document by changing an ID; revoked members lose access; public job reads never expose unpublished jobs or applicant data; admin access is organization-scoped and logged. These checks must run at the API boundary and in service methods that load records.
