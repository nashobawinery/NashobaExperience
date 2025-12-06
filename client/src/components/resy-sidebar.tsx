import { Home, Wine, Calendar, CalendarDays, CalendarOff, CalendarX, CalendarHeart, MapPin, Settings, LogOut, BookOpen, Users, Crown } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Dashboard",
    url: "/reservations/admin",
    icon: Home,
  },
  {
    title: "Experiences",
    url: "/reservations/admin/experiences",
    icon: Wine,
  },
  {
    title: "Locations",
    url: "/reservations/admin/locations",
    icon: MapPin,
  },
  {
    title: "Private Events",
    url: "/reservations/admin/private-events",
    icon: CalendarOff,
  },
  {
    title: "Special Dates",
    url: "/reservations/admin/special-dates",
    icon: CalendarX,
  },
  {
    title: "Recurring Holidays",
    url: "/reservations/admin/holidays",
    icon: CalendarHeart,
  },
  {
    title: "Calendar",
    url: "/reservations/admin/calendar",
    icon: CalendarDays,
  },
  {
    title: "Reservations",
    url: "/reservations/admin/reservations",
    icon: Calendar,
  },
  {
    title: "Customers",
    url: "/reservations/admin/customers",
    icon: Users,
  },
  {
    title: "Clubs",
    url: "/reservations/admin/clubs",
    icon: Crown,
  },
  {
    title: "Settings",
    url: "/reservations/admin/settings",
    icon: Settings,
  },
  {
    title: "Documentation",
    url: "/reservations/admin/documentation",
    icon: BookOpen,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-serif font-semibold px-4 py-4">
            Nashoba Valley
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button variant="ghost" className="w-full justify-start" asChild data-testid="button-logout">
          <a href="/api/logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </a>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
