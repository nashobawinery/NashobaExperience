import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, floorAccessHeaders, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Location, ResyLocationTable, ResyReservation } from "@shared/schema";

type Walkin = {
  id: string;
  tableId: string;
  label: string;
  serviceDate: string;
};

type FloorData = {
  date: string;
  tables: ResyLocationTable[];
  reservations: ResyReservation[];
  walkins: Walkin[];
  turnMinutes?: number;
};

const COLORS = {
  open: "#e7efe4",
  single: "#f4c95d",
  consecutive: "#7c6bb5",
  occupied: "#d64545",
  pirates: "#1f2937",
};

function usesTable(reservation: ResyReservation, tableId: string) {
  if (reservation.tableId === tableId) return true;
  return (reservation.assignedTableId || "").split(",").filter(Boolean).includes(tableId);
}

type SeatingMove = {
  reservationId: string;
  customerName: string;
  time: string;
  partySize: number;
  fromLabel: string;
  toTableId: string;
  toLabel: string;
};

type SeatingSuggestion = {
  problem: string;
  summary: string;
  moves: SeatingMove[];
};

function clockMinutes(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toLowerCase();
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function reservationSpan(reservation: ResyReservation) {
  const start = clockMinutes(reservation.holdStart || reservation.reservationTime);
  const end = reservation.holdEnd ? clockMinutes(reservation.holdEnd) : start + (reservation.turnDuration || 180);
  return { start, end };
}

function tableProblem(reservation: ResyReservation, tables: ResyLocationTable[], reservations: ResyReservation[], walkins: Walkin[]) {
  if (reservation.status === "completed" || reservation.status === "cancelled" || reservation.status === "seated") return null;
  const table = tables.find((item) => usesTable(reservation, item.id));
  if (!table) return "No table is assigned.";
  if (reservation.partySize < table.minCapacity || reservation.partySize > table.maxCapacity) {
    return `${table.tableLabel} does not seat ${reservation.partySize}.`;
  }
  if (walkins.some((item) => item.tableId === table.id)) return `${table.tableLabel} is occupied by Pirates!!!.`;
  const window = reservationSpan(reservation);
  const clash = reservations.find((other) => {
    if (other.id === reservation.id || other.status === "completed" || other.status === "cancelled") return false;
    if (!usesTable(other, table.id)) return false;
    const otherWindow = reservationSpan(other);
    return window.start < otherWindow.end && otherWindow.start < window.end;
  });
  if (clash) return `${table.tableLabel} overlaps ${clash.customerName}.`;
  return null;
}

function timeLabel(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

function FloorCodeGate({ area, title, children }: { area: "host" | "tracker"; title: string; children: ReactNode }) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const storageKey = `floor-access-${area}`;

  useEffect(() => {
    const token = sessionStorage.getItem(storageKey);
    if (!token) {
      setChecking(false);
      return;
    }
    fetch(`/api/resy/floor-access/session`, { credentials: "include", headers: { "x-floor-access": token, "x-floor-area": area } })
      .then((response) => {
        if (response.status === 401) sessionStorage.removeItem(storageKey);
        setReady(response.ok);
      })
      .catch(() => setReady(false))
      .finally(() => setChecking(false));
  }, [storageKey]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await apiRequest("POST", "/api/resy/floor-access/verify", { area, code }).catch((error: Error) => {
      toast({ title: title, description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
      return null;
    });
    if (!response) return;
    const body = await response.json();
    sessionStorage.setItem(storageKey, body.token);
    setReady(true);
  };

  if (checking) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (ready) return <>{children}</>;
  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border bg-background p-6">
      <h1 className="font-serif text-2xl">{title}</h1>
      <p className="text-sm text-muted-foreground">Enter the 4-digit access code to open this page.</p>
      <input
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        pattern="\d{4}"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
        className="h-12 w-full rounded-md border text-center text-2xl tracking-[0.4em]"
      />
      <Button type="submit" className="w-full" disabled={code.length !== 4}>Continue</Button>
    </form>
  );
}

function FloorPlanScreen({ hostStation = false }: { hostStation?: boolean }) {
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showHost, setShowHost] = useState(false);
  const [arrange, setArrange] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState("");
  const [suggestion, setSuggestion] = useState<SeatingSuggestion | null>(null);
  const [suggestionFor, setSuggestionFor] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInParty, setWalkInParty] = useState(2);
  const [walkInTableId, setWalkInTableId] = useState("");
  const [scale, setScale] = useState(0.85);
  const [origin, setOrigin] = useState({ x: 12, y: 12 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; tableId?: string; moved: boolean } | null>(null);

  const { data: locations } = useQuery<Location[]>({ queryKey: ["/api/resy/locations"] });
  const knoll = locations?.find((location) => /knoll/i.test(location.name));

  const { data, isLoading } = useQuery<FloorData>({
    queryKey: ["/api/resy/locations", knoll?.id, "floor", date],
    enabled: !!knoll?.id,
    refetchInterval: 15000,
    queryFn: async () => {
      const response = await fetch(`/api/resy/locations/${knoll!.id}/floor?date=${date}`, { credentials: "include", headers: floorAccessHeaders() });
      if (!response.ok) throw new Error("The floor plan could not be loaded.");
      return response.json();
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", knoll?.id, "floor", date] });
  };

  const fail = (error: Error) => toast({ title: "Floor plan", description: error.message, variant: "destructive" });

  const arrive = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/resy/reservations/${id}/arrive`),
    onSuccess: () => refresh(),
    onError: fail,
  });
  const clearTable = useMutation({
    mutationFn: async (tableId: string) => apiRequest("POST", `/api/resy/locations/${knoll!.id}/tables/${tableId}/clear`, { date }),
    onSuccess: () => { setSelectedId(null); refresh(); },
    onError: fail,
  });
  const swap = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/resy/locations/${knoll!.id}/tables/swap`, { date, fromTableId: selectedId, toTableId: swapTarget }),
    onSuccess: () => { setSwapTarget(""); setSelectedId(null); refresh(); },
    onError: fail,
  });
  const hostWalkIn = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/resy/locations/${knoll!.id}/host-walkin`, {
      date,
      customerName: walkInName,
      customerPhone: walkInPhone,
      partySize: walkInParty,
      tableId: walkInTableId,
    }),
    onSuccess: () => {
      setWalkInOpen(false);
      setWalkInName("");
      setWalkInPhone("");
      setWalkInTableId("");
      setSelectedId(null);
      refresh();
    },
    onError: fail,
  });
  const pirates = useMutation({
    mutationFn: async (tableId: string) => apiRequest("POST", `/api/resy/locations/${knoll!.id}/tables/${tableId}/pirates`, { date }),
    onSuccess: async (response) => {
      const body = await response.json();
      if (body.displaced?.length) {
        toast({ title: "Needs a table", description: body.displaced.join(", ") });
      }
      setSelectedId(null);
      refresh();
    },
    onError: fail,
  });
  const suggest = useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await apiRequest("POST", `/api/resy/locations/${knoll!.id}/floor/suggest`, { date, reservationId });
      return response.json() as Promise<SeatingSuggestion>;
    },
    onSuccess: (body, reservationId) => {
      setSuggestion(body);
      setSuggestionFor(reservationId);
    },
    onError: fail,
  });
  const applySuggestion = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/resy/locations/${knoll!.id}/floor/apply`, { date, moves: suggestion?.moves || [] }),
    onSuccess: () => { setSuggestion(null); setSuggestionFor(null); refresh(); },
    onError: fail,
  });
  const savePosition = useMutation({
    mutationFn: async (payload: { id: string; posX: number; posY: number }) =>
      apiRequest("PATCH", `/api/resy/location-tables/${payload.id}/position`, payload),
  });

  const tables = data?.tables || [];
  const reservations = data?.reservations || [];
  const walkins = data?.walkins || [];
  const selected = tables.find((table) => table.id === selectedId) || null;

  const board = useMemo(() => {
    const maxX = Math.max(900, ...tables.map((table) => (table.posX || 0) + 140));
    const maxY = Math.max(700, ...tables.map((table) => (table.posY || 0) + 120));
    return { width: maxX + 40, height: maxY + 40 };
  }, [tables]);

  const statusFor = (table: ResyLocationTable) => {
    const walkin = walkins.find((item) => item.tableId === table.id);
    const mine = reservations
      .filter((reservation) => reservation.status !== "completed" && usesTable(reservation, table.id))
      .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime));
    const seated = mine.find((reservation) => reservation.status === "seated");
    if (walkin) return { kind: "pirates" as const, color: COLORS.pirates, text: "#f5c16c", reservations: mine, seated, walkin };
    if (seated) return { kind: "occupied" as const, color: COLORS.occupied, text: "#fff", reservations: mine, seated, walkin: undefined };
    if (mine.length >= 2) return { kind: "consecutive" as const, color: COLORS.consecutive, text: "#fff", reservations: mine, seated: undefined, walkin: undefined };
    if (mine.length === 1) return { kind: "single" as const, color: COLORS.single, text: "#2b2416", reservations: mine, seated: undefined, walkin: undefined };
    return { kind: "open" as const, color: COLORS.open, text: "#243028", reservations: mine, seated: undefined, walkin: undefined };
  };

  const onPointerDown = (event: React.PointerEvent, tableId?: string) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: origin.x, oy: origin.y, tableId: arrange ? tableId : undefined, moved: false };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
    if (drag.current.tableId) {
      const table = tables.find((item) => item.id === drag.current!.tableId);
      if (!table) return;
      table.posX = Math.round((table.posX || 0) + dx / scale);
      table.posY = Math.round((table.posY || 0) + dy / scale);
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
      setOrigin((current) => ({ ...current }));
      return;
    }
    setOrigin({ x: drag.current.ox + dx, y: drag.current.oy + dy });
  };
  const onPointerUp = (table?: ResyLocationTable) => {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (current.tableId && table) {
      savePosition.mutate({ id: table.id, posX: table.posX || 0, posY: table.posY || 0 });
      return;
    }
    if (table && !current.moved) {
      setSelectedId(table.id);
      setSwapTarget("");
    }
  };

  const sections = new Map<string, { x: number; y: number }>();
  for (const table of tables) {
    if (!table.floorSection || table.posX == null || table.posY == null) continue;
    const existing = sections.get(table.floorSection);
    if (!existing || table.posY < existing.y) sections.set(table.floorSection, { x: 24, y: table.posY - 28 });
  }

  const hostList = [...reservations].sort((a, b) => a.reservationTime.localeCompare(b.reservationTime));

  return (
    <div className="-m-6 flex h-[calc(100dvh-3.5rem)] flex-col bg-[#f6f3ee]">
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        <div className="min-w-0">
          <h1 className="font-serif text-xl leading-none">{hostStation ? "Host/Information Center" : "Knoll Table Tracker"}</h1>
          <p className="text-xs text-muted-foreground">{hostStation ? "Drag the floor to look around. Reservations for the day are below." : "Today’s reservations. Drag to look around."}</p>
        </div>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm" />
        {hostStation && <Button type="button" size="sm" onClick={() => { setWalkInOpen(true); setWalkInTableId(""); }}>Seat walk-in</Button>}
        {!hostStation && <Button type="button" size="sm" variant={showHost ? "default" : "outline"} onClick={() => setShowHost((value) => !value)}>Host</Button>}
        {!hostStation && <Button type="button" size="sm" variant={arrange ? "default" : "outline"} onClick={() => setArrange((value) => !value)}>Arrange</Button>}
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" size="icon" variant="outline" onClick={() => setScale((value) => Math.max(0.4, value - 0.15))}><Minus className="h-4 w-4" /></Button>
          <span className="w-12 text-center text-xs">{Math.round(scale * 100)}%</span>
          <Button type="button" size="icon" variant="outline" onClick={() => setScale((value) => Math.min(2.2, value + 0.15))}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto px-3 py-2 text-xs">
        <Legend color={COLORS.open} label="Open" />
        <Legend color={COLORS.single} label="One reservation" />
        <Legend color={COLORS.consecutive} label="Consecutive" />
        <Legend color={COLORS.occupied} label="Seated" />
        <Legend color={COLORS.pirates} label="Pirates!!!" />
      </div>
      <div
        className={hostStation ? "relative h-[42vh] shrink-0 overflow-hidden border-b touch-none" : "relative min-h-0 flex-1 overflow-hidden touch-none"}
        onPointerDown={(event) => onPointerDown(event)}
        onPointerMove={onPointerMove}
        onPointerUp={() => onPointerUp()}
        onWheel={(event) => {
          event.preventDefault();
          setScale((value) => Math.min(2.2, Math.max(0.4, value + (event.deltaY < 0 ? 0.08 : -0.08))));
        }}
      >
        {isLoading && <div className="absolute inset-0 z-10 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        <div style={{ transform: `translate(${origin.x}px, ${origin.y}px) scale(${scale})`, transformOrigin: "0 0", width: board.width, height: board.height, position: "relative" }}>
          {[...sections.entries()].map(([name, spot]) => (
            <div key={name} className="absolute text-sm font-semibold text-[#6d6458]" style={{ left: spot.x, top: spot.y }}>{name}</div>
          ))}
          {tables.map((table) => {
            const status = statusFor(table);
            return (
              <button
                key={table.id}
                type="button"
                className="absolute flex h-16 w-24 flex-col items-center justify-center rounded-xl border border-black/10 shadow-sm"
                style={{ left: table.posX || 0, top: table.posY || 0, background: status.color, color: status.text }}
                onPointerDown={(event) => { event.stopPropagation(); onPointerDown(event, table.id); }}
                onPointerMove={onPointerMove}
                onPointerUp={(event) => { event.stopPropagation(); onPointerUp(table); }}
              >
                <span className="text-sm font-semibold">{table.tableLabel}</span>
                <span className="text-[10px]">{status.walkin ? "Pirates!!!" : status.seated ? status.seated.customerName.split(" ")[0] : `${table.maxCapacity} seats`}</span>
              </button>
            );
          })}
        </div>
      </div>
      {(showHost || hostStation) && (
        <div className={hostStation ? "min-h-0 flex-1 overflow-auto bg-background" : "max-h-56 overflow-auto border-t bg-background"}>
          {hostStation && walkInOpen && (
            <form
              className="grid gap-2 border-b bg-[#f8f4ea] p-3 sm:grid-cols-2"
              onSubmit={(event) => { event.preventDefault(); hostWalkIn.mutate(); }}
            >
              <p className="sm:col-span-2 text-sm font-medium">Seat a walk-in. They get a reservation in their name. The table must be empty for their whole seating.</p>
              <input className="h-10 rounded-md border bg-background px-2" placeholder="Name" value={walkInName} onChange={(event) => setWalkInName(event.target.value)} required />
              <input className="h-10 rounded-md border bg-background px-2" placeholder="Phone" value={walkInPhone} onChange={(event) => setWalkInPhone(event.target.value)} required />
              <input className="h-10 rounded-md border bg-background px-2" type="number" min={1} value={walkInParty} onChange={(event) => setWalkInParty(Number(event.target.value))} required />
              <select className="h-10 rounded-md border bg-background px-2" value={walkInTableId} onChange={(event) => setWalkInTableId(event.target.value)} required>
                <option value="">Empty table</option>
                {tables.filter((table) => tableIsOpen(table, walkInParty, reservations, walkins, data?.turnMinutes || 180, date)).map((table) => (
                  <option key={table.id} value={table.id}>{table.tableLabel} · {table.minCapacity}-{table.maxCapacity}</option>
                ))}
              </select>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={hostWalkIn.isPending}>Save reservation</Button>
                <Button type="button" variant="outline" onClick={() => setWalkInOpen(false)}>Cancel</Button>
              </div>
            </form>
          )}
          {hostList.map((reservation) => {
            const table = tables.find((item) => usesTable(reservation, item.id));
            const problem = tableProblem(reservation, tables, reservations, walkins);
            const showing = suggestionFor === reservation.id ? suggestion : null;
            return (
              <div key={reservation.id} className="border-b px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{reservation.customerName}</div>
                    <div className="text-xs text-muted-foreground">{timeLabel(reservation.reservationTime)} · {reservation.partySize} · {table?.tableLabel || "No table"} · {reservation.status}{reservation.customerPhone ? ` · ${reservation.customerPhone}` : ""}</div>
                    {problem && <div className="text-xs text-red-700">{problem}</div>}
                  </div>
                  {problem && (
                    <Button size="sm" variant="outline" disabled={suggest.isPending} onClick={() => suggest.mutate(reservation.id)}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      AI
                    </Button>
                  )}
                  {reservation.status !== "seated" && reservation.status !== "completed" && (
                    <Button size="sm" disabled={arrive.isPending} onClick={() => arrive.mutate(reservation.id)}>Arrive</Button>
                  )}
                </div>
                {showing && (
                  <div className="mt-2 rounded-md border bg-[#f8f4ea] p-3">
                    <p className="text-sm">{showing.summary}</p>
                    {showing.moves.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {showing.moves.map((move) => (
                          <li key={move.reservationId}>{move.customerName}: {move.fromLabel} to {move.toLabel}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSuggestion(null); setSuggestionFor(null); }}>Reject</Button>
                      {showing.moves.length > 0 && (
                        <Button size="sm" disabled={applySuggestion.isPending} onClick={() => applySuggestion.mutate()}>Accept</Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {hostList.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">No reservations for this day.</p>}
        </div>
      )}
      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-20 max-h-[70%] overflow-auto rounded-t-2xl border bg-background p-4 shadow-xl">
          {(() => {
            const status = statusFor(selected);
            return (
              <>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl">Table {selected.tableLabel}</h2>
                    <p className="text-sm text-muted-foreground">{selected.floorSection} · {selected.minCapacity}-{selected.maxCapacity} seats</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
                </div>
                {status.walkin && <p className="mb-3 text-lg font-semibold">Occupied by Pirates!!!</p>}
                {status.reservations.length === 0 && !status.walkin && <p className="mb-3 text-sm text-muted-foreground">No reservation on this table.</p>}
                <div className="space-y-2">
                  {status.reservations.map((reservation) => (
                    <div key={reservation.id} className="rounded-md border px-3 py-2">
                      <div className="font-medium">{reservation.customerName}</div>
                      <div className="text-sm text-muted-foreground">{timeLabel(reservation.reservationTime)} · party of {reservation.partySize} · {reservation.status}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {(status.seated || status.walkin) && (
                    <Button disabled={clearTable.isPending} onClick={() => clearTable.mutate(selected.id)}>Clear table</Button>
                  )}
                  {!hostStation && !status.seated && !status.walkin && (
                    <Button variant="outline" disabled={pirates.isPending} onClick={() => pirates.mutate(selected.id)}>They sat down — Pirates!!!</Button>
                  )}
                  {hostStation && !status.seated && !status.walkin && tableIsOpen(selected, walkInParty, reservations, walkins, data?.turnMinutes || 180, date) && (
                    <Button variant="outline" onClick={() => { setWalkInTableId(selected.id); setWalkInOpen(true); setSelectedId(null); }}>Seat a named guest here</Button>
                  )}
                  <div className="flex gap-2">
                    <select className="h-10 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" value={swapTarget} onChange={(event) => setSwapTarget(event.target.value)}>
                      <option value="">Move all reservations to...</option>
                      {tables.filter((table) => table.id !== selected.id).map((table) => (
                        <option key={table.id} value={table.id}>{table.tableLabel}</option>
                      ))}
                    </select>
                    <Button disabled={!swapTarget || swap.isPending} onClick={() => swap.mutate()}>Swap</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Swap exchanges every remaining reservation on these two tables, including later ones.</p>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function tableIsOpen(table: ResyLocationTable, partySize: number, reservations: ResyReservation[], walkins: Walkin[], turnMinutes: number, serviceDate: string) {
  if (partySize < table.minCapacity || partySize > table.maxCapacity) return false;
  if (walkins.some((item) => item.tableId === table.id)) return false;
  if (serviceDate !== format(new Date(), "yyyy-MM-dd")) return false;
  const now = new Date();
  const start = now.getHours() * 60 + now.getMinutes();
  const end = start + turnMinutes;
  return !reservations.some((reservation) => {
    if (reservation.status === "completed" || reservation.status === "cancelled") return false;
    if (!usesTable(reservation, table.id)) return false;
    if (reservation.status === "seated") return true;
    const window = reservationSpan(reservation);
    return start < window.end && window.start < end;
  });
}

export default function FloorPlan({ hostStation = false }: { hostStation?: boolean }) {
  return (
    <FloorCodeGate area={hostStation ? "host" : "tracker"} title={hostStation ? "Host/Information Center" : "Knoll Table Tracker"}>
      <FloorPlanScreen hostStation={hostStation} />
    </FloorCodeGate>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="h-3 w-3 rounded-sm border border-black/10" style={{ background: color }} />
      {label}
    </span>
  );
}
