# Platform frontend preview

Run the frontend by itself with Node 22 or later:

```sh
cd apps/web
npm ci
npm run dev
```

Open the address Vite prints. With the full Docker Compose stack, open <http://localhost:5174>. The previous API-connected application is available at <http://localhost:5174/dashboard>. Existing verification and invitation URLs still enter that application.

## Review the preview

| Area | What to try |
| --- | --- |
| Public | Browse jobs, filter by work arrangement, open a job, and follow the sign-in prompt. Try registration, password reset, and access request screens with fictional details. |
| Candidate | Save a profile, add a sample document, answer a screening question, review the submission, and submit it. Open the timeline, mark an update read, and try withdrawing a different sample application. |
| Recruiter | Create and publish a draft, then switch to Candidate and apply. Switch back to Recruiter, open **Applicants**, move the application to **In review**, record an assessment for each rubric criterion, and choose **Not selected** with a private reason. Switch back to Candidate and check **Updates**. |
| Admin | Invite and revoke a sample team member, change a sample policy, and open the audit log. Submit a deletion review request in the candidate workspace, then open the admin request queue. |
| Additional flows | Try the sample job import, batch screening, recruiter verification, reports, delivery retry, and migration preflight screens. |

**Switch workspace** or the role selector on the sign-in screen lets you try the same sample data from each role. The **Screen directory** in the footer links to all 67 routes from the wireframe inventory. Open a page directly, refresh, use Back, and try a phone-width viewport.

The preview stores sample workflow data and the selected role in the browser. File actions keep sample filenames and downloads contain fictional content. Email, authentication, AI, batch extraction, delivery, and migration actions are simulations. Region-specific privacy policy and launch copy are draft content. The role switches are for review and do not represent application authentication or authorization. Clear site storage to restore the sample data.

The React preview uses the screen titles and route inventory in `apps/web/src/preview/screens.json`. The screens adapt the wireframes to shared navigation, list, confirmation, and form patterns. Wireframe controls that depend on an external system or deeper product rules need their backend behavior and acceptance criteria reviewed when connected.
