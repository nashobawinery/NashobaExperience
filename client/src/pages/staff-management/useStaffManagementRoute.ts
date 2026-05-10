import { useLocation } from "wouter";

export type StaffManagementView = "landing" | "segment" | "admin";

export function useStaffManagementRoute(): {
  activeSlug: string | null;
  view: StaffManagementView;
} {
  const [location] = useLocation();

  if (location === "/staff-dashboard" || location === "/staff-dashboard/") {
    return { activeSlug: null, view: "landing" };
  }

  if (location.startsWith("/staff-dashboard/admin")) {
    return { activeSlug: null, view: "admin" };
  }

  const m = location.match(/^\/staff-dashboard\/([^/?#]+)/);
  if (m?.[1] && m[1] !== "admin") {
    return { activeSlug: m[1], view: "segment" };
  }

  return { activeSlug: null, view: "landing" };
}
