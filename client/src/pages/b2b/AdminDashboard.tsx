import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useB2bAdminCustomers, useB2bApproveCustomer, useB2bRejectCustomer, useCreateB2bCustomer, useUpdateB2bCustomer } from "@/hooks/useB2bAdminCustomers";
import { useB2bAdminOrders, useB2bAdminSalesReps, useB2bAdminTiers, useB2bAdmins, useChangeAdminPassword, useCreateSalesRep, useUpdateSalesRep, useCreateAdmin, useUpdateAdmin, useDeleteAdmin, useToggleTierActive, useUpdateTier, useB2bAdminProducts, useCreateManualOrder } from "@/hooks/useB2bAdmin";
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
import { Users, CheckCircle2, Building, Mail, Phone, ShoppingCart, UserCog, Settings as SettingsIcon, Lock, Plus, Edit, DollarSign, Pencil, Trash2, Shield, Image, Calendar, Send, QrCode, Wine, LogOut } from "lucide-react";
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
  emailAddress: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZipCode: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZipCode: z.string().optional(),
  taxId: z.string().optional(),
  tierId: z.string().optional(),
  salesRepId: z.string().min(1, "Sales representative assignment is required"),
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
  emailAddress: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZipCode: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZipCode: z.string().optional(),
  taxId: z.string().optional(),
  tierId: z.string().optional(),
  salesRepId: z.string().min(1, "Sales representative assignment is required"),
  accountStatus: z.enum(["pending_approval", "active", "inactive"]),
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

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user: currentUser } = useB2bAuth();
  const { data: pendingCustomers, isLoading: loadingPending } = useB2bAdminCustomers("pending_approval");
  const { data: activeCustomers, isLoading: loadingActive } = useB2bAdminCustomers("active");
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

  const markCommissionPaidMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const res = await apiRequest('PATCH', `/api/b2b/admin/commissions/${commissionId}/paid`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/sales-reps', commissionDialog.salesRep?.id, 'commissions'] });
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

  // Commission history dialog state
  const [commissionDialog, setCommissionDialog] = useState<{ isOpen: boolean; salesRep: any | null }>({
    isOpen: false,
    salesRep: null,
  });
  const { data: commissions, isLoading: loadingCommissions } = useQuery<any[]>({
    queryKey: ['/api/b2b/admin/sales-reps', commissionDialog.salesRep?.id, 'commissions'],
    enabled: !!commissionDialog.salesRep?.id,
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
      emailAddress: "",
      phoneNumber: "",
      billingAddress: "",
      billingCity: "",
      billingState: "",
      billingZipCode: "",
      shippingAddress: "",
      shippingCity: "",
      shippingState: "",
      shippingZipCode: "",
      taxId: "",
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
  const editCustomerForm = useForm<EditCustomerFormData>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      accountName: "",
      primaryContactName: "",
      emailAddress: "",
      phoneNumber: "",
      billingAddress: "",
      billingCity: "",
      billingState: "",
      billingZipCode: "",
      shippingAddress: "",
      shippingCity: "",
      shippingState: "",
      shippingZipCode: "",
      taxId: "",
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
      const result = await createCustomer(data);
      
      toast({
        title: "Customer Created Successfully",
        description: data.autoApprove 
          ? `${data.accountName} has been created and approved. Login credentials have been sent to ${data.emailAddress}. The password is the last 6 digits of their phone number.`
          : `${data.accountName} has been created and is pending approval.`,
      });

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

  const handlePlaceOrderForCustomer = (customer: any) => {
    // Only admins can place orders for customers
    if (currentUser?.type !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can place orders for customers",
        variant: "destructive",
      });
      return;
    }

    // Store admin impersonation info in localStorage
    localStorage.setItem('admin_impersonating', JSON.stringify({
      customerId: customer.id,
      customerName: customer.accountName,
      customerEmail: customer.emailAddress,
    }));

    // Navigate to customer catalog
    window.location.href = `/b2b/catalog`;
  };

  const handleEditCustomer = (customer: any) => {
    // Only admins can edit customers
    if (currentUser?.type !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can edit customers",
        variant: "destructive",
      });
      return;
    }

    setEditCustomerDialog({ isOpen: true, customer });
    editCustomerForm.reset({
      accountName: customer.accountName || "",
      primaryContactName: customer.primaryContactName || "",
      emailAddress: customer.emailAddress || "",
      phoneNumber: customer.phoneNumber || "",
      billingAddress: customer.billingAddress || "",
      billingCity: customer.billingCity || "",
      billingState: customer.billingState || "",
      billingZipCode: customer.billingZipCode || "",
      shippingAddress: customer.shippingAddress || "",
      shippingCity: customer.shippingCity || "",
      shippingState: customer.shippingState || "",
      shippingZipCode: customer.shippingZipCode || "",
      taxId: customer.taxId || "",
      tierId: customer.tier?.id || "",
      salesRepId: customer.salesRep?.id || "",
      accountStatus: customer.accountStatus || "active",
      notes: customer.notes || "",
    });
  };

  const handleEditCustomerSubmit = async (data: EditCustomerFormData) => {
    if (!editCustomerDialog.customer) return;

    // Only admins can edit customers
    if (currentUser?.type !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can edit customers",
        variant: "destructive",
      });
      setEditCustomerDialog({ isOpen: false, customer: null });
      return;
    }

    try {
      await updateCustomer({
        customerId: editCustomerDialog.customer.id,
        data: {
          accountName: data.accountName,
          primaryContactName: data.primaryContactName,
          emailAddress: data.emailAddress,
          phoneNumber: data.phoneNumber,
          billingAddress: data.billingAddress,
          billingCity: data.billingCity,
          billingState: data.billingState,
          billingZipCode: data.billingZipCode,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingState: data.shippingState,
          shippingZipCode: data.shippingZipCode,
          taxId: data.taxId,
          tierId: data.tierId,
          salesRepId: data.salesRepId,
          accountStatus: data.accountStatus,
          notes: data.notes,
        },
      });

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
              <p className="text-muted-foreground">Business Type:</p>
              <p className="font-medium capitalize">{customer.businessType || "N/A"}</p>
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

          <div className="pt-3 border-t flex gap-2">
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
            {currentUser?.type === 'admin' && (
              <>
                {!isPending && (
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditCustomer(customer)}
                  className={isPending ? "flex-shrink-0" : "flex-1"}
                  data-testid={`button-edit-${customer.id}`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
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
              <TabsList className="grid w-full grid-cols-3 h-auto">
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
        </div>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-6">
          {currentUser?.type === 'admin' && (
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
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingCustomers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">
                Active ({activeCustomers?.length || 0})
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
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">${order.total}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.orderDate), "MMM d, yyyy")}
                        </p>
                      </div>
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
                  <FormLabel>Billing Address</FormLabel>
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
                    <FormLabel>City</FormLabel>
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
                    <FormLabel>State</FormLabel>
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
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-billing-zip" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={createCustomerForm.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-create-tax-id" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <FormLabel>Street Address</FormLabel>
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
                      <FormLabel>City</FormLabel>
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
                      <FormLabel>State</FormLabel>
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
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-billing-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Shipping Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editCustomerForm.control}
                  name="shippingAddress"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-shipping-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCustomerForm.control}
                  name="shippingCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-shipping-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCustomerForm.control}
                  name="shippingState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-shipping-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCustomerForm.control}
                  name="shippingZipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-shipping-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={editCustomerForm.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-tax-id" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
            </div>

            <FormField
              control={editCustomerForm.control}
              name="accountStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
    </div>
  );
}
