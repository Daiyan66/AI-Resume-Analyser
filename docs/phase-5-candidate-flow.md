# Phase 5: candidate flow

The new application now has a public job board and a candidate journey from profile to application status. It uses the accounts, organizations, private documents, and Mailpit from Phase 4. The legacy application remains separate.

## Try the whole flow

1. From the repository root, run `docker compose up --build`. Open `http://localhost:5174` and keep `http://localhost:8025` open for account emails.
2. Sign in as an organization Admin or Recruiter. In **Jobs for your organization**, create a draft with title, location, work arrangement, description, requirements, and optional salary and screening questions. Publish it. A draft is private; a published job appears under **Find jobs**, even when signed out.
3. In a separate browser profile, sign in as a candidate. Save a headline and summary in **Candidate profile**. You can add location, phone, skills, experience, education, and an optional private resume document.
4. Select the public job, answer any required questions, select a document if desired, and submit. The application appears under **My applications** with an **Application received** event. A second active application for that job is rejected.
5. Edit the reusable profile, then reopen the application. The submitted copy retains the earlier profile and answers. Withdraw the application to see a new status event. A new application can be submitted after withdrawal.
6. Use **Download my data** for a JSON export of your account, profile, document metadata, and applications. **Request deletion review** records a pending request; it does not immediately erase hiring records.

## Permissions and API

| Area | Access |
| --- | --- |
| `GET /api/v1/public/jobs` and `/{id}` | Anyone can list and read published jobs; drafts are hidden. The list is paginated. |
| `/api/v1/organizations/{id}/jobs` | Active Admins and Recruiters of that organization can create drafts and publish them. Other accounts are denied. The list is paginated. |
| `/api/v1/candidate/profile` | A signed-in account reads and edits only its own reusable profile. |
| `/api/v1/candidate/applications` | A signed-in account submits to a published job, lists and reads only its own applications, and withdraws only its own active application. Lists are paginated. |
| `/api/v1/candidate/export` and `/deletion-requests` | A signed-in account accesses only its own export and deletion review requests. |

Submission requires a saved profile headline and summary. Required job questions must be answered, and an attached document must belong to the candidate. The API stores a copy of the profile and question prompts with the application, so later profile edits do not change what was submitted. Stage events are appended to history. The database prevents two active submissions from the same candidate to the same job.

## Current boundary

The small job publisher exists so candidate flows can be tested with real openings. The full recruiter editor, rubrics, applicant review, stage changes, and human decisions are Phase 6. Candidate status currently changes only for submission and withdrawal. A deletion request awaits a later admin review workflow; it is not an automatic deletion. The JSON export includes document metadata, not file bytes; files can be downloaded separately from **Your private documents**. Public hosting still needs the infrastructure and privacy controls described in the [Phase 4 guide](phase-4-identity-access.md).

## Checks

`mvn verify` in `apps/api` runs integration checks against PostgreSQL for draft visibility, member-only publishing, required answers, profile snapshots, duplicate submissions, candidate isolation, withdrawal, export, and deletion requests. `npm run lint && npm run build` checks the web app. GitHub Actions also builds the API and web container images.
