import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type OpenBill = { id: string; doc: string; date: string; due: string; balance: number };
type ExpenseReview = {
  id: string;
  date: string;
  amount: number;
  accountName: string;
  status: "ready" | "ambiguous" | "unmatched" | "corrected" | "posted-to-payable" | "mixed";
  billDoc?: string;
  note: string;
};
type Review = {
  checkedAt: string;
  vendorName: string;
  vendorBalance: number;
  openBillSum: number;
  inBalance: boolean;
  openBills: OpenBill[];
  expenses: ExpenseReview[];
  readyCount: number;
  recentActions: { action: string; note: string | null; amount: number | null; createdAt: string }[];
};
type DraftPreview = {
  date: string;
  reference: string;
  net: number;
  status: string;
  note: string;
  lines: { doc: string; amount: number }[];
};

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function shortDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${month}/${day}/${year}`;
}

export default function UsFoods() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftPreview[]>([]);

  const review = useQuery<Review>({
    queryKey: ["/api/accounting/us-foods/review"],
  });

  const correct = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/accounting/us-foods/correct");
      return response.json() as Promise<{ closed: number; waiting: number; notes: string[] }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/us-foods/review"] });
      toast({ title: result.closed ? `Closed ${result.closed} invoice${result.closed === 1 ? "" : "s"}` : "No single-invoice drafts were ready", description: result.notes.slice(0, 3).join(" ") });
    },
    onError: (error: Error) => toast({ title: "Could not apply the US Foods drafts", description: error.message, variant: "destructive" }),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/accounting/us-foods/payment-file", { method: "POST", body, credentials: "include" });
      const payload = await response.json().catch(() => ({ message: "Upload failed" }));
      if (!response.ok) throw new Error(payload.message || "Upload failed");
      return payload as { uploadId: string; drafts: DraftPreview[] };
    },
    onSuccess: (result) => {
      setUploadId(result.uploadId);
      setDrafts(result.drafts);
      toast({ title: "Payment file read", description: `${result.drafts.length} draft${result.drafts.length === 1 ? "" : "s"} found.` });
    },
    onError: (error: Error) => toast({ title: "Could not read the payment file", description: error.message, variant: "destructive" }),
  });

  const applyFile = useMutation({
    mutationFn: async () => {
      if (!uploadId) throw new Error("Upload the payment file first.");
      const response = await apiRequest("POST", "/api/accounting/us-foods/payment-file/apply", { uploadId });
      return response.json() as Promise<{ applied: number; notes: string[] }>;
    },
    onSuccess: async (result) => {
      setUploadId(null);
      setDrafts([]);
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/us-foods/review"] });
      toast({ title: result.applied ? `Applied ${result.applied} draft${result.applied === 1 ? "" : "s"}` : "No drafts were applied", description: result.notes.slice(0, 3).join(" ") });
    },
    onError: (error: Error) => toast({ title: "Could not apply the payment file", description: error.message, variant: "destructive" }),
  });

  const data = review.data;
  const readyDrafts = drafts.filter((draft) => draft.status === "ready-offset" || draft.status === "ready-payment");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">US Foods</h2>
          <p className="text-muted-foreground mt-1 max-w-3xl">
            Each morning this checks US Foods, Inc. When the bank feed records a draft as an expense instead of paying the invoice, and that expense matches one open invoice due the same week, the invoice is closed without taking the cash again. A draft that pays several invoices, or includes a credit, is applied from the payment file.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => review.refetch()} disabled={review.isFetching} data-testid="button-us-foods-check">
            {review.isFetching ? "Checking" : "Check now"}
          </Button>
          <Button onClick={() => correct.mutate()} disabled={!data?.readyCount || correct.isPending} data-testid="button-us-foods-correct">
            Close matched invoices
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>QuickBooks open balance</CardDescription>
            <CardTitle className="text-2xl">{data ? money(data.vendorBalance) : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{data?.inBalance ? "Matches the open invoices." : "Does not match the open invoices yet."}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open invoices</CardDescription>
            <CardTitle className="text-2xl">{data ? money(data.openBillSum) : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{data ? `${data.openBills.length} bills still open.` : "Checking QuickBooks."}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bank drafts ready to close</CardDescription>
            <CardTitle className="text-2xl">{data ? data.readyCount : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">One expense, one invoice, due within a week. The daily check closes these.</CardContent>
        </Card>
      </div>

      {review.isError && <p className="text-sm text-destructive">{(review.error as Error).message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Bank drafts in the last 45 days</CardTitle>
          <CardDescription>These are US Foods expenses already on the bank. A draft that covers more than one invoice stays here until the payment file is uploaded.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>What the check found</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.expenses ?? []).map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{shortDate(expense.date)}</TableCell>
                  <TableCell className="text-right">{money(expense.amount)}</TableCell>
                  <TableCell>{expense.accountName || "—"}</TableCell>
                  <TableCell>{expense.note}</TableCell>
                </TableRow>
              ))}
              {data && data.expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">No US Foods bank expenses in the last 45 days.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment file</CardTitle>
          <CardDescription>Upload the US Foods payment activity file when one withdrawal pays several invoices or a credit. Drafts from 2025 are skipped.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending} data-testid="button-us-foods-upload">
              {upload.isPending ? "Reading" : "Upload payment activity"}
            </Button>
            <Button onClick={() => applyFile.mutate()} disabled={!readyDrafts.length || applyFile.isPending} data-testid="button-us-foods-apply-file">
              Apply ready drafts
            </Button>
          </div>
          {drafts.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Draft</TableHead>
                  <TableHead className="text-right">Bank amount</TableHead>
                  <TableHead>Invoices and credits</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((draft) => (
                  <TableRow key={`${draft.date}-${draft.reference}`}>
                    <TableCell>{shortDate(draft.date)} {draft.reference}</TableCell>
                    <TableCell className="text-right">{money(draft.net)}</TableCell>
                    <TableCell>{draft.lines.map((line) => `${line.doc} ${money(line.amount)}`).join(", ")}</TableCell>
                    <TableCell>{draft.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open invoices</CardTitle>
          <CardDescription>These are the US Foods bills still open in QuickBooks.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Bill date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.openBills ?? []).map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell>{bill.doc}</TableCell>
                  <TableCell>{shortDate(bill.date)}</TableCell>
                  <TableCell>{shortDate(bill.due)}</TableCell>
                  <TableCell className="text-right">{money(bill.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(data?.recentActions.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Corrections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.recentActions.map((action, index) => (
              <p key={`${action.createdAt}-${index}`} className="text-sm text-muted-foreground">
                {shortDate(action.createdAt)} · {action.note}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
