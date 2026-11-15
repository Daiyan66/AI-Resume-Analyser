# Phase 7: admin workspace and navigation

The interface now has separate Overview, Candidate, Recruiter, Admin, and Documents views. The Admin view is shown only to an active organization Admin. API permission checks remain the source of access control.

## Check locally

1. Run `docker compose up --build` and sign in as an organization Admin.
2. Use the top navigation to open **Admin workspace**. Select an organization on **Overview** if you belong to several.
3. Invite a Recruiter, inspect the member list and recent access changes, then revoke a test member. The revoked account should lose access immediately.
4. Save a 30-day reapplication waiting period in **Organization policy**. As a candidate, withdraw a test application and try to reapply to the same job. The API should explain the waiting period. Set the period back to zero to allow reapplication.
5. Sign in as a Recruiter or Candidate and confirm the Admin view and its policy API are inaccessible.

The retention period records the organization's review policy; it does not automatically delete applicant information. The AI switch defaults off and will be used by the Phase 8 assistance service. These settings and changes to membership produce audit events.
