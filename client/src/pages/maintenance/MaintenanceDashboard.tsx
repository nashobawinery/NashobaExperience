import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Wrench, AlertTriangle, CheckCircle2, Clock, Package, 
  Plus, Settings, Calendar, BarChart3, Search, Filter,
  ClipboardList, Cog, Box, Users, FileText, TrendingUp,
  MapPin, Phone, Building2, UserCog, Trash2, Edit
} from "lucide-react";
import { format } from "date-fns";

type MaintenanceStats = {
  operationalAssets: number;
  assetsUnderMaintenance: number;
  openWorkOrders: number;
  inProgressWorkOrders: number;
  completedThisMonth: number;
  criticalWorkOrders: number;
  lowStockParts: number;
  upcomingPm: number;
};

type WorkOrder = {
  id: string;
  work_order_number: string;
  title: string;
  description: string;
  asset_id: string;
  asset_name?: string;
  asset_number?: string;
  location_name?: string;
  work_order_type: string;
  priority: string;
  status: string;
  due_date: string;
  assignee_first_name?: string;
  assignee_last_name?: string;
  requester_first_name?: string;
  requester_last_name?: string;
  created_at: string;
};

type Asset = {
  id: string;
  assetNumber: string;
  name: string;
  description: string;
  categoryName?: string;
  categoryIcon?: string;
  locationName?: string;
  manufacturer: string;
  model: string;
  status: string;
  criticality: string;
};

type Part = {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  locationName?: string;
  binLocation: string;
  quantityOnHand: number;
  minimumStock: number;
  reorderPoint: number;
  unitCost: string;
  preferredVendor: string;
};

type PreventiveSchedule = {
  id: string;
  name: string;
  assetName?: string;
  assetNumber?: string;
  frequency: string;
  nextDue: string;
  workOrderTitle?: string;
  assigneeFirstName?: string;
  assigneeLastName?: string;
  active: boolean;
};

type Location = {
  id: string;
  locationName: string;
  locationType: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phoneNumber?: string;
  managerUserId?: string;
  managerFirstName?: string;
  managerLastName?: string;
  active: boolean;
};

type Technician = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  specialties: string[];
  certifications: string[];
  locationName?: string;
  phoneNumber?: string;
  available: boolean;
};

type MaintenanceTechnician = {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  cellPhone?: string;
  workPhone?: string;
  isExternal: boolean;
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyZip?: string;
  companyPhone?: string;
  skills?: string[];
  specialties?: string[];
  certifications?: string[];
  hourlyRate?: string;
  primaryLocationId?: string;
  locationName?: string;
  available: boolean;
  isActive: boolean;
  notes?: string;
};

type MaintenanceLocation = {
  id: string;
  name: string;
  description?: string;
  locationType?: string;
  parentLocationId?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  accessInstructions?: string;
  is_active?: boolean;
};

type WorkOrderNote = {
  id: string;
  workOrderId: string;
  userId?: string;
  technicianId?: string;
  noteType: string;
  title?: string;
  content: string;
  previousStatus?: string;
  newStatus?: string;
  hoursWorked?: string;
  attachmentUrls?: string[];
  isSystemGenerated: boolean;
  createdAt: string;
  userFirstName?: string;
  userLastName?: string;
  techFirstName?: string;
  techLastName?: string;
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  waiting_parts: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  waiting_tech: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  on_hold: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const assetStatusColors: Record<string, string> = {
  operational: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  retired: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  disposed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function MaintenanceDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showNewWorkOrderDialog, setShowNewWorkOrderDialog] = useState(false);
  const [showNewAssetDialog, setShowNewAssetDialog] = useState(false);
  const [showNewPartDialog, setShowNewPartDialog] = useState(false);
  const [showNewLocationDialog, setShowNewLocationDialog] = useState(false);
  const [showNewTechnicianDialog, setShowNewTechnicianDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingTechnician, setEditingTechnician] = useState<MaintenanceTechnician | null>(null);
  const [viewingWorkOrder, setViewingWorkOrder] = useState<WorkOrder | null>(null);
  const [showPmScheduleDialog, setShowPmScheduleDialog] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<MaintenanceStats>({
    queryKey: ["/api/maintenance/stats"],
  });

  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/maintenance/work-orders"],
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["/api/maintenance/assets"],
  });

  const { data: parts = [], isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["/api/maintenance/parts"],
  });

  const { data: pmSchedules = [], isLoading: pmLoading } = useQuery<PreventiveSchedule[]>({
    queryKey: ["/api/maintenance/pm-schedules"],
  });

  const { data: categories = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/maintenance/categories"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/shared/locations"],
  });

  const { data: users = [] } = useQuery<Array<{ id: string; firstName: string; lastName: string }>>({
    queryKey: ["/api/platform-users"],
  });

  const { data: maintenanceTechnicians = [] } = useQuery<MaintenanceTechnician[]>({
    queryKey: ["/api/maintenance/technicians"],
  });

  const { data: maintenanceLocations = [] } = useQuery<MaintenanceLocation[]>({
    queryKey: ["/api/maintenance/locations"],
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/maintenance/work-orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      setShowNewWorkOrderDialog(false);
      toast({ title: "Work order created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create work order", variant: "destructive" });
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/maintenance/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      setShowNewAssetDialog(false);
      toast({ title: "Asset created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create asset", variant: "destructive" });
    },
  });

  const createPartMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/maintenance/parts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      setShowNewPartDialog(false);
      toast({ title: "Part created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create part", variant: "destructive" });
    },
  });

  const updateWorkOrderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      return apiRequest("PUT", `/api/maintenance/work-orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      toast({ title: "Work order updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update work order", variant: "destructive" });
    },
  });

  // Work order notes - conditional query when viewing a work order
  const { data: workOrderNotes = [] } = useQuery<WorkOrderNote[]>({
    queryKey: ["/api/maintenance/work-orders", viewingWorkOrder?.id, "notes"],
    queryFn: async () => {
      if (!viewingWorkOrder?.id) return [];
      const res = await fetch(`/api/maintenance/work-orders/${viewingWorkOrder.id}/notes`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    },
    enabled: !!viewingWorkOrder?.id,
  });

  const createWorkOrderNoteMutation = useMutation({
    mutationFn: async ({ workOrderId, ...data }: { workOrderId: string } & Record<string, unknown>) => {
      return apiRequest("POST", `/api/maintenance/work-orders/${workOrderId}/notes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/work-orders", viewingWorkOrder?.id, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      toast({ title: "Note added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    },
  });

  // PM Schedule mutations
  const createPmScheduleMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/maintenance/pm-schedules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/pm-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      setShowPmScheduleDialog(false);
      toast({ title: "PM schedule created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create PM schedule", variant: "destructive" });
    },
  });

  // Location mutations
  const createLocationMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/shared/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared/locations"] });
      setShowNewLocationDialog(false);
      toast({ title: "Location created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create location", variant: "destructive" });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      return apiRequest("PUT", `/api/shared/locations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared/locations"] });
      setEditingLocation(null);
      toast({ title: "Location updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update location", variant: "destructive" });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shared/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared/locations"] });
      toast({ title: "Location deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete location", variant: "destructive" });
    },
  });

  // Technician mutations
  const createTechnicianMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/maintenance/technicians", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/technicians"] });
      setShowNewTechnicianDialog(false);
      toast({ title: "Technician added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add technician", variant: "destructive" });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      return apiRequest("PUT", `/api/maintenance/technicians/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/technicians"] });
      setEditingTechnician(null);
      toast({ title: "Technician updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update technician", variant: "destructive" });
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/maintenance/technicians/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/technicians"] });
      toast({ title: "Technician removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove technician", variant: "destructive" });
    },
  });

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch = searchQuery === "" || 
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.work_order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.asset_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || wo.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const lowStockParts = parts.filter(p => p.quantityOnHand <= p.reorderPoint);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Maintenance Management</h1>
            <p className="text-muted-foreground">Work orders, assets, and preventive maintenance</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={showNewWorkOrderDialog} onOpenChange={setShowNewWorkOrderDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-work-order">
                  <Plus className="w-4 h-4 mr-2" />
                  New Work Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Work Order</DialogTitle>
                  <DialogDescription>Submit a new maintenance request or work order</DialogDescription>
                </DialogHeader>
                <NewWorkOrderForm 
                  assets={assets}
                  locations={locations}
                  maintenanceLocations={maintenanceLocations}
                  users={users}
                  maintenanceTechnicians={maintenanceTechnicians}
                  onSubmit={(data) => createWorkOrderMutation.mutate(data)}
                  isPending={createWorkOrderMutation.isPending}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={showNewAssetDialog} onOpenChange={setShowNewAssetDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-new-asset">
                  <Box className="w-4 h-4 mr-2" />
                  Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Asset</DialogTitle>
                  <DialogDescription>Register new equipment or facility for maintenance tracking</DialogDescription>
                </DialogHeader>
                <NewAssetForm 
                  categories={categories}
                  locations={locations}
                  onSubmit={(data) => createAssetMutation.mutate(data)}
                  isPending={createAssetMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap w-full justify-start gap-1">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="work-orders" className="gap-2" data-testid="tab-work-orders">
              <ClipboardList className="w-4 h-4" />
              Work Orders
            </TabsTrigger>
            <TabsTrigger value="assets" className="gap-2" data-testid="tab-assets">
              <Cog className="w-4 h-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="parts" className="gap-2" data-testid="tab-parts">
              <Package className="w-4 h-4" />
              Parts
            </TabsTrigger>
            <TabsTrigger value="pm" className="gap-2" data-testid="tab-pm">
              <Calendar className="w-4 h-4" />
              Preventive
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Operational Assets"
                value={stats?.operationalAssets || 0}
                icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
                testId="stat-operational-assets"
              />
              <StatCard
                title="Under Maintenance"
                value={stats?.assetsUnderMaintenance || 0}
                icon={<Wrench className="w-5 h-5 text-yellow-500" />}
                testId="stat-under-maintenance"
              />
              <StatCard
                title="Open Work Orders"
                value={stats?.openWorkOrders || 0}
                icon={<ClipboardList className="w-5 h-5 text-blue-500" />}
                testId="stat-open-wo"
              />
              <StatCard
                title="Critical Issues"
                value={stats?.criticalWorkOrders || 0}
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                variant={stats?.criticalWorkOrders ? "destructive" : "default"}
                testId="stat-critical"
              />
              <StatCard
                title="In Progress"
                value={stats?.inProgressWorkOrders || 0}
                icon={<Clock className="w-5 h-5 text-purple-500" />}
                testId="stat-in-progress"
              />
              <StatCard
                title="Completed This Month"
                value={stats?.completedThisMonth || 0}
                icon={<TrendingUp className="w-5 h-5 text-green-500" />}
                testId="stat-completed"
              />
              <StatCard
                title="Low Stock Parts"
                value={stats?.lowStockParts || 0}
                icon={<Package className="w-5 h-5 text-orange-500" />}
                variant={stats?.lowStockParts ? "warning" : "default"}
                testId="stat-low-stock"
              />
              <StatCard
                title="Upcoming PM"
                value={stats?.upcomingPm || 0}
                icon={<Calendar className="w-5 h-5 text-blue-500" />}
                testId="stat-upcoming-pm"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Critical Work Orders</CardTitle>
                  <CardDescription>High priority items requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {workOrders.filter(wo => wo.priority === 'critical' && wo.status !== 'completed').length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No critical work orders</p>
                    ) : (
                      <div className="space-y-3">
                        {workOrders
                          .filter(wo => wo.priority === 'critical' && wo.status !== 'completed')
                          .slice(0, 5)
                          .map(wo => (
                            <div key={wo.id} className="p-3 rounded-lg border hover-elevate">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm">{wo.work_order_number}</span>
                                <Badge className={statusColors[wo.status]}>{wo.status.replace('_', ' ')}</Badge>
                              </div>
                              <p className="text-sm mt-1">{wo.title}</p>
                              {wo.asset_name && (
                                <p className="text-xs text-muted-foreground mt-1">{wo.asset_name}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
                  <CardDescription>Parts below reorder threshold</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {lowStockParts.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">All parts adequately stocked</p>
                    ) : (
                      <div className="space-y-3">
                        {lowStockParts.slice(0, 5).map(part => (
                          <div key={part.id} className="p-3 rounded-lg border hover-elevate">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm">{part.partNumber}</span>
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                {part.quantityOnHand} left
                              </Badge>
                            </div>
                            <p className="text-sm mt-1">{part.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Reorder at: {part.reorderPoint} | Vendor: {part.preferredVendor || 'N/A'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="work-orders" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Work Orders</CardTitle>
                    <CardDescription>{filteredWorkOrders.length} work orders</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-48"
                        data-testid="input-search-wo"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40" data-testid="select-status-filter">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="waiting_parts">Waiting on Parts</SelectItem>
                        <SelectItem value="waiting_tech">Waiting on Tech</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-32" data-testid="select-priority-filter">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>WO #</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Filed By</TableHead>
                        <TableHead>Date Filed</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workOrdersLoading ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredWorkOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            No work orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWorkOrders.map((wo) => (
                          <TableRow key={wo.id} data-testid={`row-work-order-${wo.id}`}>
                            <TableCell className="font-medium">{wo.work_order_number}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{wo.title}</p>
                                <p className="text-xs text-muted-foreground">{wo.work_order_type}</p>
                              </div>
                            </TableCell>
                            <TableCell>{wo.asset_name || '-'}</TableCell>
                            <TableCell>
                              <Badge className={priorityColors[wo.priority]}>
                                {wo.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[wo.status]}>
                                {wo.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {wo.requester_first_name ? `${wo.requester_first_name} ${wo.requester_last_name}` : '-'}
                            </TableCell>
                            <TableCell>
                              {wo.created_at ? format(new Date(wo.created_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              {wo.assignee_first_name ? `${wo.assignee_first_name} ${wo.assignee_last_name}` : '-'}
                            </TableCell>
                            <TableCell>
                              {wo.due_date ? format(new Date(wo.due_date), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setViewingWorkOrder(wo)}
                                  data-testid={`button-view-wo-${wo.id}`}
                                >
                                  View
                                </Button>
                                {(wo.status === 'new' || wo.status === 'open') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateWorkOrderMutation.mutate({ 
                                      ...wo,
                                      id: wo.id, 
                                      status: 'in_progress' 
                                    })}
                                    data-testid={`button-start-wo-${wo.id}`}
                                  >
                                    Start
                                  </Button>
                                )}
                                {wo.status === 'in_progress' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateWorkOrderMutation.mutate({ 
                                      ...wo,
                                      id: wo.id, 
                                      status: 'completed' 
                                    })}
                                    data-testid={`button-complete-wo-${wo.id}`}
                                  >
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Asset Registry</CardTitle>
                    <CardDescription>{assets.length} assets tracked</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criticality</TableHead>
                        <TableHead>Manufacturer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : assets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No assets registered. Add your first asset.
                          </TableCell>
                        </TableRow>
                      ) : (
                        assets.map((asset) => (
                          <TableRow key={asset.id} data-testid={`row-asset-${asset.id}`}>
                            <TableCell className="font-medium">{asset.assetNumber}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{asset.name}</p>
                                {asset.model && <p className="text-xs text-muted-foreground">{asset.model}</p>}
                              </div>
                            </TableCell>
                            <TableCell>{asset.categoryName || '-'}</TableCell>
                            <TableCell>{asset.locationName || '-'}</TableCell>
                            <TableCell>
                              <Badge className={assetStatusColors[asset.status]}>
                                {asset.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{asset.criticality}</Badge>
                            </TableCell>
                            <TableCell>{asset.manufacturer || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parts" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Parts Inventory</CardTitle>
                    <CardDescription>{parts.length} parts tracked</CardDescription>
                  </div>
                  <Dialog open={showNewPartDialog} onOpenChange={setShowNewPartDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-new-part">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Part
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Part</DialogTitle>
                        <DialogDescription>Add a new spare part to inventory</DialogDescription>
                      </DialogHeader>
                      <NewPartForm 
                        locations={locations}
                        onSubmit={(data) => createPartMutation.mutate(data)}
                        isPending={createPartMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Qty On Hand</TableHead>
                        <TableHead>Reorder Point</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Vendor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partsLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : parts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No parts in inventory. Add your first part.
                          </TableCell>
                        </TableRow>
                      ) : (
                        parts.map((part) => (
                          <TableRow 
                            key={part.id} 
                            data-testid={`row-part-${part.id}`}
                            className={part.quantityOnHand <= part.reorderPoint ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                          >
                            <TableCell className="font-medium">{part.partNumber}</TableCell>
                            <TableCell>{part.name}</TableCell>
                            <TableCell>{part.category || '-'}</TableCell>
                            <TableCell>
                              {part.locationName || '-'}
                              {part.binLocation && <span className="text-xs text-muted-foreground ml-1">({part.binLocation})</span>}
                            </TableCell>
                            <TableCell>
                              <span className={part.quantityOnHand <= part.reorderPoint ? "text-orange-600 font-medium" : ""}>
                                {part.quantityOnHand}
                              </span>
                            </TableCell>
                            <TableCell>{part.reorderPoint}</TableCell>
                            <TableCell>${Number(part.unitCost || 0).toFixed(2)}</TableCell>
                            <TableCell>{part.preferredVendor || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pm" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Preventive Maintenance Schedules</CardTitle>
                    <CardDescription>Recurring maintenance tasks</CardDescription>
                  </div>
                  <Button onClick={() => setShowPmScheduleDialog(true)} data-testid="button-create-pm">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Schedule Name</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Work Order Title</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pmLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : pmSchedules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No preventive maintenance schedules configured
                          </TableCell>
                        </TableRow>
                      ) : (
                        pmSchedules.map((pm) => (
                          <TableRow key={pm.id} data-testid={`row-pm-${pm.id}`}>
                            <TableCell className="font-medium">{pm.name}</TableCell>
                            <TableCell>
                              {pm.assetName ? (
                                <div>
                                  <p>{pm.assetName}</p>
                                  <p className="text-xs text-muted-foreground">{pm.assetNumber}</p>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{pm.workOrderTitle}</TableCell>
                            <TableCell className="capitalize">{pm.frequency}</TableCell>
                            <TableCell>
                              {pm.nextDue ? format(new Date(pm.nextDue), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              {pm.assigneeFirstName ? `${pm.assigneeFirstName} ${pm.assigneeLastName}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={pm.active ? "default" : "secondary"}>
                                {pm.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Locations Management */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Locations
                    </CardTitle>
                    <CardDescription>Manage facility locations for work orders and assets</CardDescription>
                  </div>
                  <Dialog open={showNewLocationDialog} onOpenChange={setShowNewLocationDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-location">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Location</DialogTitle>
                        <DialogDescription>Create a new facility location</DialogDescription>
                      </DialogHeader>
                      <LocationForm 
                        users={users}
                        onSubmit={(data) => createLocationMutation.mutate(data)}
                        isPending={createLocationMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {locations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No locations configured</p>
                        <p className="text-sm">Add locations to assign to work orders</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {locations.map((loc) => (
                          <div 
                            key={loc.id} 
                            className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                            data-testid={`location-${loc.id}`}
                          >
                            <div>
                              <p className="font-medium">{loc.locationName}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="capitalize">{loc.locationType}</Badge>
                                {loc.city && <span>{loc.city}, {loc.state}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => setEditingLocation(loc)}
                                data-testid={`edit-location-${loc.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => deleteLocationMutation.mutate(loc.id)}
                                data-testid={`delete-location-${loc.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Technicians Management */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserCog className="w-5 h-5" />
                      Technicians
                    </CardTitle>
                    <CardDescription>Manage maintenance technicians and their specialties</CardDescription>
                  </div>
                  <Dialog open={showNewTechnicianDialog} onOpenChange={setShowNewTechnicianDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-technician">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Technician</DialogTitle>
                        <DialogDescription>Register a user as a maintenance technician</DialogDescription>
                      </DialogHeader>
                      <TechnicianForm 
                        users={users}
                        maintenanceLocations={maintenanceLocations}
                        onSubmit={(data) => createTechnicianMutation.mutate(data)}
                        isPending={createTechnicianMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {maintenanceTechnicians.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No technicians configured</p>
                        <p className="text-sm">Add technicians to assign work orders</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {maintenanceTechnicians.map((tech: MaintenanceTechnician) => (
                          <div 
                            key={tech.id} 
                            className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                            data-testid={`technician-${tech.id}`}
                          >
                            <div>
                              <p className="font-medium">
                                {tech.firstName} {tech.lastName}
                                {tech.isExternal && tech.companyName && (
                                  <span className="text-muted-foreground ml-1 text-sm">({tech.companyName})</span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                <Badge variant={tech.isActive ? "default" : "secondary"}>
                                  {tech.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant="outline">
                                  {tech.isExternal ? 'Contractor' : 'Internal'}
                                </Badge>
                                {tech.available && (
                                  <Badge variant="outline" className="text-green-600">Available</Badge>
                                )}
                                {tech.email && <span>{tech.email}</span>}
                                {tech.locationName && <span>{tech.locationName}</span>}
                              </div>
                              {tech.specialties && tech.specialties.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {tech.specialties.slice(0, 3).map((spec: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">{spec}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => setEditingTechnician(tech)}
                                data-testid={`edit-technician-${tech.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => deleteTechnicianMutation.mutate(tech.id)}
                                data-testid={`delete-technician-${tech.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Edit Location Dialog */}
            <Dialog open={!!editingLocation} onOpenChange={(open) => !open && setEditingLocation(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Location</DialogTitle>
                  <DialogDescription>Update location details</DialogDescription>
                </DialogHeader>
                {editingLocation && (
                  <LocationForm 
                    users={users}
                    initialData={editingLocation}
                    onSubmit={(data) => updateLocationMutation.mutate({ id: editingLocation.id, ...data })}
                    isPending={updateLocationMutation.isPending}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Technician Dialog */}
            <Dialog open={!!editingTechnician} onOpenChange={(open) => !open && setEditingTechnician(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Technician</DialogTitle>
                  <DialogDescription>Update technician details</DialogDescription>
                </DialogHeader>
                {editingTechnician && (
                  <TechnicianForm 
                    users={users}
                    maintenanceLocations={maintenanceLocations}
                    initialData={editingTechnician}
                    onSubmit={(data) => updateTechnicianMutation.mutate({ id: editingTechnician.id, ...data })}
                    isPending={updateTechnicianMutation.isPending}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        {/* Work Order Detail Dialog with Notes */}
        <Dialog open={!!viewingWorkOrder} onOpenChange={(open) => !open && setViewingWorkOrder(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                {viewingWorkOrder?.work_order_number} - {viewingWorkOrder?.title}
              </DialogTitle>
              <DialogDescription>
                Work order details and activity log
              </DialogDescription>
            </DialogHeader>
            {viewingWorkOrder && (
              <div className="space-y-6">
                {/* Work Order Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge className={statusColors[viewingWorkOrder.status] || ''}>
                        {viewingWorkOrder.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <div className="mt-1">
                      <Badge className={priorityColors[viewingWorkOrder.priority] || ''}>
                        {viewingWorkOrder.priority}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <p className="text-sm font-medium">{viewingWorkOrder.work_order_type}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                    <p className="text-sm font-medium">
                      {viewingWorkOrder.due_date ? format(new Date(viewingWorkOrder.due_date), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Asset</Label>
                    <p className="text-sm font-medium">{viewingWorkOrder.asset_name || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Assigned To</Label>
                    <p className="text-sm font-medium">
                      {viewingWorkOrder.assignee_first_name ? `${viewingWorkOrder.assignee_first_name} ${viewingWorkOrder.assignee_last_name}` : '-'}
                    </p>
                  </div>
                </div>
                
                {viewingWorkOrder.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{viewingWorkOrder.description}</p>
                  </div>
                )}
                
                <Separator />

                {/* Status Change */}
                <div>
                  <Label className="text-sm font-medium">Update Status</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['new', 'in_progress', 'waiting_parts', 'waiting_tech', 'on_hold', 'completed', 'cancelled'].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={viewingWorkOrder.status === status ? 'default' : 'outline'}
                        onClick={() => {
                          updateWorkOrderMutation.mutate({
                            ...viewingWorkOrder,
                            id: viewingWorkOrder.id,
                            status
                          });
                          setViewingWorkOrder({ ...viewingWorkOrder, status });
                        }}
                        disabled={viewingWorkOrder.status === status}
                        data-testid={`button-status-${status}`}
                      >
                        {status.replace(/_/g, ' ')}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Add Note Form */}
                <WorkOrderNoteForm 
                  workOrderId={viewingWorkOrder.id}
                  currentStatus={viewingWorkOrder.status}
                  maintenanceTechnicians={maintenanceTechnicians}
                  onSubmit={(data) => createWorkOrderNoteMutation.mutate({ workOrderId: viewingWorkOrder.id, ...data })}
                  isPending={createWorkOrderNoteMutation.isPending}
                />

                {/* Notes/Activity Log */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Activity Log</Label>
                  <ScrollArea className="h-[200px] border rounded-lg p-3">
                    {workOrderNotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet</p>
                    ) : (
                      <div className="space-y-3">
                        {workOrderNotes.map((note) => (
                          <div key={note.id} className="p-3 rounded-lg bg-muted/50 border" data-testid={`note-${note.id}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs capitalize">{note.noteType}</Badge>
                                {note.newStatus && note.previousStatus && (
                                  <span className="text-xs text-muted-foreground">
                                    {note.previousStatus.replace(/_/g, ' ')} → {note.newStatus.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            {note.title && <p className="text-sm font-medium">{note.title}</p>}
                            <p className="text-sm">{note.content}</p>
                            {note.hoursWorked && (
                              <p className="text-xs text-muted-foreground mt-1">Hours worked: {note.hoursWorked}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              By: {note.userFirstName || note.techFirstName || 'System'} {note.userLastName || note.techLastName || ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* PM Schedule Dialog */}
        <Dialog open={showPmScheduleDialog} onOpenChange={setShowPmScheduleDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Preventive Maintenance Schedule</DialogTitle>
              <DialogDescription>Set up a recurring maintenance task</DialogDescription>
            </DialogHeader>
            <PmScheduleForm 
              assets={assets}
              maintenanceTechnicians={maintenanceTechnicians}
              maintenanceLocations={maintenanceLocations}
              onSubmit={(data) => createPmScheduleMutation.mutate(data)}
              isPending={createPmScheduleMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  variant = "default",
  testId 
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  variant?: "default" | "destructive" | "warning";
  testId: string;
}) {
  const bgClass = variant === "destructive" 
    ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" 
    : variant === "warning"
    ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
    : "";
    
  return (
    <Card className={bgClass} data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function NewWorkOrderForm({ 
  assets, 
  locations, 
  maintenanceLocations,
  users,
  maintenanceTechnicians,
  onSubmit, 
  isPending 
}: { 
  assets: Asset[];
  locations: Location[];
  maintenanceLocations: MaintenanceLocation[];
  users: Array<{ id: string; firstName: string; lastName: string }>;
  maintenanceTechnicians: MaintenanceTechnician[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assetId: "",
    locationId: "",
    maintenanceLocationId: "",
    workOrderType: "corrective",
    priority: "medium",
    assignedToId: "",
    maintenanceTechnicianId: "",
    dueDate: "",
    estimatedHours: "",
    instructions: "",
    notificationEmail: "",
    sendNotification: false,
  });

  const [showInlineLocation, setShowInlineLocation] = useState(false);
  const [showInlineTechnician, setShowInlineTechnician] = useState(false);
  const [showInlineAsset, setShowInlineAsset] = useState(false);
  const [inlineLocationName, setInlineLocationName] = useState("");
  const [inlineTechFirstName, setInlineTechFirstName] = useState("");
  const [inlineTechLastName, setInlineTechLastName] = useState("");
  const [inlineTechEmail, setInlineTechEmail] = useState("");
  const [inlineTechType, setInlineTechType] = useState<"internal" | "contractor">("contractor");
  const [inlineTechCompany, setInlineTechCompany] = useState("");
  const [inlineAssetName, setInlineAssetName] = useState("");
  const [inlineAssetDescription, setInlineAssetDescription] = useState("");

  const createLocationMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("POST", "/api/maintenance/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/locations"] });
      toast({ title: "Location added" });
      setShowInlineLocation(false);
      setInlineLocationName("");
    },
    onError: () => {
      toast({ title: "Failed to add location", variant: "destructive" });
    }
  });

  const createTechnicianMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/maintenance/technicians", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/technicians"] });
      toast({ title: "Technician added" });
      setShowInlineTechnician(false);
      setInlineTechFirstName("");
      setInlineTechLastName("");
      setInlineTechEmail("");
      setInlineTechCompany("");
    },
    onError: () => {
      toast({ title: "Failed to add technician", variant: "destructive" });
    }
  });

  const createInlineAssetMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", "/api/maintenance/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/assets"] });
      toast({ title: "Asset added" });
      setShowInlineAsset(false);
      setInlineAssetName("");
      setInlineAssetDescription("");
    },
    onError: () => {
      toast({ title: "Failed to add asset", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find technician email if sending notification
    let notificationEmail = formData.notificationEmail;
    if (formData.sendNotification && !notificationEmail && formData.maintenanceTechnicianId) {
      const tech = maintenanceTechnicians.find(t => t.id === formData.maintenanceTechnicianId);
      if (tech?.email) notificationEmail = tech.email;
    }
    
    onSubmit({
      ...formData,
      assetId: formData.assetId || undefined,
      locationId: formData.locationId || undefined,
      maintenanceLocationId: formData.maintenanceLocationId || undefined,
      assignedToId: formData.assignedToId || undefined,
      maintenanceTechnicianId: formData.maintenanceTechnicianId || undefined,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      notificationEmail: formData.sendNotification ? notificationEmail : undefined,
      sendNotification: formData.sendNotification,
    });
  };

  const handleInlineLocationSave = () => {
    if (inlineLocationName.trim()) {
      createLocationMutation.mutate({ name: inlineLocationName.trim() });
    }
  };

  const handleInlineTechnicianSave = () => {
    if (inlineTechFirstName.trim() && inlineTechLastName.trim()) {
      createTechnicianMutation.mutate({
        firstName: inlineTechFirstName.trim(),
        lastName: inlineTechLastName.trim(),
        email: inlineTechEmail.trim() || undefined,
        isExternal: inlineTechType === "contractor",
        companyName: inlineTechType === "contractor" ? inlineTechCompany.trim() : undefined,
        specialties: [],
        certifications: [],
        isActive: true,
        available: true,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="max-h-[50vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            data-testid="input-wo-title"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            data-testid="input-wo-description"
          />
        </div>
        {/* Asset with inline add */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="assetId">Asset</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowInlineAsset(!showInlineAsset)}
              data-testid="button-add-inline-asset"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add New
            </Button>
          </div>
          {showInlineAsset ? (
            <div className="space-y-2 p-3 border rounded-md bg-muted/20">
              <Input
                placeholder="Asset name *"
                value={inlineAssetName}
                onChange={(e) => setInlineAssetName(e.target.value)}
                data-testid="input-inline-asset-name"
              />
              <Input
                placeholder="Description (optional)"
                value={inlineAssetDescription}
                onChange={(e) => setInlineAssetDescription(e.target.value)}
                data-testid="input-inline-asset-description"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (inlineAssetName.trim()) {
                      createInlineAssetMutation.mutate({ 
                        name: inlineAssetName.trim(),
                        description: inlineAssetDescription.trim() || undefined 
                      });
                    }
                  }}
                  disabled={!inlineAssetName.trim() || createInlineAssetMutation.isPending}
                  data-testid="button-save-inline-asset"
                >
                  {createInlineAssetMutation.isPending ? "Saving..." : "Save Asset"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowInlineAsset(false);
                    setInlineAssetName("");
                    setInlineAssetDescription("");
                  }}
                  data-testid="button-cancel-inline-asset"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Select value={formData.assetId} onValueChange={(v) => setFormData({ ...formData, assetId: v })}>
              <SelectTrigger data-testid="select-wo-asset">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.assetNumber} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Maintenance Location with inline add */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="maintenanceLocationId">Work Location</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowInlineLocation(!showInlineLocation)}
              data-testid="button-add-inline-location"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add New
            </Button>
          </div>
          {showInlineLocation ? (
            <div className="flex gap-1">
              <Input
                placeholder="Location name"
                value={inlineLocationName}
                onChange={(e) => setInlineLocationName(e.target.value)}
                className="flex-1"
                data-testid="input-inline-location-name"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleInlineLocationSave}
                disabled={!inlineLocationName.trim() || createLocationMutation.isPending}
                data-testid="button-save-inline-location"
              >
                {createLocationMutation.isPending ? "..." : "Save"}
              </Button>
            </div>
          ) : (
            <Select value={formData.maintenanceLocationId} onValueChange={(v) => setFormData({ ...formData, maintenanceLocationId: v })}>
              <SelectTrigger data-testid="select-wo-maintenance-location">
                <SelectValue placeholder="Select work location" />
              </SelectTrigger>
              <SelectContent>
                {maintenanceLocations.filter(loc => loc.is_active !== false).map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div>
          <Label htmlFor="workOrderType">Type</Label>
          <Select value={formData.workOrderType} onValueChange={(v) => setFormData({ ...formData, workOrderType: v })}>
            <SelectTrigger data-testid="select-wo-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="preventive">Preventive</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="project">Project</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
            <SelectTrigger data-testid="select-wo-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Maintenance Technician with inline add */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="maintenanceTechnicianId">Assign To Technician</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowInlineTechnician(!showInlineTechnician)}
              data-testid="button-add-inline-technician"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add New
            </Button>
          </div>
          {showInlineTechnician ? (
            <div className="space-y-2 p-3 border rounded-md bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="First name *"
                  value={inlineTechFirstName}
                  onChange={(e) => setInlineTechFirstName(e.target.value)}
                  data-testid="input-inline-tech-first-name"
                />
                <Input
                  placeholder="Last name *"
                  value={inlineTechLastName}
                  onChange={(e) => setInlineTechLastName(e.target.value)}
                  data-testid="input-inline-tech-last-name"
                />
              </div>
              <Input
                placeholder="Email"
                type="email"
                value={inlineTechEmail}
                onChange={(e) => setInlineTechEmail(e.target.value)}
                data-testid="input-inline-tech-email"
              />
              <div className="flex gap-2">
                <Select value={inlineTechType} onValueChange={(v) => setInlineTechType(v as "internal" | "contractor")}>
                  <SelectTrigger className="w-32" data-testid="select-inline-tech-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
                {inlineTechType === "contractor" && (
                  <Input
                    placeholder="Company name"
                    value={inlineTechCompany}
                    onChange={(e) => setInlineTechCompany(e.target.value)}
                    className="flex-1"
                    data-testid="input-inline-tech-company"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInlineTechnician(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleInlineTechnicianSave}
                  disabled={!inlineTechFirstName.trim() || !inlineTechLastName.trim() || createTechnicianMutation.isPending}
                  data-testid="button-save-inline-technician"
                >
                  {createTechnicianMutation.isPending ? "Saving..." : "Save Technician"}
                </Button>
              </div>
            </div>
          ) : (
            <Select value={formData.maintenanceTechnicianId} onValueChange={(v) => {
              const tech = maintenanceTechnicians.find(t => t.id === v);
              setFormData({ 
                ...formData, 
                maintenanceTechnicianId: v,
                notificationEmail: tech?.email || formData.notificationEmail
              });
            }}>
              <SelectTrigger data-testid="select-wo-technician">
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {maintenanceTechnicians.filter(t => t.isActive && t.available).map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.firstName} {tech.lastName}
                    {tech.isExternal && tech.companyName && (
                      <span className="text-muted-foreground ml-1">({tech.companyName})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            data-testid="input-wo-due-date"
          />
        </div>
        <div>
          <Label htmlFor="estimatedHours">Estimated Hours</Label>
          <Input
            id="estimatedHours"
            type="number"
            step="0.5"
            value={formData.estimatedHours}
            onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
            data-testid="input-wo-hours"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="instructions">Instructions</Label>
          <Textarea
            id="instructions"
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            rows={2}
            data-testid="input-wo-instructions"
          />
        </div>
        
        {/* Email Notification Section */}
        <div className="col-span-2 border rounded-md p-3 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="sendNotification"
              checked={formData.sendNotification}
              onChange={(e) => setFormData({ ...formData, sendNotification: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
              data-testid="checkbox-send-notification"
            />
            <Label htmlFor="sendNotification" className="font-normal cursor-pointer">
              Send email notification to assigned technician
            </Label>
          </div>
          {formData.sendNotification && (
            <Input
              type="email"
              placeholder="Notification email (auto-filled from technician)"
              value={formData.notificationEmail}
              onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
              data-testid="input-notification-email"
            />
          )}
        </div>
      </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={isPending || !formData.title} data-testid="button-submit-wo">
          {isPending ? "Creating..." : "Create Work Order"}
        </Button>
      </div>
    </form>
  );
}

function NewAssetForm({ 
  categories, 
  locations, 
  onSubmit, 
  isPending 
}: { 
  categories: Array<{ id: string; name: string }>;
  locations: Location[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    locationId: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    status: "operational",
    criticality: "medium",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      categoryId: formData.categoryId || undefined,
      locationId: formData.locationId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Asset Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-asset-name"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            data-testid="input-asset-description"
          />
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
            <SelectTrigger data-testid="select-asset-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="locationId">Location</Label>
          <Select value={formData.locationId} onValueChange={(v) => setFormData({ ...formData, locationId: v })}>
            <SelectTrigger data-testid="select-asset-location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.locationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input
            id="manufacturer"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            data-testid="input-asset-manufacturer"
          />
        </div>
        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            data-testid="input-asset-model"
          />
        </div>
        <div>
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input
            id="serialNumber"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            data-testid="input-asset-serial"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger data-testid="select-asset-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="maintenance">Under Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="criticality">Criticality</Label>
          <Select value={formData.criticality} onValueChange={(v) => setFormData({ ...formData, criticality: v })}>
            <SelectTrigger data-testid="select-asset-criticality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending || !formData.name} data-testid="button-submit-asset">
          {isPending ? "Creating..." : "Add Asset"}
        </Button>
      </div>
    </form>
  );
}

function NewPartForm({ 
  locations, 
  onSubmit, 
  isPending 
}: { 
  locations: Location[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    partNumber: "",
    name: "",
    description: "",
    category: "",
    locationId: "",
    binLocation: "",
    quantityOnHand: "0",
    minimumStock: "0",
    reorderPoint: "5",
    reorderQuantity: "10",
    unitCost: "",
    preferredVendor: "",
    vendorPartNumber: "",
    leadTimeDays: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      locationId: formData.locationId || undefined,
      quantityOnHand: parseInt(formData.quantityOnHand) || 0,
      minimumStock: parseInt(formData.minimumStock) || 0,
      reorderPoint: parseInt(formData.reorderPoint) || 0,
      reorderQuantity: parseInt(formData.reorderQuantity) || 1,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
      leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="partNumber">Part Number *</Label>
          <Input
            id="partNumber"
            value={formData.partNumber}
            onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
            required
            data-testid="input-part-number"
          />
        </div>
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-part-name"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            data-testid="input-part-description"
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Filters, Belts, Electrical"
            data-testid="input-part-category"
          />
        </div>
        <div>
          <Label htmlFor="locationId">Storage Location</Label>
          <Select value={formData.locationId} onValueChange={(v) => setFormData({ ...formData, locationId: v })}>
            <SelectTrigger data-testid="select-part-location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.locationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="binLocation">Bin/Shelf Location</Label>
          <Input
            id="binLocation"
            value={formData.binLocation}
            onChange={(e) => setFormData({ ...formData, binLocation: e.target.value })}
            placeholder="e.g., A-12, Shelf 3"
            data-testid="input-part-bin"
          />
        </div>
        <div>
          <Label htmlFor="quantityOnHand">Quantity On Hand</Label>
          <Input
            id="quantityOnHand"
            type="number"
            value={formData.quantityOnHand}
            onChange={(e) => setFormData({ ...formData, quantityOnHand: e.target.value })}
            data-testid="input-part-qty"
          />
        </div>
        <div>
          <Label htmlFor="reorderPoint">Reorder Point</Label>
          <Input
            id="reorderPoint"
            type="number"
            value={formData.reorderPoint}
            onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
            data-testid="input-part-reorder"
          />
        </div>
        <div>
          <Label htmlFor="unitCost">Unit Cost ($)</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            value={formData.unitCost}
            onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
            data-testid="input-part-cost"
          />
        </div>
        <div>
          <Label htmlFor="preferredVendor">Preferred Vendor</Label>
          <Input
            id="preferredVendor"
            value={formData.preferredVendor}
            onChange={(e) => setFormData({ ...formData, preferredVendor: e.target.value })}
            data-testid="input-part-vendor"
          />
        </div>
        <div>
          <Label htmlFor="vendorPartNumber">Vendor Part Number</Label>
          <Input
            id="vendorPartNumber"
            value={formData.vendorPartNumber}
            onChange={(e) => setFormData({ ...formData, vendorPartNumber: e.target.value })}
            data-testid="input-part-vendor-number"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending || !formData.partNumber || !formData.name} data-testid="button-submit-part">
          {isPending ? "Creating..." : "Add Part"}
        </Button>
      </div>
    </form>
  );
}

function LocationForm({ 
  users,
  initialData,
  onSubmit, 
  isPending 
}: { 
  users: Array<{ id: string; firstName: string; lastName: string }>;
  initialData?: Location;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    locationName: initialData?.locationName || "",
    locationType: initialData?.locationType || "winery",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zipCode: initialData?.zipCode || "",
    phoneNumber: initialData?.phoneNumber || "",
    managerUserId: initialData?.managerUserId || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      managerUserId: formData.managerUserId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="locationName">Location Name *</Label>
          <Input
            id="locationName"
            value={formData.locationName}
            onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
            required
            data-testid="input-location-name"
          />
        </div>
        <div>
          <Label htmlFor="locationType">Type *</Label>
          <Select value={formData.locationType} onValueChange={(v) => setFormData({ ...formData, locationType: v })}>
            <SelectTrigger data-testid="select-location-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="winery">Winery</SelectItem>
              <SelectItem value="tasting_room">Tasting Room</SelectItem>
              <SelectItem value="warehouse">Warehouse</SelectItem>
              <SelectItem value="office">Office</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="managerUserId">Manager</Label>
          <Select value={formData.managerUserId} onValueChange={(v) => setFormData({ ...formData, managerUserId: v })}>
            <SelectTrigger data-testid="select-location-manager">
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            data-testid="input-location-address"
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            data-testid="input-location-city"
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            data-testid="input-location-state"
          />
        </div>
        <div>
          <Label htmlFor="zipCode">Zip Code</Label>
          <Input
            id="zipCode"
            value={formData.zipCode}
            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            data-testid="input-location-zip"
          />
        </div>
        <div>
          <Label htmlFor="phoneNumber">Phone</Label>
          <Input
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            data-testid="input-location-phone"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending || !formData.locationName} data-testid="button-submit-location">
          {isPending ? "Saving..." : initialData ? "Update Location" : "Add Location"}
        </Button>
      </div>
    </form>
  );
}

function TechnicianForm({ 
  users,
  maintenanceLocations,
  initialData,
  onSubmit, 
  isPending 
}: { 
  users: Array<{ id: string; firstName: string; lastName: string }>;
  maintenanceLocations: MaintenanceLocation[];
  initialData?: MaintenanceTechnician;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    cellPhone: initialData?.cellPhone || "",
    isExternal: initialData?.isExternal ?? false,
    companyName: initialData?.companyName || "",
    companyAddress: initialData?.companyAddress || "",
    companyPhone: initialData?.companyPhone || "",
    userId: initialData?.userId || "",
    specialties: initialData?.specialties?.join(", ") || "",
    certifications: initialData?.certifications?.join(", ") || "",
    primaryLocationId: initialData?.primaryLocationId || "",
    hourlyRate: initialData?.hourlyRate || "",
    isActive: initialData?.isActive ?? true,
    available: initialData?.available ?? true,
    notes: initialData?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      cellPhone: formData.cellPhone || undefined,
      isExternal: formData.isExternal,
      companyName: formData.isExternal ? formData.companyName : undefined,
      companyAddress: formData.isExternal ? formData.companyAddress : undefined,
      companyPhone: formData.isExternal ? formData.companyPhone : undefined,
      userId: !formData.isExternal ? formData.userId : undefined,
      specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
      certifications: formData.certifications.split(",").map(s => s.trim()).filter(Boolean),
      primaryLocationId: formData.primaryLocationId || undefined,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      isActive: formData.isActive,
      available: formData.available,
      notes: formData.notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="max-h-[50vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="isExternal">Type *</Label>
          <Select value={formData.isExternal ? "contractor" : "internal"} onValueChange={(v) => setFormData({ ...formData, isExternal: v === "contractor" })}>
            <SelectTrigger data-testid="select-tech-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal Employee</SelectItem>
              <SelectItem value="contractor">External Contractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!formData.isExternal && (
          <div>
            <Label htmlFor="userId">Platform User</Label>
            <Select value={formData.userId} onValueChange={(v) => {
              const user = users.find(u => u.id === v);
              setFormData({ 
                ...formData, 
                userId: v,
                firstName: user?.firstName || formData.firstName,
                lastName: user?.lastName || formData.lastName 
              });
            }}>
              <SelectTrigger data-testid="select-tech-user">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            data-testid="input-tech-first-name"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            data-testid="input-tech-last-name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            data-testid="input-tech-email"
          />
        </div>
        <div>
          <Label htmlFor="cellPhone">Phone</Label>
          <Input
            id="cellPhone"
            value={formData.cellPhone}
            onChange={(e) => setFormData({ ...formData, cellPhone: e.target.value })}
            data-testid="input-tech-phone"
          />
        </div>
        
        {formData.isExternal && (
          <>
            <div className="col-span-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                data-testid="input-tech-company"
              />
            </div>
            <div>
              <Label htmlFor="companyAddress">Company Address</Label>
              <Input
                id="companyAddress"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                data-testid="input-tech-company-address"
              />
            </div>
            <div>
              <Label htmlFor="companyPhone">Company Phone</Label>
              <Input
                id="companyPhone"
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                data-testid="input-tech-company-phone"
              />
            </div>
          </>
        )}
        
        <div>
          <Label htmlFor="primaryLocationId">Primary Location</Label>
          <Select value={formData.primaryLocationId} onValueChange={(v) => setFormData({ ...formData, primaryLocationId: v })}>
            <SelectTrigger data-testid="select-tech-location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {maintenanceLocations.filter(loc => loc.is_active !== false).map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="hourlyRate">Hourly Rate</Label>
          <Input
            id="hourlyRate"
            type="number"
            step="0.01"
            value={formData.hourlyRate}
            onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
            placeholder="e.g., 75.00"
            data-testid="input-tech-rate"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="specialties">Specialties</Label>
          <Input
            id="specialties"
            value={formData.specialties}
            onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
            placeholder="e.g., HVAC, Electrical, Plumbing (comma separated)"
            data-testid="input-tech-specialties"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="certifications">Certifications</Label>
          <Input
            id="certifications"
            value={formData.certifications}
            onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
            placeholder="e.g., EPA 608, OSHA 30 (comma separated)"
            data-testid="input-tech-certifications"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            data-testid="input-tech-notes"
          />
        </div>
        <div className="col-span-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
              data-testid="checkbox-tech-active"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="available"
              checked={formData.available}
              onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
              className="w-4 h-4"
              data-testid="checkbox-tech-available"
            />
            <Label htmlFor="available">Available for work orders</Label>
          </div>
        </div>
      </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={isPending || !formData.firstName || !formData.lastName} data-testid="button-submit-technician">
          {isPending ? "Saving..." : initialData ? "Update Technician" : "Add Technician"}
        </Button>
      </div>
    </form>
  );
}

// Work Order Note Form
function WorkOrderNoteForm({
  workOrderId,
  currentStatus,
  maintenanceTechnicians,
  onSubmit,
  isPending
}: {
  workOrderId: string;
  currentStatus: string;
  maintenanceTechnicians: MaintenanceTechnician[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    noteType: 'progress',
    title: '',
    content: '',
    newStatus: '',
    hoursWorked: '',
    technicianId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    onSubmit({
      ...formData,
      previousStatus: formData.newStatus ? currentStatus : undefined,
      hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined
    });
    setFormData({ noteType: 'progress', title: '', content: '', newStatus: '', hoursWorked: '', technicianId: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <Label className="text-sm font-medium">Add Progress Note</Label>
      <div className="grid grid-cols-2 gap-3">
        <Select value={formData.noteType} onValueChange={(v) => setFormData({ ...formData, noteType: v })}>
          <SelectTrigger data-testid="select-note-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="progress">Progress Update</SelectItem>
            <SelectItem value="status_change">Status Change</SelectItem>
            <SelectItem value="parts">Parts Used</SelectItem>
            <SelectItem value="issue">Issue Found</SelectItem>
            <SelectItem value="completion">Completion</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Hours worked (optional)"
          type="number"
          step="0.25"
          value={formData.hoursWorked}
          onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
          data-testid="input-note-hours"
        />
      </div>
      {formData.noteType === 'status_change' && (
        <Select value={formData.newStatus} onValueChange={(v) => setFormData({ ...formData, newStatus: v })}>
          <SelectTrigger data-testid="select-new-status">
            <SelectValue placeholder="Select new status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting_parts">Waiting on Parts</SelectItem>
            <SelectItem value="waiting_tech">Waiting on Tech</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Input
        placeholder="Note title (optional)"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        data-testid="input-note-title"
      />
      <Textarea
        placeholder="Describe the work done, issues found, or next steps..."
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        rows={2}
        data-testid="input-note-content"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !formData.content.trim()} data-testid="button-submit-note">
          {isPending ? "Adding..." : "Add Note"}
        </Button>
      </div>
    </form>
  );
}

// PM Schedule Form
function PmScheduleForm({
  assets,
  maintenanceTechnicians,
  maintenanceLocations,
  onSubmit,
  isPending
}: {
  assets: Asset[];
  maintenanceTechnicians: MaintenanceTechnician[];
  maintenanceLocations: MaintenanceLocation[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assetId: '',
    frequency: 'monthly',
    customDays: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    workOrderTitle: '',
    workOrderDescription: '',
    workOrderPriority: 'medium',
    estimatedHours: '',
    maintenanceTechnicianId: '',
    maintenanceLocationId: '',
    generateDaysAhead: '7',
    instructions: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.workOrderTitle) return;
    onSubmit({
      ...formData,
      customDays: formData.customDays ? parseInt(formData.customDays) : undefined,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      generateDaysAhead: parseInt(formData.generateDaysAhead) || 7
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Schedule Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Monthly HVAC Filter Replacement"
            data-testid="input-pm-name"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            data-testid="input-pm-description"
          />
        </div>
        <div>
          <Label>Asset</Label>
          <Select value={formData.assetId} onValueChange={(v) => setFormData({ ...formData, assetId: v })}>
            <SelectTrigger data-testid="select-pm-asset">
              <SelectValue placeholder="Select asset (optional)" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name} ({asset.assetNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Frequency *</Label>
          <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
            <SelectTrigger data-testid="select-pm-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="semiannual">Semi-Annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="custom">Custom Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {formData.frequency === 'custom' && (
          <div>
            <Label>Custom Days Interval</Label>
            <Input
              type="number"
              value={formData.customDays}
              onChange={(e) => setFormData({ ...formData, customDays: e.target.value })}
              placeholder="e.g., 45"
              data-testid="input-pm-custom-days"
            />
          </div>
        )}
        <div>
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            data-testid="input-pm-start-date"
          />
        </div>
        <Separator className="col-span-2" />
        <div className="col-span-2">
          <Label>Work Order Title *</Label>
          <Input
            value={formData.workOrderTitle}
            onChange={(e) => setFormData({ ...formData, workOrderTitle: e.target.value })}
            placeholder="Title for generated work orders"
            data-testid="input-pm-wo-title"
          />
        </div>
        <div className="col-span-2">
          <Label>Work Order Description</Label>
          <Textarea
            value={formData.workOrderDescription}
            onChange={(e) => setFormData({ ...formData, workOrderDescription: e.target.value })}
            rows={2}
            data-testid="input-pm-wo-description"
          />
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={formData.workOrderPriority} onValueChange={(v) => setFormData({ ...formData, workOrderPriority: v })}>
            <SelectTrigger data-testid="select-pm-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estimated Hours</Label>
          <Input
            type="number"
            step="0.25"
            value={formData.estimatedHours}
            onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
            placeholder="e.g., 2.5"
            data-testid="input-pm-hours"
          />
        </div>
        <div>
          <Label>Assign to Technician</Label>
          <Select value={formData.maintenanceTechnicianId} onValueChange={(v) => setFormData({ ...formData, maintenanceTechnicianId: v })}>
            <SelectTrigger data-testid="select-pm-technician">
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              {maintenanceTechnicians.filter(t => t.isActive && t.available).map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName} {tech.isExternal ? '(External)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Location</Label>
          <Select value={formData.maintenanceLocationId} onValueChange={(v) => setFormData({ ...formData, maintenanceLocationId: v })}>
            <SelectTrigger data-testid="select-pm-location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {maintenanceLocations.filter(l => l.is_active !== false).map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Generate WO Days Ahead</Label>
          <Input
            type="number"
            value={formData.generateDaysAhead}
            onChange={(e) => setFormData({ ...formData, generateDaysAhead: e.target.value })}
            placeholder="7"
            data-testid="input-pm-days-ahead"
          />
        </div>
        <div className="col-span-2">
          <Label>Instructions</Label>
          <Textarea
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            placeholder="Step-by-step instructions for technicians"
            rows={3}
            data-testid="input-pm-instructions"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={isPending || !formData.name || !formData.workOrderTitle} data-testid="button-submit-pm">
          {isPending ? "Creating..." : "Create Schedule"}
        </Button>
      </div>
    </form>
  );
}
