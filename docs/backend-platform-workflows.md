# Backend workflow API

The rebuilt Spring Boot service supports the hiring journey with real accounts and PostgreSQL records. Existing endpoints for registration, verification, document upload, job publication, applications, reviews and decisions remain in place. The following contracts extend them. Paths below are relative to `/api/v1`.

Use the session cookie from sign-in and send `X-XSRF-TOKEN` from `GET /auth/csrf` on requests that change data. Inside an organization, endpoints check membership and any job, application, or document ID against its organization. Candidate endpoints scope replies to the signed-in user.

| Method | Path | Access and UI use |
| --- | --- | --- |
| POST | `/auth/password-reset/request` | Public. Accepts `{email}`, returns 202, and sends a reset link for a verified account. Resend is limited to once per minute per account. |
| POST | `/auth/password-reset/confirm` | Public. Accepts `{token,password}`. The 30-minute token can be used once. Existing sessions are invalidated after a successful reset. |
| GET | `/me/workspaces` | Signed-in account. Returns the account and active organization roles. |
| GET | `/public/jobs?q=&workType=&page=&size=` | Public. Search published listings and filter by REMOTE, HYBRID, or ONSITE. |
| DELETE | `/documents/{documentId}` | Owner only. Remove a document that is eligible for removal. Documents attached to applications or pending verification requests stay available. |
| GET | `/documents/{documentId}/text` | Owner only. Read extracted text before copying any information into a profile. |
| GET | `/candidate/applications/{application}/interviews` | Applicant only. List interview details and cancellations. |
| GET | `/candidate/applications/{application}/coaching` | Applicant only. Returns practice prompts with matching excerpts from the submitted profile when present. |
| GET | `/candidate/notifications?read=&page=&size=` | Recipient only. List all, read, or unread notifications. |
| POST | `/candidate/notifications/read-all` | Recipient only. Mark all unread notifications as read. |
| GET | `/organizations/{org}/applications` | Recruiter or admin. Search the organization's pipeline with optional `jobId`, `q`, `status`, `page`, and `size`. |
| GET | `/organizations/{org}/reports/pipeline` | Recruiter or admin. Stage counts and review totals, optionally scoped by `jobId`. |
| POST | `/organizations/{org}/jobs/{job}/status` | Recruiter or admin. Includes archiving a closed job and closing a paused job. |
| POST | `/organizations/{org}/jobs/import-draft` | Recruiter or admin. Multipart `file`. Returns editable title and description for the existing job editor. |
| POST | `/organizations/{org}/jobs/{job}/screening-batches` | Recruiter or admin. Multipart `files`, one to five documents. Saves human-reviewable findings and unreadable-file states. |
| GET | `/organizations/{org}/jobs/{job}/screening-batches` | Recruiter or admin. List past batches for the job. |
| GET | `/organizations/{org}/jobs/{job}/screening-batches/{batch}` | Recruiter or admin. Read individual findings and extraction status. |
| DELETE | `/organizations/{org}/jobs/{job}/screening-batches/{batch}` | Recruiter or admin. Remove a batch and its findings. |
| GET | `/organizations/{org}/jobs/{job}/applications/{application}/evidence` | Recruiter or admin. Read matching excerpts from an attached document when supplied. |
| GET | `/organizations/{org}/jobs/{job}/applications/{application}/interviews` | Recruiter or admin. List scheduled and cancelled interviews. |
| POST | `/organizations/{org}/jobs/{job}/applications/{application}/interviews` | Recruiter or admin. Save a future `startsAt` instant, IANA `timezone`, `location`, and candidate-visible `message`. |
| DELETE | `/organizations/{org}/jobs/{job}/applications/{application}/interviews/{interview}` | Recruiter or admin. Cancel an interview and notify the candidate. |
| POST | `/recruiter-access-requests` | Signed-in applicant. Submit `organizationSlug`, owned `documentId`, and `designation`. Optional fields are `website`, `phone`, and `disciplines`. |
| GET | `/recruiter-access-requests` | Signed-in applicant. List your own requests. |
| GET | `/organizations/{org}/recruiter-access-requests` | Admin. List verification requests addressed to the organization. |
| GET | `/organizations/{org}/recruiter-access-requests/{request}/document` | Admin. Download the submitted proof for review. |
| PUT | `/organizations/{org}/recruiter-access-requests/{request}/decision` | Admin. Set `outcome` to APPROVED or REJECTED. Approval establishes recruiter membership. |
| PUT | `/organizations/{org}/members/{userId}/role` | Admin. Change another active member's ADMIN or RECRUITER role. |
| GET | `/organizations/{org}/data-requests` | Admin. List requests for candidates who applied to the organization. |
| PUT | `/organizations/{org}/data-requests/{request}/review` | Admin. Record an organization review using RETAIN or ELIGIBLE_FOR_REMOVAL and a reason. A review leaves the global deletion request pending. |
| GET | `/organizations/{org}/notification-deliveries` | Admin. Inspect application email state and attempt count. |
| POST | `/organizations/{org}/notification-deliveries/{notification}/retry` | Admin. Requeue a failed delivery. |

## How to verify locally

1. Run `docker compose up --build` and open <http://localhost:5174/connected>. Register a fictional account and verify it using Mailpit at <http://localhost:8025>.
2. Use **Forgot your password?** in the connected app. Open the reset link in Mailpit, set a new password, and sign in. Check that the old password and reset link no longer work.
3. Create an organization and a job as admin, publish it, then apply from another account. Advance the application and inspect the candidate inbox and Mailpit. Application emails are enabled for Compose and disabled by default elsewhere.
4. Run `mvn verify` in `apps/api` against a test PostgreSQL database. The integration suite checks authorization, reset tokens, file extraction, interviews, delivery retry and admin workflows.

## Integration boundaries

- The public landing page at `/` links Sign in and Create account to the connected app, which uses the redesigned colors and layout with real sessions, membership, and password recovery. Use Try a workspace or the Screen directory to open the separate sample walkthrough. Some backend features still have sample-only preview screens.
- Recruiter verification uses a verified signed-in account, a private document, and an organization admin decision. The preview's sample OTP is not part of this contract.
- Screening and coaching use local text extraction and explainable matching. Screening reads text PDFs, DOCX, and UTF-8 TXT up to 2 MB each. Image-only scans need OCR. Batch results remain separate from candidate accounts and applications. The existing optional provider-backed job drafting endpoint remains available.
- Application email dispatch is delivered at least once. SMTP acceptance immediately before a database failure can cause a duplicate retry. Use the organization delivery list for failed sends. The worker has bounded attempts and SMTP timeouts.
- Application retention decisions, execution of deletion requests, inbox support delivery, calendar-provider integration and live legacy imports need operational workflows or external configuration. Migration readiness remains a read-only operator CLI, not an organization-admin web action. See [legacy migration readiness](phase-10-migration-readiness.md).
