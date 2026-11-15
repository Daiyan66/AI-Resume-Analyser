CREATE TABLE organization_policies (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id),
    reapply_cooldown_days INTEGER NOT NULL DEFAULT 0 CHECK (reapply_cooldown_days BETWEEN 0 AND 365),
    retention_days INTEGER NOT NULL DEFAULT 365 CHECK (retention_days BETWEEN 30 AND 3650),
    ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO organization_policies (organization_id) SELECT id FROM organizations;
