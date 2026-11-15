CREATE TABLE candidate_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    headline VARCHAR(160) NOT NULL DEFAULT '',
    location VARCHAR(160) NOT NULL DEFAULT '',
    phone VARCHAR(40) NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    skills TEXT NOT NULL DEFAULT '',
    experience TEXT NOT NULL DEFAULT '',
    education TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(160) NOT NULL,
    location VARCHAR(160) NOT NULL,
    work_type VARCHAR(20) NOT NULL CHECK (work_type IN ('REMOTE', 'HYBRID', 'ONSITE')),
    salary_min INTEGER,
    salary_max INTEGER,
    currency CHAR(3),
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    CHECK (salary_min IS NULL OR salary_min >= 0),
    CHECK (salary_max IS NULL OR salary_max >= salary_min),
    CHECK ((salary_min IS NULL AND salary_max IS NULL AND currency IS NULL) OR
           (salary_min IS NOT NULL AND salary_max IS NOT NULL AND currency IS NOT NULL))
);
CREATE INDEX jobs_public_idx ON jobs (published_at DESC, id) WHERE status = 'PUBLISHED';
CREATE INDEX jobs_org_idx ON jobs (organization_id, created_at DESC);

CREATE TABLE job_questions (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id),
    position INTEGER NOT NULL,
    prompt VARCHAR(500) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (job_id, position)
);

CREATE TABLE applications (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id),
    candidate_user_id UUID NOT NULL REFERENCES users(id),
    document_id UUID REFERENCES documents(id),
    profile_snapshot JSONB NOT NULL,
    answers JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'WITHDRAWN')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX applications_one_active_per_job_idx ON applications (job_id, candidate_user_id)
    WHERE status = 'SUBMITTED';
CREATE INDEX applications_candidate_idx ON applications (candidate_user_id, submitted_at DESC);

CREATE TABLE application_events (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(40) NOT NULL,
    message VARCHAR(300) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX application_events_recent_idx ON application_events (application_id, created_at, id);

CREATE TABLE candidate_data_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    request_type VARCHAR(10) NOT NULL CHECK (request_type IN ('DELETE')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX candidate_one_pending_delete_idx ON candidate_data_requests (user_id)
    WHERE request_type = 'DELETE' AND status = 'PENDING';
