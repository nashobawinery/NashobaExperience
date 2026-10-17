import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableChoice } from "./SearchableChoice";

type OpenBill = {
  id: string;
  vendorId: string;
  vendorName: string;
  docNumber: string;
  txnDate: string | null;
  dueDate: string | null;
  total: number;
  balance: number;
  daysPastDue: number;
  bucket: "current" | "1-30" | "31-60" | "61-90" | "91+";
};

type BankAccount = { qbId: string; name: string; accountType: string };

type Payment = {
  id: string;
  txnDate: string | null;
  vendorName: string;
  total: number;
  payType: string;
  docNumber: string;
  accountName: string;
  billCount: number;
};

type Expense = {
  id: string;
  txnDate: string | null;
  vendorName: string;
  total: number;
  paymentType: string;
  docNumber: string;
  accountName: string;
  expenseAccount: string;
  memo: string;
  credit: boolean;
};

const buckets = [
  { id: "all", label: "All" },
  { id: "current", label: "Current" },
  { id: "overdue", label: "Overdue" },
  { id: "1-30", label: "1–30" },
  { id: "31-60", label: "31–60" },
  { id: "61-90", label: "61–90" },
  { id: "91+", label: "91+" },
] as const;

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function shortDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${Number(month)}/${Number(day)}/${year}`;
}

function queryError(error: unknown) {
  const message = error instanceof Error ? error.message : "QuickBooks did not respond.";
  return message.replace(/^\d+:\s*/, "");
}

export function OpenBills() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<(typeof buckets)[number]["id"]>("all");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState("");
  const [payDate, setPayDate] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [armed, setArmed] = useState(false);
  const open = useQuery<{ companyName: string; asOf: string; bills: OpenBill[]; banks: BankAccount[]; totals: { count: number; balance: number; overdue: number } }>({
    queryKey: ["/api/accounting/payables/open"],
  });

  const pay = useMutation({
    mutationFn: async () => {
      const bills = open.data?.bills ?? [];
      const chosen = bills.filter((bill) => selected[bill.id] != null);
      const vendorId = chosen[0]?.vendorId;
      if (!vendorId || chosen.some((bill) => bill.vendorId !== vendorId)) throw new Error("Choose bills from one vendor.");
      const response = await apiRequest("POST", "/api/accounting/payables/payments", {
        vendorId,
        accountId,
        txnDate: payDate || open.data?.asOf,
        docNumber,
        lines: chosen.map((bill) => ({ billId: bill.id, amount: selected[bill.id] })),
      });
      return response.json() as Promise<{ qbPaymentId: string; total: number; accountName: string }>;
    },
    onSuccess: async (result) => {
      setSelected({});
      setDocNumber("");
      setArmed(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables/open"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/payables/payments"] });
      toast({ title: "Payment recorded in QuickBooks", description: `${money(result.total)} from ${result.accountName}. Payment ${result.qbPaymentId}.` });
    },
    onError: (err: Error) => {
      setArmed(false);
      toast({ title: "The payment was not recorded", description: queryError(err), variant: "destructive" });
    },
  });

  const bills = open.data?.bills ?? [];
  const term = search.trim().toLowerCase();
  const shown = useMemo(() => bills.filter((bill) => {
    const matchesBucket = bucket === "all" || (bucket === "overdue" ? bill.daysPastDue > 0 : bill.bucket === bucket);
    const matchesSearch = !term || `${bill.vendorName} ${bill.docNumber}`.toLowerCase().includes(term);
    return matchesBucket && matchesSearch;
  }), [bills, bucket, term]);
  const chosen = bills.filter((bill) => selected[bill.id] != null);
  const vendorIds = new Set(chosen.map((bill) => bill.vendorId));
  const oneVendor = vendorIds.size === 1;
  const amounts = chosen.map((bill) => Number(selected[bill.id]));
  const amountsOk = amounts.every((amount, index) => Number.isFinite(amount) && amount > 0 && amount <= chosen[index].balance + 0.001);
  const payTotal = amounts.reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0);
  const banks = open.data?.banks ?? [];

  function toggle(bill: OpenBill, checked: boolean) {
    setArmed(false);
    setSelected((current) => {
      const next = { ...current };
      if (checked) next[bill.id] = bill.balance.toFixed(2);
      else delete next[bill.id];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Open bills</CardDescription><CardTitle>{open.data?.totals.count ?? "—"}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Open balance</CardDescription><CardTitle>{open.data ? money(open.data.totals.balance) : "—"}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Past due</CardDescription><CardTitle>{open.data ? money(open.data.totals.overdue) : "—"}</CardTitle></CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Open bills</CardTitle>
            <CardDescription>
              Unpaid vendor bills in {open.data?.companyName || "QuickBooks"}. Select bills from one vendor, choose the bank account, and record the payment there.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => open.refetch()} disabled={open.isFetching}>Refresh</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a vendor or invoice" className="max-w-xs" />
            {buckets.map((item) => (
              <Button key={item.id} type="button" size="sm" variant={bucket === item.id ? "default" : "outline"} onClick={() => setBucket(item.id)}>
                {item.label}
              </Button>
            ))}
          </div>
          {open.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : open.error ? (
            <p className="text-sm text-destructive">{queryError(open.error)}</p>
          ) : shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open bills match this view.</p>
          ) : (
            <div className="border rounded-lg overflow-auto">
              {shown.map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-0 text-sm cursor-pointer" onClick={() => toggle(bill, selected[bill.id] == null)}>
                  <Checkbox checked={selected[bill.id] != null} onClick={(event) => event.stopPropagation()} onCheckedChange={(checked) => toggle(bill, checked === true)} />
                  <span className="min-w-40 flex-1">{bill.vendorName}</span>
                  <span className="w-28 text-muted-foreground">{bill.docNumber || "No number"}</span>
                  <span className="w-24 text-muted-foreground">{shortDate(bill.dueDate)}</span>
                  <span className={`w-24 ${bill.daysPastDue > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {bill.daysPastDue > 0 ? `${bill.daysPastDue} days` : "Current"}
                  </span>
                  <span className="w-28 text-right">{money(bill.balance)}</span>
                </div>
              ))}
            </div>
          )}
          {chosen.length > 0 && (
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="font-medium">Pay {oneVendor ? chosen[0].vendorName : "the selected bills"}</p>
                <p className="text-sm text-muted-foreground">
                  {oneVendor ? "The amount on each bill can be less than the open balance." : "A payment covers one vendor. Clear the extra vendor before continuing."}
                </p>
              </div>
              <div className="space-y-2">
                {chosen.map((bill) => (
                  <div key={bill.id} className="grid gap-2 md:grid-cols-[1fr_8rem] items-center text-sm">
                    <span>{bill.docNumber || "No number"} · open {money(bill.balance)}</span>
                    <Input
                      value={selected[bill.id] ?? ""}
                      inputMode="decimal"
                      onChange={(event) => {
                        setArmed(false);
                        setSelected((current) => ({ ...current, [bill.id]: event.target.value }));
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Pay from</Label>
                  <SearchableChoice
                    value={accountId}
                    placeholder={banks.length ? "Choose an account" : "Store accounts first"}
                    searchPlaceholder="Find an account"
                    emptyText="No bank accounts stored"
                    options={banks.map((bank) => ({ id: bank.qbId, label: `${bank.name} · ${bank.accountType}` }))}
                    onChange={(id) => { setAccountId(id); setArmed(false); }}
                    disabled={banks.length === 0}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ap-pay-date">Payment date</Label>
                  <Input id="ap-pay-date" type="date" value={payDate || open.data?.asOf || ""} onChange={(event) => { setPayDate(event.target.value); setArmed(false); }} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ap-pay-number">Check or reference</Label>
                  <Input id="ap-pay-number" value={docNumber} onChange={(event) => { setDocNumber(event.target.value); setArmed(false); }} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">{money(payTotal)}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelected({}); setArmed(false); }}>Clear</Button>
                  <Button
                    disabled={!oneVendor || !accountId || !amountsOk || pay.isPending}
                    onClick={() => {
                      if (!armed) {
                        setArmed(true);
                        return;
                      }
                      pay.mutate();
                    }}
                  >
                    {pay.isPending ? "Recording" : armed ? `Confirm ${money(payTotal)}` : "Pay selected"}
                  </Button>
                </div>
              </div>
              {!amountsOk && <p className="text-sm text-destructive">Each amount has to be greater than zero and no more than that bill's open balance.</p>}
              {banks.length === 0 && <p className="text-sm text-muted-foreground">Store accounts from QuickBooks on the Vendors screen before paying.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function BillPayments() {
  const payments = useQuery<{ companyName: string; since: string; payments: Payment[] }>({
    queryKey: ["/api/accounting/payables/payments"],
  });
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const shown = (payments.data?.payments ?? []).filter((payment) => !term || `${payment.vendorName} ${payment.docNumber} ${payment.accountName}`.toLowerCase().includes(term));
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Bill payments</CardTitle>
          <CardDescription>
            Payments recorded in {payments.data?.companyName || "QuickBooks"} since {shortDate(payments.data?.since ?? null)}. Pay open bills from the Bills screen.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => payments.refetch()} disabled={payments.isFetching}>Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a vendor, check, or account" className="max-w-sm" />
        {payments.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : payments.error ? (
          <p className="text-sm text-destructive">{queryError(payments.error)}</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bill payments in this period.</p>
        ) : (
          <div className="border rounded-lg overflow-auto">
            {shown.map((payment) => (
              <div key={payment.id} className="px-3 py-2 border-b last:border-0 text-sm flex flex-wrap justify-between gap-2">
                <span>{shortDate(payment.txnDate)} · {payment.vendorName}</span>
                <span className="text-muted-foreground">
                  {payment.docNumber || payment.payType || "Payment"} · {payment.accountName || "Account"} · {payment.billCount} bill{payment.billCount === 1 ? "" : "s"} · {money(payment.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpenseTransactions() {
  const expenses = useQuery<{ companyName: string; since: string; expenses: Expense[] }>({
    queryKey: ["/api/accounting/payables/expenses"],
  });
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const shown = (expenses.data?.expenses ?? []).filter((expense) => !term || `${expense.vendorName} ${expense.docNumber} ${expense.expenseAccount} ${expense.memo}`.toLowerCase().includes(term));
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Expense transactions</CardTitle>
          <CardDescription>
            Checks, cash, and credit-card charges in {expenses.data?.companyName || "QuickBooks"} since {shortDate(expenses.data?.since ?? null)}. These are expenses recorded directly, not bills.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => expenses.refetch()} disabled={expenses.isFetching}>Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a vendor, check, or account" className="max-w-sm" />
        {expenses.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : expenses.error ? (
          <p className="text-sm text-destructive">{queryError(expenses.error)}</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expense transactions in this period.</p>
        ) : (
          <div className="border rounded-lg overflow-auto">
            {shown.map((expense) => (
              <div key={expense.id} className="px-3 py-2 border-b last:border-0 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>{shortDate(expense.txnDate)} · {expense.vendorName}</span>
                  <span>{expense.credit ? "−" : ""}{money(expense.total)}</span>
                </div>
                <p className="text-muted-foreground">
                  {expense.paymentType || "Expense"}{expense.docNumber ? ` ${expense.docNumber}` : ""} · {expense.accountName || "Bank"}{expense.expenseAccount ? ` · ${expense.expenseAccount}` : ""}
                  {expense.memo ? ` · ${expense.memo}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
