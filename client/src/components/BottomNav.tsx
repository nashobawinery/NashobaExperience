import { Wine, Heart, ShoppingCart, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BottomNavProps {
  activeTab: string;
  cartCount?: number;
  favoritesCount?: number;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({
  activeTab,
  cartCount = 0,
  favoritesCount = 0,
  onTabChange,
}: BottomNavProps) {
  const tabs = [
    { id: 'browse', label: 'Browse', icon: Wine },
    { id: 'favorites', label: 'Favorites', icon: Heart, count: favoritesCount },
    { id: 'recommendations', label: 'AI Picks', icon: Sparkles },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, count: cartCount },
    { id: 'profile', label: 'Finish', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-40">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-3 px-4 min-w-[64px] relative hover-elevate ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              data-testid={`button-nav-${tab.id}`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {tab.count > 9 ? '9+' : tab.count}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
