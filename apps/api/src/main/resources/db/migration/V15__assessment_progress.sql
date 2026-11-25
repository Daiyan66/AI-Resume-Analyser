ALTER TABLE assessment_assignments ADD COLUMN available_from TIMESTAMPTZ;
UPDATE assessment_assignments SET available_from = assigned_at;
ALTER TABLE assessment_assignments ALTER COLUMN available_from SET NOT NULL;
ALTER TABLE assessment_assignments ADD COLUMN outcome VARCHAR(8)
    CHECK (outcome IN ('PASSED', 'RETRY', 'EXPIRED'));
ALTER TABLE assessment_assignments DROP CONSTRAINT assessment_assignments_application_id_template_id_key;
CREATE UNIQUE INDEX assessment_assignment_one_current
    ON assessment_assignments(application_id, template_id)
    WHERE outcome IS NULL OR outcome = 'PASSED';

CREATE VIEW latest_assessment_attempts AS
SELECT DISTINCT ON (application_id, template_id) *
FROM assessment_assignments
ORDER BY application_id, template_id, assigned_at DESC, id DESC;
