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
  ShieldCheck, Copy, CircleSlash, HelpCircle
} from "lucide-react";

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

type TabType = "connection" | "customers" | "items" | "sync";

export default function QuickBooksSync() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("connection");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("");
  const [ekosOnly, setEkosOnly] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    mutationFn: () => apiRequest("POST", "/api/quickbooks/customers/sync"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/customers"] });
      toast({ title: "Customers Synced", description: `Found ${data.total} customers. ${data.newMapped} auto-matched.` });
    },
    onError: (err: any) => toast({ title: "Sync Failed", description: err.message, variant: "destructive" }),
  });

  const syncItemsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/quickbooks/items/sync"),
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
      return res as unknown as PreviewResult;
    },
    onSuccess: (data: PreviewResult) => {
      setPreviewData(data);
      const readyIds = new Set(data.invoices.filter(i => i.status === "ready").map(i => i.qbInvoiceId));
      setSelectedIds(readyIds);
    },
    onError: (err: any) => toast({ title: "Preview Failed", description: err.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/quickbooks/sync/invoices", {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      docNumberPrefix: ekosOnly ? "E" : "",
      selectedInvoiceIds: Array.from(selectedIds),
    }),
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

  const tabs: { key: TabType; label: string; icon: typeof Link2 }[] = [
    { key: "connection", label: "Connection", icon: Link2 },
    { key: "customers", label: "Customers", icon: Users },
    { key: "items", label: "Products", icon: Package },
    { key: "sync", label: "Import Invoices", icon: FileText },
  ];

  const unmappedCustomers = customerMappings?.filter(m => !m.b2bCustomerId && !m.isIgnored).length || 0;
  const unmappedItems = itemMappings?.filter(m => !m.productId && !m.isIgnored).length || 0;

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
            {tab.key === "items" && unmappedItems > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">{unmappedItems}</Badge>
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
                <CardDescription>Map QuickBooks customers to your B2B wholesale accounts</CardDescription>
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
              <div className="space-y-2">
                {customerMappings.map(mapping => (
                  <div
                    key={mapping.id}
                    className={`flex items-center gap-3 p-3 rounded-md border text-sm ${
                      mapping.isIgnored ? "opacity-50" : mapping.b2bCustomerId ? "border-green-500/20 bg-green-500/5" : "border-destructive/20 bg-destructive/5"
                    }`}
                    data-testid={`customer-mapping-${mapping.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{mapping.qbCustomerName}</p>
                      <p className="text-xs text-muted-foreground">QB ID: {mapping.qbCustomerId}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="w-64 flex-shrink-0">
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleCustomerIgnore.mutate({ id: mapping.id, isIgnored: !mapping.isIgnored })}
                      title={mapping.isIgnored ? "Show" : "Ignore"}
                      data-testid={`button-ignore-customer-${mapping.id}`}
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
      )}

      {activeTab === "items" && status?.connected && (
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
      )}

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
                        {log.syncType === "invoices" && (
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Processed: {log.invoicesProcessed}</span>
                            <span className="text-green-600">Created: {log.invoicesCreated}</span>
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
