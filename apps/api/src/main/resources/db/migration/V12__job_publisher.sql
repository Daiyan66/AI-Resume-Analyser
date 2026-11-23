ALTER TABLE jobs ADD COLUMN published_by UUID REFERENCES users(id);

UPDATE jobs j
SET published_by = COALESCE(
    (SELECT a.actor_user_id FROM audit_events a
     WHERE a.organization_id = j.organization_id AND a.target_type = 'job'
       AND a.action = 'job.publish' AND a.target_id = j.id
     ORDER BY a.created_at, a.id LIMIT 1),
    j.created_by)
WHERE j.published_at IS NOT NULL OR j.status <> 'DRAFT';

CREATE INDEX jobs_org_poster_idx ON jobs (organization_id, (COALESCE(published_by, created_by)));
