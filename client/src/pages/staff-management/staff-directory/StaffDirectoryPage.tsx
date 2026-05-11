import { useMemo, useState } from "react";
import { StaffManagementLayout } from "@/pages/staff-management/StaffManagementLayout";
import { StaffDirectoryEditDialog } from "./StaffDirectoryEditDialog";
import { createEmptyStaff, DIRECTORY_SUMMARY, MOCK_STAFF } from "./mockData";
import type { StaffDirectoryRow, StaffStatus } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronsUpDown,
  FileWarning,
  MoreVertical,
  Plus,
  Search,
  Send,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

const shell = "rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm";
const cardBase = "border-zinc-800 bg-zinc-900/80 text-zinc-100";
const inputDark = "bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9";

function statusPill(status: StaffStatus) {
  switch (status) {
    case "active":
      return (
        <Badge className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 font-normal">
          Active
        </Badge>
      );
    case "suspended":
      return (
        <Badge className="rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/35 font-normal">
          Suspended
        </Badge>
      );
    case "terminated":
      return (
        <Badge className="rounded-full bg-red-500/15 text-red-400 border border-red-500/35 font-normal">
          Terminated
        </Badge>
      );
    default:
      return null;
  }
}

function rolePill(role: string) {
  return (
    <Badge variant="outline" className="rounded-full border-zinc-600 bg-zinc-800/60 text-zinc-200 font-normal">
      {role}
    </Badge>
  );
}

export default function StaffDirectoryPage() {
  const [rows, setRows] = useState<StaffDirectoryRow[]>(MOCK_STAFF);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDirectoryRow | null>(null);
  const [isNewStaff, setIsNewStaff] = useState(false);

  const roles = useMemo(() => {
    const s = new Set(rows.map((r) => r.role).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const departments = useMemo(() => {
    const s = new Set(rows.map((r) => r.department).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (deptFilter !== "all" && r.department !== deptFilter) return false;
      if (!q) return true;
      const blob = `${r.name} ${r.email} ${r.role} ${r.department}`.toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search, statusFilter, roleFilter, deptFilter]);

  const openAdd = () => {
    setEditing(createEmptyStaff());
    setIsNewStaff(true);
    setDialogOpen(true);
  };

  const openEdit = (row: StaffDirectoryRow) => {
    setEditing({ ...row });
    setIsNewStaff(false);
    setDialogOpen(true);
  };

  const handleSaveBasic = (row: StaffDirectoryRow) => {
    if (isNewStaff) {
      const next = { ...row, id: String(Date.now()), name: row.name || `${row.firstName} ${row.lastName}`.trim() };
      setRows((prev) => [...prev, next]);
    } else {
      setRows((prev) => prev.map((x) => (x.id === row.id ? row : x)));
    }
  };

  const s = DIRECTORY_SUMMARY;

  return (
    <StaffManagementLayout>
      <div className={cn(shell, "p-4 md:p-8 space-y-8")} data-testid="staff-directory-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Staff Directory</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage staff members and their information</p>
          </div>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-500 text-white shrink-0"
            onClick={openAdd}
            data-testid="staff-directory-add"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className={cn(cardBase, "overflow-hidden")}>
            <CardContent className="p-4 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Active Staff</p>
                <p className="text-2xl font-semibold text-white tabular-nums">{s.activeStaff}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.activeStaffLabel}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(cardBase, "overflow-hidden")}>
            <CardContent className="p-4 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-950/50 text-red-400">
                <FileWarning className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">CORI Alerts</p>
                <p className="text-2xl font-semibold text-red-400 tabular-nums">{s.coriAlerts}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.coriExpired} expired</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(cardBase, "overflow-hidden")}>
            <CardContent className="p-4 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sky-400">
                <Send className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Authorization Pending</p>
                <p className="text-2xl font-semibold text-white tabular-nums">{s.authPending}</p>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{s.authPendingLabel}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(cardBase, "overflow-hidden")}>
            <CardContent className="p-4 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-950/40 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Suspended</p>
                <p className="text-2xl font-semibold text-amber-400 tabular-nums">{s.suspended}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.suspendedLabel}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(cardBase, "overflow-hidden")}>
            <CardContent className="p-4 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-950/40 text-red-400">
                <UserX className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Terminated</p>
                <p className="text-2xl font-semibold text-red-400 tabular-nums">{s.terminated}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.terminatedLabel}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(cardBase, "overflow-hidden")}>
            <CardContent className="p-4 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">New This Month</p>
                <p className="text-2xl font-semibold text-white tabular-nums">{s.newThisMonth}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.newThisMonthLabel}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(inputDark, "pl-9")}
                data-testid="staff-directory-search"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn(inputDark, "w-full sm:w-[140px]")}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className={cn(inputDark, "w-full sm:w-[160px]")}>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className={cn(inputDark, "w-full sm:w-[180px]")}>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Name <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </span>
                  </TableHead>
                  <TableHead className="text-zinc-400 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Status <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </span>
                  </TableHead>
                  <TableHead className="text-zinc-400 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Role <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </span>
                  </TableHead>
                  <TableHead className="text-zinc-400 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Department <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </span>
                  </TableHead>
                  <TableHead className="text-zinc-400 font-medium hidden lg:table-cell">Permission Group</TableHead>
                  <TableHead className="text-zinc-400 font-medium hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-zinc-400 font-medium hidden xl:table-cell">Hire Date</TableHead>
                  <TableHead className="text-zinc-400 font-medium w-[52px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id} className="border-zinc-800 hover:bg-zinc-800/40">
                    <TableCell className="font-medium text-zinc-100">{row.name}</TableCell>
                    <TableCell>{statusPill(row.status)}</TableCell>
                    <TableCell>{rolePill(row.role)}</TableCell>
                    <TableCell className="text-zinc-300">{row.department}</TableCell>
                    <TableCell className="text-zinc-400 hidden lg:table-cell">{row.permissionGroup}</TableCell>
                    <TableCell className="text-zinc-400 text-sm hidden md:table-cell max-w-[200px] truncate">
                      {row.email}
                    </TableCell>
                    <TableCell className="text-zinc-400 hidden xl:table-cell whitespace-nowrap">{row.hireDate}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" aria-label="Row actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <DropdownMenuItem className="focus:bg-zinc-800 cursor-pointer" onClick={() => openEdit(row)}>
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-10 px-4 border-t border-zinc-800">No staff match your filters.</p>
            )}
          </div>
        </div>

        <p className="text-xs text-zinc-500 text-center">Prototype UI — summary figures and table rows use local demo data until wired to your API.</p>
      </div>

      {editing && (
        <StaffDirectoryEditDialog
          key={editing.id}
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditing(null);
          }}
          staff={editing}
          isNew={isNewStaff}
          onSaveBasic={handleSaveBasic}
        />
      )}
    </StaffManagementLayout>
  );
}
