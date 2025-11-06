import AdminProductManager from "@/components/AdminProductManager";
import FilterOptionsManager from "@/components/FilterOptionsManager";
import DiscountTiersManager from "@/components/DiscountTiersManager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Upload, HelpCircle, Settings as SettingsIcon, ArrowLeft, Edit, Trash2, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getTriviaQuestions,
  createTriviaQuestion,
  updateTriviaQuestion,
  deleteTriviaQuestion,
  downloadProductTemplate,
  uploadProducts
} from "@/lib/api";
import type { Product, TriviaQuestion } from "@shared/schema";
import { useState, useRef } from "react";

interface AdminDashboardProps {
  onBackToGuest?: () => void;
}

export default function AdminDashboard({ onBackToGuest }: AdminDashboardProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Product edit dialog state
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState<Partial<Product>>({});
  
  // Trivia edit dialog state
  const [editTriviaId, setEditTriviaId] = useState<string | null>(null);
  const [editTriviaData, setEditTriviaData] = useState<Partial<TriviaQuestion>>({});

  // Fetch products from backend
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => getProducts(),
  });

  // Fetch trivia questions from backend
  const { data: triviaQuestions = [], isLoading: triviaLoading } = useQuery({
    queryKey: ['/api/trivia/questions'],
    queryFn: () => getTriviaQuestions(false), // Get all questions, not just active ones
  });

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ 
        title: "Product Created", 
        description: "The product was successfully created" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create product",
        variant: "destructive"
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ 
        title: "Product Updated", 
        description: "The product was successfully updated" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update product",
        variant: "destructive"
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ 
        title: "Product Deleted", 
        description: "The product was successfully removed" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to delete product",
        variant: "destructive"
      });
    },
  });

  // Trivia mutations
  const createTriviaMutation = useMutation({
    mutationFn: createTriviaQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trivia/questions'] });
      toast({ 
        title: "Question Created", 
        description: "The trivia question was successfully created" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create trivia question",
        variant: "destructive"
      });
    },
  });

  const updateTriviaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTriviaQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trivia/questions'] });
      toast({ 
        title: "Question Updated", 
        description: "The trivia question was successfully updated" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update trivia question",
        variant: "destructive"
      });
    },
  });

  const deleteTriviaMutation = useMutation({
    mutationFn: deleteTriviaQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trivia/questions'] });
      toast({ 
        title: "Question Deleted", 
        description: "The trivia question was successfully removed" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to delete trivia question",
        variant: "destructive"
      });
    },
  });

  // Handler functions
  const handleAddProduct = () => {
    toast({ title: "Add Product", description: "Product form would open here" });
  };

  const handleEditProduct = (id: string) => {
    const product = products.find((p: Product) => p.id === id);
    if (product) {
      setEditProductId(id);
      setEditProductData(product);
    }
  };

  const handleSaveProduct = () => {
    if (editProductId && editProductData) {
      updateProductMutation.mutate({ 
        id: editProductId, 
        data: editProductData 
      });
      setEditProductId(null);
      setEditProductData({});
    }
  };

  const handleCancelProductEdit = () => {
    setEditProductId(null);
    setEditProductData({});
  };

  const handleDeleteProduct = (id: string) => {
    deleteProductMutation.mutate(id);
  };

  const handleToggleStock = (id: string) => {
    const product = products.find((p: Product) => p.id === id);
    if (product) {
      const newStockQuantity = (product.stockQuantity ?? 0) > 0 ? 0 : 50;
      updateProductMutation.mutate({ 
        id, 
        data: { stockQuantity: newStockQuantity } 
      });
    }
  };

  const handleToggleIgnoreInventory = (id: string) => {
    const product = products.find((p: Product) => p.id === id);
    if (product) {
      updateProductMutation.mutate({ 
        id, 
        data: { ignoreInventory: !product.ignoreInventory } 
      });
    }
  };

  const handleAddTrivia = () => {
    toast({ title: "Add Question", description: "Trivia form would open here" });
  };

  const handleEditTrivia = (id: string) => {
    const question = triviaQuestions.find((q: TriviaQuestion) => q.id === id);
    if (question) {
      setEditTriviaId(id);
      setEditTriviaData(question);
    }
  };

  const handleSaveTrivia = () => {
    if (editTriviaId && editTriviaData) {
      updateTriviaMutation.mutate({ 
        id: editTriviaId, 
        data: editTriviaData 
      });
      setEditTriviaId(null);
      setEditTriviaData({});
    }
  };

  const handleCancelTriviaEdit = () => {
    setEditTriviaId(null);
    setEditTriviaData({});
  };

  const handleDeleteTrivia = (id: string) => {
    deleteTriviaMutation.mutate(id);
  };

  const handleToggleTriviaActive = (id: string) => {
    const question = triviaQuestions.find((q: TriviaQuestion) => q.id === id);
    if (question) {
      updateTriviaMutation.mutate({ 
        id, 
        data: { isActive: !question.isActive } 
      });
    }
  };

  // Excel import/export mutations
  const downloadTemplateMutation = useMutation({
    mutationFn: downloadProductTemplate,
    onSuccess: () => {
      toast({ 
        title: "Template Downloaded", 
        description: "Excel template has been downloaded to your computer" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to download template",
        variant: "destructive"
      });
    },
  });

  const uploadProductsMutation = useMutation({
    mutationFn: uploadProducts,
    onSuccess: (result) => {
      setUploadResult(result);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      if (result.failed === 0) {
        toast({ 
          title: "Import Successful", 
          description: `Successfully imported ${result.success} products` 
        });
      } else {
        toast({ 
          title: "Import Completed with Errors", 
          description: `${result.success} products imported, ${result.failed} failed`,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Import Failed", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Excel import handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setUploadResult(null);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive"
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadProductsMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplateMutation.mutate();
  };

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
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="products" data-testid="tab-products">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-import">
              <Upload className="w-4 h-4 mr-2" />
              Import/Export
            </TabsTrigger>
            <TabsTrigger value="filters" data-testid="tab-filters">
              <Filter className="w-4 h-4 mr-2" />
              Filters
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
            {productsLoading ? (
              <Card className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </Card>
            ) : (
              <AdminProductManager
                products={products}
                onAddProduct={handleAddProduct}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                onToggleStock={handleToggleStock}
                onToggleIgnoreInventory={handleToggleIgnoreInventory}
              />
            )}
          </TabsContent>

          <TabsContent value="import">
            <Card className="p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="font-serif text-2xl font-medium mb-2">Product Import/Export</h2>
                  <p className="text-muted-foreground">
                    Upload an Excel file to bulk import or update products
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel Format Instructions
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• Download the template to see the required column structure</li>
                      <li>• Required fields: Name, Category, Price</li>
                      <li>• Optional fields: Description, Wine Color, Sweetness, Stock Status</li>
                      <li>• Use the exact column names from the template</li>
                      <li>• Accepted file formats: .xlsx, .xls</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadTemplate}
                      disabled={downloadTemplateMutation.isPending}
                      data-testid="button-download-template"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloadTemplateMutation.isPending ? "Downloading..." : "Download Template"}
                    </Button>
                  </div>

                  <div className="border-2 border-dashed border-muted rounded-lg p-8">
                    <div className="text-center space-y-4">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="excel-file-input"
                          data-testid="input-excel-file"
                        />
                        <label htmlFor="excel-file-input">
                          <Button variant="outline" asChild data-testid="button-select-file">
                            <span className="cursor-pointer">
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              Select Excel File
                            </span>
                          </Button>
                        </label>
                        <p className="text-sm text-muted-foreground mt-2">
                          or drag and drop your .xlsx or .xls file here
                        </p>
                      </div>

                      {selectedFile && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                          <FileSpreadsheet className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium" data-testid="text-selected-file">
                            {selectedFile.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            data-testid="button-clear-file"
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploadProductsMutation.isPending}
                      data-testid="button-upload-products"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadProductsMutation.isPending ? "Uploading..." : "Upload Products"}
                    </Button>
                  </div>

                  {uploadResult && (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${uploadResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        <div className="flex items-start gap-3">
                          {uploadResult.failed === 0 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium mb-1" data-testid="text-upload-result-title">
                              {uploadResult.failed === 0 ? 'Import Successful' : 'Import Completed with Issues'}
                            </h4>
                            <p className="text-sm" data-testid="text-upload-result-summary">
                              <strong>{uploadResult.success}</strong> products successfully imported
                              {uploadResult.failed > 0 && (
                                <>, <strong>{uploadResult.failed}</strong> products failed</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Import Errors
                          </h4>
                          <ul className="text-sm text-red-800 space-y-1" data-testid="list-upload-errors">
                            {uploadResult.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
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
                <Button onClick={handleAddTrivia} data-testid="button-add-trivia">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              {triviaLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : triviaQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No trivia questions yet. Create one to get started!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {triviaQuestions.map((question: TriviaQuestion) => (
                    <Card key={question.id} className="p-4" data-testid={`card-trivia-${question.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-2">
                            {question.question}
                          </p>
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-sm text-muted-foreground">
                              {Array.isArray(question.answers) ? question.answers.length : 0} answers
                            </span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <Badge 
                              variant={question.isActive ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => handleToggleTriviaActive(question.id)}
                              data-testid={`badge-trivia-status-${question.id}`}
                            >
                              {question.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditTrivia(question.id)}
                            data-testid={`button-edit-trivia-${question.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteTrivia(question.id)}
                            data-testid={`button-delete-trivia-${question.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="filters">
            <FilterOptionsManager />
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6">
              <DiscountTiersManager />

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

      {/* Product Edit Dialog */}
      <Dialog open={editProductId !== null} onOpenChange={(open) => !open && handleCancelProductEdit()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update all product details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input
                    id="edit-name"
                    value={editProductData.name || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Category *</Label>
                  <select
                    id="edit-category"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={editProductData.category || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, category: e.target.value as "wine" | "spirits" | "beer" | "canned_cocktail" | "canned_wine" })}
                  >
                    <option value="wine">Wine</option>
                    <option value="spirits">Spirits</option>
                    <option value="beer">Beer</option>
                    <option value="canned_cocktail">Canned Cocktail</option>
                    <option value="canned_wine">Canned Wine</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={editProductData.description || ''}
                  onChange={(e) => setEditProductData({ ...editProductData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sku">SKU</Label>
                <Input
                  id="edit-sku"
                  value={editProductData.sku || ''}
                  onChange={(e) => setEditProductData({ ...editProductData, sku: e.target.value })}
                />
              </div>
            </div>

            {/* Wine Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Wine Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Input
                    id="edit-type"
                    value={editProductData.type || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, type: e.target.value })}
                    placeholder="e.g., Red Wine, Whiskey"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-varietal">Varietal</Label>
                  <Input
                    id="edit-varietal"
                    value={editProductData.varietal || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, varietal: e.target.value })}
                    placeholder="e.g., Cabernet Sauvignon"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-vintage">Vintage Year</Label>
                  <Input
                    id="edit-vintage"
                    value={editProductData.vintageYear || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, vintageYear: e.target.value })}
                    placeholder="e.g., 2020"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-region">Region</Label>
                  <Input
                    id="edit-region"
                    value={editProductData.region || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, region: e.target.value })}
                    placeholder="e.g., Nashoba Valley"
                  />
                </div>
              </div>
            </div>

            {/* Tasting & Serving */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Tasting & Serving</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-tasting-notes">Tasting Notes</Label>
                  <Textarea
                    id="edit-tasting-notes"
                    value={editProductData.tastingNotes || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, tastingNotes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-food-pairings">Food Pairings</Label>
                  <Textarea
                    id="edit-food-pairings"
                    value={editProductData.foodPairings || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, foodPairings: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-characteristics">Characteristics</Label>
                  <Input
                    id="edit-characteristics"
                    value={editProductData.characteristics || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, characteristics: e.target.value })}
                    placeholder="e.g., Dry, Full-bodied, Crisp"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-serving-temp">Serving Temperature</Label>
                    <Input
                      id="edit-serving-temp"
                      value={editProductData.servingTemp || ''}
                      onChange={(e) => setEditProductData({ ...editProductData, servingTemp: e.target.value })}
                      placeholder="e.g., 55-60°F"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-alcohol">Alcohol Content</Label>
                    <Input
                      id="edit-alcohol"
                      value={editProductData.alcoholContent || ''}
                      onChange={(e) => setEditProductData({ ...editProductData, alcoholContent: e.target.value })}
                      placeholder="e.g., 13.5%"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Production */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Production</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-production-method">Production Method</Label>
                  <Textarea
                    id="edit-production-method"
                    value={editProductData.productionMethod || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, productionMethod: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-aging">Aging Process</Label>
                  <Textarea
                    id="edit-aging"
                    value={editProductData.agingProcess || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, agingProcess: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-bottle-size">Bottle Size</Label>
                  <Input
                    id="edit-bottle-size"
                    value={editProductData.bottleSize || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, bottleSize: e.target.value })}
                    placeholder="e.g., 750ml"
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Pricing & Inventory</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">Retail Price *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={editProductData.price || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, price: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-cost">Cost</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    step="0.01"
                    value={editProductData.cost || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, cost: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-wholesale">Wholesale Price</Label>
                  <Input
                    id="edit-wholesale"
                    type="number"
                    step="0.01"
                    value={editProductData.wholesalePricing || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, wholesalePricing: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-stock">Stock Quantity</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    value={editProductData.stockQuantity || 0}
                    onChange={(e) => setEditProductData({ ...editProductData, stockQuantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-low-stock">Low Stock Threshold</Label>
                  <Input
                    id="edit-low-stock"
                    type="number"
                    value={editProductData.lowStockThreshold || 10}
                    onChange={(e) => setEditProductData({ ...editProductData, lowStockThreshold: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Images</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-image-url">Main Image URL</Label>
                  <Input
                    id="edit-image-url"
                    value={editProductData.imageUrl || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-label-image">Label Image URL</Label>
                  <Input
                    id="edit-label-image"
                    value={editProductData.labelImageUrl || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, labelImageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lifestyle-image">Lifestyle Image URL</Label>
                  <Input
                    id="edit-lifestyle-image"
                    value={editProductData.lifestyleImageUrl || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, lifestyleImageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Recognition */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Recognition</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-awards">Awards</Label>
                  <Textarea
                    id="edit-awards"
                    value={editProductData.awards || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, awards: e.target.value })}
                    rows={2}
                    placeholder="List awards and recognitions"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-rating">Rating (0-5)</Label>
                  <Input
                    id="edit-rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={editProductData.rating || ''}
                    onChange={(e) => setEditProductData({ ...editProductData, rating: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Flags & Tags */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Flags & Tags</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-available"
                    checked={editProductData.available ?? true}
                    onChange={(e) => setEditProductData({ ...editProductData, available: e.target.checked })}
                    className="w-4 h-4 rounded border-input"
                  />
                  <Label htmlFor="edit-available" className="cursor-pointer">Available for Purchase</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-ignore-inventory"
                    checked={editProductData.ignoreInventory ?? true}
                    onChange={(e) => setEditProductData({ ...editProductData, ignoreInventory: e.target.checked })}
                    className="w-4 h-4 rounded border-input"
                  />
                  <Label htmlFor="edit-ignore-inventory" className="cursor-pointer">Ignore Inventory</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-featured"
                    checked={editProductData.featured ?? false}
                    onChange={(e) => setEditProductData({ ...editProductData, featured: e.target.checked })}
                    className="w-4 h-4 rounded border-input"
                  />
                  <Label htmlFor="edit-featured" className="cursor-pointer">Featured Product</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-new-arrival"
                    checked={editProductData.newArrival ?? false}
                    onChange={(e) => setEditProductData({ ...editProductData, newArrival: e.target.checked })}
                    className="w-4 h-4 rounded border-input"
                  />
                  <Label htmlFor="edit-new-arrival" className="cursor-pointer">New Arrival</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-staff-pick"
                    checked={editProductData.staffPick ?? false}
                    onChange={(e) => setEditProductData({ ...editProductData, staffPick: e.target.checked })}
                    className="w-4 h-4 rounded border-input"
                  />
                  <Label htmlFor="edit-staff-pick" className="cursor-pointer">Staff Pick</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-wine-of-month"
                    checked={editProductData.wineOfMonth ?? false}
                    onChange={(e) => setEditProductData({ ...editProductData, wineOfMonth: e.target.checked })}
                    className="w-4 h-4 rounded border-input"
                  />
                  <Label htmlFor="edit-wine-of-month" className="cursor-pointer">Wine of the Month</Label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={Array.isArray(editProductData.tags) ? editProductData.tags.join(', ') : ''}
                  onChange={(e) => setEditProductData({ 
                    ...editProductData, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  })}
                  placeholder="e.g., organic, local, award-winning"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelProductEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trivia Edit Dialog */}
      <Dialog open={editTriviaId !== null} onOpenChange={(open) => !open && handleCancelTriviaEdit()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trivia Question</DialogTitle>
            <DialogDescription>Update the question and answers</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-question">Question</Label>
              <Textarea
                id="edit-question"
                value={editTriviaData.question || ''}
                onChange={(e) => setEditTriviaData({ ...editTriviaData, question: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Answers (one per line)</Label>
              <Textarea
                value={Array.isArray(editTriviaData.answers) ? editTriviaData.answers.join('\n') : ''}
                onChange={(e) => setEditTriviaData({ 
                  ...editTriviaData, 
                  answers: e.target.value.split('\n').filter(a => a.trim())
                })}
                rows={4}
                placeholder="Answer 1&#10;Answer 2&#10;Answer 3&#10;Answer 4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-correct-index">Correct Answer Index (0-3)</Label>
              <Input
                id="edit-correct-index"
                type="number"
                min="0"
                max="3"
                value={editTriviaData.correctIndex ?? 0}
                onChange={(e) => setEditTriviaData({ ...editTriviaData, correctIndex: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-explanation">Explanation</Label>
              <Textarea
                id="edit-explanation"
                value={editTriviaData.explanation || ''}
                onChange={(e) => setEditTriviaData({ ...editTriviaData, explanation: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelTriviaEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveTrivia}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
