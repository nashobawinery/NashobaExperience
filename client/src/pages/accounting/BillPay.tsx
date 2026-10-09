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
  createdAt: string;
};

const kindLabel: Record<Payable["documentKind"], string> = {
  unreviewed: "Needs review",
  invoice: "Invoice",
  statement: "Statement",
};

function money(value: string | null) {
  if (!value) return "—";
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
        qbVendorId: document.draft.qbVendorId ?? "",
        qbAccountId: document.draft.qbAccountId ?? "",
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
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/accounting/payables/${id}/read`);
      return response.json() as Promise<{ reason?: string }>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables"] });
      toast({ title: "Bill read" });
    },
    onError: (err: Error) => toast({ title: "Could not read the bill", description: err.message, variant: "destructive" }),
  });
  const vendors = (reference.data?.vendors ?? []).filter((vendor) => vendor.active);
  const accounts = (reference.data?.accounts ?? []).filter((account) => account.active);
  const documents = data?.documents ?? [];
  const prepare = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/accounting/payables/prepare");
      return response.json() as Promise<{ read: number }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables/reference"] });
      if (result.read > 0) toast({ title: "Bill read", description: "The vendor, dates, and account were filled from the stored lists." });
    },
    onError: (err: Error) => toast({ title: "Could not read the bill", description: err.message, variant: "destructive" }),
  });
  const prepared = useRef(false);
  useEffect(() => {
    if (prepared.current || !reference.isFetched || !data) return;
    const needsReading = documents.some((document) => !document.qbVendorId && !document.qbBillId);
    const listsMissing = vendors.length === 0 || accounts.length === 0;
    if (!needsReading && !listsMissing) return;
    prepared.current = true;
    prepare.mutate();
  }, [reference.isFetched, data, documents, vendors.length, accounts.length]);
  const waiting = documents.filter((document) => document.documentKind === "unreviewed");
  const invoices = documents.filter((document) => document.documentKind === "invoice");
  const statements = documents.filter((document) => document.documentKind === "statement");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Bill Pay</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Vendor bills land in one inbox. Mark each file as an invoice or a statement, set the general-ledger account, and review it before it is sent to QuickBooks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Inbox className="h-4 w-4" /> Needs review</CardDescription>
            <CardTitle>{waiting.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Invoices</CardDescription>
            <CardTitle>{invoices.length}</CardTitle>
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
          <TabsTrigger value="inbox" data-testid="tab-payables-inbox">Inbox</TabsTrigger>
          <TabsTrigger value="vendors" data-testid="tab-payables-vendors">Vendors</TabsTrigger>
          <TabsTrigger value="admin" data-testid="tab-payables-admin">QuickBooks</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          {prepare.isPending && <CardDescription>Storing vendors and accounts, then reading the open bills.</CardDescription>}
          <CardDescription>
            Mail sent to {data?.inboxEmail ?? "bills@nashobawinery.com"} lands here and does not open a support ticket. The reading uses the vendors and accounts stored from QuickBooks, shows the invoice, and explains the account. Send to QuickBooks posts the bill and attaches the file.
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
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vendor documents yet.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <PayableRow key={document.id} document={document} companies={companies} vendors={vendors} accounts={accounts} onSave={(draft) => save.mutate({ ...document, draft })} saving={save.isPending} onPost={(draft) => postBill.mutate({ ...document, draft })} posting={postBill.isPending} onRead={() => reread.mutate(document.id)} reading={reread.isPending} onReplace={(next) => replaceFile.mutate({ id: document.id, next })} replacing={replaceFile.isPending} />
              ))}
            </div>
          )}
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
  onRead: () => void;
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
  }, [document.vendorName, document.qbVendorId, document.qbAccountId, document.documentKind, document.invoiceNumber, document.billDate, document.dueDate, document.amount, document.glAccount, document.companyId]);
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
          {document.qbBillId && <Badge>QuickBooks {document.qbBillId}</Badge>}
          <Badge variant={document.documentKind === "unreviewed" ? "outline" : "secondary"}>{kindLabel[document.documentKind]}</Badge>
          <Button variant="outline" size="sm" disabled={reading || Boolean(document.qbBillId)} onClick={onRead}>
            {reading ? "Reading" : "Read bill"}
          </Button>
          {document.hasFile !== false && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/accounting/payables/${document.id}/file`} target="_blank" rel="noreferrer">Open</a>
            </Button>
          )}
        </div>
      </div>
      {document.accountReason && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium mb-1">Why this account</p>
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
        <iframe title={document.originalFilename} src={`/api/accounting/payables/${document.id}/file`} className="w-full h-96 rounded-lg border" />
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
          {document.qbBillId ? "In QuickBooks" : "Send to QuickBooks"}
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
  const shown = options.filter((option) => !term || option.label.toLowerCase().includes(term)).slice(0, 40);
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Find a ${label.toLowerCase()}`} />
      <Select value={value || undefined} onValueChange={onChange} disabled={options.length === 0}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {shown.map((option) => (
            <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
