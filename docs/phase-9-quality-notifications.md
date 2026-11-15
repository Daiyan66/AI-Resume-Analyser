# Phase 9: candidate notifications increment

Recruiter stage changes and final decisions create private in-app notifications for the application owner. The candidate can view and mark them read under **Find jobs & applications → Updates**. The notification contains only a short status message. Private review notes and decision reasons remain in the recruiter workspace.

## Check locally

1. Start with `docker compose up --build` and sign in as a candidate in one browser profile and an organization member in another.
2. Apply to a published job. As the organization member, open its applicant panel and move the application to In review.
3. In the candidate browser, choose **Check for updates**. Confirm the new status appears in application history and under **Updates**.
4. Mark the update read. Check that another candidate account cannot read or mark it read.
5. Record a final decision and repeat the check. The decision reason must not appear in the notification.

Notifications are in-app only. Email delivery, retry handling, accessibility audit, production monitoring, security review, and AI evaluation remain release gates. The existing GitHub Actions build and PostgreSQL integration tests provide automated checks but do not replace those gates.
