import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  daysInRange,
  emptyFallIncentiveSetup,
  incentiveDates,
  incentiveSignature,
  isJobIncluded,
  jobKey,
  majorHolidays,
  parseTiers,
  setupProblem,
  tierBands,
  type FallIncentiveSetup,
  type TierBand,
  type IncentiveEmployeeReport,
  type IncentiveReport,
} from "@shared/fall-incentive";

type Roster = {
  restaurantCount: number;
  jobs: { title: string; employees: { id: string; name: string; restaurantName: string }[] }[];
  employees: { id: string; name: string; restaurantName: string; jobTitles: string[] }[];
};

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function hoursText(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShort(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function clock(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function bandSentence(band: TierBand, dateCount: number) {
  const amount = money(band.rate);
  if (dateCount > 0) {
    if (band.maxDays == null) return `${band.minDays} or more of the ${dateCount} incentive dates earns ${amount} an hour.`;
    if (band.maxDays <= band.minDays) return `${band.minDays} of the ${dateCount} incentive dates earns ${amount} an hour.`;
    return `${band.minDays} to ${band.maxDays} of the ${dateCount} incentive dates earns ${amount} an hour.`;
  }
  if (band.maxDays == null) return `${band.minDays} or more days earns ${amount} an hour.`;
  return `${band.label} earns ${amount} an hour.`;
}

function tierIssue(tier: { minDays: string; rate: string }) {
  if (!tier.minDays && !tier.rate) return null;
  if (!/^\d{1,3}$/.test(tier.minDays) || Number(tier.minDays) < 1) return "Days have to be a whole number, at least 1.";
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(tier.rate)) return "The amount per hour has to be zero or more, with at most two decimals.";
  return null;
}

const instructionsCopy = {
  dates: {
    title: "Incentive dates",
    paragraphs: [
      "Enter the first day and the last day of the incentive.",
      "Saturdays and Sundays between those dates count. A weekday counts only when its holiday box is checked.",
      "Each major holiday in the range is listed with a box, and the boxes start checked.",
      "A holiday on a weekday is added while its box is checked. Clear the box to leave that day out.",
      "A holiday on a weekend is already counted as a weekend day. Clear its box to remove that Saturday or Sunday.",
      "The large number is how many incentive dates you have. The Incentive tab uses that count.",
    ],
  },
  incentive: {
    title: "Incentive",
    paragraphs: [
      "Add a line for each pay level.",
      "At least this many days is the fewest incentive dates a person must work to earn that line.",
      "Amount per hour is paid for every hour worked on an incentive date. It is not paid once per day.",
      "A person earns only the highest line they reach. The lines below it are not added on top.",
      "For $3 at 28 days, $2 when someone works more than 25 but fewer than 28, and $1 from 20 days, enter 28 at $3.00, 26 at $2.00, and 20 at $1.00. That pays $3 for 28 or more, $2 for 26 and 27, and $1 for 20 through 25.",
      "Add a line adds another level. The trash button removes a line.",
      "The box under the lines reads the rules back, using the date count from Incentive Dates.",
    ],
  },
  jobs: {
    title: "Jobs",
    paragraphs: [
      "This list is the job titles from Toast.",
      "Turn a job on to include the people who hold it. Their names appear under the job and start included.",
      "Turn a person off to leave them out. If they also hold another selected job, they are left out of that job too.",
      "Only hours worked in a job you turned on are counted.",
      "Find a job narrows the list. Refresh jobs reads the titles and names from Toast again.",
    ],
  },
  report: {
    title: "Report",
    paragraphs: [
      "Generate report reads Toast time entries for the dates, jobs, and people you chose.",
      "A day counts when the person has hours on that incentive date in a selected job. A shift that is still open counts as a day, and those hours can change.",
      "Hours are regular hours plus overtime. The amount is those hours times the one tier their days worked reach.",
      "Click a name to see each incentive date on the screen.",
      "Download Excel saves a Summary sheet and one sheet for every person on this report. Each person's sheet lists every incentive date, the job, the shift start and end, the hours, and the calculation of hours times the amount per hour.",
    ],
  },
} as const;

export default function PayrollSection() {
  const { toast } = useToast();
  const [setup, setSetup] = useState<FallIncentiveSetup>(emptyFallIncentiveSetup);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [report, setReport] = useState<IncentiveReport | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<keyof typeof instructionsCopy | null>(null);
  const [downloading, setDownloading] = useState(false);
  const hydrated = useRef(false);
  const skipSave = useRef(true);
  const reportBasis = useRef<string | null>(null);
  const loadedSetup = useRef<string | null>(null);
  const reportHydrated = useRef(false);
  const [reportCleared, setReportCleared] = useState(false);

  const saved = useQuery<FallIncentiveSetup>({
    queryKey: ["/api/accounting/fall-incentive"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounting/fall-incentive");
      return response.json();
    },
  });

  const roster = useQuery<Roster>({
    queryKey: ["/api/accounting/fall-incentive/roster"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounting/fall-incentive/roster");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const savedReport = useQuery<IncentiveReport | null>({
    queryKey: ["/api/accounting/fall-incentive/last-report"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/accounting/fall-incentive/last-report");
      return response.json();
    },
  });

  useEffect(() => {
    if (!saved.isSuccess || hydrated.current) return;
    hydrated.current = true;
    loadedSetup.current = incentiveSignature(saved.data);
    setSetup(saved.data);
    setReady(true);
  }, [saved.isSuccess, saved.data]);

  useEffect(() => {
    if (!ready || !savedReport.isSuccess || reportHydrated.current) return;
    reportHydrated.current = true;
    if (!savedReport.data || loadedSetup.current !== incentiveSignature(setup)) return;
    reportBasis.current = loadedSetup.current;
    setReport(savedReport.data);
  }, [ready, savedReport.isSuccess, savedReport.data, setup]);

  useEffect(() => {
    if (!reportBasis.current) return;
    if (incentiveSignature(setup) === reportBasis.current) return;
    reportBasis.current = null;
    setReport(null);
    setDetailId(null);
    setReportCleared(true);
    queryClient.setQueryData(["/api/accounting/fall-incentive/last-report"], null);
  }, [setup]);

  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    setSaveState("Saving…");
    const timer = window.setTimeout(() => {
      void apiRequest("PUT", "/api/accounting/fall-incentive", setup)
        .then(() => setSaveState("Saved"))
        .catch(() => setSaveState("Not saved"));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [setup, ready]);

  const dates = useMemo(
    () => incentiveDates(setup.startDate, setup.endDate, setup.excludedHolidays),
    [setup.startDate, setup.endDate, setup.excludedHolidays],
  );
  const holidays = useMemo(
    () => majorHolidays(setup.startDate, setup.endDate),
    [setup.startDate, setup.endDate],
  );
  const bands = useMemo(() => tierBands(parseTiers(setup.tiers)), [setup.tiers]);
  const duplicateDays = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tier of setup.tiers) {
      if (!/^\d{1,3}$/.test(tier.minDays) || Number(tier.minDays) < 1) continue;
      counts.set(tier.minDays, (counts.get(tier.minDays) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1).map(([days]) => days);
  }, [setup.tiers]);

  const includedPeople = useMemo(() => {
    return (roster.data?.employees ?? []).filter((person) =>
      !setup.excludedEmployeeIds.includes(person.id) && person.jobTitles.some((title) => isJobIncluded(title, setup.includedJobTitles)),
    );
  }, [roster.data, setup.excludedEmployeeIds, setup.includedJobTitles]);

  const showRestaurant = (roster.data?.restaurantCount ?? 0) > 1;
  const visibleJobs = (roster.data?.jobs ?? []).filter((job) => job.title.toLowerCase().includes(jobQuery.trim().toLowerCase()));
  const span = setup.startDate && setup.endDate ? daysInRange(setup.startDate, setup.endDate) : null;
  const dateProblem = setup.startDate && setup.endDate && setup.endDate < setup.startDate
    ? "The end date has to be on or after the start date."
    : span != null && span > 366
      ? "Choose a range of a year or less."
      : span != null && dates.length === 0
        ? "There are no incentive dates in this range."
        : "";
  const reportProblem = roster.isLoading
    ? "Loading jobs from Toast."
    : roster.isError
      ? (roster.error as Error).message.replace(/^\d+:\s*/, "")
      : setupProblem(setup) ?? (includedPeople.length === 0 ? "Choose at least one employee." : null);
  const detail = report?.groups.flatMap((group) => group.employees).find((person) => person.id === detailId) ?? null;

  const generate = useMutation({
    mutationFn: async () => {
      const signature = incentiveSignature(setup);
      const response = await apiRequest("POST", "/api/accounting/fall-incentive/report", setup);
      const next = await response.json() as IncentiveReport;
      return { next, signature };
    },
    onSuccess: ({ next, signature }) => {
      if (incentiveSignature(setup) !== signature) {
        setReport(null);
        setReportCleared(true);
        return;
      }
      reportBasis.current = signature;
      setReport(next);
      setReportCleared(false);
      setDetailId(null);
      setSaveState("Saved");
      queryClient.setQueryData(["/api/accounting/fall-incentive/last-report"], next);
    },
    onError: (error: Error) => {
      toast({ title: "Could not generate the report", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  function updateTier(index: number, field: "minDays" | "rate", value: string) {
    setSetup((current) => ({
      ...current,
      tiers: current.tiers.map((tier, tierIndex) => tierIndex === index ? { ...tier, [field]: value } : tier),
    }));
  }

  async function downloadExcel() {
    if (!report) return;
    setDownloading(true);
    try {
      const response = await apiRequest("POST", "/api/accounting/fall-incentive/export", report);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const first = report.dates[0] ?? "report";
      const last = report.dates[report.dates.length - 1] ?? first;
      link.href = url;
      link.download = `fall-incentive-${first}-to-${last}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "The Excel file could not be created.";
      toast({ title: "Could not download the report", description: message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }

  const lowest = bands[bands.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Payroll</h2>
          <p className="text-muted-foreground mt-1 max-w-3xl">Paychecks and payroll liabilities.</p>
        </div>
        {saveState ? <p className={saveState === "Not saved" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{saveState}</p> : null}
      </div>

      {saved.isError ? (
        <p className="text-sm text-destructive">The saved incentive could not be loaded. Refresh the page before entering dates.</p>
      ) : !ready ? (
        <Skeleton className="h-64 w-full" />
      ) : (
      <Tabs defaultValue="fall-incentive">
        <TabsList>
          <TabsTrigger value="fall-incentive" data-testid="tab-fall-incentive">Fall Incentive</TabsTrigger>
        </TabsList>
        <TabsContent value="fall-incentive" className="mt-4">
          <Tabs defaultValue="dates">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="dates" data-testid="tab-incentive-dates">Incentive Dates</TabsTrigger>
              <TabsTrigger value="incentive" data-testid="tab-incentive-tiers">Incentive</TabsTrigger>
              <TabsTrigger value="jobs" data-testid="tab-incentive-jobs">Jobs</TabsTrigger>
              <TabsTrigger value="report" data-testid="tab-incentive-report">Report</TabsTrigger>
            </TabsList>

            <TabsContent value="dates" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Incentive dates</CardTitle>
                    <CardDescription>
                      Saturdays and Sundays in the range count. Major holidays are listed below and count unless you clear them. Clearing a holiday that falls on a weekend removes that day.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setInstructions("dates")} data-testid="button-instructions-dates">Instructions</Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="incentive-start">Incentive start date</Label>
                      <Input id="incentive-start" type="date" value={setup.startDate} onChange={(event) => setSetup({ ...setup, startDate: event.target.value })} data-testid="input-incentive-start" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incentive-end">Incentive end date</Label>
                      <Input id="incentive-end" type="date" value={setup.endDate} onChange={(event) => setSetup({ ...setup, endDate: event.target.value })} data-testid="input-incentive-end" />
                    </div>
                  </div>
                  {dateProblem ? <p className="text-sm text-destructive">{dateProblem}</p> : null}
                  <div>
                    <p className="text-3xl font-semibold tabular-nums" data-testid="text-incentive-date-count">{dates.length}</p>
                    <p className="text-sm text-muted-foreground">incentive {dates.length === 1 ? "date" : "dates"}</p>
                  </div>
                  {dates.length > 0 ? (
                    <p className="text-sm text-muted-foreground">{dates.map(formatShort).join(", ")}</p>
                  ) : null}
                  <div className="space-y-3">
                    <h3 className="font-medium">Major holidays in this range</h3>
                    {!setup.startDate || !setup.endDate ? (
                      <p className="text-sm text-muted-foreground">Enter both dates to see the holidays.</p>
                    ) : holidays.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No major holidays fall in this range.</p>
                    ) : (
                      <div className="space-y-2">
                        {holidays.map((holiday) => {
                          const included = !setup.excludedHolidays.includes(holiday.date);
                          return (
                            <div key={holiday.date} className="flex items-start gap-3 rounded-md border px-3 py-2">
                              <Checkbox
                                id={`holiday-${holiday.date}`}
                                checked={included}
                                onCheckedChange={(value) => {
                                  setSetup((current) => {
                                    const excluded = current.excludedHolidays.filter((date) => date !== holiday.date);
                                    if (value !== true) excluded.push(holiday.date);
                                    return { ...current, excludedHolidays: excluded };
                                  });
                                }}
                                className="mt-1"
                                data-testid={`checkbox-holiday-${holiday.date}`}
                              />
                              <Label htmlFor={`holiday-${holiday.date}`} className="font-normal">
                                <span className="font-medium">{holiday.name}</span>
                                <span className="block text-sm text-muted-foreground">
                                  {formatDay(holiday.date)} · {holiday.weekend ? "weekend, already in the count unless you clear it" : "weekday, added when this box is checked"}
                                </span>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="incentive" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Incentive</CardTitle>
                    <CardDescription>
                      Each line is the fewest incentive days someone must work to earn that amount per hour. An employee earns the highest line they reach, not every line below it.
                      {dates.length > 0 ? ` This period has ${dates.length} incentive ${dates.length === 1 ? "date" : "dates"}.` : ""}
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setInstructions("incentive")} data-testid="button-instructions-incentive">Instructions</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {setup.tiers.map((tier, index) => {
                    const issue = tierIssue(tier);
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`tier-days-${index}`}>At least this many days</Label>
                            <Input
                              id={`tier-days-${index}`}
                              type="number"
                              min={1}
                              step={1}
                              value={tier.minDays}
                              onChange={(event) => updateTier(index, "minDays", event.target.value)}
                              className="w-40"
                              data-testid={`input-tier-days-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`tier-rate-${index}`}>Amount per hour</Label>
                            <Input
                              id={`tier-rate-${index}`}
                              type="number"
                              min={0}
                              step="0.01"
                              value={tier.rate}
                              onChange={(event) => updateTier(index, "rate", event.target.value)}
                              className="w-40"
                              data-testid={`input-tier-rate-${index}`}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSetup((current) => {
                                if (current.tiers.length === 1) return { ...current, tiers: [{ minDays: "", rate: "" }] };
                                return { ...current, tiers: current.tiers.filter((_, tierIndex) => tierIndex !== index) };
                              });
                            }}
                            aria-label="Remove this line"
                            data-testid={`button-remove-tier-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {issue ? <p className="text-sm text-destructive">{issue}</p> : null}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSetup((current) => ({ ...current, tiers: [...current.tiers, { minDays: "", rate: "" }] }))}
                    data-testid="button-add-tier"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add a line
                  </Button>
                  {duplicateDays.length > 0 ? (
                    <p className="text-sm text-amber-700">
                      More than one line starts at {duplicateDays.join(" and ")} days. The higher amount per hour is the one that will be used.
                    </p>
                  ) : null}
                  {bands.length > 0 ? (
                    <div className="rounded-md border p-4 text-sm space-y-1" data-testid="text-incentive-ladder">
                      {bands.map((band) => (
                        <p key={`${band.minDays}-${band.rate}`}>{bandSentence(band, dates.length)}</p>
                      ))}
                      {lowest && lowest.minDays > 1 ? <p>Fewer than {lowest.minDays} days earns no incentive.</p> : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jobs" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Jobs</CardTitle>
                    <CardDescription>
                      Turn on a job to include the people who hold it. Each person starts included. Turn a person off to leave them out.
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" onClick={() => setInstructions("jobs")} data-testid="button-instructions-jobs">Instructions</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void apiRequest("GET", "/api/accounting/fall-incentive/roster?refresh=1")
                          .then((response) => response.json())
                          .then((data: Roster) => queryClient.setQueryData(["/api/accounting/fall-incentive/roster"], data))
                          .catch((error: Error) => toast({ title: "Could not refresh jobs", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" }));
                      }}
                      disabled={roster.isFetching}
                      data-testid="button-refresh-jobs"
                    >
                      Refresh jobs
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roster.isLoading ? <Skeleton className="h-40 w-full" /> : null}
                  {roster.isError ? <p className="text-sm text-destructive">{(roster.error as Error).message.replace(/^\d+:\s*/, "")}</p> : null}
                  {roster.data ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {setup.includedJobTitles.length} {setup.includedJobTitles.length === 1 ? "job" : "jobs"} included · {includedPeople.length} {includedPeople.length === 1 ? "employee" : "employees"} included
                      </p>
                      <div className="max-w-sm space-y-2">
                        <Label htmlFor="job-search">Find a job</Label>
                        <Input id="job-search" value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} placeholder="Server, cook, host" data-testid="input-job-search" />
                      </div>
                      {roster.data.jobs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Toast did not return any jobs.</p>
                      ) : visibleJobs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No jobs match.</p>
                      ) : null}
                      <div className="space-y-3">
                        {visibleJobs.map((job) => {
                          const on = isJobIncluded(job.title, setup.includedJobTitles);
                          return (
                            <div key={job.title} className="rounded-md border">
                              <div className="flex items-center justify-between gap-3 px-3 py-3">
                                <div>
                                  <Label htmlFor={`job-${slug(job.title)}`} className="text-base">{job.title}</Label>
                                  <p className="text-sm text-muted-foreground">{job.employees.length} {job.employees.length === 1 ? "employee" : "employees"}</p>
                                </div>
                                <Switch
                                  id={`job-${slug(job.title)}`}
                                  checked={on}
                                  onCheckedChange={(checked) => {
                                    setSetup((current) => {
                                      const included = current.includedJobTitles.filter((title) => jobKey(title) !== jobKey(job.title));
                                      if (checked) included.push(job.title);
                                      return { ...current, includedJobTitles: included };
                                    });
                                  }}
                                  data-testid={`switch-job-${slug(job.title)}`}
                                />
                              </div>
                              {on ? (
                                <div className="space-y-2 border-t px-3 py-3">
                                  {job.employees.length === 0 ? <p className="text-sm text-muted-foreground">Nobody is assigned to this job.</p> : null}
                                  {job.employees.map((person) => {
                                    const included = !setup.excludedEmployeeIds.includes(person.id);
                                    return (
                                      <div key={person.id} className="flex items-center justify-between gap-3">
                                        <Label htmlFor={`employee-${slug(job.title)}-${slug(person.id)}`} className="font-normal">
                                          {person.name}
                                          {showRestaurant ? <span className="block text-sm text-muted-foreground">{person.restaurantName}</span> : null}
                                        </Label>
                                        <Switch
                                          id={`employee-${slug(job.title)}-${slug(person.id)}`}
                                          checked={included}
                                          onCheckedChange={(checked) => {
                                            setSetup((current) => {
                                              const excluded = current.excludedEmployeeIds.filter((id) => id !== person.id);
                                              if (!checked) excluded.push(person.id);
                                              return { ...current, excludedEmployeeIds: excluded };
                                            });
                                          }}
                                          data-testid={`switch-employee-${person.id}`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Report</CardTitle>
                    <CardDescription>
                      Days and hours come from Toast time entries on the incentive dates, for the jobs you turned on. Regular hours and overtime both count. The amount is those hours times the one tier the employee reached.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setInstructions("report")} data-testid="button-instructions-report">Instructions</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {dates.length} incentive {dates.length === 1 ? "date" : "dates"} · {bands.length} {bands.length === 1 ? "tier" : "tiers"} · {includedPeople.length} {includedPeople.length === 1 ? "employee" : "employees"}
                  </p>
                  {reportProblem ? <p className="text-sm text-muted-foreground">{reportProblem}</p> : null}
                  {!report && reportCleared ? <p className="text-sm text-muted-foreground">The dates, incentive, or jobs changed. Generate the report again.</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => generate.mutate()} disabled={Boolean(reportProblem) || generate.isPending} data-testid="button-generate-incentive">
                      {generate.isPending ? "Reading Toast time entries…" : "Generate report"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void downloadExcel()} disabled={!report || downloading} data-testid="button-download-incentive">
                      {downloading ? "Preparing Excel…" : "Download Excel"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {report ? (
                <div className="space-y-4" data-testid="incentive-report">
                  <Card>
                    <CardContent className="grid gap-4 py-6 sm:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Incentive total</p>
                        <p className="text-2xl font-semibold tabular-nums">{money(report.total)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Employees who qualify</p>
                        <p className="text-2xl font-semibold tabular-nums">{report.qualifiedCount} of {report.employeeCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Incentive dates</p>
                        <p className="text-2xl font-semibold tabular-nums">{report.dateCount}</p>
                      </div>
                    </CardContent>
                  </Card>
                  {report.openShifts > 0 ? (
                    <p className="text-sm text-amber-700">
                      {report.openShifts} {report.openShifts === 1 ? "employee has a shift" : "employees have a shift"} that is still open, so those hours can change.
                    </p>
                  ) : null}
                  {report.groups.map((group) => {
                    const body = group.employees.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No one reached this tier.</p>
                    ) : (
                      <EmployeeTable
                        employees={group.employees}
                        showRestaurant={showRestaurant}
                        onOpen={setDetailId}
                      />
                    );
                    const heading = (
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{group.key === "none" ? group.label : `${money(group.rate)} per hour`}</h3>
                          {group.key !== "none" ? <p className="text-sm text-muted-foreground">{group.label}</p> : null}
                        </div>
                        <p className="text-sm tabular-nums">{group.employees.length} {group.employees.length === 1 ? "employee" : "employees"} · {money(group.total)}</p>
                      </div>
                    );
                    if (group.key === "none") {
                      return (
                        <details key={group.key} className="rounded-lg border p-4">
                          <summary className="cursor-pointer font-medium">{group.label} · {group.employees.length}</summary>
                          <div className="mt-4">{body}</div>
                        </details>
                      );
                    }
                    return (
                      <Card key={group.key}>
                        <CardHeader>{heading}</CardHeader>
                        <CardContent>{body}</CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{detail?.name ?? "Employee"}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.daysWorked} of ${report?.dateCount ?? 0} incentive days · ${hoursText(detail.hours)} hours · ${money(detail.rate)} per hour · ${money(detail.total)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail?.openShift ? <p className="text-sm text-amber-700">A shift is still open, so these hours can change.</p> : null}
          {detail ? (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Worked</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.days.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{formatDay(day.date)}</TableCell>
                      <TableCell>{day.worked ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        {day.punches.length === 0 ? "—" : day.punches.map((punch, index) => (
                          <div key={`${punch.inAt ?? index}-${punch.jobTitle}`}>
                            {punch.jobTitle}: {clock(punch.inAt) || "—"} – {punch.open ? "Still clocked in" : clock(punch.outAt) || "—"}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{hoursText(day.hours)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={instructions !== null} onOpenChange={(open) => { if (!open) setInstructions(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{instructions ? instructionsCopy[instructions].title : "Instructions"}</DialogTitle>
            <DialogDescription>What to enter on this tab.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {instructions ? instructionsCopy[instructions].paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeTable({
  employees,
  showRestaurant,
  onOpen,
}: {
  employees: IncentiveEmployeeReport[];
  showRestaurant: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead className="text-right">Days worked</TableHead>
          <TableHead className="text-right">Hours worked</TableHead>
          <TableHead className="text-right">Per hour</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((person) => (
          <TableRow key={person.id}>
            <TableCell>
              <button type="button" className="text-left font-medium text-[#2ca01c] underline-offset-2 hover:underline" onClick={() => onOpen(person.id)} data-testid={`button-employee-${person.id}`}>
                {person.name}
              </button>
              {person.openShift ? <span className="block text-xs text-amber-700">Shift still open</span> : null}
              {showRestaurant ? <span className="block text-xs text-muted-foreground">{person.restaurantName}</span> : null}
            </TableCell>
            <TableCell className="text-right tabular-nums">{person.daysWorked}</TableCell>
            <TableCell className="text-right tabular-nums">{hoursText(person.hours)}</TableCell>
            <TableCell className="text-right tabular-nums">{money(person.rate)}</TableCell>
            <TableCell className="text-right tabular-nums">{money(person.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
