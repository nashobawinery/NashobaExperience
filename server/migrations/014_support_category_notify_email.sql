-- Mailbox for each support category, plus the default mailbox.
-- Applied at startup by ensureSupportCategoryRouting().
-- Existing addresses are left alone so a later edit in Support is not overwritten.

ALTER TABLE support_categories ADD COLUMN IF NOT EXISTS notify_email varchar;

INSERT INTO support_categories (name, slug, description, sort_order, is_active, notify_email)
SELECT 'Accounting', 'accounting', 'Billing, payments, and accounting questions', 7, true, 'Rap@nashobawinery.com'
WHERE NOT EXISTS (
  SELECT 1 FROM support_categories WHERE slug = 'accounting'
);

UPDATE support_categories
SET notify_email = 'Rap@nashobawinery.com', updated_at = now()
WHERE slug = 'accounting' AND (notify_email IS NULL OR btrim(notify_email) = '');

UPDATE support_categories
SET notify_email = 'Aparrow@nashobawinery.com', updated_at = now()
WHERE slug = 'reservations' AND (notify_email IS NULL OR btrim(notify_email) = '');

UPDATE support_categories
SET notify_email = 'crp@nashobawinery.com', updated_at = now()
WHERE (notify_email IS NULL OR btrim(notify_email) = '')
  AND (
    slug IN ('events-entertainment', 'events-and-function')
    OR lower(name) IN ('events & entertainment', 'events and function', 'events and functions')
  );

INSERT INTO support_categories (name, slug, description, sort_order, is_active, notify_email)
SELECT 'Events and Function', 'events-and-function', 'Events and function inquiries', 6, true, 'crp@nashobawinery.com'
WHERE NOT EXISTS (
  SELECT 1 FROM support_categories
  WHERE slug IN ('events-entertainment', 'events-and-function')
     OR lower(name) LIKE '%event%'
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_support_settings_key ON support_settings (setting_key);

INSERT INTO support_settings (setting_key, setting_value, description)
SELECT
  'default_notify_email',
  'Jp@nashobawinery.com',
  'Mailbox for support tickets whose category has no notification email'
WHERE NOT EXISTS (
  SELECT 1 FROM support_settings WHERE setting_key = 'default_notify_email'
);

-- Rollback:
-- DELETE FROM support_settings WHERE setting_key = 'default_notify_email' AND setting_value = 'Jp@nashobawinery.com';
-- ALTER TABLE support_categories DROP COLUMN IF EXISTS notify_email;
