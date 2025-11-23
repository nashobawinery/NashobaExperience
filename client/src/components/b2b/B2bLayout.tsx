import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { Button } from "@/components/ui/button";
import { Wine, LogOut, ShoppingCart, Package, History, User, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";

export function B2bLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useB2bAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/b2b" className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-3 py-2">
              <Wine className="h-6 w-6 text-primary" />
              <div>
                <h1 className="font-serif text-lg font-semibold">Nashoba Valley Winery</h1>
                <p className="text-xs text-muted-foreground">Wholesale Portal</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {isAuthenticated && user && (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {user.accountName || user.name}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation (only show for authenticated customers) */}
      {isAuthenticated && user?.type === "customer" && (
        <nav className="border-b bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-2">
              <Link href="/b2b/catalog">
                <Button
                  variant={location === "/b2b/catalog" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                  data-testid="nav-catalog"
                >
                  <Package className="h-4 w-4" />
                  Catalog
                </Button>
              </Link>
              <Link href="/b2b/cart">
                <Button
                  variant={location === "/b2b/cart" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                  data-testid="nav-cart"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Cart
                </Button>
              </Link>
              <Link href="/b2b/orders">
                <Button
                  variant={location === "/b2b/orders" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                  data-testid="nav-orders"
                >
                  <History className="h-4 w-4" />
                  Orders
                </Button>
              </Link>
              <Link href="/b2b/reorder">
                <Button
                  variant={location === "/b2b/reorder" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                  data-testid="nav-reorder"
                >
                  <Package className="h-4 w-4" />
                  Reorder
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Admin Navigation */}
      {isAuthenticated && user?.type === "admin" && (
        <nav className="border-b bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-2">
              <Link href="/b2b/admin">
                <Button
                  variant={location === "/b2b/admin" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                  data-testid="nav-admin-dashboard"
                >
                  <User className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Sales Rep Navigation */}
      {isAuthenticated && user?.type === "sales_rep" && (
        <nav className="border-b bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-2">
              <Link href="/b2b/commissions">
                <Button
                  variant={location === "/b2b/commissions" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                  data-testid="nav-sales-rep-commissions"
                >
                  <TrendingUp className="h-4 w-4" />
                  Commissions
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
