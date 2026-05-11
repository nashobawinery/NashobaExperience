-- Fixes: column "requires_signup" of relation "scheduled_activities" does not exist
-- (seen when PATCH /api/scheduled-activities/:id includes this field).
--
-- Apply on the database used by Render/production if that API is deployed.
-- Safe to run once: skips if column already exists (PostgreSQL 11+).

ALTER TABLE scheduled_activities
  ADD COLUMN IF NOT EXISTS requires_signup boolean NOT NULL DEFAULT false;
