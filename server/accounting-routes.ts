import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
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

const renewalThrough = "2027-04-30";

const unitedPrograms = [
  {
    category: "medical",
    planCode: "NavE2500i100LX21B",
    planName: "Navigate $2,500",
    network: "Navigate",
    sortOrder: 1,
    notes: "Summary of Benefits: SBC_LF_MA_NavE2500i100LX21B_RX4 ADVB, dated 2026-03-15. Premiums are from the 2026 renewal outline. The outline does not list a current family rate or an employee-and-child tier.",
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
    notes: "Summary of Benefits on file is NavE3000i80LX21B ($3,000 deductible, 80% coinsurance). The 2026 renewal outline prices the 80% Navigate plan on a row labeled NavE3500i80LX21B. Employee-and-child and the current family rate are not on that outline.",
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
    notes: "Summary of Benefits: SBC_LF_MA_P3000i100LX21B_RX4 ADVB, dated 2026-03-15. This is the in- and out-of-network medical option. The outline does not list a current family rate.",
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
        { tier: "Family", enrollment: null, current: null, renewal: 2731.42 },
      ],
    },
  },
  {
    category: "dental",
    planCode: "37331",
    planName: "Passive PPO",
    network: "Passive PPO",
    sortOrder: 4,
    notes: "Dental renewal for group 1481121, plan year beginning May 1, 2026. Type 100/80/50/50. Rates are guaranteed for 12 months, through April 30, 2027. The renewal monthly premium of $459.78 is 5.00% above the current $437.89. The employee-and-spouse rates are the amounts that reconcile enrolled counts to those monthly premiums.",
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
        { tier: "Employee", enrollment: 9, current: 39.81, renewal: 41.80 },
        { tier: "Employee & Spouse", enrollment: 1, current: 79.60, renewal: 83.58 },
        { tier: "Employee & Child", enrollment: 0, current: 82.58, renewal: 86.74 },
        { tier: "Employee & Family", enrollment: 0, current: 138.73, renewal: 143.69 },
      ],
    },
  },
  {
    category: "vision",
    planCode: "S1006",
    planName: "Vision S1006",
    network: "UnitedHealthcare Vision",
    sortOrder: 5,
    notes: "Vision renewal for group 1481121, plan S1006, type 12/12/10/8/10/$25/s/$30/$105. Rates are unchanged for the renewal (0.00%) and are guaranteed for 24 months, through April 30, 2027.",
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
        { tier: "Employee", enrollment: 4, current: 6.27, renewal: 6.27 },
        { tier: "Employee & Spouse", enrollment: 2, current: 11.90, renewal: 11.90 },
        { tier: "Employee & Child", enrollment: 0, current: 12.96, renewal: 12.96 },
        { tier: "Employee & Family", enrollment: 0, current: 19.65, renewal: 19.65 },
      ],
    },
  },
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
      ON CONFLICT (provider_id, plan_code) DO NOTHING
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
  `);

  await db.execute(sql`
    UPDATE accounting_companies
    SET billing_email = 'ap@nashobawinery.com', pays_carrier = true
    WHERE name = 'Nashoba Valley' AND billing_email IS NULL
  `);
  await db.execute(sql`
    UPDATE accounting_companies
    SET billing_email = 'gap@gableal.com'
    WHERE name = 'The Gables' AND billing_email IS NULL
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

function splitPremium(premium: number, employeeOnly: number | null, rule: { basis: string; employerPercent: number } | undefined) {
  if (!rule) return { employer: null as number | null, employee: null as number | null, warning: "Set the company contribution for this benefit." };
  const percent = Number(rule.employerPercent) / 100;
  const base = rule.basis === "percent_of_elected" ? premium : (employeeOnly ?? premium);
  const employer = cents(Math.min(premium, base * percent));
  const employee = cents(premium - employer);
  return { employer, employee, warning: null as string | null };
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
  const rules = await db.execute(sql`
    SELECT company_id as "companyId", category, basis, employer_percent as "employerPercent"
    FROM accounting_contribution_rules
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
  const ruleByKey = new Map((rules.rows as { companyId: string; category: string; basis: string; employerPercent: string }[]).map((rule) => [
    `${rule.companyId}:${rule.category}`,
    { basis: rule.basis, employerPercent: Number(rule.employerPercent) },
  ]));
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
      const employeeOnly = tierRate(program, "Employee", renewal);
      const rule = ruleByKey.get(`${person.companyId}:${program.category}`);
      const split = premium === null
        ? { employer: null, employee: null, warning: `No ${renewal ? "renewal" : "current"} rate for ${program.planName}, ${election.tier}.` }
        : splitPremium(premium, employeeOnly, rule);
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
    res.json(await calculateHealthcareAllocation(billingMonth, providerId));
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
    res.json({ ok: true });
  } catch (error) {
    console.error("Error saving contribution rules:", error);
    res.status(500).json({ message: "Failed to save contribution rules" });
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

function monthLabel(billingMonth: string) {
  const [year, month] = billingMonth.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function statementHtml(title: string, intro: string, rows: AllocationLine[], total: number, employer: number, employee: number) {
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
  </div>`;
}

async function sendStatementEmail(to: string, subject: string, html: string, text: string, attachment?: { filename: string; type: string; content: string }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("Email is not configured");
  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL || "email@nashobawinery.com",
    subject,
    html,
    text,
    attachments: attachment ? [{ content: attachment.content, filename: attachment.filename, type: attachment.type, disposition: "attachment" }] : undefined,
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
    }[] = [];

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
      intro: `Please pay the full ${moneyText(allocation.total)} ${esc(allocation.providerName)} bill for ${label}. Nashoba Valley will collect The Gables' share on a separate invoice. Employer contributions are ${moneyText(allocation.employer)} and employee contributions are ${moneyText(allocation.employee)}.`,
      attach: true,
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
        intro: `Nashoba Valley pays ${allocation.providerName} for the shared policy and bills ${esc(company.companyName)} for its employees. Amount due is ${moneyText(company.premium)}, of which ${moneyText(company.employer)} is the employer contribution and ${moneyText(company.employee)} is the employee contribution.`,
        attach: false,
      });
    }

    for (const document of documents) {
      const html = statementHtml(document.subject, document.intro, document.rows, document.total, document.employer, document.employee);
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
        await sendStatementEmail(document.email, document.subject, html, text, document.attach ? attachment : undefined);
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

export default router;
