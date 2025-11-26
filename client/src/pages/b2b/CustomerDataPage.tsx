import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CustomerDataPage() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: customerCount = 0 } = useQuery<number>({
    queryKey: ["/api/b2b/customer/count"],
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/b2b/customer/export", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export customers");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Customer data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/b2b/customer/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import customers");
      }

      toast({
        title: "Success",
        description: `Imported ${data.imported} customer(s). ${data.errors.length > 0 ? `${data.errors.length} error(s).` : ""}`,
      });

      if (data.errors.length > 0) {
        console.error("Import errors:", data.errors);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-semibold mb-2" data-testid="page-title">
            Customer Data Management
          </h1>
          <p className="text-muted-foreground">
            Export or import customer information in bulk using Excel files
          </p>
        </div>

        <div className="grid gap-6">
          {/* Export Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Customers
              </CardTitle>
              <CardDescription>
                Download all customer information as an Excel file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will export all customer records with their contact information, addresses, tiers, and notes.
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full"
                data-testid="button-export-customers"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Customers
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Import Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Customers
              </CardTitle>
              <CardDescription>
                Upload an Excel file to add or update customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  The Excel file must contain a "Customers" sheet with columns: business_name, contact_name, email_address, phone_number, billing_street_address, billing_city, billing_state, billing_zip_code, license_number, tax_id, shipping_street_address, shipping_city, shipping_state, shipping_zip_code, pricing_tier_name, sales_rep_email, account_status, notes
                </AlertDescription>
              </Alert>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-import-file"
              />
              <Button
                onClick={handleImportClick}
                disabled={isImporting}
                variant="outline"
                className="w-full"
                data-testid="button-import-customers"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Excel File
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
