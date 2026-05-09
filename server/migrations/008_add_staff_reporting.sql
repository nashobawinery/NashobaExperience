-- Shared Staff Reporting access model.
-- This keeps legacy Daily Report and Procedures users intact while creating
-- one administration surface for future assignments.

CREATE TABLE IF NOT EXISTS staff_reporting_staff (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name varchar NOT NULL,
  access_code varchar(10) NOT NULL,
  home_department varchar,
  is_active boolean NOT NULL DEFAULT true,
  legacy_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_used_at timestamp,
  created_by_id varchar,
  created_by_name varchar,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_reporting_staff_code
  ON staff_reporting_staff(access_code);

CREATE INDEX IF NOT EXISTS idx_staff_reporting_staff_active
  ON staff_reporting_staff(is_active);

CREATE TABLE IF NOT EXISTS staff_reporting_assignments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id varchar NOT NULL REFERENCES staff_reporting_staff(id) ON DELETE CASCADE,
  report_type varchar(30) NOT NULL,
  assignment_key varchar(120) NOT NULL,
  assignment_label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  legacy_source varchar(40),
  legacy_id varchar,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_staff_reporting_assignment UNIQUE (staff_id, report_type, assignment_key)
);

CREATE INDEX IF NOT EXISTS idx_staff_reporting_assignments_staff
  ON staff_reporting_assignments(staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_reporting_assignments_type
  ON staff_reporting_assignments(report_type);

-- Daily Reports backfill: one shared staff row per legacy name/code pair,
-- then one department assignment per access-code row.
WITH legacy_daily_staff AS (
  SELECT
    lower(trim(staff_name)) AS normalized_name,
    code,
    min(staff_name) AS staff_name,
    min(department) AS home_department,
    bool_or(is_active) AS is_active,
    jsonb_agg(DISTINCT jsonb_build_object('source', 'daily_report_access_codes', 'code', code)) AS legacy_sources
  FROM daily_report_access_codes
  GROUP BY lower(trim(staff_name)), code
),
inserted_daily_staff AS (
  INSERT INTO staff_reporting_staff (display_name, access_code, home_department, is_active, legacy_sources)
  SELECT staff_name, code, home_department, is_active, legacy_sources
  FROM legacy_daily_staff lds
  WHERE NOT EXISTS (
    SELECT 1
    FROM staff_reporting_staff s
    WHERE lower(trim(s.display_name)) = lds.normalized_name
      AND s.access_code = lds.code
  )
  RETURNING id, display_name, access_code
)
INSERT INTO staff_reporting_assignments (
  staff_id,
  report_type,
  assignment_key,
  assignment_label,
  is_enabled,
  legacy_source,
  legacy_id
)
SELECT
  s.id,
  'daily_report',
  drac.department,
  COALESCE(drt.department_label, drac.department),
  drac.is_active,
  'daily_report_access_codes',
  drac.id
FROM daily_report_access_codes drac
JOIN staff_reporting_staff s
  ON lower(trim(s.display_name)) = lower(trim(drac.staff_name))
 AND s.access_code = drac.code
LEFT JOIN daily_report_templates drt
  ON drt.department = drac.department
ON CONFLICT (staff_id, report_type, assignment_key) DO UPDATE SET
  assignment_label = EXCLUDED.assignment_label,
  is_enabled = staff_reporting_assignments.is_enabled OR EXCLUDED.is_enabled,
  updated_at = now();

-- Procedures staff backfill: shared access-code staff and assignments from
-- procedures_templates.assigned_staff_ids.
WITH legacy_procedure_staff AS (
  SELECT
    lower(trim(staff_name)) AS normalized_name,
    code,
    min(staff_name) AS staff_name,
    min(department) AS home_department,
    bool_or(is_active) AS is_active,
    jsonb_agg(DISTINCT jsonb_build_object('source', 'procedures_staff', 'code', code)) AS legacy_sources
  FROM procedures_staff
  GROUP BY lower(trim(staff_name)), code
)
INSERT INTO staff_reporting_staff (display_name, access_code, home_department, is_active, legacy_sources)
SELECT staff_name, code, home_department, is_active, legacy_sources
FROM legacy_procedure_staff lps
WHERE NOT EXISTS (
  SELECT 1
  FROM staff_reporting_staff s
  WHERE lower(trim(s.display_name)) = lps.normalized_name
    AND s.access_code = lps.code
);

INSERT INTO staff_reporting_assignments (
  staff_id,
  report_type,
  assignment_key,
  assignment_label,
  is_enabled,
  legacy_source,
  legacy_id
)
SELECT
  srs.id,
  'procedure',
  pt.procedure_code,
  pt.procedure_name,
  ps.is_active AND pt.is_active,
  'procedures_staff',
  ps.id
FROM procedures_staff ps
JOIN staff_reporting_staff srs
  ON lower(trim(srs.display_name)) = lower(trim(ps.staff_name))
 AND srs.access_code = ps.code
JOIN procedures_templates pt
  ON ps.id = ANY(pt.assigned_staff_ids)
ON CONFLICT (staff_id, report_type, assignment_key) DO UPDATE SET
  assignment_label = EXCLUDED.assignment_label,
  is_enabled = staff_reporting_assignments.is_enabled OR EXCLUDED.is_enabled,
  updated_at = now();

-- Legacy PIN users do not participate in the public staff portal, but keeping
-- them visible in shared administration avoids losing access records.
WITH legacy_pin_users AS (
  SELECT
    lower(trim(display_name)) AS normalized_name,
    pin_code,
    display_name,
    is_active,
    assigned_procedure_codes
  FROM procedures_users
)
INSERT INTO staff_reporting_staff (display_name, access_code, is_active, legacy_sources)
SELECT
  display_name,
  pin_code,
  is_active,
  jsonb_build_array(jsonb_build_object('source', 'procedures_users', 'pin', pin_code))
FROM legacy_pin_users lpu
WHERE NOT EXISTS (
  SELECT 1
  FROM staff_reporting_staff s
  WHERE lower(trim(s.display_name)) = lpu.normalized_name
    AND s.access_code = lpu.pin_code
);

INSERT INTO staff_reporting_assignments (
  staff_id,
  report_type,
  assignment_key,
  assignment_label,
  is_enabled,
  legacy_source,
  legacy_id
)
SELECT
  srs.id,
  'procedure',
  code,
  COALESCE(pt.procedure_name, code),
  pu.is_active,
  'procedures_users',
  pu.id
FROM procedures_users pu
JOIN staff_reporting_staff srs
  ON lower(trim(srs.display_name)) = lower(trim(pu.display_name))
 AND srs.access_code = pu.pin_code
CROSS JOIN LATERAL unnest(COALESCE(pu.assigned_procedure_codes, ARRAY[]::text[])) AS code
LEFT JOIN procedures_templates pt
  ON pt.procedure_code = code
ON CONFLICT (staff_id, report_type, assignment_key) DO UPDATE SET
  assignment_label = EXCLUDED.assignment_label,
  is_enabled = staff_reporting_assignments.is_enabled OR EXCLUDED.is_enabled,
  updated_at = now();
