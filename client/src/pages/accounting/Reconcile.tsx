import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableChoice } from "./SearchableChoice";

type Account = { id: string; name: string; full: string; number: string; type: string };
type Statement = { id: string; filename: string; period_start: string; period_end: string; account_name: string };
type Proposal = {
  lineId: string;
  date: string;
  description: string;
  memo: string;
  amount: number;
  checkNumber: string;
  action: "match" | "correct-fee" | "correct-cash" | "classify" | "review";
  suggestion: string;
  accountId: string;
  accountName: string;
  bookId: string;
  bookDoc: string;
  bookAmount: number | null;
  correction: number;
  items: { title: string; amount: number }[];
};
type Review = {
  statement: { id: string; accountName: string; accountType: string; filename: string; from: string; through: string };
  month: string;
  opening: number | null;
  closing: number | null;
  deposits: number;
  withdrawals: number;
  cleared: number;
  open: number;
  exact: number;
  corrections: number;
  proposals: Proposal[];
  memory: { pattern: string; kind: string; accountName: string; uses: number }[];
};

function dollars(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function monthName(month: string) {
  const [year, number] = month.split("-");
  return new Date(Number(year), Number(number) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

async function readError(response: Response) {
  const payload = await response.json().catch(() => ({ message: "The request failed." }));
  throw new Error(payload.message || "The request failed.");
}

export default function Reconcile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState("");
  const [statementId, setStatementId] = useState("");
  const [month, setMonth] = useState("");
  const [edits, setEdits] = useState<Record<string, { accountId: string; correction: string }>>({});

  const accountsQuery = useQuery<{ accounts: Account[] }>({
    queryKey: ["/api/accounting/reconcile/accounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounting/reconcile/accounts");
      return response.json();
    },
  });
  const statementsQuery = useQuery<{ statements: Statement[] }>({
    queryKey: ["/api/accounting/reconcile/statements", accountId],
    enabled: Boolean(accountId),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/accounting/reconcile/statements?accountId=${accountId}`);
      return response.json();
    },
  });
  const amazonQuery = useQuery<{ items: number; orders: number; memory: Review["memory"] }>({
    queryKey: ["/api/accounting/reconcile/amazon"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounting/reconcile/amazon");
      return response.json();
    },
  });

  const accounts = accountsQuery.data?.accounts ?? [];
  const accountOptions = accounts.map((account) => ({
    id: account.id,
    label: `${account.number ? `${account.number} ` : ""}${account.full}${account.type === "Bank" || account.type === "Credit Card" ? "" : ` (${account.type})`}`,
  }));
  const statements = statementsQuery.data?.statements ?? [];
  const selectedStatement = statements.find((statement) => statement.id === statementId) || statements[0];
  const activeStatementId = statementId || selectedStatement?.id || "";
  const months = useMemo(() => {
    if (!selectedStatement) return [];
    const start = selectedStatement.period_start.slice(0, 7);
    const end = selectedStatement.period_end.slice(0, 7);
    const values: string[] = [];
    let cursor = start;
    while (cursor <= end && values.length < 18) {
      values.push(cursor);
      const [year, number] = cursor.split("-").map(Number);
      const next = new Date(Date.UTC(year, number, 1));
      cursor = next.toISOString().slice(0, 7);
    }
    return values;
  }, [selectedStatement]);
  const activeMonth = month || months[months.length - 1] || "";
  const reviewQuery = useQuery<Review>({
    queryKey: ["/api/accounting/reconcile", activeStatementId, activeMonth],
    enabled: Boolean(activeStatementId && activeMonth),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/accounting/reconcile?statementId=${activeStatementId}&month=${activeMonth}`);
      return response.json();
    },
  });
  const review = reviewQuery.data?.month === activeMonth && reviewQuery.data.statement.id === activeStatementId ? reviewQuery.data : undefined;

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.set("file", file);
      form.set("accountId", accountId);
      const response = await fetch("/api/accounting/reconcile/statements", { method: "POST", body: form, credentials: "include" });
      if (!response.ok) await readError(response);
      return response.json() as Promise<{ id: string; count: number; from: string; through: string; months: string[] }>;
    },
    onSuccess: (result) => {
      setStatementId(result.id);
      setMonth(result.months[result.months.length - 1] || "");
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/reconcile/statements", accountId] });
      toast({ title: "Statement uploaded", description: `${result.count} lines from ${result.from} through ${result.through}.` });
    },
    onError: (error: Error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" }),
  });

  const uploadAmazon = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/accounting/reconcile/amazon", { method: "POST", body: form, credentials: "include" });
      if (!response.ok) await readError(response);
      return response.json() as Promise<{ added: number; orders: number; items: number }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/reconcile/amazon"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/reconcile", activeStatementId, activeMonth] });
      toast({ title: "Amazon orders added", description: `${result.added} items are available for classification. ${result.orders} orders are stored.` });
    },
    onError: (error: Error) => toast({ title: "Amazon upload failed", description: error.message, variant: "destructive" }),
  });

  const accept = useMutation({
    mutationFn: async (proposal: Proposal) => {
      const edit = edits[proposal.lineId];
      const response = await apiRequest("POST", "/api/accounting/reconcile/accept", {
        lineId: proposal.lineId,
        action: proposal.action,
        accountId: edit?.accountId || proposal.accountId,
        amount: proposal.action === "classify" ? proposal.amount : Number(edit?.correction ?? proposal.correction),
        bookId: proposal.bookId,
        bookDoc: proposal.bookDoc,
      });
      return response.json() as Promise<{ note: string }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/reconcile", activeStatementId, activeMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/reconcile/amazon"] });
      toast({ title: "Recorded", description: result.note });
    },
    onError: (error: Error) => toast({ title: "Not recorded", description: error.message, variant: "destructive" }),
  });

  const acceptMatches = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/accounting/reconcile/accept-matches", { statementId: activeStatementId, month: activeMonth });
      return response.json() as Promise<{ accepted: number }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/reconcile", activeStatementId, activeMonth] });
      toast({ title: "Exact matches cleared", description: `${result.accepted} statement lines were matched to the books.` });
    },
    onError: (error: Error) => toast({ title: "Matches were not cleared", description: error.message, variant: "destructive" }),
  });

  const memory = review?.memory?.length ? review.memory : amazonQuery.data?.memory ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Reconciliation</h2>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Choose the bank or card account, upload its statement, and work one month at a time. The agent matches lines that are already in the books, corrects a close Toast or cash deposit on the daily sales journal, and classifies the rest. An accepted classification is remembered for that payee or Amazon product.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account and statement</CardTitle>
          <CardDescription>Bank accounts and credit cards are listed first. Any other account can be reconciled the same way.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchableChoice
            value={accountId}
            placeholder="Choose an account"
            searchPlaceholder="Search accounts"
            emptyText="No account matches."
            options={accountOptions}
            onChange={(id) => {
              setAccountId(id);
              setStatementId("");
              setMonth("");
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              disabled={!accountId || upload.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
            {selectedStatement && <p className="text-sm text-muted-foreground">{selectedStatement.filename} · {selectedStatement.period_start} through {selectedStatement.period_end}</p>}
          </div>
          {statements.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {statements.map((statement) => (
                <Button key={statement.id} type="button" size="sm" variant={statement.id === activeStatementId ? "default" : "outline"} onClick={() => { setStatementId(statement.id); setMonth(""); }}>
                  {statement.period_start} – {statement.period_end}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amazon orders</CardTitle>
          <CardDescription>
            American Express charges from Amazon can be classified from the items on the order. Upload the order history from Amazon Business. {amazonQuery.data ? `${amazonQuery.data.orders} orders and ${amazonQuery.data.items} items are stored.` : "No Amazon orders are stored yet."} A product you classify is suggested the next time it is ordered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            disabled={uploadAmazon.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadAmazon.mutate(file);
              event.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      {activeStatementId && (
        <Card>
          <CardHeader>
            <CardTitle>{activeMonth ? monthName(activeMonth) : "Month"}</CardTitle>
            <CardDescription>
              {review
                ? `${review.cleared} lines are cleared and ${review.open} are still open. ${review.exact} match a book entry. ${review.corrections} daily sales deposits can be corrected here.`
                : "Choose a month. Reading the books can take a minute."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {months.map((value) => (
                <Button key={value} type="button" size="sm" variant={value === activeMonth ? "default" : "outline"} onClick={() => setMonth(value)}>
                  {monthName(value)}
                </Button>
              ))}
            </div>
            {review && (
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Opening</p><p className="text-lg font-medium">{review.opening == null ? "—" : dollars(review.opening)}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Deposits</p><p className="text-lg font-medium">{dollars(review.deposits)}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Withdrawals</p><p className="text-lg font-medium">{dollars(review.withdrawals)}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Closing</p><p className="text-lg font-medium">{review.closing == null ? "—" : dollars(review.closing)}</p></div>
              </div>
            )}
            <Button type="button" disabled={!review?.exact || acceptMatches.isPending} onClick={() => acceptMatches.mutate()}>
              Accept {review?.exact || 0} exact matches
            </Button>
            {reviewQuery.isFetching && <p className="text-sm text-muted-foreground">The agent is reading this month.</p>}
            {reviewQuery.isError && <p className="text-sm text-destructive">{(reviewQuery.error as Error).message}</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Statement</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Account or difference</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(review?.proposals ?? []).map((proposal) => {
                  const edit = edits[proposal.lineId] || { accountId: proposal.accountId, correction: proposal.correction.toFixed(2) };
                  return (
                    <TableRow key={proposal.lineId}>
                      <TableCell className="whitespace-nowrap">{proposal.date}</TableCell>
                      <TableCell>
                        <p>{proposal.description}</p>
                        {proposal.memo && <p className="text-xs text-muted-foreground">{proposal.memo.slice(0, 140)}</p>}
                        {proposal.checkNumber && <p className="text-xs text-muted-foreground">Check {proposal.checkNumber}</p>}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{dollars(proposal.amount)}</TableCell>
                      <TableCell className="max-w-md text-sm">{proposal.suggestion}</TableCell>
                      <TableCell className="min-w-56">
                        {proposal.action === "classify" || proposal.action === "correct-fee" || proposal.action === "correct-cash" ? (
                          <div className="space-y-2">
                            <SearchableChoice
                              value={edit.accountId}
                              fallback={proposal.accountName}
                              placeholder="Choose an account"
                              searchPlaceholder="Search accounts"
                              emptyText="No account matches."
                              options={accountOptions}
                              onChange={(id) => setEdits((current) => ({ ...current, [proposal.lineId]: { ...edit, accountId: id } }))}
                            />
                            {proposal.action !== "classify" && (
                              <Input
                                value={edit.correction}
                                onChange={(event) => setEdits((current) => ({ ...current, [proposal.lineId]: { ...edit, correction: event.target.value } }))}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{proposal.bookDoc}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {proposal.action !== "review" && (
                          <Button type="button" size="sm" disabled={accept.isPending} onClick={() => accept.mutate(proposal)}>
                            {proposal.action === "match" ? "Match" : proposal.action === "classify" ? "Record" : "Correct"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {review && review.proposals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">Every line in this month is cleared.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {memory.length > 0 && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Remembered classifications</p>
                {memory.map((rule) => (
                  <p key={`${rule.kind}-${rule.pattern}`}>{rule.pattern} → {rule.accountName} · used {rule.uses} time{rule.uses === 1 ? "" : "s"}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
