import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  ArrowRight,
  Plus, 
  Minus,
  MapPin,
  Grid3X3,
  Camera,
  Search,
  X,
  Image as ImageIcon,
  Check,
  Loader2,
  ScanBarcode,
  Package
} from "lucide-react";

interface SpotInventoryLocation {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  isActive: boolean;
}

interface SpotInventoryArea {
  id: string;
  locationId: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string;
}

interface CountItem {
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
}

type AppStep = "auth" | "name" | "area" | "counting" | "review";

export default function SpotInventoryStaffApp() {
  const { toast } = useToast();
  const [step, setStep] = useState<AppStep>("auth");
  const [locationCode, setLocationCode] = useState("");
  const [staffName, setStaffName] = useState("");
  const [currentLocation, setCurrentLocation] = useState<SpotInventoryLocation | null>(null);
  const [availableAreas, setAvailableAreas] = useState<SpotInventoryArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<SpotInventoryArea | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [counts, setCounts] = useState<CountItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [notes, setNotes] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: searchResults = [], isLoading: searchLoading } = useQuery<Product[]>({
    queryKey: ["/api/spot-inventory/products/lookup", { search: searchQuery }],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const response = await fetch(`/api/spot-inventory/products/lookup?search=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const verifyLocationCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/spot-inventory/locations/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error("Invalid code");
      return response.json();
    },
    onSuccess: (data: { location: SpotInventoryLocation; areas: SpotInventoryArea[] }) => {
      setCurrentLocation(data.location);
      setAvailableAreas(data.areas);
      setStep("name");
      toast({ title: `Access granted: ${data.location.name}` });
    },
    onError: () => {
      toast({ title: "Invalid location code", variant: "destructive" });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (areaId: string) => {
      const response = await apiRequest("POST", "/api/spot-inventory/sessions", {
        areaId,
        locationId: currentLocation?.id,
        staffName: staffName,
        status: "in_progress",
      });
      return await response.json();
    },
    onSuccess: (session: { id: string }) => {
      setSessionId(session.id);
      setStep("counting");
    },
    onError: (error: any) => {
      toast({ title: "Failed to start session", description: error.message, variant: "destructive" });
    },
  });

  const addCountMutation = useMutation({
    mutationFn: async (count: CountItem) => {
      if (!sessionId) throw new Error("No session");
      return apiRequest("POST", "/api/spot-inventory/counts", {
        sessionId,
        productId: count.productId,
        productName: count.productName,
        sku: count.sku,
        quantity: count.quantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spot-inventory/sessions", sessionId] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save count", description: error.message, variant: "destructive" });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("No session");
      return apiRequest("PATCH", `/api/spot-inventory/sessions/${sessionId}`, {
        status: "completed",
        notes: notes || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Inventory count submitted successfully!" });
      resetSession();
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    },
  });

  const resetSession = () => {
    setStep("area");
    setSelectedArea(null);
    setSessionId(null);
    setCounts([]);
    setSearchQuery("");
    setNotes("");
  };

  const handleLocationCodeSubmit = () => {
    if (locationCode.length >= 3) {
      verifyLocationCodeMutation.mutate(locationCode);
    }
  };

  const handleNameSubmit = () => {
    if (staffName.trim().length >= 2) {
      setStep("area");
    }
  };

  const handleSelectArea = (area: SpotInventoryArea) => {
    setSelectedArea(area);
    createSessionMutation.mutate(area.id);
  };

  const handleAddProduct = (product: Product, quantity: number = 1) => {
    const existing = counts.find(c => c.productId === product.id);
    if (existing) {
      setCounts(counts.map(c => 
        c.productId === product.id 
          ? { ...c, quantity: c.quantity + quantity }
          : c
      ));
    } else {
      const newCount: CountItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity,
      };
      setCounts([...counts, newCount]);
    }
    setSearchQuery("");
    toast({ title: `Added ${product.name}` });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCounts(counts.map(c => {
      if (c.productId === productId) {
        const newQty = Math.max(0, c.quantity + delta);
        return { ...c, quantity: newQty };
      }
      return c;
    }).filter(c => c.quantity > 0));
  };

  const handleRemoveProduct = (productId: string) => {
    setCounts(counts.filter(c => c.productId !== productId));
  };

  const handleSubmitCounts = async () => {
    for (const count of counts) {
      await addCountMutation.mutateAsync(count);
    }
    completeSessionMutation.mutate();
  };

  const startBarcodeScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScannerActive(true);
      toast({ title: "Camera activated", description: "Point at barcode to scan" });
    } catch (error) {
      toast({ 
        title: "Camera access denied", 
        description: "Please allow camera access to scan barcodes",
        variant: "destructive" 
      });
    }
  };

  const stopBarcodeScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScannerActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step !== "auth" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (step === "name") setStep("auth");
                    else if (step === "area") setStep("name");
                    else if (step === "counting") {
                      if (counts.length > 0) {
                        if (confirm("You have unsaved counts. Are you sure you want to go back?")) {
                          setStep("area");
                        }
                      } else {
                        setStep("area");
                      }
                    }
                    else if (step === "review") setStep("counting");
                  }}
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-lg font-bold">Spot Inventory</h1>
                {currentLocation && (
                  <p className="text-xs text-muted-foreground">{currentLocation.name}{staffName ? ` - ${staffName}` : ''}</p>
                )}
              </div>
            </div>
            {step === "counting" && counts.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {counts.length} items
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-6">
        {step === "auth" && (
          <div className="max-w-sm mx-auto">
            <Card>
              <CardHeader className="text-center">
                <ScanBarcode className="h-12 w-12 mx-auto mb-2 text-primary" />
                <CardTitle>Location Access</CardTitle>
                <CardDescription>Enter the location access code</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="locationCode">Access Code</Label>
                  <Input
                    id="locationCode"
                    type="text"
                    maxLength={20}
                    value={locationCode}
                    onChange={(e) => setLocationCode(e.target.value)}
                    placeholder="Enter location code"
                    className="text-center text-xl tracking-wider"
                    data-testid="input-location-code"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleLocationCodeSubmit}
                  disabled={locationCode.length < 3 || verifyLocationCodeMutation.isPending}
                  data-testid="button-verify-code"
                >
                  {verifyLocationCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Continue
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "name" && (
          <div className="max-w-sm mx-auto">
            <Card>
              <CardHeader className="text-center">
                <Package className="h-12 w-12 mx-auto mb-2 text-primary" />
                <CardTitle>Your Name</CardTitle>
                <CardDescription>Enter your name for this count session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staffName">Your Name</Label>
                  <Input
                    id="staffName"
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Enter your name"
                    className="text-center"
                    data-testid="input-staff-name"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleNameSubmit}
                  disabled={staffName.trim().length < 2}
                  data-testid="button-continue-name"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "area" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold">{currentLocation?.name}</h2>
              <p className="text-muted-foreground">Select an area to count</p>
            </div>
            {availableAreas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No areas configured for this location</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {availableAreas.map(area => (
                  <Card
                    key={area.id}
                    className="cursor-pointer hover-elevate active-elevate-2 overflow-visible"
                    onClick={() => handleSelectArea(area)}
                    data-testid={`area-card-${area.id}`}
                  >
                    <div className="aspect-square relative bg-muted flex items-center justify-center rounded-t-lg overflow-hidden">
                      {area.photoUrl ? (
                        <img
                          src={area.photoUrl}
                          alt={area.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Grid3X3 className="h-12 w-12 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm text-center">{area.name}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "counting" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Badge variant="outline" className="mb-2">
                {currentLocation?.name} - {selectedArea?.name}
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-product-search"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={isScannerActive ? stopBarcodeScanner : startBarcodeScanner}
                data-testid="button-scan"
              >
                <Camera className="h-4 w-4 mr-2" />
                {isScannerActive ? "Stop Scanner" : "Scan Barcode"}
              </Button>
            </div>

            {isScannerActive && (
              <Card>
                <CardContent className="p-2">
                  <video
                    ref={videoRef}
                    className="w-full aspect-video bg-black rounded-lg"
                    autoPlay
                    playsInline
                  />
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Point camera at barcode (auto-detection coming soon)
                  </p>
                </CardContent>
              </Card>
            )}

            {searchQuery.length >= 2 && (
              <Card>
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-sm">Search Results</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {searchLoading ? (
                    <div className="p-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No products found</p>
                  ) : (
                    <ScrollArea className="max-h-48">
                      {searchResults.map(product => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleAddProduct(product)}
                          data-testid={`search-result-${product.id}`}
                        >
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                            )}
                          </div>
                          <Button size="icon" variant="ghost">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Current Count ({counts.length})</span>
                  {counts.length > 0 && (
                    <Badge>{counts.reduce((sum, c) => sum + c.quantity, 0)} total units</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {counts.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No products added yet</p>
                    <p className="text-xs">Search or scan to add products</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-64">
                    {counts.map(count => (
                      <div
                        key={count.productId}
                        className="flex items-center justify-between p-3 border-b last:border-0"
                        data-testid={`count-item-${count.productId}`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-sm truncate">{count.productName}</p>
                          {count.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {count.sku}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(count.productId, -1)}
                            data-testid={`button-decrease-${count.productId}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{count.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(count.productId, 1)}
                            data-testid={`button-increase-${count.productId}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveProduct(count.productId)}
                            data-testid={`button-remove-${count.productId}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {counts.length > 0 && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => setStep("review")}
                data-testid="button-review"
              >
                Review & Submit
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold">Review Count</h2>
              <Badge variant="outline" className="mt-2">
                {currentLocation?.name} - {selectedArea?.name}
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Products counted:</span>
                  <span className="font-semibold">{counts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total units:</span>
                  <span className="font-semibold">{counts.reduce((sum, c) => sum + c.quantity, 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Products</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-48">
                  {counts.map(count => (
                    <div
                      key={count.productId}
                      className="flex items-center justify-between p-3 border-b last:border-0"
                    >
                      <span className="text-sm">{count.productName}</span>
                      <Badge variant="secondary">{count.quantity}</Badge>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this count..."
                className="min-h-20"
                data-testid="input-notes"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("counting")}
                data-testid="button-edit"
              >
                Edit Count
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitCounts}
                disabled={addCountMutation.isPending || completeSessionMutation.isPending}
                data-testid="button-submit"
              >
                {(addCountMutation.isPending || completeSessionMutation.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Submit Count
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
