# Phase 4: accounts and organization access

This phase adds the first working account flow in the new `apps/` application. It is separate from the accounts and data in the legacy folders.

## Try it on your PC

1. Start Docker Desktop, then run `docker compose up --build` from the repository root.
2. Open `http://localhost:5174`, choose **Create an account**, and enter your details. Passwords must be 12 to 128 characters; the form and API show this requirement.
3. Open `http://localhost:8025` to see the local verification email. Click its link, then sign in.
   If Mailpit was restarted and the email is gone, use **Resend verification email** on the sign-in page. The database keeps accounts when the local Mailpit inbox is cleared.
4. Create an organization. You become its Admin. Invite a second email as Recruiter or Admin.
5. Register and verify that second email in a separate browser profile, then open the invitation link in Mailpit and accept it.
6. Upload a PDF, DOCX, or TXT file under 10 MB in **Your private documents**. Only that account can list or download it.

Mailpit captures development emails locally; it does not send them to the internet. To run separate development servers, start `docker compose up -d db mailpit`, then run `mvn spring-boot:run -Dspring-boot.run.profiles=local` in `apps/api` and `npm ci && npm run dev` in `apps/web`. Java 21, Maven 3.9+, Node 22+, and npm are required for this route.

## What the roles can do now

| Role | Current access |
| --- | --- |
| Candidate / account holder | Register, verify email, sign in, list organizations they belong to, and upload or download their own private documents. |
| Recruiter | Do everything an account holder can, and join an organization through an email invitation. |
| Admin | Create an organization, invite Admins or Recruiters, list members, revoke other members, and view recent organization access changes. |

These are foundation permissions. Jobs, applications, candidate profiles, reviews, and AI assistance are later phases. An Admin cannot read another user's private document through this API.

## Access design

- Passwords use BCrypt hashes. Sign in uses an HTTP only, SameSite=Lax session cookie. State changing requests require a CSRF token.
- Email verification and invitation links have random, single use tokens stored as SHA-256 hashes. Verification expires after 24 hours; invitations expire after 7 days. Sending a new verification email invalidates previous links.
- Each organization request checks active membership in PostgreSQL. Admin actions require an active Admin membership. Revoking a membership takes effect on the next request.
- Documents are kept outside the public web directory in a private container volume. Downloads check the owner in PostgreSQL and are served as attachments. The API records account, membership, and document access events.
- Flyway migrations `V2` and `V3` add identity, membership, invitation, document, audit, and email verification tables.

## Limits before hosting

The current sessions and document files live on one API instance and its mounted volume. A hosted multi-instance setup needs shared session storage and private object storage with backups. Configure a real SMTP service, TLS, secure session cookies, and rate limits before public signup. Password reset, candidate job workflows, and complete audit reporting are not in this phase. The local Compose credentials and Mailpit are development settings only.

## Verification

`mvn verify` in `apps/api` exercises CSRF, verification, role boundaries, invitation acceptance, and private document ownership against PostgreSQL. `npm run lint && npm run build` checks the web app. CI also builds both container images. The local flow was also exercised over HTTP with a browser style cookie jar, including registration, Mailpit verification, sign in, organization creation, and logout.
