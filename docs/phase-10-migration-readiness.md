# Phase 10: migration readiness

The old system uses MySQL and filesystem resume paths; the new system uses PostgreSQL, organization memberships, private document storage, and a different hiring model. A direct table copy would misassign organization ownership and carry over unverified AI scores. The legacy code remains available while the new app is piloted.

## Read-only preflight

Export `users`, `job_descriptions`, `resumes`, and `applications` as UTF-8 CSV files into a private directory outside Git. Include the primary and relationship columns named in `scripts/migration_preflight.py`. Copy permitted resume files under a separate private root and make `resumes.file_path` relative to that root. Then run:

```bash
python3 scripts/migration_preflight.py /private/legacy-export --file-root /private/legacy-files
```

The command reports counts and blocker categories, without printing names, email addresses, or resume content. It checks duplicate IDs and emails, missing relationships, unknown application statuses, unsafe paths, and missing files. It never writes to either database. Resolve all blockers before mapping or importing records.

## Mapping decisions before any import

| Legacy record | New record | Required decision |
| --- | --- | --- |
| User | User, candidate profile, organization membership | Verify email ownership, reset credentials, and map each recruiter to the right organization. Do not carry over demo passwords. |
| Job description | Organization job and rubric | Verify creator and organization. Start as a private draft until a recruiter approves text and criteria. |
| Resume | Private document | Confirm permission to retain, file integrity, media type, and candidate owner. Never serve an old filesystem path publicly. |
| Application | Application and status history | Verify candidate ownership and job relationship. Map PENDING to Submitted; review ACCEPTED and REJECTED individually before assigning Hired or Not selected. |
| AI score and anomaly flags | No automatic transfer | These values lack the new evidence and evaluation contract. Keep a separate archived export only if retention permits. |

## Cutover gates

1. Obtain an authorized, verified snapshot of legacy database and files. Record counts, checksums, timezone, and backup location without committing personal data.
2. Run the preflight, resolve blockers, and have an Admin approve organization mappings and retention scope.
3. Build and test an idempotent importer against a disposable PostgreSQL copy. Reconcile per-table counts and inspect a permissioned sample of accounts, jobs, documents, and application histories.
4. Complete candidate and recruiter pilot tests, accessibility and security review, AI evaluation, notification delivery checks, backups, restore rehearsal, monitoring, and incident ownership.
5. Freeze legacy writes, take a final snapshot, rerun import and reconciliation, then switch traffic. Keep a timed rollback path and the old data read-only until the pilot is accepted.

**Current status:** the preflight is ready; import and cutover are blocked until a verified legacy data export, organization mapping, retention decisions, and deployment environment are available. The new app should not be described as launched yet.
