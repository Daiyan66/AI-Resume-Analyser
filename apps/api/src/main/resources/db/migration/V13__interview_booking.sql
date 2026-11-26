CREATE TABLE interview_offers (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id),
    organizer_id UUID NOT NULL REFERENCES users(id),
    minutes INTEGER NOT NULL CHECK (minutes BETWEEN 15 AND 120),
    timezone VARCHAR(80) NOT NULL,
    location VARCHAR(500) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX interview_offers_one_open ON interview_offers(application_id) WHERE closed_at IS NULL;

CREATE TABLE interview_slots (
    id UUID PRIMARY KEY,
    offer_id UUID NOT NULL REFERENCES interview_offers(id),
    starts_at TIMESTAMPTZ NOT NULL,
    UNIQUE (offer_id, starts_at)
);

ALTER TABLE application_interviews ADD COLUMN minutes INTEGER NOT NULL DEFAULT 30 CHECK (minutes BETWEEN 15 AND 120);
ALTER TABLE application_interviews ADD COLUMN reschedule_requested_at TIMESTAMPTZ;
ALTER TABLE application_interviews ADD COLUMN completed_at TIMESTAMPTZ;
DROP INDEX application_interviews_one_active;
CREATE UNIQUE INDEX application_interviews_one_active
    ON application_interviews (application_id) WHERE cancelled_at IS NULL AND completed_at IS NULL;
CREATE INDEX interview_organizer_bookings ON application_interviews(created_by, starts_at) WHERE cancelled_at IS NULL;
