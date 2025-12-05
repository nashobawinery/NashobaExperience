import { Home, Wine, Calendar, CalendarDays, CalendarOff, CalendarX, MapPin, Settings, LogOut, BookOpen, Users, Shield, Crown } from "lucide-react";
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
    url: "/admin",
    icon: Home,
  },
  {
    title: "Experiences",
    url: "/admin/experiences",
    icon: Wine,
  },
  {
    title: "Locations",
    url: "/admin/locations",
    icon: MapPin,
  },
  {
    title: "Private Events",
    url: "/admin/private-events",
    icon: CalendarOff,
  },
  {
    title: "Special Dates",
    url: "/admin/special-dates",
    icon: CalendarX,
  },
  {
    title: "Calendar",
    url: "/admin/calendar",
    icon: CalendarDays,
  },
  {
    title: "Reservations",
    url: "/admin/reservations",
    icon: Calendar,
  },
  {
    title: "Customers",
    url: "/admin/customers",
    icon: Users,
  },
  {
    title: "Clubs",
    url: "/admin/clubs",
    icon: Crown,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Shield,
  },
  {
    title: "Documentation",
    url: "/admin/documentation",
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
                    data-testid={`link-${item.title.toLowerCase()}`}
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
