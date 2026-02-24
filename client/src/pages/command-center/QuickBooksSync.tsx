import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Link2, Link2Off, RefreshCw, Users, Package, FileText, AlertTriangle,
  CheckCircle, XCircle, Clock, ArrowRight, Eye, EyeOff, Filter, Search,
  ShieldCheck, Copy, CircleSlash, HelpCircle, DollarSign, CreditCard,
  UserPlus, Ban
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface QbStatus {
  connected: boolean;
  companyName?: string;
  realmId?: string;
  lastSyncAt?: string;
  connectedAt?: string;
  refreshTokenExpiresAt?: string;
  daysUntilRefreshExpiry?: number;
  needsReconnect?: boolean;
}

interface QbCustomerMapping {
  id: number;
  qbCustomerId: string;
  qbCustomerName: string;
  b2bCustomerId: string | null;
  isAutoMatched: boolean;
  isIgnored: boolean;
  b2bCustomerName: string | null;
}

interface QbItemMapping {
  id: number;
  qbItemId: string;
  qbItemName: string;
  productId: string | null;
  isAutoMatched: boolean;
  isIgnored: boolean;
  productName: string | null;
}

interface B2bCustomerOption {
  id: string;
  accountName: string;
  customerNumber: string;
  customerType: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
  category: string;
}

interface QbDescMapping {
  id: number;
  description: string;
  parsedName: string | null;
  productId: string | null;
  isAutoMatched: boolean;
  isIgnored: boolean;
}

interface SyncLog {
  id: number;
  syncType: string;
  status: string;
  invoicesProcessed: number;
  invoicesCreated: number;
  invoicesSkipped: number;
  invoicesFailed: number;
  customersProcessed: number;
  customersMapped: number;
  errorDetails: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface PreviewInvoice {
  qbInvoiceId: string;
  docNumber: string;
  customerName: string;
  b2bCustomerId: string | null;
  date: string;
  total: number;
  lineCount: number;
  status: "ready" | "already_imported" | "duplicate_detected" | "unmapped_customer" | "unmapped_items" | "no_lines";
  duplicateReason: string;
  duplicateMatch: { orderId: string; orderNumber: string; total: string; status: string } | null;
  itemIssues: string[];
  orderItems: any[];
}

interface PreviewResult {
  summary: {
    total: number;
    ready: number;
    alreadyImported: number;
    duplicateDetected: number;
    unmappedCustomer: number;
    unmappedItems: number;
    noLines: number;
  };
  invoices: PreviewInvoice[];
}

interface PaymentPreview {
  qbPaymentId: string;
  txnDate: string;
  totalAmt: number;
  paymentMethod: string | null;
  paymentRefNum: string | null;
  customerName: string;
  linkedInvoices: {
    qbInvoiceId: string;
    amountApplied: number;
    b2bOrderId: string | null;
    qbDocNumber: string | null;
    mapped: boolean;
  }[];
  status: "ready" | "already_imported" | "no_invoices" | "unmapped_invoices" | "partial_match";
  statusReason: string;
}

interface PaymentPreviewResult {
  summary: {
    total: number;
    ready: number;
    alreadyImported: number;
    unmappedInvoices: number;
    noInvoices: number;
  };
  payments: PaymentPreview[];
}

type TabType = "connection" | "customers" | "items" | "sync" | "payments";

export default function QuickBooksSync() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("connection");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("");
  const [ekosOnly, setEkosOnly] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pmtStartDate, setPmtStartDate] = useState("2026-01-01");
  const [pmtEndDate, setPmtEndDate] = useState("");
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreviewResult | null>(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [showIgnored, setShowIgnored] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddType, setQuickAddType] = useState<string>("other");
  const [quickAddMapId, setQuickAddMapId] = useState<number | null>(null);
  const [toastSearchOpen, setToastSearchOpen] = useState(false);
  const [toastSearchQuery, setToastSearchQuery] = useState("");
  const [toastSearchResults, setToastSearchResults] = useState<any[]>([]);
  const [toastSearchLoading, setToastSearchLoading] = useState(false);
  const [toastResultCategories, setToastResultCategories] = useState<Record<number, string>>({});
  const [toastSearchDescId, setToastSearchDescId] = useState<number | null>(null);
  const [toastSearchDescName, setToastSearchDescName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qb = params.get("qb");
    if (qb === "connected") {
      toast({ title: "QuickBooks Connected", description: "Successfully connected to QuickBooks Online." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (qb === "error") {
      toast({ title: "Connection Failed", description: params.get("reason") || "Failed to connect to QuickBooks.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: status, isLoading: statusLoading } = useQuery<QbStatus>({
    queryKey: ["/api/quickbooks/status"],
  });

  const { data: customerMappings } = useQuery<QbCustomerMapping[]>({
    queryKey: ["/api/quickbooks/customers"],
    enabled: status?.connected === true,
  });

  const { data: itemMappings } = useQuery<QbItemMapping[]>({
    queryKey: ["/api/quickbooks/items"],
    enabled: status?.connected === true,
  });

  const { data: b2bCustomers } = useQuery<B2bCustomerOption[]>({
    queryKey: ["/api/quickbooks/b2b-customers"],
    enabled: status?.connected === true,
  });

  const { data: productOptions } = useQuery<ProductOption[]>({
    queryKey: ["/api/quickbooks/products"],
    enabled: status?.connected === true,
  });

  const { data: syncHistory } = useQuery<SyncLog[]>({
    queryKey: ["/api/quickbooks/sync/history"],
    enabled: status?.connected === true,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/quickbooks/connect");
      const data = await res.json();
      window.location.href = data.authUrl;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/quickbooks/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/status"] });
      toast({ title: "Disconnected", description: "QuickBooks has been disconnected." });
    },
  });

  const syncCustomersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quickbooks/customers/sync");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/customers"] });
      toast({ title: "Customers Synced", description: `Found ${data.total} EKOS customers (from ${data.ekosInvoicesScanned || 0} invoices). ${data.newMapped} auto-matched.` });
    },
    onError: (err: any) => toast({ title: "Sync Failed", description: err.message, variant: "destructive" }),
  });

  const syncItemsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quickbooks/items/sync");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/items"] });
      toast({ title: "Items Synced", description: `Found ${data.total} items. ${data.newMapped} auto-matched.` });
    },
    onError: (err: any) => toast({ title: "Sync Failed", description: err.message, variant: "destructive" }),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quickbooks/sync/preview", {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        docNumberPrefix: ekosOnly ? "E" : "",
      });
      return await res.json() as PreviewResult;
    },
    onSuccess: (data: PreviewResult) => {
      setPreviewData(data);
      const readyIds = new Set(data.invoices.filter(i => i.status === "ready").map(i => i.qbInvoiceId));
      setSelectedIds(readyIds);
    },
    onError: (err: any) => toast({ title: "Preview Failed", description: err.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quickbooks/sync/invoices", {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        docNumberPrefix: ekosOnly ? "E" : "",
        selectedInvoiceIds: Array.from(selectedIds),
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/sync/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/status"] });
      setPreviewData(null);
      setSelectedIds(new Set());
      toast({
        title: "Import Complete",
        description: `${data.created} orders created, ${data.skipped} skipped, ${data.failed} failed.`,
      });
    },
    onError: (err: any) => toast({ title: "Import Failed", description: err.message, variant: "destructive" }),
  });

  const updateCustomerMapping = useMutation({
    mutationFn: ({ id, b2bCustomerId }: { id: number; b2bCustomerId: string | null }) =>
      apiRequest("PATCH", `/api/quickbooks/customers/${id}`, { b2bCustomerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/customers"] });
    },
  });

  const toggleCustomerIgnore = useMutation({
    mutationFn: ({ id, isIgnored }: { id: number; isIgnored: boolean }) =>
      apiRequest("PATCH", `/api/quickbooks/customers/${id}`, { isIgnored }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/customers"] });
    },
  });

  const quickAddCustomerMutation = useMutation({
    mutationFn: async ({ qbCustomerMapId, accountName, customerType }: { qbCustomerMapId: number; accountName: string; customerType: string }) => {
      const res = await apiRequest("POST", "/api/quickbooks/customers/quick-add", { qbCustomerMapId, accountName, customerType });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/b2b-customers"] });
      setQuickAddOpen(false);
      toast({ title: "Customer Created", description: `${data.customer.accountName} (${data.customer.customerNumber}) created and mapped.` });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const updateItemMapping = useMutation({
    mutationFn: ({ id, productId }: { id: number; productId: string | null }) =>
      apiRequest("PATCH", `/api/quickbooks/items/${id}`, { productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/items"] });
    },
  });

  const toggleItemIgnore = useMutation({
    mutationFn: ({ id, isIgnored }: { id: number; isIgnored: boolean }) =>
      apiRequest("PATCH", `/api/quickbooks/items/${id}`, { isIgnored }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/items"] });
    },
  });

  const { data: descMappings } = useQuery<QbDescMapping[]>({
    queryKey: ["/api/quickbooks/descriptions"],
    enabled: status?.connected === true,
  });

  const syncDescriptionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quickbooks/descriptions/sync");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/descriptions"] });
      toast({ title: "Descriptions Synced", description: `Found ${data.total} unique descriptions. ${data.newMapped} auto-matched, ${data.newUnmapped || 0} need mapping.` });
    },
    onError: (err: any) => toast({ title: "Sync Failed", description: err.message, variant: "destructive" }),
  });

  const updateDescMapping = useMutation({
    mutationFn: ({ id, productId }: { id: number; productId: string | null }) =>
      apiRequest("PATCH", `/api/quickbooks/descriptions/${id}`, { productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/descriptions"] });
    },
  });

  const toggleDescIgnore = useMutation({
    mutationFn: ({ id, isIgnored }: { id: number; isIgnored: boolean }) =>
      apiRequest("PATCH", `/api/quickbooks/descriptions/${id}`, { isIgnored }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/descriptions"] });
    },
  });

  const searchToast = async (q: string) => {
    if (q.length < 2) { setToastSearchResults([]); return; }
    setToastSearchLoading(true);
    try {
      const res = await fetch(`/api/quickbooks/toast-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setToastSearchResults(data);
    } catch { setToastSearchResults([]); toast({ title: "Search Failed", description: "Could not search Toast items", variant: "destructive" }); }
    setToastSearchLoading(false);
  };

  const openToastSearch = (descId: number, parsedName: string) => {
    setToastSearchDescId(descId);
    setToastSearchDescName(parsedName);
    setToastSearchQuery(parsedName);
    setToastSearchResults([]);
    setToastResultCategories({});
    setToastSearchOpen(true);
    setTimeout(() => searchToast(parsedName), 100);
  };

  const toastImportMutation = useMutation({
    mutationFn: async ({ toastName, toastPrice, category, descriptionMapId }: { toastName: string; toastPrice: number; category: string; descriptionMapId: number | null }) => {
      const res = await apiRequest("POST", "/api/quickbooks/toast-import", { toastName, toastPrice, category, descriptionMapId });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/descriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products-with-media"] });
      toast({
        title: data.created ? "Product Created & Mapped" : "Existing Product Mapped",
        description: `"${data.product.name}" ${data.created ? "added to catalog and" : ""} mapped to description.`,
      });
      setToastSearchOpen(false);
    },
    onError: (err: any) => toast({ title: "Import Failed", description: err.message, variant: "destructive" }),
  });

  const paymentPreviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quickbooks/sync/payments/preview", {
        startDate: pmtStartDate || undefined,
        endDate: pmtEndDate || undefined,
      });
      return await res.json() as PaymentPreviewResult;
    },
    onSuccess: (data: PaymentPreviewResult) => {
      setPaymentPreview(data);
      const readyIds = new Set(data.payments.filter(p => p.status === "ready" || p.status === "partial_match").map(p => p.qbPaymentId));
      setSelectedPaymentIds(readyIds);
    },
    onError: (err: any) => toast({ title: "Preview Failed", description: err.message, variant: "destructive" }),
  });

  const paymentImportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quickbooks/sync/payments/import", {
        startDate: pmtStartDate || undefined,
        endDate: pmtEndDate || undefined,
        selectedPaymentIds: Array.from(selectedPaymentIds),
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/sync/history"] });
      setPaymentPreview(null);
      setSelectedPaymentIds(new Set());
      toast({
        title: "Payment Sync Complete",
        description: `${data.applied} payments applied, ${data.skipped} skipped, ${data.failed} failed.`,
      });
    },
    onError: (err: any) => toast({ title: "Sync Failed", description: err.message, variant: "destructive" }),
  });

  const togglePaymentSelection = (id: string) => {
    setSelectedPaymentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const paymentStatusIcon = (s: PaymentPreview["status"]) => {
    switch (s) {
      case "ready": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "already_imported": return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case "partial_match": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "unmapped_invoices": return <FileText className="w-4 h-4 text-destructive" />;
      case "no_invoices": return <CircleSlash className="w-4 h-4 text-muted-foreground" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const paymentStatusLabel = (s: PaymentPreview["status"]) => {
    switch (s) {
      case "ready": return "Ready to Apply";
      case "already_imported": return "Already Applied";
      case "partial_match": return "Partial Match";
      case "unmapped_invoices": return "Invoices Not Imported";
      case "no_invoices": return "No Linked Invoices";
      default: return s;
    }
  };

  const tabs: { key: TabType; label: string; icon: typeof Link2 }[] = [
    { key: "connection", label: "Connection", icon: Link2 },
    { key: "customers", label: "Customers", icon: Users },
    { key: "items", label: "Products", icon: Package },
    { key: "sync", label: "Import Invoices", icon: FileText },
    { key: "payments", label: "Sync Payments", icon: DollarSign },
  ];

  const unmappedCustomers = customerMappings?.filter(m => !m.b2bCustomerId && !m.isIgnored).length || 0;
  const unmappedItems = itemMappings?.filter(m => !m.productId && !m.isIgnored).length || 0;
  const unmappedDescs = descMappings?.filter(m => !m.productId && !m.isIgnored).length || 0;

  const toggleInvoiceSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusIcon = (s: PreviewInvoice["status"]) => {
    switch (s) {
      case "ready": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "already_imported": return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case "duplicate_detected": return <Copy className="w-4 h-4 text-amber-500" />;
      case "unmapped_customer": return <Users className="w-4 h-4 text-destructive" />;
      case "unmapped_items": return <Package className="w-4 h-4 text-destructive" />;
      case "no_lines": return <CircleSlash className="w-4 h-4 text-muted-foreground" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const statusLabel = (s: PreviewInvoice["status"]) => {
    switch (s) {
      case "ready": return "Ready to Import";
      case "already_imported": return "Already Imported";
      case "duplicate_detected": return "Possible Duplicate";
      case "unmapped_customer": return "Customer Not Mapped";
      case "unmapped_items": return "Products Not Mapped";
      case "no_lines": return "No Line Items";
      default: return s;
    }
  };

  return (
    <div className="space-y-6" data-testid="quickbooks-sync-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-qb-title">QuickBooks Integration</h2>
          <p className="text-sm text-muted-foreground">Import wholesale invoices from QuickBooks/EKOS into your B2B platform</p>
        </div>
        {status?.connected && (
          <Badge variant="outline" className="gap-1" data-testid="badge-qb-connected">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Connected to {status.companyName || "QuickBooks"}
          </Badge>
        )}
      </div>

      <div className="flex gap-1 border-b" data-testid="qb-tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.key === "customers" && unmappedCustomers > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">{unmappedCustomers}</Badge>
            )}
            {tab.key === "items" && (unmappedItems + unmappedDescs) > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">{unmappedItems + unmappedDescs}</Badge>
            )}
          </button>
        ))}
      </div>

      {activeTab === "connection" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status?.connected ? <Link2 className="w-5 h-5 text-green-500" /> : <Link2Off className="w-5 h-5 text-muted-foreground" />}
                Connection Status
              </CardTitle>
              <CardDescription>
                {status?.connected ? "Your QuickBooks account is connected and ready to sync." : "Connect your QuickBooks Online account to start importing invoices."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.connected ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company</span>
                      <span className="font-medium" data-testid="text-qb-company">{status.companyName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connected</span>
                      <span>{status.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Sync</span>
                      <span>{status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Expires</span>
                      <span className={status.needsReconnect ? "text-destructive font-medium" : ""}>
                        {status.daysUntilRefreshExpiry !== undefined ? `${status.daysUntilRefreshExpiry} days` : "N/A"}
                      </span>
                    </div>
                  </div>
                  {status.needsReconnect && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Your connection will expire soon. Please reconnect.
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => connectMutation.mutate()} data-testid="button-qb-reconnect">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reconnect
                    </Button>
                    <Button variant="destructive" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} data-testid="button-qb-disconnect">
                      <Link2Off className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </>
              ) : (
                <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending} data-testid="button-qb-connect">
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect to QuickBooks
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Step-by-step guide to importing EKOS invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium">Connect QuickBooks</p>
                    <p className="text-muted-foreground">Sign in with your QuickBooks Online account</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium">Map Customers</p>
                    <p className="text-muted-foreground">Match QB customers to your B2B wholesale accounts</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium">Map Products</p>
                    <p className="text-muted-foreground">Match EKOS items to your existing products (same product, bond warehouse)</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="font-medium">Preview & Import</p>
                    <p className="text-muted-foreground">Review invoices for duplicates, then import as wholesale orders</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-md bg-muted text-sm">
                <p className="font-medium mb-1">Revenue Tracking</p>
                <p className="text-muted-foreground">
                  Imported orders count as <strong>Wholesale</strong> revenue, same as manually entered B2B orders. 
                  Toast/retail = Retail revenue. EKOS/QB = Wholesale revenue (bond warehouse).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "customers" && status?.connected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Customer Mappings</CardTitle>
                <CardDescription>Only customers from EKOS invoices (starting with "E") are pulled from QuickBooks. Map them to B2B accounts, ignore ones you don't need, or quick-add new ones.</CardDescription>
              </div>
              <Button onClick={() => syncCustomersMutation.mutate()} disabled={syncCustomersMutation.isPending} data-testid="button-sync-customers">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncCustomersMutation.isPending ? "animate-spin" : ""}`} />
                {syncCustomersMutation.isPending ? "Syncing..." : "Pull Customers from QB"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!customerMappings || customerMappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No customers synced yet. Click "Pull Customers from QB" to get started.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  {(() => {
                    const mapped = customerMappings.filter(m => !m.isIgnored && m.b2bCustomerId).length;
                    const unmapped = customerMappings.filter(m => !m.isIgnored && !m.b2bCustomerId).length;
                    const ignored = customerMappings.filter(m => m.isIgnored).length;
                    return (
                      <>
                        <Badge variant="secondary" data-testid="badge-mapped-count">
                          <CheckCircle className="w-3 h-3 mr-1" /> {mapped} Mapped
                        </Badge>
                        {unmapped > 0 && (
                          <Badge variant="destructive" data-testid="badge-unmapped-count">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {unmapped} Need Mapping
                          </Badge>
                        )}
                        {ignored > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowIgnored(!showIgnored)}
                            data-testid="button-toggle-ignored"
                          >
                            {showIgnored ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                            {ignored} Ignored {showIgnored ? "(showing)" : "(hidden)"}
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  {customerMappings
                    .filter(m => showIgnored || !m.isIgnored)
                    .map(mapping => (
                    <div
                      key={mapping.id}
                      className={`flex items-center gap-3 p-3 rounded-md border text-sm ${
                        mapping.isIgnored ? "opacity-40 border-muted" : mapping.b2bCustomerId ? "border-green-500/20 bg-green-500/5" : "border-destructive/20 bg-destructive/5"
                      }`}
                      data-testid={`customer-mapping-${mapping.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{mapping.qbCustomerName}</p>
                          {mapping.isIgnored && <Badge variant="outline" className="text-xs">Ignored</Badge>}
                          {mapping.isAutoMatched && !mapping.isIgnored && (
                            <Badge variant="secondary" className="text-xs">Auto-matched</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">QB ID: {mapping.qbCustomerId}</p>
                      </div>
                      {!mapping.isIgnored && (
                        <>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="w-56 flex-shrink-0">
                            <Select
                              value={mapping.b2bCustomerId || "unmatched"}
                              onValueChange={(val) => updateCustomerMapping.mutate({ id: mapping.id, b2bCustomerId: val === "unmatched" ? null : val })}
                            >
                              <SelectTrigger data-testid={`select-customer-${mapping.id}`}>
                                <SelectValue placeholder="Select B2B Customer" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unmatched">-- Not Mapped --</SelectItem>
                                {b2bCustomers?.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.accountName} ({c.customerNumber})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {!mapping.b2bCustomerId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setQuickAddName(mapping.qbCustomerName);
                                setQuickAddType("other");
                                setQuickAddMapId(mapping.id);
                                setQuickAddOpen(true);
                              }}
                              title="Create new B2B customer from this QB customer"
                              data-testid={`button-quick-add-${mapping.id}`}
                            >
                              <UserPlus className="w-4 h-4 mr-1" /> Add New
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        size="sm"
                        variant={mapping.isIgnored ? "secondary" : "ghost"}
                        onClick={() => toggleCustomerIgnore.mutate({ id: mapping.id, isIgnored: !mapping.isIgnored })}
                        title={mapping.isIgnored ? "Un-ignore this customer" : "Ignore this customer (won't block imports)"}
                        data-testid={`button-ignore-customer-${mapping.id}`}
                      >
                        {mapping.isIgnored ? (
                          <><Eye className="w-4 h-4 mr-1" /> Restore</>
                        ) : (
                          <><Ban className="w-4 h-4 mr-1" /> Ignore</>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add B2B Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="quickAddName">Account Name</Label>
              <Input
                id="quickAddName"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                data-testid="input-quick-add-name"
              />
            </div>
            <div>
              <Label htmlFor="quickAddType">Customer Type</Label>
              <Select value={quickAddType} onValueChange={setQuickAddType}>
                <SelectTrigger data-testid="select-quick-add-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail_liquor">Retail Liquor Store</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="private_club">Private Club</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              A customer number will be auto-generated. You can update contact details, address, and other info later in the B2B admin.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddOpen(false)} data-testid="button-quick-add-cancel">Cancel</Button>
            <Button
              onClick={() => {
                if (quickAddMapId && quickAddName.trim()) {
                  quickAddCustomerMutation.mutate({ qbCustomerMapId: quickAddMapId, accountName: quickAddName, customerType: quickAddType });
                }
              }}
              disabled={quickAddCustomerMutation.isPending || !quickAddName.trim()}
              data-testid="button-quick-add-save"
            >
              {quickAddCustomerMutation.isPending ? "Creating..." : "Create & Map"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeTab === "items" && status?.connected && (
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Product Mappings</CardTitle>
                <CardDescription>
                  Map QuickBooks/EKOS items to your product catalog. EKOS products are the same as your retail products (same Merlot, different warehouse).
                </CardDescription>
              </div>
              <Button onClick={() => syncItemsMutation.mutate()} disabled={syncItemsMutation.isPending} data-testid="button-sync-items">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncItemsMutation.isPending ? "animate-spin" : ""}`} />
                {syncItemsMutation.isPending ? "Syncing..." : "Pull Items from QB"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!itemMappings || itemMappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No items synced yet. Click "Pull Items from QB" to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itemMappings.map(mapping => (
                  <div
                    key={mapping.id}
                    className={`flex items-center gap-3 p-3 rounded-md border text-sm ${
                      mapping.isIgnored ? "opacity-50" : mapping.productId ? "border-green-500/20 bg-green-500/5" : "border-destructive/20 bg-destructive/5"
                    }`}
                    data-testid={`item-mapping-${mapping.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{mapping.qbItemName}</p>
                      <p className="text-xs text-muted-foreground">QB ID: {mapping.qbItemId}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="w-64 flex-shrink-0">
                      <Select
                        value={mapping.productId || "unmatched"}
                        onValueChange={(val) => updateItemMapping.mutate({ id: mapping.id, productId: val === "unmatched" ? null : val })}
                      >
                        <SelectTrigger data-testid={`select-item-${mapping.id}`}>
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmatched">-- Not Mapped --</SelectItem>
                          {productOptions?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleItemIgnore.mutate({ id: mapping.id, isIgnored: !mapping.isIgnored })}
                      title={mapping.isIgnored ? "Show" : "Ignore"}
                      data-testid={`button-ignore-item-${mapping.id}`}
                    >
                      {mapping.isIgnored ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    {mapping.isAutoMatched && (
                      <Badge variant="secondary" className="text-xs">Auto</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>EKOS Description Mappings</CardTitle>
                <CardDescription>
                  Map invoice line descriptions (e.g. "Cabernet Sauvignon (Single - 750ml - Bottle)") to your products. This is how EKOS identifies specific products on invoices.
                </CardDescription>
              </div>
              <Button onClick={() => syncDescriptionsMutation.mutate()} disabled={syncDescriptionsMutation.isPending} data-testid="button-sync-descriptions">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncDescriptionsMutation.isPending ? "animate-spin" : ""}`} />
                {syncDescriptionsMutation.isPending ? "Scanning..." : "Pull Descriptions from Invoices"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!descMappings || descMappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No descriptions found yet. Click "Pull Descriptions from Invoices" to scan EKOS invoices.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <span>{descMappings.filter(m => m.productId).length} mapped</span>
                  <span>{descMappings.filter(m => !m.productId && !m.isIgnored).length} unmapped</span>
                  <span>{descMappings.filter(m => m.isIgnored).length} ignored</span>
                </div>
                {descMappings
                  .filter(m => showIgnored || !m.isIgnored)
                  .sort((a, b) => {
                    if (!a.productId && !a.isIgnored && (b.productId || b.isIgnored)) return -1;
                    if ((a.productId || a.isIgnored) && !b.productId && !b.isIgnored) return 1;
                    return (a.parsedName || a.description).localeCompare(b.parsedName || b.description);
                  })
                  .map(mapping => (
                  <div
                    key={mapping.id}
                    className={`flex items-center gap-3 p-3 rounded-md border text-sm ${
                      mapping.isIgnored ? "opacity-50" : mapping.productId ? "border-green-500/20 bg-green-500/5" : "border-destructive/20 bg-destructive/5"
                    }`}
                    data-testid={`desc-mapping-${mapping.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{mapping.parsedName || mapping.description}</p>
                      <p className="text-xs text-muted-foreground truncate">{mapping.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="w-64 flex-shrink-0">
                      <Select
                        value={mapping.productId || "unmatched"}
                        onValueChange={(val) => updateDescMapping.mutate({ id: mapping.id, productId: val === "unmatched" ? null : val })}
                      >
                        <SelectTrigger data-testid={`select-desc-${mapping.id}`}>
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmatched">-- Not Mapped --</SelectItem>
                          {productOptions?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!mapping.productId && !mapping.isIgnored && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openToastSearch(mapping.id, mapping.parsedName || mapping.description)}
                        title="Search Toast POS for this product"
                        data-testid={`button-toast-search-${mapping.id}`}
                      >
                        <Search className="w-3.5 h-3.5 mr-1.5" />
                        Toast
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleDescIgnore.mutate({ id: mapping.id, isIgnored: !mapping.isIgnored })}
                      title={mapping.isIgnored ? "Show" : "Ignore"}
                      data-testid={`button-ignore-desc-${mapping.id}`}
                    >
                      {mapping.isIgnored ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    {mapping.isAutoMatched && (
                      <Badge variant="secondary" className="text-xs">Auto</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* Toast Search & Import Dialog */}
      <Dialog open={toastSearchOpen} onOpenChange={setToastSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Search Toast POS</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Searching for: <span className="font-medium text-foreground">{toastSearchDescName}</span>
          </p>
          <div className="flex gap-2">
            <Input
              value={toastSearchQuery}
              onChange={(e) => setToastSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchToast(toastSearchQuery)}
              placeholder="Search Toast menu items..."
              data-testid="input-toast-search"
            />
            <Button onClick={() => searchToast(toastSearchQuery)} disabled={toastSearchLoading} data-testid="button-toast-search-go">
              <Search className={`w-4 h-4 ${toastSearchLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {toastSearchResults.length === 0 && !toastSearchLoading && toastSearchQuery.length >= 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">No Toast items found for "{toastSearchQuery}"</p>
            )}
            {toastSearchResults.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-md border text-sm" data-testid={`toast-result-${idx}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} {item.type ? `(${item.type})` : ""}</p>
                </div>
                <Select value={toastResultCategories[idx] || "wine"} onValueChange={(val) => setToastResultCategories(prev => ({ ...prev, [idx]: val }))}>
                  <SelectTrigger className="w-36" data-testid={`select-toast-category-${idx}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wine">Wine</SelectItem>
                    <SelectItem value="spirits">Spirits</SelectItem>
                    <SelectItem value="beer">Beer</SelectItem>
                    <SelectItem value="canned_cocktail">Canned Cocktail</SelectItem>
                    <SelectItem value="canned_wine">Canned Wine</SelectItem>
                    <SelectItem value="cider">Cider</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => toastImportMutation.mutate({
                    toastName: item.name,
                    toastPrice: item.price,
                    category: toastResultCategories[idx] || "wine",
                    descriptionMapId: toastSearchDescId,
                  })}
                  disabled={toastImportMutation.isPending}
                  data-testid={`button-toast-import-${idx}`}
                >
                  Import & Map
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {activeTab === "sync" && status?.connected && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import EKOS Invoices</CardTitle>
              <CardDescription>
                Preview invoices from QuickBooks, check for duplicates, then import as wholesale orders.
                {unmappedCustomers > 0 && (
                  <span className="block mt-1 text-destructive">{unmappedCustomers} unmapped customer(s) - map them first in the Customers tab.</span>
                )}
                {unmappedItems > 0 && (
                  <span className="block mt-1 text-destructive">{unmappedItems} unmapped product(s) - map them first in the Products tab.</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Start Date</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-44" data-testid="input-start-date" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">End Date (optional)</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-44" data-testid="input-end-date" />
                </div>
                <Button
                  variant="outline"
                  onClick={() => { setPreviewData(null); previewMutation.mutate(); }}
                  disabled={previewMutation.isPending}
                  data-testid="button-preview-invoices"
                >
                  <Search className={`w-4 h-4 mr-2 ${previewMutation.isPending ? "animate-spin" : ""}`} />
                  {previewMutation.isPending ? "Scanning..." : "Preview Invoices"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ekos-filter"
                  checked={ekosOnly}
                  onCheckedChange={(checked) => setEkosOnly(checked === true)}
                  data-testid="checkbox-ekos-filter"
                />
                <label htmlFor="ekos-filter" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  Only import EKOS invoices (invoice numbers starting with "E")
                </label>
              </div>
            </CardContent>
          </Card>

          {previewData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Preview Results</CardTitle>
                    <CardDescription>
                      {previewData.summary.total} invoices found. Review the list below and select which to import.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => importMutation.mutate()}
                    disabled={importMutation.isPending || selectedIds.size === 0}
                    data-testid="button-import-selected"
                  >
                    <FileText className={`w-4 h-4 mr-2 ${importMutation.isPending ? "animate-spin" : ""}`} />
                    {importMutation.isPending ? "Importing..." : `Import ${selectedIds.size} Selected`}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 flex-wrap text-sm">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {previewData.summary.ready} Ready
                  </Badge>
                  {previewData.summary.duplicateDetected > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Copy className="w-3 h-3 text-amber-500" />
                      {previewData.summary.duplicateDetected} Duplicates
                    </Badge>
                  )}
                  {previewData.summary.alreadyImported > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-500" />
                      {previewData.summary.alreadyImported} Already Imported
                    </Badge>
                  )}
                  {previewData.summary.unmappedCustomer > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Users className="w-3 h-3 text-destructive" />
                      {previewData.summary.unmappedCustomer} Unmapped Customer
                    </Badge>
                  )}
                  {previewData.summary.unmappedItems > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Package className="w-3 h-3 text-destructive" />
                      {previewData.summary.unmappedItems} Unmapped Items
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {previewData.invoices.map(inv => {
                    const isSelectable = inv.status === "ready" || inv.status === "duplicate_detected";
                    const isSelected = selectedIds.has(inv.qbInvoiceId);

                    return (
                      <div
                        key={inv.qbInvoiceId}
                        className={`flex items-start gap-3 p-3 rounded-md border text-sm ${
                          inv.status === "ready" ? "border-green-500/20 bg-green-500/5" :
                          inv.status === "duplicate_detected" ? "border-amber-500/20 bg-amber-500/5" :
                          inv.status === "already_imported" ? "border-blue-500/20 bg-blue-500/5" :
                          "border-destructive/20 bg-destructive/5"
                        }`}
                        data-testid={`preview-invoice-${inv.docNumber || inv.qbInvoiceId}`}
                      >
                        {isSelectable && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleInvoiceSelection(inv.qbInvoiceId)}
                            className="mt-0.5"
                            data-testid={`checkbox-invoice-${inv.docNumber}`}
                          />
                        )}
                        <div className="flex-shrink-0 mt-0.5">
                          {statusIcon(inv.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">#{inv.docNumber || inv.qbInvoiceId}</span>
                            <span className="text-muted-foreground">{inv.customerName}</span>
                            <span className="text-muted-foreground">{inv.date}</span>
                            <span className="font-medium">${inv.total.toFixed(2)}</span>
                            <Badge variant="secondary" className="text-xs">{inv.lineCount} items</Badge>
                          </div>
                          <div className="mt-1">
                            <Badge variant={inv.status === "ready" ? "outline" : "secondary"} className="text-xs">
                              {statusLabel(inv.status)}
                            </Badge>
                          </div>
                          {inv.duplicateReason && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              {inv.duplicateReason}
                            </p>
                          )}
                          {inv.itemIssues.length > 0 && (
                            <p className="text-xs text-destructive mt-1">
                              {inv.itemIssues.join("; ")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {previewData.invoices.length === 0 && (
                  <p className="text-center py-6 text-muted-foreground">No invoices found for the selected date range and filters.</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>Recent import activity</CardDescription>
            </CardHeader>
            <CardContent>
              {!syncHistory || syncHistory.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No syncs performed yet.</p>
              ) : (
                <div className="space-y-3">
                  {syncHistory.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-md border text-sm" data-testid={`sync-log-${log.id}`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {log.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : log.status === "running" ? (
                          <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium capitalize">{log.syncType}</span>
                          <span className="text-muted-foreground">{new Date(log.startedAt).toLocaleString()}</span>
                        </div>
                        {(log.syncType === "invoices" || log.syncType === "payments") && (
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Processed: {log.invoicesProcessed}</span>
                            <span className="text-green-600">{log.syncType === "payments" ? "Applied" : "Created"}: {log.invoicesCreated}</span>
                            <span>Skipped: {log.invoicesSkipped}</span>
                            {(log.invoicesFailed || 0) > 0 && <span className="text-destructive">Failed: {log.invoicesFailed}</span>}
                          </div>
                        )}
                        {log.errorDetails && (
                          <details className="mt-2">
                            <summary className="text-xs text-destructive cursor-pointer">View errors</summary>
                            <pre className="text-xs mt-1 p-2 rounded bg-muted whitespace-pre-wrap">{log.errorDetails}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "payments" && status?.connected && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Sync Payments from QuickBooks
              </CardTitle>
              <CardDescription>
                Match QuickBooks payments to imported EKOS invoices to mark B2B orders as paid. This unlocks commission payouts for sales reps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={pmtStartDate}
                    onChange={e => setPmtStartDate(e.target.value)}
                    data-testid="input-pmt-start-date"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <Input
                    type="date"
                    value={pmtEndDate}
                    onChange={e => setPmtEndDate(e.target.value)}
                    data-testid="input-pmt-end-date"
                  />
                </div>
                <Button
                  onClick={() => paymentPreviewMutation.mutate()}
                  disabled={paymentPreviewMutation.isPending}
                  data-testid="button-preview-payments"
                >
                  {paymentPreviewMutation.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Scanning...</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-2" /> Preview Payments</>
                  )}
                </Button>
              </div>

              <div className="p-3 rounded-md bg-muted/50 text-sm space-y-1">
                <p className="font-medium">How Payment Sync Works:</p>
                <p className="text-muted-foreground">1. Fetches payments from QuickBooks for the selected date range</p>
                <p className="text-muted-foreground">2. Matches them to imported EKOS invoices (via Invoice Import tab)</p>
                <p className="text-muted-foreground">3. Marks matched B2B orders as paid and updates commission status to "earned"</p>
                <p className="text-muted-foreground">4. Earned commissions become available for payroll/payout</p>
              </div>
            </CardContent>
          </Card>

          {paymentPreview && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle>Payment Preview</CardTitle>
                  <Button
                    onClick={() => paymentImportMutation.mutate()}
                    disabled={paymentImportMutation.isPending || selectedPaymentIds.size === 0}
                    data-testid="button-apply-payments"
                  >
                    {paymentImportMutation.isPending ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Applying...</>
                    ) : (
                      <><DollarSign className="w-4 h-4 mr-2" /> Apply {selectedPaymentIds.size} Payment{selectedPaymentIds.size !== 1 ? "s" : ""}</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    {paymentPreview.summary.total} Total
                  </Badge>
                  {paymentPreview.summary.ready > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {paymentPreview.summary.ready} Ready
                    </Badge>
                  )}
                  {paymentPreview.summary.alreadyImported > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-500" />
                      {paymentPreview.summary.alreadyImported} Already Applied
                    </Badge>
                  )}
                  {paymentPreview.summary.unmappedInvoices > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="w-3 h-3 text-destructive" />
                      {paymentPreview.summary.unmappedInvoices} Invoices Not Imported
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {paymentPreview.payments.map(pmt => {
                    const isSelectable = pmt.status === "ready" || pmt.status === "partial_match";
                    const isSelected = selectedPaymentIds.has(pmt.qbPaymentId);

                    return (
                      <div
                        key={pmt.qbPaymentId}
                        className={`flex items-start gap-3 p-3 rounded-md border text-sm ${
                          pmt.status === "ready" ? "border-green-500/20 bg-green-500/5" :
                          pmt.status === "partial_match" ? "border-amber-500/20 bg-amber-500/5" :
                          pmt.status === "already_imported" ? "border-blue-500/20 bg-blue-500/5" :
                          "border-destructive/20 bg-destructive/5"
                        }`}
                        data-testid={`preview-payment-${pmt.qbPaymentId}`}
                      >
                        {isSelectable && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePaymentSelection(pmt.qbPaymentId)}
                            className="mt-0.5"
                            data-testid={`checkbox-payment-${pmt.qbPaymentId}`}
                          />
                        )}
                        <div className="flex-shrink-0 mt-0.5">
                          {paymentStatusIcon(pmt.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">${pmt.totalAmt.toFixed(2)}</span>
                            <span className="text-muted-foreground">{pmt.customerName}</span>
                            <span className="text-muted-foreground">{pmt.txnDate}</span>
                            {pmt.paymentMethod && (
                              <Badge variant="secondary" className="text-xs">{pmt.paymentMethod}</Badge>
                            )}
                            {pmt.paymentRefNum && (
                              <span className="text-xs text-muted-foreground">Ref: {pmt.paymentRefNum}</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <Badge variant={pmt.status === "ready" ? "outline" : "secondary"} className="text-xs">
                              {paymentStatusLabel(pmt.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {pmt.linkedInvoices.length} linked invoice{pmt.linkedInvoices.length !== 1 ? "s" : ""}
                              {pmt.linkedInvoices.filter(li => li.mapped).length > 0 && (
                                <> ({pmt.linkedInvoices.filter(li => li.mapped).length} matched)</>
                              )}
                            </span>
                          </div>
                          {pmt.linkedInvoices.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {pmt.linkedInvoices.map((li, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  {li.mapped ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-destructive" />
                                  )}
                                  <span>Invoice #{li.qbDocNumber || li.qbInvoiceId}</span>
                                  <span className="text-muted-foreground">${li.amountApplied.toFixed(2)}</span>
                                  {!li.mapped && <span className="text-destructive">(not imported)</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {pmt.statusReason && pmt.status !== "ready" && (
                            <p className="text-xs text-muted-foreground mt-1">{pmt.statusReason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {paymentPreview.payments.length === 0 && (
                  <p className="text-center py-6 text-muted-foreground">No payments found for the selected date range.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!status?.connected && activeTab !== "connection" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2Off className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Connect to QuickBooks first to access this feature.</p>
            <Button className="mt-4" onClick={() => setActiveTab("connection")} data-testid="button-go-to-connection">
              Go to Connection
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
