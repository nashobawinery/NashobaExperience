import type { LucideIcon } from "lucide-react";
import {
  IdCard,
  ClipboardCheck,
  Scale,
  UserMinus,
  UserPlus,
  UserCheck,
  FileBarChart,
  List,
  Calculator,
} from "lucide-react";

export interface StaffManagementSegment {
  /** URL segment under `/staff-dashboard/` */
  slug: string;
  title: string;
  shortDescription: string;
  icon: LucideIcon;
}

export const STAFF_MANAGEMENT_SEGMENTS: StaffManagementSegment[] = [
  {
    slug: "directory",
    title: "Staff Directory",
    shortDescription: "Employee listings and contact information",
    icon: IdCard,
  },
  {
    slug: "evaluations",
    title: "Employee Evaluations",
    shortDescription: "Performance reviews and evaluation records",
    icon: ClipboardCheck,
  },
  {
    slug: "incidents",
    title: "Staff Incidents",
    shortDescription: "Document and track workplace incidents",
    icon: Scale,
  },
  {
    slug: "termination",
    title: "Staff Termination",
    shortDescription: "Separation workflows and documentation",
    icon: UserMinus,
  },
  {
    slug: "onboarding",
    title: "Staff Onboarding",
    shortDescription: "New hire onboarding tasks and checklists",
    icon: UserPlus,
  },
  {
    slug: "recruitment",
    title: "Staff Recruitment",
    shortDescription: "Hiring pipelines and applicant tracking",
    icon: UserCheck,
  },
  {
    slug: "reports",
    title: "Staff Reports",
    shortDescription: "Analytics and operational reports",
    icon: FileBarChart,
  },
  {
    slug: "broadcasts",
    title: "Staff Broadcasts",
    shortDescription: "Announcements and team communications",
    icon: List,
  },
  {
    slug: "benefits",
    title: "Employee Benefits",
    shortDescription: "Benefits summaries and calculators",
    icon: Calculator,
  },
  {
    slug: "terminated-prospects",
    title: "Terminated Prospects",
    shortDescription: "Archived or withdrawn recruitment prospects",
    icon: UserMinus,
  },
];

const SEGMENT_BY_SLUG = new Map(STAFF_MANAGEMENT_SEGMENTS.map((s) => [s.slug, s]));

export function getStaffSegment(slug: string): StaffManagementSegment | undefined {
  return SEGMENT_BY_SLUG.get(slug);
}
