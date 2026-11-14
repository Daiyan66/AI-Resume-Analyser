# AI Resume Analyser

This repository currently contains a legacy applicant tracking system with a Spring Boot API and a React/Vite frontend. It supports candidate applications, recruiter job postings and resume screening, and administrator oversight. We are preparing a staged rebuild in this repository; see [the current-state inventory](docs/current-state.md).

## Repository layout

| Path | Purpose |
| --- | --- |
| `AI Resume Analyser Backend/` | Java 21 / Spring Boot 3 API, MySQL persistence, document processing, email, and AI integrations |
| `AI Resume Analyser Frontend/` | React 18 / Vite interface |
| `docs/` | Current-state inventory and rebuild notes |

## Run the legacy application locally

Prerequisites: Java 21, Maven 3.9+, Node 20+, npm, and MySQL 8. Create the database expected by `DB_URL` before starting the API.

1. Set `DB_URL`, `DB_USER`, `DB_PASSWORD`, and a random `JWT_SECRET` of at least 32 bytes. Set `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and mail settings only for features you intend to exercise. The API reads configuration from environment variables or an ignored `AI Resume Analyser Backend/application-local.properties` file. Never commit credentials.
2. From `AI Resume Analyser Backend/`, run `mvn spring-boot:run`. The default API port is 8080.
3. From `AI Resume Analyser Frontend/`, run `npm ci` and `npm run dev`. Vite serves the UI on port 5173 and proxies `/api` to the local API. The tracked `.env.example` documents the optional `VITE_API_BASE_URL` setting.

The backend currently creates demo accounts on startup. Treat them as development data; do not expose this legacy app publicly without replacing those credentials and completing the access-control work described in the inventory.

## Build checks

Run `mvn -DskipTests package` in the backend directory and `npm ci && npm run build` in the frontend directory. GitHub Actions runs the same build checks on pushes and pull requests. The existing backend context test needs a test database and is not part of this initial build gate.

## Rebuild approach

The new application will be developed alongside the legacy directories, with small pull requests and a working main branch. The planned sequence is: repository preparation, product definition, technical foundation, identity and organizations, candidate flow, recruiter flow, admin controls, AI assistance, quality and communication, then migration and launch. The legacy directories will be removed only after the replacement and data migration are verified.
