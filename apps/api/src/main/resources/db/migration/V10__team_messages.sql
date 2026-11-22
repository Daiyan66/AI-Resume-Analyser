CREATE TABLE team_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (recipient_id IS NULL OR recipient_id <> sender_id)
);

CREATE INDEX team_messages_room_idx ON team_messages (organization_id, id DESC) WHERE recipient_id IS NULL;
CREATE INDEX team_messages_direct_idx ON team_messages (organization_id, sender_id, recipient_id, id DESC) WHERE recipient_id IS NOT NULL;
