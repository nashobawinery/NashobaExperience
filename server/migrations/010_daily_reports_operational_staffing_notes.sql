-- Persist operational and staffing notes from Daily Reports admin UI.
-- Fixes: notes entered on create/edit were dropped (no DB columns + API omitted / overwrote them).

ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS operational_notes text,
  ADD COLUMN IF NOT EXISTS staffing_notes text;
