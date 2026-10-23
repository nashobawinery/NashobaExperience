-- Phone-call tickets from the Retell webhook, and the category column
-- email/chat categorization already writes (support_categories.id).
-- Applied at startup by ensureSupportPhoneColumns() in server/retell-webhook.ts.

ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS retell_call_id varchar;

ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS category_id varchar;

CREATE UNIQUE INDEX IF NOT EXISTS uq_support_req_retell_call
  ON support_requests (retell_call_id);

CREATE INDEX IF NOT EXISTS idx_support_req_category
  ON support_requests (category_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_requests_category_id_support_categories_id_fk'
  ) THEN
    ALTER TABLE support_requests
      ADD CONSTRAINT support_requests_category_id_support_categories_id_fk
      FOREIGN KEY (category_id)
      REFERENCES support_categories (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Rollback:
-- ALTER TABLE support_requests DROP CONSTRAINT IF EXISTS support_requests_category_id_support_categories_id_fk;
-- DROP INDEX IF EXISTS idx_support_req_category;
-- DROP INDEX IF EXISTS uq_support_req_retell_call;
-- ALTER TABLE support_requests DROP COLUMN IF EXISTS category_id;
-- ALTER TABLE support_requests DROP COLUMN IF EXISTS retell_call_id;
