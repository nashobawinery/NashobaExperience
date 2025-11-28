import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Upload, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft,
  Database,
  AlertCircle,
  CheckCircle,
  Server,
  Laptop
} from "lucide-react";

const BASE_APP_TABLES = [
  { id: 'products', name: 'Products', description: 'Wine and beverage products' },
  { id: 'filterOptions', name: 'Filter Options', description: 'Dynamic filter configuration' },
  { id: 'triviaQuestions', name: 'Trivia Questions', description: 'Tasting trivia game' },
  { id: 'slideshowImages', name: 'Slideshow Images', description: 'Guest experience slideshow' },
  { id: 'appSettings', name: 'App Settings', description: 'Application configuration' },
  { id: 'mediaLibrary', name: 'Media Library', description: 'Uploaded images and files' },
  { id: 'whitelistedEmails', name: 'Whitelisted Emails', description: 'Admin access list' },
  { id: 'commercials', name: 'Commercials', description: 'Video commercials' },
  { id: 'videos', name: 'Videos', description: 'Educational videos' },
  { id: 'triviaAchievements', name: 'Trivia Achievements', description: 'Guest achievements' },
];

const B2B_TABLES = [
  { id: 'tierPricing', name: 'Tier Pricing', description: 'Wholesale pricing tiers' },
  { id: 'salesReps', name: 'Sales Reps', description: 'Sales representative accounts' },
  { id: 'b2bCustomers', name: 'B2B Customers', description: 'Wholesale customer accounts' },
  { id: 'b2bCustomerLocations', name: 'Customer Locations', description: 'Store locations' },
  { id: 'b2bCustomerManualProducts', name: 'Featured Products', description: 'Manual product assignments' },
  { id: 'b2bOrders', name: 'B2B Orders', description: 'Wholesale orders' },
  { id: 'b2bOrderItems', name: 'Order Items', description: 'Order line items' },
  { id: 'b2bSlideshowSlides', name: 'B2B Slideshow', description: 'B2B landing page slides' },
  { id: 'b2bAdmins', name: 'B2B Admins', description: 'B2B administrator accounts' },
  { id: 'b2bSettings', name: 'B2B Settings', description: 'B2B platform configuration' },
  { id: 'b2bCommissions', name: 'Commissions', description: 'Sales rep commission tracking' },
  { id: 'b2bEmailTemplates', name: 'Email Templates', description: 'Automated email templates' },
  { id: 'b2bEmailAutomationLogs', name: 'Email Logs', description: 'Email delivery history' },
];

const ALL_TABLES = [...BASE_APP_TABLES, ...B2B_TABLES];

export default function DatabaseSync() {
  const { toast } = useToast();
  const [selectedTables, setSelectedTables] = useState<string[]>(ALL_TABLES.map(t => t.id));
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [syncDirection, setSyncDirection] = useState<'export' | 'import'>('export');
  
  const isProduction = window.location.hostname.includes('.replit.app') && 
                       !window.location.hostname.includes('-00-');
  const environmentName = isProduction ? 'Production' : 'Development';
  const environmentColor = isProduction ? 'destructive' : 'default';

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(t => t !== tableId)
        : [...prev, tableId]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(ALL_TABLES.map(t => t.id));
  };

  const selectNone = () => {
    setSelectedTables([]);
  };

  const selectBaseApp = () => {
    setSelectedTables(BASE_APP_TABLES.map(t => t.id));
  };

  const selectB2B = () => {
    setSelectedTables(B2B_TABLES.map(t => t.id));
  };

  const exportMutation = useMutation({
    mutationFn: async (tables: string[]) => {
      const response = await fetch('/api/admin/data/export-selective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables }),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      const env = isProduction ? 'prod' : 'dev';
      a.download = `nashoba-${env}-sync-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return { success: true, tables };
    },
    onSuccess: (data) => {
      toast({
        title: "Export Complete",
        description: `Exported ${data.tables.length} tables from ${environmentName}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ file, tables }: { file: File; tables: string[] }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tables', JSON.stringify(tables));
      
      const response = await fetch('/api/admin/data/import-selective', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      setImportFile(null);
      toast({
        title: "Import Complete",
        description: data.errors?.length > 0 
          ? `Import completed with ${data.errors.length} warnings`
          : "Data imported successfully",
        variant: data.errors?.length > 0 ? "default" : "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    if (selectedTables.length === 0) {
      toast({
        title: "No Tables Selected",
        description: "Please select at least one table to export",
        variant: "destructive",
      });
      return;
    }
    exportMutation.mutate(selectedTables);
  };

  const handleImport = () => {
    if (!importFile) {
      toast({
        title: "No File Selected",
        description: "Please select an Excel file to import",
        variant: "destructive",
      });
      return;
    }
    if (selectedTables.length === 0) {
      toast({
        title: "No Tables Selected",
        description: "Please select at least one table to import",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate({ file: importFile, tables: selectedTables });
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="h-8 w-8" />
            Database Sync Tool
          </h1>
          <p className="text-muted-foreground mt-1">
            Sync database tables between development and production environments
          </p>
        </div>
        <Badge variant={environmentColor} className="text-lg px-4 py-2">
          {isProduction ? <Server className="h-4 w-4 mr-2" /> : <Laptop className="h-4 w-4 mr-2" />}
          {environmentName}
        </Badge>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>How Database Sync Works</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li><strong>Export from source:</strong> Select tables and download Excel file from {isProduction ? 'Production' : 'Development'}</li>
            <li><strong>Switch environments:</strong> Open the {isProduction ? 'Development' : 'Production'} app</li>
            <li><strong>Import to target:</strong> Upload the Excel file to sync the selected tables</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Tabs value={syncDirection} onValueChange={(v) => setSyncDirection(v as 'export' | 'import')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" className="flex items-center gap-2" data-testid="tab-export">
            <Download className="h-4 w-4" />
            Export from {environmentName}
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2" data-testid="tab-import">
            <Upload className="h-4 w-4" />
            Import to {environmentName}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Data
              </CardTitle>
              <CardDescription>
                Select the tables you want to export from {environmentName}. The exported Excel file can be imported into the other environment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={selectAllTables} data-testid="button-select-all">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone} data-testid="button-select-none">
                  Select None
                </Button>
                <Button variant="outline" size="sm" onClick={selectBaseApp} data-testid="button-select-base">
                  Base App Only
                </Button>
                <Button variant="outline" size="sm" onClick={selectB2B} data-testid="button-select-b2b">
                  B2B Only
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Base App Tables</h3>
                  <div className="space-y-3">
                    {BASE_APP_TABLES.map((table) => (
                      <div key={table.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`export-${table.id}`}
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => toggleTable(table.id)}
                          data-testid={`checkbox-${table.id}`}
                        />
                        <div className="grid gap-1 leading-none">
                          <Label htmlFor={`export-${table.id}`} className="font-medium cursor-pointer">
                            {table.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">{table.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">B2B Tables</h3>
                  <div className="space-y-3">
                    {B2B_TABLES.map((table) => (
                      <div key={table.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`export-${table.id}`}
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => toggleTable(table.id)}
                          data-testid={`checkbox-${table.id}`}
                        />
                        <div className="grid gap-1 leading-none">
                          <Label htmlFor={`export-${table.id}`} className="font-medium cursor-pointer">
                            {table.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">{table.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <p className="text-sm text-muted-foreground">
                {selectedTables.length} of {ALL_TABLES.length} tables selected
              </p>
              <Button 
                onClick={handleExport} 
                disabled={exportMutation.isPending || selectedTables.length === 0}
                data-testid="button-export"
              >
                {exportMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export {selectedTables.length} Tables
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-dashed">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <Badge variant={isProduction ? "destructive" : "default"}>
                  {environmentName}
                </Badge>
                <ArrowRight className="h-6 w-6" />
                <span className="text-sm">Download Excel file, then open</span>
                <ArrowRight className="h-6 w-6" />
                <Badge variant={isProduction ? "default" : "destructive"}>
                  {isProduction ? 'Development' : 'Production'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Upload an Excel file exported from the other environment. Select which tables to import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="import-file">Select Excel File</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  data-testid="input-import-file"
                />
                {importFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={selectAllTables}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Select None
                </Button>
                <Button variant="outline" size="sm" onClick={selectBaseApp}>
                  Base App Only
                </Button>
                <Button variant="outline" size="sm" onClick={selectB2B}>
                  B2B Only
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Base App Tables</h3>
                  <div className="space-y-3">
                    {BASE_APP_TABLES.map((table) => (
                      <div key={table.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`import-${table.id}`}
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => toggleTable(table.id)}
                        />
                        <div className="grid gap-1 leading-none">
                          <Label htmlFor={`import-${table.id}`} className="font-medium cursor-pointer">
                            {table.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">{table.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">B2B Tables</h3>
                  <div className="space-y-3">
                    {B2B_TABLES.map((table) => (
                      <div key={table.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`import-${table.id}`}
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => toggleTable(table.id)}
                        />
                        <div className="grid gap-1 leading-none">
                          <Label htmlFor={`import-${table.id}`} className="font-medium cursor-pointer">
                            {table.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">{table.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <p className="text-sm text-muted-foreground">
                {selectedTables.length} of {ALL_TABLES.length} tables selected
              </p>
              <Button 
                onClick={handleImport} 
                disabled={importMutation.isPending || !importFile || selectedTables.length === 0}
                variant={isProduction ? "destructive" : "default"}
                data-testid="button-import"
              >
                {importMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import to {environmentName}
              </Button>
            </CardFooter>
          </Card>

          {importResult && (
            <Alert variant={importResult.errors?.length > 0 ? "default" : "default"}>
              {importResult.errors?.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>Import Results</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  {importResult.summary && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(importResult.summary).map(([table, count]) => (
                        <div key={table}>
                          {table}: <strong>{count as number}</strong> records
                        </div>
                      ))}
                    </div>
                  )}
                  {importResult.warnings?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-yellow-600">Warnings:</p>
                      <ul className="list-disc list-inside text-xs mt-1 max-h-32 overflow-y-auto">
                        {importResult.warnings.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {importResult.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-destructive">Errors:</p>
                      <ul className="list-disc list-inside text-xs mt-1 max-h-32 overflow-y-auto">
                        {importResult.errors.map((e: string, i: number) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-dashed">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <Badge variant={isProduction ? "default" : "destructive"}>
                  {isProduction ? 'Development' : 'Production'}
                </Badge>
                <ArrowRight className="h-6 w-6" />
                <span className="text-sm">Export file, then upload here</span>
                <ArrowRight className="h-6 w-6" />
                <Badge variant={isProduction ? "destructive" : "default"}>
                  {environmentName}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Media Files:</strong> This sync only transfers database records. Use the Media Sync utility in the Media Library to sync actual image files.</p>
          <p><strong>Sales Reps:</strong> New sales rep accounts must be created via the admin UI (passwords are not exported for security).</p>
          <p><strong>B2B Admins:</strong> Admin passwords are not exported. Existing admins are updated, new admins need password setup.</p>
          <p><strong>Order Data:</strong> Importing orders uses order numbers and customer emails as business keys for matching.</p>
        </CardContent>
      </Card>
    </div>
  );
}
