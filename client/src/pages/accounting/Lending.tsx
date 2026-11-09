import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoanLine = {
  id: string;
  txnDate: string;
  description: string;
  txnType: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
  status: string;
  note: string;
};

type Loan = {
  accountNumber: string;
  name: string;
  qbName: string;
  books: number;
  statement: number | null;
  difference: number | null;
  thisYear: { principalPaid: number; interestPaid: number; draws: number; netCashIn: number };
  open: number;
  lines: LoanLine[];
};

type Report = {
  cash: number;
  loans: Loan[];
  others: { id: string; name: string; type: string; balance: number }[];
};

function dollars(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function readError(error: unknown) {
  return error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "The request failed.";
}

export default function Lending() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState<string>("");
  const report = useQuery<Report>({
    queryKey: ["/api/accounting/lending"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounting/lending");
      return response.json();
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/accounting/lending/statements", { method: "POST", body: form, credentials: "include" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: "Upload failed." }));
        throw new Error(payload.message || "Upload failed.");
      }
      return response.json() as Promise<{ accountNumber: string; count: number }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/lending"] });
      toast({ title: "Loan history saved", description: `${result.count} lines for account ${result.accountNumber}. Check QuickBooks to compare them.` });
    },
    onError: (error: Error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" }),
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/accounting/lending/refresh");
      return response.json() as Promise<Report>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/accounting/lending"], result);
      toast({ title: "Loans compared", description: "Farm Credit was compared with the loan balances in QuickBooks." });
    },
    onError: (error: Error) => toast({ title: "QuickBooks was not compared", description: readError(error), variant: "destructive" }),
  });

  const data = report.data;
  const netCash = (data?.loans ?? []).reduce((sum, loan) => sum + loan.thisYear.netCashIn, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Lending</h2>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            A principal payment lowers the loan and lowers cash. It does not lower profit. Interest does lower profit. Money borrowed, and a construction cost that is added to an asset, also stay off profit. Cash in the bank accounts is {data ? dollars(data.cash) : "loading"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={upload.isPending} onClick={() => document.getElementById("loan-history")?.click()}>Upload Farm Credit history</Button>
          <input id="loan-history" type="file" accept=".xls,.xlsx" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = "";
          }} />
          <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>{refresh.isPending ? "Comparing..." : "Compare with QuickBooks"}</Button>
        </div>
      </div>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>2026 cash from these three loans</CardTitle>
            <CardDescription>
              Draws minus principal payments minus interest. A positive number is cash the loans added this year. Profit does not include the draws or the principal.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dollars(netCash)}</CardContent>
        </Card>
      )}

      {(data?.loans ?? []).map((loan) => {
        const exceptions = loan.lines.filter((line) => line.status === "missing" || line.status === "difference" || line.status === "draw");
        const visible = showAll === loan.accountNumber ? loan.lines : exceptions;
        return (
          <Card key={loan.accountNumber}>
            <CardHeader>
              <CardTitle>{loan.name}</CardTitle>
              <CardDescription>
                Farm Credit {loan.accountNumber}. QuickBooks account {loan.qbName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Farm Credit balance</p>
                  <p className="text-lg font-medium">{loan.statement == null ? "Upload the history" : dollars(loan.statement)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">QuickBooks balance</p>
                  <p className="text-lg font-medium">{dollars(loan.books)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Books compared with Farm Credit</p>
                  <p className="text-lg font-medium">{loan.difference == null ? "—" : loan.difference === 0 ? "In balance" : `${dollars(loan.difference)} more on the books`}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">2026 draws, principal, interest</p>
                  <p className="text-sm">{dollars(loan.thisYear.draws)} drawn, {dollars(loan.thisYear.principalPaid)} principal, {dollars(loan.thisYear.interestPaid)} interest</p>
                </div>
              </div>
              {loan.lines.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{exceptions.length ? `${exceptions.length} lines still need a look.` : "Every line matches QuickBooks."}</p>
                    <Button variant="ghost" onClick={() => setShowAll(showAll === loan.accountNumber ? "" : loan.accountNumber)}>
                      {showAll === loan.accountNumber ? "Show exceptions" : "Show every line"}
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Farm Credit</TableHead>
                          <TableHead className="text-right">Principal</TableHead>
                          <TableHead className="text-right">Interest</TableHead>
                          <TableHead>QuickBooks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visible.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>{line.txnDate}</TableCell>
                            <TableCell>{line.description || line.txnType}</TableCell>
                            <TableCell className="text-right">{dollars(line.principal)}</TableCell>
                            <TableCell className="text-right">{dollars(line.interest)}</TableCell>
                            <TableCell className="max-w-md">{line.note || line.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Other liability balances</CardTitle>
            <CardDescription>
              These are the other liability accounts over $1,000. A negative amount is a credit, which is the normal balance for a liability. A positive amount is a debit balance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.others.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell className="text-right">{dollars(row.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {report.isError && <p className="text-sm text-red-700">{readError(report.error)}</p>}
    </div>
  );
}
