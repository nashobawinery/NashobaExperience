import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Calculator, Camera, Eye, FileText, HeartPulse, Mail, Pencil, Plus, Smile, Trash2, Upload, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Company = {
  id: string;
  name: string;
  legalName: string | null;
  notes: string | null;
  billingEmail: string | null;
  paysCarrier: boolean;
};

type Election = { id?: string; participantId?: string; programId: string; tier: string };

type Participant = {
  id: string;
  companyId: string;
  fullName: string;
  hireDate: string;
  coverageEnd: string | null;
  active: boolean;
  elections: Election[];
};

type ContributionRule = {
  id: string;
  companyId: string;
  category: string;
  basis: string;
  employerPercent: string;
};

type ContributionBand = {
  id: string;
  companyId: string;
  category: string;
  minMonths: number;
  maxMonths: number | null;
  employerAmount: string;
};

type AccountMapping = {
  id: string;
  companyId: string;
  role: string;
  accountName: string;
  accountType: string;
};

type Statement = {
  id: string;
  billingMonth: string;
  kind: string;
  invoiceNumber: string;
  recipientEmail: string;
  recipientName: string;
  totalAmount: string;
  employerAmount: string;
  employeeAmount: string;
  status: string;
  sentAt: string | null;
  emailError: string | null;
};

type AllocationElection = {
  programName: string;
  category: string;
  tier: string;
  premium: number | null;
  employer: number | null;
  employee: number | null;
  warning: string | null;
};

type AllocationLine = {
  participantId: string;
  serviceMonths?: number;
  premium: number;
  employer: number;
  employee: number;
  elections: AllocationElection[];
};

type AnniversaryRow = {
  fullName: string;
  companyName: string;
  hireDate: string;
  serviceMonths: number;
  currentMedical: string;
  currentDental: string;
  nextMonth: string | null;
  nextServiceMonths: number | null;
  nextMedical: string | null;
  nextDental: string | null;
};

type Allocation = {
  ready: boolean;
  warnings: string[];
  rateBasis: string;
  total: number;
  employer: number;
  employee: number;
  anniversaries?: { rows: AnniversaryRow[] };
  companies: {
    companyId: string;
    companyName: string;
    billingEmail: string | null;
    paysCarrier: boolean;
    premium: number;
    employer: number;
    employee: number;
    participants: AllocationLine[];
  }[];
};

type RateTier = {
  tier: string;
  enrollment: number | null;
  current: number | null;
  renewal: number | null;
};

type ProgramRates = {
  effectiveThrough?: string;
  rateGuarantee?: string;
  changePercent?: number;
  monthlyPremiumCurrent?: number;
  monthlyPremiumRenewal?: number;
  tiers?: RateTier[];
};

type MedicalBenefits = {
  deductibleIn?: string;
  deductibleOut?: string;
  outOfPocketIn?: string;
  outOfPocketOut?: string;
  coinsuranceIn?: string;
  coinsuranceOut?: string;
  copayPcp?: string;
  copaySpecialist?: string;
  pharmacy?: string;
};

type DentalBenefits = {
  planType?: string;
  annualMaxIn?: string;
  annualMaxOut?: string;
  deductibleIndividual?: string;
  deductibleFamily?: string;
  waitingPeriod?: string;
  orthoLifetime?: string;
  services?: { name: string; inNetwork: string; outOfNetwork: string }[];
};

type VisionBenefits = {
  planType?: string;
  examCopay?: string;
  materialsCopay?: string;
  frameAllowance?: string;
  electiveContacts?: string;
  contactFitEval?: string;
  necessaryContacts?: string;
  frequency?: string;
  outOfNetwork?: { name: string; amount: string }[];
};

type Program = {
  id: string;
  providerId: string;
  category: "medical" | "dental" | "vision" | string;
  planCode: string;
  planName: string;
  network: string | null;
  benefits: MedicalBenefits & DentalBenefits & VisionBenefits;
  rates: ProgramRates;
  notes: string | null;
};

type Provider = {
  id: string;
  name: string;
  groupNumber: string | null;
  policyHolder: string | null;
  planYearStart: string | null;
  rateGuaranteeThrough: string | null;
  isCurrent: boolean;
  notes: string | null;
  billRequestEmail: string | null;
  programs: Program[];
};

type BillAllocation = { companyId: string; amount: number | null };

type Bill = {
  id: string;
  providerId: string;
  programId: string | null;
  billingMonth: string;
  totalAmount: string | null;
  allocations: BillAllocation[];
  originalFilename: string;
  mimeType: string | null;
  notes: string | null;
  createdAt: string;
  programName: string | null;
  programCategory: string | null;
};

type BenefitDocument = {
  id: string;
  providerId: string;
  title: string;
  originalFilename: string;
  mimeType: string | null;
  fileSize: number;
  attachToInquiries: boolean;
  createdAt: string;
};

type BenefitInquiry = {
  id: string;
  providerId: string;
  fullName: string;
  email: string;
  hireDate: string;
  eventType: string;
  eventDetail: string | null;
  attachmentNames: string[];
  status: string;
  emailError: string | null;
  sentAt: string | null;
};

type EnrollmentPreview = {
  subject: string;
  paragraphs: string[];
  asOfMonth: string;
  serviceMonths: number;
  contributionMonth: string;
  plans: { category: string; planName: string; tiers: { tier: string; premium: number; employer: number; employee: number }[] }[];
  attachments: { title: string; originalFilename: string }[];
};

type UploadRequest = {
  id: string;
  providerId: string;
  billingMonth: string;
  recipientEmail: string;
  sentAt: string | null;
  uploadedFilename: string | null;
};

type HealthcarePayload = {
  companies: Company[];
  providers: Provider[];
  bills: Bill[];
  participants: Participant[];
  contributionRules: ContributionRule[];
  contributionBands: ContributionBand[];
  accountMappings: AccountMapping[];
  documents: BenefitDocument[];
  uploadRequests: UploadRequest[];
  inquiries: BenefitInquiry[];
  statements: Statement[];
};

const benefitCategories = ["medical", "dental", "vision"] as const;

const categoryLabel: Record<string, string> = {
  medical: "Medical",
  dental: "Dental",
  vision: "Vision",
};

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatMonth(value: string) {
  const [year, month] = value.slice(0, 7).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDay(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function BenefitGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {rows.filter((row) => row.value).map((row) => (
        <div key={row.label}>
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="text-sm font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RateTable({ rates }: { rates: ProgramRates }) {
  const tiers = rates.tiers ?? [];
  if (tiers.length === 0) return null;
  const showEnrollment = tiers.some((tier) => tier.enrollment !== null);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Tier</th>
            {showEnrollment && <th className="py-2 pr-3 font-medium">Enrolled</th>}
            <th className="py-2 pr-3 font-medium">Current</th>
            <th className="py-2 font-medium">Renewal</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => (
            <tr key={tier.tier} className="border-b last:border-0">
              <td className="py-2 pr-3">{tier.tier}</td>
              {showEnrollment && <td className="py-2 pr-3">{tier.enrollment ?? "—"}</td>}
              <td className="py-2 pr-3">{money(tier.current)}</td>
              <td className="py-2">{money(tier.renewal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProgramDetail({ program }: { program: Program }) {
  const benefits = program.benefits;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{categoryLabel[program.category] ?? program.category}</Badge>
        <span className="text-sm text-muted-foreground">Plan {program.planCode}</span>
        {program.network && <span className="text-sm text-muted-foreground">{program.network}</span>}
      </div>

      {program.category === "medical" && (
        <BenefitGrid
          rows={[
            { label: "In-network deductible", value: benefits.deductibleIn ?? "" },
            { label: "Out-of-network deductible", value: benefits.deductibleOut ?? "" },
            { label: "In-network out-of-pocket max", value: benefits.outOfPocketIn ?? "" },
            { label: "Out-of-network out-of-pocket max", value: benefits.outOfPocketOut ?? "" },
            { label: "In-network coinsurance", value: benefits.coinsuranceIn ?? "" },
            { label: "Out-of-network coinsurance", value: benefits.coinsuranceOut ?? "" },
            { label: "Primary care copay", value: benefits.copayPcp ?? "" },
            { label: "Specialist copay", value: benefits.copaySpecialist ?? "" },
            { label: "Pharmacy", value: benefits.pharmacy ?? "" },
          ]}
        />
      )}

      {program.category === "dental" && (
        <div className="space-y-4">
          <BenefitGrid
            rows={[
              { label: "Plan type", value: benefits.planType ?? "" },
              { label: "Annual maximum, in network", value: benefits.annualMaxIn ?? "" },
              { label: "Annual maximum, out of network", value: benefits.annualMaxOut ?? "" },
              { label: "Individual deductible", value: benefits.deductibleIndividual ?? "" },
              { label: "Family deductible", value: benefits.deductibleFamily ?? "" },
              { label: "Waiting period", value: benefits.waitingPeriod ?? "" },
              { label: "Orthodontia lifetime", value: benefits.orthoLifetime ?? "" },
            ]}
          />
          {benefits.services && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Service</th>
                  <th className="py-2 pr-3 font-medium">In network</th>
                  <th className="py-2 font-medium">Out of network</th>
                </tr>
              </thead>
              <tbody>
                {benefits.services.map((service) => (
                  <tr key={service.name} className="border-b last:border-0">
                    <td className="py-2 pr-3">{service.name}</td>
                    <td className="py-2 pr-3">{service.inNetwork}</td>
                    <td className="py-2">{service.outOfNetwork}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {program.category === "vision" && (
        <div className="space-y-4">
          <BenefitGrid
            rows={[
              { label: "Plan type", value: benefits.planType ?? "" },
              { label: "Exam copay", value: benefits.examCopay ?? "" },
              { label: "Materials copay", value: benefits.materialsCopay ?? "" },
              { label: "Frame allowance", value: benefits.frameAllowance ?? "" },
              { label: "Elective contact lens allowance", value: benefits.electiveContacts ?? "" },
              { label: "Contact lens fit and eval", value: benefits.contactFitEval ?? "" },
              { label: "Necessary contact lens", value: benefits.necessaryContacts ?? "" },
              { label: "Frequency", value: benefits.frequency ?? "" },
            ]}
          />
          {benefits.outOfNetwork && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Out-of-network reimbursement</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {benefits.outOfNetwork.map((row) => (
                  <div key={row.name} className="flex justify-between gap-3 text-sm border-b py-1">
                    <dt>{row.name}</dt>
                    <dd className="font-medium">{row.amount}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold">Monthly rates</h3>
          <p className="text-xs text-muted-foreground">
            {program.rates.rateGuarantee ? `${program.rates.rateGuarantee} guarantee · ` : ""}
            Through {formatDay(program.rates.effectiveThrough ?? null)}
            {program.rates.changePercent !== undefined ? ` · ${program.rates.changePercent.toFixed(2)}% change` : ""}
          </p>
        </div>
        {(program.rates.monthlyPremiumCurrent !== undefined || program.rates.monthlyPremiumRenewal !== undefined) && (
          <p className="text-sm mb-3">
            Monthly premium {money(program.rates.monthlyPremiumCurrent)} current, {money(program.rates.monthlyPremiumRenewal)} renewal.
          </p>
        )}
        <RateTable rates={program.rates} />
      </div>

      {program.notes && <p className="text-sm text-muted-foreground">{program.notes}</p>}
    </div>
  );
}

export default function AccountingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<HealthcarePayload>({
    queryKey: ["/api/accounting/healthcare"],
  });

  const providers = data?.providers ?? [];
  const currentProvider = providers.find((provider) => provider.isCurrent) ?? providers[0];
  const [providerId, setProviderId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const selectedProvider = providers.find((provider) => provider.id === (providerId ?? currentProvider?.id)) ?? currentProvider;
  const selectedProgram = selectedProvider?.programs.find((program) => program.id === programId) ?? selectedProvider?.programs[0];

  const [providerOpen, setProviderOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [providerForm, setProviderForm] = useState({ name: "", groupNumber: "", policyHolder: "", planYearStart: "", notes: "" });
  const [programForm, setProgramForm] = useState({ category: "medical", planName: "", planCode: "", network: "", notes: "" });

  const [billingMonth, setBillingMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [periodEnd, setPeriodEnd] = useState("2026-09-27");
  const [billingEmails, setBillingEmails] = useState<Record<string, string>>({});
  const [ruleDraft, setRuleDraft] = useState<Record<string, { basis: string; employerPercent: string }>>({});
  const [bandDraft, setBandDraft] = useState<Record<string, string>>({});
  const [mappingDraft, setMappingDraft] = useState<Record<string, { accountName: string; accountType: string }>>({});
  const [participantOpen, setParticipantOpen] = useState(false);
  const [ledgerParticipantId, setLedgerParticipantId] = useState<string | null>(null);
  const [participantForm, setParticipantForm] = useState({
    id: "",
    fullName: "",
    hireDate: "",
    coverageEnd: "",
    companyId: "",
    elections: {} as Record<string, { programId: string; tier: string }>,
  });
  const [billRequestEmail, setBillRequestEmail] = useState("aparrow@nashobawinery.com");
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [inquiryForm, setInquiryForm] = useState({ fullName: "", email: "", hireDate: "", eventType: "new_hire", eventDetail: "" });
  const [enrollmentPreview, setEnrollmentPreview] = useState<EnrollmentPreview | null>(null);
  const [billProgramId, setBillProgramId] = useState("combined");
  const [billTotal, setBillTotal] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [billFile, setBillFile] = useState<File | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/accounting/healthcare"] });
    queryClient.invalidateQueries({ queryKey: ["/api/accounting/healthcare/allocation"] });
  };

  useEffect(() => {
    if (!data) return;
    const emails: Record<string, string> = {};
    const requestEmail = (data.providers ?? []).find((provider) => provider.isCurrent)?.billRequestEmail
      ?? data.providers?.[0]?.billRequestEmail;
    if (requestEmail) setBillRequestEmail(requestEmail);
    for (const company of data.companies) emails[company.id] = company.billingEmail ?? "";
    const rules: Record<string, { basis: string; employerPercent: string }> = {};
    for (const rule of data.contributionRules) {
      rules[`${rule.companyId}:${rule.category}`] = {
        basis: rule.basis,
        employerPercent: String(rule.employerPercent),
      };
    }
    const firstCompany = data.companies[0]?.id;
    const bands: Record<string, string> = {};
    for (const band of data.contributionBands ?? []) {
      if (band.companyId !== firstCompany) continue;
      bands[`${band.category}:${band.minMonths}`] = String(band.employerAmount);
    }
    const mappings: Record<string, { accountName: string; accountType: string }> = {};
    for (const mapping of data.accountMappings ?? []) {
      mappings[`${mapping.companyId}:${mapping.role}`] = {
        accountName: mapping.accountName,
        accountType: mapping.accountType,
      };
    }
    setBillingEmails(emails);
    setRuleDraft(rules);
    setBandDraft(bands);
    setMappingDraft(mappings);
  }, [data]);

  const { data: payroll } = useQuery<{
    periodEnd: string;
    coverageMonth: string;
    payPeriodsPerYear: number;
    lines: { participantId: string; fullName: string; companyName: string; monthlyEmployee: number; deduction: number; loggedAt: string | null }[];
    warnings: string[];
  }>({
    queryKey: ["/api/accounting/healthcare/payroll", { periodEnd }],
  });

  const logPayroll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/healthcare/payroll", { periodEnd });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/healthcare/payroll"] });
      toast({ title: "Payroll deductions logged", description: `Recorded for the period ending ${periodEnd}.` });
    },
    onError: (err: Error) => toast({ title: "Could not log payroll", description: err.message, variant: "destructive" }),
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery<{
    fullName: string;
    planYearStart: string;
    lines: { periodEnd: string; coverageMonth: string; monthlyEmployer: number; monthlyEmployee: number; employerPay: number; employeePay: number }[];
  }>({
    queryKey: ["/api/accounting/healthcare/participants", ledgerParticipantId, "ledger"],
    enabled: Boolean(ledgerParticipantId),
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounting/healthcare/participants/${ledgerParticipantId}/ledger`);
      return res.json();
    },
  });

  const { data: allocation } = useQuery<Allocation>({
    queryKey: ["/api/accounting/healthcare/allocation", { month: billingMonth, providerId: selectedProvider?.id ?? "" }],
    enabled: Boolean(selectedProvider?.id),
  });

  const addProvider = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/healthcare/providers", providerForm);
      return res.json();
    },
    onSuccess: async (created: { id: string }) => {
      await invalidate();
      setProviderId(created.id);
      setProgramId(null);
      setProviderOpen(false);
      setProviderForm({ name: "", groupNumber: "", policyHolder: "", planYearStart: "", notes: "" });
      toast({ title: "Provider added", description: "It is now the current carrier. Add its programs next." });
    },
    onError: (err: Error) => toast({ title: "Could not add provider", description: err.message, variant: "destructive" }),
  });

  const addProgram = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/healthcare/programs", {
        ...programForm,
        providerId: selectedProvider?.id,
      });
      return res.json();
    },
    onSuccess: async (created: { id: string }) => {
      await invalidate();
      setProgramId(created.id);
      setProgramOpen(false);
      setProgramForm({ category: "medical", planName: "", planCode: "", network: "", notes: "" });
      toast({ title: "Program added" });
    },
    onError: (err: Error) => toast({ title: "Could not add program", description: err.message, variant: "destructive" }),
  });

  const uploadBill = useMutation({
    mutationFn: async () => {
      if (!selectedProvider || !billFile) throw new Error("Choose a bill file");
      const body = new FormData();
      body.append("file", billFile);
      body.append("providerId", selectedProvider.id);
      body.append("billingMonth", billingMonth);
      if (billProgramId !== "combined") body.append("programId", billProgramId);
      if (billTotal) body.append("totalAmount", billTotal);
      if (billNotes) body.append("notes", billNotes);
      const res = await fetch("/api/accounting/healthcare/bills", { method: "POST", body, credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(payload.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await invalidate();
      setBillFile(null);
      setBillTotal("");
      setBillNotes("");
      toast({ title: "Bill saved" });
    },
    onError: (err: Error) => toast({ title: "Could not save bill", description: err.message, variant: "destructive" }),
  });

  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!selectedProvider || !docFile) throw new Error("Choose a document");
      const body = new FormData();
      body.append("file", docFile);
      body.append("providerId", selectedProvider.id);
      if (docTitle.trim()) body.append("title", docTitle.trim());
      const res = await fetch("/api/accounting/healthcare/documents", { method: "POST", body, credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(payload.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await invalidate();
      setDocFile(null);
      setDocTitle("");
      toast({ title: "Document saved" });
    },
    onError: (err: Error) => toast({ title: "Could not save document", description: err.message, variant: "destructive" }),
  });

  const toggleDocument = useMutation({
    mutationFn: async ({ id, attachToInquiries }: { id: string; attachToInquiries: boolean }) => {
      await apiRequest("PUT", `/api/accounting/healthcare/documents/${id}`, { attachToInquiries });
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast({ title: "Could not update document", description: err.message, variant: "destructive" }),
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/accounting/healthcare/documents/${id}`);
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast({ title: "Could not delete document", description: err.message, variant: "destructive" }),
  });

  const previewEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedProvider) throw new Error("Choose a provider");
      const res = await apiRequest("POST", "/api/accounting/healthcare/enrollment-preview", {
        ...inquiryForm,
        providerId: selectedProvider.id,
      });
      return res.json() as Promise<EnrollmentPreview>;
    },
    onSuccess: (preview) => setEnrollmentPreview(preview),
    onError: (err: Error) => toast({ title: "Could not preview the email", description: err.message, variant: "destructive" }),
  });

  const sendEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedProvider) throw new Error("Choose a provider");
      const res = await apiRequest("POST", "/api/accounting/healthcare/enrollment-inquiries", {
        ...inquiryForm,
        providerId: selectedProvider.id,
      });
      return res.json();
    },
    onSuccess: async () => {
      await invalidate();
      setInquiryForm({ fullName: "", email: "", hireDate: "", eventType: "new_hire", eventDetail: "" });
      setEnrollmentPreview(null);
      toast({ title: "Enrollment email sent" });
    },
    onError: (err: Error) => toast({ title: "Could not send the email", description: err.message, variant: "destructive" }),
  });

  const emailUploadLink = useMutation({
    mutationFn: async (month: string) => {
      const res = await apiRequest("POST", "/api/accounting/healthcare/bill-upload-link", { billingMonth: month, email: billRequestEmail });
      return res.json() as Promise<{ email: string; month: string }>;
    },
    onSuccess: async (result) => {
      await invalidate();
      toast({ title: "Upload link emailed", description: `${result.email} · ${formatMonth(`${result.month}-01`)}` });
    },
    onError: (err: Error) => toast({ title: "Could not email the upload link", description: err.message, variant: "destructive" }),
  });

  const saveRules = useMutation({
    mutationFn: async () => {
      const rules = Object.entries(ruleDraft)
        .filter(([, rule]) => rule.employerPercent !== "")
        .map(([key, rule]) => {
          const [companyId, category] = key.split(":");
          return { companyId, category, basis: rule.basis, employerPercent: Number(rule.employerPercent) };
        });
      const bands = Object.entries(bandDraft).flatMap(([key, amount]) => {
        const [category, minMonths] = key.split(":");
        const sample = (data?.contributionBands ?? []).find((band) => band.category === category && String(band.minMonths) === minMonths);
        return (data?.companies ?? []).map((company) => ({
          companyId: company.id,
          category,
          minMonths: Number(minMonths),
          maxMonths: sample?.maxMonths ?? null,
          employerAmount: Number(amount),
        }));
      });
      await apiRequest("PUT", "/api/accounting/healthcare/contribution-rules", {
        companies: (data?.companies ?? []).map((company) => ({ id: company.id, billingEmail: billingEmails[company.id] ?? "" })),
        rules,
        bands,
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Contribution rules saved" });
    },
    onError: (err: Error) => toast({ title: "Could not save contribution rules", description: err.message, variant: "destructive" }),
  });

  const saveMappings = useMutation({
    mutationFn: async () => {
      const mappings = Object.entries(mappingDraft).map(([key, mapping]) => {
        const separator = key.indexOf(":");
        return {
          companyId: key.slice(0, separator),
          role: key.slice(separator + 1),
          accountName: mapping.accountName,
          accountType: mapping.accountType,
        };
      });
      await apiRequest("PUT", "/api/accounting/healthcare/account-mappings", { mappings });
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Account mapping saved" });
    },
    onError: (err: Error) => toast({ title: "Could not save account mapping", description: err.message, variant: "destructive" }),
  });

  const saveParticipant = useMutation({
    mutationFn: async () => {
      const elections = benefitCategories
        .map((category) => participantForm.elections[category])
        .filter((election) => election?.programId && election.tier);
      const payload = {
        fullName: participantForm.fullName,
        hireDate: participantForm.hireDate,
        coverageEnd: participantForm.coverageEnd,
        companyId: participantForm.companyId,
        elections,
      };
      if (participantForm.id) {
        await apiRequest("PUT", `/api/accounting/healthcare/participants/${participantForm.id}`, payload);
      } else {
        await apiRequest("POST", "/api/accounting/healthcare/participants", payload);
      }
    },
    onSuccess: async () => {
      await invalidate();
      setParticipantOpen(false);
      toast({ title: participantForm.id ? "Participant updated" : "Participant added" });
    },
    onError: (err: Error) => toast({ title: "Could not save participant", description: err.message, variant: "destructive" }),
  });

  const deleteParticipant = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/accounting/healthcare/participants/${id}`);
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast({ title: "Could not remove participant", description: err.message, variant: "destructive" }),
  });

  const sendStatements = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/healthcare/statements", {
        billingMonth,
        providerId: selectedProvider?.id,
      });
      return res.json() as Promise<{ statements: { invoiceNumber: string; email: string; status: string; error?: string }[] }>;
    },
    onSuccess: async (result) => {
      await invalidate();
      const failed = result.statements.filter((statement) => statement.status !== "sent");
      if (failed.length > 0) {
        toast({
          title: "Recorded, email did not send",
          description: failed.map((statement) => `${statement.invoiceNumber} to ${statement.email}: ${statement.error ?? "failed"}`).join(" "),
          variant: "destructive",
        });
      } else {
        toast({ title: "Bill and invoice sent", description: result.statements.map((statement) => `${statement.invoiceNumber} to ${statement.email}`).join(". ") });
      }
    },
    onError: (err: Error) => toast({ title: "Could not record the month", description: err.message, variant: "destructive" }),
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/accounting/healthcare/bills/${id}`);
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast({ title: "Could not delete bill", description: err.message, variant: "destructive" }),
  });

  const providerBills = useMemo(
    () => (data?.bills ?? []).filter((bill) => bill.providerId === selectedProvider?.id),
    [data?.bills, selectedProvider?.id],
  );

  const companyName = (id: string) => data?.companies.find((company) => company.id === id)?.name ?? "Company";
  const allocationByPerson = useMemo(() => {
    const map = new Map<string, AllocationLine>();
    for (const company of allocation?.companies ?? []) {
      for (const person of company.participants) map.set(person.participantId, person);
    }
    return map;
  }, [allocation]);

  const openParticipant = (participant?: Participant) => {
    const elections: Record<string, { programId: string; tier: string }> = {};
    for (const election of participant?.elections ?? []) {
      const program = selectedProvider?.programs.find((item) => item.id === election.programId);
      if (program) elections[program.category] = { programId: election.programId, tier: election.tier };
    }
    setParticipantForm({
      id: participant?.id ?? "",
      fullName: participant?.fullName ?? "",
      hireDate: participant?.hireDate?.slice(0, 10) ?? "",
      coverageEnd: participant?.coverageEnd?.slice(0, 10) ?? "",
      companyId: participant?.companyId ?? data?.companies[0]?.id ?? "",
      elections,
    });
    setParticipantOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-700 text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Accounting</h1>
            <p className="text-xs text-muted-foreground">Nashoba Valley and The Gables</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setLocation("/")} data-testid="button-return-hub">
            Return to Hub
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Health Care Insurance Allocation</h2>
          <p className="text-muted-foreground mt-1 max-w-3xl">
            Nashoba Valley and The Gables share one medical, dental, and vision policy for May 1, 2026 through April 30, 2027. The company pays a flat monthly amount based on tenure. Nashoba pays the full carrier bill, then invoices The Gables for its employees.
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-sm text-destructive">Could not load health care insurance. Refresh and try again.</CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="provider">
            <TabsList>
              <TabsTrigger value="provider" data-testid="tab-provider">Provider</TabsTrigger>
              <TabsTrigger value="participants" data-testid="tab-participants">Participants</TabsTrigger>
              <TabsTrigger value="bills" data-testid="tab-bills">Monthly Bills</TabsTrigger>
              <TabsTrigger value="accounts" data-testid="tab-accounts">Accounts</TabsTrigger>
              <TabsTrigger value="payroll" data-testid="tab-payroll">Payroll</TabsTrigger>
              <TabsTrigger value="enrollment" data-testid="tab-enrollment">Enrollment</TabsTrigger>
            </TabsList>

            <TabsContent value="provider" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {selectedProvider?.name ?? "No provider yet"}
                      {selectedProvider?.isCurrent && <Badge>Current</Badge>}
                    </CardTitle>
                    <CardDescription>
                      {selectedProvider
                        ? `Group ${selectedProvider.groupNumber ?? "—"} · ${selectedProvider.policyHolder ?? "Policy holder not set"}`
                        : "Add the insurance carrier that writes the shared policy."}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {providers.length > 1 && (
                      <Select value={selectedProvider?.id} onValueChange={(value) => { setProviderId(value); setProgramId(null); }}>
                        <SelectTrigger className="w-48" data-testid="select-provider">
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="outline" onClick={() => setProviderOpen(true)} data-testid="button-add-provider">
                      <Plus className="h-4 w-4 mr-2" />
                      Add provider
                    </Button>
                  </div>
                </CardHeader>
                {selectedProvider && (
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Plan year starts</p>
                        <p className="font-medium">{formatDay(selectedProvider.planYearStart)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rates through</p>
                        <p className="font-medium">{formatDay(selectedProvider.rateGuaranteeThrough)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Covered companies</p>
                        <p className="font-medium">{(data?.companies ?? []).map((company) => company.name).join(" and ") || "—"}</p>
                      </div>
                    </div>
                    {selectedProvider.notes && <p className="text-muted-foreground">{selectedProvider.notes}</p>}
                  </CardContent>
                )}
              </Card>

              {selectedProvider && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle>Programs</CardTitle>
                      <CardDescription>Medical, dental, and vision plans on this provider.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setProgramOpen(true)} data-testid="button-add-program">
                      <Plus className="h-4 w-4 mr-2" />
                      Add program
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {selectedProvider.programs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No programs yet.</p>
                    ) : (
                      <Tabs value={selectedProgram?.id} onValueChange={setProgramId}>
                        <TabsList className="flex h-auto flex-wrap justify-start">
                          {selectedProvider.programs.map((program) => (
                            <TabsTrigger key={program.id} value={program.id} data-testid={`tab-program-${program.planCode}`}>
                              {program.category === "vision" ? <Eye className="h-3.5 w-3.5 mr-1.5" /> : program.category === "dental" ? <Smile className="h-3.5 w-3.5 mr-1.5" /> : <HeartPulse className="h-3.5 w-3.5 mr-1.5" />}
                              {program.planName}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {selectedProvider.programs.map((program) => (
                          <TabsContent key={program.id} value={program.id} className="mt-4">
                            <ProgramDetail program={program} />
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="participants" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Company contribution</CardTitle>
                  <CardDescription>
                    Dental is 25% of the employee-only premium from 3 to 59 months, 50% from 60 to 119 months, and 100% at 120 months. Medical is $450, $625, or $700 at those same anniversaries. Vision stays at $0. A hire date after the 1st does not count as a full month. The same schedule applies at Nashoba Valley and The Gables.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {(data?.companies ?? []).map((company) => (
                      <div key={company.id} className="space-y-1">
                        <Label htmlFor={`email-${company.id}`}>{company.name} billing email</Label>
                        <Input
                          id={`email-${company.id}`}
                          type="email"
                          value={billingEmails[company.id] ?? ""}
                          onChange={(event) => setBillingEmails((current) => ({ ...current, [company.id]: event.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Benefit</th>
                          <th className="py-2 pr-3 font-medium">Tenure</th>
                          <th className="py-2 pr-3 font-medium">Employer pays per month</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benefitCategories.flatMap((category) => {
                          const rows = (data?.contributionBands ?? []).filter((band) => band.companyId === data?.companies[0]?.id && band.category === category);
                          return rows.map((band) => {
                            const key = `${band.category}:${band.minMonths}`;
                            const tenure = band.maxMonths === null
                              ? (band.minMonths === 0 ? "All tenure" : `${band.minMonths}+ months`)
                              : `${band.minMonths}–${band.maxMonths} months`;
                            return (
                              <tr key={key} className="border-b last:border-0">
                                <td className="py-2 pr-3 capitalize">{categoryLabel[category]}</td>
                                <td className="py-2 pr-3">{tenure}</td>
                                <td className="py-2 pr-3">
                                  <Input
                                    inputMode="decimal"
                                    className="w-32"
                                    value={bandDraft[key] ?? ""}
                                    onChange={(event) => setBandDraft((current) => ({ ...current, [key]: event.target.value }))}
                                  />
                                </td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Button onClick={() => saveRules.mutate()} disabled={saveRules.isPending} data-testid="button-save-rules">Save contribution rates</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contribution anniversaries</CardTitle>
                  <CardDescription>
                    Each enrolled employee, and the hire-date anniversary that moves medical and dental to the next company contribution. This ledger is included in the monthly invoice upload email.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(allocation?.anniversaries?.rows.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No enrolled employees for this month.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Employee</th>
                            <th className="py-2 pr-3 font-medium">As of {formatMonth(`${billingMonth}-01`)}</th>
                            <th className="py-2 font-medium">Next rate change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allocation?.anniversaries?.rows.map((row) => (
                            <tr key={`${row.fullName}-${row.hireDate}`} className="border-b last:border-0">
                              <td className="py-2 pr-3">{row.fullName}<br /><span className="text-muted-foreground">{row.companyName} · hired {formatDay(row.hireDate)}</span></td>
                              <td className="py-2 pr-3">{row.serviceMonths} months<br />Medical {row.currentMedical}<br />Dental {row.currentDental}</td>
                              <td className="py-2">{row.nextMonth ? <>{formatMonth(`${row.nextMonth}-01`)} · {row.nextServiceMonths} months<br />Medical {row.nextMedical}<br />Dental {row.nextDental}</> : "Highest rate is already in effect"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Employees</CardTitle>
                    <CardDescription>
                      {allocation ? `${formatMonth(`${billingMonth}-01`)} uses ${allocation.rateBasis} rates. Calculated premium ${money(allocation.total)}, employer ${money(allocation.employer)}, employee ${money(allocation.employee)}.` : "Add the people covered this month."}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input type="month" value={billingMonth} onChange={(event) => setBillingMonth(event.target.value)} className="w-40" data-testid="input-allocation-month" />
                    <Button onClick={() => openParticipant()} data-testid="button-add-participant"><Plus className="h-4 w-4 mr-2" />Add participant</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(allocation?.warnings ?? []).length > 0 && (
                    <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                      {allocation?.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                    </div>
                  )}
                  {(data?.participants ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No participants yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Employee</th>
                            <th className="py-2 pr-3 font-medium">Hired</th>
                            <th className="py-2 pr-3 font-medium">Tenure</th>
                            <th className="py-2 pr-3 font-medium">Company</th>
                            <th className="py-2 pr-3 font-medium">Programs</th>
                            <th className="py-2 pr-3 font-medium">Premium</th>
                            <th className="py-2 pr-3 font-medium">Employer</th>
                            <th className="py-2 pr-3 font-medium">Employee share</th>
                            <th className="py-2 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data?.participants ?? []).map((participant) => {
                            const line = allocationByPerson.get(participant.id);
                            const programs = line?.elections.length
                              ? line.elections.map((election) => `${election.programName} · ${election.tier}`).join(", ")
                              : participant.elections.map((election) => {
                                  const program = selectedProvider?.programs.find((item) => item.id === election.programId);
                                  return program ? `${program.planName} · ${election.tier}` : election.tier;
                                }).join(", ");
                            return (
                              <tr key={participant.id} className="border-b last:border-0" data-testid={`participant-${participant.id}`}>
                                <td className="py-2 pr-3">{participant.fullName}</td>
                                <td className="py-2 pr-3">{formatDay(participant.hireDate)}</td>
                                <td className="py-2 pr-3">{line?.serviceMonths === undefined ? "—" : `${line.serviceMonths} mo`}</td>
                                <td className="py-2 pr-3">{companyName(participant.companyId)}</td>
                                <td className="py-2 pr-3">{programs || "—"}</td>
                                <td className="py-2 pr-3">{line ? money(line.premium) : "—"}</td>
                                <td className="py-2 pr-3">{line ? money(line.employer) : "—"}</td>
                                <td className="py-2 pr-3">{line ? money(line.employee) : "—"}</td>
                                <td className="py-2 text-right whitespace-nowrap">
                                  <Button variant="ghost" size="sm" onClick={() => setLedgerParticipantId(participant.id)} data-testid={`button-ledger-${participant.id}`}>Ledger</Button>
                                  <Button variant="ghost" size="icon" onClick={() => openParticipant(participant)} data-testid={`button-edit-participant-${participant.id}`}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { if (window.confirm(`Remove ${participant.fullName}?`)) deleteParticipant.mutate(participant.id); }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground max-w-xl">
                      The full bill goes to {(data?.companies ?? []).find((company) => company.paysCarrier)?.billingEmail || "Nashoba accounts payable"}. The Gables invoice goes to {(data?.companies ?? []).find((company) => !company.paysCarrier)?.billingEmail || "The Gables"}, itemized by employer and employee contribution.
                    </p>
                    <Button onClick={() => sendStatements.mutate()} disabled={!allocation?.ready || sendStatements.isPending} data-testid="button-send-statements">
                      Record and email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recorded bills and invoices</CardTitle>
                  <CardDescription>Each send is kept here, including emails that did not go out.</CardDescription>
                </CardHeader>
                <CardContent>
                  {(data?.statements ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing has been recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(data?.statements ?? []).map((statement) => (
                        <div key={statement.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3 text-sm">
                          <div>
                            <p className="font-medium">{statement.invoiceNumber} · {formatMonth(statement.billingMonth)} · {money(statement.totalAmount)}</p>
                            <p className="text-muted-foreground">{statement.recipientName} · {statement.recipientEmail} · employer {money(statement.employerAmount)} · employee {money(statement.employeeAmount)}</p>
                            {statement.emailError && <p className="text-destructive">{statement.emailError}</p>}
                          </div>
                          <Badge variant={statement.status === "sent" ? "secondary" : "outline"}>{statement.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bills" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice request email</CardTitle>
                  <CardDescription>This address receives the monthly request to upload the UnitedHealthcare bill, including the ledger of upcoming contribution changes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="bill-request-email">Send invoice requests to</Label>
                    <Input
                      id="bill-request-email"
                      type="email"
                      value={billRequestEmail}
                      onChange={(event) => setBillRequestEmail(event.target.value)}
                      data-testid="input-bill-request-email"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload or scan a monthly bill</CardTitle>
                  <CardDescription>
                    Keep the carrier’s PDF or photo with the month. The company split is calculated from participants.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billing-month">Billing month</Label>
                      <Input id="billing-month" type="month" value={billingMonth} onChange={(event) => setBillingMonth(event.target.value)} data-testid="input-billing-month" />
                    </div>
                    <div className="space-y-2">
                      <Label>Program</Label>
                      <Select value={billProgramId} onValueChange={setBillProgramId}>
                        <SelectTrigger data-testid="select-bill-program">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="combined">Combined invoice</SelectItem>
                          {(selectedProvider?.programs ?? []).map((program) => (
                            <SelectItem key={program.id} value={program.id}>{program.planName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bill-total">Bill total</Label>
                      <Input id="bill-total" inputMode="decimal" placeholder="0.00" value={billTotal} onChange={(event) => setBillTotal(event.target.value)} data-testid="input-bill-total" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bill-notes">Notes</Label>
                    <Textarea id="bill-notes" value={billNotes} onChange={(event) => setBillNotes(event.target.value)} placeholder="Optional" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" asChild>
                      <label className="cursor-pointer" data-testid="button-upload-bill">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload bill
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="sr-only"
                          onChange={(event) => setBillFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <label className="cursor-pointer" data-testid="button-scan-bill">
                        <Camera className="h-4 w-4 mr-2" />
                        Scan with camera
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(event) => setBillFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                    </Button>
                    <span className="text-sm text-muted-foreground">{billFile ? billFile.name : "PDF or photo"}</span>
                    <Button className="ml-auto" disabled={!billFile || uploadBill.isPending} onClick={() => uploadBill.mutate()} data-testid="button-save-bill">
                      Save bill
                    </Button>
                    <Button variant="outline" disabled={emailUploadLink.isPending || !billRequestEmail.trim()} onClick={() => emailUploadLink.mutate(billingMonth)} data-testid="button-email-upload-link">
                      Email upload link
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload requests</CardTitle>
                  <CardDescription>Emails asking for the bill, and whether that month’s file has been uploaded.</CardDescription>
                </CardHeader>
                <CardContent>
                  {(data?.uploadRequests ?? []).filter((request) => request.providerId === selectedProvider?.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upload requests have been sent.</p>
                  ) : (
                    <div className="space-y-3">
                      {(data?.uploadRequests ?? []).filter((request) => request.providerId === selectedProvider?.id).map((request) => (
                        <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3" data-testid={`upload-request-${request.id}`}>
                          <div>
                            <p className="font-medium">{formatMonth(request.billingMonth)}</p>
                            <p className="text-sm text-muted-foreground">
                              Sent to {request.recipientEmail}{request.sentAt ? ` · ${formatDay(request.sentAt)}` : ""}
                            </p>
                            <p className="text-sm">{request.uploadedFilename ? `Uploaded · ${request.uploadedFilename}` : "Not uploaded yet"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={request.uploadedFilename ? "secondary" : "outline"}>{request.uploadedFilename ? "Uploaded" : "Waiting"}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={emailUploadLink.isPending || !billRequestEmail.trim()}
                              onClick={() => emailUploadLink.mutate(request.billingMonth.slice(0, 7))}
                              data-testid={`button-resend-upload-${request.id}`}
                            >
                              Resend
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Saved bills</CardTitle>
                  <CardDescription>{selectedProvider ? `Bills for ${selectedProvider.name}` : "No provider selected"}</CardDescription>
                </CardHeader>
                <CardContent>
                  {providerBills.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No monthly bills uploaded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {providerBills.map((bill) => (
                        <div key={bill.id} className="flex flex-wrap items-start justify-between gap-3 border rounded-lg p-3" data-testid={`bill-${bill.id}`}>
                          <div className="space-y-1">
                            <p className="font-medium">{formatMonth(bill.billingMonth)} · {money(bill.totalAmount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {bill.programName ?? "Combined invoice"} · {bill.originalFilename}
                            </p>
                            {bill.allocations?.length > 0 && (
                              <p className="text-sm">
                                {bill.allocations
                                  .filter((row) => row.amount !== null && !Number.isNaN(Number(row.amount)))
                                  .map((row) => `${companyName(row.companyId)} ${money(row.amount)}`)
                                  .join(" · ") || "No company split recorded"}
                              </p>
                            )}
                            {bill.notes && <p className="text-sm text-muted-foreground">{bill.notes}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={`/api/accounting/healthcare/bills/${bill.id}/file`} target="_blank" rel="noreferrer">Open</a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm("Delete this bill?")) deleteBill.mutate(bill.id);
                              }}
                              data-testid={`button-delete-bill-${bill.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accounts" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>QuickBooks accounts</CardTitle>
                  <CardDescription>
                    Emailing the bill posts the total to general Accounts Payable. The lines below are how that bill is split. Nashoba’s bill has its employee share, its employer share, and the full Gables amount. The Gables bill has only its employee share and its employer share.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(data?.companies ?? []).map((company) => {
                    const rows = (data?.accountMappings ?? []).filter((mapping) => mapping.companyId === company.id);
                    return (
                      <div key={company.id} className="space-y-2">
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.billingEmail || "No billing email"} · {company.paysCarrier ? "Pays UnitedHealthcare" : "Receives the Nashoba invoice"}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">What it records</th>
                                <th className="py-2 pr-3 font-medium">Account name</th>
                                <th className="py-2 pr-3 font-medium">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((mapping) => {
                                const key = `${mapping.companyId}:${mapping.role}`;
                                const draft = mappingDraft[key] ?? { accountName: mapping.accountName, accountType: mapping.accountType };
                                const label = mapping.role === "employee_contribution"
                                  ? "Bill line: employee share"
                                  : mapping.role === "employer_expense"
                                    ? "Bill line: employer share"
                                    : "Bill line: amount to collect from The Gables";
                                return (
                                  <tr key={key} className="border-b last:border-0">
                                    <td className="py-2 pr-3">{label}</td>
                                    <td className="py-2 pr-3">
                                      <Input
                                        value={draft.accountName}
                                        onChange={(event) => setMappingDraft((current) => ({ ...current, [key]: { ...draft, accountName: event.target.value } }))}
                                      />
                                    </td>
                                    <td className="py-2 pr-3">
                                      <Select
                                        value={draft.accountType}
                                        onValueChange={(value) => setMappingDraft((current) => ({ ...current, [key]: { ...draft, accountType: value } }))}
                                      >
                                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="balance_sheet">Balance sheet</SelectItem>
                                          <SelectItem value="expense">Expense</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  <Button onClick={() => saveMappings.mutate()} disabled={saveMappings.isPending} data-testid="button-save-accounts">Save account mapping</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payroll" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payroll deductions</CardTitle>
                  <CardDescription>
                    Nashoba Valley and The Gables both pay every two weeks. The next period ends Sunday, September 27, 2026. Each paycheck deduction is the monthly employee share times 12, divided by 26, so a year of paychecks equals a year of premiums. The coverage month is the month of that period end.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="period-end">Payroll period ends</Label>
                      <Input id="period-end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="w-44" />
                    </div>
                    <Button onClick={() => logPayroll.mutate()} disabled={logPayroll.isPending || (payroll?.lines.length ?? 0) === 0} data-testid="button-log-payroll">Log this payroll</Button>
                  </div>
                  {(payroll?.warnings ?? []).map((warning) => <p key={warning} className="text-sm text-amber-700">{warning}</p>)}
                  {(payroll?.lines.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No covered employees for {payroll?.coverageMonth ?? "this month"}.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Employee</th>
                            <th className="py-2 pr-3 font-medium">Company</th>
                            <th className="py-2 pr-3 font-medium">Monthly share</th>
                            <th className="py-2 pr-3 font-medium">This paycheck</th>
                            <th className="py-2 font-medium">Logged</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payroll?.lines.map((line) => (
                            <tr key={line.participantId} className="border-b last:border-0">
                              <td className="py-2 pr-3">{line.fullName}</td>
                              <td className="py-2 pr-3">{line.companyName}</td>
                              <td className="py-2 pr-3">{money(line.monthlyEmployee)}</td>
                              <td className="py-2 pr-3">{money(line.deduction)}</td>
                              <td className="py-2">{line.loggedAt ? formatDay(line.loggedAt) : "Not logged"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="enrollment" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> UnitedHealthcare documents</CardTitle>
                  <CardDescription>Keep the enrollment packet here. Documents left marked “Attach” go out with each employee email.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="doc-title">Title</Label>
                      <Input id="doc-title" value={docTitle} onChange={(event) => setDocTitle(event.target.value)} placeholder="2026-27 enrollment packet" data-testid="input-document-title" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-file">File</Label>
                      <Input id="doc-file" type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" onChange={(event) => setDocFile(event.target.files?.[0] ?? null)} data-testid="input-document-file" />
                    </div>
                    <Button disabled={!docFile || uploadDocument.isPending} onClick={() => uploadDocument.mutate()} data-testid="button-save-document">Save document</Button>
                  </div>
                  {(data?.documents ?? []).filter((document) => document.providerId === selectedProvider?.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {(data?.documents ?? []).filter((document) => document.providerId === selectedProvider?.id).map((document) => (
                        <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3" data-testid={`document-${document.id}`}>
                          <div>
                            <p className="font-medium">{document.title}</p>
                            <p className="text-sm text-muted-foreground">{document.originalFilename}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant={document.attachToInquiries ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleDocument.mutate({ id: document.id, attachToInquiries: !document.attachToInquiries })}
                              data-testid={`button-attach-document-${document.id}`}
                            >
                              {document.attachToInquiries ? "Attach" : "Leave off"}
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`/api/accounting/healthcare/documents/${document.id}/file`} target="_blank" rel="noreferrer">Open</a>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (window.confirm("Delete this document?")) deleteDocument.mutate(document.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Send enrollment information</CardTitle>
                  <CardDescription>Enter the employee’s name, email, and hire date. The email explains the company contribution, when it starts, and the enrollment event, and attaches the marked documents.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="inquiry-name">Name</Label>
                      <Input id="inquiry-name" value={inquiryForm.fullName} onChange={(event) => setInquiryForm({ ...inquiryForm, fullName: event.target.value })} data-testid="input-inquiry-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inquiry-email">Email</Label>
                      <Input id="inquiry-email" type="email" value={inquiryForm.email} onChange={(event) => setInquiryForm({ ...inquiryForm, email: event.target.value })} data-testid="input-inquiry-email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inquiry-hire">Hire date</Label>
                      <Input id="inquiry-hire" type="date" value={inquiryForm.hireDate} onChange={(event) => setInquiryForm({ ...inquiryForm, hireDate: event.target.value })} data-testid="input-inquiry-hire" />
                    </div>
                    <div className="space-y-2">
                      <Label>Enrollment</Label>
                      <Select value={inquiryForm.eventType} onValueChange={(value) => setInquiryForm({ ...inquiryForm, eventType: value })}>
                        <SelectTrigger data-testid="select-inquiry-event"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_hire">New hire</SelectItem>
                          <SelectItem value="annual">Annual enrollment</SelectItem>
                          <SelectItem value="qualifying_event">Qualifying event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {inquiryForm.eventType === "qualifying_event" && (
                    <div className="space-y-2">
                      <Label htmlFor="inquiry-event">Event</Label>
                      <Input id="inquiry-event" value={inquiryForm.eventDetail} onChange={(event) => setInquiryForm({ ...inquiryForm, eventDetail: event.target.value })} placeholder="Marriage, birth, or loss of other coverage" data-testid="input-inquiry-event" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => previewEnrollment.mutate()} disabled={previewEnrollment.isPending || !inquiryForm.fullName || !inquiryForm.email || !inquiryForm.hireDate} data-testid="button-preview-enrollment">Preview</Button>
                    <Button onClick={() => sendEnrollment.mutate()} disabled={sendEnrollment.isPending || !inquiryForm.fullName || !inquiryForm.email || !inquiryForm.hireDate} data-testid="button-send-enrollment">Send email</Button>
                  </div>
                  {enrollmentPreview && (
                    <div className="rounded-lg border p-4 space-y-3 text-sm" data-testid="enrollment-preview">
                      <p className="font-medium">{enrollmentPreview.subject}</p>
                      {enrollmentPreview.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      <p className="text-muted-foreground">
                        Attached: {enrollmentPreview.attachments.length ? enrollmentPreview.attachments.map((file) => file.originalFilename).join(", ") : "none yet"}
                      </p>
                      {enrollmentPreview.plans.map((plan) => (
                        <div key={plan.planName}>
                          <p className="font-medium">{plan.planName}</p>
                          {plan.tiers.map((tier) => (
                            <p key={tier.tier} className="text-muted-foreground">{tier.tier}: premium {money(tier.premium)}, company {money(tier.employer)}, employee {money(tier.employee)}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    {(data?.inquiries ?? []).filter((inquiry) => inquiry.providerId === selectedProvider?.id).map((inquiry) => (
                      <p key={inquiry.id} className="text-sm text-muted-foreground">
                        {inquiry.fullName} · {inquiry.email} · {inquiry.status}{inquiry.emailError ? ` · ${inquiry.emailError}` : ""}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <Dialog open={providerOpen} onOpenChange={setProviderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Carrier</Label>
              <Input id="provider-name" value={providerForm.name} onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })} data-testid="input-provider-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-group">Group number</Label>
              <Input id="provider-group" value={providerForm.groupNumber} onChange={(event) => setProviderForm({ ...providerForm, groupNumber: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-holder">Policy holder</Label>
              <Input id="provider-holder" value={providerForm.policyHolder} onChange={(event) => setProviderForm({ ...providerForm, policyHolder: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-start">Plan year start</Label>
              <Input id="provider-start" type="date" value={providerForm.planYearStart} onChange={(event) => setProviderForm({ ...providerForm, planYearStart: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-notes">Notes</Label>
              <Textarea id="provider-notes" value={providerForm.notes} onChange={(event) => setProviderForm({ ...providerForm, notes: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addProvider.mutate()} disabled={!providerForm.name.trim() || addProvider.isPending} data-testid="button-save-provider">Save provider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={programOpen} onOpenChange={setProgramOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a program</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={programForm.category} onValueChange={(value) => setProgramForm({ ...programForm, category: value })}>
                <SelectTrigger data-testid="select-program-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="vision">Vision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-name">Plan name</Label>
              <Input id="program-name" value={programForm.planName} onChange={(event) => setProgramForm({ ...programForm, planName: event.target.value })} data-testid="input-program-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-code">Plan code</Label>
              <Input id="program-code" value={programForm.planCode} onChange={(event) => setProgramForm({ ...programForm, planCode: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-network">Network</Label>
              <Input id="program-network" value={programForm.network} onChange={(event) => setProgramForm({ ...programForm, network: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-notes">Notes</Label>
              <Textarea id="program-notes" value={programForm.notes} onChange={(event) => setProgramForm({ ...programForm, notes: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addProgram.mutate()}
              disabled={!programForm.planName.trim() || !programForm.planCode.trim() || addProgram.isPending}
              data-testid="button-save-program"
            >
              Save program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(ledgerParticipantId)} onOpenChange={(open) => { if (!open) setLedgerParticipantId(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{ledger?.fullName ?? "Contribution ledger"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Each biweekly paycheck in the current plan year. The employee amount is the monthly share times 12 divided by 26. The company amount uses the same pay periods.
          </p>
          {ledgerLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (ledger?.lines.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No pay periods in this plan year yet.</p>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Pay period ends</th>
                    <th className="py-2 pr-3 font-medium">Coverage</th>
                    <th className="py-2 pr-3 font-medium">Company this paycheck</th>
                    <th className="py-2 font-medium">Employee this paycheck</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger?.lines.map((line) => (
                    <tr key={line.periodEnd} className="border-b last:border-0">
                      <td className="py-2 pr-3">{formatDay(line.periodEnd)}</td>
                      <td className="py-2 pr-3">{formatMonth(`${line.coverageMonth}-01`)}</td>
                      <td className="py-2 pr-3">{money(line.employerPay)}</td>
                      <td className="py-2">{money(line.employeePay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={participantOpen} onOpenChange={setParticipantOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{participantForm.id ? "Edit participant" : "Add participant"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="participant-name">Name</Label>
              <Input id="participant-name" value={participantForm.fullName} onChange={(event) => setParticipantForm({ ...participantForm, fullName: event.target.value })} data-testid="input-participant-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="participant-hire">Date of hire</Label>
                <Input id="participant-hire" type="date" value={participantForm.hireDate} onChange={(event) => setParticipantForm({ ...participantForm, hireDate: event.target.value })} data-testid="input-participant-hire" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participant-end">Coverage end</Label>
                <Input id="participant-end" type="date" value={participantForm.coverageEnd} onChange={(event) => setParticipantForm({ ...participantForm, coverageEnd: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={participantForm.companyId} onValueChange={(value) => setParticipantForm({ ...participantForm, companyId: value })}>
                <SelectTrigger data-testid="select-participant-company"><SelectValue placeholder="Company" /></SelectTrigger>
                <SelectContent>
                  {(data?.companies ?? []).map((company) => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {benefitCategories.map((category) => {
              const choices = (selectedProvider?.programs ?? []).filter((program) => program.category === category);
              const selectedId = participantForm.elections[category]?.programId ?? "none";
              const selectedProgram = choices.find((program) => program.id === selectedId);
              const tiers = selectedProgram?.rates.tiers ?? [];
              return (
                <div key={category} className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="capitalize">{category}</Label>
                    <Select
                      value={selectedId}
                      onValueChange={(value) => {
                        setParticipantForm((current) => {
                          const elections = { ...current.elections };
                          if (value === "none") delete elections[category];
                          else {
                            const program = choices.find((item) => item.id === value);
                            elections[category] = { programId: value, tier: program?.rates.tiers?.[0]?.tier ?? "" };
                          }
                          return { ...current, elections };
                        });
                      }}
                    >
                      <SelectTrigger data-testid={`select-election-${category}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not enrolled</SelectItem>
                        {choices.map((program) => (
                          <SelectItem key={program.id} value={program.id}>{program.planName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    {selectedProgram ? (
                      <Select
                        value={participantForm.elections[category]?.tier}
                        onValueChange={(value) => setParticipantForm((current) => ({
                          ...current,
                          elections: { ...current.elections, [category]: { programId: selectedId, tier: value } },
                        }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
                        <SelectContent>
                          {tiers.map((tier) => (
                            <SelectItem key={tier.tier} value={tier.tier}>{tier.tier}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="Choose a plan" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveParticipant.mutate()}
              disabled={!participantForm.fullName.trim() || !participantForm.hireDate || !participantForm.companyId || saveParticipant.isPending || !Object.values(participantForm.elections).some((election) => election.programId && election.tier)}
              data-testid="button-save-participant"
            >
              Save participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
