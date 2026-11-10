import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TaxLine = { name: string; amount: number; kind: "ma" | "local" | "meals" | "bottle" | "combined" };

type TaxMonth = {
  month: string;
  sales: number;
  maSalesTax: number;
  localSalesTax: number;
  mealsTax: number;
  bottleTax: number;
  filedAt: string;
  paySales: number;
  payMeals: number;
  payBottle: number;
  combined: number;
  lines: TaxLine[];
  generatedAt: string;
  dueDate: string;
  remindedAt: string;
};

type Report = { email: string; year: number; months: TaxMonth[] };

function dollars(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function monthName(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function fileBy(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function dayBefore(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return fileBy(new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10));
}

function readError(error: unknown) {
  return error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "The request failed.";
}

const currentYear = new Date().getFullYear();

export default function BusinessTax() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(String(currentYear));
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");

  const report = useQuery<Report>({
    queryKey: ["/api/accounting/business-tax", year],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/accounting/business-tax?year=${year}`);
      return response.json();
    },
  });

  useEffect(() => {
    if (report.data) setEmail(report.data.email || "");
  }, [report.data]);

  const saveEmail = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/accounting/business-tax/email", { email });
      return response.json() as Promise<{ email: string }>;
    },
    onSuccess: (result) => {
      setEmail(result.email);
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/business-tax", year] });
      toast({ title: "Tax email saved", description: result.email ? `Filing reminders go to ${result.email}.` : "Filing reminders are turned off until an email is saved." });
    },
    onError: (error: Error) => toast({ title: "The email was not saved", description: readError(error), variant: "destructive" }),
  });

  async function fileMonth(month: string) {
    setBuilding(month);
    try {
      await apiRequest("POST", "/api/accounting/business-tax/file", { month });
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/business-tax", year] });
      toast({ title: `${monthName(month)} is filed`, description: "The ACH checks are in QuickBooks." });
    } catch (error) {
      toast({ title: "The ACH was not entered", description: readError(error), variant: "destructive" });
    } finally {
      setBuilding("");
    }
  }

  async function buildMonth(month: string) {
    setBuilding(month);
    try {
      const response = await apiRequest("POST", "/api/accounting/business-tax/generate", { month });
      const result = await response.json() as { orders: number };
      await queryClient.invalidateQueries({ queryKey: ["/api/accounting/business-tax", year] });
      toast({ title: `${monthName(month)} is ready`, description: `Toast returned ${result.orders.toLocaleString("en-US")} checks.` });
    } catch (error) {
      toast({ title: `${monthName(month)} was not built`, description: readError(error), variant: "destructive" });
    } finally {
      setBuilding("");
    }
  }

  const data = report.data;
  const months = data?.months ?? [];
  const names = (kinds: TaxLine["kind"][]) => {
    const rows = new Map<string, number>();
    for (const month of months) {
      for (const line of month.lines) {
        if (!kinds.includes(line.kind)) continue;
        rows.set(line.name, (rows.get(line.name) || 0) + line.amount);
      }
    }
    return [...rows.entries()].sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));
  };

  function monthTable(extra: "sales" | "meals" | "bottle") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>File by</TableHead>
            <TableHead className="text-right">Total sales</TableHead>
            {extra === "sales" && <TableHead className="text-right">MA sales tax</TableHead>}
            {extra === "sales" && <TableHead className="text-right">Local tax</TableHead>}
            <TableHead className="text-right">Meals tax</TableHead>
            <TableHead className="text-right">Bottle tax</TableHead>
            <TableHead>Reminder</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {months.map((month) => (
            <TableRow key={month.month}>
              <TableCell>{monthName(month.month)}</TableCell>
              <TableCell>{fileBy(month.dueDate)}</TableCell>
              <TableCell className="text-right">{dollars(month.sales)}</TableCell>
              {extra === "sales" && <TableCell className="text-right">{dollars(month.maSalesTax)}</TableCell>}
              {extra === "sales" && <TableCell className="text-right">{dollars(month.localSalesTax)}</TableCell>}
              <TableCell className="text-right">{dollars(month.mealsTax)}</TableCell>
              <TableCell className="text-right">{dollars(month.bottleTax)}</TableCell>
              <TableCell>{month.remindedAt ? `Sent ${fileBy(month.remindedAt.slice(0, 10))}` : dayBefore(month.dueDate)}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" disabled={Boolean(building)} onClick={() => buildMonth(month.month)}>
                  {building === month.month ? "Reading Toast..." : "Rebuild"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!months.length && (
            <TableRow>
              <TableCell colSpan={extra === "sales" ? 9 : 7} className="text-muted-foreground">No month has been built from Toast for {year}.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }

  function nameTable(kinds: TaxLine["kind"][]) {
    const rows = names(kinds);
    if (!rows.length) return null;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Toast tax name</TableHead>
            <TableHead className="text-right">Year total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([name, amount]) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
              <TableCell className="text-right">{dollars(amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const closedMonths = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`)
    .filter((month) => month < `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const missing = closedMonths.filter((month) => !months.some((row) => row.month === month));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Business Tax</h2>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Each closed month is read from Toast. Massachusetts sales and meals tax is due on the 30th of the next month, or the last day of February, and the next business day when that date is a weekend or holiday. The saved tax email is notified the day before. Marking the return filed enters an ACH check for the sales account, the meals account, and the bottle account.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="tax-year">Year</Label>
            <Input id="tax-year" className="w-28" value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
          <Button
            disabled={Boolean(building) || !missing.length}
            onClick={async () => {
              for (const month of missing) {
                setBuilding(month);
                try {
                  await apiRequest("POST", "/api/accounting/business-tax/generate", { month });
                } catch (error) {
                  toast({ title: `${monthName(month)} was not built`, description: readError(error), variant: "destructive" });
                  setBuilding("");
                  await queryClient.invalidateQueries({ queryKey: ["/api/accounting/business-tax", year] });
                  return;
                }
              }
              setBuilding("");
              await queryClient.invalidateQueries({ queryKey: ["/api/accounting/business-tax", year] });
              toast({ title: "Toast months are ready", description: `${missing.length} closed ${missing.length === 1 ? "month was" : "months were"} built.` });
            }}
          >
            {building ? `Reading ${monthName(building)}...` : "Build missing months from Toast"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax email</CardTitle>
          <CardDescription>This address receives the filing reminder the day before the return is due. The month is built from Toast on the first day of the next month. The return is due on the 30th.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="tax-email">Email</Label>
            <Input id="tax-email" type="email" className="w-80" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tax@nashobawinery.com" />
          </div>
          <Button variant="outline" disabled={saveEmail.isPending} onClick={() => saveEmail.mutate()}>Save</Button>
        </CardContent>
      </Card>

      {report.isLoading && <p className="text-muted-foreground">Loading the saved months.</p>}
      {report.isError && <p className="text-destructive">{readError(report.error)}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Amounts to file</CardTitle>
          <CardDescription>
            Sales ACH is the Massachusetts sales tax, paid to Comm. of Massachusetts (sales). Meals ACH is the meals tax plus Local Town, paid to Comm of Massachusetts (meal). Bottle ACH is the bottle deposit, paid to Commonwealth of MA - TaxConnect. Each is a check numbered ACH on Clinton Savings Bank. Acknowledging the return enters those checks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>File by</TableHead>
                <TableHead className="text-right">Sales ACH</TableHead>
                <TableHead className="text-right">Meals ACH</TableHead>
                <TableHead className="text-right">Bottle ACH</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((month) => (
                <TableRow key={month.month}>
                  <TableCell>{monthName(month.month)}</TableCell>
                  <TableCell>{fileBy(month.dueDate)}</TableCell>
                  <TableCell className="text-right">{dollars(month.paySales)}</TableCell>
                  <TableCell className="text-right">{dollars(month.payMeals)}</TableCell>
                  <TableCell className="text-right">{dollars(month.payBottle)}</TableCell>
                  <TableCell>
                    {month.filedAt ? (
                      <span className="text-sm text-muted-foreground">Filed {fileBy(month.filedAt.slice(0, 10))}</span>
                    ) : (
                      <Button size="sm" disabled={Boolean(building) || month.combined > 0} onClick={() => fileMonth(month.month)}>
                        {building === month.month ? "Entering ACH..." : "Return filed"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!months.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">Build a month from Toast to see the filing amounts.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">MA Sales Tax</TabsTrigger>
          <TabsTrigger value="meals">MA Meals Tax</TabsTrigger>
          <TabsTrigger value="bottle">Bottle Tax</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MA and local sales tax</CardTitle>
              <CardDescription>MA sales tax is Toast’s sales tax, including the tasting-glass tax. Local tax is shown here. Local Town is paid with the meals ACH. A local line named as sales tax stays on the sales ACH.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthTable("sales")}
              {nameTable(["ma", "local"])}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="meals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MA meals tax</CardTitle>
              <CardDescription>The meals ACH is this meals tax plus Local Town. That is the amount entered for Comm of Massachusetts (meal).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthTable("meals")}
              {nameTable(["meals"])}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bottle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bottle tax</CardTitle>
              <CardDescription>Bottle tax is the bottle deposit Toast charged. It uses the same filing date as the sales and meals return.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthTable("bottle")}
              {nameTable(["bottle"])}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {names(["combined"]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tax names that mix more than one charge</CardTitle>
            <CardDescription>These Toast names mention more than one tax, or they are an unsplit tax total. They are not included in the MA, local, meals, or bottle columns.</CardDescription>
          </CardHeader>
          <CardContent>{nameTable(["combined"])}</CardContent>
        </Card>
      )}
    </div>
  );
}
