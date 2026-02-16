import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Building2,
  Upload,
  Download,
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  Eye,
  Pencil,
  Loader2,
  ArrowRight,
  X,
} from "lucide-react";

type Contract = {
  id: number;
  name: string;
  category: string;
  vendor: string;
  description: string | null;
  startDate: string | null;
  expirationDate: string | null;
  start_date?: string | null;
  expiration_date?: string | null;
  renewalTerms: string | null;
  renewal_terms?: string | null;
  amount: string | null;
  paymentFrequency: string | null;
  payment_frequency?: string | null;
  status: "active" | "expiring_soon" | "expired" | "renewed" | "cancelled";
  renewedFromId: number | null;
  renewed_from_id?: number | null;
  notes: string | null;
  notificationsSent: string | null;
  notifications_sent?: string | null;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  responsibles: Array<{
    id: number;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  notificationSchedule: string | null;
  notification_schedule?: string | null;
  document_count: number | string;
};

type ContractDocument = {
  id: number;
  contractId: number;
  fileName: string;
  objectPath: string;
  fileSize: number | null;
  mimeType: string | null;
  isCurrent: boolean;
  uploadedById: string | null;
  uploadedByName: string | null;
  extractedData: string | null;
  aiSummary: string | null;
  createdAt: string;
  created_at?: string;
  file_name?: string;
  object_path?: string;
  file_size?: number | null;
  mime_type?: string | null;
  is_current?: boolean;
  uploaded_by_id?: string | null;
  uploaded_by_name?: string | null;
  extracted_data?: string | null;
  ai_summary?: string | null;
};

type Category = { value: string; label: string };
type PlatformUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  first_name?: string;
  last_name?: string;
};

function getField<T>(obj: any, camel: string, snake: string): T {
  return obj[camel] !== undefined ? obj[camel] : obj[snake];
}

const contractFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  vendor: z.string().min(1, "Vendor is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  expirationDate: z.string().optional(),
  amount: z.string().optional(),
  paymentFrequency: z.string().optional(),
  renewalTerms: z.string().optional(),
  notificationSchedule: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  active: {
    label: "Active",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: CheckCircle,
  },
  expiring_soon: {
    label: "Expiring Soon",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    icon: AlertTriangle,
  },
  expired: {
    label: "Expired",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: XCircle,
  },
  renewed: {
    label: "Renewed",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: RefreshCw,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    icon: XCircle,
  },
};

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annually", label: "Semi-Annually" },
  { value: "annually", label: "Annually" },
  { value: "one-time", label: "One-Time" },
];

const NOTIFICATION_SCHEDULE_OPTIONS = [
  { value: "90,60,45,30,15,7", label: "All Reminders (90, 60, 45, 30, 15, 7 days)" },
  { value: "60,45,30,15", label: "Standard (60, 45, 30, 15 days)" },
  { value: "30,15,7", label: "Short Notice (30, 15, 7 days)" },
  { value: "60,30", label: "Minimal (60, 30 days)" },
  { value: "30", label: "30 Days Only" },
  { value: "none", label: "No Notifications" },
];

function formatCurrency(amount: string | null): string {
  if (!amount) return "-";
  const num = parseFloat(amount);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={`${config.className} border-transparent no-default-hover-elevate gap-1`}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function CategoryBadge({ category, categories }: { category: string; categories: Category[] }) {
  const cat = categories.find((c) => c.value === category);
  return (
    <Badge variant="secondary" className="no-default-hover-elevate" data-testid={`badge-category-${category}`}>
      {cat?.label || category}
    </Badge>
  );
}

export default function ContractsDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewingContract, setRenewingContract] = useState<Contract | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [renewUserIds, setRenewUserIds] = useState<string[]>([]);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractingDocId, setExtractingDocId] = useState<number | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    objectPath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/contracts/categories"],
  });

  const { data: users = [] } = useQuery<PlatformUser[]>({
    queryKey: ["/api/contracts/users"],
  });

  const { data: documents = [], refetch: refetchDocs } = useQuery<ContractDocument[]>({
    queryKey: ["/api/contracts", selectedContract?.id, "documents"],
    enabled: !!selectedContract?.id,
  });

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.vendor.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [contracts, statusFilter, categoryFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter((c) => c.status === "active").length;
    const expiringSoon = contracts.filter((c) => c.status === "expiring_soon").length;
    const expired = contracts.filter((c) => c.status === "expired").length;
    return { total, active, expiringSoon, expired };
  }, [contracts]);

  const createMutation = useMutation({
    mutationFn: async (data: ContractFormValues & { responsibleUserIds: string[] }) => {
      const res = await apiRequest("POST", "/api/contracts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract created successfully" });
      setFormOpen(false);
      setSelectedUserIds([]);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create contract", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: ContractFormValues & { responsibleUserIds: string[] };
    }) => {
      const res = await apiRequest("PATCH", `/api/contracts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract updated successfully" });
      setFormOpen(false);
      setEditingContract(null);
      setSelectedUserIds([]);
      if (selectedContract) {
        queryClient.invalidateQueries({
          queryKey: ["/api/contracts", selectedContract.id],
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update contract", description: err.message, variant: "destructive" });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { newContractData: ContractFormValues; responsibleUserIds: string[] };
    }) => {
      const res = await apiRequest("POST", `/api/contracts/${id}/renew`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract renewed successfully" });
      setRenewOpen(false);
      setRenewingContract(null);
      setRenewUserIds([]);
      setDetailOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to renew contract", description: err.message, variant: "destructive" });
    },
  });

  const extractMutation = useMutation({
    mutationFn: async (docId: number) => {
      const res = await apiRequest("POST", `/api/contracts/documents/${docId}/extract`);
      return res.json();
    },
    onSuccess: (data) => {
      setExtractedData(data.extractedData);
      setExtractingDocId(null);
      refetchDocs();
      toast({ title: "AI extraction complete" });
    },
    onError: (err: Error) => {
      setExtractingDocId(null);
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    },
  });

  const uploadDocument = useCallback(
    async (file: File, contractId: number) => {
      try {
        const urlRes = await apiRequest("POST", "/api/contracts/upload-url");
        const { uploadUrl, objectPath } = await urlRes.json();

        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        const docRes = await apiRequest("POST", `/api/contracts/${contractId}/documents`, {
          fileName: file.name,
          objectPath,
          fileSize: file.size,
          mimeType: file.type,
          uploadedById: null,
          uploadedByName: null,
        });
        const doc = await docRes.json();
        refetchDocs();
        toast({ title: "Document uploaded successfully" });
        return doc;
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        return null;
      }
    },
    [toast, refetchDocs]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContract) return;
    await uploadDocument(file, selectedContract.id);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadDocument = async (contractId: number, docId: number) => {
    try {
      const res = await apiRequest("GET", `/api/contracts/${contractId}/documents/${docId}/download-url`);
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, "_blank");
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const openDetail = (contract: Contract) => {
    setSelectedContract(contract);
    setDetailOpen(true);
    setExtractedData(null);
  };

  const openCreate = () => {
    setEditingContract(null);
    setSelectedUserIds([]);
    setPendingUpload(null);
    setFormOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditingContract(contract);
    setSelectedUserIds(
      (contract.responsibles || []).map((r) => r.userId)
    );
    setFormOpen(true);
  };

  const openRenew = (contract: Contract) => {
    setRenewingContract(contract);
    setRenewUserIds(
      (contract.responsibles || []).map((r) => r.userId)
    );
    setRenewOpen(true);
  };

  const applyExtractedData = (data: any) => {
    if (!selectedContract) return;
    const updateData: any = {};
    if (data.vendor) updateData.vendor = data.vendor;
    if (data.contractName) updateData.name = data.contractName;
    if (data.description) updateData.description = data.description;
    if (data.startDate) updateData.startDate = data.startDate;
    if (data.expirationDate) updateData.expirationDate = data.expirationDate;
    if (data.amount) updateData.amount = String(data.amount);
    if (data.paymentFrequency) updateData.paymentFrequency = data.paymentFrequency;
    if (data.renewalTerms) updateData.renewalTerms = data.renewalTerms;

    updateMutation.mutate({
      id: selectedContract.id,
      data: { ...updateData, responsibleUserIds: (selectedContract.responsibles || []).map((r) => r.userId) },
    });
    setExtractedData(null);
  };

  const getUserName = (user: PlatformUser) => {
    const first = user.firstName || user.first_name || "";
    const last = user.lastName || user.last_name || "";
    return `${first} ${last}`.trim() || user.email;
  };

  const toggleUserId = (list: string[], setList: (v: string[]) => void, id: string) => {
    if (list.includes(id)) {
      setList(list.filter((uid) => uid !== id));
    } else {
      setList([...list, id]);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Contract Tracking
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all vendor contracts
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-contract">
          <Plus className="w-4 h-4" />
          Add Contract
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-stat-total">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-stat-active">
              {stats.active}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Expiring Soon</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-stat-expiring">
              {stats.expiringSoon}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Expired</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="text-stat-expired">
              {stats.expired}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="renewed">Renewed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {contractsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No contracts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract) => (
            <Card
              key={contract.id}
              className="hover-elevate cursor-pointer"
              onClick={() => openDetail(contract)}
              data-testid={`card-contract-${contract.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 pb-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold truncate" data-testid={`text-contract-name-${contract.id}`}>
                    {contract.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{contract.vendor}</span>
                  </p>
                </div>
                <StatusBadge status={contract.status} />
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryBadge category={contract.category} categories={categories} />
                  {Number(contract.document_count) > 0 && (
                    <Badge variant="outline" className="no-default-hover-elevate gap-1">
                      <FileText className="w-3 h-3" />
                      {contract.document_count}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(getField<string | null>(contract, "expirationDate", "expiration_date"))}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(contract.amount)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContractDetailDialog
        contract={selectedContract}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedContract(null);
            setExtractedData(null);
          }
        }}
        categories={categories}
        documents={documents}
        contracts={contracts}
        onEdit={() => {
          if (selectedContract) {
            setDetailOpen(false);
            openEdit(selectedContract);
          }
        }}
        onRenew={() => {
          if (selectedContract) {
            setDetailOpen(false);
            openRenew(selectedContract);
          }
        }}
        onUpload={() => fileInputRef.current?.click()}
        onDownload={downloadDocument}
        onExtract={(docId) => {
          setExtractingDocId(docId);
          extractMutation.mutate(docId);
        }}
        extractingDocId={extractingDocId}
        extractedData={extractedData}
        onApplyExtracted={applyExtractedData}
        onDismissExtracted={() => setExtractedData(null)}
        onViewContract={(id) => {
          const c = contracts.find((cc) => cc.id === id);
          if (c) openDetail(c);
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-file-upload"
      />

      <ContractFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingContract(null);
            setSelectedUserIds([]);
          }
        }}
        contract={editingContract}
        categories={categories}
        users={users}
        selectedUserIds={selectedUserIds}
        onToggleUser={(id) => toggleUserId(selectedUserIds, setSelectedUserIds, id)}
        onSubmit={async (values, uploadInfo) => {
          if (editingContract) {
            updateMutation.mutate({
              id: editingContract.id,
              data: { ...values, responsibleUserIds: selectedUserIds },
            });
          } else {
            try {
              const res = await apiRequest("POST", "/api/contracts", { ...values, responsibleUserIds: selectedUserIds });
              const newContract = await res.json();
              const uploadData = uploadInfo || pendingUpload;
              if (uploadData && newContract?.id) {
                try {
                  await apiRequest("POST", `/api/contracts/${newContract.id}/documents`, {
                    fileName: uploadData.fileName,
                    objectPath: uploadData.objectPath,
                    fileSize: uploadData.fileSize,
                    mimeType: uploadData.mimeType,
                    uploadedById: null,
                    uploadedByName: null,
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/contracts", newContract.id, "documents"] });
                } catch (docErr: any) {
                  console.error("Failed to attach document:", docErr);
                  toast({ title: "Contract created but document attachment failed", description: docErr.message, variant: "destructive" });
                }
              }
              queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
              toast({ title: "Contract created successfully" });
              setFormOpen(false);
              setSelectedUserIds([]);
              setPendingUpload(null);
            } catch (err: any) {
              toast({ title: "Failed to create contract", description: err.message, variant: "destructive" });
            }
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <RenewDialog
        open={renewOpen}
        onOpenChange={(open) => {
          setRenewOpen(open);
          if (!open) {
            setRenewingContract(null);
            setRenewUserIds([]);
          }
        }}
        contract={renewingContract}
        categories={categories}
        users={users}
        selectedUserIds={renewUserIds}
        onToggleUser={(id) => toggleUserId(renewUserIds, setRenewUserIds, id)}
        onSubmit={(values) => {
          if (renewingContract) {
            renewMutation.mutate({
              id: renewingContract.id,
              data: { newContractData: values, responsibleUserIds: renewUserIds },
            });
          }
        }}
        isPending={renewMutation.isPending}
      />
    </div>
  );
}

function ContractDetailDialog({
  contract,
  open,
  onOpenChange,
  categories,
  documents,
  contracts,
  onEdit,
  onRenew,
  onUpload,
  onDownload,
  onExtract,
  extractingDocId,
  extractedData,
  onApplyExtracted,
  onDismissExtracted,
  onViewContract,
}: {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  documents: ContractDocument[];
  contracts: Contract[];
  onEdit: () => void;
  onRenew: () => void;
  onUpload: () => void;
  onDownload: (contractId: number, docId: number) => void;
  onExtract: (docId: number) => void;
  extractingDocId: number | null;
  extractedData: any;
  onApplyExtracted: (data: any) => void;
  onDismissExtracted: () => void;
  onViewContract: (id: number) => void;
}) {
  if (!contract) return null;

  const renewedFromId = getField<number | null>(contract, "renewedFromId", "renewed_from_id");
  const previousContract = renewedFromId ? contracts.find((c) => c.id === renewedFromId) : null;
  const canRenew = contract.status === "active" || contract.status === "expiring_soon";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <DialogTitle data-testid="text-detail-name">{contract.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3" />
                {contract.vendor}
              </DialogDescription>
            </div>
            <StatusBadge status={contract.status} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {previousContract && (
            <div
              className="text-sm flex items-center gap-2 p-2 rounded-md bg-muted cursor-pointer"
              onClick={() => onViewContract(previousContract.id)}
              data-testid="link-previous-contract"
            >
              <RefreshCw className="w-3 h-3" />
              Renewed from: <span className="font-medium underline">{previousContract.name}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Category</span>
              <div className="mt-0.5">
                <CategoryBadge category={contract.category} categories={categories} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Amount</span>
              <p className="font-medium" data-testid="text-detail-amount">
                {formatCurrency(contract.amount)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Start Date</span>
              <p>{formatDate(getField<string | null>(contract, "startDate", "start_date"))}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expiration Date</span>
              <p>{formatDate(getField<string | null>(contract, "expirationDate", "expiration_date"))}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Payment Frequency</span>
              <p className="capitalize">
                {getField<string | null>(contract, "paymentFrequency", "payment_frequency") || "-"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Renewal Terms</span>
              <p>{getField<string | null>(contract, "renewalTerms", "renewal_terms") || "-"}</p>
            </div>
          </div>

          {contract.description && (
            <div className="text-sm">
              <span className="text-muted-foreground">Description</span>
              <p className="mt-0.5">{contract.description}</p>
            </div>
          )}

          {contract.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes</span>
              <p className="mt-0.5">{contract.notes}</p>
            </div>
          )}

          {contract.responsibles && contract.responsibles.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground flex items-center gap-1 mb-1">
                <Users className="w-3 h-3" />
                Responsible Users
              </span>
              <div className="flex flex-wrap gap-1">
                {contract.responsibles.map((r) => (
                  <Badge key={r.id} variant="outline" className="no-default-hover-elevate">
                    {r.firstName} {r.lastName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span className="text-sm font-medium flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Documents ({documents.length})
              </span>
              <Button size="sm" variant="outline" onClick={onUpload} data-testid="button-upload-document">
                <Upload className="w-4 h-4" />
                Upload Document
              </Button>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const fileName = getField<string>(doc, "fileName", "file_name");
                  const uploadedBy = getField<string | null>(doc, "uploadedByName", "uploaded_by_name");
                  const createdAt = getField<string>(doc, "createdAt", "created_at");
                  const isCurrent = getField<boolean>(doc, "isCurrent", "is_current");
                  const docExtracted = getField<string | null>(doc, "extractedData", "extracted_data");

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted text-sm flex-wrap"
                      data-testid={`doc-row-${doc.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(createdAt)}
                            {uploadedBy && ` by ${uploadedBy}`}
                            {isCurrent && " (current)"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDownload(contract.id, doc.id)}
                          data-testid={`button-download-${doc.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {!docExtracted && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onExtract(doc.id)}
                            disabled={extractingDocId === doc.id}
                            data-testid={`button-extract-${doc.id}`}
                          >
                            {extractingDocId === doc.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            Extract with AI
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {extractedData && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  AI Extracted Data
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => onApplyExtracted(extractedData)}
                    data-testid="button-apply-extracted"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Apply to Contract
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDismissExtracted}
                    data-testid="button-dismiss-extracted"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="bg-muted rounded-md p-3 text-sm space-y-2">
                {extractedData.summary && (
                  <div>
                    <span className="text-muted-foreground">Summary</span>
                    <p>{extractedData.summary}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {extractedData.vendor && (
                    <div>
                      <span className="text-muted-foreground">Vendor</span>
                      <p>{extractedData.vendor}</p>
                    </div>
                  )}
                  {extractedData.contractName && (
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <p>{extractedData.contractName}</p>
                    </div>
                  )}
                  {extractedData.amount && (
                    <div>
                      <span className="text-muted-foreground">Amount</span>
                      <p>{formatCurrency(String(extractedData.amount))}</p>
                    </div>
                  )}
                  {extractedData.paymentFrequency && (
                    <div>
                      <span className="text-muted-foreground">Payment Frequency</span>
                      <p className="capitalize">{extractedData.paymentFrequency}</p>
                    </div>
                  )}
                  {extractedData.startDate && (
                    <div>
                      <span className="text-muted-foreground">Start Date</span>
                      <p>{formatDate(extractedData.startDate)}</p>
                    </div>
                  )}
                  {extractedData.expirationDate && (
                    <div>
                      <span className="text-muted-foreground">Expiration Date</span>
                      <p>{formatDate(extractedData.expirationDate)}</p>
                    </div>
                  )}
                </div>
                {extractedData.renewalTerms && (
                  <div>
                    <span className="text-muted-foreground">Renewal Terms</span>
                    <p>{extractedData.renewalTerms}</p>
                  </div>
                )}
                {extractedData.keyTerms && extractedData.keyTerms.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Key Terms</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {extractedData.keyTerms.map((term: string, i: number) => (
                        <li key={i}>{term}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {canRenew && (
            <Button variant="outline" onClick={onRenew} data-testid="button-renew-contract">
              <RefreshCw className="w-4 h-4" />
              Renew Contract
            </Button>
          )}
          <Button variant="outline" onClick={onEdit} data-testid="button-edit-contract">
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  categories,
  users,
  selectedUserIds,
  onToggleUser,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  categories: Category[];
  users: PlatformUser[];
  selectedUserIds: string[];
  onToggleUser: (id: string) => void;
  onSubmit: (values: ContractFormValues, uploadInfo?: { objectPath: string; fileName: string; fileSize: number; mimeType: string } | null) => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const isEdit = !!contract;
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    objectPath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      name: "",
      vendor: "",
      category: "other",
      description: "",
      startDate: "",
      expirationDate: "",
      amount: "",
      paymentFrequency: "",
      renewalTerms: "",
      notificationSchedule: "60,45,30,15",
      notes: "",
      status: "active",
    },
  });

  const { reset } = form;

  useState(() => {
    if (contract) {
      reset({
        name: contract.name,
        vendor: contract.vendor,
        category: contract.category,
        description: contract.description || "",
        startDate: toDateInputValue(getField<string | null>(contract, "startDate", "start_date")),
        expirationDate: toDateInputValue(getField<string | null>(contract, "expirationDate", "expiration_date")),
        amount: contract.amount || "",
        paymentFrequency: getField<string | null>(contract, "paymentFrequency", "payment_frequency") || "",
        renewalTerms: getField<string | null>(contract, "renewalTerms", "renewal_terms") || "",
        notificationSchedule: getField<string | null>(contract, "notificationSchedule", "notification_schedule") || "60,45,30,15",
        notes: contract.notes || "",
        status: contract.status,
      });
      setStep(2);
    } else {
      reset({
        name: "",
        vendor: "",
        category: "other",
        description: "",
        startDate: "",
        expirationDate: "",
        amount: "",
        paymentFrequency: "",
        renewalTerms: "",
        notificationSchedule: "60,45,30,15",
        notes: "",
        status: "active",
      });
      setStep(1);
      setUploadedFileInfo(null);
      setExtractionResult(null);
    }
  });

  const handleUploadAndExtract = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await apiRequest("POST", "/api/contracts/upload-url");
      const { uploadUrl, objectPath } = await urlRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });

      const fileInfo = {
        objectPath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
      setUploadedFileInfo(fileInfo);
      setUploading(false);

      setExtracting(true);
      try {
        const extractRes = await apiRequest("POST", "/api/contracts/extract-from-path", {
          objectPath,
          fileName: file.name,
        });
        const { extractedData } = await extractRes.json();
        setExtractionResult(extractedData);
        setExtracting(false);

        setTimeout(() => {
          const formValues: any = {
            name: extractedData.contractName || "",
            vendor: extractedData.vendor || "",
            category: extractedData.category || "other",
            description: extractedData.description || "",
            startDate: extractedData.startDate || "",
            expirationDate: extractedData.expirationDate || "",
            amount: extractedData.amount ? String(extractedData.amount) : "",
            paymentFrequency: extractedData.paymentFrequency || "",
            renewalTerms: extractedData.renewalTerms || "",
            notificationSchedule: "60,45,30,15",
            notes: "",
            status: "active",
          };
          reset(formValues);
          setStep(2);
        }, 1500);
      } catch (err: any) {
        setExtracting(false);
        toast({ title: "AI extraction failed", description: err.message, variant: "destructive" });
        setStep(2);
      }
    } catch (err: any) {
      setUploading(false);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  }, [reset, toast]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUploadAndExtract(file);
  }, [handleUploadAndExtract]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadAndExtract(file);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }, [handleUploadAndExtract]);

  const getUserName = (user: PlatformUser) => {
    const first = user.firstName || user.first_name || "";
    const last = user.lastName || user.last_name || "";
    return `${first} ${last}`.trim() || user.email;
  };

  const getUserEmail = (user: PlatformUser) => user.email;

  const handleFormSubmit = async (values: ContractFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values, uploadedFileInfo);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = selectedUserIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Contract" : step === 1 ? "Add Contract" : "Add Contract"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update contract details"
              : step === 1
              ? "Upload a contract document for AI-assisted data entry, or enter details manually"
              : extractionResult
              ? "Review the AI-extracted data and make any corrections before saving"
              : "Fill in the contract details"}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && step === 1 && (
          <div className="space-y-4">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={handleFileInputChange}
              data-testid="input-upload-contract-file"
            />

            {!uploading && !extracting && !extractionResult && (
              <>
                <div
                  className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                  onClick={() => uploadInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  data-testid="dropzone-upload"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Drag and drop a contract PDF here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, or DOCX files supported
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t" />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep(2)}
                  data-testid="button-skip-upload"
                >
                  Skip - Enter Manually
                </Button>
              </>
            )}

            {uploading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading document...</p>
              </div>
            )}

            {extracting && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Sparkles className="w-8 h-8 animate-pulse text-primary" />
                <p className="text-sm text-muted-foreground">Extracting contract data with AI...</p>
              </div>
            )}

            {extractionResult && !extracting && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  AI extraction complete - loading form...
                </div>
                <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                  {extractionResult.contractName && (
                    <p><span className="text-muted-foreground">Name:</span> {extractionResult.contractName}</p>
                  )}
                  {extractionResult.vendor && (
                    <p><span className="text-muted-foreground">Vendor:</span> {extractionResult.vendor}</p>
                  )}
                  {extractionResult.amount && (
                    <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(String(extractionResult.amount))}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="space-y-3"
              data-testid="form-contract"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-vendor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isEdit && (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="renewed">Renewed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-expiration-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-frequency">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notificationSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Schedule</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "60,45,30,15"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-notification-schedule">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NOTIFICATION_SCHEDULE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="renewalTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renewal Terms</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-renewal-terms" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {uploadedFileInfo && !isEdit && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{uploadedFileInfo.fileName}</span>
                  <Badge variant="secondary" className="no-default-hover-elevate ml-auto shrink-0">
                    Attached
                  </Badge>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium">Responsible Users</label>
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="no-default-hover-elevate">
                      {selectedCount} selected
                    </Badge>
                  )}
                </div>
                <div className="mt-1 border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users available</p>
                  ) : (
                    users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover-elevate"
                        data-testid={`checkbox-user-${user.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => onToggleUser(user.id)}
                          className="rounded"
                        />
                        <div className="min-w-0">
                          <div className="truncate">{getUserName(user)}</div>
                          <div className="text-xs text-muted-foreground truncate">{getUserEmail(user)}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                {!isEdit && uploadedFileInfo && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep(1);
                      setUploadedFileInfo(null);
                      setExtractionResult(null);
                      reset({
                        name: "",
                        vendor: "",
                        category: "other",
                        description: "",
                        startDate: "",
                        expirationDate: "",
                        amount: "",
                        paymentFrequency: "",
                        renewalTerms: "",
                        notificationSchedule: "60,45,30,15",
                        notes: "",
                        status: "active",
                      });
                    }}
                    data-testid="button-back-to-upload"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || submitting} data-testid="button-save-contract">
                  {(isPending || submitting) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEdit ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RenewDialog({
  open,
  onOpenChange,
  contract,
  categories,
  users,
  selectedUserIds,
  onToggleUser,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  categories: Category[];
  users: PlatformUser[];
  selectedUserIds: string[];
  onToggleUser: (id: string) => void;
  onSubmit: (values: ContractFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      name: "",
      vendor: "",
      category: "other",
      description: "",
      startDate: "",
      expirationDate: "",
      amount: "",
      paymentFrequency: "",
      renewalTerms: "",
      notificationSchedule: "60,45,30,15",
      notes: "",
    },
  });

  const { reset } = form;

  useState(() => {
    if (contract) {
      reset({
        name: contract.name,
        vendor: contract.vendor,
        category: contract.category,
        description: contract.description || "",
        startDate: new Date().toISOString().split("T")[0],
        expirationDate: "",
        amount: contract.amount || "",
        paymentFrequency: getField<string | null>(contract, "paymentFrequency", "payment_frequency") || "",
        renewalTerms: getField<string | null>(contract, "renewalTerms", "renewal_terms") || "",
        notificationSchedule: getField<string | null>(contract, "notificationSchedule", "notification_schedule") || "60,45,30,15",
        notes: "",
      });
    }
  });

  const getUserName = (user: PlatformUser) => {
    const first = user.firstName || user.first_name || "";
    const last = user.lastName || user.last_name || "";
    return `${first} ${last}`.trim() || user.email;
  };

  const getUserEmail = (user: PlatformUser) => user.email;
  const selectedCount = selectedUserIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Renew Contract</DialogTitle>
          <DialogDescription>
            Create a new contract based on {contract?.name}. The previous contract will be marked as renewed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3"
            data-testid="form-renew"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-renew-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-renew-vendor" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-renew-category">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} data-testid="input-renew-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-renew-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-renew-expiration-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-renew-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-renew-frequency">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notificationSchedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Schedule</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "60,45,30,15"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-renew-notification-schedule">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NOTIFICATION_SCHEDULE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="renewalTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Renewal Terms</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} data-testid="input-renew-terms" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} data-testid="input-renew-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium">Responsible Users</label>
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="no-default-hover-elevate">
                    {selectedCount} selected
                  </Badge>
                )}
              </div>
              <div className="mt-1 border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users available</p>
                ) : (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover-elevate"
                      data-testid={`checkbox-renew-user-${user.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => onToggleUser(user.id)}
                        className="rounded"
                      />
                      <div className="min-w-0">
                        <div className="truncate">{getUserName(user)}</div>
                        <div className="text-xs text-muted-foreground truncate">{getUserEmail(user)}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-renew"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-renew">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Renew Contract
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
