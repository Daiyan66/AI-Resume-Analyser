CREATE TABLE job_criteria (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id),
    position INTEGER NOT NULL,
    description VARCHAR(500) NOT NULL,
    importance VARCHAR(10) NOT NULL CHECK (importance IN ('REQUIRED', 'PREFERRED')),
    guidance VARCHAR(1000) NOT NULL DEFAULT '',
    UNIQUE (job_id, position)
);

-- Phase 5 jobs had no rubric. Give already published jobs a reviewable baseline.
INSERT INTO job_criteria (id, job_id, position, description, importance, guidance)
SELECT gen_random_uuid(), id, 0, 'Overall role requirements', 'REQUIRED', left(requirements, 1000)
FROM jobs WHERE status = 'PUBLISHED';

ALTER TABLE applications DROP CONSTRAINT applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK
    (status IN ('SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFER', 'HIRED', 'NOT_SELECTED', 'WITHDRAWN'));
DROP INDEX applications_one_active_per_job_idx;
CREATE UNIQUE INDEX applications_one_active_per_job_idx ON applications (job_id, candidate_user_id)
    WHERE status IN ('SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFER');

CREATE TABLE application_reviews (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    criterion_id UUID NOT NULL REFERENCES job_criteria(id),
    reviewer_user_id UUID NOT NULL REFERENCES users(id),
    rating VARCHAR(20) NOT NULL CHECK (rating IN ('MET', 'PARTIAL', 'NOT_MET', 'UNCLEAR')),
    note VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX application_reviews_recent_idx ON application_reviews (application_id, created_at DESC);

CREATE TABLE application_decisions (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('HIRED', 'NOT_SELECTED')),
    reason VARCHAR(4000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
