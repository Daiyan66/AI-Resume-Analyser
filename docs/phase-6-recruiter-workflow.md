# Phase 6: recruiter workflow

Phase 6 adds a human-led hiring workflow to the new application. Recruiters and organization Admins can prepare a job rubric, review submitted applications, record assessments, move candidates through stages, and record a final decision. Candidates see stage history and outcomes in **My applications**. The decision reason stays private to the hiring team.

## Local test checklist

From the repository root, run `docker compose up --build`. Open `http://localhost:5174`. If you used Phase 5, your database data remains in the Compose volume; Flyway adds the Phase 6 tables and gives already published jobs a baseline review criterion. Mailpit remains at `http://localhost:8025` for account verification emails.

- [ ] **Organization member:** Sign in as an Admin or Recruiter. In **Jobs for your organization**, create a draft with a title, description, requirements, and one or more review criteria. Add guidance that only your hiring team should see.
- [ ] **Job editing:** Edit the draft. Publish it. Confirm the published job appears under **Find jobs** in a signed-out browser. Confirm the private review guidance does not appear on the public job page. A published job cannot be edited as a draft.
- [ ] **Pause and resume:** Pause the job and confirm it disappears from the public board and cannot receive a new application. Resume it before continuing. Closing a job is permanent, so use a test job for that check.
- [ ] **Candidate:** In a separate browser profile, sign in as a candidate, complete **Candidate profile**, optionally upload a private document, and apply to the published job. The candidate sees **Submitted** under **My applications**.
- [ ] **Recruiter pipeline:** Return to the organization account, open the job's **Applicants** panel, and select the candidate. Check the submitted profile snapshot, question answers, and status history. Download the submitted document if the candidate attached one.
- [ ] **Human review:** Record a rating and a specific evidence note for every criterion. Earlier assessments remain visible when another assessment is added.
- [ ] **Stages:** Move the application to **In review**, then **Interview**, then **Offer**. In the candidate browser, choose **Check for updates** under **My applications** and confirm each new status and history event appears.
- [ ] **Decision:** Record **Hired** from Offer, or **Not selected** from In review, Interview, or Offer. A decision requires an assessment for every criterion and a private reason. Confirm the candidate sees the outcome but cannot see the reason.
- [ ] **Permissions:** A signed-in account outside the organization cannot open the pipeline or download an applicant document. Revoking an organization member removes their access to the job and applicant data.
- [ ] **Close:** Close a separate test job. It disappears from the public board; existing application history stays available to the hiring team and candidate.

## Workflow rules

| Item | Rule |
| --- | --- |
| Job | Drafts can be edited. A published job can be paused, resumed, or closed. Paused and closed jobs cannot receive new applications. |
| Rubric | Criteria have a description, required/preferred importance, and private guidance. Existing Phase 5 published jobs receive one baseline criterion. |
| Review | Only active members of the job's organization can read its applicants and record criterion assessments. Reviews are appended with reviewer identity and time. |
| Stage | Submitted → In review → Interview → Offer. Candidates can withdraw from an active stage. |
| Decision | Hired follows Offer; Not selected follows In review, Interview, or Offer. All criteria must have a human assessment. One final decision is recorded per application. |
| Candidate visibility | Candidates see their own stage events and outcome. They do not receive private notes, rubric guidance, or decision reasons. |

The pipeline list is paginated. The API checks membership and the job/application relationship for every private read and write, including document downloads. Review reads, downloads, stage changes, and decisions are audited. Email notifications for stage changes are planned for Phase 9; candidates can use **Check for updates** now.

## Verification

`mvn verify` in `apps/api` runs the recruiter integration flow against PostgreSQL, including job transitions, review and decision gates, candidate visibility, document access, and organization isolation. `npm run lint && npm run build` in `apps/web` checks the interface. GitHub Actions builds both container images.
