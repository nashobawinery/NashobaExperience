import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

type RestaurantCall = {
  id: string;
  callerName: string;
  phone: string | null;
  callTime: string | null;
  summary: string | null;
  transcript: string;
  recordedAt: string;
  late: boolean;
  reservation: boolean;
  recordingUrl: string | null;
};

const STORAGE_KEY = "js-calls-access";

function formatRecorded(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function CodeGate({ onReady }: { onReady: (token: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/js-calls/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof body.message === "string" ? body.message : "That code is not recognized.");
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, body.token);
      onReady(body.token);
    } catch {
      setError("The page could not check the code. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border bg-background p-6">
      <h1 className="font-serif text-2xl">J's Restaurant Calls</h1>
      <p className="text-sm text-muted-foreground">Enter the 4-digit code to read call transcripts.</p>
      <input
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
        className="h-12 w-full rounded-md border bg-background text-center text-2xl tracking-[0.4em]"
        data-testid="input-js-calls-code"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={code.length !== 4 || pending} data-testid="button-js-calls-continue">
        {pending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

function CallCard({ call }: { call: RestaurantCall }) {
  const [open, setOpen] = useState(call.late);
  return (
    <article className="rounded-lg border bg-background p-4" data-testid={`js-call-${call.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{call.callerName}</h2>
          <p className="text-sm text-muted-foreground">{call.callTime || formatRecorded(call.recordedAt)}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {call.late && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Running late</span>}
          {call.reservation && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900">Reservation</span>}
        </div>
      </div>
      {call.phone && (
        <a href={phoneHref(call.phone)} className="mt-2 inline-flex items-center gap-2 text-sm font-medium underline">
          <Phone className="h-4 w-4" />
          {call.phone}
        </a>
      )}
      {call.summary && <p className="mt-3 text-sm">{call.summary}</p>}
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide transcript" : "Show transcript"}
      </Button>
      {open && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-sans">{call.transcript}</pre>
      )}
      {call.recordingUrl && (
        <a href={call.recordingUrl} className="mt-3 block text-sm underline" target="_blank" rel="noreferrer">
          Listen to recording
        </a>
      )}
    </article>
  );
}

function CallList({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [filter, setFilter] = useState<"all" | "late" | "reservation">("all");
  const { data, isLoading, error } = useQuery<{ calls: RestaurantCall[] }>({
    queryKey: ["/api/js-calls", token],
    refetchInterval: 20000,
    queryFn: async () => {
      const response = await fetch("/api/js-calls", { headers: { "x-js-calls-access": token } });
      if (response.status === 401) {
        onExpired();
        throw new Error("Enter the access code again.");
      }
      if (!response.ok) throw new Error("Restaurant calls could not be loaded.");
      return response.json();
    },
  });

  const calls = (data?.calls ?? []).filter((call) => {
    if (filter === "late") return call.late;
    if (filter === "reservation") return call.reservation;
    return true;
  });

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <header>
        <h1 className="font-serif text-2xl">J's Restaurant Calls</h1>
        <p className="text-sm text-muted-foreground">Transcripts from the restaurant phone line. This list refreshes on its own.</p>
      </header>
      <div className="flex gap-2">
        {(["all", "late", "reservation"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {value === "all" ? "All" : value === "late" ? "Running late" : "Reservations"}
          </Button>
        ))}
      </div>
      {isLoading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      {error && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Restaurant calls could not be loaded."}</p>}
      {!isLoading && calls.length === 0 && (
        <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">No restaurant calls in this view yet.</p>
      )}
      {calls.map((call) => <CallCard key={call.id} call={call} />)}
    </div>
  );
}

export default function RestaurantCallsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setChecking(false);
      return;
    }
    fetch("/api/js-calls", { headers: { "x-js-calls-access": saved } })
      .then((response) => {
        if (response.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY);
          setToken(null);
          return;
        }
        if (response.ok) setToken(saved);
      })
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!token) return <CodeGate onReady={setToken} />;
  return (
    <CallList
      token={token}
      onExpired={() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setToken(null);
      }}
    />
  );
}
