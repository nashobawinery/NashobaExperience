import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BillPay from "./BillPay";

type Company = { id: string; name: string };
type Screen = "overview" | "transactions" | "vendors" | "bills" | "bill-pay" | "payments" | "job-costing" | "mileage" | "contractors" | "forms";

const screens: { id: Screen; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Expense transactions" },
  { id: "vendors", label: "Vendors" },
  { id: "bills", label: "Bills" },
  { id: "bill-pay", label: "Bill Pay" },
  { id: "payments", label: "Bill payments" },
  { id: "job-costing", label: "Job costing" },
  { id: "mileage", label: "Mileage" },
  { id: "contractors", label: "Contractors" },
  { id: "forms", label: "1099s" },
];

type Vendor = { qbId: string; displayName: string; companyName: string | null; active: boolean };
type Account = { qbId: string; fullyQualifiedName: string; accountType: string | null; active: boolean };
type Payable = {
  id: string;
  vendorName: string | null;
  documentKind: string;
  invoiceNumber: string | null;
  billDate: string | null;
  amount: string | null;
  qbBillId: string | null;
};

function money(value: string | null) {
  if (!value) return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function Expenses({ companies }: { companies: Company[] }) {
  const [screen, setScreen] = useState<Screen>("bill-pay");
  const reference = useQuery<{ vendors: Vendor[]; accounts: Account[] }>({
    queryKey: ["/api/accounting/payables/reference"],
  });
  const inbox = useQuery<{ documents: Payable[] }>({
    queryKey: ["/api/accounting/payables"],
  });
  const vendors = (reference.data?.vendors ?? []).filter((vendor) => vendor.active);
  const accounts = (reference.data?.accounts ?? []).filter((account) => account.active);
  const documents = inbox.data?.documents ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Expenses & Pay Bills</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Expenditures, job costing, and paying. This row appears only on this page.
        </p>
      </div>
      <nav className="sticky top-0 z-20 border-b bg-background overflow-x-auto" aria-label="Expenses and bills">
        <div className="flex h-11 items-stretch min-w-max">
          {screens.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
              data-testid={`button-expense-${item.id}`}
              className={cn(
                "shrink-0 border-b-2 px-3 text-sm font-medium whitespace-nowrap",
                screen === item.id
                  ? "border-[#2ca01c] text-[#2ca01c]"
                  : "border-transparent text-[#393a3d] hover:bg-[#f4f5f8]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      {screen === "overview" && <Overview vendors={vendors.length} accounts={accounts.length} documents={documents} />}
      {screen === "transactions" && <ScreenNote title="Expense transactions" body="Checks and expenses recorded for Nashoba Valley will be listed here." />}
      {screen === "vendors" && <Vendors vendors={vendors} accounts={accounts.length} />}
      {screen === "bills" && <Bills documents={documents} onOpen={() => setScreen("bill-pay")} />}
      {screen === "payments" && <ScreenNote title="Bill payments" body="Payments applied to vendor bills will be listed here." />}
      {screen === "job-costing" && <ScreenNote title="Job costing" body="Costs assigned to a job will be listed here." />}
      {screen === "mileage" && <ScreenNote title="Mileage" body="Mileage records will be listed here." />}
      {screen === "contractors" && <ScreenNote title="Contractors" body="Contractors paid outside payroll will be listed here." />}
      {screen === "forms" && <ScreenNote title="1099s" body="1099 worksheets will be listed here." />}
      {screen === "bill-pay" && <BillPay companies={companies} />}
    </div>
  );
}

function Overview({ vendors, accounts, documents }: { vendors: number; accounts: number; documents: Payable[] }) {
  const waiting = documents.filter((document) => !document.qbBillId).length;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardDescription>Vendors stored</CardDescription><CardTitle>{vendors}</CardTitle></CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardDescription>Accounts stored</CardDescription><CardTitle>{accounts}</CardTitle></CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardDescription>Bills not yet in QuickBooks</CardDescription><CardTitle>{waiting}</CardTitle></CardHeader>
      </Card>
    </div>
  );
}

function Vendors({ vendors, accounts }: { vendors: Vendor[]; accounts: number }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const sync = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/accounting/payables/sync");
      return response.json() as Promise<{ vendors: number; accounts: number }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables/reference"] });
      toast({ title: "Vendors and accounts stored", description: `${result.vendors} vendors, ${result.accounts} accounts` });
    },
    onError: (err: Error) => toast({ title: "Could not store the lists", description: err.message, variant: "destructive" }),
  });
  const term = search.trim().toLowerCase();
  const shown = vendors.filter((vendor) => !term || vendor.displayName.toLowerCase().includes(term));
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>{vendors.length} vendors and {accounts} accounts are stored from QuickBooks. Bill Pay uses this list.</CardDescription>
        </div>
        <Button onClick={() => sync.mutate()} disabled={sync.isPending} data-testid="button-store-vendors">
          {sync.isPending ? "Storing" : "Store from QuickBooks"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a vendor" />
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vendors stored yet. Store them from QuickBooks, then read the bill again.</p>
        ) : (
          <div className="max-h-[32rem] overflow-auto border rounded-lg">
            {shown.map((vendor) => (
              <div key={vendor.qbId} className="px-3 py-2 border-b last:border-0 text-sm flex justify-between gap-3">
                <span>{vendor.displayName}</span>
                {vendor.companyName && vendor.companyName !== vendor.displayName && <span className="text-muted-foreground">{vendor.companyName}</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Bills({ documents, onOpen }: { documents: Payable[]; onOpen: () => void }) {
  const invoices = documents.filter((document) => document.documentKind === "invoice" || document.qbBillId);
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Bills</CardTitle>
          <CardDescription>Invoices read in Bill Pay.</CardDescription>
        </div>
        <Button variant="outline" onClick={onOpen}>Open Bill Pay</Button>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {invoices.map((document) => (
              <div key={document.id} className="px-3 py-2 border-b last:border-0 text-sm flex flex-wrap justify-between gap-2">
                <span>{document.vendorName || "Vendor not chosen"} · {document.invoiceNumber || "No number"}</span>
                <span className="text-muted-foreground">{document.billDate?.slice(0, 10) || "—"} · {money(document.amount)}{document.qbBillId ? ` · QuickBooks ${document.qbBillId}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScreenNote({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}
