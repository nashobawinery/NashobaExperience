import AdminProductManager from "@/components/AdminProductManager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Upload, HelpCircle, Settings as SettingsIcon, ArrowLeft, Edit, Trash2, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
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
    toast({ title: "Edit Product", description: `Editing product ${id}` });
  };

  const handleDeleteProduct = (id: string) => {
    deleteProductMutation.mutate(id);
  };

  const handleToggleStock = (id: string) => {
    const product = products.find((p: Product) => p.id === id);
    if (product) {
      const newStock = product.stock === 'in-stock' ? 'out-of-stock' : 'in-stock';
      updateProductMutation.mutate({ 
        id, 
        data: { stock: newStock } 
      });
    }
  };

  const handleAddTrivia = () => {
    toast({ title: "Add Question", description: "Trivia form would open here" });
  };

  const handleEditTrivia = (id: string) => {
    toast({ title: "Edit Question", description: `Editing question ${id}` });
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
