CREATE TABLE assessment_templates (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id),
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(160) NOT NULL,
    instructions VARCHAR(12000) NOT NULL,
    effort_minutes INTEGER NOT NULL CHECK (effort_minutes BETWEEN 5 AND 480),
    allowed_tools VARCHAR(1000) NOT NULL,
    rubric JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ
);
CREATE INDEX assessment_templates_job ON assessment_templates(job_id, created_at DESC);

CREATE TABLE assessment_assignments (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    template_id UUID NOT NULL REFERENCES assessment_templates(id),
    due_at TIMESTAMPTZ NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    answer VARCHAR(20000) NOT NULL DEFAULT '',
    document_id UUID REFERENCES documents(id),
    ai_consent BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    scores JSONB,
    feedback VARCHAR(4000),
    UNIQUE (application_id, template_id)
);
CREATE INDEX assessment_assignments_template ON assessment_assignments(template_id);
CREATE INDEX assessment_assignments_document ON assessment_assignments(document_id) WHERE document_id IS NOT NULL;
