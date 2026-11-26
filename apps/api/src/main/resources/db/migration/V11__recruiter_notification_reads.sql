CREATE TABLE recruiter_notification_reads (
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    event_key TEXT NOT NULL,
    PRIMARY KEY (organization_id, user_id, event_key)
);
