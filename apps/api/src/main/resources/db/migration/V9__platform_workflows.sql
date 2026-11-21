ALTER TABLE users ADD COLUMN credential_version BIGINT NOT NULL DEFAULT 0;
CREATE TABLE password_reset_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);
CREATE INDEX password_reset_tokens_user ON password_reset_tokens (user_id, created_at DESC);

ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED'));

CREATE TABLE application_interviews (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    created_by UUID NOT NULL REFERENCES users(id),
    starts_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    location VARCHAR(500) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX application_interviews_one_active
    ON application_interviews (application_id) WHERE cancelled_at IS NULL;

CREATE TABLE notification_deliveries (
    notification_id UUID PRIMARY KEY REFERENCES candidate_notifications(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    status VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX notification_delivery_queue ON notification_deliveries (next_attempt_at) WHERE status = 'PENDING';

CREATE TABLE organization_data_request_reviews (
    request_id UUID NOT NULL REFERENCES candidate_data_requests(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('RETAIN', 'ELIGIBLE_FOR_REMOVAL')),
    reason VARCHAR(1000) NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (request_id, organization_id)
);

CREATE TABLE recruiter_access_requests (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    applicant_id UUID NOT NULL REFERENCES users(id),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    designation VARCHAR(160) NOT NULL,
    website VARCHAR(300) NOT NULL DEFAULT '',
    phone VARCHAR(40) NOT NULL DEFAULT '',
    disciplines VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id)
);
CREATE UNIQUE INDEX recruiter_request_one_pending ON recruiter_access_requests (organization_id, applicant_id)
    WHERE status = 'PENDING';

CREATE TABLE resume_screening_batches (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX resume_screening_batches_job ON resume_screening_batches (job_id, created_at DESC);
CREATE TABLE resume_screening_items (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES resume_screening_batches(id),
    filename VARCHAR(255) NOT NULL,
    state VARCHAR(12) NOT NULL CHECK (state IN ('READY','UNREADABLE')),
    evidence JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
