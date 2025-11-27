import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useB2bAdminCustomers, useB2bApproveCustomer, useB2bRejectCustomer, useCreateB2bCustomer, useUpdateB2bCustomer } from "@/hooks/useB2bAdminCustomers";
import { useB2bAdminOrders, useB2bAdminSalesReps, useB2bAdminTiers, useB2bAdmins, useChangeAdminPassword, useCreateSalesRep, useUpdateSalesRep, useCreateAdmin, useUpdateAdmin, useDeleteAdmin, useToggleTierActive, useUpdateTier, useB2bAdminProducts, useCreateManualOrder, useDeleteB2bOrder } from "@/hooks/useB2bAdmin";
import { useB2bPublicTiers } from "@/hooks/useB2bProducts";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, CheckCircle2, Building, Mail, Phone, ShoppingCart, UserCog, Settings as SettingsIcon, Lock, Plus, Edit, DollarSign, Pencil, Trash2, Shield, Image, Calendar, Send, QrCode, Wine, LogOut, Package, Copy, Download, Upload, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { B2bSlideshowManager } from "@/components/b2b/B2bSlideshowManager";
import { EmailTemplateManager } from "@/components/b2b/EmailTemplateManager";
import B2bQRCodes from "@/components/b2b/B2bQRCodes";
import TierCommitmentPage from "./TierCommitmentPage";
import TasksPage from "./TasksPage";
import NotesManager from "@/components/NotesManager";
import { BookOpen } from "lucide-react";

const createCustomerSchema = z.object({
  accountName: z.string().min(1, "Business name is required"),
  primaryContactName: z.string().min(1, "Contact name is required"),
  customerType: z.enum(["retail_liquor", "restaurant", "private_club", "other"]).optional(),
  emailAddress: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  licenseNumber: z.string().min(1, "License number is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  billingAddress: z.string().min(1, "Billing address is required"),
  billingCity: z.string().min(1, "Billing city is required"),
  billingState: z.string().min(1, "Billing state is required"),
  billingZipCode: z.string().min(1, "Billing ZIP code is required"),
  shippingAddress: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "Shipping city is required"),
  shippingState: z.string().min(1, "Shipping state is required"),
  shippingZipCode: z.string().min(1, "Shipping ZIP code is required"),
  tierId: z.string().optional(),
  salesRepId: z.string().optional(), // Optional for sales reps (auto-assigned)
  autoApprove: z.boolean(),
  autoGeneratePassword: z.boolean().default(true),
  customPassword: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.autoApprove && !data.tierId) {
    return false;
  }
  return true;
}, {
  message: "A pricing tier must be selected when auto-approving",
  path: ["tierId"],
}).refine((data) => {
  if (!data.autoGeneratePassword && (!data.customPassword || data.customPassword.length < 6)) {
    return false;
  }
  return true;
}, {
  message: "Custom password must be at least 6 characters",
  path: ["customPassword"],
});

type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

const editCustomerSchema = z.object({
  accountName: z.string().min(1, "Business name is required"),
  primaryContactName: z.string().min(1, "Contact name is required"),
  customerType: z.enum(["retail_liquor", "restaurant", "private_club", "other"]).optional(),
  emailAddress: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  licenseNumber: z.string().min(1, "License number is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  billingAddress: z.string().min(1, "Billing address is required"),
  billingCity: z.string().min(1, "Billing city is required"),
  billingState: z.string().min(1, "Billing state is required"),
  billingZipCode: z.string().min(1, "Billing ZIP code is required"),
  shippingAddress: z.string().optional(), // Hidden - using locations system instead
  shippingCity: z.string().optional(), // Hidden - using locations system instead
  shippingState: z.string().optional(), // Hidden - using locations system instead
  shippingZipCode: z.string().optional(), // Hidden - using locations system instead
  tierId: z.string().optional(),
  salesRepId: z.string().optional(), // Optional for sales reps (they can't change assignment)
  accountStatus: z.enum(["pending_approval", "active", "inactive", "archived"]),
  notes: z.string().optional(),
});

type EditCustomerFormData = z.infer<typeof editCustomerSchema>;

const manualOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
  })).min(1, "At least one product is required"),
});

type ManualOrderFormData = z.infer<typeof manualOrderSchema>;

const getOrderStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending_approval': 'Awaiting Approval',
    'awaiting_delivery': 'Awaiting Delivery',
    'awaiting_payment': 'Awaiting Payment',
    'completed': 'Paid',
  };
  return labels[status] || status;
};

const getOrderStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
  switch (status) {
    case 'pending_approval':
      return 'secondary';
    case 'awaiting_delivery':
    case 'awaiting_payment':
      return 'default';
    case 'completed':
      return 'default';
    default:
      return 'secondary';
  }
};

// Location Form Component
interface LocationFormProps {
  location: any | null;
  customer?: {
    accountName?: string | null;
    shippingAddress?: string | null;
    shippingCity?: string | null;
    shippingState?: string | null;
    shippingZipCode?: string | null;
    phoneNumber?: string | null;
    emailAddress?: string | null;
  } | null;
  onSave: (data: {
    storeName: string;
    storeAddress: string;
    storeCity: string;
    storeState: string;
    storeZipCode: string;
    storePhone?: string;
    storeEmail?: string;
    website?: string;
    isPrimary?: boolean;
    showOnWhereToBuy?: boolean;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function LocationForm({ location, customer, onSave, onCancel, isSaving }: LocationFormProps) {
  const [formData, setFormData] = useState({
    storeName: location?.storeName || "",
    storeAddress: location?.storeAddress || "",
    storeCity: location?.storeCity || "",
    storeState: location?.storeState || "",
    storeZipCode: location?.storeZipCode || "",
    storePhone: location?.storePhone || "",
    storeEmail: location?.storeEmail || "",
    website: location?.website || "",
    isPrimary: location?.isPrimary || false,
    showOnWhereToBuy: location?.showOnWhereToBuy !== false,
  });

  useEffect(() => {
    setFormData({
      storeName: location?.storeName || "",
      storeAddress: location?.storeAddress || "",
      storeCity: location?.storeCity || "",
      storeState: location?.storeState || "",
      storeZipCode: location?.storeZipCode || "",
      storePhone: location?.storePhone || "",
      storeEmail: location?.storeEmail || "",
      website: location?.website || "",
      isPrimary: location?.isPrimary || false,
      showOnWhereToBuy: location?.showOnWhereToBuy !== false,
    });
  }, [location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleCopyFromMain = () => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        storeName: customer.accountName || prev.storeName,
        storeAddress: customer.shippingAddress || prev.storeAddress,
        storeCity: customer.shippingCity || prev.storeCity,
        storeState: customer.shippingState || prev.storeState,
        storeZipCode: customer.shippingZipCode || prev.storeZipCode,
        storePhone: customer.phoneNumber || prev.storePhone,
        storeEmail: customer.emailAddress || prev.storeEmail,
      }));
    }
  };

  const hasMainInfo = customer && (customer.accountName || customer.shippingAddress || customer.shippingCity);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasMainInfo && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyFromMain}
            data-testid="button-copy-main-address"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy from Main Address
          </Button>
        </div>
      )}

      <div>
        <Label htmlFor="storeName">Store Name *</Label>
        <Input
          id="storeName"
          value={formData.storeName}
          onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
          placeholder="Main Store"
          required
          data-testid="input-location-store-name"
        />
      </div>

      <div>
        <Label htmlFor="storeAddress">Store Location (Street Address) *</Label>
        <Input
          id="storeAddress"
          value={formData.storeAddress}
          onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
          placeholder="123 Main St"
          required
          data-testid="input-location-address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="storeCity">City *</Label>
          <Input
            id="storeCity"
            value={formData.storeCity}
            onChange={(e) => setFormData({ ...formData, storeCity: e.target.value })}
            required
            data-testid="input-location-city"
          />
        </div>
        <div>
          <Label htmlFor="storeState">State *</Label>
          <Input
            id="storeState"
            value={formData.storeState}
            onChange={(e) => setFormData({ ...formData, storeState: e.target.value })}
            required
            data-testid="input-location-state"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="storeZipCode">ZIP Code *</Label>
          <Input
            id="storeZipCode"
            value={formData.storeZipCode}
            onChange={(e) => setFormData({ ...formData, storeZipCode: e.target.value })}
            required
            data-testid="input-location-zip"
          />
        </div>
        <div>
          <Label htmlFor="storePhone">Store Phone</Label>
          <Input
            id="storePhone"
            value={formData.storePhone}
            onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
            placeholder="(555) 555-5555"
            data-testid="input-location-phone"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="storeEmail">Store Email</Label>
        <Input
          id="storeEmail"
          type="email"
          value={formData.storeEmail}
          onChange={(e) => setFormData({ ...formData, storeEmail: e.target.value })}
          placeholder="store@example.com"
          data-testid="input-location-email"
        />
      </div>

      <div>
        <Label htmlFor="website">Website (Optional)</Label>
        <Input
          id="website"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://www.example.com"
          data-testid="input-location-website"
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Switch
            id="showOnWhereToBuy"
            checked={formData.showOnWhereToBuy}
            onCheckedChange={(checked) => setFormData({ ...formData, showOnWhereToBuy: checked })}
            data-testid="switch-location-show-on-wtb"
          />
          <Label htmlFor="showOnWhereToBuy" className="cursor-pointer">
            Show on Where to Buy page
          </Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-location">
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} data-testid="button-save-location">
          {isSaving ? "Saving..." : location ? "Update Location" : "Add Location"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user: currentUser } = useB2bAuth();
  const { data: pendingCustomers, isLoading: loadingPending } = useB2bAdminCustomers("pending_approval");
  const { data: activeCustomers, isLoading: loadingActive } = useB2bAdminCustomers("active");
  const { data: inactiveCustomers, isLoading: loadingInactive } = useB2bAdminCustomers("inactive");
  const { data: orders, isLoading: loadingOrders } = useB2bAdminOrders();
  const { data: salesReps, isLoading: loadingSalesReps } = useB2bAdminSalesReps();
  const { data: admins, isLoading: loadingAdmins } = useB2bAdmins();
  const { data: adminTiers, isLoading: loadingAdminTiers } = useB2bAdminTiers(); // All tiers for Settings tab
  const { data: activeTiers, isLoading: loadingActiveTiers } = useB2bPublicTiers(); // Active tiers for approval dialog
  
  // Filter out Tier 2 (auto-cart-upgrade only) from manual assignment
  const manuallyAssignableTiers = useMemo(() => {
    return activeTiers?.filter(tier => tier.tierName !== 'Tier 2') || [];
  }, [activeTiers]);
  const { data: adminProducts, isLoading: loadingProducts } = useB2bAdminProducts(); // Products for manual orders
  const { mutateAsync: approveCustomer, isPending: isApproving } = useB2bApproveCustomer();
  const { mutateAsync: rejectCustomer, isPending: isRejecting } = useB2bRejectCustomer();
  const { mutateAsync: createCustomer, isPending: isCreatingCustomer } = useCreateB2bCustomer();
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer } = useUpdateB2bCustomer();
  const { mutateAsync: changePassword, isPending: isChangingPassword } = useChangeAdminPassword();
  const { mutateAsync: createSalesRep, isPending: isCreatingSalesRep } = useCreateSalesRep();
  const { mutateAsync: updateSalesRep, isPending: isUpdatingSalesRep } = useUpdateSalesRep();
  const { mutateAsync: createAdmin, isPending: isCreatingAdmin } = useCreateAdmin();
  const { mutateAsync: updateAdmin, isPending: isUpdatingAdmin } = useUpdateAdmin();
  const { mutateAsync: deleteAdmin, isPending: isDeletingAdmin } = useDeleteAdmin();
  const { mutateAsync: toggleTierActive, isPending: isTogglingTier } = useToggleTierActive();
  const { mutateAsync: updateTier, isPending: isUpdatingTier } = useUpdateTier();
  const { mutateAsync: createManualOrder, isPending: isCreatingManualOrder } = useCreateManualOrder();
  const { mutateAsync: deleteOrder, isPending: isDeletingOrder } = useDeleteB2bOrder();

  const markCommissionPaidMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const res = await apiRequest('PATCH', `/api/b2b/admin/commissions/${commissionId}/paid`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "sales-reps", commissionDialog.salesRep?.id, "commissions"] });
      toast({
        title: 'Success',
        description: 'Commission marked as paid',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark commission as paid',
        variant: 'destructive',
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await apiRequest('PATCH', `/api/b2b/admin/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "orders"] });
      toast({
        title: 'Success',
        description: 'Order status updated and commissions updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update order status',
        variant: 'destructive',
      });
    },
  });

  const [approveDialog, setApproveDialog] = useState<{ isOpen: boolean; customer: any | null }>({
    isOpen: false,
    customer: null,
  });
  const [selectedTier, setSelectedTier] = useState("");
  
  // Category-specific tier management state
  const [selectedTierCategory, setSelectedTierCategory] = useState<string>("wine");
  const categoryLabels: Record<string, string> = {
    "wine": "Wine",
    "spirits": "Spirits",
    "beer": "Beer",
    "canned_cocktail": "Canned Cocktails",
    "canned_wine": "Canned Wine",
    "cider": "Cider"
  };
  const categories = Object.keys(categoryLabels);
  const categoryTiers = useMemo(() => {
    return adminTiers?.filter(tier => tier.category === selectedTierCategory) || [];
  }, [adminTiers, selectedTierCategory]);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Commission backfill state
  const [isBackfillingCommissions, setIsBackfillingCommissions] = useState(false);

  // Welcome statement state
  const [welcomeStatement, setWelcomeStatement] = useState("Great Pricing With Supporting Local Agriculture - Thank you");
  const [isSavingWelcomeStatement, setIsSavingWelcomeStatement] = useState(false);

  // Payroll settings state
  const [payrollPayday, setPayrollPayday] = useState<Date | null>(null); // Next payroll date
  const [payrollFrequency, setPayrollFrequency] = useState<string>("monthly"); // weekly, bi-weekly, monthly
  const [payrollAdminName, setPayrollAdminName] = useState<string>(""); // Payroll admin name
  const [payrollAdminEmail, setPayrollAdminEmail] = useState<string>(""); // Payroll admin email
  const [managerEmails, setManagerEmails] = useState<string>(""); // Comma-separated manager emails
  const [isSavingPayrollSettings, setIsSavingPayrollSettings] = useState(false);
  const [showPaydayCalendar, setShowPaydayCalendar] = useState(false);
  
  // Bulk commission selection state
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<Set<string>>(new Set());
  const [isSendingPayroll, setIsSendingPayroll] = useState(false);

  // Export/Import state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCustomers = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/b2b/admin/customer/export", {
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

      const response = await fetch("/api/b2b/admin/customer/import", {
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

      // Refresh customers list
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "customers"] });
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

  // Load welcome statement and payroll settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/b2b/settings/welcome');
        const data = await res.json();
        if (data.welcomeStatement) {
          setWelcomeStatement(data.welcomeStatement);
        }

        // Load payroll settings
        const payrollRes = await fetch('/api/b2b/admin/payroll/settings');
        if (payrollRes.ok) {
          const payrollData = await payrollRes.json();
          if (payrollData.payday) {
            setPayrollPayday(new Date(payrollData.payday));
          } else {
            setPayrollPayday(new Date());
          }
          setPayrollFrequency(payrollData.frequency || 'monthly');
          setPayrollAdminName(payrollData.payrollAdminName || '');
          setPayrollAdminEmail(payrollData.payrollAdminEmail || '');
          setManagerEmails(payrollData.managerEmails || '');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSavePayrollSettings = async () => {
    if (!payrollPayday) {
      toast({
        title: 'Error',
        description: 'Please select a payday',
        variant: 'destructive',
      });
      return;
    }
    
    if (!payrollAdminEmail) {
      toast({
        title: 'Error',
        description: 'Please enter payroll administrator email',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSavingPayrollSettings(true);
    try {
      const res = await apiRequest('POST', '/api/b2b/admin/payroll/settings', {
        payday: payrollPayday.toISOString(),
        frequency: payrollFrequency,
        payrollAdminName,
        payrollAdminEmail,
        managerEmails,
      });
      toast({
        title: 'Success',
        description: 'Payroll settings updated successfully',
      });
      refetchPayroll();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save payroll settings',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPayrollSettings(false);
    }
  };

  const handleBackfillCommissions = async () => {
    setIsBackfillingCommissions(true);
    try {
      const res = await apiRequest('POST', '/api/b2b/admin/backfill-commissions', {});
      const data = await res.json();
      toast({
        title: 'Success',
        description: `Created ${data.created} commissions. Skipped ${data.skipped} orders that already had commissions.`,
      });
      // Refresh the commission queries
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/sales-reps'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to backfill commissions',
        variant: 'destructive',
      });
    } finally {
      setIsBackfillingCommissions(false);
    }
  };

  // Sales rep dialog state
  const [salesRepDialog, setSalesRepDialog] = useState<{ isOpen: boolean; salesRep: any | null }>({
    isOpen: false,
    salesRep: null,
  });
  const [salesRepForm, setSalesRepForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    territory: "",
    commissionPercentage: "",
    password: "",
  });

  // Delete order dialog state
  const [deleteOrderDialog, setDeleteOrderDialog] = useState<{ isOpen: boolean; order: any | null }>({
    isOpen: false,
    order: null,
  });

  // Commission history dialog state
  const [commissionDialog, setCommissionDialog] = useState<{ isOpen: boolean; salesRep: any | null }>({
    isOpen: false,
    salesRep: null,
  });
  const { data: commissions, isLoading: loadingCommissions } = useQuery<any[]>({
    queryKey: ["b2b", "admin", "sales-reps", commissionDialog.salesRep?.id, "commissions"],
    queryFn: async () => {
      if (!commissionDialog.salesRep?.id) throw new Error("No sales rep ID");
      const response = await fetch(`/api/b2b/admin/sales-reps/${commissionDialog.salesRep.id}/commissions`);
      if (!response.ok) throw new Error("Failed to fetch commissions");
      return response.json();
    },
    enabled: !!commissionDialog.salesRep?.id,
  });

  // Payroll dialog state
  const [payrollPayPeriod, setPayrollPayPeriod] = useState<string>("");
  const [payrollCommissionId, setPayrollCommissionId] = useState<string | null>(null);
  const [nextPayrollDate, setNextPayrollDate] = useState<string>("");
  
  // Get earned commissions not yet paid
  const { data: payrollCommissions, isLoading: loadingPayrollCommissions, refetch: refetchPayroll } = useQuery<any[]>({
    queryKey: ["b2b", "admin", "payroll", "commissions"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/admin/payroll/commissions");
      if (!response.ok) throw new Error("Failed to fetch payroll commissions");
      return response.json();
    },
  });

  // Calculate future payroll dates based on selected payday and frequency
  useEffect(() => {
    const calculateNextPayrollDate = () => {
      if (!payrollPayday) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let nextDate = new Date(payrollPayday);
      nextDate.setHours(0, 0, 0, 0);

      // If the payday is in the past, calculate the next occurrence
      if (nextDate <= today) {
        if (payrollFrequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (payrollFrequency === 'bi-weekly') {
          nextDate.setDate(nextDate.getDate() + 14);
        } else {
          // weekly
          nextDate.setDate(nextDate.getDate() + 7);
        }
      }
      
      setNextPayrollDate(format(nextDate, 'MMM d, yyyy'));
    };
    calculateNextPayrollDate();
  }, [payrollFrequency, payrollPayday]);

  // Mutation to update commission pay period
  const updateCommissionPayPeriod = useMutation({
    mutationFn: async (data: { commissionId: string; payPeriod: string }) => {
      const response = await apiRequest(
        `PATCH`,
        `/api/b2b/admin/payroll/commissions/${data.commissionId}/pay`,
        { payPeriod: data.payPeriod }
      );
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Commission added to payroll",
      });
      refetchPayroll();
      setPayrollCommissionId(null);
      setPayrollPayPeriod("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update commission",
        variant: "destructive",
      });
    },
  });

  // Mutation to send payroll email for selected commissions
  const sendPayrollEmail = useMutation({
    mutationFn: async (commissionIds: string[]) => {
      const response = await apiRequest(
        'POST',
        '/api/b2b/admin/payroll/send-email',
        { commissionIds, payPeriod: nextPayrollDate }
      );
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payroll email sent and commissions marked as finalized",
      });
      setSelectedCommissionIds(new Set());
      refetchPayroll();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send payroll email",
        variant: "destructive",
      });
    },
  });

  // Edit tier dialog state
  const [editTierDialog, setEditTierDialog] = useState<{ isOpen: boolean; tier: any | null }>({
    isOpen: false,
    tier: null,
  });
  const [editTierForm, setEditTierForm] = useState({
    discountPercentage: 0,
    description: "",
  });

  // Admin dialog state
  const [adminDialog, setAdminDialog] = useState<{ isOpen: boolean; admin: any | null }>({
    isOpen: false,
    admin: null,
  });
  const [adminForm, setAdminForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  // Delete admin confirmation state
  const [deleteAdminDialog, setDeleteAdminDialog] = useState<{ isOpen: boolean; admin: any | null }>({
    isOpen: false,
    admin: null,
  });

  // Create customer dialog state
  const [createCustomerDialog, setCreateCustomerDialog] = useState(false);
  const [manualOrderDialog, setManualOrderDialog] = useState(false);
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number }>>([{ productId: "", quantity: 1 }]);

  const createCustomerForm = useForm<CreateCustomerFormData>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      accountName: "",
      primaryContactName: "",
      customerType: undefined,
      emailAddress: "",
      phoneNumber: "",
      licenseNumber: "",
      taxId: "",
      billingAddress: "",
      billingCity: "",
      billingState: "",
      billingZipCode: "",
      shippingAddress: "",
      shippingCity: "",
      shippingState: "",
      shippingZipCode: "",
      tierId: "",
      salesRepId: "",
      autoApprove: true,
      autoGeneratePassword: true,
      customPassword: "",
      notes: "",
    },
  });

  // Edit customer dialog state
  const [editCustomerDialog, setEditCustomerDialog] = useState<{ isOpen: boolean; customer: any | null }>({
    isOpen: false,
    customer: null,
  });

  // Customer locations state
  const [customerLocations, setCustomerLocations] = useState<any[]>([]);
  const [locationDialog, setLocationDialog] = useState<{ isOpen: boolean; location: any | null; customerId: string | null }>({
    isOpen: false,
    location: null,
    customerId: null,
  });
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // Fetch customer locations when edit dialog opens
  const { data: fetchedLocations, refetch: refetchLocations } = useQuery<any[]>({
    queryKey: ['/api/b2b/admin/customers', editCustomerDialog.customer?.id, 'locations'],
    queryFn: async () => {
      const res = await fetch(`/api/b2b/admin/customers/${editCustomerDialog.customer?.id}/locations`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch locations');
      return res.json();
    },
    enabled: !!editCustomerDialog.customer?.id && editCustomerDialog.isOpen,
  });

  // Update local locations state when fetched
  useEffect(() => {
    if (fetchedLocations) {
      setCustomerLocations(fetchedLocations);
    }
  }, [fetchedLocations]);

  // Customer manual products state (Featured Products for Where to Buy)
  const [customerManualProducts, setCustomerManualProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isSavingManualProducts, setIsSavingManualProducts] = useState(false);

  // Fetch customer manual products when edit dialog opens
  const { data: fetchedManualProducts, refetch: refetchManualProducts } = useQuery<any[]>({
    queryKey: ['/api/b2b/admin/customers', editCustomerDialog.customer?.id, 'manual-products'],
    queryFn: async () => {
      const res = await fetch(`/api/b2b/admin/customers/${editCustomerDialog.customer?.id}/manual-products`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch manual products');
      return res.json();
    },
    enabled: !!editCustomerDialog.customer?.id && editCustomerDialog.isOpen,
  });

  // Update local manual products state when fetched
  useEffect(() => {
    if (fetchedManualProducts) {
      setCustomerManualProducts(fetchedManualProducts);
    }
  }, [fetchedManualProducts]);

  // Fetch all products for selection dropdown
  const { data: allProducts } = useQuery<any[]>({
    queryKey: ['/api/products'],
    enabled: editCustomerDialog.isOpen,
  });

  // Order history dialog state
  const [orderHistoryDialog, setOrderHistoryDialog] = useState<{ isOpen: boolean; customer: any | null }>({
    isOpen: false,
    customer: null,
  });
  const { data: customerOrderHistory, isLoading: loadingOrderHistory } = useQuery<any[]>({
    queryKey: ['/api/b2b/customer/orders', orderHistoryDialog.customer?.id],
    queryFn: async () => {
      const res = await fetch(`/api/b2b/customer/orders?customerId=${orderHistoryDialog.customer?.id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: !!orderHistoryDialog.customer?.id,
  });

  const editCustomerForm = useForm<EditCustomerFormData>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      accountName: "",
      primaryContactName: "",
      customerType: undefined,
      emailAddress: "",
      phoneNumber: "",
      licenseNumber: "",
      taxId: "",
      billingAddress: "",
      billingCity: "",
      billingState: "",
      billingZipCode: "",
      shippingAddress: "",
      shippingCity: "",
      shippingState: "",
      shippingZipCode: "",
      tierId: "",
      salesRepId: "",
      accountStatus: "active",
      notes: "",
    },
  });

  const manualOrderForm = useForm<ManualOrderFormData>({
    resolver: zodResolver(manualOrderSchema),
    defaultValues: {
      customerId: "",
      notes: "",
      items: [{ productId: "", quantity: 1 }],
    },
  });

  const handleApprove = async () => {
    if (!approveDialog.customer || !selectedTier) {
      toast({
        title: "Missing Information",
        description: "Please select a pricing tier",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Approving customer:', {
        customerId: approveDialog.customer.id,
        tierId: selectedTier,
        customerName: approveDialog.customer.accountName
      });

      await approveCustomer({
        customerId: approveDialog.customer.id,
        tierId: selectedTier,
      });

      toast({
        title: "Customer Approved",
        description: `${approveDialog.customer.accountName} has been approved. They will receive an email with login credentials.`,
      });

      setApproveDialog({ isOpen: false, customer: null });
      setSelectedTier("");
    } catch (error: any) {
      console.error('Approval error:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the customer",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (customerId: string, accountName: string) => {
    try {
      await rejectCustomer({
        customerId,
        reason: "Application declined",
      });

      toast({
        title: "Customer Rejected",
        description: `${accountName}'s application has been declined.`,
      });
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveWelcomeStatement = async () => {
    setIsSavingWelcomeStatement(true);
    try {
      await apiRequest('POST', '/api/b2b/admin/settings/welcome', { welcomeStatement });
      toast({
        title: 'Success',
        description: 'Welcome statement has been saved',
      });
      // Invalidate the welcome settings cache
      queryClient.invalidateQueries({ queryKey: ['b2b', 'settings', 'welcome'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save welcome statement',
        variant: 'destructive',
      });
    } finally {
      setIsSavingWelcomeStatement(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation must match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Please check your current password",
        variant: "destructive",
      });
    }
  };

  const handleToggleTier = async (tierId: string, currentActive: boolean) => {
    try {
      await toggleTierActive({ tierId, active: !currentActive });
      toast({
        title: "Tier Updated",
        description: `Tier has been ${!currentActive ? 'activated' : 'deactivated'}. ${!currentActive ? 'It will now appear in pricing and approval options.' : 'It has been hidden from new customer pricing and approval.'}`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update tier status",
        variant: "destructive",
      });
    }
  };

  const handleOpenEditTier = (tier: any) => {
    setEditTierDialog({ isOpen: true, tier });
    setEditTierForm({
      discountPercentage: parseFloat(tier.discountPercentage),
      description: tier.description || "",
    });
  };

  const handleUpdateTier = async () => {
    if (!editTierDialog.tier) return;

    try {
      const discountPercentage = editTierForm.discountPercentage;
      
      if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
        toast({
          title: "Invalid Input",
          description: "Discount percentage must be between 0 and 100",
          variant: "destructive",
        });
        return;
      }

      await updateTier({
        tierId: editTierDialog.tier.id,
        discountPercentage,
        description: editTierForm.description,
      });

      toast({
        title: "Tier Updated",
        description: "Pricing tier has been updated successfully",
      });

      setEditTierDialog({ isOpen: false, tier: null });
      setEditTierForm({ discountPercentage: 0, description: "" });
    } catch (error: any) {
      console.error('Update tier error:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update tier",
        variant: "destructive",
      });
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (adminDialog.admin) {
        // Update existing admin
        const updateData: any = {
          id: adminDialog.admin.id,
          firstName: adminForm.firstName,
          lastName: adminForm.lastName,
          email: adminForm.email,
        };
        
        // Only include password if it's not empty
        if (adminForm.password) {
          updateData.password = adminForm.password;
        }
        
        await updateAdmin(updateData);
        
        toast({
          title: "Admin Updated",
          description: "Administrator has been updated successfully",
        });
      } else {
        // Create new admin
        if (!adminForm.password) {
          toast({
            title: "Password Required",
            description: "Password is required for new administrators",
            variant: "destructive",
          });
          return;
        }

        await createAdmin(adminForm);
        
        toast({
          title: "Admin Created",
          description: "New administrator has been created successfully",
        });
      }

      setAdminDialog({ isOpen: false, admin: null });
      setAdminForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
      });
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openAdminDialog = (admin?: any) => {
    if (admin) {
      setAdminForm({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: "",
      });
    } else {
      setAdminForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
      });
    }
    setAdminDialog({ isOpen: true, admin: admin || null });
  };

  const handleDeleteAdminConfirm = async () => {
    if (!deleteAdminDialog.admin) return;

    try {
      await deleteAdmin(deleteAdminDialog.admin.id);
      
      toast({
        title: "Admin Deleted",
        description: "Administrator has been removed successfully",
      });

      setDeleteAdminDialog({ isOpen: false, admin: null });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete administrator",
        variant: "destructive",
      });
    }
  };

  const handleSalesRepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (salesRepDialog.salesRep) {
        // Update existing sales rep
        await updateSalesRep({
          id: salesRepDialog.salesRep.id,
          ...salesRepForm,
          commissionPercentage: salesRepForm.commissionPercentage ? parseFloat(salesRepForm.commissionPercentage) : 0,
          password: salesRepForm.password || undefined,
        });
        
        toast({
          title: "Sales Rep Updated",
          description: "Sales representative has been updated successfully",
        });
      } else {
        // Create new sales rep
        if (!salesRepForm.password) {
          toast({
            title: "Password Required",
            description: "Password is required for new sales representatives",
            variant: "destructive",
          });
          return;
        }

        await createSalesRep({
          ...salesRepForm,
          commissionPercentage: salesRepForm.commissionPercentage ? parseFloat(salesRepForm.commissionPercentage) : 0,
        });
        
        toast({
          title: "Sales Rep Created",
          description: "New sales representative has been created successfully",
        });
      }

      setSalesRepDialog({ isOpen: false, salesRep: null });
      setSalesRepForm({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        territory: "",
        commissionPercentage: "",
        password: "",
      });
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openSalesRepDialog = (salesRep?: any) => {
    if (salesRep) {
      setSalesRepForm({
        firstName: salesRep.firstName,
        lastName: salesRep.lastName,
        email: salesRep.email,
        phoneNumber: salesRep.phoneNumber || "",
        territory: salesRep.territory || "",
        commissionPercentage: salesRep.commissionPercentage || "",
        password: "",
      });
    } else {
      setSalesRepForm({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        territory: "",
        commissionPercentage: "",
        password: "",
      });
    }
    setSalesRepDialog({ isOpen: true, salesRep: salesRep || null });
  };

  const handleCreateCustomerSubmit = async (data: CreateCustomerFormData) => {
    try {
      // Use different endpoint for sales rep (auto-assigns them as sales rep)
      if (currentUser?.type === 'sales_rep') {
        const endpoint = '/api/b2b/sales-rep/customers';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...data,
            // Sales rep doesn't specify their own salesRepId - it's auto-assigned
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create customer');
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/customers'] });

        toast({
          title: "Customer Created Successfully",
          description: data.autoApprove 
            ? `${data.accountName} has been created and approved. You are assigned as the Sales Representative.`
            : `${data.accountName} has been created and is pending approval. You are assigned as the Sales Representative.`,
        });
      } else {
        // Admin flow
        const result = await createCustomer(data);
        
        toast({
          title: "Customer Created Successfully",
          description: data.autoApprove 
            ? `${data.accountName} has been created and approved. Login credentials have been sent to ${data.emailAddress}. The password is the last 6 digits of their phone number.`
            : `${data.accountName} has been created and is pending approval.`,
        });
      }

      // Reset form and close dialog
      createCustomerForm.reset();
      setCreateCustomerDialog(false);
    } catch (error: any) {
      toast({
        title: "Failed to Create Customer",
        description: error.message || "An error occurred while creating the customer",
        variant: "destructive",
      });
    }
  };

  // Helper function to check if current user can edit a customer
  const canEditCustomer = (customer: any) => {
    if (currentUser?.type === 'admin') return true;
    if (currentUser?.type === 'sales_rep') {
      // Sales rep can only edit customers assigned to them
      return customer.salesRepId === currentUser.id || customer.salesRep?.id === currentUser.id;
    }
    return false;
  };

  // Helper function to check if current user can place orders for a customer
  const canPlaceOrderForCustomer = (customer: any) => {
    if (currentUser?.type === 'admin') return true;
    if (currentUser?.type === 'sales_rep') {
      // Sales rep can only place orders for customers assigned to them
      return customer.salesRepId === currentUser.id || customer.salesRep?.id === currentUser.id;
    }
    return false;
  };

  const handlePlaceOrderForCustomer = (customer: any) => {
    // Check if user can place orders for this customer
    if (!canPlaceOrderForCustomer(customer)) {
      toast({
        title: "Access Denied",
        description: currentUser?.type === 'sales_rep' 
          ? "You can only place orders for customers assigned to you"
          : "Only administrators can place orders for customers",
        variant: "destructive",
      });
      return;
    }

    // Store impersonation info in localStorage
    localStorage.setItem('admin_impersonating', JSON.stringify({
      customerId: customer.id,
      customerName: customer.accountName,
      customerEmail: customer.emailAddress,
    }));

    // Navigate to customer catalog
    window.location.href = `/b2b/catalog`;
  };

  const handleEditCustomer = (customer: any) => {
    // Check if user can edit this customer
    if (!canEditCustomer(customer)) {
      toast({
        title: "Access Denied",
        description: currentUser?.type === 'sales_rep'
          ? "You can only edit customers assigned to you"
          : "Only administrators can edit customers",
        variant: "destructive",
      });
      return;
    }

    setEditCustomerDialog({ isOpen: true, customer });
    editCustomerForm.reset({
      accountName: customer.accountName || "",
      primaryContactName: customer.primaryContactName || "",
      customerType: customer.customerType || undefined,
      emailAddress: customer.emailAddress || "",
      phoneNumber: customer.phoneNumber || "",
      licenseNumber: customer.licenseNumber || "",
      taxId: customer.taxId || "",
      billingAddress: customer.billingAddress || "",
      billingCity: customer.billingCity || "",
      billingState: customer.billingState || "",
      billingZipCode: customer.billingZipCode || "",
      shippingAddress: customer.shippingAddress || "",
      shippingCity: customer.shippingCity || "",
      shippingState: customer.shippingState || "",
      shippingZipCode: customer.shippingZipCode || "",
      tierId: customer.tier?.id || "",
      salesRepId: customer.salesRep?.id || "",
      accountStatus: customer.accountStatus || "active",
      notes: customer.notes || "",
    });
  };

  const handleEditCustomerSubmit = async (data: EditCustomerFormData) => {
    if (!editCustomerDialog.customer) return;

    // Check if user can edit this customer
    if (!canEditCustomer(editCustomerDialog.customer)) {
      toast({
        title: "Access Denied",
        description: currentUser?.type === 'sales_rep'
          ? "You can only edit customers assigned to you"
          : "Only administrators can edit customers",
        variant: "destructive",
      });
      setEditCustomerDialog({ isOpen: false, customer: null });
      return;
    }

    try {
      // Use different API endpoint for sales rep
      const endpoint = currentUser?.type === 'sales_rep'
        ? `/api/b2b/sales-rep/customers/${editCustomerDialog.customer.id}`
        : `/api/b2b/admin/customers/${editCustomerDialog.customer.id}`;

      const updateData: any = {
        accountName: data.accountName,
        primaryContactName: data.primaryContactName,
        emailAddress: data.emailAddress,
        phoneNumber: data.phoneNumber,
        licenseNumber: data.licenseNumber,
        taxId: data.taxId,
        billingAddress: data.billingAddress,
        billingCity: data.billingCity,
        billingState: data.billingState,
        billingZipCode: data.billingZipCode,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        shippingZipCode: data.shippingZipCode,
        tierId: data.tierId,
        accountStatus: data.accountStatus,
        notes: data.notes,
      };

      // Only admin can change sales rep assignment
      if (currentUser?.type === 'admin') {
        updateData.salesRepId = data.salesRepId;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update customer');
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/customers'] });

      toast({
        title: "Customer Updated Successfully",
        description: `${data.accountName} has been updated.`,
      });

      // Reset form and close dialog
      editCustomerForm.reset();
      setEditCustomerDialog({ isOpen: false, customer: null });
    } catch (error: any) {
      toast({
        title: "Failed to Update Customer",
        description: error.message || "An error occurred while updating the customer",
        variant: "destructive",
      });
    }
  };

  // Location management functions
  const handleSaveLocation = async (locationData: {
    storeName: string;
    storeAddress: string;
    storeCity: string;
    storeState: string;
    storeZipCode: string;
    storePhone?: string;
    storeEmail?: string;
    website?: string;
    isPrimary?: boolean;
    showOnWhereToBuy?: boolean;
  }) => {
    if (!locationDialog.customerId) return;

    setIsSavingLocation(true);
    try {
      const url = locationDialog.location
        ? `/api/b2b/admin/customers/${locationDialog.customerId}/locations/${locationDialog.location.id}`
        : `/api/b2b/admin/customers/${locationDialog.customerId}/locations`;
      
      const response = await fetch(url, {
        method: locationDialog.location ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        throw new Error('Failed to save location');
      }

      toast({
        title: locationDialog.location ? "Location Updated" : "Location Added",
        description: `${locationData.storeName} has been saved.`,
      });

      setLocationDialog({ isOpen: false, location: null, customerId: null });
      refetchLocations();
    } catch (error: any) {
      toast({
        title: "Failed to Save Location",
        description: error.message || "An error occurred while saving the location",
        variant: "destructive",
      });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!editCustomerDialog.customer?.id) return;

    try {
      const response = await fetch(
        `/api/b2b/admin/customers/${editCustomerDialog.customer.id}/locations/${locationId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      toast({
        title: "Location Deleted",
        description: "The store location has been removed.",
      });

      refetchLocations();
    } catch (error: any) {
      toast({
        title: "Failed to Delete Location",
        description: error.message || "An error occurred while deleting the location",
        variant: "destructive",
      });
    }
  };

  // Handler for adding featured products
  const handleAddManualProducts = async () => {
    if (!editCustomerDialog.customer?.id || selectedProductIds.length === 0) return;

    setIsSavingManualProducts(true);
    try {
      const response = await fetch(
        `/api/b2b/admin/customers/${editCustomerDialog.customer.id}/manual-products`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productIds: selectedProductIds, expiresInMonths: 12 }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add featured products');
      }

      toast({
        title: "Featured Products Added",
        description: `${selectedProductIds.length} product(s) added to Where to Buy display.`,
      });

      setSelectedProductIds([]);
      refetchManualProducts();
    } catch (error: any) {
      toast({
        title: "Failed to Add Products",
        description: error.message || "An error occurred while adding featured products",
        variant: "destructive",
      });
    } finally {
      setIsSavingManualProducts(false);
    }
  };

  // Handler for removing a single featured product
  const handleRemoveManualProduct = async (manualProductId: string) => {
    if (!editCustomerDialog.customer?.id) return;

    try {
      const response = await fetch(
        `/api/b2b/admin/customers/${editCustomerDialog.customer.id}/manual-products/${manualProductId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove featured product');
      }

      toast({
        title: "Product Removed",
        description: "The featured product has been removed.",
      });

      refetchManualProducts();
    } catch (error: any) {
      toast({
        title: "Failed to Remove Product",
        description: error.message || "An error occurred while removing the product",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (customerId: string | undefined, customerEmail: string | undefined) => {
    if (!customerId || !customerEmail) return;

    // Only admins can reset passwords
    if (currentUser?.type !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can reset passwords",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/b2b/admin/customers/${customerId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      const result = await response.json();

      toast({
        title: "Password Reset Successfully",
        description: `New password has been generated and sent to ${customerEmail}. Temporary password: ${result.tempPassword}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Reset Password",
        description: error.message || "An error occurred while resetting the password",
        variant: "destructive",
      });
    }
  };

  const addOrderItem = () => {
    const items = manualOrderForm.getValues("items");
    manualOrderForm.setValue("items", [...items, { productId: "", quantity: 1 }]);
    setOrderItems([...orderItems, { productId: "", quantity: 1 }]);
  };

  const removeOrderItem = (index: number) => {
    const items = manualOrderForm.getValues("items");
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      manualOrderForm.setValue("items", newItems);
      setOrderItems(newItems);
    }
  };

  const handleManualOrderSubmit = async (data: ManualOrderFormData) => {
    try {
      await createManualOrder({
        customerId: data.customerId,
        items: data.items,
        notes: data.notes,
      });
      
      toast({
        title: "Manual Order Created",
        description: "The order has been created successfully.",
      });

      // Reset form and close dialog
      manualOrderForm.reset();
      setOrderItems([{ productId: "", quantity: 1 }]);
      setManualOrderDialog(false);
    } catch (error: any) {
      toast({
        title: "Failed to Create Order",
        description: error.message || "An error occurred while creating the order",
        variant: "destructive",
      });
    }
  };

  const renderCustomerCard = (customer: any, isPending: boolean) => (
    <Card key={customer.id} data-testid={`customer-card-${customer.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="font-serif text-xl mb-2 flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              {customer.accountName}
            </CardTitle>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {customer.emailAddress}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {customer.phoneNumber}
              </div>
            </div>
          </div>
          <Badge variant={isPending ? "secondary" : "default"}>
            {customer.accountStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Customer Type:</p>
              <p className="font-medium capitalize">{customer.customerType?.replace(/_/g, ' ') || "Not Set"}</p>
            </div>
            {customer.tier && (
              <div>
                <p className="text-muted-foreground">Tier:</p>
                <p className="font-medium">{customer.tier.tierName} ({customer.tier.discountPercentage}% off)</p>
              </div>
            )}
            {customer.approvedAt && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Approved:</p>
                <p className="font-medium">{format(new Date(customer.approvedAt), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>

          {customer.businessAddress && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Address:</p>
              <p className="text-sm">{customer.businessAddress}</p>
            </div>
          )}

          <div className="pt-3 border-t flex gap-2 flex-wrap">
            {/* Approval/Rejection buttons - Admin only for pending customers */}
            {isPending && currentUser?.type === 'admin' && (
              <>
                <Button
                  size="sm"
                  onClick={() => setApproveDialog({ isOpen: true, customer })}
                  className="flex-1"
                  data-testid={`button-approve-${customer.id}`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(customer.id, customer.accountName)}
                  className="flex-1"
                  data-testid={`button-reject-${customer.id}`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            
            {/* Place Order button - Admin or assigned Sales Rep */}
            {!isPending && canPlaceOrderForCustomer(customer) && (
              <Button
                size="sm"
                variant="default"
                onClick={() => handlePlaceOrderForCustomer(customer)}
                className="flex-1"
                data-testid={`button-place-order-${customer.id}`}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Place Order
              </Button>
            )}
            
            {/* View Orders button - Admin or assigned Sales Rep */}
            {!isPending && canEditCustomer(customer) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOrderHistoryDialog({ isOpen: true, customer })}
                className="flex-1"
                data-testid={`button-view-orders-${customer.id}`}
              >
                <Package className="h-4 w-4 mr-2" />
                View Orders
              </Button>
            )}
            
            {/* Edit button - Admin or assigned Sales Rep */}
            {canEditCustomer(customer) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditCustomer(customer)}
                className={isPending ? "flex-shrink-0" : (activeCustomers?.length || 0 > 2 ? "hidden sm:flex flex-1" : "flex-1")}
                data-testid={`button-edit-${customer.id}`}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold mb-2">B2B Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage wholesale operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin'} 
            data-testid="button-switch-to-base-app"
          >
            <Wine className="w-4 h-4 mr-2" />
            Base App Admin
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem('admin_impersonating');
              localStorage.removeItem('b2b_cart');
              window.location.href = '/b2b/login/admin';
            }} 
            data-testid="button-sign-out"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="customers" className="space-y-6">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Customer & Order Management</h3>
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="customers" data-testid="tab-customers" className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Customers</span>
                </TabsTrigger>
                <TabsTrigger value="orders" data-testid="tab-orders" className="flex items-center justify-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Orders</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" data-testid="tab-tasks" className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tasks</span>
                </TabsTrigger>
                <TabsTrigger value="data" data-testid="tab-data" className="flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Export/Import</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Marketing & Communications</h3>
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="marketing" data-testid="tab-marketing" className="flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Marketing</span>
                </TabsTrigger>
                <TabsTrigger value="commitments" data-testid="tab-commitments" className="flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Commitments</span>
                </TabsTrigger>
                <TabsTrigger value="qr-codes" data-testid="tab-qr-codes" className="flex items-center justify-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>QR Codes</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Content & Configuration</h3>
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="slideshow" data-testid="tab-slideshow" className="flex items-center justify-center gap-2">
                  <Image className="w-4 h-4" />
                  <span>Slideshow</span>
                </TabsTrigger>
                <TabsTrigger value="sales-reps" data-testid="tab-sales-reps" className="flex items-center justify-center gap-2">
                  <UserCog className="w-4 h-4" />
                  <span>Sales Reps</span>
                </TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings" className="flex items-center justify-center gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  <span>Settings</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Finance & Payroll</h3>
              <TabsList className="grid w-full grid-cols-2 h-auto">
                <TabsTrigger value="payroll" data-testid="tab-payroll" className="flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Payroll</span>
                </TabsTrigger>
                <TabsTrigger value="commissions" data-testid="tab-commissions" className="flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Commissions</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Improvements</h3>
              <TabsList className="w-full h-auto">
                <TabsTrigger value="notes" data-testid="tab-notes" className="flex items-center justify-center gap-2 flex-1">
                  <BookOpen className="w-4 h-4" />
                  <span>Improvement Notes</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </Card>
        </div>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-6">
          {(currentUser?.type === 'admin' || currentUser?.type === 'sales_rep') && (
            <div className="flex justify-end">
              <Button
                onClick={() => setCreateCustomerDialog(true)}
                data-testid="button-create-customer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Customer
              </Button>
            </div>
          )}
          
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingCustomers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">
                Active ({activeCustomers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="inactive" data-testid="tab-inactive">
                Inactive ({inactiveCustomers?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {loadingPending ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !pendingCustomers || pendingCustomers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Pending Applications</h3>
                    <p className="text-muted-foreground">
                      New customer registrations will appear here for approval
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingCustomers.map((customer) => renderCustomerCard(customer, true))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {loadingActive ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !activeCustomers || activeCustomers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Active Customers</h3>
                    <p className="text-muted-foreground">
                      Approved customers will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCustomers.map((customer) => renderCustomerCard(customer, false))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="inactive" className="space-y-4">
              {loadingInactive ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !inactiveCustomers || inactiveCustomers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Inactive Customers</h3>
                    <p className="text-muted-foreground">
                      Customers marked as inactive will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inactiveCustomers.map((customer) => renderCustomerCard(customer, false))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setManualOrderDialog(true)}
              data-testid="button-create-manual-order"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Manual Order
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">All Orders</CardTitle>
              <CardDescription>View all wholesale orders placed by customers</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !orders || orders.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Orders Yet</h3>
                  <p className="text-muted-foreground">
                    Customer orders will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`order-${order.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold">{order.orderNumber}</p>
                          <Badge variant={getOrderStatusBadgeVariant(order.status)}>
                            {getOrderStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.customer?.accountName || 'Unknown Customer'}</p>
                        <p className="text-xs text-muted-foreground">{order.customer?.emailAddress || 'No email'}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-semibold text-lg">${order.total}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.orderDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Select value={order.status} onValueChange={(newStatus) => updateOrderStatusMutation.mutate({ orderId: order.id, status: newStatus })}>
                        <SelectTrigger className="w-40" data-testid={`select-order-status-${order.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending_approval">Awaiting Approval</SelectItem>
                          <SelectItem value="awaiting_delivery">Awaiting Delivery</SelectItem>
                          <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                          <SelectItem value="completed">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteOrderDialog({ isOpen: true, order })}
                        data-testid={`button-delete-order-${order.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks">
          <TasksPage />
        </TabsContent>

        {/* EXPORT/IMPORT TAB */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Export Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export All Customers
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
                  onClick={handleExportCustomers}
                  disabled={isExporting}
                  className="w-full"
                  data-testid="button-export-all-customers"
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
                  Upload an Excel file to add or update customers in bulk
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
        </TabsContent>

        {/* MARKETING TAB */}
        <TabsContent value="marketing">
          <EmailTemplateManager />
        </TabsContent>

        {/* SALES REPS TAB */}
        <TabsContent value="sales-reps" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openSalesRepDialog()} data-testid="button-add-sales-rep">
              <Plus className="h-4 w-4 mr-2" />
              Add Sales Rep
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Sales Representatives</CardTitle>
              <CardDescription>Manage your sales team</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSalesReps ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !salesReps || salesReps.length === 0 ? (
                <div className="py-12 text-center">
                  <UserCog className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Sales Representatives</h3>
                  <p className="text-muted-foreground">
                    Add sales representatives to manage customer accounts
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesReps.map((rep) => (
                    <div
                      key={rep.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`sales-rep-${rep.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold">
                            {rep.firstName} {rep.lastName}
                          </p>
                          <Badge variant={rep.active ? 'default' : 'secondary'}>
                            {rep.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rep.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          {rep.territory && (
                            <p className="text-xs text-muted-foreground">Territory: {rep.territory}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Commission: <span className="font-semibold">{(rep as any).commissionPercentage || 0}%</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCommissionDialog({ isOpen: true, salesRep: rep })}
                          data-testid={`button-view-commissions-${rep.id}`}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Commissions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSalesRepDialog(rep)}
                          data-testid={`button-edit-rep-${rep.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIER COMMITMENTS TAB */}
        <TabsContent value="commitments">
          <TierCommitmentPage />
        </TabsContent>

        {/* QR CODES TAB */}
        <TabsContent value="qr-codes">
          <B2bQRCodes />
        </TabsContent>

        {/* SLIDESHOW TAB */}
        <TabsContent value="slideshow">
          <B2bSlideshowManager />
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes">
          <NotesManager appType="b2b" />
        </TabsContent>

        {/* PAYROLL TAB */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payroll Management
              </CardTitle>
              <CardDescription>
                Review earned commissions and assign them to pay periods (Next payroll: {nextPayrollDate})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPayrollCommissions ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : !payrollCommissions || payrollCommissions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No earned commissions awaiting payroll</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCommissionIds.size > 0 && (
                    <div className="bg-secondary p-4 rounded-lg flex items-center justify-between gap-4">
                      <p className="font-medium">{selectedCommissionIds.size} commission{selectedCommissionIds.size !== 1 ? 's' : ''} selected</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setSelectedCommissionIds(new Set())}
                          variant="outline"
                          size="sm"
                          data-testid="button-clear-selection"
                        >
                          Clear Selection
                        </Button>
                        <Button
                          onClick={() => sendPayrollEmail.mutate(Array.from(selectedCommissionIds))}
                          disabled={sendPayrollEmail.isPending || selectedCommissionIds.size === 0 || !payrollAdminEmail}
                          size="sm"
                          className="gap-2"
                          data-testid="button-send-payroll-email"
                        >
                          <Send className="h-4 w-4" />
                          {sendPayrollEmail.isPending ? "Sending..." : "Send to Payroll"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {payrollCommissions.map((commission) => (
                    <Card key={commission.id} className="border" data-testid={`payroll-commission-${commission.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex gap-4 mb-4">
                          <input
                            type="checkbox"
                            id={`commission-${commission.id}`}
                            checked={selectedCommissionIds.has(commission.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedCommissionIds);
                              if (e.target.checked) {
                                newSet.add(commission.id);
                              } else {
                                newSet.delete(commission.id);
                              }
                              setSelectedCommissionIds(newSet);
                            }}
                            className="mt-1"
                            data-testid={`checkbox-commission-${commission.id}`}
                          />
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                            <div>
                              <p className="text-xs text-muted-foreground">Sales Rep</p>
                              <p className="font-medium">{commission.salesRep?.firstName} {commission.salesRep?.lastName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Order</p>
                              <p className="font-medium">#{commission.order?.orderNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="font-medium">${Number(commission.commissionAmount).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Status</p>
                              <Badge variant="secondary" className="mt-1">{commission.status}</Badge>
                            </div>
                          </div>
                        </div>
                        {payrollCommissionId === commission.id ? (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label htmlFor={`payperiod-${commission.id}`} className="text-xs mb-1 block">Pay Period (e.g., "Jan 2024" or "2024-01")</Label>
                              <Input
                                id={`payperiod-${commission.id}`}
                                placeholder={nextPayrollDate}
                                value={payrollPayPeriod || nextPayrollDate}
                                onChange={(e) => setPayrollPayPeriod(e.target.value)}
                                data-testid={`input-pay-period-${commission.id}`}
                              />
                            </div>
                            <Button
                              onClick={() => updateCommissionPayPeriod.mutate({ commissionId: commission.id, payPeriod: payrollPayPeriod })}
                              disabled={updateCommissionPayPeriod.isPending || !payrollPayPeriod}
                              size="sm"
                              data-testid={`button-confirm-pay-period-${commission.id}`}
                            >
                              {updateCommissionPayPeriod.isPending ? "Saving..." : "Mark Paid"}
                            </Button>
                            <Button
                              onClick={() => {
                                setPayrollCommissionId(null);
                                setPayrollPayPeriod("");
                              }}
                              variant="outline"
                              size="sm"
                              data-testid={`button-cancel-pay-period-${commission.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => {
                              setPayrollCommissionId(commission.id);
                              setPayrollPayPeriod("");
                            }}
                            size="sm"
                            data-testid={`button-assign-pay-period-${commission.id}`}
                          >
                            Assign to Pay Period
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMISSIONS TAB */}
        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Commission History by Sales Rep
              </CardTitle>
              <CardDescription>
                View earned and paid commissions for each sales representative
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!salesReps || salesReps.length === 0 ? (
                  <p className="text-muted-foreground">No sales representatives found</p>
                ) : (
                  salesReps.map((rep) => (
                    <Button
                      key={rep.id}
                      onClick={() => setCommissionDialog({ isOpen: true, salesRep: rep })}
                      variant="outline"
                      className="h-auto p-4 justify-start"
                      data-testid={`button-view-commissions-${rep.id}`}
                    >
                      <div className="text-left">
                        <p className="font-medium">{rep.firstName} {rep.lastName}</p>
                        <p className="text-xs text-muted-foreground">{rep.email}</p>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your admin account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    data-testid="input-current-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="input-confirm-password"
                    minLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  data-testid="button-change-password"
                >
                  {isChangingPassword ? "Changing Password..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Payroll Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payroll Settings
              </CardTitle>
              <CardDescription>
                Configure payroll schedule and auto-assignment of commissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="payroll-frequency">Pay Frequency</Label>
                  <Select value={payrollFrequency} onValueChange={setPayrollFrequency}>
                    <SelectTrigger id="payroll-frequency" data-testid="select-payroll-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payroll-payday">Next Payday</Label>
                  <Button
                    id="payroll-payday"
                    variant="outline"
                    onClick={() => setShowPaydayCalendar(!showPaydayCalendar)}
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-select-payday"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {payrollPayday ? format(payrollPayday, 'MMM d, yyyy') : 'Select a date'}
                  </Button>
                  {showPaydayCalendar && (
                    <div className="border rounded-md p-3 bg-white">
                      <input
                        type="date"
                        value={payrollPayday ? payrollPayday.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setPayrollPayday(new Date(e.target.value));
                          }
                        }}
                        className="w-full p-2 border rounded-md"
                        data-testid="input-payday-date"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select your next payroll date. Future payroll dates will be calculated based on the frequency you selected.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payroll-admin-name">Payroll Administrator Name</Label>
                  <Input
                    id="payroll-admin-name"
                    placeholder="e.g., John Smith"
                    value={payrollAdminName}
                    onChange={(e) => setPayrollAdminName(e.target.value)}
                    data-testid="input-payroll-admin-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payroll-admin-email">Payroll Administrator Email</Label>
                  <Input
                    id="payroll-admin-email"
                    type="email"
                    placeholder="payroll@company.com"
                    value={payrollAdminEmail}
                    onChange={(e) => setPayrollAdminEmail(e.target.value)}
                    data-testid="input-payroll-admin-email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager-emails">Manager Email Addresses (for notifications)</Label>
                  <textarea
                    id="manager-emails"
                    className="w-full min-h-20 p-3 border rounded-md border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="manager1@company.com, manager2@company.com"
                    value={managerEmails}
                    onChange={(e) => setManagerEmails(e.target.value)}
                    data-testid="textarea-manager-emails"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter one or more email addresses separated by commas. Managers will receive notifications when orders are placed, order status changes, or payroll is sent.
                  </p>
                </div>
                <Button
                  onClick={handleSavePayrollSettings}
                  disabled={isSavingPayrollSettings || !payrollPayday || !payrollAdminEmail}
                  data-testid="button-save-payroll-settings"
                >
                  {isSavingPayrollSettings ? "Saving..." : "Save Payroll Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Commission Backfill Card */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Commission Management
              </CardTitle>
              <CardDescription>
                Backfill missing commissions for existing orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If commissions are missing for existing orders, click the button below to generate them retroactively.
              </p>
              <Button
                onClick={handleBackfillCommissions}
                disabled={isBackfillingCommissions}
                data-testid="button-backfill-commissions"
              >
                {isBackfillingCommissions ? "Backfilling Commissions..." : "Backfill Missing Commissions"}
              </Button>
            </CardContent>
          </Card>

          {/* Welcome Statement Card */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Welcome Statement
              </CardTitle>
              <CardDescription>
                Customize the welcome message that appears on the catalog page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="welcome-statement">Welcome Statement</Label>
                  <textarea
                    id="welcome-statement"
                    className="w-full min-h-24 p-3 border rounded-md border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={welcomeStatement}
                    onChange={(e) => setWelcomeStatement(e.target.value)}
                    placeholder="Enter the welcome message..."
                    data-testid="input-welcome-statement"
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be displayed on the wholesale catalog page under the customer's store name
                  </p>
                </div>
                <Button
                  onClick={handleSaveWelcomeStatement}
                  disabled={isSavingWelcomeStatement}
                  data-testid="button-save-welcome"
                >
                  {isSavingWelcomeStatement ? "Saving..." : "Save Welcome Statement"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tier Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Tiers
              </CardTitle>
              <CardDescription>
                Manage category-specific pricing tiers for different beverage types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedTierCategory} onValueChange={setSelectedTierCategory}>
                <TabsList className="flex flex-wrap w-full h-auto gap-2 p-2">
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat} data-testid={`tab-${cat}-tiers`} className="flex-1 min-w-[100px]">
                      {categoryLabels[cat]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {categories.map((category) => {
                  const tiersForCategory = adminTiers?.filter(tier => tier.category === category) || [];
                  return (
                    <TabsContent key={category} value={category} className="mt-4">
                      {loadingAdminTiers ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : !tiersForCategory || tiersForCategory.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No pricing tiers configured for {categoryLabels[category]}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {tiersForCategory.map((tier) => (
                          <div
                            key={`${tier.id}-${tier.active}`}
                            className={`flex items-center justify-between p-4 rounded-lg border ${!tier.active ? 'opacity-60' : ''}`}
                            data-testid={`tier-${tier.id}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{tier.tierName}</p>
                                <Badge variant={tier.active ? 'default' : 'secondary'}>
                                  {tier.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {tier.discountPercentage}% wholesale discount
                              </p>
                              {tier.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tier.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditTier(tier)}
                                data-testid={`button-edit-tier-${tier.id}`}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`tier-${tier.id}-switch`} className="text-sm cursor-pointer">
                                  {tier.active ? 'Active' : 'Inactive'}
                                </Label>
                                <Switch
                                  id={`tier-${tier.id}-switch`}
                                  checked={tier.active}
                                  onCheckedChange={() => handleToggleTier(tier.id, tier.active)}
                                  data-testid={`switch-tier-${tier.id}`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                          Note: Inactive tiers will not appear on the public pricing page or in the customer approval dropdown. 
                          Existing customers assigned to inactive tiers will retain their pricing.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>

          {/* Admin Management Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Administrators
                  </CardTitle>
                  <CardDescription>
                    Manage admin accounts who can access this dashboard
                  </CardDescription>
                </div>
                <Button
                  onClick={() => openAdminDialog()}
                  size="sm"
                  data-testid="button-add-admin"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Admin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAdmins ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !admins || admins.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No administrators found
                </p>
              ) : (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${!admin.active ? 'opacity-60' : ''}`}
                      data-testid={`admin-${admin.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">
                            {admin.firstName} {admin.lastName}
                          </p>
                          <Badge variant={admin.active ? 'default' : 'secondary'}>
                            {admin.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openAdminDialog(admin)}
                          data-testid={`button-edit-admin-${admin.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteAdminDialog({ isOpen: true, admin })}
                                disabled={
                                  admin.id === currentUser?.id || 
                                  (admin.active && admins.filter(a => a.active).length <= 1)
                                }
                                data-testid={`button-delete-admin-${admin.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {admin.id === currentUser?.id ? (
                              <p>Cannot delete your own admin account</p>
                            ) : admin.active && admins.filter(a => a.active).length <= 1 ? (
                              <p>Cannot delete the last active admin</p>
                            ) : (
                              <p>Delete this administrator</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                    Note: You cannot delete your own admin account or the last active administrator. 
                    At least one active admin must remain to manage the system.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={approveDialog.isOpen} onOpenChange={(open) => setApproveDialog({ isOpen: open, customer: approveDialog.customer })}>
        <DialogContent data-testid="dialog-approve-customer">
          <DialogHeader>
            <DialogTitle className="font-serif">Approve Customer</DialogTitle>
            <DialogDescription>
              Assign a pricing tier for {approveDialog.customer?.accountName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pricing Tier *</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger data-testid="select-tier">
                  <SelectValue placeholder="Select pricing tier" />
                </SelectTrigger>
                <SelectContent>
                  {loadingActiveTiers ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading tiers...</div>
                  ) : !manuallyAssignableTiers || manuallyAssignableTiers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No active tiers available</div>
                  ) : (
                    manuallyAssignableTiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.tierName} ({tier.discountPercentage}% off)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground italic">
                Note: Tier 2 is automatically assigned when cart reaches 5+ cases
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              A temporary password will be generated from their phone number and sent via email.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog({ isOpen: false, customer: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!selectedTier || isApproving}
              data-testid="button-confirm-approve"
            >
              {isApproving ? "Approving..." : "Approve & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission History Dialog */}
      <Dialog open={commissionDialog.isOpen} onOpenChange={(open) => setCommissionDialog({ isOpen: open, salesRep: commissionDialog.salesRep })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-commissions">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Commission History - {commissionDialog.salesRep?.firstName} {commissionDialog.salesRep?.lastName}
            </DialogTitle>
            <DialogDescription>
              {commissionDialog.salesRep?.email}
            </DialogDescription>
          </DialogHeader>

          {loadingCommissions ? (
            <div className="space-y-3 py-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !commissions || commissions.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Commissions Yet</h3>
              <p className="text-muted-foreground">This sales representative has not earned any commissions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commissions.map((commission) => (
                <Card key={commission.id} data-testid={`commission-${commission.id}`}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="font-serif text-lg mb-2">
                          Order #{commission.order?.orderNumber || commission.orderId}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {commission.order?.orderDate ? format(new Date(commission.order.orderDate), "MMM d, yyyy") : commission.createdAt ? format(new Date(commission.createdAt), "MMM d, yyyy") : "N/A"}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${Number(commission.commissionAmount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-start flex-wrap">
                        <Badge variant={commission.paidToSalesRep ? "default" : "secondary"}>
                          {commission.paidToSalesRep ? "Paid" : commission.status === "pending" ? "Pending" : "Earned"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Order Total</p>
                          <p className="font-semibold">${Number(commission.orderTotal).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Commission %</p>
                          <p className="font-semibold">{Number(commission.commissionPercentage).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-semibold capitalize">{commission.status}</p>
                        </div>
                        {commission.paidToSalesRepAt && (
                          <div>
                            <p className="text-muted-foreground">Paid Date</p>
                            <p className="font-semibold">{format(new Date(commission.paidToSalesRepAt), "MMM d, yyyy")}</p>
                          </div>
                        )}
                      </div>
                      
                      {!commission.paidToSalesRep && commission.status === "completed" && (
                        <div className="pt-3 border-t">
                          <Button
                            size="sm"
                            onClick={() => markCommissionPaidMutation.mutate(commission.id)}
                            disabled={markCommissionPaidMutation.isPending}
                            data-testid={`button-mark-paid-${commission.id}`}
                          >
                            {markCommissionPaidMutation.isPending ? "Marking as Paid..." : "Mark as Paid in Payroll"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCommissionDialog({ isOpen: false, salesRep: null })}
              data-testid="button-close-commissions"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales Rep Dialog */}
      <Dialog open={salesRepDialog.isOpen} onOpenChange={(open) => setSalesRepDialog({ isOpen: open, salesRep: salesRepDialog.salesRep })}>
        <DialogContent data-testid="dialog-sales-rep">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {salesRepDialog.salesRep ? "Edit" : "Add"} Sales Representative
            </DialogTitle>
            <DialogDescription>
              {salesRepDialog.salesRep ? "Update sales representative details" : "Create a new sales representative account"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalesRepSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={salesRepForm.firstName}
                  onChange={(e) => setSalesRepForm({ ...salesRepForm, firstName: e.target.value })}
                  data-testid="input-first-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={salesRepForm.lastName}
                  onChange={(e) => setSalesRepForm({ ...salesRepForm, lastName: e.target.value })}
                  data-testid="input-last-name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={salesRepForm.email}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, email: e.target.value })}
                data-testid="input-email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={salesRepForm.phoneNumber}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, phoneNumber: e.target.value })}
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="territory">Territory</Label>
              <Input
                id="territory"
                value={salesRepForm.territory}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, territory: e.target.value })}
                data-testid="input-territory"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionPercentage">Commission Percentage (%) *</Label>
              <Input
                id="commissionPercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={salesRepForm.commissionPercentage}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, commissionPercentage: e.target.value })}
                data-testid="input-commission-percentage"
                required
              />
              <p className="text-xs text-muted-foreground">
                Percentage of order total earned as commission (e.g., 5 for 5%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {salesRepDialog.salesRep ? "(leave blank to keep current)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                value={salesRepForm.password}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, password: e.target.value })}
                data-testid="input-password"
                required={!salesRepDialog.salesRep}
                minLength={6}
              />
              {!salesRepDialog.salesRep && (
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSalesRepDialog({ isOpen: false, salesRep: null })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingSalesRep || isUpdatingSalesRep}
                data-testid="button-save-sales-rep"
              >
                {(isCreatingSalesRep || isUpdatingSalesRep) ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Tier Dialog */}
      <Dialog open={editTierDialog.isOpen} onOpenChange={(open) => setEditTierDialog({ isOpen: open, tier: editTierDialog.tier })}>
        <DialogContent data-testid="dialog-edit-tier">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Pricing Tier</DialogTitle>
            <DialogDescription>
              Update the discount percentage and description for {editTierDialog.tier?.tierName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tier-category">Category</Label>
              <Input
                id="tier-category"
                value={editTierDialog.tier?.category || "Wine"}
                disabled
                className="bg-muted"
                data-testid="input-tier-category"
              />
              <p className="text-xs text-muted-foreground">
                Category cannot be changed after creation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-percentage">Discount Percentage (%) *</Label>
              <Input
                id="discount-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editTierForm.discountPercentage}
                onChange={(e) => setEditTierForm({ ...editTierForm, discountPercentage: parseFloat(e.target.value) || 0 })}
                data-testid="input-discount-percentage"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter a value between 0 and 100
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier-description">Description</Label>
              <Textarea
                id="tier-description"
                value={editTierForm.description}
                onChange={(e) => setEditTierForm({ ...editTierForm, description: e.target.value })}
                data-testid="input-tier-description"
                placeholder="Optional description for this tier"
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {editTierForm.description.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTierDialog({ isOpen: false, tier: null })}
              data-testid="button-cancel-edit-tier"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTier}
              disabled={isUpdatingTier}
              data-testid="button-save-tier"
            >
              {isUpdatingTier ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Dialog */}
      <Dialog open={adminDialog.isOpen} onOpenChange={(open) => setAdminDialog({ isOpen: open, admin: adminDialog.admin })}>
        <DialogContent data-testid="dialog-admin">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {adminDialog.admin ? "Edit" : "Add"} Administrator
            </DialogTitle>
            <DialogDescription>
              {adminDialog.admin ? "Update administrator details" : "Create a new administrator account"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-first-name">First Name *</Label>
                <Input
                  id="admin-first-name"
                  value={adminForm.firstName}
                  onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
                  data-testid="input-admin-first-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-last-name">Last Name *</Label>
                <Input
                  id="admin-last-name"
                  value={adminForm.lastName}
                  onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
                  data-testid="input-admin-last-name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">Email *</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                data-testid="input-admin-email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">
                Password {adminDialog.admin ? "(leave blank to keep current)" : "*"}
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                data-testid="input-admin-password"
                required={!adminDialog.admin}
                minLength={6}
              />
              {!adminDialog.admin ? (
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              ) : (
                <p className="text-xs text-muted-foreground">Leave blank to keep current password</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdminDialog({ isOpen: false, admin: null })}
                data-testid="button-cancel-admin"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingAdmin || isUpdatingAdmin}
                data-testid="button-save-admin"
              >
                {(isCreatingAdmin || isUpdatingAdmin) ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Confirmation */}
      <AlertDialog open={deleteAdminDialog.isOpen} onOpenChange={(open) => setDeleteAdminDialog({ isOpen: open, admin: deleteAdminDialog.admin })}>
        <AlertDialogContent data-testid="dialog-delete-admin-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Administrator?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deleteAdminDialog.admin?.firstName} {deleteAdminDialog.admin?.lastName}
              </span>
              ? This action cannot be undone. The administrator will lose access to this dashboard immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-admin">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdminConfirm}
              disabled={isDeletingAdmin}
              data-testid="button-confirm-delete-admin"
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAdmin ? "Deleting..." : "Delete Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Customer Dialog */}
      <Dialog open={createCustomerDialog} onOpenChange={setCreateCustomerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-customer">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Create New Customer</DialogTitle>
            <DialogDescription>
              Manually create a new wholesale customer account
            </DialogDescription>
          </DialogHeader>

          <Form {...createCustomerForm}>
            <form onSubmit={createCustomerForm.handleSubmit(handleCreateCustomerSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={createCustomerForm.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-account-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createCustomerForm.control}
                name="primaryContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={createCustomerForm.control}
              name="customerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Type</FormLabel>
                  <Select value={field.value || ""} onValueChange={(value) => field.onChange(value || undefined)}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-customer-type">
                        <SelectValue placeholder="Select customer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="retail_liquor">Retail Liquor</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="private_club">Private Club</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={createCustomerForm.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-create-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createCustomerForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} data-testid="input-create-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={createCustomerForm.control}
              name="billingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Address *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-create-billing-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={createCustomerForm.control}
                name="billingCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-billing-city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createCustomerForm.control}
                name="billingState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-billing-state" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createCustomerForm.control}
                name="billingZipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-billing-zip" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={createCustomerForm.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-license-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createCustomerForm.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-tax-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={createCustomerForm.control}
                name="tierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Tier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-create-tier">
                          <SelectValue placeholder="Select tier..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {manuallyAssignableTiers?.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id}>
                            {tier.tierName} ({tier.discountPercentage}% off)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground italic mt-1">
                      Note: Tier 2 is automatically assigned when cart reaches 5+ cases
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentUser?.type === 'admin' ? (
                <FormField
                  control={createCustomerForm.control}
                  name="salesRepId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Rep (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-create-sales-rep">
                            <SelectValue placeholder="Select sales rep..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salesReps?.filter(rep => rep.active).map((rep) => (
                            <SelectItem key={rep.id} value={rep.id}>
                              {rep.firstName} {rep.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="flex items-center justify-center bg-muted rounded-md p-3 h-full">
                  <p className="text-sm text-muted-foreground">
                    You will be auto-assigned as the Sales Representative
                  </p>
                </div>
              )}
            </div>

            <FormField
              control={createCustomerForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-create-notes" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 bg-muted rounded-md">
              <FormField
                control={createCustomerForm.control}
                name="autoGeneratePassword"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-auto-generate-password"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">
                      Auto-generate password from phone number (last 6 digits)
                    </FormLabel>
                  </FormItem>
                )}
              />

              {!createCustomerForm.watch("autoGeneratePassword") && (
                <FormField
                  control={createCustomerForm.control}
                  name="customPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Password *</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field} 
                          placeholder="Enter custom password (min 6 characters)"
                          data-testid="input-custom-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={createCustomerForm.control}
              name="autoApprove"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 p-4 bg-muted rounded-md">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-auto-approve"
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">
                    Auto-approve and send login credentials via email
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateCustomerDialog(false)}
                data-testid="button-cancel-create-customer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingCustomer}
                data-testid="button-submit-create-customer"
              >
                {isCreatingCustomer ? "Creating..." : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editCustomerDialog.isOpen} onOpenChange={(open) => setEditCustomerDialog({ isOpen: open, customer: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-customer">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information and pricing tier
            </DialogDescription>
          </DialogHeader>
          <Form {...editCustomerForm}>
          <form onSubmit={editCustomerForm.handleSubmit(handleEditCustomerSubmit)} className="space-y-4">
            {/* Account Status - Prominent at top */}
            <div className="p-4 bg-muted rounded-md space-y-4">
              <FormField
                control={editCustomerForm.control}
                name="accountStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Account Status</FormLabel>
                    {currentUser?.type === 'admin' ? (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status" className="w-full max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending_approval">Pending Approval</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-background rounded-md">
                        <Badge variant={field.value === 'active' ? 'default' : 'secondary'}>
                          {field.value?.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">(cannot be changed)</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Inactive customers won't appear on the Where to Buy page
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editCustomerForm.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Customer Type</FormLabel>
                    <Select value={field.value || ""} onValueChange={(value) => field.onChange(value || undefined)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-customer-type" className="w-full max-w-xs">
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="retail_liquor">Retail Liquor</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="private_club">Private Club</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={editCustomerForm.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-account-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCustomerForm.control}
                name="primaryContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={editCustomerForm.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCustomerForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Billing Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editCustomerForm.control}
                  name="billingAddress"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-billing-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCustomerForm.control}
                  name="billingCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-billing-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCustomerForm.control}
                  name="billingState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-billing-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCustomerForm.control}
                  name="billingZipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-billing-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={editCustomerForm.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-license-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCustomerForm.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-tax-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Store Locations Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Store Locations</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLocationDialog({ 
                    isOpen: true, 
                    location: null, 
                    customerId: editCustomerDialog.customer?.id 
                  })}
                  data-testid="button-add-location"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Each location appears separately on the Where to Buy page. All locations share the same pricing tier.
              </p>
              
              {customerLocations.length === 0 ? (
                <div className="p-4 bg-muted rounded-md text-center text-muted-foreground">
                  <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No store locations added yet.</p>
                  <p className="text-xs">Click "Add Location" to add the first store location.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerLocations.map((location) => (
                    <div 
                      key={location.id} 
                      className="p-3 bg-muted rounded-md flex items-start justify-between gap-2"
                      data-testid={`location-card-${location.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{location.storeName}</span>
                          {location.isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                          {!location.showOnWhereToBuy && (
                            <Badge variant="outline" className="text-xs">Hidden</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {location.storeAddress}, {location.storeCity}, {location.storeState} {location.storeZipCode}
                        </p>
                        {(location.storePhone || location.storeEmail) && (
                          <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                            {location.storePhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {location.storePhone}
                              </span>
                            )}
                            {location.storeEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {location.storeEmail}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setLocationDialog({ 
                            isOpen: true, 
                            location, 
                            customerId: editCustomerDialog.customer?.id 
                          })}
                          data-testid={`button-edit-location-${location.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLocation(location.id)}
                          data-testid={`button-delete-location-${location.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Featured Products Section (Manual product assignments for Where to Buy) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Featured Products</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pre-populate products for the "Where to Buy" page before actual orders exist. 
                  Useful for launch or when customers carry products not yet ordered through B2B.
                  Products expire after 12 months but are renewed if actual orders are placed.
                </p>

                {/* Product Selection */}
                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !selectedProductIds.includes(value)) {
                        setSelectedProductIds([...selectedProductIds, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-featured-product">
                      <SelectValue placeholder="Select product to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts?.filter(p => 
                        !customerManualProducts.some(mp => mp.productId === p.id) &&
                        !selectedProductIds.includes(p.id)
                      ).map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.sku ? `(${product.sku})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedProductIds.length === 0 || isSavingManualProducts}
                    onClick={handleAddManualProducts}
                    data-testid="button-add-featured-products"
                  >
                    {isSavingManualProducts ? "Adding..." : `Add ${selectedProductIds.length > 0 ? `(${selectedProductIds.length})` : ""}`}
                  </Button>
                </div>

                {/* Selected products to add */}
                {selectedProductIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedProductIds.map((productId) => {
                      const product = allProducts?.find(p => p.id === productId);
                      return (
                        <Badge
                          key={productId}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => setSelectedProductIds(selectedProductIds.filter(id => id !== productId))}
                        >
                          {product?.name || productId}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Currently assigned featured products */}
                {customerManualProducts.length === 0 ? (
                  <div className="p-4 bg-muted rounded-md text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No featured products assigned.</p>
                    <p className="text-xs">Products from actual orders are automatically shown on Where to Buy.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Currently Featured ({customerManualProducts.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {customerManualProducts.map((mp) => (
                        <Badge
                          key={mp.id}
                          variant="outline"
                          className="text-xs"
                          data-testid={`featured-product-${mp.id}`}
                        >
                          {mp.product?.name || 'Unknown Product'}
                          <span className="text-muted-foreground ml-1">
                            (exp: {new Date(mp.expiresAt).toLocaleDateString()})
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 p-0"
                            onClick={() => handleRemoveManualProduct(mp.id)}
                            data-testid={`button-remove-featured-${mp.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Legacy Shipping Address - Hidden but kept for backward compatibility */}
            <div className="hidden">
              <FormField
                control={editCustomerForm.control}
                name="shippingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editCustomerForm.control}
                name="shippingCity"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editCustomerForm.control}
                name="shippingState"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editCustomerForm.control}
                name="shippingZipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={editCustomerForm.control}
                name="tierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Tier (Optional)</FormLabel>
                    <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value || undefined)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-tier">
                          <SelectValue placeholder="No tier assigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {manuallyAssignableTiers?.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id}>
                            {tier.tierName} ({tier.discountPercentage}% off)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground italic mt-1">
                      Note: Tier 2 is automatically assigned when cart reaches 5+ cases
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentUser?.type === 'admin' ? (
                <FormField
                  control={editCustomerForm.control}
                  name="salesRepId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Rep (Optional)</FormLabel>
                      <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value || undefined)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-sales-rep">
                            <SelectValue placeholder="No sales rep assigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salesReps?.map((rep) => (
                            <SelectItem key={rep.id} value={rep.id}>
                              {rep.firstName} {rep.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="flex items-center justify-center bg-muted rounded-md p-3 h-full">
                  <p className="text-sm text-muted-foreground">
                    Sales rep assignment cannot be changed
                  </p>
                </div>
              )}
            </div>

            <FormField
              control={editCustomerForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-edit-notes" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-4 bg-muted rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Password Management</h4>
                  <p className="text-sm text-muted-foreground">Reset customer's password and send credentials email</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleResetPassword(editCustomerDialog.customer?.id, editCustomerDialog.customer?.emailAddress)}
                  data-testid="button-reset-password"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditCustomerDialog({ isOpen: false, customer: null })}
                data-testid="button-cancel-edit-customer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingCustomer}
                data-testid="button-submit-edit-customer"
              >
                {isUpdatingCustomer ? "Updating..." : "Update Customer"}
              </Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Location Dialog */}
      <Dialog open={locationDialog.isOpen} onOpenChange={(open) => {
        if (!open) setLocationDialog({ isOpen: false, location: null, customerId: null });
      }}>
        <DialogContent className="max-w-md" data-testid="dialog-location">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {locationDialog.location ? "Edit Store Location" : "Add Store Location"}
            </DialogTitle>
            <DialogDescription>
              {locationDialog.location ? "Update the store location details" : "Add a new store location for this customer"}
            </DialogDescription>
          </DialogHeader>
          <LocationForm
            location={locationDialog.location}
            customer={editCustomerDialog.customer}
            onSave={handleSaveLocation}
            onCancel={() => setLocationDialog({ isOpen: false, location: null, customerId: null })}
            isSaving={isSavingLocation}
          />
        </DialogContent>
      </Dialog>

      {/* Manual Order Entry Dialog */}
      <Dialog open={manualOrderDialog} onOpenChange={setManualOrderDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-manual-order">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Create Manual Order</DialogTitle>
            <DialogDescription>
              Create an order on behalf of a customer
            </DialogDescription>
          </DialogHeader>

          <Form {...manualOrderForm}>
            <form onSubmit={manualOrderForm.handleSubmit(handleManualOrderSubmit)} className="space-y-4">
              <FormField
                control={manualOrderForm.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-manual-order-customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeCustomers?.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.accountName} - {customer.tier?.tierName || "No tier"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Order Items *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addOrderItem}
                    data-testid="button-add-order-item"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {orderItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start border p-3 rounded-md">
                    <div className="flex-1 space-y-3">
                      <FormField
                        control={manualOrderForm.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-product-${index}`}>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {adminProducts?.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} - ${product.price}/case ({product.caseSize} bottles)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={manualOrderForm.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity (cases)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                data-testid={`input-quantity-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {orderItems.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeOrderItem(index)}
                        className="mt-8"
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <FormField
                control={manualOrderForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-manual-order-notes" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualOrderDialog(false)}
                  data-testid="button-cancel-manual-order"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-manual-order"
                >
                  Create Order
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Order History Dialog */}
      <Dialog open={orderHistoryDialog.isOpen} onOpenChange={(open) => setOrderHistoryDialog({ isOpen: open, customer: orderHistoryDialog.customer })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-order-history">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Order History - {orderHistoryDialog.customer?.accountName}
            </DialogTitle>
            <DialogDescription>
              {orderHistoryDialog.customer?.emailAddress}
            </DialogDescription>
          </DialogHeader>

          {loadingOrderHistory ? (
            <div className="space-y-3 py-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !customerOrderHistory || customerOrderHistory.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground">This customer has not placed any orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customerOrderHistory.map((order) => (
                <Card key={order.id} data-testid={`admin-order-${order.id}`}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="font-serif text-lg mb-2">
                          Order #{order.orderNumber}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(order.orderDate), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0} case(s)
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${Number(order.total).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <Badge variant={getOrderStatusBadgeVariant(order.status)}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm mb-3">Order Items:</h4>
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-muted-foreground text-xs">SKU: {item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${Number(item.lineTotal).toFixed(2)}</p>
                            <p className="text-muted-foreground text-xs">
                              {item.quantity} case(s) @ ${Number(item.unitPrice).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOrderHistoryDialog({ isOpen: false, customer: null })}
              data-testid="button-close-order-history"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirmation Dialog */}
      <AlertDialog open={deleteOrderDialog.isOpen} onOpenChange={(open) => setDeleteOrderDialog({ isOpen: open, order: deleteOrderDialog.order })}>
        <AlertDialogContent data-testid="dialog-delete-order-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order <span className="font-semibold">{deleteOrderDialog.order?.orderNumber}</span>? This will also delete all associated commissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-order">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteOrder(deleteOrderDialog.order.id);
                  toast({
                    title: "Success",
                    description: "Order deleted successfully",
                  });
                  setDeleteOrderDialog({ isOpen: false, order: null });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to delete order",
                    variant: "destructive",
                  });
                }
              }}
              disabled={isDeletingOrder}
              data-testid="button-confirm-delete-order"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingOrder ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
