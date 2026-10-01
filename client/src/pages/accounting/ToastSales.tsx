import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DayLine = { accountName: string; className: string; toast: number; quickbooks: number; difference: number };
type DayReview = {
  date: string;
  orderCount: number;
  journals: { id: string; doc: string; note: string }[];
  deposits: { id: string; total: number; account: string; note: string }[];
  lines: DayLine[];
  unmapped: { kind: string; name: string; amount: number }[];
  plugNote: string;
  matched: boolean;
  mode: "matched" | "correction" | "post-day";
  canPost: boolean;
  postBlock: string | null;
  finding: string;
  bankExpected: number;
};
type ScanRow = { date: string; matched: boolean; mode: string; orderCount: number; unmapped: number; account: string; difference: number; note: string };
type OutstandingReport = {
  cash: { date: string; amount: number; doc: string }[];
  card: { date: string; amount: number; doc: string }[];
  cashTotal: number;
  cardTotal: number;
};
type DepositRow = {
  date: string;
  journalDeposit: number;
  depositDate: string | null;
  bankDeposit: number | null;
  difference: number | null;
  status: "waiting" | "match" | "timing" | "mismatch" | "quiet";
  note: string;
  suggestion: string;
};

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
function yesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

type NoticeSetting = { key: string; label: string; emails: string };

export default function ToastSales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(yesterday);
  const [review, setReview] = useState<DayReview | null>(null);
  const [scan, setScan] = useState<ScanRow[]>([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingReport | null>(null);
  const [pickedCash, setPickedCash] = useState<string[]>([]);
  const [depositedOn, setDepositedOn] = useState(today);
  const [noticeDraft, setNoticeDraft] = useState<Record<string, string>>({});

  const noticeQuery = useQuery<{ notices: NoticeSetting[] }>({
    queryKey: ["/api/accounting/toast-sales/notices"],
  });

  useEffect(() => {
    if (!noticeQuery.data?.notices) return;
    const next: Record<string, string> = {};
    noticeQuery.data.notices.forEach((notice) => { next[notice.key] = notice.emails; });
    setNoticeDraft(next);
  }, [noticeQuery.data]);

  const check = useMutation({
    mutationFn: async (businessDate: string) => {
      const response = await apiRequest("GET", `/api/accounting/toast-sales?date=${businessDate}`);
      return response.json() as Promise<DayReview>;
    },
    onSuccess: (result) => {
      setDate(result.date);
      setReview(result);
    },
    onError: (error: Error) => toast({ title: "Could not check Toast", description: error.message, variant: "destructive" }),
  });

  const scanDays = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/accounting/toast-sales/scan?through=${date}&days=7`);
      return response.json() as Promise<ScanRow[]>;
    },
    onSuccess: (rows) => setScan(rows),
    onError: (error: Error) => toast({ title: "Could not scan the week", description: error.message, variant: "destructive" }),
  });

  const depositsCheck = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/accounting/toast-sales/deposits?through=${date}&days=7`);
      return response.json() as Promise<DepositRow[]>;
    },
    onSuccess: (rows) => setDeposits(rows),
    onError: (error: Error) => toast({ title: "Could not compare deposits", description: error.message, variant: "destructive" }),
  });
  const outstandingCheck = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/accounting/toast-sales/outstanding?through=${today()}`);
      return response.json() as Promise<OutstandingReport>;
    },
    onSuccess: (result) => {
      setOutstanding(result);
      setPickedCash([]);
    },
    onError: (error: Error) => toast({ title: "Could not list deposits", description: error.message, variant: "destructive" }),
  });

  const clearCash = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/accounting/toast-sales/outstanding/clear", { dates: pickedCash, depositedOn });
      return response.json() as Promise<OutstandingReport>;
    },
    onSuccess: (result) => {
      setOutstanding(result);
      setPickedCash([]);
      toast({ title: "Cash marked deposited" });
    },
    onError: (error: Error) => toast({ title: "Cash was not marked deposited", description: error.message, variant: "destructive" }),
  });

  const saveNotices = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/accounting/toast-sales/notices", { notices: noticeDraft });
      return response.json() as Promise<{ notices: NoticeSetting[] }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/accounting/toast-sales/notices"], result);
      toast({ title: "Notice emails saved" });
    },
    onError: (error: Error) => toast({ title: "Notice emails were not saved", description: error.message, variant: "destructive" }),
  });

  const post = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/accounting/toast-sales/post", { date });
      return response.json() as Promise<{ doc: string; mode: string }>;
    },
    onSuccess: async (result) => {
      toast({ title: result.mode === "post-day" ? `Posted ${result.doc}` : `Posted the difference ${result.doc}` });
      const refreshed = await check.mutateAsync(date);
      setReview(refreshed);
    },
    onError: (error: Error) => toast({ title: "QuickBooks was not changed", description: error.message, variant: "destructive" }),
  });

  const gaps = (review?.lines ?? []).filter((line) => line.difference !== 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Toast Sales</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          This replaces Shogo. Toast’s day is mapped to the same QuickBooks accounts and posted as one journal. Each day has a card deposit and a cash deposit. Card batches still in transit, and cash not yet taken to the bank, are listed under Outstanding deposits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notice emails</CardTitle>
          <CardDescription>Each notice can go to more than one person. Separate addresses with a comma. Leave a notice blank to turn it off.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl">
          {(noticeQuery.data?.notices ?? []).map((notice) => (
            <div key={notice.key} className="space-y-2">
              <Label htmlFor={`notice-${notice.key}`}>{notice.label}</Label>
              <Input
                id={`notice-${notice.key}`}
                value={noticeDraft[notice.key] ?? notice.emails}
                onChange={(event) => setNoticeDraft((current) => ({ ...current, [notice.key]: event.target.value }))}
                placeholder="name@nashobawinery.com, other@nashobawinery.com"
              />
            </div>
          ))}
          <Button onClick={() => saveNotices.mutate()} disabled={saveNotices.isPending || !noticeQuery.data}>
            {saveNotices.isPending ? "Saving" : "Save notice emails"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business date</CardTitle>
          <CardDescription>Turn Shogo off for a date before posting that date here. A date Shogo already posted can still be corrected.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="toast-date">Date</Label>
            <Input id="toast-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} data-testid="input-toast-date" />
          </div>
          <Button onClick={() => check.mutate(date)} disabled={check.isPending} data-testid="button-toast-check">
            {check.isPending ? "Checking" : "Check this date"}
          </Button>
          <Button variant="outline" onClick={() => scanDays.mutate()} disabled={scanDays.isPending} data-testid="button-toast-scan">
            {scanDays.isPending ? "Scanning" : "Find a mismatch in the last 7 days"}
          </Button>
          <Button variant="outline" onClick={() => depositsCheck.mutate()} disabled={depositsCheck.isPending} data-testid="button-toast-deposits">
            {depositsCheck.isPending ? "Comparing deposits" : "Compare deposits"}
          </Button>
          <Button variant="outline" onClick={() => outstandingCheck.mutate()} disabled={outstandingCheck.isPending} data-testid="button-toast-outstanding">
            {outstandingCheck.isPending ? "Listing deposits" : "Outstanding deposits"}
          </Button>
        </CardContent>
      </Card>

      {outstanding && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding cash deposits</CardTitle>
              <CardDescription>Cash on each Toast journal. It stays here until you mark it taken to the bank. Several days can be deposited together. Total still here: {money(outstanding.cashTotal)}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {outstanding.cash.length === 0 ? <p className="text-sm text-muted-foreground">No cash is waiting to go to the bank.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Sales date</TableHead>
                      <TableHead>Journal</TableHead>
                      <TableHead className="text-right">Cash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstanding.cash.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>
                          <Checkbox checked={pickedCash.includes(row.date)} onCheckedChange={() => setPickedCash((current) => current.includes(row.date) ? current.filter((item) => item !== row.date) : [...current, row.date])} />
                        </TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.doc}</TableCell>
                        <TableCell className="text-right">{money(row.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cash-deposited-on">Taken to the bank</Label>
                  <Input id="cash-deposited-on" type="date" value={depositedOn} onChange={(event) => setDepositedOn(event.target.value)} />
                </div>
                <Button onClick={() => clearCash.mutate()} disabled={!pickedCash.length || clearCash.isPending}>
                  {clearCash.isPending ? "Saving" : `Mark ${money((outstanding.cash ?? []).filter((row) => pickedCash.includes(row.date)).reduce((sum, row) => sum + row.amount, 0))} deposited`}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Outstanding card deposits</CardTitle>
              <CardDescription>Card batches from the last five days. A batch usually lands the next day, so older ones drop off this list. Total still in transit: {money(outstanding.cardTotal)}.</CardDescription>
            </CardHeader>
            <CardContent>
              {outstanding.card.length === 0 ? <p className="text-sm text-muted-foreground">No card batch is still in transit.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales date</TableHead>
                      <TableHead>Journal</TableHead>
                      <TableHead className="text-right">Cards</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstanding.card.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.doc}</TableCell>
                        <TableCell className="text-right">{money(row.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {deposits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deposits against the journal</CardTitle>
            <CardDescription>The journal amount is the deposit this app would post to Clinton Savings Bank. The deposit is the Clinton Savings amount on that day’s Toast journal. A one-day delay is booked to Toast Deposit in Transit and reversed the next day. Anything that does not wash out is emailed with what to fix.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales date</TableHead>
                  <TableHead className="text-right">Journal</TableHead>
                  <TableHead>Deposit date</TableHead>
                  <TableHead className="text-right">Deposit</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Suggested resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell className="text-right">{money(row.journalDeposit)}</TableCell>
                    <TableCell>{row.depositDate || "—"}</TableCell>
                    <TableCell className="text-right">{row.bankDeposit == null ? "—" : money(row.bankDeposit)}</TableCell>
                    <TableCell className="text-right">{row.difference == null ? "—" : money(row.difference)}</TableCell>
                    <TableCell>{row.suggestion || row.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {scan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Where the days disagree</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Largest gap</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scan.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.matched ? "Matches" : row.note}</TableCell>
                    <TableCell>{row.matched ? "—" : `${row.account} ${money(row.difference)}`}</TableCell>
                    <TableCell>
                      <Button variant="ghost" onClick={() => check.mutate(row.date)}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {review && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{review.date}</CardTitle>
              <CardDescription>{review.orderCount} Toast orders. {review.journals.length ? `Journal ${review.journals.map((journal) => journal.doc).join(", ")} is already in QuickBooks.` : "No Toast journal is in QuickBooks for this date yet."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>{review.finding}</p>
              <p className="text-sm text-muted-foreground">The journal would deposit {money(review.bankExpected)} to Clinton Savings Bank. That deposit is compared after it arrives, not on the sales date.</p>
              {review.plugNote && <p className="text-sm text-muted-foreground">{review.plugNote}</p>}
              {review.postBlock && !review.matched && <p className="text-sm text-muted-foreground">{review.postBlock}</p>}
              <Button onClick={() => post.mutate()} disabled={!review.canPost || post.isPending} data-testid="button-toast-post">
                {review.mode === "post-day" ? "Post this day" : "Post the difference"}
              </Button>
            </CardContent>
          </Card>

          {review.unmapped.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Not in the mapping</CardTitle>
                <CardDescription>These Toast names need an account before the day can be posted.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {review.unmapped.map((item) => (
                      <TableRow key={`${item.kind}-${item.name}`}>
                        <TableCell>{item.kind}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{money(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{gaps.length ? "Accounts that differ" : "Accounts"}</CardTitle>
              <CardDescription>Positive amounts are credits, the way sales appear. The difference is Toast minus QuickBooks.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Toast</TableHead>
                    <TableHead className="text-right">QuickBooks</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(gaps.length ? gaps : review.lines).map((line) => (
                    <TableRow key={`${line.accountName}-${line.className}`}>
                      <TableCell>{line.accountName}</TableCell>
                      <TableCell>{line.className}</TableCell>
                      <TableCell className="text-right">{money(line.toast)}</TableCell>
                      <TableCell className="text-right">{money(line.quickbooks)}</TableCell>
                      <TableCell className="text-right">{money(line.difference)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {review.deposits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bank deposits that day</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {review.deposits.map((deposit) => (
                  <p key={deposit.id} className="text-sm text-muted-foreground">{deposit.account} {money(deposit.total)} {deposit.note}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
