import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Vendor = { qbId: string; displayName: string };
type Issue = { severity: "high" | "medium" | "low"; title: string; detail: string };
type Recommendation = { title: string; detail: string };
type ComparedLine = {
  reference: string;
  kind: string;
  statementAmount: number | null;
  booksAmount: number | null;
  booksBalance: number | null;
  status: string;
  note: string;
};
type AnalysisBody = { summary: string; issues: Issue[]; recommendations: Recommendation[]; lines: ComparedLine[] };
type Analysis = {
  id: string;
  qbVendorId: string;
  vendorName: string;
  originalFilename: string;
  mimeType?: string | null;
  statementDate: string | null;
  statementBalance: string | number | null;
  qbBalance: string | number | null;
  analysis: AnalysisBody | string;
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  matched: "Agrees",
  amount: "Amount differs",
  "missing-in-books": "Not in QuickBooks",
  "open-not-on-statement": "Open, not on statement",
  "paid-in-books": "Paid in QuickBooks",
};

function money(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function readAnalysis(value: Analysis["analysis"]): AnalysisBody {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as AnalysisBody;
    } catch {
      return { summary: "", issues: [], recommendations: [], lines: [] };
    }
  }
  return value ?? { summary: "", issues: [], recommendations: [], lines: [] };
}

export default function VendorAnalysis({ vendors }: { vendors: Vendor[] }) {
  const { toast } = useToast();
  const [vendorId, setVendorId] = useState("");
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const history = useQuery<{ analyses: Analysis[] }>({
    queryKey: ["/api/accounting/vendor-analyses"],
  });
  const compare = useMutation({
    mutationFn: async () => {
      if (!vendorId) throw new Error("Choose a vendor");
      if (!file) throw new Error("Choose a statement");
      const body = new FormData();
      body.append("file", file);
      body.append("qbVendorId", vendorId);
      const response = await fetch("/api/accounting/vendor-analyses", { method: "POST", body, credentials: "include" });
      const payload = await response.json().catch(() => ({ message: "Comparison failed" }));
      if (!response.ok) throw new Error(payload.message || "Comparison failed");
      return payload as Analysis;
    },
    onSuccess: async (result) => {
      setCurrentId(result.id);
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/vendor-analyses"] });
      toast({ title: "Statement compared" });
    },
    onError: (error: Error) => toast({ title: "Could not compare the statement", description: error.message, variant: "destructive" }),
  });
  const analyses = history.data?.analyses ?? [];
  const selected = analyses.find((item) => item.id === currentId)
    ?? (compare.data?.id === currentId ? compare.data : null)
    ?? analyses[0]
    ?? null;
  const body = selected ? readAnalysis(selected.analysis) : null;
  const term = search.trim().toLowerCase();
  const shown = vendors.filter((vendor) => !term || vendor.displayName.toLowerCase().includes(term)).slice(0, 40);
  const selectedVendor = vendors.find((vendor) => vendor.qbId === vendorId);
  const options = selectedVendor && !shown.some((vendor) => vendor.qbId === selectedVendor.qbId) ? [selectedVendor, ...shown] : shown;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Vendor account analysis</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Upload a vendor statement. The reading compares it with that vendor’s QuickBooks bills, payments, credits, and balance, then points out what does not agree and how to reconcile it. QuickBooks is not changed.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Compare a statement</CardTitle>
          <CardDescription>Choose the vendor, then the PDF or a photo of the statement.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Vendor</Label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a vendor" />
            <Select value={vendorId || undefined} onValueChange={setVendorId} disabled={vendors.length === 0}>
              <SelectTrigger className="w-72"><SelectValue placeholder={vendors.length ? "Choose a vendor" : "Store vendors first"} /></SelectTrigger>
              <SelectContent>
                {options.map((vendor) => (
                  <SelectItem key={vendor.qbId} value={vendor.qbId}>{vendor.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="vendor-statement">Statement</Label>
            <Input id="vendor-statement" type="file" accept="application/pdf,image/*" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </div>
          <Button disabled={!vendorId || !file || compare.isPending} onClick={() => compare.mutate()}>
            {compare.isPending ? "Comparing" : "Compare"}
          </Button>
        </CardContent>
      </Card>

      {selected && body && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.vendorName}</CardTitle>
            <CardDescription>
              {selected.originalFilename}
              {selected.statementDate ? ` · Statement date ${String(selected.statementDate).slice(0, 10)}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Statement balance</p>
                <p className="text-2xl font-semibold">{money(selected.statementBalance)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">QuickBooks vendor balance</p>
                <p className="text-2xl font-semibold">{money(selected.qbBalance)}</p>
              </div>
            </div>
            {body.summary && <p className="text-sm">{body.summary}</p>}
            {/pdf/i.test(selected.originalFilename) ? (
              <iframe title={selected.originalFilename} src={`/api/accounting/vendor-analyses/${selected.id}/file`} className="w-full h-96 rounded-lg border" />
            ) : /\.(png|jpe?g|webp|gif)$/i.test(selected.originalFilename) ? (
              <img src={`/api/accounting/vendor-analyses/${selected.id}/file`} alt={selected.originalFilename} className="max-h-96 rounded-lg border" />
            ) : null}
            <div>
              <p className="font-medium mb-2">What does not agree</p>
              <div className="space-y-2">
                {body.issues.map((issue) => (
                  <div key={issue.title} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={issue.severity === "high" ? "destructive" : "outline"}>{issue.severity}</Badge>
                      <span className="font-medium">{issue.title}</span>
                    </div>
                    <p>{issue.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">How to reconcile</p>
              <div className="space-y-2">
                {body.recommendations.map((item) => (
                  <div key={item.title} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            {body.lines.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                {body.lines.map((line) => (
                  <div key={`${line.status}-${line.reference}`} className="px-3 py-2 border-b last:border-0 text-sm flex flex-wrap justify-between gap-2">
                    <span>{line.reference} · {statusLabel[line.status] || line.status}</span>
                    <span className="text-muted-foreground">Statement {money(line.statementAmount)} · Books {money(line.booksAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {analyses.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Earlier comparisons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyses.map((item) => (
              <button key={item.id} type="button" className="w-full text-left rounded-lg border px-3 py-2 text-sm hover:bg-muted/40" onClick={() => setCurrentId(item.id)}>
                {item.vendorName} · {item.originalFilename} · {money(item.statementBalance)} vs {money(item.qbBalance)}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
