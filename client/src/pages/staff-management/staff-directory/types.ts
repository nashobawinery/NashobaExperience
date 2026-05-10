export type StaffStatus = "active" | "suspended" | "terminated";

export interface StaffDirectoryRow {
  id: string;
  name: string;
  status: StaffStatus;
  /** Position title (Employment tab — also shown as Role on the directory table) */
  role: string;
  department: string;
  permissionGroup: string;
  email: string;
  /** Display string in the directory table (e.g. “Mar 25, 2021”) */
  hireDate: string;
  firstName: string;
  lastName: string;
  personalEmail: string;
  businessEmail: string;
  cellPhone: string;
  smsConsent: boolean;

  /** Employment tab — `hireDateIso` drives the Hire Date control (yyyy-mm-dd); empty if unknown */
  employmentType: string;
  workSchedule: string;
  hireDateIso: string;
  originalHireDateIso: string;
  probationEndDateIso: string;
  flsaStatus: string;
  workLocation: string;
}

export interface DirectorySummary {
  activeStaff: number;
  activeStaffLabel: string;
  coriAlerts: number;
  coriExpired: number;
  authPending: number;
  authPendingLabel: string;
  suspended: number;
  suspendedLabel: string;
  terminated: number;
  terminatedLabel: string;
  newThisMonth: number;
  newThisMonthLabel: string;
}
