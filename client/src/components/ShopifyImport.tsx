import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ShopifyPreviewProduct {
  product: {
    sku: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    category: string;
    type?: string;
  };
  action: 'create' | 'update';
  existingProduct?: {
    id: string;
    name: string;
    price: string;
    sku: string;
  };
}

interface ShopifyPreview {
  products: ShopifyPreviewProduct[];
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
  };
  errors: string[];
}

interface ShopifyImportResult {
  message: string;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

export default function ShopifyImportComponent() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ShopifyPreview | null>(null);
  const [importResult, setImportResult] = useState<ShopifyImportResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/shopify/preview', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to preview import" }));
        throw new Error(errorData.message);
      }
      
      return response.json();
    },
    onSuccess: (data: ShopifyPreview) => {
      setPreview(data);
      setImportResult(null);
      if (data.errors.length > 0) {
        toast({
          title: "Preview Ready with Warnings",
          description: `${data.summary.total} products found, ${data.errors.length} rows skipped`,
          variant: "default",
        });
      } else {
        toast({
          title: "Preview Ready",
          description: `${data.summary.toCreate} to create, ${data.summary.toUpdate} to update`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/shopify/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to import products" }));
        throw new Error(errorData.message);
      }
      
      return response.json();
    },
    onSuccess: (data: ShopifyImportResult) => {
      setImportResult(data);
      setPreview(null);
      if (data.failed === 0) {
        toast({
          title: "Import Successful",
          description: `${data.created} created, ${data.updated} updated`,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${data.created + data.updated} successful, ${data.failed} failed`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(null);
      setImportResult(null);
    }
  };

  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover-elevate active-elevate-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
            id="shopify-csv-upload"
            data-testid="input-shopify-csv"
          />
          <label htmlFor="shopify-csv-upload" className="cursor-pointer">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <Button variant="outline" size="default" asChild>
              <span data-testid="button-select-csv">
                <Upload className="w-4 h-4 mr-2" />
                Select CSV File
              </span>
            </Button>
          </label>
          <p className="text-sm text-muted-foreground mt-2">
            Upload Shopify product export CSV
          </p>
        </div>

        {selectedFile && (
          <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg mt-4">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium" data-testid="text-selected-csv">
              {selectedFile.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFile}
              data-testid="button-clear-csv"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <Button
          onClick={handlePreview}
          disabled={!selectedFile || previewMutation.isPending}
          variant="outline"
          data-testid="button-preview-import"
        >
          <Info className="w-4 h-4 mr-2" />
          {previewMutation.isPending ? "Loading Preview..." : "Preview Changes"}
        </Button>
        <Button
          onClick={handleImport}
          disabled={!selectedFile || importMutation.isPending || previewMutation.isPending}
          data-testid="button-execute-import"
        >
          <Download className="w-4 h-4 mr-2" />
          {importMutation.isPending ? "Importing..." : "Import Now"}
        </Button>
      </div>

      {previewMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {preview && !previewMutation.isPending && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium mb-2" data-testid="text-preview-summary">
                  Preview: {preview.summary.total} products found
                </h4>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-700">
                    <strong>{preview.summary.toCreate}</strong> to create
                  </span>
                  <span className="text-blue-700">
                    <strong>{preview.summary.toUpdate}</strong> to update
                  </span>
                  {preview.errors.length > 0 && (
                    <span className="text-yellow-700">
                      <strong>{preview.errors.length}</strong> skipped
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Skipped Rows
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1 max-h-48 overflow-y-auto" data-testid="list-preview-errors">
                {preview.errors.slice(0, 10).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {preview.errors.length > 10 && (
                  <li className="text-muted-foreground">... and {preview.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted p-3 font-medium text-sm">
              Preview: First 10 Products
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {preview.products.slice(0, 10).map((item, index) => (
                <div key={index} className="p-4" data-testid={`preview-item-${index}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={item.action === 'create' ? 'default' : 'secondary'}>
                          {item.action === 'create' ? 'NEW' : 'UPDATE'}
                        </Badge>
                        <span className="font-medium">{item.product.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>SKU: {item.product.sku}</div>
                        <div>Price: ${item.product.price.toFixed(2)}</div>
                        {item.action === 'update' && item.existingProduct && (
                          <div className="text-xs text-yellow-700 mt-1">
                            Current price: ${parseFloat(item.existingProduct.price).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {preview.products.length > 10 && (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted">
                  ... and {preview.products.length - 10} more products
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {importResult && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${importResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-start gap-3">
              {importResult.failed === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-medium mb-1" data-testid="text-import-result-title">
                  {importResult.failed === 0 ? 'Import Successful' : 'Import Completed with Issues'}
                </h4>
                <p className="text-sm" data-testid="text-import-result-summary">
                  <strong>{importResult.created}</strong> products created, 
                  <strong> {importResult.updated}</strong> updated
                  {importResult.failed > 0 && (
                    <>, <strong>{importResult.failed}</strong> failed</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Import Errors
              </h4>
              <ul className="text-sm text-red-800 space-y-1 max-h-48 overflow-y-auto" data-testid="list-import-errors">
                {importResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
