import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableChoice } from "./SearchableChoice";

type BookAccount = { id: string; name: string; full: string; number: string };
type BookClass = { id: string; name: string; full: string };
type SyncSummary = {
  id: string;
  doc: string;
  txnDate: string;
  businessDate: string;
  created: string;
  note: string;
  lineCount: number;
  debitTotal: number;
  duplicate: boolean;
  missing?: boolean;
  source?: string;
};
type SyncLine = {
  accountId: string;
  accountName: string;
  classId: string;
  className: string;
  posting: "Debit" | "Credit";
  amount: number;
  description: string;
};
type SyncDetail = SyncSummary & { lines: SyncLine[] };

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function when(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
}

export default function DsrSyncLog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lines, setLines] = useState<SyncLine[]>([]);
  const syncsQuery = useQuery<SyncSummary[]>({ queryKey: ["/api/accounting/toast-sales/syncs"] });
  const refsQuery = useQuery<{ accounts: BookAccount[]; classes: BookClass[] }>({ queryKey: ["/api/accounting/toast-sales/accounts"] });
  const detailQuery = useQuery<SyncDetail>({
    queryKey: ["/api/accounting/toast-sales/syncs", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/accounting/toast-sales/syncs/${selectedId}`);
      return response.json() as Promise<SyncDetail>;
    },
  });

  useEffect(() => {
    if (!detailQuery.data || detailQuery.data.id !== selectedId) return;
    setLines(detailQuery.data.lines.map((line) => ({ ...line })));
  }, [detailQuery.data, selectedId]);

  const refresh = async (detail: SyncDetail) => {
    setLines(detail.lines.map((line) => ({ ...line })));
    queryClient.setQueryData(["/api/accounting/toast-sales/syncs", detail.id], detail);
    await queryClient.invalidateQueries({ queryKey: ["/api/accounting/toast-sales/syncs"] });
  };

  const updateJournal = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/accounting/toast-sales/syncs/${selectedId}`, { lines });
      return response.json() as Promise<SyncDetail>;
    },
    onSuccess: async (detail) => {
      await refresh(detail);
      toast({ title: `Updated ${detail.doc}` });
    },
    onError: (error: Error) => toast({ title: "QuickBooks was not changed", description: error.message, variant: "destructive" }),
  });

  const modernize = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/accounting/toast-sales/syncs/${selectedId}/modernize`);
      return response.json() as Promise<SyncDetail>;
    },
    onSuccess: async (detail) => {
      await refresh(detail);
      toast({ title: `Updated ${detail.doc} to the current mapping` });
    },
    onError: (error: Error) => toast({ title: "The journal was not modernized", description: error.message, variant: "destructive" }),
  });

  const postMissing = useMutation({
    mutationFn: async (date: string) => {
      const response = await apiRequest("POST", "/api/accounting/toast-sales/post", { date });
      return response.json() as Promise<{ doc?: string }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/toast-sales/syncs"] });
      toast({ title: result.doc ? `Posted ${result.doc}` : "Posted the missing day" });
    },
    onError: (error: Error) => toast({ title: "The day was not posted", description: error.message, variant: "destructive" }),
  });

  const debit = lines.filter((line) => line.posting === "Debit").reduce((sum, line) => sum + Math.round(line.amount * 100), 0);
  const credit = lines.filter((line) => line.posting === "Credit").reduce((sum, line) => sum + Math.round(line.amount * 100), 0);
  const accounts = refsQuery.data?.accounts ?? [];
  const classes = refsQuery.data?.classes ?? [];

  if (!selectedId) {
    const rows = syncsQuery.data ?? [];
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync log</CardTitle>
          <CardDescription>CT marks a journal created from CellarTraks. Opening one lets you change that journal. It does not post a second copy.</CardDescription>
        </CardHeader>
        <CardContent>
          {syncsQuery.isError ? <p className="text-sm text-muted-foreground">The sync log could not be loaded.</p> : syncsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading the sync log.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Debits</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.businessDate}</TableCell>
                    <TableCell>{row.missing ? "—" : "CT"}</TableCell>
                    <TableCell>
                      {row.missing ? "Not posted" : row.doc}
                      {row.duplicate ? <span className="ml-2 text-xs text-muted-foreground">Duplicate document number</span> : null}
                    </TableCell>
                    <TableCell>{row.missing ? "—" : when(row.created)}</TableCell>
                    <TableCell className="text-right">{row.missing ? "—" : row.lineCount}</TableCell>
                    <TableCell className="text-right">{row.missing ? "—" : money(row.debitTotal)}</TableCell>
                    <TableCell className="text-right">
                      {row.missing ? (
                        <Button variant="ghost" onClick={() => postMissing.mutate(row.businessDate)} disabled={postMissing.isPending}>
                          {postMissing.isPending ? "Posting" : "Post this day"}
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => setSelectedId(row.id)}>Open</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">No Nashoba daily sales journal is in QuickBooks yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  }

  const detail = detailQuery.data;
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{detail?.doc ? `CT · ${detail.doc}` : "Journal"}</CardTitle>
          <CardDescription>
            Source CT, CellarTraks. Sales date {detail?.businessDate || "—"}. Update replaces the lines on this QuickBooks journal. Modernize rebuilds the day from Toast with the mapping saved now, then writes those lines onto this same journal.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => setSelectedId(null)}>Back to the log</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {detailQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading this journal.</p> : detailQuery.isError ? <p className="text-sm text-muted-foreground">This journal could not be loaded.</p> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Debit or credit</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={`${line.accountId}-${index}`}>
                    <TableCell>
                      <SearchableChoice
                        value={line.accountId}
                        fallback={line.accountName}
                        placeholder="Choose an account"
                        searchPlaceholder="Search the chart of accounts..."
                        emptyText="No account matches."
                        options={accounts.map((account) => ({ id: account.id, label: account.number ? `${account.number} ${account.full}` : account.full }))}
                        onChange={(id) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, accountId: id } : item))}
                      />
                    </TableCell>
                    <TableCell>
                      <SearchableChoice
                        value={line.classId}
                        fallback={line.className}
                        placeholder="Choose a class"
                        searchPlaceholder="Search classes..."
                        emptyText="No class matches."
                        options={classes.map((item) => ({ id: item.id, label: item.full }))}
                        onChange={(id) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, classId: id } : item))}
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={line.posting}
                        onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, posting: event.target.value === "Credit" ? "Credit" : "Debit" } : item))}
                      >
                        <option value="Debit">Debit</option>
                        <option value="Credit">Credit</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="ml-auto w-28 text-right"
                        value={line.amount}
                        onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(event.target.value) } : item))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-sm text-muted-foreground">Debits {money(debit / 100)}. Credits {money(credit / 100)}.{debit === credit ? "" : " The two have to match before QuickBooks will take the update."}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => updateJournal.mutate()} disabled={detailQuery.isLoading || lines.length < 2 || updateJournal.isPending || modernize.isPending || debit !== credit}>
                {updateJournal.isPending ? "Updating" : "Update this journal"}
              </Button>
              <Button variant="outline" onClick={() => modernize.mutate()} disabled={updateJournal.isPending || modernize.isPending}>
                {modernize.isPending ? "Rebuilding from Toast" : "Modernize to current mapping and update"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
