import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomBytes, randomUUID } from "crypto";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requirePlatformRole } from "./platformAuth";

const router = Router();
const isAdmin = requirePlatformRole(["super_admin"]);
let prepared = false;

const billDir = path.join(process.cwd(), "uploads", "accounting-bills");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(application\/pdf|image\/(jpeg|png|webp|gif|heic|heif))$/i.test(file.mimetype)
      || /\.(pdf|jpe?g|png|webp|gif|heic|heif)$/i.test(file.originalname);
    if (!allowed) {
      cb(new Error("Upload a PDF or an image of the bill."));
      return;
    }
    cb(null, true);
  },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/(jpeg|png|webp))$/i.test(file.mimetype)
      || /\.(pdf|docx?|jpe?g|png|webp)$/i.test(file.originalname);
    if (!allowed) {
      cb(new Error("Upload a PDF, Word document, or image."));
      return;
    }
    cb(null, true);
  },
});

const renewalThrough = "2027-04-30";

const unitedPrograms = [
  {
    category: "medical",
    planCode: "NavE2500i100LX21B",
    planName: "Navigate $2,500",
    network: "Navigate",
    sortOrder: 1,
    notes: "2026-27 enrollment package. Renewal medical premiums run May 1, 2026 through April 30, 2027. Employee + child is the same monthly premium as single + spouse. The October 2026 UnitedHealthcare census bills single coverage at $884.62.",
    benefits: {
      deductibleIn: "$2,500",
      deductibleOut: "Not covered",
      outOfPocketIn: "$5,000",
      outOfPocketOut: "Not covered",
      coinsuranceIn: "100%",
      coinsuranceOut: "Not covered",
      copayPcp: "$25",
      copaySpecialist: "$75",
      pharmacy: "RX4 ADVB",
    },
    rates: {
      effectiveThrough: renewalThrough,
      tiers: [
        { tier: "Employee", enrollment: null, current: 777.27, renewal: 884.62 },
        { tier: "Employee & Spouse", enrollment: null, current: 1524.55, renewal: 1739.26 },
        { tier: "Employee & Child", enrollment: null, current: null, renewal: 1739.26 },
        { tier: "Family", enrollment: null, current: null, renewal: 2593.88 },
      ],
    },
  },
  {
    category: "medical",
    planCode: "NavE3000i80LX21B",
    planName: "Navigate $3,000",
    network: "Navigate",
    sortOrder: 2,
    notes: "2026-27 enrollment package, plan NavE3000. Renewal single coverage is $764.63, which matches the October 2026 UnitedHealthcare census. Employee + child is the same monthly premium as single + spouse.",
    benefits: {
      deductibleIn: "$3,000",
      deductibleOut: "Not covered",
      outOfPocketIn: "$8,150",
      outOfPocketOut: "Not covered",
      coinsuranceIn: "80%",
      coinsuranceOut: "Not covered",
      copayPcp: "$25",
      copaySpecialist: "$75",
      pharmacy: "RX4 ADVB",
    },
    rates: {
      effectiveThrough: renewalThrough,
      tiers: [
        { tier: "Employee", enrollment: null, current: 663.63, renewal: 764.63 },
        { tier: "Employee & Spouse", enrollment: null, current: 1297.28, renewal: 1499.29 },
        { tier: "Employee & Child", enrollment: null, current: null, renewal: 1499.29 },
        { tier: "Family", enrollment: null, current: null, renewal: 2233.93 },
      ],
    },
  },
  {
    category: "medical",
    planCode: "P3000i100LX21B",
    planName: "Choice Plus $3,000",
    network: "Choice Plus",
    sortOrder: 3,
    notes: "2026-27 enrollment package, Choice Plus PPO. Renewal single coverage is $930.48 and single + spouse is $1,830.94, matching the October 2026 UnitedHealthcare census. Employee + child uses the single + spouse premium. Family is $2,731.45.",
    benefits: {
      deductibleIn: "$3,000",
      deductibleOut: "$6,000",
      outOfPocketIn: "$5,500",
      outOfPocketOut: "$11,000",
      coinsuranceIn: "100%",
      coinsuranceOut: "50%",
      copayPcp: "$25",
      copaySpecialist: "$75",
      pharmacy: "RX4 ADVB",
    },
    rates: {
      effectiveThrough: renewalThrough,
      tiers: [
        { tier: "Employee", enrollment: null, current: 813.10, renewal: 930.48 },
        { tier: "Employee & Spouse", enrollment: null, current: 1596.19, renewal: 1830.94 },
        { tier: "Employee & Child", enrollment: null, current: null, renewal: 1830.94 },
        { tier: "Family", enrollment: null, current: null, renewal: 2731.45 },
      ],
    },
  },
  {
    category: "dental",
    planCode: "37331",
    planName: "Passive PPO",
    network: "Passive PPO",
    sortOrder: 4,
    notes: "2026-27 enrollment package, dental 7331. Employee and employee + spouse renewal rates match the October 2026 UnitedHealthcare census ($41.80 and $83.58). Employee + child and family are the package rates. The company contribution is a flat monthly amount by tenure, not a percent of premium.",
    benefits: {
      planType: "100/80/50/50 PASSIVE PPO $50/$100/$1,000",
      annualMaxIn: "$1,000",
      annualMaxOut: "$1,000",
      orthoLifetime: "N/A",
      deductibleIndividual: "$50",
      deductibleFamily: "$100",
      waitingPeriod: "None",
      services: [
        { name: "Preventive", inNetwork: "100%", outOfNetwork: "100%" },
        { name: "Basic", inNetwork: "80%", outOfNetwork: "80%" },
        { name: "Endodontics", inNetwork: "80%", outOfNetwork: "80%" },
        { name: "Periodontics", inNetwork: "80%", outOfNetwork: "80%" },
        { name: "Oral surgery", inNetwork: "80%", outOfNetwork: "80%" },
        { name: "Major", inNetwork: "50%", outOfNetwork: "50%" },
        { name: "Orthodontia", inNetwork: "N/A", outOfNetwork: "N/A" },
      ],
    },
    rates: {
      effectiveThrough: renewalThrough,
      rateGuarantee: "12 months",
      changePercent: 5,
      monthlyPremiumCurrent: 437.89,
      monthlyPremiumRenewal: 459.78,
      tiers: [
        { tier: "Employee", enrollment: 10, current: 39.81, renewal: 41.80 },
        { tier: "Employee & Spouse", enrollment: 1, current: 79.60, renewal: 83.58 },
        { tier: "Employee & Child", enrollment: 0, current: 82.58, renewal: 94.74 },
        { tier: "Employee & Family", enrollment: 0, current: 138.73, renewal: 143.60 },
      ],
    },
  },
  {
    category: "vision",
    planCode: "S1006",
    planName: "Vision S1006",
    network: "UnitedHealthcare Vision",
    sortOrder: 5,
    notes: "2026-27 enrollment package, vision S1006. Employees pay the full premium. The company does not contribute. Employee and employee + spouse match the October 2026 census ($6.27 and $11.90). Employee + child is $13.96 in the package.",
    benefits: {
      planType: "12/12/10/8/10/$25/s/$30/$105",
      examCopay: "$10",
      materialsCopay: "$25",
      frameAllowance: "$130",
      electiveContacts: "$105",
      contactFitEval: "$30",
      necessaryContacts: "$210",
      frequency: "Exam, lenses, frame, and contact lens fit each once per 12 months",
      outOfNetwork: [
        { name: "Exam", amount: "Up to $40" },
        { name: "Eyeglass lenses", amount: "Up to $40" },
        { name: "Frame", amount: "Up to $45" },
        { name: "Elective contact lens", amount: "Up to $80" },
        { name: "Necessary contact lens", amount: "Up to $210" },
      ],
    },
    rates: {
      effectiveThrough: renewalThrough,
      rateGuarantee: "24 months",
      changePercent: 0,
      monthlyPremiumCurrent: 48.88,
      monthlyPremiumRenewal: 48.88,
      tiers: [
        { tier: "Employee", enrollment: 6, current: 6.27, renewal: 6.27 },
        { tier: "Employee & Spouse", enrollment: 2, current: 11.90, renewal: 11.90 },
        { tier: "Employee & Child", enrollment: 0, current: 13.96, renewal: 13.96 },
        { tier: "Employee & Family", enrollment: 0, current: 19.65, renewal: 19.65 },
      ],
    },
  },
];

const contributionBands = [
  { category: "medical", minMonths: 3, maxMonths: 59, employerAmount: 450 },
  { category: "medical", minMonths: 60, maxMonths: 119, employerAmount: 625 },
  { category: "medical", minMonths: 120, maxMonths: null, employerAmount: 700 },
  { category: "dental", minMonths: 3, maxMonths: 59, employerAmount: 10.45 },
  { category: "dental", minMonths: 60, maxMonths: 119, employerAmount: 20.9 },
  { category: "dental", minMonths: 120, maxMonths: null, employerAmount: 41.8 },
  { category: "vision", minMonths: 0, maxMonths: null, employerAmount: 0 },
];

export async function ensureAccountingTables() {
  if (prepared) return;
  await db.execute(sql`
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
    CREATE INDEX IF NOT EXISTS idx_accounting_bills_month ON accounting_benefit_bills(billing_month DESC);
  `);

  await db.execute(sql`
    INSERT INTO accounting_companies (name, legal_name, notes, sort_order)
    VALUES
      ('Nashoba Valley', 'Nashoba Valley Spirits LTD', 'Brother-sister corporation. Policy holder on the UnitedHealthcare bill.', 1),
      ('The Gables', NULL, 'Brother-sister corporation sharing the Nashoba Valley health, dental, and vision policy.', 2)
    ON CONFLICT (name) DO NOTHING
  `);

  const existing = await db.execute(sql`
    SELECT id FROM accounting_benefit_providers
    WHERE group_number = '1481121' AND name = 'UnitedHealthcare'
    LIMIT 1
  `);

  let providerId = (existing.rows[0] as { id?: string } | undefined)?.id;
  if (!providerId) {
    const inserted = await db.execute(sql`
      INSERT INTO accounting_benefit_providers (
        name, group_number, policy_holder, plan_year_start, rate_guarantee_through, is_current, notes
      ) VALUES (
        'UnitedHealthcare',
        '1481121',
        'Nashoba Valley Spirits LTD',
        '2026-05-01',
        '2027-04-30',
        true,
        'Current carrier for the shared medical, dental, and vision policy. Nashoba Valley and The Gables are covered together. Renewal package dated May 1, 2026.'
      )
      RETURNING id
    `);
    providerId = (inserted.rows[0] as { id: string }).id;
  }

  for (const program of unitedPrograms) {
    await db.execute(sql`
      INSERT INTO accounting_benefit_programs (
        provider_id, category, plan_code, plan_name, network, benefits, rates, notes, sort_order
      ) VALUES (
        ${providerId},
        ${program.category},
        ${program.planCode},
        ${program.planName},
        ${program.network},
        CAST(${JSON.stringify(program.benefits)} AS jsonb),
        CAST(${JSON.stringify(program.rates)} AS jsonb),
        ${program.notes},
        ${program.sortOrder}
      )
      ON CONFLICT (provider_id, plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        network = EXCLUDED.network,
        benefits = EXCLUDED.benefits,
        rates = EXCLUDED.rates,
        notes = EXCLUDED.notes,
        sort_order = EXCLUDED.sort_order
    `);
  }

  await db.execute(sql`
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
    CREATE TABLE IF NOT EXISTS accounting_contribution_bands (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL REFERENCES accounting_companies(id) ON DELETE CASCADE,
      category varchar(20) NOT NULL,
      min_months integer NOT NULL,
      max_months integer,
      employer_amount numeric(12, 2) NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT uq_accounting_contribution_band UNIQUE (company_id, category, min_months)
    );
    CREATE TABLE IF NOT EXISTS accounting_account_mappings (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL REFERENCES accounting_companies(id) ON DELETE CASCADE,
      role varchar(40) NOT NULL,
      account_name varchar NOT NULL,
      account_type varchar(40) NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT uq_accounting_account_mapping UNIQUE (company_id, role)
    );
    CREATE TABLE IF NOT EXISTS accounting_payroll_deductions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_id varchar NOT NULL REFERENCES accounting_participants(id) ON DELETE CASCADE,
      period_end date NOT NULL,
      coverage_month date NOT NULL,
      monthly_employee_amount numeric(12, 2) NOT NULL,
      deduction_amount numeric(12, 2) NOT NULL,
      logged_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT uq_accounting_payroll_deduction UNIQUE (participant_id, period_end)
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
    CREATE TABLE IF NOT EXISTS accounting_benefit_documents (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id varchar NOT NULL REFERENCES accounting_benefit_providers(id) ON DELETE CASCADE,
      title varchar NOT NULL,
      original_filename text NOT NULL,
      mime_type varchar,
      file_size integer NOT NULL,
      file_data bytea NOT NULL,
      attach_to_inquiries boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS accounting_benefit_upload_links (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id varchar NOT NULL REFERENCES accounting_benefit_providers(id) ON DELETE CASCADE,
      billing_month date NOT NULL,
      token varchar NOT NULL UNIQUE,
      recipient_email varchar NOT NULL,
      expires_at timestamp NOT NULL,
      sent_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT uq_accounting_upload_link_month UNIQUE (provider_id, billing_month)
    );
    CREATE TABLE IF NOT EXISTS accounting_benefit_inquiries (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id varchar NOT NULL REFERENCES accounting_benefit_providers(id) ON DELETE CASCADE,
      full_name varchar NOT NULL,
      email varchar NOT NULL,
      hire_date date NOT NULL,
      event_type varchar NOT NULL,
      event_detail text,
      attachment_names jsonb NOT NULL DEFAULT '[]'::jsonb,
      explanation text NOT NULL,
      status varchar NOT NULL DEFAULT 'sent',
      email_error text,
      sent_at timestamp,
      created_at timestamp NOT NULL DEFAULT now()
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
  `);

  await db.execute(sql`
    UPDATE accounting_companies
    SET billing_email = 'ap@nashobawinery.com', pays_carrier = true
    WHERE name = 'Nashoba Valley' AND billing_email IS NULL
  `);
  await db.execute(sql`
    UPDATE accounting_companies
    SET billing_email = 'gap@gablesal.com'
    WHERE name = 'The Gables' AND (billing_email IS NULL OR billing_email = 'gap@gableal.com')
  `);

  const mappingSeed = [
    { company: "Nashoba Valley", role: "employee_contribution", accountName: "Employee Contribution to Health", accountType: "balance_sheet" },
    { company: "Nashoba Valley", role: "employer_expense", accountName: "Health Care Expense", accountType: "expense" },
    { company: "Nashoba Valley", role: "intercompany_receivable", accountName: "Accounts Receivable - Gables Healthcare Reimbursement", accountType: "balance_sheet" },
    { company: "The Gables", role: "employee_contribution", accountName: "Employee Contribution to Health", accountType: "balance_sheet" },
    { company: "The Gables", role: "employer_expense", accountName: "Salaries:Health Insurance:Medical - Er Contribution", accountType: "expense" },
  ];
  for (const mapping of mappingSeed) {
    await db.execute(sql`
      INSERT INTO accounting_account_mappings (company_id, role, account_name, account_type)
      SELECT id, ${mapping.role}, ${mapping.accountName}, ${mapping.accountType}
      FROM accounting_companies
      WHERE name = ${mapping.company}
      ON CONFLICT (company_id, role) DO NOTHING
    `);
  }
  await db.execute(sql`DELETE FROM accounting_account_mappings WHERE role = 'intercompany_payable'`);
  await db.execute(sql`
    UPDATE accounting_account_mappings AS mapping
    SET account_name = 'Salaries:Health Insurance:Medical - Er Contribution', account_type = 'expense', updated_at = now()
    FROM accounting_companies AS company
    WHERE mapping.company_id = company.id
      AND company.name = 'The Gables'
      AND mapping.role = 'employer_expense'
      AND mapping.account_name = 'Health Care Expense'
  `);

  const companyRows = await db.execute(sql`SELECT id FROM accounting_companies`);
  for (const company of companyRows.rows as { id: string }[]) {
    for (const band of contributionBands) {
      await db.execute(sql`
        INSERT INTO accounting_contribution_bands (company_id, category, min_months, max_months, employer_amount)
        VALUES (${company.id}, ${band.category}, ${band.minMonths}, ${band.maxMonths}, ${band.employerAmount})
        ON CONFLICT (company_id, category, min_months) DO NOTHING
      `);
    }
  }

  await db.execute(sql`
    ALTER TABLE accounting_payroll_deductions ADD COLUMN IF NOT EXISTS monthly_employer_amount numeric(12, 2);
    ALTER TABLE accounting_payroll_deductions ADD COLUMN IF NOT EXISTS employer_deduction numeric(12, 2);
    ALTER TABLE accounting_benefit_providers ADD COLUMN IF NOT EXISTS bill_request_email varchar;
    UPDATE accounting_benefit_providers
    SET bill_request_email = 'aparrow@nashobawinery.com'
    WHERE bill_request_email IS NULL;
  `);

  prepared = true;
}

function mapProvider(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    groupNumber: row.groupNumber,
    policyHolder: row.policyHolder,
    planYearStart: row.planYearStart,
    rateGuaranteeThrough: row.rateGuaranteeThrough,
    billRequestEmail: row.billRequestEmail,
    isCurrent: row.isCurrent,
    notes: row.notes,
  };
}

function mapProgram(row: Record<string, unknown>) {
  return {
    id: row.id,
    providerId: row.providerId,
    category: row.category,
    planCode: row.planCode,
    planName: row.planName,
    network: row.network,
    benefits: row.benefits ?? {},
    rates: row.rates ?? {},
    notes: row.notes,
    sortOrder: row.sortOrder,
  };
}

function cents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function monthDate(billingMonth: string) {
  return `${billingMonth}-01`;
}

function usesRenewalRates(billingMonth: string, planYearStart: string | null) {
  if (!planYearStart) return true;
  return billingMonth >= String(planYearStart).slice(0, 7);
}

function tierRate(program: { rates?: { tiers?: { tier: string; current: number | null; renewal: number | null }[] } }, tier: string, renewal: boolean) {
  const match = (program.rates?.tiers ?? []).find((row) => row.tier.toLowerCase() === tier.toLowerCase());
  if (!match) return null;
  const value = renewal ? match.renewal : match.current;
  return value === null || value === undefined ? null : Number(value);
}

function monthsOfService(hireDate: string, billingMonth: string) {
  const hire = String(hireDate).slice(0, 10);
  const [hireYear, hireMonth, hireDay] = hire.split("-").map(Number);
  const [year, month] = billingMonth.split("-").map(Number);
  let months = (year - hireYear) * 12 + (month - hireMonth);
  if (1 < hireDay) months -= 1;
  return Math.max(0, months);
}

function bandAmount(
  category: string,
  months: number,
  bands: { category: string; minMonths: number; maxMonths: number | null; employerAmount: number }[],
) {
  const band = bands.find((item) => item.category === category && months >= item.minMonths && (item.maxMonths === null || months <= item.maxMonths));
  return band ? band.employerAmount : 0;
}

function rateShareLabel(amount: number, employeeOnlyPremium: number | null) {
  const dollars = moneyText(amount);
  if (!employeeOnlyPremium || employeeOnlyPremium <= 0 || amount <= 0) return dollars;
  const percent = (amount / employeeOnlyPremium) * 100;
  const rounded = Math.round(percent);
  if (Math.abs(percent - rounded) > 0.05) return dollars;
  return `${dollars} (${rounded}% of employee-only)`;
}

function nextServiceMonth(hireDate: string, targetMonths: number) {
  const start = String(hireDate).slice(0, 7);
  for (let i = 0; i < 480; i += 1) {
    const month = shiftMonth(start, i);
    if (monthsOfService(hireDate, month) >= targetMonths) return month;
  }
  return null;
}

export async function contributionAnniversaryLedger(billingMonth: string) {
  const company = await db.execute(sql`SELECT id FROM accounting_companies ORDER BY sort_order, name LIMIT 1`);
  const companyId = (company.rows[0] as { id?: string } | undefined)?.id;
  const bandRows = await db.execute(sql`
    SELECT category, min_months as "minMonths", max_months as "maxMonths", employer_amount as "employerAmount"
    FROM accounting_contribution_bands
    WHERE company_id = ${companyId}
  `);
  const bands = (bandRows.rows as { category: string; minMonths: number; maxMonths: number | null; employerAmount: string }[]).map((band) => ({
    category: band.category,
    minMonths: Number(band.minMonths),
    maxMonths: band.maxMonths === null ? null : Number(band.maxMonths),
    employerAmount: Number(band.employerAmount),
  }));
  const steps = Array.from(new Set(bands.filter((band) => band.minMonths > 0).map((band) => band.minMonths))).sort((a, b) => a - b);
  const dental = await db.execute(sql`
    SELECT rates FROM accounting_benefit_programs
    WHERE category = 'dental' AND active = true
    ORDER BY sort_order LIMIT 1
  `);
  const dentalRates = (dental.rows[0] as { rates?: { tiers?: { tier: string; renewal: number | null }[] } } | undefined)?.rates;
  const dentalEmployeeOnly = dentalRates?.tiers?.find((tier) => tier.tier === "Employee")?.renewal ?? null;

  const people = await db.execute(sql`
    SELECT p.full_name as "fullName", p.hire_date as "hireDate", c.name as "companyName"
    FROM accounting_participants p
    JOIN accounting_companies c ON c.id = p.company_id
    WHERE p.active = true
      AND p.hire_date <= (${monthDate(billingMonth)}::date + interval '1 month' - interval '1 day')
      AND (p.coverage_end IS NULL OR p.coverage_end >= ${monthDate(billingMonth)}::date)
    ORDER BY p.full_name
  `);

  const rows = (people.rows as { fullName: string; hireDate: string; companyName: string }[]).map((person) => {
    const hireDate = String(person.hireDate).slice(0, 10);
    const serviceMonths = monthsOfService(hireDate, billingMonth);
    const nextStep = steps.find((step) => serviceMonths < step) ?? null;
    const nextMonth = nextStep === null ? null : nextServiceMonth(hireDate, nextStep);
    const current = {
      medical: bandAmount("medical", serviceMonths, bands),
      dental: bandAmount("dental", serviceMonths, bands),
    };
    const upcoming = nextStep === null ? null : {
      medical: bandAmount("medical", nextStep, bands),
      dental: bandAmount("dental", nextStep, bands),
    };
    return {
      fullName: person.fullName,
      companyName: person.companyName,
      hireDate,
      serviceMonths,
      currentMedical: rateShareLabel(current.medical, null),
      currentDental: rateShareLabel(current.dental, dentalEmployeeOnly),
      nextMonth,
      nextServiceMonths: nextStep,
      nextMedical: upcoming ? rateShareLabel(upcoming.medical, null) : null,
      nextDental: upcoming ? rateShareLabel(upcoming.dental, dentalEmployeeOnly) : null,
    };
  });
  rows.sort((a, b) => {
    if (a.nextMonth && b.nextMonth) return a.nextMonth.localeCompare(b.nextMonth) || a.fullName.localeCompare(b.fullName);
    if (a.nextMonth) return -1;
    if (b.nextMonth) return 1;
    return a.fullName.localeCompare(b.fullName);
  });
  return { month: billingMonth, dentalEmployeeOnly, rows };
}

function employerShare(
  premium: number,
  category: string,
  months: number,
  bands: { category: string; minMonths: number; maxMonths: number | null; employerAmount: number }[],
) {
  const band = bands.find((item) => item.category === category && months >= item.minMonths && (item.maxMonths === null || months <= item.maxMonths));
  if (!band) {
    return {
      employer: 0,
      employee: cents(premium),
      warning: `Tenure is ${months} months, before the published ${category} contribution starts.`,
    };
  }
  const employer = cents(Math.min(premium, band.employerAmount));
  return { employer, employee: cents(premium - employer), warning: null as string | null };
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function moneyText(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type AllocationLine = {
  participantId: string;
  fullName: string;
      hireDate: string;
      serviceMonths: number;
      companyId: string;
  companyName: string;
  paysCarrier: boolean;
  elections: {
    programId: string;
    programName: string;
    category: string;
    tier: string;
    premium: number | null;
    employer: number | null;
    employee: number | null;
    warning: string | null;
  }[];
  premium: number;
  employer: number;
  employee: number;
};

export async function calculateHealthcareAllocation(billingMonth: string, providerId: string) {
  const providerResult = await db.execute(sql`
    SELECT id, name, plan_year_start as "planYearStart"
    FROM accounting_benefit_providers WHERE id = ${providerId}
  `);
  const provider = providerResult.rows[0] as { id: string; name: string; planYearStart: string | null } | undefined;
  if (!provider) throw new Error("Provider not found");

  const renewal = usesRenewalRates(billingMonth, provider.planYearStart);
  const companies = await db.execute(sql`
    SELECT id, name, billing_email as "billingEmail", pays_carrier as "paysCarrier"
    FROM accounting_companies ORDER BY sort_order, name
  `);
  const programs = await db.execute(sql`
    SELECT id, category, plan_name as "planName", rates
    FROM accounting_benefit_programs
    WHERE provider_id = ${providerId} AND active = true
  `);
  const bands = await db.execute(sql`
    SELECT company_id as "companyId", category, min_months as "minMonths", max_months as "maxMonths",
           employer_amount as "employerAmount"
    FROM accounting_contribution_bands
  `);
  const people = await db.execute(sql`
    SELECT p.id, p.full_name as "fullName", p.hire_date as "hireDate", p.company_id as "companyId",
           c.name as "companyName", c.pays_carrier as "paysCarrier"
    FROM accounting_participants p
    JOIN accounting_companies c ON c.id = p.company_id
    WHERE p.active = true
      AND p.hire_date <= (${monthDate(billingMonth)}::date + interval '1 month' - interval '1 day')
      AND (p.coverage_end IS NULL OR p.coverage_end >= ${monthDate(billingMonth)}::date)
    ORDER BY c.sort_order, p.full_name
  `);
  const elections = await db.execute(sql`
    SELECT participant_id as "participantId", program_id as "programId", tier
    FROM accounting_participant_elections
  `);

  const programById = new Map((programs.rows as { id: string; category: string; planName: string; rates: { tiers?: { tier: string; current: number | null; renewal: number | null }[] } }[]).map((program) => [program.id, program]));
  const bandsByCompany = new Map<string, { category: string; minMonths: number; maxMonths: number | null; employerAmount: number }[]>();
  for (const band of bands.rows as { companyId: string; category: string; minMonths: number; maxMonths: number | null; employerAmount: string }[]) {
    const list = bandsByCompany.get(band.companyId) ?? [];
    list.push({
      category: band.category,
      minMonths: Number(band.minMonths),
      maxMonths: band.maxMonths === null ? null : Number(band.maxMonths),
      employerAmount: Number(band.employerAmount),
    });
    bandsByCompany.set(band.companyId, list);
  }
  const electionsByPerson = new Map<string, { programId: string; tier: string }[]>();
  for (const election of elections.rows as { participantId: string; programId: string; tier: string }[]) {
    const list = electionsByPerson.get(election.participantId) ?? [];
    list.push(election);
    electionsByPerson.set(election.participantId, list);
  }

  const warnings: string[] = [];
  const lines: AllocationLine[] = (people.rows as { id: string; fullName: string; hireDate: string; companyId: string; companyName: string; paysCarrier: boolean }[]).map((person) => {
    const elected = (electionsByPerson.get(person.id) ?? []).flatMap((election) => {
      const program = programById.get(election.programId) as { id: string; category: string; planName: string; rates: any } | undefined;
      if (!program) return [];
      const premium = tierRate(program, election.tier, renewal);
      const months = monthsOfService(person.hireDate, billingMonth);
      const split = premium === null
        ? { employer: null, employee: null, warning: `No ${renewal ? "renewal" : "current"} rate for ${program.planName}, ${election.tier}.` }
        : employerShare(premium, program.category, months, bandsByCompany.get(person.companyId) ?? []);
      if (split.warning) warnings.push(`${person.fullName}: ${split.warning}`);
      return [{
        programId: program.id,
        programName: program.planName,
        category: program.category,
        tier: election.tier,
        premium,
        employer: split.employer,
        employee: split.employee,
        warning: split.warning,
      }];
    });
    const sum = (key: "premium" | "employer" | "employee") => cents(elected.reduce((total, row) => total + (row[key] ?? 0), 0));
    return {
      participantId: person.id,
      fullName: person.fullName,
      hireDate: String(person.hireDate).slice(0, 10),
      serviceMonths: monthsOfService(person.hireDate, billingMonth),
      companyId: person.companyId,
      companyName: person.companyName,
      paysCarrier: person.paysCarrier,
      elections: elected,
      premium: sum("premium"),
      employer: sum("employer"),
      employee: sum("employee"),
    };
  });

  if (lines.length === 0) warnings.push("No employees are covered for this month.");
  if (lines.some((line) => line.elections.length === 0)) warnings.push("One or more employees have no program selected.");

  const companyRows = (companies.rows as { id: string; name: string; billingEmail: string | null; paysCarrier: boolean }[]).map((company) => {
    const members = lines.filter((line) => line.companyId === company.id);
    return {
      companyId: company.id,
      companyName: company.name,
      billingEmail: company.billingEmail,
      paysCarrier: company.paysCarrier,
      premium: cents(members.reduce((total, line) => total + line.premium, 0)),
      employer: cents(members.reduce((total, line) => total + line.employer, 0)),
      employee: cents(members.reduce((total, line) => total + line.employee, 0)),
      participants: members,
    };
  });

  const ready = warnings.length === 0 && lines.every((line) => line.elections.length > 0 && line.elections.every((row) => row.warning === null && row.premium !== null));
  return {
    month: billingMonth,
    providerName: provider.name,
    rateBasis: renewal ? "renewal" : "current",
    ready,
    warnings: Array.from(new Set(warnings)),
    companies: companyRows,
    total: cents(lines.reduce((sum, line) => sum + line.premium, 0)),
    employer: cents(lines.reduce((sum, line) => sum + line.employer, 0)),
    employee: cents(lines.reduce((sum, line) => sum + line.employee, 0)),
  };
}

router.get("/healthcare", isAdmin, async (_req, res) => {
  try {
    await ensureAccountingTables();
    const companies = await db.execute(sql`
      SELECT id, name, legal_name as "legalName", notes, sort_order as "sortOrder",
             billing_email as "billingEmail", pays_carrier as "paysCarrier"
      FROM accounting_companies
      ORDER BY sort_order, name
    `);
    const providers = await db.execute(sql`
      SELECT id, name, group_number as "groupNumber", policy_holder as "policyHolder",
             plan_year_start as "planYearStart", rate_guarantee_through as "rateGuaranteeThrough",
             bill_request_email as "billRequestEmail",
             is_current as "isCurrent", notes
      FROM accounting_benefit_providers
      ORDER BY is_current DESC, name
    `);
    const programs = await db.execute(sql`
      SELECT id, provider_id as "providerId", category, plan_code as "planCode",
             plan_name as "planName", network, benefits, rates, notes, sort_order as "sortOrder"
      FROM accounting_benefit_programs
      WHERE active = true
      ORDER BY sort_order, plan_name
    `);
    const bills = await db.execute(sql`
      SELECT b.id, b.provider_id as "providerId", b.program_id as "programId",
             b.billing_month as "billingMonth", b.total_amount as "totalAmount",
             b.allocations, b.original_filename as "originalFilename",
             b.mime_type as "mimeType", b.file_size as "fileSize", b.notes,
             b.created_at as "createdAt",
             p.plan_name as "programName", p.category as "programCategory"
      FROM accounting_benefit_bills b
      LEFT JOIN accounting_benefit_programs p ON p.id = b.program_id
      ORDER BY b.billing_month DESC, b.created_at DESC
    `);

    const participants = await db.execute(sql`
      SELECT id, company_id as "companyId", full_name as "fullName", hire_date as "hireDate",
             coverage_end as "coverageEnd", active
      FROM accounting_participants
      ORDER BY full_name
    `);
    const elections = await db.execute(sql`
      SELECT id, participant_id as "participantId", program_id as "programId", tier
      FROM accounting_participant_elections
    `);
    const contributionRules = await db.execute(sql`
      SELECT id, company_id as "companyId", category, basis, employer_percent as "employerPercent"
      FROM accounting_contribution_rules
    `);
    const contributionBandsResult = await db.execute(sql`
      SELECT id, company_id as "companyId", category, min_months as "minMonths",
             max_months as "maxMonths", employer_amount as "employerAmount"
      FROM accounting_contribution_bands
      ORDER BY category, min_months
    `);
    const accountMappings = await db.execute(sql`
      SELECT id, company_id as "companyId", role, account_name as "accountName", account_type as "accountType"
      FROM accounting_account_mappings
      ORDER BY company_id, role
    `);
    const documents = await db.execute(sql`
      SELECT id, provider_id as "providerId", title, original_filename as "originalFilename",
             mime_type as "mimeType", file_size as "fileSize",
             attach_to_inquiries as "attachToInquiries", created_at as "createdAt"
      FROM accounting_benefit_documents
      ORDER BY created_at DESC
    `);
    const inquiries = await db.execute(sql`
      SELECT id, provider_id as "providerId", full_name as "fullName", email,
             hire_date as "hireDate", event_type as "eventType", event_detail as "eventDetail",
             attachment_names as "attachmentNames", status, email_error as "emailError",
             sent_at as "sentAt", created_at as "createdAt"
      FROM accounting_benefit_inquiries
      ORDER BY created_at DESC
      LIMIT 20
    `);
    const uploadRequests = await db.execute(sql`
      SELECT l.id, l.provider_id as "providerId", l.billing_month as "billingMonth",
             l.recipient_email as "recipientEmail", l.sent_at as "sentAt",
             (
               SELECT b.original_filename
               FROM accounting_benefit_bills b
               WHERE b.provider_id = l.provider_id AND b.billing_month = l.billing_month
               ORDER BY b.created_at DESC
               LIMIT 1
             ) as "uploadedFilename"
      FROM accounting_benefit_upload_links l
      ORDER BY l.billing_month DESC
    `);
    const statements = await db.execute(sql`
      SELECT id, billing_month as "billingMonth", kind, invoice_number as "invoiceNumber",
             recipient_email as "recipientEmail", recipient_name as "recipientName",
             total_amount as "totalAmount", employer_amount as "employerAmount",
             employee_amount as "employeeAmount", line_items as "lineItems",
             status, sent_at as "sentAt", email_error as "emailError"
      FROM accounting_benefit_statements
      ORDER BY billing_month DESC, kind
    `);
    const electionsByParticipant = new Map<string, Record<string, unknown>[]>();
    for (const election of elections.rows as Record<string, unknown>[]) {
      const key = String(election.participantId);
      const list = electionsByParticipant.get(key) ?? [];
      list.push(election);
      electionsByParticipant.set(key, list);
    }

    const programsByProvider = new Map<string, Record<string, unknown>[]>();
    for (const program of programs.rows as Record<string, unknown>[]) {
      const key = String(program.providerId);
      const list = programsByProvider.get(key) ?? [];
      list.push(mapProgram(program));
      programsByProvider.set(key, list);
    }

    res.json({
      companies: companies.rows,
      providers: (providers.rows as Record<string, unknown>[]).map((provider) => ({
        ...mapProvider(provider),
        programs: programsByProvider.get(String(provider.id)) ?? [],
      })),
      bills: bills.rows,
      participants: (participants.rows as Record<string, unknown>[]).map((participant) => ({
        ...participant,
        elections: electionsByParticipant.get(String(participant.id)) ?? [],
      })),
      contributionRules: contributionRules.rows,
      contributionBands: contributionBandsResult.rows,
      accountMappings: accountMappings.rows,
      documents: documents.rows,
      uploadRequests: uploadRequests.rows,
      inquiries: inquiries.rows
      statements: statements.rows,
    });
  } catch (error) {
    console.error("Error loading healthcare allocation:", error);
    res.status(500).json({ message: "Failed to load health care insurance allocation" });
  }
});

router.post("/healthcare/providers", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const name = String(req.body?.name ?? "").trim();
    if (!name) return res.status(400).json({ message: "Provider name is required" });

    const groupNumber = String(req.body?.groupNumber ?? "").trim() || null;
    const policyHolder = String(req.body?.policyHolder ?? "").trim() || null;
    const planYearStart = String(req.body?.planYearStart ?? "").trim() || null;
    const notes = String(req.body?.notes ?? "").trim() || null;

    await db.execute(sql`UPDATE accounting_benefit_providers SET is_current = false, updated_at = now()`);
    const inserted = await db.execute(sql`
      INSERT INTO accounting_benefit_providers (name, group_number, policy_holder, plan_year_start, is_current, notes)
      VALUES (${name}, ${groupNumber}, ${policyHolder}, ${planYearStart}, true, ${notes})
      RETURNING id
    `);
    res.status(201).json({ id: (inserted.rows[0] as { id: string }).id });
  } catch (error) {
    console.error("Error adding benefit provider:", error);
    res.status(500).json({ message: "Failed to add provider" });
  }
});

router.post("/healthcare/programs", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const providerId = String(req.body?.providerId ?? "").trim();
    const planName = String(req.body?.planName ?? "").trim();
    const planCode = String(req.body?.planCode ?? "").trim();
    const category = String(req.body?.category ?? "").trim();
    if (!providerId || !planName || !planCode || !["medical", "dental", "vision"].includes(category)) {
      return res.status(400).json({ message: "Provider, category, plan name, and plan code are required" });
    }
    const network = String(req.body?.network ?? "").trim() || null;
    const notes = String(req.body?.notes ?? "").trim() || null;
    const inserted = await db.execute(sql`
      INSERT INTO accounting_benefit_programs (provider_id, category, plan_code, plan_name, network, notes, sort_order)
      VALUES (${providerId}, ${category}, ${planCode}, ${planName}, ${network}, ${notes}, 100)
      RETURNING id
    `);
    res.status(201).json({ id: (inserted.rows[0] as { id: string }).id });
  } catch (error: any) {
    if (String(error?.message ?? "").includes("uq_accounting_program_code")) {
      return res.status(409).json({ message: "That plan code is already on this provider" });
    }
    console.error("Error adding benefit program:", error);
    res.status(500).json({ message: "Failed to add program" });
  }
});

router.post("/healthcare/bills", isAdmin, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed" });
    try {
      await ensureAccountingTables();
      const file = req.file;
      if (!file) return res.status(400).json({ message: "Choose a bill to upload or scan" });

      const providerId = String(req.body?.providerId ?? "").trim();
      const billingMonth = String(req.body?.billingMonth ?? "").trim();
      if (!providerId || !/^\d{4}-\d{2}$/.test(billingMonth)) {
        return res.status(400).json({ message: "Provider and billing month are required" });
      }

      const programId = String(req.body?.programId ?? "").trim() || null;
      const notes = String(req.body?.notes ?? "").trim() || null;
      const totalRaw = String(req.body?.totalAmount ?? "").trim();
      const totalAmount = totalRaw ? Number(totalRaw) : null;
      if (totalRaw && Number.isNaN(totalAmount)) {
        return res.status(400).json({ message: "Bill total must be a number" });
      }

      let allocations: { companyId: string; amount: number | null }[] = [];
      if (req.body?.allocations) {
        const parsed = JSON.parse(String(req.body.allocations));
        if (Array.isArray(parsed)) {
          allocations = parsed
            .filter((row) => row && typeof row.companyId === "string")
            .map((row) => ({
              companyId: row.companyId,
              amount: row.amount === "" || row.amount === null || row.amount === undefined ? null : Number(row.amount),
            }));
        }
      }

      fs.mkdirSync(billDir, { recursive: true });
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
      const storedFilename = `${randomUUID()}${ext}`;
      fs.writeFileSync(path.join(billDir, storedFilename), file.buffer);

      const uploadedById = (req.session as any)?.platformAuth?.platformUserId ?? null;
      const inserted = await db.execute(sql`
        INSERT INTO accounting_benefit_bills (
          provider_id, program_id, billing_month, total_amount, allocations,
          original_filename, stored_filename, mime_type, file_size, notes, uploaded_by_id
        ) VALUES (
          ${providerId},
          ${programId},
          ${`${billingMonth}-01`},
          ${totalAmount},
          CAST(${JSON.stringify(allocations)} AS jsonb),
          ${file.originalname},
          ${storedFilename},
          ${file.mimetype},
          ${file.size},
          ${notes},
          ${uploadedById}
        )
        RETURNING id
      `);
      res.status(201).json({ id: (inserted.rows[0] as { id: string }).id });
    } catch (error) {
      console.error("Error saving benefit bill:", error);
      res.status(500).json({ message: "Failed to save the bill" });
    }
  });
});

router.get("/healthcare/bills/:id/file", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const result = await db.execute(sql`
      SELECT original_filename as "originalFilename", stored_filename as "storedFilename", mime_type as "mimeType"
      FROM accounting_benefit_bills
      WHERE id = ${req.params.id}
    `);
    const bill = result.rows[0] as { originalFilename: string; storedFilename: string; mimeType: string | null } | undefined;
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const stored = path.basename(bill.storedFilename);
    const fullPath = path.join(billDir, stored);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: "Bill file is missing" });

    const downloadName = bill.originalFilename.replace(/[^\w.\- ()]/g, "_");
    res.setHeader("Content-Type", bill.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${downloadName}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    console.error("Error reading benefit bill:", error);
    res.status(500).json({ message: "Failed to open the bill" });
  }
});

router.delete("/healthcare/bills/:id", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const result = await db.execute(sql`
      DELETE FROM accounting_benefit_bills
      WHERE id = ${req.params.id}
      RETURNING stored_filename as "storedFilename"
    `);
    const bill = result.rows[0] as { storedFilename: string } | undefined;
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    const fullPath = path.join(billDir, path.basename(bill.storedFilename));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting benefit bill:", error);
    res.status(500).json({ message: "Failed to delete the bill" });
  }
});

router.get("/healthcare/allocation", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const billingMonth = String(req.query.month ?? "");
    const providerId = String(req.query.providerId ?? "");
    if (!/^\d{4}-\d{2}$/.test(billingMonth) || !providerId) {
      return res.status(400).json({ message: "Month and provider are required" });
    }
    const allocation = await calculateHealthcareAllocation(billingMonth, providerId);
    const anniversaries = await contributionAnniversaryLedger(billingMonth);
    res.json({ ...allocation, anniversaries });
  } catch (error) {
    console.error("Error calculating healthcare allocation:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to calculate allocation" });
  }
});

router.put("/healthcare/contribution-rules", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const companies = Array.isArray(req.body?.companies) ? req.body.companies : [];
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    for (const company of companies) {
      const email = String(company.billingEmail ?? "").trim();
      if (!company.id) continue;
      await db.execute(sql`
        UPDATE accounting_companies
        SET billing_email = ${email || null}
        WHERE id = ${company.id}
      `);
    }
    for (const rule of rules) {
      const percent = Number(rule.employerPercent);
      const basis = rule.basis === "percent_of_elected" ? "percent_of_elected" : "percent_of_employee_only";
      if (!rule.companyId || !["medical", "dental", "vision"].includes(rule.category) || Number.isNaN(percent) || percent < 0 || percent > 100) {
        return res.status(400).json({ message: "Each contribution needs a company, a benefit, and a percent from 0 to 100." });
      }
      await db.execute(sql`
        INSERT INTO accounting_contribution_rules (company_id, category, basis, employer_percent)
        VALUES (${rule.companyId}, ${rule.category}, ${basis}, ${percent})
        ON CONFLICT (company_id, category) DO UPDATE SET
          basis = EXCLUDED.basis,
          employer_percent = EXCLUDED.employer_percent,
          updated_at = now()
      `);
    }
    const bands = Array.isArray(req.body?.bands) ? req.body.bands : [];
    for (const band of bands) {
      const amount = Number(band.employerAmount);
      const minMonths = Number(band.minMonths);
      const maxMonths = band.maxMonths === null || band.maxMonths === "" ? null : Number(band.maxMonths);
      if (!band.companyId || !["medical", "dental", "vision"].includes(band.category) || Number.isNaN(amount) || amount < 0 || Number.isNaN(minMonths)) {
        return res.status(400).json({ message: "Each contribution band needs a company, a benefit, a starting month, and a monthly amount." });
      }
      await db.execute(sql`
        UPDATE accounting_contribution_bands
        SET employer_amount = ${amount}, max_months = ${maxMonths}, updated_at = now()
        WHERE company_id = ${band.companyId} AND category = ${band.category} AND min_months = ${minMonths}
      `);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("Error saving contribution rules:", error);
    res.status(500).json({ message: "Failed to save contribution rules" });
  }
});

router.put("/healthcare/account-mappings", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const mappings = Array.isArray(req.body?.mappings) ? req.body.mappings : [];
    for (const mapping of mappings) {
      const accountName = String(mapping.accountName ?? "").trim();
      const accountType = mapping.accountType === "expense" ? "expense" : "balance_sheet";
      if (!mapping.companyId || !mapping.role || !accountName) {
        return res.status(400).json({ message: "Each account mapping needs a company, a role, and an account name." });
      }
      await db.execute(sql`
        UPDATE accounting_account_mappings
        SET account_name = ${accountName}, account_type = ${accountType}, updated_at = now()
        WHERE company_id = ${mapping.companyId} AND role = ${mapping.role}
      `);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("Error saving account mappings:", error);
    res.status(500).json({ message: "Failed to save account mappings" });
  }
});

function cleanElections(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row.programId === "string" && typeof row.tier === "string" && row.programId && row.tier)
    .map((row) => ({ programId: String(row.programId), tier: String(row.tier).trim() }));
}

router.post("/healthcare/participants", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const fullName = String(req.body?.fullName ?? "").trim();
    const hireDate = String(req.body?.hireDate ?? "").trim();
    const companyId = String(req.body?.companyId ?? "").trim();
    const coverageEnd = String(req.body?.coverageEnd ?? "").trim() || null;
    const elections = cleanElections(req.body?.elections);
    if (!fullName || !companyId || !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) {
      return res.status(400).json({ message: "Name, company, and hire date are required" });
    }
    if (elections.length === 0) {
      return res.status(400).json({ message: "Select at least one program" });
    }
    const inserted = await db.execute(sql`
      INSERT INTO accounting_participants (company_id, full_name, hire_date, coverage_end)
      VALUES (${companyId}, ${fullName}, ${hireDate}, ${coverageEnd})
      RETURNING id
    `);
    const id = (inserted.rows[0] as { id: string }).id;
    for (const election of elections) {
      await db.execute(sql`
        INSERT INTO accounting_participant_elections (participant_id, program_id, tier)
        VALUES (${id}, ${election.programId}, ${election.tier})
      `);
    }
    res.status(201).json({ id });
  } catch (error) {
    console.error("Error adding participant:", error);
    res.status(500).json({ message: "Failed to add participant" });
  }
});

router.put("/healthcare/participants/:id", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const fullName = String(req.body?.fullName ?? "").trim();
    const hireDate = String(req.body?.hireDate ?? "").trim();
    const companyId = String(req.body?.companyId ?? "").trim();
    const coverageEnd = String(req.body?.coverageEnd ?? "").trim() || null;
    const elections = cleanElections(req.body?.elections);
    if (!fullName || !companyId || !/^\d{4}-\d{2}-\d{2}$/.test(hireDate) || elections.length === 0) {
      return res.status(400).json({ message: "Name, company, hire date, and at least one program are required" });
    }
    await db.execute(sql`
      UPDATE accounting_participants
      SET company_id = ${companyId}, full_name = ${fullName}, hire_date = ${hireDate},
          coverage_end = ${coverageEnd}, updated_at = now()
      WHERE id = ${req.params.id}
    `);
    await db.execute(sql`DELETE FROM accounting_participant_elections WHERE participant_id = ${req.params.id}`);
    for (const election of elections) {
      await db.execute(sql`
        INSERT INTO accounting_participant_elections (participant_id, program_id, tier)
        VALUES (${req.params.id}, ${election.programId}, ${election.tier})
      `);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating participant:", error);
    res.status(500).json({ message: "Failed to update participant" });
  }
});

router.delete("/healthcare/participants/:id", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    await db.execute(sql`DELETE FROM accounting_participants WHERE id = ${req.params.id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting participant:", error);
    res.status(500).json({ message: "Failed to delete participant" });
  }
});

const payrollAnchor = "2026-09-27";
const payPeriodsPerYear = 26;

function paycheckDeduction(monthlyEmployee: number) {
  return cents((monthlyEmployee * 12) / payPeriodsPerYear);
}

router.get("/healthcare/payroll", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const periodEnd = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.periodEnd ?? "")) ? String(req.query.periodEnd) : payrollAnchor;
    const coverageMonth = periodEnd.slice(0, 7);
    const providerResult = await db.execute(sql`
      SELECT id FROM accounting_benefit_providers WHERE is_current = true ORDER BY name LIMIT 1
    `);
    const providerId = (providerResult.rows[0] as { id?: string } | undefined)?.id;
    if (!providerId) return res.status(400).json({ message: "Add the current health insurance provider first." });

    const allocation = await calculateHealthcareAllocation(coverageMonth, providerId);
    const logged = await db.execute(sql`
      SELECT participant_id as "participantId", deduction_amount as "deductionAmount", logged_at as "loggedAt"
      FROM accounting_payroll_deductions
      WHERE period_end = ${periodEnd}::date
    `);
    const loggedByPerson = new Map((logged.rows as { participantId: string; deductionAmount: string; loggedAt: string }[]).map((row) => [row.participantId, row]));
    const lines = allocation.companies.flatMap((company) => company.participants.map((person) => {
      const prior = loggedByPerson.get(person.participantId);
      return {
        participantId: person.participantId,
        fullName: person.fullName,
        companyName: person.companyName,
        monthlyEmployee: person.employee,
        deduction: prior ? Number(prior.deductionAmount) : paycheckDeduction(person.employee),
        loggedAt: prior?.loggedAt ?? null,
      };
    }));
    res.json({
      periodEnd,
      coverageMonth,
      payPeriodsPerYear,
      anchor: payrollAnchor,
      lines,
      warnings: allocation.warnings,
    });
  } catch (error) {
    console.error("Error calculating payroll deductions:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to calculate payroll deductions" });
  }
});

router.post("/healthcare/payroll", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const periodEnd = String(req.body?.periodEnd ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
      return res.status(400).json({ message: "A payroll period end date is required." });
    }
    const coverageMonth = periodEnd.slice(0, 7);
    const providerResult = await db.execute(sql`
      SELECT id FROM accounting_benefit_providers WHERE is_current = true ORDER BY name LIMIT 1
    `);
    const providerId = (providerResult.rows[0] as { id?: string } | undefined)?.id;
    if (!providerId) return res.status(400).json({ message: "Add the current health insurance provider first." });
    const allocation = await calculateHealthcareAllocation(coverageMonth, providerId);
    let count = 0;
    for (const company of allocation.companies) {
      for (const person of company.participants) {
        const deduction = paycheckDeduction(person.employee);
        const employerDeduction = paycheckDeduction(person.employer);
        await db.execute(sql`
          INSERT INTO accounting_payroll_deductions (
            participant_id, period_end, coverage_month, monthly_employee_amount, deduction_amount,
            monthly_employer_amount, employer_deduction
          ) VALUES (
            ${person.participantId}, ${periodEnd}::date, ${monthDate(coverageMonth)}::date, ${person.employee}, ${deduction},
            ${person.employer}, ${employerDeduction}
          )
          ON CONFLICT (participant_id, period_end) DO NOTHING
        `);
        count += 1;
      }
    }
    res.json({ ok: true, count, periodEnd });
  } catch (error) {
    console.error("Error logging payroll deductions:", error);
    res.status(500).json({ message: "Failed to log the payroll deductions" });
  }
});

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function payPeriodEnds(anchor: string, earliest: string) {
  const ends: string[] = [];
  const cursor = new Date(`${anchor}T00:00:00`);
  const floor = new Date(`${earliest}T00:00:00`);
  while (cursor >= floor) {
    ends.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() - 14);
  }
  return ends.reverse();
}

router.get("/healthcare/participants/:id/ledger", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const personResult = await db.execute(sql`
      SELECT id, full_name as "fullName", hire_date as "hireDate", coverage_end as "coverageEnd"
      FROM accounting_participants WHERE id = ${req.params.id}
    `);
    const person = personResult.rows[0] as { id: string; fullName: string; hireDate: string; coverageEnd: string | null } | undefined;
    if (!person) return res.status(404).json({ message: "Employee not found" });

    const providerResult = await db.execute(sql`
      SELECT id, plan_year_start as "planYearStart"
      FROM accounting_benefit_providers WHERE is_current = true ORDER BY name LIMIT 1
    `);
    const provider = providerResult.rows[0] as { id: string; planYearStart: string | null } | undefined;
    if (!provider) return res.status(400).json({ message: "Add the current health insurance provider first." });

    const hireDate = String(person.hireDate).slice(0, 10);
    const planStart = String(provider.planYearStart ?? "2026-05-01").slice(0, 10);
    const earliest = hireDate > planStart ? hireDate : planStart;
    const periods = payPeriodEnds(payrollAnchor, earliest).filter((periodEnd) => {
      if (periodEnd < hireDate) return false;
      if (!person.coverageEnd) return true;
      return String(person.coverageEnd).slice(0, 10) >= periodEnd;
    });

    const months = Array.from(new Set(periods.map((periodEnd) => periodEnd.slice(0, 7))));
    const byMonth = new Map<string, { employer: number; employee: number }>();
    for (const month of months) {
      const allocation = await calculateHealthcareAllocation(month, provider.id);
      const match = allocation.companies.flatMap((company) => company.participants).find((row) => row.participantId === person.id);
      if (match) byMonth.set(month, { employer: match.employer, employee: match.employee });
    }

    const existing = await db.execute(sql`
      SELECT period_end as "periodEnd"
      FROM accounting_payroll_deductions
      WHERE participant_id = ${person.id}
    `);
    const saved = new Set((existing.rows as { periodEnd: string }[]).map((row) => String(row.periodEnd).slice(0, 10)));

    const lines = periods.flatMap((periodEnd) => {
      const amounts = byMonth.get(periodEnd.slice(0, 7));
      if (!amounts) return [];
      const employeePay = paycheckDeduction(amounts.employee);
      const employerPay = paycheckDeduction(amounts.employer);
      return [{
        periodEnd,
        coverageMonth: periodEnd.slice(0, 7),
        monthlyEmployer: amounts.employer,
        monthlyEmployee: amounts.employee,
        employerPay,
        employeePay,
        recorded: saved.has(periodEnd),
      }];
    });

    for (const line of lines) {
      if (line.recorded) continue;
      await db.execute(sql`
        INSERT INTO accounting_payroll_deductions (
          participant_id, period_end, coverage_month, monthly_employee_amount, deduction_amount,
          monthly_employer_amount, employer_deduction
        ) VALUES (
          ${person.id}, ${line.periodEnd}::date, ${monthDate(line.coverageMonth)}::date,
          ${line.monthlyEmployee}, ${line.employeePay}, ${line.monthlyEmployer}, ${line.employerPay}
        )
        ON CONFLICT (participant_id, period_end) DO NOTHING
      `);
    }

    res.json({
      participantId: person.id,
      fullName: person.fullName,
      hireDate,
      planYearStart: planStart,
      anchor: payrollAnchor,
      payPeriodsPerYear,
      lines: lines.slice().reverse(),
    });
  } catch (error) {
    console.error("Error building contribution ledger:", error);
    res.status(500).json({ message: "Failed to build the contribution ledger" });
  }
});

function monthLabel(billingMonth: string) {
  const [year, month] = billingMonth.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function statementHtml(title: string, intro: string, rows: AllocationLine[], total: number, employer: number, employee: number, accountLines: { accountName: string; amount: number }[] = []) {
  const body = rows.map((row) => {
    const plans = row.elections.map((election) => `${esc(election.programName)} (${esc(election.tier)})`).join("<br>");
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${esc(row.fullName)}<br><span style="color:#666;font-size:12px;">Hired ${esc(row.hireDate)}</span></td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${plans}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${moneyText(row.premium)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${moneyText(row.employer)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${moneyText(row.employee)}</td>
    </tr>`;
  }).join("");
  return `<div style="font-family:Georgia,serif;color:#222;max-width:760px;">
    <h2 style="margin-bottom:4px;">${esc(title)}</h2>
    <p>${intro}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="text-align:left;background:#f6f3ee;">
        <th style="padding:8px;">Employee</th><th style="padding:8px;">Programs</th>
        <th style="padding:8px;text-align:right;">Premium</th>
        <th style="padding:8px;text-align:right;">Employer</th>
        <th style="padding:8px;text-align:right;">Employee</th>
      </tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:8px;font-weight:bold;">Total</td>
        <td style="padding:8px;text-align:right;font-weight:bold;">${moneyText(total)}</td>
        <td style="padding:8px;text-align:right;font-weight:bold;">${moneyText(employer)}</td>
        <td style="padding:8px;text-align:right;font-weight:bold;">${moneyText(employee)}</td>
      </tr></tfoot>
    </table>
    ${accountLines.length ? `<h3 style="margin-top:24px;">Bill lines</h3><p>The bill total posts to general Accounts Payable. Code each line to the account shown.</p><table style="width:100%;border-collapse:collapse;font-size:14px;"><tbody>${accountLines.map((line) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e5e5;">${esc(line.accountName)}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${moneyText(line.amount)}</td></tr>`).join("")}</tbody></table>` : ""}
  </div>`;
}

async function sendStatementEmail(to: string, subject: string, html: string, text: string, attachments?: { filename: string; type: string; content: string }[]) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("Email is not configured");
  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL || "email@nashobawinery.com",
    subject,
    html,
    text,
    attachments: attachments?.length
      ? attachments.map((file) => ({ content: file.content, filename: file.filename, type: file.type, disposition: "attachment" as const }))
      : undefined,
  });
}

router.post("/healthcare/statements", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const billingMonth = String(req.body?.billingMonth ?? "");
    const providerId = String(req.body?.providerId ?? "");
    if (!/^\d{4}-\d{2}$/.test(billingMonth) || !providerId) {
      return res.status(400).json({ message: "Month and provider are required" });
    }
    const allocation = await calculateHealthcareAllocation(billingMonth, providerId);
    if (!allocation.ready) {
      return res.status(400).json({ message: allocation.warnings[0] || "Allocation is not ready to send", warnings: allocation.warnings });
    }

    const billFile = await db.execute(sql`
      SELECT original_filename as "originalFilename", stored_filename as "storedFilename", mime_type as "mimeType"
      FROM accounting_benefit_bills
      WHERE provider_id = ${providerId} AND billing_month = ${monthDate(billingMonth)}::date
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const uploaded = billFile.rows[0] as { originalFilename: string; storedFilename: string; mimeType: string | null } | undefined;
    let attachment: { filename: string; type: string; content: string } | undefined;
    if (uploaded) {
      const fullPath = path.join(billDir, path.basename(uploaded.storedFilename));
      if (fs.existsSync(fullPath)) {
        attachment = {
          filename: uploaded.originalFilename,
          type: uploaded.mimeType || "application/octet-stream",
          content: fs.readFileSync(fullPath).toString("base64"),
        };
      }
    }

    const label = monthLabel(billingMonth);
    const stamp = billingMonth.replace("-", "");
    const saved = [];
    const payer = allocation.companies.find((company) => company.paysCarrier);
    const billed = allocation.companies.filter((company) => !company.paysCarrier && company.participants.length > 0);

    const documents: {
      kind: string;
      invoiceNumber: string;
      email: string;
      name: string;
      rows: AllocationLine[];
      total: number;
      employer: number;
      employee: number;
      subject: string;
      intro: string;
      attach: boolean;
      accountLines: { accountName: string; amount: number }[];
    }[] = [];
    const mappingRows = await db.execute(sql`
      SELECT company_id as "companyId", role, account_name as "accountName"
      FROM accounting_account_mappings
    `);
    const accountName = (companyId: string, role: string, fallback: string) => {
      const match = (mappingRows.rows as { companyId: string; role: string; accountName: string }[]).find((row) => row.companyId === companyId && row.role === role);
      return match?.accountName || fallback;
    };

    if (!payer?.billingEmail) {
      return res.status(400).json({ message: "Nashoba Valley needs a billing email before the carrier bill can be sent." });
    }
    documents.push({
      kind: "carrier_payment",
      invoiceNumber: `NV-BEN-${stamp}`,
      email: payer.billingEmail,
      name: payer.companyName,
      rows: allocation.companies.flatMap((company) => company.participants),
      total: allocation.total,
      employer: allocation.employer,
      employee: allocation.employee,
      subject: `${allocation.providerName} bill for ${label} — pay in full`,
      intro: `Please pay the full ${moneyText(allocation.total)} ${esc(allocation.providerName)} bill for ${label}. The bill total posts to general Accounts Payable. Split the lines below.`,
      attach: true,
      accountLines: [
        { accountName: accountName(payer.companyId, "employee_contribution", "Employee Contribution to Health"), amount: payer.employee },
        { accountName: accountName(payer.companyId, "employer_expense", "Health Care Expense"), amount: payer.employer },
        ...billed.map((company) => ({
          accountName: accountName(payer.companyId, "intercompany_receivable", "Accounts Receivable - Gables Healthcare Reimbursement"),
          amount: company.premium,
        })),
      ],
    });

    for (const company of billed) {
      if (!company.billingEmail) {
        return res.status(400).json({ message: `${company.companyName} needs a billing email before its invoice can be sent.` });
      }
      documents.push({
        kind: `intercompany:${company.companyId}`,
        invoiceNumber: `NV-GBL-${stamp}`,
        email: company.billingEmail,
        name: company.companyName,
        rows: company.participants,
        total: company.premium,
        employer: company.employer,
        employee: company.employee,
        subject: `Nashoba Valley health insurance invoice for ${label}`,
        intro: `Nashoba Valley pays ${allocation.providerName} for the shared policy and bills ${esc(company.companyName)} ${moneyText(company.premium)} for its employees. The bill total posts to general Accounts Payable. Split the lines below.`,
        attach: false,
        accountLines: [
          { accountName: accountName(company.companyId, "employee_contribution", "Employee Contribution to Health"), amount: company.employee },
          { accountName: accountName(company.companyId, "employer_expense", "Health Care Expense"), amount: company.employer },
        ],
      });
    }

    for (const document of documents) {
      const html = statementHtml(document.subject, document.intro, document.rows, document.total, document.employer, document.employee, document.accountLines);
      const text = `${document.subject}\nAmount due ${moneyText(document.total)}. Employer ${moneyText(document.employer)}. Employee ${moneyText(document.employee)}.`;
      const recorded = await db.execute(sql`
        INSERT INTO accounting_benefit_statements (
          provider_id, billing_month, kind, invoice_number, recipient_email, recipient_name,
          total_amount, employer_amount, employee_amount, line_items, status
        ) VALUES (
          ${providerId}, ${monthDate(billingMonth)}::date, ${document.kind}, ${document.invoiceNumber},
          ${document.email}, ${document.name}, ${document.total}, ${document.employer}, ${document.employee},
          CAST(${JSON.stringify(document.rows)} AS jsonb), 'recorded'
        )
        ON CONFLICT (billing_month, kind) DO UPDATE SET
          provider_id = EXCLUDED.provider_id,
          recipient_email = EXCLUDED.recipient_email,
          recipient_name = EXCLUDED.recipient_name,
          total_amount = EXCLUDED.total_amount,
          employer_amount = EXCLUDED.employer_amount,
          employee_amount = EXCLUDED.employee_amount,
          line_items = EXCLUDED.line_items,
          status = 'recorded',
          email_error = NULL,
          updated_at = now()
        RETURNING id
      `);
      const id = (recorded.rows[0] as { id: string }).id;
      try {
        await sendStatementEmail(document.email, document.subject, html, text, document.attach && attachment ? [attachment] : undefined);
        await db.execute(sql`
          UPDATE accounting_benefit_statements
          SET status = 'sent', sent_at = now(), email_error = NULL, updated_at = now()
          WHERE id = ${id}
        `);
        saved.push({ id, invoiceNumber: document.invoiceNumber, email: document.email, status: "sent" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Email failed";
        await db.execute(sql`
          UPDATE accounting_benefit_statements
          SET status = 'failed', email_error = ${message}, updated_at = now()
          WHERE id = ${id}
        `);
        saved.push({ id, invoiceNumber: document.invoiceNumber, email: document.email, status: "failed", error: message });
      }
    }

    res.json({ statements: saved });
  } catch (error) {
    console.error("Error recording healthcare statements:", error);
    res.status(500).json({ message: "Failed to record the bill and invoice" });
  }
});

function shiftMonth(billingMonth: string, delta: number) {
  const [year, month] = billingMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function firstContributionMonth(hireDate: string) {
  const start = String(hireDate).slice(0, 7);
  for (let i = 0; i < 240; i += 1) {
    const month = shiftMonth(start, i);
    if (monthsOfService(hireDate, month) >= 3) return month;
  }
  return shiftMonth(start, 3);
}

function upcomingCoverageMonth(today = new Date()) {
  const date = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

type EnrollmentRequest = {
  fullName: string;
  email: string;
  hireDate: string;
  eventType: string;
  eventDetail: string;
};

export async function buildEnrollmentPacket(providerId: string, request: EnrollmentRequest) {
  const providerResult = await db.execute(sql`
    SELECT id, name, group_number as "groupNumber", policy_holder as "policyHolder",
           plan_year_start as "planYearStart", rate_guarantee_through as "rateGuaranteeThrough"
    FROM accounting_benefit_providers WHERE id = ${providerId}
  `);
  const provider = providerResult.rows[0] as {
    id: string; name: string; groupNumber: string | null; policyHolder: string | null;
    planYearStart: string | null; rateGuaranteeThrough: string | null;
  } | undefined;
  if (!provider) throw new Error("Provider not found");

  const company = await db.execute(sql`SELECT id FROM accounting_companies ORDER BY sort_order, name LIMIT 1`);
  const companyId = (company.rows[0] as { id?: string } | undefined)?.id;
  const bandsResult = await db.execute(sql`
    SELECT category, min_months as "minMonths", max_months as "maxMonths", employer_amount as "employerAmount"
    FROM accounting_contribution_bands
    WHERE company_id = ${companyId}
  `);
  const bands = (bandsResult.rows as { category: string; minMonths: number; maxMonths: number | null; employerAmount: string }[]).map((band) => ({
    category: band.category,
    minMonths: Number(band.minMonths),
    maxMonths: band.maxMonths === null ? null : Number(band.maxMonths),
    employerAmount: Number(band.employerAmount),
  }));
  const programsResult = await db.execute(sql`
    SELECT category, plan_name as "planName", rates
    FROM accounting_benefit_programs
    WHERE provider_id = ${providerId} AND active = true
    ORDER BY sort_order, plan_name
  `);

  const hireDate = request.hireDate.slice(0, 10);
  const contributionMonth = firstContributionMonth(hireDate);
  const nextMonth = upcomingCoverageMonth();
  const asOfMonth = contributionMonth > nextMonth ? contributionMonth : nextMonth;
  const serviceMonths = monthsOfService(hireDate, asOfMonth);
  const renewal = usesRenewalRates(asOfMonth, provider.planYearStart);
  const contributionStarted = contributionMonth <= nextMonth;

  const plans = (programsResult.rows as { category: string; planName: string; rates: any }[]).map((program) => {
    const tiers = (program.rates?.tiers ?? []).flatMap((row: { tier: string }) => {
      const premium = tierRate(program, row.tier, renewal);
      if (premium === null) return [];
      const split = employerShare(premium, program.category, serviceMonths, bands);
      return [{ tier: row.tier, premium, employer: split.employer ?? 0, employee: split.employee ?? premium }];
    });
    return { category: program.category, planName: program.planName, tiers };
  }).filter((program) => program.tiers.length > 0);

  const contributionFor = (category: string) => {
    const sample = plans.find((program) => program.category === category)?.tiers[0];
    return sample ? sample.employer : 0;
  };

  const eventSentence = request.eventType === "annual"
    ? `This packet is for annual enrollment. The plan year runs ${monthLabel(String(provider.planYearStart ?? "2026-05").slice(0, 7))} through ${monthLabel(String(provider.rateGuaranteeThrough ?? "2027-04").slice(0, 7))}.`
    : request.eventType === "qualifying_event"
      ? `This packet is for this enrollment event: ${request.eventDetail.trim()}.`
      : contributionStarted
        ? `This packet is for your new-hire enrollment. You already have enough service for the company contribution.`
        : `This packet is for your new-hire enrollment. Sign up so coverage is in place for ${monthLabel(contributionMonth)}.`;

  const tenureSentence = contributionStarted
    ? `You were hired ${hireDate}. As of ${monthLabel(asOfMonth)} you have ${serviceMonths} completed months of service. A hire date after the 1st does not count as a full month.`
    : `You were hired ${hireDate}. The company contribution for medical and dental begins ${monthLabel(contributionMonth)}, the first coverage month with 3 completed months of service. Until then you may enroll and you pay the full premium. A hire date after the 1st does not count as a full month.`;

  const paragraphs = [
    `Hello ${request.fullName.trim()},`,
    eventSentence,
    tenureSentence,
    `For ${monthLabel(asOfMonth)} the company pays ${moneyText(contributionFor("medical"))} toward medical, ${moneyText(contributionFor("dental"))} toward dental, and ${moneyText(contributionFor("vision"))} toward vision. You pay the rest of the premium for the plan and tier you choose. The company contribution is a flat monthly amount, and it is recalculated each coverage month from your hire date.`,
    `${provider.name} group ${provider.groupNumber ?? "1481121"}, policy holder ${provider.policyHolder ?? "Nashoba Valley Spirits LTD"}. The attached documents describe the plans. This note is not an enrollment form.`,
  ];

  const subject = `${provider.name} enrollment information`;
  const planRows = plans.map((program) => {
    const body = program.tiers.map((tier) => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;">${esc(tier.tier)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;">${moneyText(tier.premium)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;">${moneyText(tier.employer)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;">${moneyText(tier.employee)}</td>
    </tr>`).join("");
    return `<h3 style="margin:20px 0 8px;">${esc(program.planName)}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead><tr style="text-align:left;background:#f6f3ee;">
          <th style="padding:6px 8px;">Tier</th>
          <th style="padding:6px 8px;text-align:right;">Premium</th>
          <th style="padding:6px 8px;text-align:right;">Company pays</th>
          <th style="padding:6px 8px;text-align:right;">You pay</th>
        </tr></thead><tbody>${body}</tbody>
      </table>`;
  }).join("");
  const html = `<div style="font-family:Georgia,serif;color:#222;max-width:720px;">
    ${paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
    ${planRows}
  </div>`;
  const text = [
    ...paragraphs,
    "",
    ...plans.flatMap((program) => [
      program.planName,
      ...program.tiers.map((tier) => `${tier.tier}: premium ${moneyText(tier.premium)}, company ${moneyText(tier.employer)}, you pay ${moneyText(tier.employee)}`),
    ]),
  ].join("\n");

  return {
    subject,
    paragraphs,
    html,
    text,
    asOfMonth,
    serviceMonths,
    contributionMonth,
    contributionStarted,
    plans,
  };
}

function readEnrollmentRequest(body: Record<string, unknown>) {
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const hireDate = String(body.hireDate ?? "").trim();
  const eventType = String(body.eventType ?? "new_hire").trim();
  const eventDetail = String(body.eventDetail ?? "").trim();
  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) {
    return { error: "Name, a valid email address, and hire date are required." };
  }
  if (!["new_hire", "annual", "qualifying_event"].includes(eventType)) {
    return { error: "Choose a new hire, annual enrollment, or a qualifying event." };
  }
  if (eventType === "qualifying_event" && !eventDetail) {
    return { error: "Describe the enrollment event." };
  }
  return { request: { fullName, email, hireDate, eventType, eventDetail } };
}

router.post("/healthcare/documents", isAdmin, (req, res) => {
  documentUpload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed" });
    try {
      await ensureAccountingTables();
      const file = req.file;
      const providerId = String(req.body?.providerId ?? "").trim();
      if (!file || !providerId) return res.status(400).json({ message: "Choose a document and a provider." });
      const title = String(req.body?.title ?? "").trim() || path.basename(file.originalname, path.extname(file.originalname));
      const inserted = await db.execute(sql`
        INSERT INTO accounting_benefit_documents (
          provider_id, title, original_filename, mime_type, file_size, file_data
        ) VALUES (
          ${providerId}, ${title}, ${file.originalname}, ${file.mimetype}, ${file.size},
          decode(${file.buffer.toString("base64")}, 'base64')
        )
        RETURNING id
      `);
      res.status(201).json({ id: (inserted.rows[0] as { id: string }).id });
    } catch (error) {
      console.error("Error saving benefit document:", error);
      res.status(500).json({ message: "Failed to save the document" });
    }
  });
});

router.get("/healthcare/documents/:id/file", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const result = await db.execute(sql`
      SELECT original_filename as "originalFilename", mime_type as "mimeType",
             encode(file_data, 'base64') as "fileData"
      FROM accounting_benefit_documents
      WHERE id = ${req.params.id}
    `);
    const document = result.rows[0] as { originalFilename: string; mimeType: string | null; fileData: string } | undefined;
    if (!document) return res.status(404).json({ message: "Document not found" });
    const downloadName = document.originalFilename.replace(/[^\w.\- ()]/g, "_");
    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${downloadName}"`);
    res.send(Buffer.from(document.fileData, "base64"));
  } catch (error) {
    console.error("Error reading benefit document:", error);
    res.status(500).json({ message: "Failed to open the document" });
  }
});

router.put("/healthcare/documents/:id", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const attach = Boolean(req.body?.attachToInquiries);
    const result = await db.execute(sql`
      UPDATE accounting_benefit_documents
      SET attach_to_inquiries = ${attach}
      WHERE id = ${req.params.id}
      RETURNING id
    `);
    if (!result.rows[0]) return res.status(404).json({ message: "Document not found" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating benefit document:", error);
    res.status(500).json({ message: "Failed to update the document" });
  }
});

router.delete("/healthcare/documents/:id", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const result = await db.execute(sql`
      DELETE FROM accounting_benefit_documents WHERE id = ${req.params.id} RETURNING id
    `);
    if (!result.rows[0]) return res.status(404).json({ message: "Document not found" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting benefit document:", error);
    res.status(500).json({ message: "Failed to delete the document" });
  }
});

router.post("/healthcare/enrollment-preview", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const parsed = readEnrollmentRequest(req.body ?? {});
    if ("error" in parsed) return res.status(400).json({ message: parsed.error });
    const providerId = String(req.body?.providerId ?? "").trim();
    if (!providerId) return res.status(400).json({ message: "Provider is required" });
    const packet = await buildEnrollmentPacket(providerId, parsed.request);
    const files = await db.execute(sql`
      SELECT title, original_filename as "originalFilename"
      FROM accounting_benefit_documents
      WHERE provider_id = ${providerId} AND attach_to_inquiries = true
      ORDER BY created_at
    `);
    res.json({
      subject: packet.subject,
      paragraphs: packet.paragraphs,
      asOfMonth: packet.asOfMonth,
      serviceMonths: packet.serviceMonths,
      contributionMonth: packet.contributionMonth,
      plans: packet.plans,
      attachments: files.rows,
    });
  } catch (error) {
    console.error("Error previewing enrollment email:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to preview the email" });
  }
});

router.post("/healthcare/enrollment-inquiries", isAdmin, async (req, res) => {
  try {
    await ensureAccountingTables();
    const parsed = readEnrollmentRequest(req.body ?? {});
    if ("error" in parsed) return res.status(400).json({ message: parsed.error });
    const providerId = String(req.body?.providerId ?? "").trim();
    if (!providerId) return res.status(400).json({ message: "Provider is required" });
    const files = await db.execute(sql`
      SELECT title, original_filename as "originalFilename", mime_type as "mimeType",
             encode(file_data, 'base64') as "fileData"
      FROM accounting_benefit_documents
      WHERE provider_id = ${providerId} AND attach_to_inquiries = true
      ORDER BY created_at
    `);
    const attachments = files.rows as { title: string; originalFilename: string; mimeType: string | null; fileData: string }[];
    if (attachments.length === 0) {
      return res.status(400).json({ message: "Upload a UnitedHealthcare document and leave it marked to attach." });
    }
    const packet = await buildEnrollmentPacket(providerId, parsed.request);
    const names = attachments.map((file) => file.originalFilename);
    const recorded = await db.execute(sql`
      INSERT INTO accounting_benefit_inquiries (
        provider_id, full_name, email, hire_date, event_type, event_detail, attachment_names, explanation, status
      ) VALUES (
        ${providerId}, ${parsed.request.fullName}, ${parsed.request.email}, ${parsed.request.hireDate}::date,
        ${parsed.request.eventType}, ${parsed.request.eventDetail || null},
        CAST(${JSON.stringify(names)} AS jsonb), ${packet.text}, 'recorded'
      )
      RETURNING id
    `);
    const id = (recorded.rows[0] as { id: string }).id;
    try {
      await sendStatementEmail(
        parsed.request.email,
        packet.subject,
        packet.html,
        packet.text,
        attachments.map((file) => ({
          filename: file.originalFilename,
          type: file.mimeType || "application/octet-stream",
          content: file.fileData,
        })),
      );
      await db.execute(sql`
        UPDATE accounting_benefit_inquiries
        SET status = 'sent', sent_at = now(), email_error = NULL
        WHERE id = ${id}
      `);
      res.json({ id, status: "sent" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email failed";
      await db.execute(sql`
        UPDATE accounting_benefit_inquiries SET status = 'failed', email_error = ${message} WHERE id = ${id}
      `);
      res.status(502).json({ message });
    }
  } catch (error) {
    console.error("Error sending enrollment email:", error);
    res.status(500).json({ message: "Failed to send the enrollment email" });
  }
});

function portalBaseUrl() {
  if (process.env.NODE_ENV === "production") return "https://nashobawinery.org";
  return process.env.APP_URL || "https://nashobawinery.org";
}

async function billUploadLinkForMonth(billingMonth: string, recipientOverride?: string) {
  await ensureAccountingTables();
  const providerResult = await db.execute(sql`
    SELECT id, name, bill_request_email as "billRequestEmail"
    FROM accounting_benefit_providers WHERE is_current = true ORDER BY name LIMIT 1
  `);
  const provider = providerResult.rows[0] as { id: string; name: string; billRequestEmail: string | null } | undefined;
  if (!provider) throw new Error("Add the current health insurance provider first.");
  const recipient = (recipientOverride || provider.billRequestEmail || "aparrow@nashobawinery.com").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("Enter a valid email address for the invoice request.");
  await db.execute(sql`
    UPDATE accounting_benefit_providers SET bill_request_email = ${recipient} WHERE id = ${provider.id}
  `);

  const existing = await db.execute(sql`
    SELECT token FROM accounting_benefit_upload_links
    WHERE provider_id = ${provider.id} AND billing_month = ${monthDate(billingMonth)}::date AND expires_at > now()
  `);
  let token = (existing.rows[0] as { token?: string } | undefined)?.token;
  if (!token) {
    token = randomBytes(24).toString("hex");
    await db.execute(sql`
      INSERT INTO accounting_benefit_upload_links (provider_id, billing_month, token, recipient_email, expires_at)
      VALUES (
        ${provider.id}, ${monthDate(billingMonth)}::date, ${token}, ${recipient}, now() + interval '45 days'
      )
      ON CONFLICT (provider_id, billing_month) DO UPDATE SET
        token = EXCLUDED.token,
        recipient_email = EXCLUDED.recipient_email,
        expires_at = EXCLUDED.expires_at
      RETURNING token
    `);
  }
  const url = `${portalBaseUrl()}/api/accounting/healthcare/bill-upload/${token}`;
  return { provider, recipient, token, url, label: monthLabel(billingMonth) };
}

export async function emailBillUploadLink(billingMonth: string, recipient?: string) {
  const link = await billUploadLinkForMonth(billingMonth, recipient);
  const subject = `Upload the ${link.provider.name} bill for ${link.label}`;
  const ledger = await contributionAnniversaryLedger(billingMonth);
  const ledgerRows = ledger.rows.map((row) => `<tr>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;">${esc(row.fullName)}<br><span style="color:#666;font-size:12px;">${esc(row.companyName)} · hired ${esc(row.hireDate)}</span></td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;">${row.serviceMonths} months<br>Medical ${esc(row.currentMedical)}<br>Dental ${esc(row.currentDental)}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;">${row.nextMonth ? `${esc(monthLabel(row.nextMonth))}<br>${row.nextServiceMonths} months of service<br>Medical ${esc(row.nextMedical ?? "")}<br>Dental ${esc(row.nextDental ?? "")}` : "Highest rate is already in effect"}</td>
  </tr>`).join("");
  const html = `<div style="font-family:Georgia,serif;color:#222;max-width:760px;">
    <p>The ${esc(link.provider.name)} bill for ${esc(link.label)} can be added without signing in.</p>
    <p><a href="${esc(link.url)}">Upload the PDF</a></p>
    <p>The file is saved on Monthly Bills for that month. This link works for 45 days.</p>
    <h3>Contribution anniversaries</h3>
    <p>Dental is a percent of the employee-only premium: 25% from 3 to 59 months, 50% from 60 to 119 months, and 100% at 120 months. Medical is a flat monthly amount at those same anniversaries. Vision stays at $0. A hire date after the 1st does not count as a full month.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="text-align:left;background:#f6f3ee;">
        <th style="padding:6px 8px;">Employee</th>
        <th style="padding:6px 8px;">As of ${esc(link.label)}</th>
        <th style="padding:6px 8px;">Next rate change</th>
      </tr></thead>
      <tbody>${ledgerRows}</tbody>
    </table>
  </div>`;
  const text = [
    `Upload the ${link.provider.name} bill for ${link.label}: ${link.url}`,
    "The file is saved on Monthly Bills. This link works for 45 days.",
    "",
    "Contribution anniversaries",
    "Dental is 25% of the employee-only premium from 3 to 59 months, 50% from 60 to 119 months, and 100% at 120 months. Medical changes to a flat monthly amount at those same anniversaries.",
    ...ledger.rows.map((row) => row.nextMonth
      ? `${row.fullName} (${row.companyName}), hired ${row.hireDate}: ${row.serviceMonths} months, medical ${row.currentMedical}, dental ${row.currentDental}. Next change ${monthLabel(row.nextMonth)} at ${row.nextServiceMonths} months: medical ${row.nextMedical}, dental ${row.nextDental}.`
      : `${row.fullName} (${row.companyName}), hired ${row.hireDate}: ${row.serviceMonths} months, medical ${row.currentMedical}, dental ${row.currentDental}. Highest rate is already in effect.`),
  ].join("\n");
  await sendStatementEmail(link.recipient, subject, html, text);
  await db.execute(sql`
    UPDATE accounting_benefit_upload_links SET sent_at = now(), recipient_email = ${link.recipient}
    WHERE token = ${link.token}
  `);
  return { email: link.recipient, url: link.url, month: billingMonth };
}

export async function sendMonthlyBillUploadLink() {
  const today = new Date();
  if (today.getDate() > 7) return { skipped: true };
  const billingMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  await ensureAccountingTables();
  const already = await db.execute(sql`
    SELECT id FROM accounting_benefit_upload_links
    WHERE billing_month = ${monthDate(billingMonth)}::date AND sent_at IS NOT NULL
    LIMIT 1
  `);
  if (already.rows[0]) return { skipped: true };
  const bill = await db.execute(sql`
    SELECT id FROM accounting_benefit_bills WHERE billing_month = ${monthDate(billingMonth)}::date LIMIT 1
  `);
  if (bill.rows[0]) return { skipped: true };
  return emailBillUploadLink(billingMonth);
}

function uploadPage(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
    <body style="margin:0;font-family:Georgia,serif;background:#f6f3ee;color:#222;">
      <main style="max-width:520px;margin:48px auto;background:#fff;padding:28px;border-radius:12px;">
        <h1 style="font-size:22px;margin-top:0;">${esc(title)}</h1>
        ${body}
      </main>
    </body></html>`;
}

router.get("/healthcare/bill-upload/:token", async (req, res) => {
  try {
    await ensureAccountingTables();
    const link = await db.execute(sql`
      SELECT billing_month as "billingMonth", p.name as "providerName"
      FROM accounting_benefit_upload_links l
      JOIN accounting_benefit_providers p ON p.id = l.provider_id
      WHERE l.token = ${req.params.token} AND l.expires_at > now()
    `);
    const row = link.rows[0] as { billingMonth: string; providerName: string } | undefined;
    if (!row) {
      res.status(404).type("html").send(uploadPage("Link expired", "<p>This upload link is no longer active. Ask for a new monthly email.</p>"));
      return;
    }
    const label = monthLabel(String(row.billingMonth).slice(0, 7));
    res.type("html").send(uploadPage(`Upload the ${row.providerName} bill`, `
      <p>This file is the ${esc(label)} invoice. It is saved for processing. No sign-in is required.</p>
      <form method="post" enctype="multipart/form-data">
        <input type="file" name="file" accept="application/pdf,image/*" required style="margin:16px 0;">
        <div><button type="submit" style="background:#6b2d3c;color:#fff;border:0;border-radius:8px;padding:10px 16px;">Save bill</button></div>
      </form>
    `));
  } catch (error) {
    console.error("Error opening bill upload link:", error);
    res.status(500).type("html").send(uploadPage("Upload unavailable", "<p>The upload page could not be opened. Try the link again.</p>"));
  }
});

router.post("/healthcare/bill-upload/:token", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      res.status(400).type("html").send(uploadPage("Upload failed", `<p>${esc(err.message || "Upload failed")}</p>`));
      return;
    }
    try {
      await ensureAccountingTables();
      const file = req.file;
      if (!file) {
        res.status(400).type("html").send(uploadPage("Choose a file", "<p>Choose the PDF or a photo of the bill.</p>"));
        return;
      }
      const link = await db.execute(sql`
        SELECT provider_id as "providerId", billing_month as "billingMonth"
        FROM accounting_benefit_upload_links
        WHERE token = ${req.params.token} AND expires_at > now()
      `);
      const row = link.rows[0] as { providerId: string; billingMonth: string } | undefined;
      if (!row) {
        res.status(404).type("html").send(uploadPage("Link expired", "<p>This upload link is no longer active.</p>"));
        return;
      }
      fs.mkdirSync(billDir, { recursive: true });
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
      const storedFilename = `${randomUUID()}${ext}`;
      fs.writeFileSync(path.join(billDir, storedFilename), file.buffer);
      const billingMonth = String(row.billingMonth).slice(0, 10);
      await db.execute(sql`
        INSERT INTO accounting_benefit_bills (
          provider_id, billing_month, allocations, original_filename, stored_filename, mime_type, file_size, notes
        ) VALUES (
          ${row.providerId}, ${billingMonth}::date, '[]'::jsonb, ${file.originalname}, ${storedFilename},
          ${file.mimetype}, ${file.size}, 'Uploaded from the monthly email link'
        )
      `);
      res.type("html").send(uploadPage("Bill saved", `<p>${esc(file.originalname)} is in Monthly Bills for ${esc(monthLabel(billingMonth.slice(0, 7)))}.</p>`));
    } catch (error) {
      console.error("Error saving emailed bill upload:", error);
      res.status(500).type("html").send(uploadPage("Upload failed", "<p>The bill could not be saved. Try the link again.</p>"));
    }
  });
});

router.post("/healthcare/bill-upload-link", isAdmin, async (req, res) => {
  try {
    const billingMonth = String(req.body?.billingMonth ?? "");
    const email = String(req.body?.email ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(billingMonth)) return res.status(400).json({ message: "Billing month is required" });
    res.json(await emailBillUploadLink(billingMonth, email || undefined));
  } catch (error) {
    console.error("Error emailing bill upload link:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to email the upload link" });
  }
});

export function initHealthcareBillUploadReminders() {
  const run = () => {
    sendMonthlyBillUploadLink().catch((error) => console.error("[Healthcare] Monthly upload email failed:", error));
  };
  setTimeout(run, 20_000);
  setInterval(run, 24 * 60 * 60 * 1000);
}

export default router;
