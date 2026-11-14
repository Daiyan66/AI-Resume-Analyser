# Current-state inventory

This is a code inventory for the Phase 1 rebuild baseline. It describes the current `main` implementation, not a claim that all flows have been tested in production.

## User roles and flows

| Role | Current flow |
| --- | --- |
| Candidate | Register with profile and optional resume; browse jobs and recommendations; apply with a resume; view status, AI fit analysis, feedback, and notifications. |
| Recruiter | Request access and complete OTP/document onboarding; create a job manually or from a document; batch upload resumes; review ranked candidates and AI details; accept or reject with feedback. |
| Admin | View platform statistics; review recruiter requests and documents; approve or resend invitations; invite recruiters; browse recruiters, jobs, candidates, and applications; update or delete users through backend endpoints. |

Public routes include the landing page, registration, recruiter access request and onboarding, password reset, and chatbot. Signed-in users share a notification center.

## Code and data

- Backend: Java 21, Spring Boot 3.3, Spring Security with JWT, Spring Data JPA, MySQL, PDFBox/POI, SMTP, Gemini, and OpenRouter.
- Frontend: React 18, Vite 5, React Router, React Query, React Bootstrap, and Recharts.
- Principal records: user, role, recruiter invitation, job, resume, application, feedback, notification, and password reset token.
- Files are stored on the local filesystem. Resume extraction and AI evaluation happen during application processing. Batch uploads run asynchronously and report progress through server-sent events.
- AI evaluation can fall back to local heuristics when Gemini is unavailable. The displayed score is therefore not guaranteed to come from the same method for every application.

## Rebuild risks to resolve

1. **Access control:** Some recruiter service methods accept job or application IDs without checking that the current recruiter owns them. The candidate analysis endpoint loads an application by ID without checking its candidate. Resume retrieval is publicly routable and checks only for the Admin role. Enforce object and organization ownership in the API before serving private data.
2. **Sensitive data:** Uploaded resumes and runtime configuration defaults were tracked in Git. Phase 1 removes them from the current tip, but they remain in earlier Git history. Review exposure, rotate any live credentials, and arrange a separate history cleanup if required. Avoid printing or copying this material into issues or pull requests.
3. **Demo accounts:** Startup seeding creates accounts with known passwords. Remove or restrict this behavior before deployment of the rebuilt system.
4. **AI quality:** The current overall score, anti-cheat flags, and local fallback are heuristics without a versioned evaluation set or evidence citations. Make AI output reviewable and separate it from human hiring decisions.
5. **Configuration and portability:** Several frontend screens call `http://localhost:8080` directly. Development and deployment configuration need one consistent API base URL. Local file storage and MySQL `ddl-auto=update` complicate deployment and migration.
6. **Testing:** The only backend test loads the application context and expects a database. There is no frontend test suite. Add targeted tests for permissions and complete user flows during later phases.
7. **Routing:** The frontend has a User Management page, but it is not registered in `App.jsx`; the routed admin screens cover recruiter and candidate overviews and recruiter requests.

## Phase 1 repository changes

- Remove generated `node_modules` and uploaded documents from the current Git tip; preserve `package-lock.json` and all application source.
- Remove tracked frontend `.env` files and provide an example.
- Require environment variables for database credentials and the JWT secret; make optional AI and mail credentials empty unless configured.
- Add README and build-only CI checks. Runtime and behavioral changes are reserved for later phases.
