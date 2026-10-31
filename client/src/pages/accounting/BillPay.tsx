import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, Inbox, Receipt, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Company = { id: string; name: string };
type QbVendor = { qbId: string; displayName: string; companyName: string | null; active: boolean };
type QbAccount = { qbId: string; name: string; fullyQualifiedName: string; accountType: string | null; accountNumber: string | null; active: boolean };

type Payable = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  vendorName: string | null;
  documentKind: "unreviewed" | "invoice" | "statement";
  invoiceNumber: string | null;
  billDate: string | null;
  dueDate: string | null;
  amount: string | null;
  glAccount: string | null;
  qbVendorId: string | null;
  qbAccountId: string | null;
  qbBillId: string | null;
  accountReason: string | null;
  originalFilename: string;
  hasFile?: boolean;
  source: string | null;
  fromEmail: string | null;
  subject: string | null;
  analysis: StatementAnalysis | string | null;
  readAt: string | null;
  codingNote: string | null;
  postNote: string | null;
  createdAt: string;
};

type StatementLineView = {
  reference: string;
  kind: string;
  status: string;
  statementAmount: number | null;
  note: string;
};

type StatementAnalysis = {
  summary?: string;
  issues?: { severity: string; title: string; detail: string }[];
  lines?: StatementLineView[];
};

const kindLabel: Record<Payable["documentKind"], string> = {
  unreviewed: "Needs review",
  invoice: "Invoice",
  statement: "Statement",
};

function money(value: string | number | null) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function BillPay({ companies }: { companies: Company[] }) {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const { data, isLoading, error } = useQuery<{ inboxEmail: string; documents: Payable[] }>({
    queryKey: ["/api/accounting/payables"],
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a PDF");
      const body = new FormData();
      body.append("file", file);
      if (companyId) body.append("companyId", companyId);
      const res = await fetch("/api/accounting/payables", { method: "POST", body, credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(payload.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables"] });
      toast({ title: "Document added to the inbox" });
    },
    onError: (err: Error) => toast({ title: "Could not add the document", description: err.message, variant: "destructive" }),
  });

  const save = useMutation({
    mutationFn: async (document: Payable & { draft: Partial<Payable> & { companyId?: string; qbVendorId?: string; qbAccountId?: string } }) => {
      await apiRequest("PUT", `/api/accounting/payables/${document.id}`, {
        companyId: document.draft.companyId ?? document.companyId ?? "",
        vendorName: document.draft.vendorName ?? document.vendorName ?? "",
        documentKind: document.draft.documentKind ?? document.documentKind,
        invoiceNumber: document.draft.invoiceNumber ?? document.invoiceNumber ?? "",
        billDate: (document.draft.billDate ?? document.billDate ?? "").slice(0, 10),
        dueDate: (document.draft.dueDate ?? document.dueDate ?? "").slice(0, 10),
        amount: document.draft.amount ?? document.amount ?? "",
        glAccount: document.draft.glAccount ?? document.glAccount ?? "",
        qbVendorId: document.draft.qbVendorId ?? document.qbVendorId ?? "",
        qbAccountId: document.draft.qbAccountId ?? document.qbAccountId ?? "",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables"] });
      toast({ title: "Document updated" });
    },
    onError: (err: Error) => toast({ title: "Could not update the document", description: err.message, variant: "destructive" }),
  });

  const reference = useQuery<{ vendors: QbVendor[]; accounts: QbAccount[]; syncedAt: string | null }>({
    queryKey: ["/api/accounting/payables/reference"],
  });
  const syncQuickBooks = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/payables/sync");
      return res.json() as Promise<{ companyName: string; vendors: number; accounts: number }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables/reference"] });
      toast({ title: "QuickBooks synced", description: `${result.companyName}: ${result.vendors} vendors, ${result.accounts} accounts` });
    },
    onError: (err: Error) => toast({ title: "Could not sync QuickBooks", description: err.message, variant: "destructive" }),
  });
  const postBill = useMutation({
    mutationFn: async (document: Payable & { draft: Partial<Payable> & { qbVendorId?: string; qbAccountId?: string } }) => {
      const response = await apiRequest("POST", `/api/accounting/payables/${document.id}/quickbooks`, {
        vendorName: document.draft.vendorName ?? document.vendorName ?? "",
        invoiceNumber: document.draft.invoiceNumber ?? document.invoiceNumber ?? "",
        billDate: (document.draft.billDate ?? document.billDate ?? "").slice(0, 10),
        dueDate: (document.draft.dueDate ?? document.dueDate ?? "").slice(0, 10),
        amount: document.draft.amount ?? document.amount ?? "",
        glAccount: document.draft.glAccount ?? document.glAccount ?? "",
        qbVendorId: document.draft.qbVendorId ?? document.qbVendorId ?? "",
        qbAccountId: document.draft.qbAccountId ?? document.qbAccountId ?? "",
      });
      return response.json() as Promise<{ qbBillId: string; attachmentMessage?: string }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables"] });
      toast({ title: "Bill sent to QuickBooks", description: result.attachmentMessage || `QuickBooks bill ${result.qbBillId}` });
    },
    onError: (err: Error) => toast({ title: "Could not send the bill", description: err.message, variant: "destructive" }),
  });
  const replaceFile = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: File }) => {
      const body = new FormData();
      body.append("file", next);
      const res = await fetch(`/api/accounting/payables/${id}/file`, { method: "POST", body, credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(payload.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables"] });
      toast({ title: "Invoice file restored" });
    },
    onError: (err: Error) => toast({ title: "Could not restore the file", description: err.message, variant: "destructive" }),
  });
  const reread = useMutation({
    mutationFn: async ({ id, purpose }: { id: string; purpose?: string }) => {
      const response = await apiRequest("POST", `/api/accounting/payables/${id}/read`, purpose === undefined ? {} : { purpose });
      return response.json() as Promise<{ reason?: string }>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables"] });
      toast({ title: "Vendor and account recommended" });
    },
    onError: (err: Error) => toast({ title: "Could not read the bill", description: err.message, variant: "destructive" }),
  });
  const vendors = (reference.data?.vendors ?? []).filter((vendor) => vendor.active);
  const accounts = (reference.data?.accounts ?? []).filter((account) => account.active);
  const documents = data?.documents ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prepare = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/accounting/payables/prepare");
      return response.json() as Promise<{ read: number }>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables/reference"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/vendor-analyses"] });
    },
    onError: (err: Error) => toast({ title: "Could not read the bill", description: err.message, variant: "destructive" }),
  });
  const passes = useRef(0);
  useEffect(() => {
    if (!reference.isFetched || !data || prepare.isPending || passes.current >= 6) return;
    const needsReading = documents.some((document) => !document.qbBillId && (!document.readAt || (document.documentKind === "statement" && !document.analysis)));
    const listsMissing = vendors.length === 0 || accounts.length === 0;
    if (!needsReading && !listsMissing) return;
    passes.current += 1;
    prepare.mutate();
  }, [reference.isFetched, data, documents, vendors.length, accounts.length, prepare.isPending]);
  const approval = documents.filter((document) => document.documentKind !== "statement" && !document.qbBillId);
  const posted = documents.filter((document) => document.documentKind !== "statement" && document.qbBillId);
  const statements = documents.filter((document) => document.documentKind === "statement");
  const selected = approval.find((document) => document.id === selectedId) ?? approval[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Bill Pay</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Invoices emailed to bills@nashobawinery.com wait here for approval. Each day, an invoice that is already in QuickBooks is marked Posted and is not sent again. A statement is filed on the Statements tab and compared with the invoices we already have.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Inbox className="h-4 w-4" /> Waiting for approval</CardDescription>
            <CardTitle>{approval.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Posted</CardDescription>
            <CardTitle>{posted.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><FileText className="h-4 w-4" /> Statements</CardDescription>
            <CardTitle>{statements.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox" data-testid="tab-payables-inbox">For approval</TabsTrigger>
          <TabsTrigger value="statements" data-testid="tab-payables-statements">Statements</TabsTrigger>
          <TabsTrigger value="vendors" data-testid="tab-payables-vendors">Vendors</TabsTrigger>
          <TabsTrigger value="admin" data-testid="tab-payables-admin">QuickBooks</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle>For approval</CardTitle>
          {prepare.isPending && <CardDescription>Reading new mail and separating statements from invoices.</CardDescription>}
          <CardDescription>
            Mail sent to {data?.inboxEmail ?? "bills@nashobawinery.com"} lands here and does not open a support ticket. Open one invoice, confirm the vendor and account, then approve it. Approval sends the bill to QuickBooks and attaches the file. If QuickBooks already has that invoice, it is marked Posted instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="w-56" data-testid="select-payable-company"><SelectValue placeholder="Company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payable-file">PDF</Label>
              <Input id="payable-file" type="file" accept="application/pdf,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} data-testid="input-payable-file" />
            </div>
            <Button disabled={!file || upload.isPending} onClick={() => upload.mutate()} data-testid="button-add-payable">
              <Upload className="h-4 w-4 mr-2" />
              Add to inbox
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : error ? (
            <p className="text-sm text-destructive">Could not load the inbox.</p>
          ) : approval.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices are waiting for approval.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
              <div className="border rounded-lg overflow-auto max-h-[40rem]">
                {approval.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setSelectedId(document.id)}
                    className={`block w-full text-left px-3 py-2 border-b last:border-0 text-sm ${selected?.id === document.id ? "bg-muted" : ""}`}
                  >
                    <span className="block font-medium">{document.vendorName || document.subject || document.originalFilename}</span>
                    <span className="text-muted-foreground">{document.invoiceNumber || "No number"} · {money(document.amount)}</span>
                  </button>
                ))}
              </div>
              {selected && (
                <PayableRow key={selected.id} document={selected} companies={companies} vendors={vendors} accounts={accounts} onSave={(draft) => save.mutate({ ...selected, draft })} saving={save.isPending} onPost={(draft) => postBill.mutate({ ...selected, draft })} posting={postBill.isPending} onRead={(purpose) => reread.mutate({ id: selected.id, purpose })} reading={reread.isPending} onReplace={(next) => replaceFile.mutate({ id: selected.id, next })} replacing={replaceFile.isPending} />
              )}
            </div>
          )}
          {posted.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <p className="px-3 py-2 text-sm font-medium border-b">Posted</p>
              {posted.map((document) => (
                <div key={document.id} className="px-3 py-2 border-b last:border-0 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>{document.vendorName || document.originalFilename} · {document.invoiceNumber || "No number"}</span>
                    <span className="text-muted-foreground">{money(document.amount)} · Posted · QuickBooks {document.qbBillId}</span>
                  </div>
                  {document.postNote && <p className="text-muted-foreground mt-1">{document.postNote}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="statements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Statements</CardTitle>
              <CardDescription>
                These are account statements, not bills to approve. Each one is checked against invoices received here and against QuickBooks. The same comparison is listed under Vendor analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No statements yet. A statement emailed to bills@nashobawinery.com is placed here.</p>
              ) : statements.map((document) => (
                <StatementCard
                  key={document.id}
                  document={document}
                  onReread={() => reread.mutate({ id: document.id })}
                  reading={reread.isPending}
                  onMarkInvoice={() => save.mutate({ ...document, draft: { documentKind: "invoice" } })}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="vendors" className="mt-4">
          <VendorDirectory
            vendors={reference.data?.vendors ?? []}
            syncing={syncQuickBooks.isPending}
            onSync={() => syncQuickBooks.mutate()}
          />
        </TabsContent>
        <TabsContent value="admin" className="mt-4">
          <QuickBooksAdmin
            vendors={reference.data?.vendors ?? []}
            accounts={reference.data?.accounts ?? []}
            syncedAt={reference.data?.syncedAt ?? null}
            syncing={syncQuickBooks.isPending}
            onSync={() => syncQuickBooks.mutate()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VendorDirectory({
  vendors,
  syncing,
  onSync,
}: {
  vendors: QbVendor[];
  syncing: boolean;
  onSync: () => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const shown = vendors.filter((vendor) => !term || `${vendor.displayName} ${vendor.companyName ?? ""}`.toLowerCase().includes(term));
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>{vendors.length} vendors stored from QuickBooks. Choose one of these on a bill.</CardDescription>
        </div>
        <Button onClick={onSync} disabled={syncing} data-testid="button-store-vendors-tab">{syncing ? "Storing" : "Store from QuickBooks"}</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a vendor" />
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vendors stored yet. Store them from QuickBooks, then choose one on the bill.</p>
        ) : (
          <div className="max-h-[32rem] overflow-auto border rounded-lg">
            {shown.map((vendor) => (
              <div key={vendor.qbId} className="px-3 py-2 border-b last:border-0 text-sm flex justify-between gap-3">
                <span>{vendor.displayName}</span>
                <span className="text-muted-foreground">{!vendor.active ? "Inactive" : vendor.companyName && vendor.companyName !== vendor.displayName ? vendor.companyName : ""}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickBooksAdmin({
  vendors,
  accounts,
  syncedAt,
  syncing,
  onSync,
}: {
  vendors: QbVendor[];
  accounts: QbAccount[];
  syncedAt: string | null;
  syncing: boolean;
  onSync: () => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const shownVendors = vendors.filter((vendor) => !term || vendor.displayName.toLowerCase().includes(term));
  const shownAccounts = accounts.filter((account) => !term || `${account.accountNumber ?? ""} ${account.fullyQualifiedName} ${account.accountType ?? ""}`.toLowerCase().includes(term));
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>QuickBooks sync</CardTitle>
          <CardDescription>
            Nashoba Valley’s QuickBooks is the connected company. Sync stores its vendors and chart of accounts here, and bill reading uses that stored list. The Gables is not connected.
            {syncedAt ? ` Last sync ${new Date(syncedAt).toLocaleString()}.` : ""}
          </CardDescription>
        </div>
        <Button onClick={onSync} disabled={syncing} data-testid="button-sync-quickbooks">{syncing ? "Syncing" : "Sync from QuickBooks"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendors or accounts" data-testid="input-qb-search" />
        {vendors.length === 0 && accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vendors or accounts saved yet. Sync from QuickBooks to fill both lists.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="font-medium mb-2">Vendors ({shownVendors.length})</p>
              <div className="max-h-96 overflow-auto border rounded-lg">
                {shownVendors.map((vendor) => (
                  <div key={vendor.qbId} className="px-3 py-2 border-b last:border-0 text-sm flex justify-between gap-3">
                    <span>{vendor.displayName}</span>
                    {!vendor.active && <span className="text-muted-foreground">Inactive</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Chart of accounts ({shownAccounts.length})</p>
              <div className="max-h-96 overflow-auto border rounded-lg">
                {shownAccounts.map((account) => (
                  <div key={account.qbId} className="px-3 py-2 border-b last:border-0 text-sm">
                    <p>{account.accountNumber ? `${account.accountNumber} ` : ""}{account.fullyQualifiedName}</p>
                    <p className="text-muted-foreground">{account.accountType}{account.active ? "" : " · Inactive"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function readStatementAnalysis(value: Payable["analysis"]): StatementAnalysis {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as StatementAnalysis;
    } catch {
      return {};
    }
  }
  return value;
}

function StatementCard({ document, onReread, reading, onMarkInvoice }: { document: Payable; onReread: () => void; reading: boolean; onMarkInvoice: () => void }) {
  const analysis = readStatementAnalysis(document.analysis);
  const lines = (analysis.lines ?? []).filter((line) => line.kind === "invoice");
  const missing = lines.filter((line) => line.status === "missing-in-books");
  const paid = lines.filter((line) => line.status === "paid-in-books" || line.status === "paid-on-statement");
  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{document.vendorName || document.subject || document.originalFilename}</p>
          <p className="text-sm text-muted-foreground">
            {document.billDate?.slice(0, 10) || "No date"} · Balance {money(document.amount)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={reading} onClick={onReread}>{reading ? "Reading" : "Compare again"}</Button>
          <Button variant="outline" size="sm" onClick={onMarkInvoice}>This is an invoice</Button>
          {document.hasFile !== false && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/accounting/payables/${document.id}/file`} target="_blank" rel="noreferrer">Open</a>
            </Button>
          )}
        </div>
      </div>
      {analysis.summary && <p className="text-sm">{analysis.summary}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium mb-1">Invoices we do not have</p>
          {missing.length === 0 ? <p className="text-muted-foreground">Every invoice that could be read is already here or in QuickBooks.</p> : missing.map((line) => (
            <p key={line.reference}>{line.reference} · {money(line.statementAmount)}</p>
          ))}
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium mb-1">Already paid</p>
          {paid.length === 0 ? <p className="text-muted-foreground">None of the open invoices are marked paid.</p> : paid.map((line) => (
            <p key={`${line.status}-${line.reference}`}>{line.reference} · {line.status === "paid-in-books" ? "Paid in QuickBooks" : "Shown paid on the statement"}</p>
          ))}
        </div>
      </div>
      {document.hasFile !== false && /pdf/i.test(document.originalFilename) && (
        <iframe title={document.originalFilename} src={`/api/accounting/payables/${document.id}/file`} className="w-full h-96 rounded-lg border" />
      )}
    </div>
  );
}

function PayableRow({
  document,
  companies,
  vendors,
  accounts,
  onSave,
  saving,
  onPost,
  posting,
  onRead,
  reading,
  onReplace,
  replacing,
}: {
  document: Payable;
  companies: Company[];
  vendors: QbVendor[];
  accounts: QbAccount[];
  onSave: (draft: Partial<Payable> & { companyId?: string; qbVendorId?: string; qbAccountId?: string }) => void;
  saving: boolean;
  onPost: (draft: Partial<Payable> & { qbVendorId?: string; qbAccountId?: string }) => void;
  posting: boolean;
  onRead: (purpose: string) => void;
  reading: boolean;
  onReplace: (file: File) => void;
  replacing: boolean;
}) {
  const [vendorName, setVendorName] = useState(document.vendorName ?? "");
  const [qbVendorId, setQbVendorId] = useState(document.qbVendorId ?? "");
  const [qbAccountId, setQbAccountId] = useState(document.qbAccountId ?? "");
  const [documentKind, setDocumentKind] = useState(document.documentKind);
  const [invoiceNumber, setInvoiceNumber] = useState(document.invoiceNumber ?? "");
  const [billDate, setBillDate] = useState(document.billDate?.slice(0, 10) ?? "");
  const [dueDate, setDueDate] = useState(document.dueDate?.slice(0, 10) ?? "");
  const [amount, setAmount] = useState(document.amount ?? "");
  const [glAccount, setGlAccount] = useState(document.glAccount ?? "");
  const [rowCompanyId, setRowCompanyId] = useState(document.companyId ?? "");
  const [purpose, setPurpose] = useState(document.codingNote ?? "");
  useEffect(() => {
    setVendorName(document.vendorName ?? "");
    setQbVendorId(document.qbVendorId ?? "");
    setQbAccountId(document.qbAccountId ?? "");
    setDocumentKind(document.documentKind);
    setInvoiceNumber(document.invoiceNumber ?? "");
    setBillDate(document.billDate?.slice(0, 10) ?? "");
    setDueDate(document.dueDate?.slice(0, 10) ?? "");
    setAmount(document.amount ?? "");
    setGlAccount(document.glAccount ?? "");
    setRowCompanyId(document.companyId ?? "");
    setPurpose(document.codingNote ?? "");
  }, [document.vendorName, document.qbVendorId, document.qbAccountId, document.documentKind, document.invoiceNumber, document.billDate, document.dueDate, document.amount, document.glAccount, document.companyId, document.codingNote]);
  const draft = { vendorName, documentKind, invoiceNumber, billDate, dueDate, amount, glAccount, companyId: rowCompanyId, qbVendorId, qbAccountId };
  const expenseAccounts = accounts.filter((account) => /expense|cost of goods sold/i.test(account.accountType ?? ""));
  const accountChoices = expenseAccounts.length > 0 ? expenseAccounts : accounts;

  return (
    <div className="border rounded-lg p-3 space-y-3" data-testid={`payable-${document.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{document.vendorName || document.subject || document.originalFilename}</p>
          <p className="text-sm text-muted-foreground">
            {document.source === "email" ? "Email" : "Upload"}
            {document.subject ? ` · ${document.subject}` : ""} · {document.companyName ?? "No company"} · {money(document.amount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {document.qbBillId && <Badge>Posted · QuickBooks {document.qbBillId}</Badge>}
          <Badge variant={document.documentKind === "unreviewed" ? "outline" : "secondary"}>{kindLabel[document.documentKind]}</Badge>
          <Button variant="outline" size="sm" disabled={reading || Boolean(document.qbBillId)} onClick={() => onRead(purpose)}>
            {reading ? "Reading" : "Read again"}
          </Button>
          {!document.qbBillId && (
            <Button variant="outline" size="sm" disabled={saving} onClick={() => onSave({ ...draft, documentKind: "statement" })}>
              This is a statement
            </Button>
          )}
          {document.hasFile !== false && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/accounting/payables/${document.id}/file`} target="_blank" rel="noreferrer">Open</a>
            </Button>
          )}
        </div>
      </div>
      {!document.qbBillId && (
        <div className="rounded-lg border p-3 space-y-2">
          <Label htmlFor={`purpose-${document.id}`}>What is this invoice for?</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={`purpose-${document.id}`}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Bottles, glass, a repair, landscaping"
              className="max-w-xl"
            />
            <Button disabled={reading} onClick={() => onRead(purpose)}>
              {reading ? "Recommending" : "Recommend vendor and account"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">The recommendation uses the name on the invoice, the accounts this vendor has used before, and this note when you add one.</p>
        </div>
      )}
      {document.accountReason && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium mb-1">Recommendation</p>
          {(document.vendorName || document.glAccount) && (
            <p className="mb-1">{document.vendorName || "No vendor"} · {document.glAccount || "No account"}</p>
          )}
          <p>{document.accountReason}</p>
        </div>
      )}
      {document.hasFile === false ? (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
          <p>The invoice is still listed, but the file was kept on the server disk and was removed when the app updated.</p>
          <p>Forward the same email to bills@nashobawinery.com again, or upload the file here. New copies are stored so the next update will not remove them.</p>
          <Input
            type="file"
            accept="application/pdf,image/*"
            capture="environment"
            disabled={replacing}
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) onReplace(next);
            }}
          />
        </div>
      ) : /pdf/i.test(document.originalFilename) ? (
        <iframe title={document.originalFilename} src={`/api/accounting/payables/${document.id}/file`} className="w-full h-[32rem] rounded-lg border" />
      ) : /\.(png|jpe?g|webp|gif)$/i.test(document.originalFilename) ? (
        <img src={`/api/accounting/payables/${document.id}/file`} alt={document.originalFilename} className="max-h-96 rounded-lg border" />
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <SearchSelect
          label="Vendor"
          placeholder={vendors.length ? (vendorName || "Choose a vendor") : "Store vendors first"}
          value={qbVendorId}
          options={vendors.map((vendor) => ({ id: vendor.qbId, label: vendor.displayName }))}
          onChange={(value) => {
            const vendor = vendors.find((item) => item.qbId === value);
            setQbVendorId(value);
            setVendorName(vendor?.displayName ?? "");
          }}
        />
        <div className="space-y-1">
          <Label>Document</Label>
          <Select value={documentKind} onValueChange={(value) => setDocumentKind(value as Payable["documentKind"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unreviewed">Needs review</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="statement">Statement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Company</Label>
          <Select value={rowCompanyId} onValueChange={setRowCompanyId}>
            <SelectTrigger><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`invoice-${document.id}`}>Invoice number</Label>
          <Input id={`invoice-${document.id}`} value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`bill-date-${document.id}`}>Invoice date</Label>
          <Input id={`bill-date-${document.id}`} type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`due-date-${document.id}`}>Due date</Label>
          <Input id={`due-date-${document.id}`} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`amount-${document.id}`}>Amount</Label>
          <Input id={`amount-${document.id}`} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
        </div>
        <SearchSelect
          label="Account"
          placeholder={accountChoices.length ? (glAccount || "Choose an account") : "Store accounts first"}
          value={qbAccountId}
          options={accountChoices.map((account) => ({ id: account.qbId, label: `${account.accountNumber ? `${account.accountNumber} ` : ""}${account.fullyQualifiedName}` }))}
          onChange={(value) => {
            const account = accountChoices.find((item) => item.qbId === value);
            setQbAccountId(value);
            setGlAccount(account?.fullyQualifiedName ?? "");
          }}
        />
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => onSave(draft)}
        >
          Save
        </Button>
        <Button
          disabled={posting || Boolean(document.qbBillId) || documentKind !== "invoice"}
          title={documentKind === "invoice" ? "Create this bill in QuickBooks" : "Mark this document as an invoice first"}
          onClick={() => onPost(draft)}
        >
          {document.qbBillId ? "In QuickBooks" : "Approve and send to QuickBooks"}
        </Button>
      </div>
    </div>
  );
}

function SearchSelect({ label, placeholder, value, options, onChange }: {
  label: string;
  placeholder: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const selected = options.find((option) => option.id === value);
  const shown = term ? options.filter((option) => option.label.toLowerCase().includes(term)).slice(0, 12) : [];
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={selected?.label || placeholder}
        disabled={options.length === 0}
      />
      {term && (
        <div className="max-h-48 overflow-auto rounded-md border bg-background">
          {shown.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
          ) : shown.map((option) => (
            <button
              key={option.id}
              type="button"
              className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option.id);
                setQuery("");
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
