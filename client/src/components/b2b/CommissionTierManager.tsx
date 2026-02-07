import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Layers, Plus, Pencil, Trash2, Calculator, ArrowRight } from "lucide-react";

interface CommissionTier {
  id: string;
  tierName: string;
  minAnnualSales: string;
  maxAnnualSales: string | null;
  ratePercent: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TierBreakdown {
  tierName: string;
  ratePercent: number;
  salesInTier: number;
  commissionInTier: number;
  minSales: number;
  maxSales: number | null;
}

interface CalculationResult {
  annualSales: number;
  totalCommission: number;
  effectiveRate: number;
  tierBreakdown: TierBreakdown[];
}

export function CommissionTierManager() {
  const { toast } = useToast();
  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; tier: CommissionTier | null }>({
    isOpen: false,
    tier: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; tier: CommissionTier | null }>({
    isOpen: false,
    tier: null,
  });
  const [calcAmount, setCalcAmount] = useState("");
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);

  const [formData, setFormData] = useState({
    tierName: "",
    minAnnualSales: "",
    maxAnnualSales: "",
    ratePercent: "",
    sortOrder: "",
    active: true,
  });

  const { data: tiers = [], isLoading } = useQuery<CommissionTier[]>({
    queryKey: ["b2b", "admin", "commission-tiers"],
    queryFn: async () => {
      const res = await fetch("/api/b2b/admin/commission-tiers");
      if (!res.ok) throw new Error("Failed to fetch commission tiers");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/b2b/admin/commission-tiers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "commission-tiers"] });
      toast({ title: "Tier created", description: "Commission tier added successfully" });
      setEditDialog({ isOpen: false, tier: null });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create commission tier", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/b2b/admin/commission-tiers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "commission-tiers"] });
      toast({ title: "Tier updated", description: "Commission tier updated successfully" });
      setEditDialog({ isOpen: false, tier: null });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update commission tier", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/b2b/admin/commission-tiers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "commission-tiers"] });
      toast({ title: "Tier deleted", description: "Commission tier removed successfully" });
      setDeleteDialog({ isOpen: false, tier: null });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete commission tier", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setFormData({
      tierName: "",
      minAnnualSales: "",
      maxAnnualSales: "",
      ratePercent: "",
      sortOrder: String((tiers.length || 0) + 1),
      active: true,
    });
    setEditDialog({ isOpen: true, tier: null });
  };

  const openEditDialog = (tier: CommissionTier) => {
    setFormData({
      tierName: tier.tierName,
      minAnnualSales: tier.minAnnualSales,
      maxAnnualSales: tier.maxAnnualSales || "",
      ratePercent: tier.ratePercent,
      sortOrder: String(tier.sortOrder),
      active: tier.active,
    });
    setEditDialog({ isOpen: true, tier });
  };

  const handleSave = () => {
    const data = {
      tierName: formData.tierName,
      minAnnualSales: formData.minAnnualSales,
      maxAnnualSales: formData.maxAnnualSales || null,
      ratePercent: formData.ratePercent,
      sortOrder: parseInt(formData.sortOrder) || 1,
      active: formData.active,
    };

    if (editDialog.tier) {
      updateMutation.mutate({ id: editDialog.tier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCalculate = async () => {
    const amount = parseFloat(calcAmount);
    if (isNaN(amount) || amount < 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid sales amount", variant: "destructive" });
      return;
    }
    try {
      const res = await apiRequest("POST", "/api/b2b/admin/commission-tiers/calculate", { annualSales: amount });
      const result = await res.json();
      setCalcResult(result);
    } catch {
      toast({ title: "Error", description: "Failed to calculate commission", variant: "destructive" });
    }
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm p-4">Loading commission tiers...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="font-serif flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Commission Tier Structure
            </CardTitle>
            <CardDescription>
              Marginal/incremental tiers (like tax brackets). Each dollar of revenue is taxed at the rate of the bracket it falls into.
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-add-tier">
            <Plus className="h-4 w-4 mr-1" />
            Add Tier
          </Button>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No commission tiers configured. Add tiers to enable tiered commission calculations.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Tier Name</TableHead>
                    <TableHead>Sales Range</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier) => (
                    <TableRow key={tier.id} data-testid={`row-tier-${tier.id}`}>
                      <TableCell className="font-medium">{tier.sortOrder}</TableCell>
                      <TableCell className="font-medium">{tier.tierName}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatCurrency(tier.minAnnualSales)}
                          <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                          {tier.maxAnnualSales ? formatCurrency(tier.maxAnnualSales) : "No limit"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-rate-${tier.id}`}>
                          {tier.ratePercent}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tier.active ? "default" : "outline"}>
                          {tier.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(tier)}
                            data-testid={`button-edit-tier-${tier.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteDialog({ isOpen: true, tier })}
                            data-testid={`button-delete-tier-${tier.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Commission Calculator
          </CardTitle>
          <CardDescription>
            Preview how commissions are calculated for a given annual sales amount
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-end mb-4">
            <div className="space-y-1">
              <Label htmlFor="calc-amount">Annual Sales Amount</Label>
              <Input
                id="calc-amount"
                type="number"
                placeholder="e.g., 150000"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-48"
                data-testid="input-calc-amount"
              />
            </div>
            <Button onClick={handleCalculate} data-testid="button-calculate">
              Calculate
            </Button>
          </div>

          {calcResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Annual Sales</p>
                  <p className="text-lg font-semibold" data-testid="text-calc-sales">{formatCurrency(calcResult.annualSales)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total Commission</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid="text-calc-commission">{formatCurrency(calcResult.totalCommission)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Effective Rate</p>
                  <p className="text-lg font-semibold" data-testid="text-calc-rate">{calcResult.effectiveRate}%</p>
                </div>
              </div>

              {calcResult.tierBreakdown.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Sales in Tier</TableHead>
                        <TableHead>Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calcResult.tierBreakdown.map((tb, i) => (
                        <TableRow key={i} data-testid={`row-calc-breakdown-${i}`}>
                          <TableCell className="font-medium">{tb.tierName}</TableCell>
                          <TableCell>{tb.ratePercent}%</TableCell>
                          <TableCell>{formatCurrency(tb.salesInTier)}</TableCell>
                          <TableCell className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(tb.commissionInTier)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, tier: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialog.tier ? "Edit Commission Tier" : "Add Commission Tier"}</DialogTitle>
            <DialogDescription>
              {editDialog.tier ? "Update the tier configuration" : "Create a new commission tier bracket"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="tier-name">Tier Name</Label>
              <Input
                id="tier-name"
                value={formData.tierName}
                onChange={(e) => setFormData({ ...formData, tierName: e.target.value })}
                placeholder="e.g., Base, Growth, Performance"
                data-testid="input-tier-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="min-sales">Min Annual Sales ($)</Label>
                <Input
                  id="min-sales"
                  type="number"
                  value={formData.minAnnualSales}
                  onChange={(e) => setFormData({ ...formData, minAnnualSales: e.target.value })}
                  placeholder="0"
                  data-testid="input-min-sales"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-sales">Max Annual Sales ($)</Label>
                <Input
                  id="max-sales"
                  type="number"
                  value={formData.maxAnnualSales}
                  onChange={(e) => setFormData({ ...formData, maxAnnualSales: e.target.value })}
                  placeholder="Leave empty for no limit"
                  data-testid="input-max-sales"
                />
                <p className="text-xs text-muted-foreground">Leave empty for the top tier (no cap)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rate-percent">Commission Rate (%)</Label>
                <Input
                  id="rate-percent"
                  type="number"
                  step="0.01"
                  value={formData.ratePercent}
                  onChange={(e) => setFormData({ ...formData, ratePercent: e.target.value })}
                  placeholder="5.00"
                  data-testid="input-rate-percent"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sort-order">Sort Order</Label>
                <Input
                  id="sort-order"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  placeholder="1"
                  data-testid="input-sort-order"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                data-testid="switch-tier-active"
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ isOpen: false, tier: null })} data-testid="button-cancel-tier">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.tierName || !formData.ratePercent || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-tier"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, tier: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Commission Tier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{deleteDialog.tier?.tierName}" tier? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, tier: null })} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.tier && deleteMutation.mutate(deleteDialog.tier.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
