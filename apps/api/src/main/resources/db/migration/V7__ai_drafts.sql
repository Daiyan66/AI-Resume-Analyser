CREATE TABLE ai_job_drafts (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    job_title VARCHAR(160) NOT NULL,
    supplied_facts TEXT NOT NULL,
    draft_text TEXT NOT NULL,
    provider_model VARCHAR(160) NOT NULL,
    prompt_version VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ai_job_drafts_org_idx ON ai_job_drafts (organization_id, created_at DESC);
