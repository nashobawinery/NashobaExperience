import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin,
  Grid3X3,
  ClipboardList,
  Camera,
  FileDown,
  Search,
  Check,
  X,
  Image as ImageIcon,
  MoreVertical,
  QrCode,
  Download
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface SpotInventoryLocation {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  accessCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SpotInventoryArea {
  id: string;
  locationId: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SpotInventorySession {
  id: string;
  areaId: string;
  locationId: string;
  staffName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  area?: SpotInventoryArea;
}

interface ReportData {
  location_name: string;
  report_date: string;
  areas: { id: string; name: string }[];
  products: {
    product_id: string;
    name: string;
    total: number;
    by_area: Record<string, number>;
  }[];
}

export default function SpotInventoryAdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("locations");
  const [selectedLocation, setSelectedLocation] = useState<SpotInventoryLocation | null>(null);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isAreaDialogOpen, setIsAreaDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SpotInventoryLocation | null>(null);
  const [editingArea, setEditingArea] = useState<SpotInventoryArea | null>(null);
  const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportLocationId, setReportLocationId] = useState<string>("");
  const [qrCodeArea, setQrCodeArea] = useState<SpotInventoryArea | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ qrCode: string; url: string } | null>(null);
  const [isQrCodeLoading, setIsQrCodeLoading] = useState(false);

  const { data: locations = [], isLoading: locationsLoading } = useQuery<SpotInventoryLocation[]>({
    queryKey: ["/api/spot-inventory/locations"],
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery<SpotInventoryArea[]>({
    queryKey: ["/api/spot-inventory/areas/by-location", selectedLocation?.id],
    queryFn: async () => {
      if (!selectedLocation?.id) return [];
      const response = await fetch(`/api/spot-inventory/areas/by-location/${selectedLocation.id}`);
      if (!response.ok) throw new Error("Failed to fetch areas");
      return response.json();
    },
    enabled: activeTab === "areas" && !!selectedLocation,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<SpotInventorySession[]>({
    queryKey: ["/api/spot-inventory/sessions"],
    enabled: activeTab === "sessions",
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<ReportData>({
    queryKey: ["/api/spot-inventory/report", reportDate, reportLocationId],
    queryFn: async () => {
      const params = new URLSearchParams({ date: reportDate });
      if (reportLocationId) params.append("locationId", reportLocationId);
      const response = await fetch(`/api/spot-inventory/report?${params}`);
      if (!response.ok) throw new Error("Failed to fetch report");
      return response.json();
    },
    enabled: activeTab === "reports",
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: Partial<SpotInventoryLocation>) => {
      return apiRequest("POST", "/api/spot-inventory/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spot-inventory/locations"] });
      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      toast({ title: "Location created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating location", description: error.message, variant: "destructive" });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SpotInventoryLocation> }) => {
      return apiRequest("PATCH", `/api/spot-inventory/locations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spot-inventory/locations"] });
      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      toast({ title: "Location updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating location", description: error.message, variant: "destructive" });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/spot-inventory/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spot-inventory/locations"] });
      toast({ title: "Location deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting location", description: error.message, variant: "destructive" });
    },
  });

  const createAreaMutation = useMutation({
    mutationFn: async (data: Partial<SpotInventoryArea>) => {
      return apiRequest("POST", "/api/spot-inventory/areas", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spot-inventory/areas/by-location", selectedLocation?.id] });
      setIsAreaDialogOpen(false);
      setEditingArea(null);
      toast({ title: "Area created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating area", description: error.message, variant: "destructive" });
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SpotInventoryArea> }) => {
      return apiRequest("PATCH", `/api/spot-inventory/areas/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spot-inventory/areas/by-location", selectedLocation?.id] });
      setIsAreaDialogOpen(false);
      setEditingArea(null);
      toast({ title: "Area updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating area", description: error.message, variant: "destructive" });
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/spot-inventory/areas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spot-inventory/areas/by-location", selectedLocation?.id] });
      toast({ title: "Area deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting area", description: error.message, variant: "destructive" });
    },
  });

  const handleExportCSV = () => {
    if (!reportData || !reportData.products.length) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const titleRow = [`${reportData.location_name} — Inventory Summary — ${format(new Date(reportDate), "MMM d, yyyy")}`];
    const headers = ["Product", "Total", ...reportData.areas.map(a => a.name)];
    const rows = reportData.products.map(p => [
      p.name,
      String(p.total),
      ...reportData.areas.map(a => String(p.by_area[a.id] || 0))
    ]);

    const csvContent = [
      titleRow.join(","),
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-report-${reportDate}.csv`;
    link.click();
    toast({ title: "CSV exported successfully" });
  };

  const fetchQrCode = async (area: SpotInventoryArea) => {
    setQrCodeArea(area);
    setIsQrCodeLoading(true);
    setQrCodeData(null);
    try {
      const response = await fetch(`/api/spot-inventory/areas/${area.id}/qr-code`);
      if (!response.ok) throw new Error("Failed to fetch QR code");
      const data = await response.json();
      setQrCodeData(data);
    } catch (error: any) {
      toast({ title: "Error fetching QR code", description: error.message, variant: "destructive" });
      setQrCodeArea(null);
    } finally {
      setIsQrCodeLoading(false);
    }
  };

  const downloadQrCode = () => {
    if (!qrCodeData || !qrCodeArea) return;
    const link = document.createElement("a");
    link.href = qrCodeData.qrCode;
    link.download = `qr-code-${qrCodeArea.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
    toast({ title: "QR code downloaded" });
  };

  const handleExportXLSX = () => {
    if (!reportData || !reportData.products.length) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const titleRow = [`${reportData.location_name} — Inventory Summary — ${format(new Date(reportDate), "MMM d, yyyy")}`];
    const headers = ["Product", "Total", ...reportData.areas.map(a => a.name)];
    const rows = reportData.products.map(p => [
      p.name,
      p.total,
      ...reportData.areas.map(a => p.by_area[a.id] || 0)
    ]);

    const worksheetData = [titleRow, headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet["!cols"] = [
      { wch: 30 }, // Product name
      { wch: 10 }, // Total
      ...reportData.areas.map(() => ({ wch: 12 }))
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");
    
    XLSX.writeFile(workbook, `inventory-report-${reportDate}.xlsx`);
    toast({ title: "Excel file exported successfully" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin-hub")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Spot Inventory Check</h1>
              <p className="text-muted-foreground">Manage locations, areas, and view inventory reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="locations" data-testid="tab-locations">
              <MapPin className="h-4 w-4 mr-2" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="areas" data-testid="tab-areas">
              <Grid3X3 className="h-4 w-4 mr-2" />
              Areas
            </TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">
              <ClipboardList className="h-4 w-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <FileDown className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Inventory Locations</CardTitle>
                  <CardDescription>Manage locations where inventory counts take place</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingLocation(null);
                    setIsLocationDialogOpen(true);
                  }}
                  data-testid="button-add-location"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </CardHeader>
              <CardContent>
                {locationsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : locations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No locations configured yet</p>
                    <p className="text-sm">Add a location to start managing inventory areas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locations.map(location => (
                      <div
                        key={location.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                        data-testid={`location-card-${location.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{location.name}</h3>
                            <Badge variant={location.isActive ? "default" : "secondary"}>
                              {location.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {location.description && (
                            <p className="text-sm text-muted-foreground mt-1">{location.description}</p>
                          )}
                          {location.address && (
                            <p className="text-xs text-muted-foreground mt-1">{location.address}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-${location.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingLocation(location);
                                setIsLocationDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedLocation(location);
                                setActiveTab("areas");
                              }}
                            >
                              <Grid3X3 className="h-4 w-4 mr-2" />
                              Manage Areas
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteLocationMutation.mutate(location.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="areas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>
                    {selectedLocation ? `Areas in ${selectedLocation.name}` : "Select a Location"}
                  </CardTitle>
                  <CardDescription>
                    {selectedLocation
                      ? "Manage areas within this location for inventory counting"
                      : "Choose a location from the dropdown to manage its areas"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedLocation?.id || ""}
                    onValueChange={(value) => {
                      const loc = locations.find(l => l.id === value);
                      setSelectedLocation(loc || null);
                    }}
                  >
                    <SelectTrigger className="w-48" data-testid="select-location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLocation && (
                    <Button
                      onClick={() => {
                        setEditingArea(null);
                        setIsAreaDialogOpen(true);
                      }}
                      data-testid="button-add-area"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Area
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedLocation ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a location to view its areas</p>
                  </div>
                ) : areasLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-48 w-full" />
                    ))}
                  </div>
                ) : areas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No areas configured for this location</p>
                    <p className="text-sm">Add areas to define where staff will count inventory</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {areas.map(area => (
                      <Card key={area.id} className="hover-elevate" data-testid={`area-card-${area.id}`}>
                        <div className="aspect-video relative bg-muted flex items-center justify-center">
                          {area.photoUrl ? (
                            <img
                              src={area.photoUrl}
                              alt={area.name}
                              className="object-cover w-full h-full rounded-t-lg"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                          )}
                          <Badge className="absolute top-2 right-2" variant={area.isActive ? "default" : "secondary"}>
                            {area.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{area.name}</CardTitle>
                          {area.description && (
                            <CardDescription>{area.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter className="pt-0 gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchQrCode(area)}
                            data-testid={`button-qr-area-${area.id}`}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            QR Code
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingArea(area);
                              setIsAreaDialogOpen(true);
                            }}
                            data-testid={`button-edit-area-${area.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAreaMutation.mutate(area.id)}
                            className="text-destructive"
                            data-testid={`button-delete-area-${area.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>View completed and in-progress inventory counting sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sessions recorded yet</p>
                    <p className="text-sm">Sessions will appear here as staff complete inventory counts</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map(session => (
                        <TableRow key={session.id} data-testid={`session-row-${session.id}`}>
                          <TableCell className="font-medium">{session.staffName}</TableCell>
                          <TableCell>{session.area?.name || "Unknown"}</TableCell>
                          <TableCell>
                            <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                              {session.status === "completed" ? (
                                <><Check className="h-3 w-3 mr-1" /> Completed</>
                              ) : (
                                <>In Progress</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(session.startedAt), "MMM d, h:mm a")}</TableCell>
                          <TableCell>
                            {session.completedAt
                              ? format(new Date(session.completedAt), "MMM d, h:mm a")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Inventory Report</CardTitle>
                  <CardDescription>View consolidated inventory counts by date and location</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-40"
                    data-testid="input-report-date"
                  />
                  <Select
                    value={reportLocationId}
                    onValueChange={setReportLocationId}
                  >
                    <SelectTrigger className="w-48" data-testid="select-report-location">
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Locations</SelectItem>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={handleExportXLSX} data-testid="button-export-xlsx">
                    <FileDown className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <Skeleton className="h-96 w-full" />
                ) : !reportData || reportData.products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No inventory data for this date</p>
                    <p className="text-sm">Complete inventory counts to see them in the report</p>
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background">Product</TableHead>
                          <TableHead className="text-center font-bold min-w-20">Total</TableHead>
                          {reportData.areas.map(area => (
                            <TableHead key={area.id} className="text-center min-w-20">
                              {area.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.products.map(product => (
                          <TableRow key={product.product_id}>
                            <TableCell className="sticky left-0 bg-background font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell className="text-center font-bold">{product.total}</TableCell>
                            {reportData.areas.map(area => (
                              <TableCell key={area.id} className="text-center">
                                {product.by_area[area.id] || 0}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <LocationDialog
        isOpen={isLocationDialogOpen}
        onClose={() => {
          setIsLocationDialogOpen(false);
          setEditingLocation(null);
        }}
        location={editingLocation}
        onSave={(data) => {
          if (editingLocation) {
            updateLocationMutation.mutate({ id: editingLocation.id, data });
          } else {
            createLocationMutation.mutate(data);
          }
        }}
        isPending={createLocationMutation.isPending || updateLocationMutation.isPending}
      />

      <AreaDialog
        isOpen={isAreaDialogOpen}
        onClose={() => {
          setIsAreaDialogOpen(false);
          setEditingArea(null);
        }}
        area={editingArea}
        locationId={selectedLocation?.id || ""}
        onSave={(data) => {
          if (editingArea) {
            updateAreaMutation.mutate({ id: editingArea.id, data });
          } else {
            createAreaMutation.mutate(data);
          }
        }}
        isPending={createAreaMutation.isPending || updateAreaMutation.isPending}
      />

      <Dialog open={!!qrCodeArea} onOpenChange={() => { setQrCodeArea(null); setQrCodeData(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code for {qrCodeArea?.name}</DialogTitle>
            <DialogDescription>
              Print and place this QR code at the area location. Staff can scan it to start an inventory count session.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {isQrCodeLoading ? (
              <Skeleton className="w-64 h-64" />
            ) : qrCodeData ? (
              <>
                <div className="bg-white p-4 rounded-lg border">
                  <img 
                    src={qrCodeData.qrCode} 
                    alt={`QR Code for ${qrCodeArea?.name}`}
                    className="w-56 h-56"
                    data-testid="img-qr-code"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Scan to open inventory count for this area
                </p>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setQrCodeArea(null); setQrCodeData(null); }}
              data-testid="button-close-qr"
            >
              Close
            </Button>
            <Button 
              onClick={downloadQrCode} 
              disabled={!qrCodeData}
              data-testid="button-download-qr"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationDialog({
  isOpen,
  onClose,
  location,
  onSave,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  location: SpotInventoryLocation | null;
  onSave: (data: Partial<SpotInventoryLocation>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (location) {
        setName(location.name);
        setDescription(location.description || "");
        setAddress(location.address || "");
        setAccessCode(location.accessCode || "");
        setIsActive(location.isActive);
      } else {
        setName("");
        setDescription("");
        setAddress("");
        setAccessCode("");
        setIsActive(true);
      }
    }
  }, [isOpen, location]);

  const handleSubmit = () => {
    onSave({
      name,
      description: description || null,
      address: address || null,
      accessCode: accessCode || null,
      isActive,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "Add Location"}</DialogTitle>
          <DialogDescription>
            {location
              ? "Update the location details"
              : "Create a new location for inventory counting"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Warehouse"
              data-testid="input-location-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              data-testid="input-location-description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional address"
              data-testid="input-location-address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessCode">Staff Access Code</Label>
            <Input
              id="accessCode"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="e.g., WAREHOUSE123"
              data-testid="input-location-access-code"
            />
            <p className="text-xs text-muted-foreground">
              Staff will enter this code to access this location for inventory counting
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
              data-testid="checkbox-location-active"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isPending} data-testid="button-save-location">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AreaDialog({
  isOpen,
  onClose,
  area,
  locationId,
  onSave,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  area: SpotInventoryArea | null;
  locationId: string;
  onSave: (data: Partial<SpotInventoryArea>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (area) {
        setName(area.name);
        setDescription(area.description || "");
        setPhotoUrl(area.photoUrl || "");
        setSortOrder(area.sortOrder);
        setIsActive(area.isActive);
      } else {
        setName("");
        setDescription("");
        setPhotoUrl("");
        setSortOrder(0);
        setIsActive(true);
      }
    }
  }, [isOpen, area]);

  const handleSubmit = () => {
    onSave({
      locationId,
      name,
      description: description || null,
      photoUrl: photoUrl || null,
      sortOrder,
      isActive,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{area ? "Edit Area" : "Add Area"}</DialogTitle>
          <DialogDescription>
            {area
              ? "Update the area details"
              : "Create a new area within this location"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="areaName">Name</Label>
            <Input
              id="areaName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aisle A"
              data-testid="input-area-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="areaDescription">Description</Label>
            <Textarea
              id="areaDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              data-testid="input-area-description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photoUrl">Photo URL</Label>
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              data-testid="input-area-photo"
            />
            {photoUrl && (
              <img src={photoUrl} alt="Preview" className="w-full h-32 object-cover rounded-md mt-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              data-testid="input-area-sort"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="areaIsActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
              data-testid="checkbox-area-active"
            />
            <Label htmlFor="areaIsActive">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-area">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isPending} data-testid="button-save-area">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
