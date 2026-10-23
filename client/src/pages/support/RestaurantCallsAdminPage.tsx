import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

type RestaurantCallsAdmin = {
  code: string;
  staffPath: string;
  calls: RestaurantCall[];
};

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

export default function RestaurantCallsAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [codeDraft, setCodeDraft] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery<RestaurantCallsAdmin>({
    queryKey: ["/api/admin/support/js-calls"],
  });
  const code = codeDraft ?? data?.code ?? "";
  const staffUrl = `${window.location.origin}${data?.staffPath ?? "/js-calls"}`;

  const saveCode = useMutation({
    mutationFn: async (next: string) => apiRequest("PUT", "/api/admin/support/js-calls/code", { code: next }),
    onSuccess: async () => {
      setCodeDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/support/js-calls"] });
      toast({ title: "Access code saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save the access code", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/support">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Phone className="h-5 w-5" />
              J's Restaurant Calls
            </h1>
            <p className="text-sm text-muted-foreground">
              Hosts open the staff page with this code and read restaurant call transcripts.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Staff page</CardTitle>
            <p className="text-sm text-muted-foreground">Share this address with the host stand. It is not the Support login.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="break-all text-sm font-medium" data-testid="text-js-calls-url">{staffUrl}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(event) => setCodeDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
                className="sm:max-w-[8rem] text-center tracking-[0.3em]"
                data-testid="input-js-calls-admin-code"
              />
              <Button
                type="button"
                disabled={saveCode.isPending || code.length !== 4 || code === (data?.code ?? "")}
                onClick={() => saveCode.mutate(code)}
                data-testid="button-save-js-calls-code"
              >
                Save code
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">The code starts as 9816 until you change it here.</p>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading calls…</p>
        ) : (data?.calls.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No restaurant-line calls yet.
            </CardContent>
          </Card>
        ) : (
          data?.calls.map((call) => (
            <Card key={call.id} data-testid={`admin-js-call-${call.id}`}>
              <CardHeader className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{call.callerName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{call.callTime || formatRecorded(call.recordedAt)}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {call.late && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Running late</span>}
                    {call.reservation && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900">Reservation</span>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {call.phone && <p className="text-sm">{call.phone}</p>}
                {call.summary && <p className="text-sm">{call.summary}</p>}
                <Button type="button" size="sm" variant="outline" onClick={() => setOpenId(openId === call.id ? null : call.id)}>
                  {openId === call.id ? "Hide transcript" : "Show transcript"}
                </Button>
                {openId === call.id && (
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-sans text-sm">{call.transcript}</pre>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
