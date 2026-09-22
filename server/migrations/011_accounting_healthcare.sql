-- Shared health insurance for Nashoba Valley and The Gables.
-- Applied at runtime by server/accounting-routes.ts as well.

CREATE TABLE IF NOT EXISTS accounting_companies (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL UNIQUE,
  legal_name varchar,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounting_benefit_providers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  group_number varchar,
  policy_holder varchar,
  plan_year_start date,
  rate_guarantee_through date,
  is_current boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounting_benefit_programs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id varchar NOT NULL REFERENCES accounting_benefit_providers(id) ON DELETE CASCADE,
  category varchar(20) NOT NULL,
  plan_code varchar NOT NULL,
  plan_name varchar NOT NULL,
  network varchar,
  benefits jsonb NOT NULL DEFAULT '{}'::jsonb,
  rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_accounting_program_code UNIQUE (provider_id, plan_code)
);

CREATE TABLE IF NOT EXISTS accounting_benefit_bills (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id varchar NOT NULL REFERENCES accounting_benefit_providers(id) ON DELETE CASCADE,
  program_id varchar REFERENCES accounting_benefit_programs(id) ON DELETE SET NULL,
  billing_month date NOT NULL,
  total_amount numeric(12, 2),
  allocations jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_filename text NOT NULL,
  stored_filename varchar NOT NULL,
  mime_type varchar,
  file_size integer,
  notes text,
  uploaded_by_id varchar,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounting_bills_month
  ON accounting_benefit_bills(billing_month DESC);

ALTER TABLE accounting_companies ADD COLUMN IF NOT EXISTS billing_email varchar;
ALTER TABLE accounting_companies ADD COLUMN IF NOT EXISTS pays_carrier boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS accounting_contribution_rules (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES accounting_companies(id) ON DELETE CASCADE,
  category varchar(20) NOT NULL,
  basis varchar(40) NOT NULL DEFAULT 'percent_of_employee_only',
  employer_percent numeric(5, 2) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_accounting_contribution_rule UNIQUE (company_id, category)
);

CREATE TABLE IF NOT EXISTS accounting_participants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES accounting_companies(id) ON DELETE CASCADE,
  full_name varchar NOT NULL,
  hire_date date NOT NULL,
  coverage_end date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounting_participant_elections (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id varchar NOT NULL REFERENCES accounting_participants(id) ON DELETE CASCADE,
  program_id varchar NOT NULL REFERENCES accounting_benefit_programs(id) ON DELETE CASCADE,
  tier varchar NOT NULL,
  CONSTRAINT uq_accounting_participant_program UNIQUE (participant_id, program_id)
);

CREATE TABLE IF NOT EXISTS accounting_benefit_statements (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id varchar REFERENCES accounting_benefit_providers(id) ON DELETE SET NULL,
  billing_month date NOT NULL,
  kind varchar NOT NULL,
  invoice_number varchar NOT NULL,
  recipient_email varchar NOT NULL,
  recipient_name varchar NOT NULL,
  total_amount numeric(12, 2) NOT NULL,
  employer_amount numeric(12, 2) NOT NULL,
  employee_amount numeric(12, 2) NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar NOT NULL DEFAULT 'recorded',
  sent_at timestamp,
  email_error text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_accounting_statement_month UNIQUE (billing_month, kind)
);
