import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  Upload, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft,
  ArrowLeftRight,
  Database,
  AlertCircle,
  CheckCircle,
  Server,
  Laptop,
  HardDrive,
  Image,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Wine,
  Package,
  GraduationCap,
  FileCheck,
  Shield,
  Settings,
  AlertTriangle,
  ClipboardList,
  Lock,
  Archive,
  FileWarning,
  Eye,
  Search,
  GitCompare,
  Loader2,
  Calendar,
  BookOpen,
  Table,
  Workflow
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

type DataType = 'reference' | 'user_generated' | 'configuration' | 'transactional';

interface SyncTable {
  id: string;
  name: string;
  description: string;
  sheetName: string;
  businessKey: string[];
  exportFields: string[];
  parentTables: string[];
  excludeFromSync: boolean;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  dataType: DataType;
  supportsBackup: boolean;
  productionWarning?: string;
}

interface SyncModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  tables: SyncTable[];
}

interface RegistryMetadata {
  modules: SyncModule[];
  stats: Record<string, { total: number; syncable: number }>;
}

const MODULE_ICONS: Record<string, typeof Wine> = {
  tasting: Wine,
  b2b: Package,
  lms: GraduationCap,
  compliance: FileCheck,
  daily_reports: ClipboardList,
  rbac: Shield,
  platform: Settings,
  reservation: Calendar,
};

const DATA_TYPE_BADGES: Record<DataType, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Lock; description: string }> = {
  reference: { label: 'Reference', variant: 'outline', icon: Database, description: 'Static definitions - safe to sync in any direction' },
  configuration: { label: 'Config', variant: 'secondary', icon: Settings, description: 'Settings that may differ between environments' },
  user_generated: { label: 'User Data', variant: 'default', icon: Lock, description: 'User content - protect production data' },
  transactional: { label: 'Transactional', variant: 'destructive', icon: FileWarning, description: 'Excluded from sync - contains runtime data' },
};

const createFallbackTable = (id: string, name: string, description: string, dataType: DataType = 'reference'): SyncTable => ({
  id,
  name,
  description,
  sheetName: id,
  businessKey: [],
  exportFields: [],
  parentTables: [],
  excludeFromSync: false,
  requiresConfirmation: false,
  dataType,
  supportsBackup: true,
});

const FALLBACK_BASE_APP_TABLES: SyncTable[] = [
  createFallbackTable('products', 'Products', 'Wine and beverage products'),
  createFallbackTable('filterOptions', 'Filter Options', 'Dynamic filter configuration'),
  createFallbackTable('triviaQuestions', 'Trivia Questions', 'Tasting trivia game'),
  createFallbackTable('slideshowImages', 'Slideshow Images', 'Guest experience slideshow'),
  createFallbackTable('appSettings', 'App Settings', 'Application configuration', 'configuration'),
  createFallbackTable('mediaLibrary', 'Media Library', 'Uploaded images and files'),
  createFallbackTable('whitelistedEmails', 'Whitelisted Emails', 'Admin access list'),
  createFallbackTable('commercials', 'Commercials', 'Video commercials'),
  createFallbackTable('videos', 'Videos', 'Educational videos'),
  createFallbackTable('triviaAchievements', 'Trivia Achievements', 'Guest achievements'),
];

const FALLBACK_B2B_TABLES: SyncTable[] = [
  createFallbackTable('tierPricing', 'Tier Pricing', 'Wholesale pricing tiers'),
  createFallbackTable('salesReps', 'Sales Reps', 'Sales representative accounts'),
  createFallbackTable('b2bCustomers', 'B2B Customers', 'Wholesale customer accounts', 'user_generated'),
  createFallbackTable('b2bCustomerLocations', 'Customer Locations', 'Store locations', 'user_generated'),
  createFallbackTable('b2bCustomerManualProducts', 'Featured Products', 'Manual product assignments'),
  createFallbackTable('b2bOrders', 'B2B Orders', 'Wholesale orders', 'transactional'),
  createFallbackTable('b2bOrderItems', 'Order Items', 'Order line items', 'transactional'),
  createFallbackTable('b2bSlideshowSlides', 'B2B Slideshow', 'B2B landing page slides'),
  createFallbackTable('b2bAdmins', 'B2B Admins', 'B2B administrator accounts', 'configuration'),
  createFallbackTable('b2bSettings', 'B2B Settings', 'B2B platform configuration', 'configuration'),
  createFallbackTable('b2bCommissions', 'Commissions', 'Sales rep commission tracking', 'transactional'),
  createFallbackTable('b2bEmailTemplates', 'Email Templates', 'Automated email templates'),
  createFallbackTable('b2bEmailAutomationLogs', 'Email Logs', 'Email delivery history', 'transactional'),
];

const FALLBACK_ALL_TABLES: SyncTable[] = [...FALLBACK_BASE_APP_TABLES, ...FALLBACK_B2B_TABLES];

interface MediaSyncStatus {
  bucketId: string;
  summary: {
    total: number;
    existingInBucket: number;
    missingFromBucket: number;
    urlMismatch: number;
  };
  files: Array<{
    id: string;
    filename: string;
    objectPath: string;
    publicUrl: string;
    existsInBucket: boolean;
    urlMatchesBucket: boolean;
  }>;
}

interface MediaSyncResult {
  success: boolean;
  dryRun: boolean;
  summary: {
    total: number;
    synced: number;
    skipped: number;
    failed: number;
  };
  results: Array<{
    id: string;
    filename: string;
    status: 'synced' | 'skipped' | 'failed';
    message: string;
    newUrl?: string;
  }>;
}

type RecordState = 'dev_newer' | 'prod_newer' | 'conflict' | 'identical' | 'dev_only' | 'prod_only';

interface SyncRecord {
  tableId: string;
  businessKey: Record<string, any>;
  devData: Record<string, any> | null;
  prodData: Record<string, any> | null;
  devUpdatedAt: Date | null;
  prodUpdatedAt: Date | null;
  devHash: string | null;
  prodHash: string | null;
  state: RecordState;
  recommendation: 'keep_dev' | 'keep_prod' | 'manual_review';
  selected: 'dev' | 'prod' | 'skip';
}

interface TableSyncSummary {
  tableId: string;
  tableName: string;
  module: string;
  dataType: DataType;
  devCount: number;
  prodCount: number;
  devNewer: number;
  prodNewer: number;
  conflicts: number;
  identical: number;
  devOnly: number;
  prodOnly: number;
  records: SyncRecord[];
}

interface SyncScanResult {
  scanId: string;
  scannedAt: Date;
  tables: TableSyncSummary[];
  totalDevNewer: number;
  totalProdNewer: number;
  totalConflicts: number;
  totalIdentical: number;
}

// Schema Push Card Component
function SchemaPushCard({ prodDbUrl }: { prodDbUrl?: string }) {
  const { toast } = useToast();
  const [isPushing, setIsPushing] = useState(false);
  const [isSyncingModules, setIsSyncingModules] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      objectsProcessed?: number;
      alreadyExisted?: number;
      warnings?: string[];
      total?: number;
      inserted?: number;
      updated?: number;
    };
  } | null>(null);

  const handlePushSchema = async () => {
    setIsPushing(true);
    setResult(null);
    try {
      const response = await apiRequest('POST', '/api/admin/sync/push-schema', { prodDbUrl });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        toast({
          title: "Schema Push Complete",
          description: data.message,
        });
      } else {
        toast({
          title: "Schema Push Failed",
          description: data.error || data.message || "Unknown error",
          variant: "destructive",
        });
        setResult({ success: false, message: data.error || data.message || "Unknown error" });
      }
    } catch (error: any) {
      const errorMsg = error.message || "Failed to push schema";
      setResult({ success: false, message: errorMsg });
      toast({
        title: "Schema Push Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handleSyncModules = async () => {
    setIsSyncingModules(true);
    setResult(null);
    try {
      const response = await apiRequest('POST', '/api/admin/sync/push-modules', { prodDbUrl });
      const data = await response.json();
      setResult(data);
      if (data.success) {
        toast({
          title: "Modules Synced",
          description: data.message,
        });
      } else {
        toast({
          title: "Module Sync Failed",
          description: data.error || data.message || "Unknown error",
          variant: "destructive",
        });
        setResult({ success: false, message: data.error || data.message || "Unknown error" });
      }
    } catch (error: any) {
      const errorMsg = error.message || "Failed to sync modules";
      setResult({ success: false, message: errorMsg });
      toast({
        title: "Module Sync Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSyncingModules(false);
    }
  };

  return (
    <Card className="border-primary/50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Push Schema to Production
        </CardTitle>
        <CardDescription className="text-xs">
          When you add new modules or tables, use this to create them in production before syncing data.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-3 pt-0 space-y-3">
        <Alert variant="default" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This copies the database structure (tables, indexes) from development to production. 
            Existing tables are not modified - only new tables are created.
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button 
            onClick={handlePushSchema} 
            disabled={isPushing || isSyncingModules}
            variant="outline"
            className="flex-1"
            data-testid="button-push-schema"
          >
            {isPushing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Push Schema
              </>
            )}
          </Button>
          <Button 
            onClick={handleSyncModules} 
            disabled={isPushing || isSyncingModules}
            variant="outline"
            className="flex-1"
            data-testid="button-sync-modules"
          >
            {isSyncingModules ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Modules
              </>
            )}
          </Button>
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className="py-2">
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className="text-xs">
              {result.message}
              {result.details && result.details.objectsProcessed !== undefined && (
                <div className="mt-1">
                  <span className="block">Objects processed: {result.details.objectsProcessed}</span>
                  <span className="block">Already existed: {result.details.alreadyExisted}</span>
                </div>
              )}
              {result.details && result.details.inserted !== undefined && (
                <div className="mt-1">
                  <span className="block">Inserted: {result.details.inserted}</span>
                  <span className="block">Updated: {result.details.updated}</span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function CogSyncSection({ prodDbUrl }: { prodDbUrl: string }) {
  const { toast } = useToast();
  const [cogPreview, setCogPreview] = useState<any>(null);
  const [isCogLoading, setIsCogLoading] = useState(false);
  const [isCogApplying, setIsCogApplying] = useState(false);

  const handleCogPreview = async () => {
    setIsCogLoading(true);
    try {
      const response = await apiRequest('POST', '/api/admin/sync-cog-to-prod', { prodDatabaseUrl: prodDbUrl, dryRun: true });
      const data = await response.json();
      setCogPreview(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to preview COG sync", variant: "destructive" });
    } finally {
      setIsCogLoading(false);
    }
  };

  const handleCogApply = async () => {
    setIsCogApplying(true);
    try {
      const response = await apiRequest('POST', '/api/admin/sync-cog-to-prod', { prodDatabaseUrl: prodDbUrl, dryRun: false });
      const data = await response.json();
      setCogPreview(data);
      toast({ title: "COG Sync Complete", description: `Updated ${data.summary.updated} products, skipped ${data.summary.skipped}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to apply COG sync", variant: "destructive" });
    } finally {
      setIsCogApplying(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleCogPreview} disabled={isCogLoading} variant="outline" data-testid="button-cog-preview">
          {isCogLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isCogLoading ? 'Loading Preview...' : 'Preview COG Changes'}
        </Button>
        {cogPreview?.dryRun && cogPreview.summary.updated > 0 && (
          <Button onClick={handleCogApply} disabled={isCogApplying} data-testid="button-cog-apply">
            {isCogApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isCogApplying ? 'Applying...' : `Apply ${cogPreview.summary.updated} COG Updates`}
          </Button>
        )}
      </div>
      {cogPreview && (
        <div className="space-y-2">
          <div className="flex gap-3 text-sm flex-wrap">
            <Badge variant={cogPreview.dryRun ? "outline" : "default"}>{cogPreview.dryRun ? 'Preview' : 'Applied'}</Badge>
            <span>Will update: <strong>{cogPreview.summary.updated}</strong></span>
            <span>Skipped: <strong>{cogPreview.summary.skipped}</strong></span>
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Dev Cost</th>
                  <th className="text-right p-2">Prod Cost</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {cogPreview.preview.map((row: any, i: number) => (
                  <tr key={i} className={row.status === 'would_update' || row.status === 'updated' ? 'bg-green-500/10' : row.status.startsWith('skipped') ? 'opacity-50' : ''}>
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.category}</td>
                    <td className="p-2 text-right">${row.devCost}</td>
                    <td className="p-2 text-right">{row.prodCost ? `$${row.prodCost}` : '—'}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">
                        {row.status === 'would_update' ? 'Will Update' : row.status === 'updated' ? 'Updated' : row.status === 'already_matching' ? 'Match' : 'Not in Prod'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DatabaseSync() {
  const { toast } = useToast();
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [syncTab, setSyncTab] = useState<'database' | 'storage' | 'bidirectional' | 'docs'>('database');
  const [syncDirection, setSyncDirection] = useState<'export' | 'import'>('export');
  const [mediaSyncResult, setMediaSyncResult] = useState<MediaSyncResult | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['tasting', 'b2b']));
  
  const DEFAULT_PROD_DB_URL = 'postgresql://neondb_owner:npg_ZwW7KqdEG6OA@ep-nameless-base-afdwzc1s.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
  const [prodDbUrl, setProdDbUrl] = useState<string>(() => {
    return localStorage.getItem('sync_prod_db_url') || DEFAULT_PROD_DB_URL;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [scanResult, setScanResult] = useState<SyncScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedSyncTables, setExpandedSyncTables] = useState<Set<string>>(new Set());
  const [showAllTables, setShowAllTables] = useState(false);
  const [scanTableSearch, setScanTableSearch] = useState("");
  
  // Sync selection state: key is "tableId:businessKeyString", value is sync direction
  const [syncSelections, setSyncSelections] = useState<Record<string, 'dev' | 'prod' | 'skip'>>({});
  const [isApplyingSync, setIsApplyingSync] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncApplyResult, setSyncApplyResult] = useState<{
    success: boolean;
    appliedToDevCount: number;
    appliedToProdCount: number;
    errors: Array<{ tableId: string; error: string }>;
  } | null>(null);
  
  const isProduction = window.location.hostname.includes('.replit.app') && 
                       !window.location.hostname.includes('-00-');
  const environmentName = isProduction ? 'Production' : 'Development';
  const environmentColor = isProduction ? 'destructive' : 'default';

  const { data: registryData, isLoading: isLoadingRegistry, isError: isRegistryError, error: registryError } = useQuery<RegistryMetadata>({
    queryKey: ['/api/admin/sync/registry'],
    retry: 2,
  });

  // Log registry status for debugging
  useEffect(() => {
    if (isRegistryError) {
      console.error('[Sync] Registry fetch failed:', registryError);
    } else if (registryData) {
      console.log('[Sync] Registry loaded:', registryData.modules?.length, 'modules,', 
        registryData.modules?.reduce((sum, m) => sum + m.tables.length, 0), 'tables');
    }
  }, [registryData, isRegistryError, registryError]);

  const modules = useMemo(() => {
    if (registryData?.modules) {
      return registryData.modules;
    }
    // Fallback if registry fails - show warning
    console.warn('[Sync] Using fallback tables - registry not loaded');
    return [
      {
        id: 'tasting',
        name: 'Tasting Experience',
        description: 'Guest-facing tasting app',
        icon: 'Wine',
        tables: FALLBACK_BASE_APP_TABLES.map(t => ({
          ...t,
          sheetName: t.id,
          businessKey: [],
          exportFields: [],
          parentTables: [],
          excludeFromSync: false,
          requiresConfirmation: false,
        })),
      },
      {
        id: 'b2b',
        name: 'B2B Wholesale',
        description: 'Wholesale customer management',
        icon: 'Package',
        tables: FALLBACK_B2B_TABLES.map(t => ({
          ...t,
          sheetName: t.id,
          businessKey: [],
          exportFields: [],
          parentTables: [],
          excludeFromSync: false,
          requiresConfirmation: false,
        })),
      },
    ];
  }, [registryData]);

  const allSyncableTables = useMemo(() => {
    return modules.flatMap(m => m.tables.filter(t => !t.excludeFromSync));
  }, [modules]);

  const allTableIds = useMemo(() => allSyncableTables.map(t => t.id), [allSyncableTables]);

  // Track if we've initialized with the real registry data (not fallback)
  const [hasInitializedWithRegistry, setHasInitializedWithRegistry] = useState(false);
  
  useEffect(() => {
    // Only auto-select tables when:
    // 1. We have the real registry data (not fallback)
    // 2. We haven't already initialized with real data
    if (registryData?.modules && !hasInitializedWithRegistry) {
      setSelectedTables(allTableIds);
      setHasInitializedWithRegistry(true);
      console.log('[Sync] Initialized table selection with registry:', allTableIds.length, 'tables');
    }
  }, [registryData, allTableIds, hasInitializedWithRegistry]);

  // Object Storage sync status query
  const { data: mediaSyncStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery<MediaSyncStatus>({
    queryKey: ['/api/admin/media-library/sync-status'],
    enabled: syncTab === 'storage',
  });

  // Media sync mutation
  const mediaSyncMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const response = await fetch('/api/admin/media-library/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      if (!response.ok) {
        throw new Error('Media sync failed');
      }
      return response.json() as Promise<MediaSyncResult>;
    },
    onSuccess: (data) => {
      setMediaSyncResult(data);
      refetchStatus();
      toast({
        title: data.dryRun ? "Dry Run Complete" : "Media Sync Complete",
        description: `${data.summary.synced} synced, ${data.summary.skipped} skipped, ${data.summary.failed} failed`,
      });
    },
    onError: (error) => {
      toast({
        title: "Media Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync media files",
        variant: "destructive",
      });
    },
  });

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(t => t !== tableId)
        : [...prev, tableId]
    );
  };

  const toggleModule = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;
    const moduleTableIds = module.tables.filter(t => !t.excludeFromSync).map(t => t.id);
    const allSelected = moduleTableIds.every(id => selectedTables.includes(id));
    
    if (allSelected) {
      setSelectedTables(prev => prev.filter(id => !moduleTableIds.includes(id)));
    } else {
      setSelectedTables(prev => Array.from(new Set([...prev, ...moduleTableIds])));
    }
  };

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const selectAllTables = () => {
    setSelectedTables(allTableIds);
  };

  const selectNone = () => {
    setSelectedTables([]);
  };

  const selectModule = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      setSelectedTables(module.tables.filter(t => !t.excludeFromSync).map(t => t.id));
    }
  };

  const selectB2B = () => {
    selectModule('b2b');
  };

  // Helper to create a unique key for a record
  const getRecordKey = (tableId: string, businessKey: Record<string, any>) => {
    return `${tableId}:${JSON.stringify(businessKey)}`;
  };

  // Toggle a single record's sync selection
  const toggleRecordSelection = (tableId: string, businessKey: Record<string, any>, direction: 'dev' | 'prod' | 'skip') => {
    const key = getRecordKey(tableId, businessKey);
    setSyncSelections(prev => ({
      ...prev,
      [key]: direction,
    }));
  };

  // Get current selection for a record
  const getRecordSelection = (tableId: string, businessKey: Record<string, any>): 'dev' | 'prod' | 'skip' | undefined => {
    const key = getRecordKey(tableId, businessKey);
    return syncSelections[key];
  };

  // Select all records in a table with a specific direction
  const selectAllInTable = (tableId: string, direction: 'dev' | 'prod' | 'skip') => {
    if (!scanResult) return;
    const table = scanResult.tables.find(t => t.tableId === tableId);
    if (!table) return;
    
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const record of table.records) {
      const key = getRecordKey(tableId, record.businessKey);
      newSelections[key] = direction;
    }
    setSyncSelections(newSelections);
  };

  // Select all dev-only records to sync to prod
  const selectAllDevOnly = () => {
    if (!scanResult) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const table of scanResult.tables) {
      for (const record of table.records) {
        if (record.state === 'dev_only' || record.state === 'dev_newer') {
          const key = getRecordKey(table.tableId, record.businessKey);
          newSelections[key] = 'dev';
        }
      }
    }
    setSyncSelections(newSelections);
  };

  // Select all prod-only records to sync to dev
  const selectAllProdOnly = () => {
    if (!scanResult) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const table of scanResult.tables) {
      for (const record of table.records) {
        if (record.state === 'prod_only' || record.state === 'prod_newer') {
          const key = getRecordKey(table.tableId, record.businessKey);
          newSelections[key] = 'prod';
        }
      }
    }
    setSyncSelections(newSelections);
  };

  const selectAutoForTable = (tableId: string) => {
    if (!scanResult) return;
    const table = scanResult.tables.find(t => t.tableId === tableId);
    if (!table) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const record of table.records) {
      const key = getRecordKey(tableId, record.businessKey);
      if (record.state === 'dev_only' || record.state === 'dev_newer') {
        newSelections[key] = 'dev';
      } else if (record.state === 'prod_only' || record.state === 'prod_newer') {
        newSelections[key] = 'prod';
      }
    }
    setSyncSelections(newSelections);
  };

  const selectDevOnlyForTable = (tableId: string) => {
    if (!scanResult) return;
    const table = scanResult.tables.find(t => t.tableId === tableId);
    if (!table) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const record of table.records) {
      if (record.state === 'dev_only' || record.state === 'dev_newer') {
        const key = getRecordKey(tableId, record.businessKey);
        newSelections[key] = 'dev';
      }
    }
    setSyncSelections(newSelections);
  };

  const selectProdOnlyForTable = (tableId: string) => {
    if (!scanResult) return;
    const table = scanResult.tables.find(t => t.tableId === tableId);
    if (!table) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const record of table.records) {
      if (record.state === 'prod_only' || record.state === 'prod_newer') {
        const key = getRecordKey(tableId, record.businessKey);
        newSelections[key] = 'prod';
      }
    }
    setSyncSelections(newSelections);
  };

  const clearSelectionsForTable = (tableId: string) => {
    if (!scanResult) return;
    const table = scanResult.tables.find(t => t.tableId === tableId);
    if (!table) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const record of table.records) {
      const key = getRecordKey(tableId, record.businessKey);
      delete newSelections[key];
    }
    setSyncSelections(newSelections);
  };

  // Select all following recommendations
  const selectAllRecommended = () => {
    if (!scanResult) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const table of scanResult.tables) {
      for (const record of table.records) {
        const key = getRecordKey(table.tableId, record.businessKey);
        if (record.recommendation === 'keep_dev') {
          newSelections[key] = 'dev';
        } else if (record.recommendation === 'keep_prod') {
          newSelections[key] = 'prod';
        }
        // Manual review items are left unselected
      }
    }
    setSyncSelections(newSelections);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSyncSelections({});
  };

  // Select all conflicts to keep dev version
  const selectAllConflictsKeepDev = () => {
    if (!scanResult) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const table of scanResult.tables) {
      for (const record of table.records) {
        if (record.state === 'conflict') {
          const key = getRecordKey(table.tableId, record.businessKey);
          newSelections[key] = 'dev';
        }
      }
    }
    setSyncSelections(newSelections);
  };

  // Select all conflicts to keep prod version
  const selectAllConflictsKeepProd = () => {
    if (!scanResult) return;
    const newSelections: Record<string, 'dev' | 'prod' | 'skip'> = { ...syncSelections };
    for (const table of scanResult.tables) {
      for (const record of table.records) {
        if (record.state === 'conflict') {
          const key = getRecordKey(table.tableId, record.businessKey);
          newSelections[key] = 'prod';
        }
      }
    }
    setSyncSelections(newSelections);
  };

  // Count selected records by direction
  const getSelectionCounts = () => {
    let devToProd = 0;
    let prodToDev = 0;
    let skipped = 0;
    
    for (const direction of Object.values(syncSelections)) {
      if (direction === 'dev') devToProd++;
      else if (direction === 'prod') prodToDev++;
      else if (direction === 'skip') skipped++;
    }
    
    return { devToProd, prodToDev, skipped, total: devToProd + prodToDev };
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

  // Scan for differences between dev and prod
  const handleScanForDifferences = async () => {
    setIsScanning(true);
    try {
      const response = await apiRequest('POST', '/api/admin/sync/scan-bidirectional', { 
        prodDatabaseUrl: prodDbUrl,
        tableIds: selectedTables.length > 0 ? selectedTables : undefined,
      });
      const data = await response.json();
      setScanResult(data);
      toast({
        title: "Scan Complete",
        description: `Found differences in ${data.tables.filter((t: any) => t.records.length > 0).length} tables`,
      });
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan databases",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Apply bidirectional sync
  const applySync = async () => {
    setIsApplyingSync(true);
    setSyncApplyResult(null);
    
    try {
      // Convert selections to API format
      const operations: Array<{
        tableId: string;
        businessKey: Record<string, any>;
        direction: 'dev_to_prod' | 'prod_to_dev';
      }> = [];

      for (const [key, direction] of Object.entries(syncSelections)) {
        if (direction === 'skip') continue;
        
        // Parse the key back to tableId and businessKey
        const firstColonIndex = key.indexOf(':');
        const tableId = key.substring(0, firstColonIndex);
        const businessKey = JSON.parse(key.substring(firstColonIndex + 1));
        
        operations.push({
          tableId,
          businessKey,
          direction: direction === 'dev' ? 'dev_to_prod' : 'prod_to_dev',
        });
      }

      if (operations.length === 0) {
        toast({
          title: "No Operations Selected",
          description: "Please select records to sync",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/admin/sync/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prodDbUrl,
          operations,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Apply sync failed');
      }

      const result = await response.json();
      setSyncApplyResult(result);
      
      if (result.success) {
        toast({
          title: "Sync Applied Successfully",
          description: `Applied ${result.appliedToProdCount} to Prod, ${result.appliedToDevCount} to Dev`,
        });
        clearAllSelections();
      } else {
        toast({
          title: "Sync Completed with Errors",
          description: `${result.errors.length} errors occurred`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to apply sync",
        variant: "destructive",
      });
    } finally {
      setIsApplyingSync(false);
      setShowSyncConfirm(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <RefreshCw className="h-8 w-8" />
            Environment Sync Tool
          </h1>
          <p className="text-muted-foreground mt-1">
            Sync database and media files between development and production environments
          </p>
        </div>
        <Badge variant={environmentColor} className="text-lg px-4 py-2">
          {isProduction ? <Server className="h-4 w-4 mr-2" /> : <Laptop className="h-4 w-4 mr-2" />}
          {environmentName}
        </Badge>
      </div>

      {/* Top-level tabs for Database vs Object Storage vs Bidirectional vs Docs */}
      <Tabs value={syncTab} onValueChange={(v) => setSyncTab(v as 'database' | 'storage' | 'bidirectional' | 'docs')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="database" className="flex items-center gap-2" data-testid="tab-database">
            <Database className="h-4 w-4" />
            Export/Import
          </TabsTrigger>
          <TabsTrigger value="bidirectional" className="flex items-center gap-2" data-testid="tab-bidirectional">
            <ArrowLeftRight className="h-4 w-4" />
            Compare & Sync
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2" data-testid="tab-storage">
            <HardDrive className="h-4 w-4" />
            Object Storage
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2" data-testid="tab-docs">
            <BookOpen className="h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
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

          <Card className="border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Data Classification Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs h-5 px-1.5 shrink-0">
                    <Database className="h-3 w-3 mr-1" />
                    Reference
                  </Badge>
                  <span className="text-xs text-muted-foreground">Static definitions - safe to sync in any direction</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="text-xs h-5 px-1.5 shrink-0">
                    <Settings className="h-3 w-3 mr-1" />
                    Config
                  </Badge>
                  <span className="text-xs text-muted-foreground">Environment settings - may differ between dev/prod</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="default" className="text-xs h-5 px-1.5 shrink-0">
                    <Lock className="h-3 w-3 mr-1" />
                    User Data
                  </Badge>
                  <span className="text-xs text-muted-foreground">User-generated content - export only, never import to prod</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="destructive" className="text-xs h-5 px-1.5 shrink-0">
                    <FileWarning className="h-3 w-3 mr-1" />
                    Transactional
                  </Badge>
                  <span className="text-xs text-muted-foreground">Runtime data - excluded from table list automatically</span>
                </div>
              </div>
              {isProduction && (
                <Alert variant="destructive" className="mt-3 py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    You are in <strong>Production</strong>. Only import Reference data from development. User Data should be exported for backup only.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

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
                {modules.map(module => (
                  <Button 
                    key={module.id}
                    variant="outline" 
                    size="sm" 
                    onClick={() => selectModule(module.id)}
                    data-testid={`button-select-${module.id}`}
                  >
                    {module.name} Only
                  </Button>
                ))}
              </div>

              {isLoadingRegistry ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map(module => {
                    const ModuleIcon = MODULE_ICONS[module.id] || Database;
                    const syncableTables = module.tables.filter(t => !t.excludeFromSync);
                    const selectedCount = syncableTables.filter(t => selectedTables.includes(t.id)).length;
                    const allSelected = syncableTables.length > 0 && selectedCount === syncableTables.length;
                    const someSelected = selectedCount > 0 && selectedCount < syncableTables.length;
                    
                    return (
                      <Collapsible 
                        key={module.id} 
                        open={expandedModules.has(module.id)}
                        onOpenChange={() => toggleModuleExpanded(module.id)}
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 cursor-pointer hover-elevate">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {expandedModules.has(module.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <ModuleIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">{module.name}</h3>
                                  <p className="text-xs text-muted-foreground">{module.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={allSelected ? "default" : someSelected ? "secondary" : "outline"}>
                                  {selectedCount} / {syncableTables.length}
                                </Badge>
                                <Checkbox
                                  checked={allSelected}
                                  data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                                  onCheckedChange={() => toggleModule(module.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`checkbox-module-${module.id}`}
                                />
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-3 space-y-3">
                              {syncableTables.map(table => {
                                const dataTypeBadge = table.dataType ? DATA_TYPE_BADGES[table.dataType] : null;
                                return (
                                  <div key={table.id} className="flex items-start space-x-3 ml-9">
                                    <Checkbox
                                      id={`export-${table.id}`}
                                      checked={selectedTables.includes(table.id)}
                                      onCheckedChange={() => toggleTable(table.id)}
                                      data-testid={`checkbox-${table.id}`}
                                    />
                                    <div className="grid gap-1 leading-none flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Label htmlFor={`export-${table.id}`} className="font-medium cursor-pointer">
                                          {table.name}
                                        </Label>
                                        {dataTypeBadge && (
                                          <Badge variant={dataTypeBadge.variant} className="text-xs h-5 px-1.5">
                                            <dataTypeBadge.icon className="h-3 w-3 mr-1" />
                                            {dataTypeBadge.label}
                                          </Badge>
                                        )}
                                        {table.requiresConfirmation && (
                                          <span title={table.confirmationMessage}>
                                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{table.description}</p>
                                    </div>
                                  </div>
                                );
                              })}
                              {module.tables.filter(t => t.excludeFromSync).length > 0 && (
                                <div className="ml-9 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground italic">
                                    {module.tables.filter(t => t.excludeFromSync).length} table(s) excluded from sync (user-specific data)
                                  </p>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <p className="text-sm text-muted-foreground">
                {selectedTables.length} of {allTableIds.length} tables selected
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
                {modules.map(module => (
                  <Button 
                    key={module.id}
                    variant="outline" 
                    size="sm" 
                    onClick={() => selectModule(module.id)}
                  >
                    {module.name} Only
                  </Button>
                ))}
              </div>

              {isLoadingRegistry ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map(module => {
                    const ModuleIcon = MODULE_ICONS[module.id] || Database;
                    const syncableTables = module.tables.filter(t => !t.excludeFromSync);
                    const selectedCount = syncableTables.filter(t => selectedTables.includes(t.id)).length;
                    const allSelected = syncableTables.length > 0 && selectedCount === syncableTables.length;
                    const someSelected = selectedCount > 0 && selectedCount < syncableTables.length;
                    
                    return (
                      <Collapsible 
                        key={module.id} 
                        open={expandedModules.has(module.id)}
                        onOpenChange={() => toggleModuleExpanded(module.id)}
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 cursor-pointer hover-elevate">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {expandedModules.has(module.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <ModuleIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">{module.name}</h3>
                                  <p className="text-xs text-muted-foreground">{module.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={allSelected ? "default" : someSelected ? "secondary" : "outline"}>
                                  {selectedCount} / {syncableTables.length}
                                </Badge>
                                <Checkbox
                                  checked={allSelected}
                                  data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                                  onCheckedChange={() => toggleModule(module.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-3 space-y-3">
                              {syncableTables.map(table => {
                                const dataTypeBadge = table.dataType ? DATA_TYPE_BADGES[table.dataType] : null;
                                const hasWarning = table.productionWarning && isProduction;
                                return (
                                  <div key={table.id} className="flex items-start space-x-3 ml-9">
                                    <Checkbox
                                      id={`import-${table.id}`}
                                      checked={selectedTables.includes(table.id)}
                                      onCheckedChange={() => toggleTable(table.id)}
                                    />
                                    <div className="grid gap-1 leading-none flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Label htmlFor={`import-${table.id}`} className="font-medium cursor-pointer">
                                          {table.name}
                                        </Label>
                                        {dataTypeBadge && (
                                          <Badge variant={dataTypeBadge.variant} className="text-xs h-5 px-1.5">
                                            <dataTypeBadge.icon className="h-3 w-3 mr-1" />
                                            {dataTypeBadge.label}
                                          </Badge>
                                        )}
                                        {table.requiresConfirmation && (
                                          <span title={table.confirmationMessage}>
                                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{table.description}</p>
                                      {hasWarning && selectedTables.includes(table.id) && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                                          <AlertTriangle className="h-3 w-3" />
                                          {table.productionWarning}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {module.tables.filter(t => t.excludeFromSync).length > 0 && (
                                <div className="ml-9 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground italic">
                                    {module.tables.filter(t => t.excludeFromSync).length} table(s) excluded from sync (user-specific data)
                                  </p>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <p className="text-sm text-muted-foreground">
                {selectedTables.length} of {allTableIds.length} tables selected
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
              <p><strong>Media Files:</strong> Database sync only transfers database records. Use the Object Storage tab to sync actual image files.</p>
              <p><strong>Sales Reps:</strong> New sales rep accounts must be created via the admin UI (passwords are not exported for security).</p>
              <p><strong>B2B Admins:</strong> Admin passwords are not exported. Existing admins are updated, new admins need password setup.</p>
              <p><strong>Order Data:</strong> Importing orders uses order numbers and customer emails as business keys for matching.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bidirectional Sync Tab */}
        <TabsContent value="bidirectional" className="space-y-4">
          <Alert>
            <GitCompare className="h-4 w-4" />
            <AlertTitle>How Bidirectional Sync Works</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li><strong>Connect:</strong> Enter your production database connection string</li>
                <li><strong>Scan:</strong> Compare records between development and production</li>
                <li><strong>Review:</strong> See which records are newer in each environment</li>
                <li><strong>Sync:</strong> Choose which version to keep for each difference</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          {isRegistryError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registry Load Failed</AlertTitle>
              <AlertDescription>
                Could not load the full table registry. Only tasting and B2B tables are available. 
                Please ensure you are logged in as an admin and refresh the page.
              </AlertDescription>
            </Alert>
          )}
          
          {!isRegistryError && registryData && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Registry Loaded</AlertTitle>
              <AlertDescription>
                {modules.length} modules with {allSyncableTables.length} syncable tables available
              </AlertDescription>
            </Alert>
          )}

          {/* Schema Push Section */}
          <SchemaPushCard prodDbUrl={prodDbUrl} />

          {!isConnected ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Connect to Production Database
                </CardTitle>
                <CardDescription>
                  Enter your production database connection string to compare with development
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prod-db-url">Production Database URL</Label>
                  <Textarea
                    id="prod-db-url"
                    placeholder="postgres://user:password@host:port/database"
                    value={prodDbUrl}
                    onChange={(e) => {
                      setProdDbUrl(e.target.value);
                      localStorage.setItem('sync_prod_db_url', e.target.value);
                    }}
                    className="font-mono text-xs"
                    data-testid="input-prod-db-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can find this in your production environment's DATABASE_URL secret
                  </p>
                </div>
                <Button 
                  onClick={async () => {
                    if (!prodDbUrl.trim()) {
                      toast({
                        title: "Missing URL",
                        description: "Please enter a production database URL",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsConnecting(true);
                    try {
                      const response = await apiRequest('POST', '/api/admin/sync/test-connection', { prodDatabaseUrl: prodDbUrl });
                      const data = await response.json();
                      if (data.success) {
                        setIsConnected(true);
                        toast({
                          title: "Connected!",
                          description: "Successfully connected to production database",
                        });
                      } else {
                        throw new Error(data.message || 'Connection failed');
                      }
                    } catch (error: any) {
                      toast({
                        title: "Connection Failed",
                        description: error.message || "Could not connect to production database",
                        variant: "destructive",
                      });
                    } finally {
                      setIsConnecting(false);
                    }
                  }}
                  disabled={isConnecting || !prodDbUrl.trim()}
                  data-testid="button-connect-prod"
                >
                  {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isConnecting ? 'Connecting...' : 'Test Connection'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Connected to Production
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsConnected(false);
                        setScanResult(null);
                      }}
                      data-testid="button-disconnect"
                    >
                      Disconnect
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Button
                      onClick={handleScanForDifferences}
                      disabled={isScanning}
                      data-testid="button-scan"
                    >
                      {isScanning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isScanning ? 'Scanning...' : 'Scan for Differences'}
                    </Button>
                    {scanResult && (
                      <span className="text-sm text-muted-foreground">
                        Last scanned: {new Date(scanResult.scannedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sync Product COG to Production</CardTitle>
                  <CardDescription>Push ONLY the cost-of-goods values from dev to production. No other product fields will be changed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CogSyncSection prodDbUrl={prodDbUrl} />
                </CardContent>
              </Card>

              {scanResult && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Scan Summary</CardTitle>
                      <CardDescription>
                        Overview of differences between Development and Production
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{scanResult.totalDevNewer}</div>
                          <div className="text-sm text-muted-foreground">Dev Newer</div>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{scanResult.totalProdNewer}</div>
                          <div className="text-sm text-muted-foreground">Prod Newer</div>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-yellow-600">{scanResult.totalConflicts}</div>
                          <div className="text-sm text-muted-foreground">Conflicts</div>
                        </div>
                        <div className="bg-muted rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold">{scanResult.totalIdentical}</div>
                          <div className="text-sm text-muted-foreground">Identical</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sync Actions Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle>Sync Actions</CardTitle>
                          <CardDescription>
                            Select records to sync between environments
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const counts = getSelectionCounts();
                            return (
                              <>
                                {counts.devToProd > 0 && (
                                  <Badge className="bg-blue-500">
                                    {counts.devToProd} → Prod
                                  </Badge>
                                )}
                                {counts.prodToDev > 0 && (
                                  <Badge className="bg-green-500">
                                    {counts.prodToDev} → Dev
                                  </Badge>
                                )}
                                {counts.total === 0 && (
                                  <Badge variant="outline">No selections</Badge>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={selectAllRecommended} data-testid="button-select-recommended">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Select All Recommended
                        </Button>
                        <Button variant="outline" size="sm" onClick={selectAllDevOnly} data-testid="button-select-dev-only">
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Copy All D to P
                        </Button>
                        <Button variant="outline" size="sm" onClick={selectAllProdOnly} data-testid="button-select-prod-only">
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Copy All P to D
                        </Button>
                        {scanResult && scanResult.tables.some(t => t.records.some(r => r.state === 'conflict')) && (
                          <>
                            <Button variant="outline" size="sm" onClick={selectAllConflictsKeepDev} data-testid="button-conflicts-keep-dev">
                              <GitCompare className="h-4 w-4 mr-1" />
                              Conflicts D to P
                            </Button>
                            <Button variant="outline" size="sm" onClick={selectAllConflictsKeepProd} data-testid="button-conflicts-keep-prod">
                              <GitCompare className="h-4 w-4 mr-1" />
                              Conflicts P to D
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" onClick={clearAllSelections} data-testid="button-clear-selections">
                          <X className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      </div>
                      
                      {getSelectionCounts().total > 0 && (
                        <div className="flex items-center gap-4 pt-2 border-t">
                          <Button 
                            onClick={() => setShowSyncConfirm(true)}
                            disabled={isApplyingSync}
                            data-testid="button-apply-sync"
                          >
                            {isApplyingSync && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Apply Sync ({getSelectionCounts().total} records)
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {getSelectionCounts().devToProd} to production, {getSelectionCounts().prodToDev} to development
                          </span>
                        </div>
                      )}

                      {syncApplyResult && (
                        <div className="mt-4 space-y-3">
                          <Alert variant={syncApplyResult.success ? "default" : "destructive"}>
                            {syncApplyResult.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                            <AlertTitle className="flex items-center gap-2">
                              {syncApplyResult.success ? 'Sync Complete!' : 'Sync Completed with Errors'}
                            </AlertTitle>
                            <AlertDescription>
                              <div className="mt-2 grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                  <ArrowRight className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium">{syncApplyResult.appliedToProdCount}</span>
                                  <span className="text-sm text-muted-foreground">records to Production</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                  <ArrowLeft className="h-4 w-4 text-green-500" />
                                  <span className="font-medium">{syncApplyResult.appliedToDevCount}</span>
                                  <span className="text-sm text-muted-foreground">records to Development</span>
                                </div>
                              </div>
                              {syncApplyResult.errors.length > 0 && (
                                <div className="mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                                  <p className="font-medium text-destructive">Errors ({syncApplyResult.errors.length}):</p>
                                  <ul className="mt-1 text-sm space-y-1">
                                    {syncApplyResult.errors.map((e, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <X className="h-3 w-3 mt-0.5 text-destructive flex-shrink-0" />
                                        <span><strong>{e.tableId}:</strong> {e.error}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={async () => {
                                await handleScanForDifferences();
                                setSyncApplyResult(null);
                              }}
                              disabled={isScanning}
                              data-testid="button-rescan-after-sync"
                            >
                              {isScanning ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Re-scan to Verify Changes
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSyncApplyResult(null)}
                              disabled={isScanning}
                              data-testid="button-dismiss-result"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Table Comparison</CardTitle>
                          <CardDescription>
                            {scanResult.tables.filter(t => t.records.length > 0 || t.devCount !== t.prodCount).length} of {scanResult.tables.length} tables have differences
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="show-all-tables" className="text-sm text-muted-foreground">
                            Show all {scanResult.tables.length} tables
                          </Label>
                          <Switch
                            id="show-all-tables"
                            checked={showAllTables}
                            onCheckedChange={setShowAllTables}
                            data-testid="switch-show-all-tables"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Input
                          placeholder="Search tables..."
                          value={scanTableSearch}
                          onChange={(e) => setScanTableSearch(e.target.value)}
                          className="max-w-sm"
                          data-testid="input-scan-table-search"
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                      <div className="space-y-2 pr-3">
                        {scanResult.tables
                          .filter(t => showAllTables || t.records.length > 0 || t.devCount !== t.prodCount)
                          .filter(t => !scanTableSearch || t.tableName.toLowerCase().includes(scanTableSearch.toLowerCase()) || t.tableId.toLowerCase().includes(scanTableSearch.toLowerCase()))
                          .map(table => {
                            const hasChanges = table.records.length > 0;
                            const isExpanded = expandedSyncTables.has(table.tableId);
                            const ModuleIcon = MODULE_ICONS[table.module] || Database;
                            
                            return (
                              <Collapsible
                                key={table.tableId}
                                open={isExpanded}
                                onOpenChange={(open) => {
                                  setExpandedSyncTables(prev => {
                                    const next = new Set(prev);
                                    if (open) {
                                      next.add(table.tableId);
                                    } else {
                                      next.delete(table.tableId);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover-elevate">
                                    <div className="flex items-center gap-3">
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{table.tableName}</span>
                                      <Badge variant="outline" className="text-xs">
                                        Dev: {table.devCount} | Prod: {table.prodCount}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {table.devNewer > 0 && (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                          {table.devNewer} dev newer
                                        </Badge>
                                      )}
                                      {table.prodNewer > 0 && (
                                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                          {table.prodNewer} prod newer
                                        </Badge>
                                      )}
                                      {table.conflicts > 0 && (
                                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                          {table.conflicts} conflicts
                                        </Badge>
                                      )}
                                      {table.devOnly > 0 && (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                          {table.devOnly} dev only
                                        </Badge>
                                      )}
                                      {table.prodOnly > 0 && (
                                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                          {table.prodOnly} prod only
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  {table.records.length > 0 ? (
                                    <div className="mt-2 ml-8">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() => selectAutoForTable(table.tableId)}
                                          data-testid={`button-auto-select-${table.tableId}`}
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Auto Select All
                                        </Button>
                                        {table.devOnly > 0 && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-blue-600 border-blue-500/30"
                                            onClick={() => selectDevOnlyForTable(table.tableId)}
                                            data-testid={`button-select-dev-only-${table.tableId}`}
                                          >
                                            <ArrowRight className="h-3 w-3 mr-1" />
                                            {table.devOnly} Dev to Prod
                                          </Button>
                                        )}
                                        {table.prodOnly > 0 && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 border-green-500/30"
                                            onClick={() => selectProdOnlyForTable(table.tableId)}
                                            data-testid={`button-select-prod-only-${table.tableId}`}
                                          >
                                            <ArrowLeft className="h-3 w-3 mr-1" />
                                            {table.prodOnly} Prod to Dev
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => clearSelectionsForTable(table.tableId)}
                                          data-testid={`button-clear-${table.tableId}`}
                                        >
                                          <X className="h-3 w-3 mr-1" />
                                          Clear
                                        </Button>
                                      </div>
                                      <div className="border rounded-lg overflow-hidden">
                                      <ScrollArea className="max-h-[400px]">
                                        <table className="w-full text-sm">
                                          <thead className="bg-muted sticky top-0">
                                            <tr>
                                              <th className="text-left p-2">Business Key</th>
                                              <th className="text-left p-2">State</th>
                                              <th className="text-left p-2">Dev Updated</th>
                                              <th className="text-left p-2">Prod Updated</th>
                                              <th className="text-left p-2">Sync Action</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {table.records.slice(0, 50).map((record, idx) => {
                                              const currentSelection = getRecordSelection(table.tableId, record.businessKey);
                                              return (
                                              <tr key={idx} className="border-t">
                                                <td className="p-2 font-mono text-xs max-w-[200px] truncate">
                                                  {Object.entries(record.businessKey)
                                                    .map(([k, v]) => `${k}: ${v}`)
                                                    .join(', ')}
                                                </td>
                                                <td className="p-2">
                                                  <Badge variant={
                                                    record.state === 'dev_newer' ? 'default' :
                                                    record.state === 'prod_newer' ? 'secondary' :
                                                    record.state === 'conflict' ? 'destructive' :
                                                    record.state === 'dev_only' ? 'default' :
                                                    record.state === 'prod_only' ? 'secondary' :
                                                    'outline'
                                                  }>
                                                    {record.state.replace('_', ' ')}
                                                  </Badge>
                                                </td>
                                                <td className="p-2 text-xs text-muted-foreground">
                                                  {record.devUpdatedAt ? new Date(record.devUpdatedAt).toLocaleString() : '-'}
                                                </td>
                                                <td className="p-2 text-xs text-muted-foreground">
                                                  {record.prodUpdatedAt ? new Date(record.prodUpdatedAt).toLocaleString() : '-'}
                                                </td>
                                                <td className="p-2">
                                                  <div className="flex items-center gap-1">
                                                    <Button 
                                                      size="sm" 
                                                      variant={currentSelection === 'dev' ? 'default' : 'outline'}
                                                      className={`h-7 px-2 text-xs ${currentSelection === 'dev' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                                                      onClick={() => toggleRecordSelection(table.tableId, record.businessKey, currentSelection === 'dev' ? 'skip' : 'dev')}
                                                      disabled={record.state === 'prod_only'}
                                                      title="Copy Development to Production"
                                                    >
                                                      <ArrowRight className="h-3 w-3 mr-1" />
                                                      D to P
                                                    </Button>
                                                    <Button 
                                                      size="sm" 
                                                      variant={currentSelection === 'prod' ? 'default' : 'outline'}
                                                      className={`h-7 px-2 text-xs ${currentSelection === 'prod' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                                      onClick={() => toggleRecordSelection(table.tableId, record.businessKey, currentSelection === 'prod' ? 'skip' : 'prod')}
                                                      disabled={record.state === 'dev_only'}
                                                      title="Copy Production to Development"
                                                    >
                                                      <ArrowLeft className="h-3 w-3 mr-1" />
                                                      P to D
                                                    </Button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );})}
                                          </tbody>
                                        </table>
                                        {table.records.length > 50 && (
                                          <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                                            Showing first 50 of {table.records.length} records
                                          </div>
                                        )}
                                      </ScrollArea>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2 ml-8 p-4 border rounded-lg text-center text-muted-foreground">
                                      No differences found in this table
                                    </div>
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        {scanResult.tables.filter(t => t.records.length > 0 || t.devCount !== t.prodCount).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                            <p className="text-lg font-medium">All tables are in sync!</p>
                            <p className="text-sm">No differences found between development and production</p>
                          </div>
                        )}
                      </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Comparison Method:</strong> Records are matched using business keys (like SKU, email, etc.) and compared using content hashes and timestamps.</p>
              <p><strong>Safe Sync:</strong> Reference data (products, categories) can be synced freely. User-generated data is protected in production.</p>
              <p><strong>Conflict Resolution:</strong> When the same record is modified in both environments, you choose which version to keep.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Object Storage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <Alert>
            <HardDrive className="h-4 w-4" />
            <AlertTitle>How Object Storage Sync Works</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li><strong>Check status:</strong> View which files exist in this environment's bucket</li>
                <li><strong>Preview sync:</strong> Run a dry run to see what will be downloaded</li>
                <li><strong>Sync files:</strong> Download files from their source URLs and upload to this bucket</li>
              </ol>
              <p className="mt-2 text-xs">
                Files are downloaded from the URLs stored in the Media Library database records and re-uploaded to the current environment's Object Storage bucket.
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Media Sync Status
              </CardTitle>
              <CardDescription>
                Current state of media files in {environmentName} Object Storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingStatus ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mediaSyncStatus ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{mediaSyncStatus.summary.total}</div>
                      <div className="text-sm text-muted-foreground">Total Files</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{mediaSyncStatus.summary.existingInBucket}</div>
                      <div className="text-sm text-muted-foreground">In Bucket</div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{mediaSyncStatus.summary.missingFromBucket}</div>
                      <div className="text-sm text-muted-foreground">Missing</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{mediaSyncStatus.summary.urlMismatch}</div>
                      <div className="text-sm text-muted-foreground">URL Mismatch</div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <strong>Bucket ID:</strong> {mediaSyncStatus.bucketId}
                  </div>

                  {mediaSyncStatus.summary.missingFromBucket > 0 && (
                    <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Files Need Syncing</AlertTitle>
                      <AlertDescription>
                        {mediaSyncStatus.summary.missingFromBucket} file(s) are missing from this environment's bucket. 
                        Run the sync to download them from their source URLs.
                      </AlertDescription>
                    </Alert>
                  )}

                  {mediaSyncStatus.summary.missingFromBucket === 0 && mediaSyncStatus.summary.urlMismatch === 0 && (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>All Synced</AlertTitle>
                      <AlertDescription>
                        All media files are present in this environment's bucket with correct URLs.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Could not load sync status. Object Storage may not be configured.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6 flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={() => refetchStatus()}
                disabled={isLoadingStatus}
                data-testid="button-refresh-status"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => mediaSyncMutation.mutate(true)}
                  disabled={mediaSyncMutation.isPending}
                  data-testid="button-dry-run"
                >
                  {mediaSyncMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Preview Sync (Dry Run)
                </Button>
                <Button 
                  onClick={() => mediaSyncMutation.mutate(false)}
                  disabled={mediaSyncMutation.isPending}
                  variant={isProduction ? "destructive" : "default"}
                  data-testid="button-sync-media"
                >
                  {mediaSyncMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Sync Media Files
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Sync Results */}
          {mediaSyncResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {mediaSyncResult.dryRun ? (
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {mediaSyncResult.dryRun ? 'Dry Run Results' : 'Sync Results'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">{mediaSyncResult.summary.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{mediaSyncResult.summary.synced}</div>
                    <div className="text-xs text-muted-foreground">Synced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{mediaSyncResult.summary.skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-destructive">{mediaSyncResult.summary.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>

                {mediaSyncResult.results.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">File</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mediaSyncResult.results.map((result, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 font-mono text-xs truncate max-w-[200px]">{result.filename}</td>
                            <td className="p-2">
                              <Badge variant={
                                result.status === 'synced' ? 'default' : 
                                result.status === 'skipped' ? 'secondary' : 'destructive'
                              }>
                                {result.status === 'synced' && <Check className="h-3 w-3 mr-1" />}
                                {result.status === 'failed' && <X className="h-3 w-3 mr-1" />}
                                {result.status}
                              </Badge>
                            </td>
                            <td className="p-2 text-xs text-muted-foreground truncate max-w-[300px]">{result.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>How Media Sync Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>1. File Check:</strong> Compares Media Library database records against files in the current environment's Object Storage bucket.</p>
              <p><strong>2. Download & Upload:</strong> For missing files, downloads from the source URL (stored in database) and uploads to the current bucket.</p>
              <p><strong>3. URL Update:</strong> Updates the Media Library database record with the new URL pointing to this environment's bucket.</p>
              <p className="pt-2"><strong>Tip:</strong> After syncing database tables (including Media Library), run Object Storage sync to ensure all image files are available in this environment.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-6">
          <Alert>
            <BookOpen className="h-4 w-4" />
            <AlertTitle>Environment Sync Tool Guide</AlertTitle>
            <AlertDescription>
              Complete documentation for syncing data between development and production environments.
            </AlertDescription>
          </Alert>

          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Overview
              </CardTitle>
              <CardDescription>
                The Environment Sync Tool has 3 main functional tabs for managing data between environments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Tab</th>
                      <th className="text-left py-2 px-3 font-medium">Purpose</th>
                      <th className="text-left py-2 px-3 font-medium">Best For</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-medium flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Export/Import
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">File-based transfer via Excel</td>
                      <td className="py-2 px-3 text-muted-foreground">Backups, initial setup, bulk migrations</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 font-medium flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Compare & Sync
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">Live database comparison</td>
                      <td className="py-2 px-3 text-muted-foreground">Keeping dev & prod in sync, finding differences</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Object Storage
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">Media file synchronization</td>
                      <td className="py-2 px-3 text-muted-foreground">Images, documents, uploaded files</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Export/Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                When to Use Export/Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Best for:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Creating backups before major changes</li>
                  <li>Setting up a fresh environment</li>
                  <li>One-time bulk data transfers</li>
                  <li>Sharing data with team members (via Excel file)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">How it works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li><strong>Select tables</strong> you want to export</li>
                  <li><strong>Download Excel file</strong> from current environment</li>
                  <li><strong>Switch to target environment</strong> (open the other app)</li>
                  <li><strong>Upload the Excel file</strong> to import</li>
                </ol>
              </div>
              <Alert variant="default" className="bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> This is a one-way transfer. It doesn't compare what's already in the target - it merges/upserts based on business keys.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Compare & Sync Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                When to Use Compare & Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Best for:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Seeing exactly what's different between dev and prod</li>
                  <li>Selective syncing (choose individual records)</li>
                  <li>Keeping configuration in sync over time</li>
                  <li>Syncing the "most recent" version of each row</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">How it works:</h4>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li><strong>Push Schema first</strong> - Ensures production has all tables</li>
                  <li><strong>Push Modules</strong> - Syncs module definitions</li>
                  <li><strong>Enter Production DB URL</strong> and test connection</li>
                  <li><strong>Scan</strong> - Compares all records using:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>Business keys (unique identifiers like SKU, email)</li>
                      <li><code className="bg-muted px-1 rounded">updatedAt</code> timestamps (determines which is newer)</li>
                      <li>Content hash (detects actual changes)</li>
                    </ul>
                  </li>
                  <li><strong>Review differences</strong> - Shows:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><Badge variant="outline" className="text-xs h-5 mx-1">Dev Newer</Badge> Dev has more recent changes</li>
                      <li><Badge variant="secondary" className="text-xs h-5 mx-1">Prod Newer</Badge> Prod has more recent changes</li>
                      <li><Badge variant="outline" className="text-xs h-5 mx-1">Dev Only</Badge> New in dev, not in prod</li>
                      <li><Badge variant="outline" className="text-xs h-5 mx-1">Prod Only</Badge> New in prod, not in dev</li>
                      <li><Badge variant="destructive" className="text-xs h-5 mx-1">Conflict</Badge> Both changed since last sync</li>
                    </ul>
                  </li>
                  <li><strong>Select & Sync</strong> - Choose which version to keep</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Best Approach Section */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Best Approach for Syncing Most Current Data
              </CardTitle>
              <CardDescription>
                Recommended workflow for keeping your environments synchronized
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="shrink-0 mt-0.5">1</Badge>
                  <div>
                    <h4 className="font-medium">First, push schema & modules (Compare & Sync tab):</h4>
                    <ul className="list-disc list-inside text-muted-foreground text-sm mt-1">
                      <li>Click "Push Schema" to create any missing tables in production</li>
                      <li>Click "Sync Modules" to sync module definitions</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="shrink-0 mt-0.5">2</Badge>
                  <div>
                    <h4 className="font-medium">Then use Compare & Sync:</h4>
                    <ul className="list-disc list-inside text-muted-foreground text-sm mt-1">
                      <li>Connect to production database</li>
                      <li>Scan all tables (or select specific ones)</li>
                      <li>Review the differences</li>
                      <li>The tool shows recommendations based on timestamps</li>
                      <li>Select "Use Dev" or "Use Prod" for each difference</li>
                      <li>Apply changes</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="shrink-0 mt-0.5">3</Badge>
                  <div>
                    <h4 className="font-medium">Finally, sync Object Storage:</h4>
                    <ul className="list-disc list-inside text-muted-foreground text-sm mt-1">
                      <li>Switch to Object Storage tab</li>
                      <li>Click "Refresh Status" to see missing files</li>
                      <li>Click "Sync Media Files" to copy images</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Type Protection Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Type Protection
              </CardTitle>
              <CardDescription>
                The system classifies tables by data type to protect sensitive information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Example</th>
                      <th className="text-left py-2 px-3 font-medium">Sync Behavior</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">Reference</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">Products, courses, settings</td>
                      <td className="py-2 px-3 text-muted-foreground">Safe to sync both ways</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-xs">Configuration</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">App settings, modules</td>
                      <td className="py-2 px-3 text-muted-foreground">Sync with caution</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3">
                        <Badge variant="default" className="text-xs">User Generated</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">B2B customers, sales reps</td>
                      <td className="py-2 px-3 text-muted-foreground">Warns before overwriting</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">
                        <Badge variant="destructive" className="text-xs">Transactional</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">Orders, reservations</td>
                      <td className="py-2 px-3 text-muted-foreground">Excluded from sync (never sync from dev to prod)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Quick Reference Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Quick Reference
              </CardTitle>
              <CardDescription>
                Common tasks and which feature to use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Task</th>
                      <th className="text-left py-2 px-3 font-medium">Use This</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">"I need a backup"</td>
                      <td className="py-2 px-3 font-medium">Export/Import → Export</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">"What's different between dev and prod?"</td>
                      <td className="py-2 px-3 font-medium">Compare & Sync → Scan</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">"I changed products in dev, need to push to prod"</td>
                      <td className="py-2 px-3 font-medium">Compare & Sync</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">"I set up customers in prod, need to copy to dev"</td>
                      <td className="py-2 px-3 font-medium">Compare & Sync (select Prod→Dev)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">"Images are missing"</td>
                      <td className="py-2 px-3 font-medium">Object Storage → Sync</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-muted-foreground">"New tables aren't showing in prod"</td>
                      <td className="py-2 px-3 font-medium">Compare & Sync → Push Schema</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sync Confirmation Dialog */}
      <AlertDialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Database Sync</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to sync the following records:</p>
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-600">{getSelectionCounts().devToProd}</div>
                    <div className="text-sm">Dev → Production</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{getSelectionCounts().prodToDev}</div>
                    <div className="text-sm">Prod → Development</div>
                  </div>
                </div>
                <p className="text-sm text-destructive font-medium">
                  This will overwrite records in the target database. This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplyingSync}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={applySync}
              disabled={isApplyingSync}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isApplyingSync && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
