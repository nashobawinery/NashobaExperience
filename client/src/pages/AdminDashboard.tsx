import AdminProductManager from "@/components/AdminProductManager";
import FilterOptionsManager from "@/components/FilterOptionsManager";
import DiscountTiersManager from "@/components/DiscountTiersManager";
import TriviaIntervalManager from "@/components/TriviaIntervalManager";
import OrderRecipientEmailsManager from "@/components/OrderRecipientEmailsManager";
import UserRoleManager from "@/components/UserRoleManager";
import GuestAppQRCode from "@/components/GuestAppQRCode";
import SlideshowImageManager from "@/components/SlideshowImageManager";
import { MediaLibrary } from "@/components/MediaLibrary";
import VideoManager from "@/components/VideoManager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Upload, HelpCircle, Settings as SettingsIcon, ArrowLeft, Edit, Trash2, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Filter, Check, ChevronsUpDown, X, QrCode, Image, BookOpen, Video } from "lucide-react";
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
  exportProducts,
  exportAllData,
  uploadProducts,
  importAllData,
  getFilterOptions
} from "@/lib/api";
import type { Product, TriviaQuestion, FilterOption } from "@shared/schema";
import { useState, useRef, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import QRCodeLib from "qrcode";

interface AdminDashboardProps {
  onBackToGuest?: () => void;
}

export default function AdminDashboard({ onBackToGuest }: AdminDashboardProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [guestAppUrl, setGuestAppUrl] = useState("");
  
  // Product edit dialog state
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState<Partial<Product>>({});
  const [selectedCharacteristics, setSelectedCharacteristics] = useState<string[]>([]);
  const [characteristicsOpen, setCharacteristicsOpen] = useState(false);
  
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

  // Fetch filter options for dropdowns
  const { data: filterOptions = [] } = useQuery<FilterOption[]>({
    queryKey: ['/api/filter-options'],
    queryFn: () => getFilterOptions(),
  });

  // Group filter options by type
  const groupedOptions = useMemo(() => {
    const grouped = filterOptions.reduce((acc, option) => {
      if (!acc[option.fieldType]) {
        acc[option.fieldType] = [];
      }
      if (option.isActive) {
        acc[option.fieldType].push(option);
      }
      return acc;
    }, {} as Record<string, FilterOption[]>);

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return grouped;
  }, [filterOptions]);

  // Generate QR code for documentation tab
  useEffect(() => {
    const url = window.location.origin;
    setGuestAppUrl(url);

    if (qrCanvasRef.current && url) {
      QRCodeLib.toCanvas(
        qrCanvasRef.current,
        url,
        {
          width: 200,
          margin: 2,
          color: {
            dark: "#7C2D3A", // Primary burgundy color
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, []);

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
      // Parse characteristics string into array for multi-select
      if (product.characteristics) {
        const chars = product.characteristics.split(',').map(c => c.trim()).filter(Boolean);
        setSelectedCharacteristics(chars);
      } else {
        setSelectedCharacteristics([]);
      }
    }
  };

  const handleSaveProduct = () => {
    if (editProductId && editProductData) {
      // Join selected characteristics into comma-separated string
      const updatedData = {
        ...editProductData,
        characteristics: selectedCharacteristics.length > 0 
          ? selectedCharacteristics.join(', ') 
          : null
      };
      
      updateProductMutation.mutate({ 
        id: editProductId, 
        data: updatedData 
      });
      setEditProductId(null);
      setEditProductData({});
      setSelectedCharacteristics([]);
    }
  };

  const handleCancelProductEdit = () => {
    setEditProductId(null);
    setEditProductData({});
    setSelectedCharacteristics([]);
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

  const handleVideoUploadClick = () => {
    videoInputRef.current?.click();
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid File",
          description: "Please select a video file",
          variant: "destructive"
        });
        return;
      }
      setSelectedVideo(file);
      toast({
        title: "Video Selected",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      });
      // TODO: Implement video upload to server when endpoint is available
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

  const exportProductsMutation = useMutation({
    mutationFn: exportProducts,
    onSuccess: () => {
      toast({ 
        title: "Products Exported", 
        description: "Your products have been exported to an Excel file" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to export products",
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

  const exportAllDataMutation = useMutation({
    mutationFn: exportAllData,
    onSuccess: () => {
      toast({ 
        title: "All Data Exported", 
        description: "All database configuration has been exported to Excel" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to export data",
        variant: "destructive"
      });
    },
  });

  const importAllDataMutation = useMutation({
    mutationFn: importAllData,
    onSuccess: (result) => {
      setUploadResult(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/filter-options'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trivia/questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/slideshow/images'] });
      
      const totalSuccess = (result.products?.success || 0) + (result.filterOptions?.success || 0) + 
        (result.triviaQuestions?.success || 0) + (result.slideshowImages?.success || 0) + 
        (result.appSettings?.success || 0);
      const totalFailed = (result.products?.failed || 0) + (result.filterOptions?.failed || 0) + 
        (result.triviaQuestions?.failed || 0) + (result.slideshowImages?.failed || 0) + 
        (result.appSettings?.failed || 0);
      
      if (totalFailed === 0) {
        toast({ 
          title: "Import Successful", 
          description: `Successfully imported ${totalSuccess} items across all data types` 
        });
      } else {
        toast({ 
          title: "Import Completed with Some Errors", 
          description: `${totalSuccess} items imported, ${totalFailed} failed`,
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

  const handleExportProducts = () => {
    exportProductsMutation.mutate();
  };

  const handleExportAllData = () => {
    exportAllDataMutation.mutate();
  };

  const handleUploadAllData = () => {
    if (selectedFile) {
      importAllDataMutation.mutate(selectedFile);
    }
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
          <TabsList className="grid w-full grid-cols-10 max-w-6xl">
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
            <TabsTrigger value="slideshow" data-testid="tab-slideshow">
              <Image className="w-4 h-4 mr-2" />
              Slideshow
            </TabsTrigger>
            <TabsTrigger value="media" data-testid="tab-media">
              <Upload className="w-4 h-4 mr-2" />
              Media Library
            </TabsTrigger>
            <TabsTrigger value="videos" data-testid="tab-videos">
              <Video className="w-4 h-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="trivia" data-testid="tab-trivia">
              <HelpCircle className="w-4 h-4 mr-2" />
              Fun Facts
            </TabsTrigger>
            <TabsTrigger value="qrcode" data-testid="tab-qrcode">
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="documentation" data-testid="tab-documentation">
              <BookOpen className="w-4 h-4 mr-2" />
              Documentation
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
                  <h2 className="font-serif text-2xl font-medium mb-2">Database Import/Export</h2>
                  <p className="text-muted-foreground">
                    Export and import products, filters, trivia, slideshow images, and settings
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Sync Between Environments
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• <strong>Export All Data</strong> downloads everything (products, filters, trivia, slideshow images, settings)</li>
                      <li>• <strong>Import All Data</strong> syncs preview → published environments</li>
                      <li>• <strong>Export Products</strong> only exports product catalog</li>
                      <li>• Download the template to see the product column structure</li>
                      <li>• Accepted file formats: .xlsx, .xls</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadTemplate}
                      disabled={downloadTemplateMutation.isPending}
                      data-testid="button-download-template"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloadTemplateMutation.isPending ? "Downloading..." : "Download Template"}
                    </Button>
                    <Button 
                      onClick={handleExportProducts}
                      disabled={exportProductsMutation.isPending}
                      data-testid="button-export-products"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {exportProductsMutation.isPending ? "Exporting..." : "Export Products"}
                    </Button>
                    <Button 
                      onClick={handleExportAllData}
                      disabled={exportAllDataMutation.isPending}
                      variant="default"
                      data-testid="button-export-all-data"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {exportAllDataMutation.isPending ? "Exporting..." : "Export All Data"}
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

                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploadProductsMutation.isPending}
                      variant="outline"
                      data-testid="button-upload-products"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadProductsMutation.isPending ? "Uploading..." : "Upload Products Only"}
                    </Button>
                    <Button
                      onClick={handleUploadAllData}
                      disabled={!selectedFile || importAllDataMutation.isPending}
                      data-testid="button-import-all-data"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importAllDataMutation.isPending ? "Importing..." : "Import All Data"}
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

          <TabsContent value="slideshow">
            <SlideshowImageManager />
          </TabsContent>

          <TabsContent value="media">
            <MediaLibrary />
          </TabsContent>

          <TabsContent value="videos">
            <VideoManager />
          </TabsContent>

          <TabsContent value="qrcode">
            <GuestAppQRCode />
          </TabsContent>

          <TabsContent value="documentation">
            <Card className="p-8">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h2 className="font-serif text-3xl font-medium mb-2">Nashoba Tasting Experience App</h2>
                  <p className="text-lg text-muted-foreground">Staff Training Guide</p>
                </div>

                {/* QR Code Display */}
                <div className="mb-8 p-6 bg-muted/50 rounded-lg border-2 border-primary/20">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                      <canvas ref={qrCanvasRef} className="border-2 border-primary/20 rounded-lg" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <QrCode className="w-5 h-5 text-primary" />
                        <h3 className="font-serif text-xl font-medium">Guest Access QR Code</h3>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        Have guests scan this code to access the tasting app on their phones
                      </p>
                      <p className="text-sm text-muted-foreground/80 font-mono break-all">
                        {guestAppUrl}
                      </p>
                      <p className="text-sm text-muted-foreground mt-3 italic">
                        For a printable version, visit the QR Code tab
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Overview Section */}
                  <section>
                    <h3 className="font-serif text-2xl font-medium mb-4 text-primary">Overview</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      The Nashoba Tasting Experience App is a mobile-first digital companion designed to enhance the guest experience during wine tastings. The app provides product education, personalized AI-powered recommendations, engaging trivia, streamlined purchasing, and valuable feedback collection. It complements—never replaces—the expertise and personal touch of our staff.
                    </p>
                  </section>

                  {/* Guest Experience Section */}
                  <section>
                    <h3 className="font-serif text-2xl font-medium mb-4 text-primary">Guest Experience Flow</h3>
                    
                    <div className="space-y-6">
                      <div className="bg-muted/50 rounded-lg p-6">
                        <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">1</span>
                          Welcome & Introduction
                        </h4>
                        <p className="text-muted-foreground ml-10">
                          Guests scan a QR code (available in the QR Code tab) to access the app. They enter their name and are greeted with a beautiful 4-slide introduction featuring winery photos, explaining the app's purpose, and emphasizing that the app complements our staff's expertise.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-6">
                        <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">2</span>
                          Browse Products
                        </h4>
                        <p className="text-muted-foreground ml-10 mb-3">
                          Guests can browse all available products (wines, spirits, beers, canned cocktails, ciders) with professional filtering options:
                        </p>
                        <ul className="text-muted-foreground ml-10 space-y-1">
                          <li>• Category (Wine, Spirit, Beer, Canned Cocktail, Cider)</li>
                          <li>• Wine color (Red, White, Rosé, Sparkling)</li>
                          <li>• Sweetness levels (Dry, Off-Dry, Semi-Sweet, Sweet)</li>
                          <li>• Body (Light, Medium, Full)</li>
                          <li>• Characteristics (Fruity, Oak-Aged, Crisp, etc.)</li>
                        </ul>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-6">
                        <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">3</span>
                          Product Details & Notes
                        </h4>
                        <p className="text-muted-foreground ml-10 mb-3">
                          Clicking any product opens an elegant detail page showing:
                        </p>
                        <ul className="text-muted-foreground ml-10 space-y-1">
                          <li>• Large bottle image</li>
                          <li>• Full description and tasting notes</li>
                          <li>• Technical details (alcohol %, vintage, varietals)</li>
                          <li>• Awards and recognition</li>
                          <li>• Ability to favorite, add notes, and add to cart</li>
                        </ul>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-6">
                        <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">4</span>
                          Auto-Popup Trivia
                        </h4>
                        <p className="text-muted-foreground ml-10 mb-3">
                          Every 4 minutes, a trivia popup automatically appears with 10 random Nashoba-specific questions about winery history, products, and heritage. This keeps guests engaged during the tasting experience.
                        </p>
                        <p className="text-muted-foreground ml-10 font-medium">
                          Reward: Perfect score (10/10) earns guests a $5 credit applied to their cart.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-6">
                        <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">5</span>
                          AI-Powered Recommendations
                        </h4>
                        <p className="text-muted-foreground ml-10">
                          After guests interact with at least 2 products (viewing, favoriting, or adding to cart), the AI recommendation engine analyzes their preferences and suggests personalized product matches with natural language explanations, just like a sommelier would.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-6">
                        <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">6</span>
                          Shopping Cart & Discounts
                        </h4>
                        <p className="text-muted-foreground ml-10 mb-3">
                          Guests can add products to their cart with automatic tier-based discounts:
                        </p>
                        <ul className="text-muted-foreground ml-10 space-y-1">
                          <li>• 3-5 bottles: 5% off</li>
                          <li>• 6-11 bottles: 12% off</li>
                          <li>• 12-23 bottles: 18% off</li>
                          <li>• 24+ bottles: 24% off</li>
                        </ul>
                        <p className="text-muted-foreground ml-10 mt-3">
                          Note: Discount tiers are configurable in the Settings tab.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-6">
                        <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">7</span>
                          Email Summary & Survey
                        </h4>
                        <p className="text-muted-foreground ml-10 mb-3">
                          Guests can email their cart order or favorites list to onsiteorder@nashobawinery.com. The email includes:
                        </p>
                        <ul className="text-muted-foreground ml-10 space-y-1">
                          <li>• Product details with guest notes</li>
                          <li>• Pricing and discount breakdowns</li>
                          <li>• Total amounts</li>
                        </ul>
                        <p className="text-muted-foreground ml-10 mt-3">
                          After emailing, guests are prompted to complete a 7-question tasting survey for valuable feedback.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Admin Tools Section */}
                  <section>
                    <h3 className="font-serif text-2xl font-medium mb-4 text-primary">Admin Dashboard Tools</h3>
                    
                    <div className="space-y-4">
                      <div className="border-l-4 border-primary pl-4">
                        <h4 className="font-medium mb-2">Products Tab</h4>
                        <p className="text-sm text-muted-foreground">
                          Full CRUD operations for managing product inventory. Edit all 32+ fields including descriptions, images, pricing, stock levels, wine details, tasting notes, and recognition. Toggle inventory tracking per product (Ignored vs Tracked).
                        </p>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <h4 className="font-medium mb-2">Import/Export Tab</h4>
                        <p className="text-sm text-muted-foreground">
                          Bulk import/update products via Excel file. Download a template with proper column structure, fill it in, and upload to create or update multiple products at once.
                        </p>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <h4 className="font-medium mb-2">Filters Tab</h4>
                        <p className="text-sm text-muted-foreground">
                          Manage all filter options (categories, wine colors, sweetness, body, characteristics). Add, edit, delete, reorder, and activate/deactivate options. Changes appear instantly in the guest app.
                        </p>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <h4 className="font-medium mb-2">Slideshow Tab</h4>
                        <p className="text-sm text-muted-foreground">
                          Upload and manage winery photos for the welcome screen slideshow. Add captions, descriptions, reorder slides, and activate/deactivate images. Warning appears if no images are active.
                        </p>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <h4 className="font-medium mb-2">Fun Facts Tab</h4>
                        <p className="text-sm text-muted-foreground">
                          Create and manage trivia questions that appear to guests every 4 minutes. Each question includes 4 possible answers, explanation, and difficulty level. Currently contains 28 Nashoba-specific questions.
                        </p>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <h4 className="font-medium mb-2">QR Code Tab</h4>
                        <p className="text-sm text-muted-foreground">
                          Generate a QR code that guests can scan to access the app. Download as PNG for digital signage or print directly for physical display at the tasting bar.
                        </p>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <h4 className="font-medium mb-2">Settings Tab</h4>
                        <p className="text-sm text-muted-foreground">
                          Configure discount tiers (bottle quantities and percentages) and upload welcome screen videos. Discount changes apply immediately to all guest carts.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Key Features Section */}
                  <section>
                    <h3 className="font-serif text-2xl font-medium mb-4 text-primary">Key Features</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">Product-Agnostic Language</h4>
                        <p className="text-sm text-muted-foreground">
                          The app uses generic "product" terminology, not wine-specific language, making it suitable for wines, spirits, beers, canned cocktails, and ciders.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">Mobile-First Design</h4>
                        <p className="text-sm text-muted-foreground">
                          Optimized for smartphones with bottom navigation, elegant card layouts, and burgundy/gold color scheme matching Nashoba branding.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">Session-Based Tracking</h4>
                        <p className="text-sm text-muted-foreground">
                          No login required. Each guest's preferences, favorites, cart, and notes are tracked throughout their visit for personalized recommendations.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">Inventory Control</h4>
                        <p className="text-sm text-muted-foreground">
                          Per-product inventory toggle: "Ignored" products always appear regardless of stock; "Tracked" products only show when in stock.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">Favorites & Notes</h4>
                        <p className="text-sm text-muted-foreground">
                          Guests can favorite any product and add personal tasting notes to ALL products (not just favorites), creating a personalized tasting journal.
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">AI Recommendations</h4>
                        <p className="text-sm text-muted-foreground">
                          GPT-4 powered recommendation engine analyzes guest preferences to suggest products with natural language explanations (requires 2+ interactions).
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Staff Guidelines Section */}
                  <section className="border-t pt-6">
                    <h3 className="font-serif text-2xl font-medium mb-4 text-primary">Staff Guidelines</h3>
                    
                    <div className="space-y-4">
                      <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                        <h4 className="font-medium text-lg mb-3">The App Complements, Never Replaces</h4>
                        <p className="text-muted-foreground mb-3">
                          The app is designed to enhance the tasting experience, not replace our staff's expertise and personal touch. Encourage guests to:
                        </p>
                        <ul className="text-muted-foreground space-y-2">
                          <li>• Use the app while waiting or between tastings</li>
                          <li>• Reference product details and notes during conversations</li>
                          <li>• Share their favorites and notes with staff for better recommendations</li>
                          <li>• Ask staff questions beyond what the app provides</li>
                        </ul>
                      </div>

                      <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                        <h4 className="font-medium text-lg mb-3">How to Introduce the App</h4>
                        <p className="text-muted-foreground mb-3">
                          When guests arrive, briefly mention:
                        </p>
                        <p className="text-muted-foreground italic">
                          "We have a digital companion app you can access by scanning this QR code. It has product details, tasting notes, and fun trivia about Nashoba. Feel free to use it during your visit, and don't hesitate to ask me any questions!"
                        </p>
                      </div>

                      <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                        <h4 className="font-medium text-lg mb-3">Handling Orders</h4>
                        <p className="text-muted-foreground">
                          When guests email their cart, the order arrives at onsiteorder@nashobawinery.com with full details, guest notes, and discount calculations. Staff can review and process these orders through your existing fulfillment system.
                        </p>
                      </div>

                      <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                        <h4 className="font-medium text-lg mb-3">Product Updates</h4>
                        <p className="text-muted-foreground">
                          Keep product information current by regularly updating descriptions, stock levels, and featured products in the Products tab. Changes appear instantly in the guest app.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Technical Information Section */}
                  <section className="border-t pt-6">
                    <h3 className="font-serif text-2xl font-medium mb-4 text-primary">Technical Information</h3>
                    
                    <div className="bg-muted/50 rounded-lg p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Email Configuration</h4>
                          <p className="text-sm text-muted-foreground">
                            Orders sent to: <span className="font-mono">onsiteorder@nashobawinery.com</span>
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Trivia Timing</h4>
                          <p className="text-sm text-muted-foreground">
                            Auto-popup every 4 minutes with 10 random questions
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">AI Requirements</h4>
                          <p className="text-sm text-muted-foreground">
                            Minimum 2 guest interactions to activate recommendations
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Database</h4>
                          <p className="text-sm text-muted-foreground">
                            PostgreSQL with real-time updates across all features
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Contact Information */}
                  <section className="border-t pt-6 text-center">
                    <p className="text-muted-foreground">
                      For technical support or questions about the app, please contact your IT administrator.
                    </p>
                  </section>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6">
              <UserRoleManager />
              
              <DiscountTiersManager />
              
              <OrderRecipientEmailsManager />
              
              <TriviaIntervalManager />

              <Card className="p-6">
                <h2 className="font-serif text-xl font-medium mb-4">Welcome Video</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload an aerial winery video for the welcome screen background
                </p>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoChange}
                  data-testid="input-video-upload"
                />
                <Button 
                  variant="outline" 
                  onClick={handleVideoUploadClick}
                  data-testid="button-upload-video"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedVideo ? `Selected: ${selectedVideo.name}` : 'Upload Video'}
                </Button>
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
                  <Select
                    value={editProductData.category || ''}
                    onValueChange={(value) => setEditProductData({ ...editProductData, category: value as "wine" | "spirits" | "beer" | "canned_cocktail" | "canned_wine" })}
                  >
                    <SelectTrigger data-testid="select-edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedOptions.category?.map((option) => (
                        <SelectItem key={option.id} value={option.optionValue}>
                          {option.displayLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            {/* Product Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Product Details & Search Criteria</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-wine-color">Wine Color</Label>
                  <Select
                    value={editProductData.type || ''}
                    onValueChange={(value) => setEditProductData({ ...editProductData, type: value })}
                  >
                    <SelectTrigger data-testid="select-edit-wine-color">
                      <SelectValue placeholder="Select wine color" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedOptions.wine_color?.map((option) => (
                        <SelectItem key={option.id} value={option.optionValue}>
                          {option.displayLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sweetness">Sweetness</Label>
                  <Select
                    value={editProductData.sweetness || ''}
                    onValueChange={(value) => setEditProductData({ ...editProductData, sweetness: value })}
                  >
                    <SelectTrigger data-testid="select-edit-sweetness">
                      <SelectValue placeholder="Select sweetness level" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedOptions.sweetness?.map((option) => (
                        <SelectItem key={option.id} value={option.optionValue}>
                          {option.displayLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-body">Body</Label>
                  <Select
                    value={editProductData.body || ''}
                    onValueChange={(value) => setEditProductData({ ...editProductData, body: value })}
                  >
                    <SelectTrigger data-testid="select-edit-body">
                      <SelectValue placeholder="Select body" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedOptions.body?.map((option) => (
                        <SelectItem key={option.id} value={option.optionValue}>
                          {option.displayLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Popover open={characteristicsOpen} onOpenChange={setCharacteristicsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={characteristicsOpen}
                        className="w-full justify-between font-normal h-auto min-h-9"
                        data-testid="button-edit-characteristics"
                      >
                        <div className="flex flex-wrap gap-1">
                          {selectedCharacteristics.length > 0 ? (
                            selectedCharacteristics.map((char) => (
                              <Badge
                                key={char}
                                variant="secondary"
                                className="text-xs"
                              >
                                {char}
                                <button
                                  className="ml-1 hover:bg-muted rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCharacteristics(selectedCharacteristics.filter(c => c !== char));
                                  }}
                                  type="button"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Select characteristics...</span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search characteristics..." />
                        <CommandEmpty>No characteristics found.</CommandEmpty>
                        <CommandList>
                          {/* Sweetness options */}
                          {groupedOptions.sweetness && groupedOptions.sweetness.length > 0 && (
                            <CommandGroup heading="Sweetness">
                              {groupedOptions.sweetness.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  onSelect={() => {
                                    setSelectedCharacteristics(
                                      selectedCharacteristics.includes(option.optionValue)
                                        ? selectedCharacteristics.filter((c) => c !== option.optionValue)
                                        : [...selectedCharacteristics, option.optionValue]
                                    );
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedCharacteristics.includes(option.optionValue)}
                                    className="mr-2"
                                  />
                                  {option.displayLabel}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {/* Body options */}
                          {groupedOptions.body && groupedOptions.body.length > 0 && (
                            <CommandGroup heading="Body">
                              {groupedOptions.body.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  onSelect={() => {
                                    setSelectedCharacteristics(
                                      selectedCharacteristics.includes(option.optionValue)
                                        ? selectedCharacteristics.filter((c) => c !== option.optionValue)
                                        : [...selectedCharacteristics, option.optionValue]
                                    );
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedCharacteristics.includes(option.optionValue)}
                                    className="mr-2"
                                  />
                                  {option.displayLabel}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {/* Characteristics options */}
                          {groupedOptions.characteristics && groupedOptions.characteristics.length > 0 && (
                            <CommandGroup heading="Other Characteristics">
                              {groupedOptions.characteristics.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  onSelect={() => {
                                    setSelectedCharacteristics(
                                      selectedCharacteristics.includes(option.optionValue)
                                        ? selectedCharacteristics.filter((c) => c !== option.optionValue)
                                        : [...selectedCharacteristics, option.optionValue]
                                    );
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedCharacteristics.includes(option.optionValue)}
                                    className="mr-2"
                                  />
                                  {option.displayLabel}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                  <Label htmlFor="edit-wine-of-month" className="cursor-pointer">Product of the Month</Label>
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
