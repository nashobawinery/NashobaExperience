import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { StaffDirectoryRow } from "./types";
import {
  AlertTriangle,
  Briefcase,
  ClipboardList,
  Clock,
  FilePlus,
  Folder,
  GraduationCap,
  Lock,
  Save,
  Shield,
  User,
  UserCheck,
  UserX,
  Users,
  UserRound,
} from "lucide-react";

const TAB_ITEMS = [
  { id: "basic", label: "Basic", icon: User },
  { id: "employment", label: "Employment", icon: Briefcase },
  { id: "onboarding", label: "Onboarding", icon: FilePlus },
  { id: "documents", label: "Documents", icon: Folder },
  { id: "payroll", label: "Payroll", icon: Lock },
  { id: "credentials", label: "Credentials", icon: UserCheck },
  { id: "reviews", label: "Reviews", icon: ClipboardList },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "manages", label: "Manages", icon: Users },
  { id: "security", label: "Security", icon: Shield },
  { id: "history", label: "History", icon: Clock },
] as const;

function statusBadgeClass(status: StaffDirectoryRow["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40";
    case "suspended":
      return "bg-amber-500/15 text-amber-400 border border-amber-500/40";
    case "terminated":
      return "bg-red-500/15 text-red-400 border border-red-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-400 border border-zinc-600";
  }
}

function statusLabel(status: StaffDirectoryRow["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "suspended":
      return "Suspended";
    case "terminated":
      return "Terminated";
    default:
      return status;
  }
}

const DEPARTMENTS = ["Maintenance", "Dietary", "Administration", "Nursing", "Activities", "Care"] as const;
const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Per Diem", "Contract", "PRN"] as const;
const FLSA_OPTIONS = ["Non-Exempt", "Exempt"] as const;

function formatHireDateDisplay(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffDirectoryRow;
  isNew?: boolean;
  onSaveBasic?: (row: StaffDirectoryRow) => void;
};

export function StaffDirectoryEditDialog({
  open,
  onOpenChange,
  staff,
  isNew = false,
  onSaveBasic,
}: Props) {
  const [form, setForm] = useState<StaffDirectoryRow>(() => ({ ...staff }));
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    setForm({ ...staff });
  }, [staff]);

  useEffect(() => {
    setActiveTab("basic");
  }, [staff.id]);

  const displayName =
    [form.firstName, form.lastName].filter(Boolean).join(" ") || form.name || "New staff member";
  const title = isNew ? "Add Staff Member" : `Edit: ${displayName}`;

  const update = <K extends keyof StaffDirectoryRow>(key: K, value: StaffDirectoryRow[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveContact = () => {
    if (!form) return;
    const merged: StaffDirectoryRow = {
      ...form,
      name: [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || form.name,
      email: form.businessEmail || form.personalEmail || form.email,
    };
    onSaveBasic?.(merged);
    onOpenChange(false);
  };

  const handleSaveEmployment = () => {
    if (!form) return;
    const merged: StaffDirectoryRow = {
      ...form,
      hireDate: form.hireDateIso ? formatHireDateDisplay(form.hireDateIso) : form.hireDate,
    };
    onSaveBasic?.(merged);
  };

  const inputClass =
    "bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500/40";

  const selectTriggerClass = cn(
    inputClass,
    "flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm ring-offset-background"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-5xl w-[min(96vw,56rem)] max-h-[min(92vh,880px)] flex flex-col gap-0 p-0 overflow-hidden",
          "border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl"
        )}
        data-testid="staff-directory-edit-dialog"
      >
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800 space-y-3 shrink-0 text-left">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2 min-w-0">
                <DialogTitle className="text-xl font-semibold text-white pr-8">{title}</DialogTitle>
                {!isNew && (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-zinc-400">{form.role || "Role"}</p>
                    <span
                      className={cn("text-xs font-medium rounded-full px-2 py-0.5", statusBadgeClass(form.status))}
                    >
                      {statusLabel(form.status)}
                    </span>
                  </div>
                )}
                {isNew && <p className="text-sm text-zinc-400">Create a new employee profile (demo — not saved to server).</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {!isNew && (
                  <>
                    <Button type="button" variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                      <UserX className="h-4 w-4 mr-2" />
                      Terminate
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 overflow-hidden px-2 sm:px-4 pt-3">
            <div className="shrink-0 border-b border-zinc-800 pb-2 overflow-x-auto">
              <TabsList className="inline-flex h-auto min-h-10 w-max max-w-full flex-nowrap justify-start gap-0.5 rounded-lg bg-zinc-900 p-1">
                {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="shrink-0 gap-1.5 rounded-md px-2.5 py-2 text-xs sm:text-sm text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white border-0"
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-80" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-4">
              <TabsContent value="basic" className="mt-0 space-y-6 focus-visible:outline-none">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-4">Contact Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sd-first" className="text-zinc-400">
                        First Name
                      </Label>
                      <Input
                        id="sd-first"
                        value={form.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-last" className="text-zinc-400">
                        Last Name
                      </Label>
                      <Input
                        id="sd-last"
                        value={form.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-pemail" className="text-zinc-400">
                        Personal Email
                      </Label>
                      <Input
                        id="sd-pemail"
                        type="email"
                        value={form.personalEmail}
                        onChange={(e) => update("personalEmail", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-bemail" className="text-zinc-400">
                        Business Email
                      </Label>
                      <Input
                        id="sd-bemail"
                        type="email"
                        value={form.businessEmail}
                        onChange={(e) => update("businessEmail", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="sd-cell" className="text-zinc-400">
                      Cell Phone
                    </Label>
                    <Input
                      id="sd-cell"
                      value={form.cellPhone}
                      onChange={(e) => update("cellPhone", e.target.value)}
                      className={cn(inputClass, "max-w-md")}
                    />
                  </div>
                  <div className="mt-6 flex items-start gap-3 rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                    <Checkbox
                      id="sd-sms"
                      checked={form.smsConsent}
                      onCheckedChange={(v) => update("smsConsent", v === true)}
                      className="mt-0.5 border-zinc-600 data-[state=checked]:bg-blue-600"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="sd-sms" className="text-zinc-200 font-medium cursor-pointer">
                        SMS Text Message Consent
                      </Label>
                      <p className="text-xs text-zinc-500">Staff member consents to receive text messages from the facility.</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <Label htmlFor="sd-role" className="text-zinc-400">
                      Role / Job Title
                    </Label>
                    <Input
                      id="sd-role"
                      value={form.role}
                      onChange={(e) => update("role", e.target.value)}
                      className={inputClass}
                    />
                    <p className="text-xs text-zinc-500">
                      The employee&apos;s job title or position (e.g., RCA, LPN, Caregiver)
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="mt-0 space-y-6 focus-visible:outline-none">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-4">Employment Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sd-dept" className="text-zinc-400">
                        Department
                      </Label>
                      <Select
                        value={form.department || "__none__"}
                        onValueChange={(v) => update("department", v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger id="sd-dept" className={selectTriggerClass} aria-label="Department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <SelectItem value="__none__">Select department</SelectItem>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-position" className="text-zinc-400">
                        Position Title
                      </Label>
                      <Input
                        id="sd-position"
                        value={form.role}
                        onChange={(e) => update("role", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-emptype" className="text-zinc-400">
                        Employment Type
                      </Label>
                      <Select value={form.employmentType} onValueChange={(v) => update("employmentType", v)}>
                        <SelectTrigger id="sd-emptype" className={selectTriggerClass} aria-label="Employment type">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          {EMPLOYMENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-schedule" className="text-zinc-400">
                        Work Schedule
                      </Label>
                      <Input
                        id="sd-schedule"
                        placeholder="e.g., Mon-Fri 8am-4pm"
                        value={form.workSchedule}
                        onChange={(e) => update("workSchedule", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-hire" className="text-zinc-400">
                        Hire Date
                      </Label>
                      <Input
                        id="sd-hire"
                        type="date"
                        value={form.hireDateIso}
                        onChange={(e) => update("hireDateIso", e.target.value)}
                        className={cn(inputClass, "[color-scheme:dark]")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-orig-hire" className="text-zinc-400">
                        Original Hire Date
                      </Label>
                      <Input
                        id="sd-orig-hire"
                        type="date"
                        value={form.originalHireDateIso}
                        onChange={(e) => update("originalHireDateIso", e.target.value)}
                        className={cn(inputClass, "[color-scheme:dark]")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-probation" className="text-zinc-400">
                        Probation End Date
                      </Label>
                      <Input
                        id="sd-probation"
                        type="date"
                        value={form.probationEndDateIso}
                        onChange={(e) => update("probationEndDateIso", e.target.value)}
                        className={cn(inputClass, "[color-scheme:dark]")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sd-flsa" className="text-zinc-400">
                        FLSA Status
                      </Label>
                      <Select value={form.flsaStatus} onValueChange={(v) => update("flsaStatus", v)}>
                        <SelectTrigger id="sd-flsa" className={selectTriggerClass} aria-label="FLSA status">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          {FLSA_OPTIONS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="sd-location" className="text-zinc-400">
                        Work Location
                      </Label>
                      <Input
                        id="sd-location"
                        value={form.workLocation}
                        onChange={(e) => update("workLocation", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {TAB_ITEMS.filter((t) => t.id !== "basic" && t.id !== "employment").map(({ id, label }) => (
                <TabsContent key={id} value={id} className="mt-0 min-h-[200px] focus-visible:outline-none">
                  <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-12 text-center">
                    <UserRound className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
                    <p className="text-sm font-medium text-zinc-300">{label}</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                      This section is scaffolded for the proposed staff profile. Connect API and forms here when ready.
                    </p>
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>

          <DialogFooter className="border-t border-zinc-800 px-6 py-4 bg-zinc-950 shrink-0 sm:justify-end gap-2">
            <Button type="button" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {activeTab === "basic" && (
              <Button type="button" className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveContact}>
                <Save className="h-4 w-4 mr-2" />
                Save Contact Info
              </Button>
            )}
            {activeTab === "employment" && (
              <Button type="button" className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveEmployment}>
                <Save className="h-4 w-4 mr-2" />
                Save Employment Details
              </Button>
            )}
            {activeTab !== "basic" && activeTab !== "employment" && (
              <Button type="button" variant="secondary" disabled className="opacity-60">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
