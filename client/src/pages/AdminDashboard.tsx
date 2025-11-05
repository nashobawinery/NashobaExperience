import { useState } from "react";
import AdminProductManager from "@/components/AdminProductManager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Upload, HelpCircle, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockProducts = [
  {
    id: '1',
    name: 'Reserve Cabernet Sauvignon',
    category: 'Wine',
    price: 34.99,
    stock: 'in-stock' as const,
    views: 145,
    isStaffPick: true,
    isFeatured: true,
  },
  {
    id: '2',
    name: 'Aged Apple Brandy',
    category: 'Spirits',
    price: 45.00,
    stock: 'in-stock' as const,
    views: 89,
    isStaffPick: false,
    isFeatured: false,
  },
  {
    id: '3',
    name: 'Chardonnay Reserve',
    category: 'Wine',
    price: 28.99,
    stock: 'in-stock' as const,
    views: 203,
    isStaffPick: true,
    isFeatured: false,
  },
  {
    id: '4',
    name: 'Sparkling Rosé',
    category: 'Wine',
    price: 32.99,
    stock: 'out-of-stock' as const,
    views: 167,
    isStaffPick: false,
    isFeatured: true,
  },
];

interface AdminDashboardProps {
  onBackToGuest?: () => void;
}

export default function AdminDashboard({ onBackToGuest }: AdminDashboardProps) {
  const { toast } = useToast();
  const [products] = useState(mockProducts);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-medium mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your tasting experience</p>
            </div>
            {onBackToGuest && (
              <Button variant="outline" onClick={onBackToGuest} data-testid="button-back-to-guest">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Guest View
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="products" data-testid="tab-products">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-import">
              <Upload className="w-4 h-4 mr-2" />
              Import/Export
            </TabsTrigger>
            <TabsTrigger value="trivia" data-testid="tab-trivia">
              <HelpCircle className="w-4 h-4 mr-2" />
              Fun Facts
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <AdminProductManager
              products={products}
              onAddProduct={() => {
                toast({ title: "Add Product", description: "Product form would open here" });
              }}
              onEditProduct={(id) => {
                toast({ title: "Edit Product", description: `Editing product ${id}` });
              }}
              onDeleteProduct={(id) => {
                toast({ title: "Product Deleted", description: `Product ${id} removed` });
              }}
              onToggleStock={(id) => {
                toast({ title: "Stock Updated", description: `Product ${id} stock toggled` });
              }}
            />
          </TabsContent>

          <TabsContent value="import">
            <Card className="p-8">
              <div className="text-center space-y-6">
                <div>
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="font-serif text-2xl font-medium mb-2">Import from Shopify</h2>
                  <p className="text-muted-foreground">
                    Upload your Shopify CSV export to bulk import or update products
                  </p>
                </div>
                
                <div className="max-w-md mx-auto">
                  <div className="border-2 border-dashed border-muted rounded-lg p-12 hover-elevate cursor-pointer">
                    <p className="text-sm text-muted-foreground">
                      Drag & drop your CSV file here, or click to browse
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline">Download Template</Button>
                  <Button>Upload CSV</Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="trivia">
            <Card className="p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-medium mb-2">Trivia Questions</h2>
                  <p className="text-muted-foreground">Manage fun facts and quiz questions</p>
                </div>
                <Button data-testid="button-add-trivia">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              <div className="grid gap-4">
                <Card className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        What region of France is Cabernet Sauvignon most famously associated with?
                      </p>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm text-muted-foreground">4 answers</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-green-600">Active</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <SettingsIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Package className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6">
              <Card className="p-6">
                <h2 className="font-serif text-xl font-medium mb-4">Discount Tiers</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Tier 1: 3-5 bottles</p>
                      <p className="text-sm text-muted-foreground">Wine & Spirits combined</p>
                    </div>
                    <p className="font-semibold">5% off</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Tier 2: 6-11 bottles</p>
                      <p className="text-sm text-muted-foreground">Wine & Spirits combined</p>
                    </div>
                    <p className="font-semibold">10% off</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Tier 3: 12-23 bottles</p>
                      <p className="text-sm text-muted-foreground">Wine & Spirits combined</p>
                    </div>
                    <p className="font-semibold">15% off</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Tier 4: 24+ bottles</p>
                      <p className="text-sm text-muted-foreground">Wine & Spirits combined</p>
                    </div>
                    <p className="font-semibold">24% off</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="font-serif text-xl font-medium mb-4">Welcome Video</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload an aerial winery video for the welcome screen background
                </p>
                <Button variant="outline">Upload Video</Button>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
