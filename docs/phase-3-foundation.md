# Phase 3 foundation

The new application runs beside the legacy system. This phase provides a working React/TypeScript web app, Java 21/Spring Boot API, PostgreSQL database, Flyway migration, container setup, and CI. It does not yet implement login, jobs, or applications; those arrive in later phases.

## Run the complete local stack

Prerequisite: Docker Desktop or Docker Engine with Compose.

```sh
docker compose up --build
```

Open `http://localhost:5174`. The page requests `/api/v1/system/status` through the web proxy. `http://localhost:8081/api/v1/system/status` should return `{"service":"ats-api","status":"ready"}`. The status handler queries PostgreSQL, so a ready response verifies that the API can reach its database. Flyway runs `V1__create_organizations.sql` on startup. The database is persisted in the `ats-postgres-data` Docker volume.

Stop with Ctrl+C or `docker compose down`. The latter preserves the database volume; `docker compose down -v` deletes local test data. Host ports are bound to `127.0.0.1` so these development services are not exposed to the local network.

## Run separate development servers

Prerequisites: Java 21 **JDK**, Maven 3.9+, Node 22+, npm, and Docker for PostgreSQL.

1. From the repository root, run `docker compose up -d db`.
2. From `apps/api`, run `mvn spring-boot:run -Dspring-boot.run.profiles=local`. The local profile connects to PostgreSQL at `localhost:5433` and serves the API at `localhost:8081`.
3. From `apps/web`, run `npm ci` and `npm run dev`. Vite serves `http://localhost:5174` and proxies `/api` to `http://localhost:8081`.

The `local` profile and Compose use the same fixed **development-only** database password. Do not use them for a hosted deployment. Outside the local profile, the API requires `DATABASE_URL`, `DATABASE_USER`, and `DATABASE_PASSWORD` environment variables.

## API and migration convention

- New API paths begin with `/api/v1/`. The first endpoint is `GET /api/v1/system/status`, returning JSON with `service` and `status`.
- Migrations live in `apps/api/src/main/resources/db/migration/`. Create a new numbered migration for schema changes; do not edit a migration after it has been applied in a shared environment.
- `V1` creates the `organizations` table. Later phases add identity, jobs, applications, reviews, and other records from the [data model](permissions-and-data.md).
- The web app calls relative `/api` paths. Vite and Nginx route them to the API; frontend source does not need a hard-coded production hostname.

## Checks and deployment boundary

GitHub Actions runs the new API integration test against PostgreSQL, lints/builds the web app, validates Compose, and builds both container images. The integration test verifies that the status endpoint and Flyway-created table work together. The legacy build workflow remains until cutover.

The containers are ready for a test host, but no external staging environment is configured yet. Before deploying outside a developer's PC, choose a hosting target, create separate credentials and a managed database, configure TLS, backups, monitoring, and deployment access. Do not publish the local Compose password or run its local profile in a hosted environment.
