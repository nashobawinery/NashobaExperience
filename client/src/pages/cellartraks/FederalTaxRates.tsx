import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Beer, Wine, FlaskConical, Loader2, Database, Landmark,
  Info, Pencil, Trash2, Plus, CheckCircle2, Circle, Save, X
} from "lucide-react";

interface FederalTaxRate {
  id: number;
  beverageType: string;
  rateKey: string;
  displayName: string;
  description: string | null;
  ratePerUnit: string;
  rateUnit: string;
  volumeMin: string | null;
  volumeMax: string | null;
  volumeUnit: string | null;
  producerType: string | null;
  creditAmount: string | null;
  effectiveRateAfterCredit: string | null;
  parentRateKey: string | null;
  sortOrder: number;
  isActive: boolean;
  isSelectedForOperation: boolean;
  effectiveDate: string | null;
  notes: string | null;
}

const BEVERAGE_CONFIG: Record<string, { label: string; icon: typeof Beer; color: string; bgColor: string; unit: string }> = {
  beer: { label: "Beer", icon: Beer, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/30", unit: "per barrel" },
  wine: { label: "Wine", icon: Wine, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-50 dark:bg-rose-950/30", unit: "per wine gallon" },
  spirits: { label: "Distilled Spirits", icon: FlaskConical, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30", unit: "per proof gallon" },
};

const BEER_PRODUCER_TYPES: Record<string, { label: string; description: string }> = {
  small: {
    label: "Reduced Rates - Small Brewer (2,000,000 barrels or less/year)",
    description: "Beer produced and removed by a domestic brewer who produces 2,000,000 barrels or less per calendar year",
  },
  large: {
    label: "Reduced Rates - Large Brewer (over 2,000,000 barrels/year)",
    description: "Domestic brewer who produces over 2,000,000 barrels per calendar year and who produced the beer; or electing U.S. importer with assigned reduced rate",
  },
  general: {
    label: "General Tax Rate on Domestic Removals or Imports",
    description: "Domestic brewer who did not produce the beer; U.S. importer not assigned a reduced rate; brewer/importer who exhausted reduced rate entitlement",
  },
};

function formatCurrency(value: string | null | undefined): string {
  if (!value) return "-";
  const num = parseFloat(value);
  if (num < 1) return `$${num.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`;
  return `$${num.toFixed(2)}`;
}

function formatVolume(min: string | null, max: string | null): string {
  if (!min && !max) return "All Barrels";
  const minN = min ? parseInt(min).toLocaleString('en-US') : "0";
  const maxN = max ? parseInt(max).toLocaleString('en-US') : "No limit";
  if (minN === "0") return `First ${maxN}`;
  return `Over ${minN} up to ${maxN}`;
}

export function FederalTaxRates() {
  const { toast } = useToast();

  const { data: rates, isLoading } = useQuery<FederalTaxRate[]>({
    queryKey: ['/api/cellartraks/federal-tax-rates'],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/cellartraks/federal-tax-rates/seed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cellartraks/federal-tax-rates'] });
      toast({ title: "Federal Tax Rates Loaded", description: "All current TTB tax rates have been loaded." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rates || rates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Landmark className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-no-rates">Federal Tax Rates Not Loaded</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Load the current TTB federal excise tax rates for beer, wine, and distilled spirits. 
            These rates are effective from 2018 to present.
          </p>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            data-testid="button-seed-federal-rates"
          >
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            Load Federal Tax Rates
          </Button>
        </CardContent>
      </Card>
    );
  }

  const beerRates = rates.filter(r => r.beverageType === 'beer');
  const wineBaseRates = rates.filter(r => r.beverageType === 'wine' && r.producerType === 'base_rate');
  const wineCreditRates = rates.filter(r => r.beverageType === 'wine' && r.producerType?.startsWith('credit_tier'));
  const spiritsRates = rates.filter(r => r.beverageType === 'spirits');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>Tax rates effective from Calendar Year 2018 to present. Source: TTB (Alcohol and Tobacco Tax and Trade Bureau)</span>
      </div>

      <BeerRatesSection rates={beerRates} />
      <WineRatesSection baseRates={wineBaseRates} creditRates={wineCreditRates} />
      <SpiritsRatesSection rates={spiritsRates} />
    </div>
  );
}

function BeerRatesSection({ rates }: { rates: FederalTaxRate[] }) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ displayName: string; description: string; ratePerUnit: string; volumeMin: string; volumeMax: string }>({ displayName: "", description: "", ratePerUnit: "", volumeMin: "", volumeMax: "" });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addProducerType, setAddProducerType] = useState<string>("small");
  const [addForm, setAddForm] = useState({ displayName: "", description: "", ratePerUnit: "", volumeMin: "", volumeMax: "" });

  const config = BEVERAGE_CONFIG.beer;
  const Icon = config.icon;

  const selectedProducerType = rates.find(r => r.isSelectedForOperation)?.producerType || null;

  const producerGroups = ["small", "large", "general"];
  const groupedRates: Record<string, FederalTaxRate[]> = {};
  for (const pt of producerGroups) {
    groupedRates[pt] = rates.filter(r => r.producerType === pt).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const selectMutation = useMutation({
    mutationFn: async (producerType: string) => {
      return apiRequest('POST', '/api/cellartraks/federal-tax-rates/select-classification', {
        beverageType: 'beer',
        producerType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cellartraks/federal-tax-rates'] });
      toast({ title: "Classification Selected", description: "Your operating classification has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      return apiRequest('PUT', `/api/cellartraks/federal-tax-rates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cellartraks/federal-tax-rates'] });
      setEditingId(null);
      toast({ title: "Rate Updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/cellartraks/federal-tax-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cellartraks/federal-tax-rates'] });
      toast({ title: "Rate Deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest('POST', '/api/cellartraks/federal-tax-rates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cellartraks/federal-tax-rates'] });
      setShowAddDialog(false);
      setAddForm({ displayName: "", description: "", ratePerUnit: "", volumeMin: "", volumeMax: "" });
      toast({ title: "Rate Added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function startEdit(rate: FederalTaxRate) {
    setEditingId(rate.id);
    setEditForm({
      displayName: rate.displayName,
      description: rate.description || "",
      ratePerUnit: rate.ratePerUnit,
      volumeMin: rate.volumeMin || "",
      volumeMax: rate.volumeMax || "",
    });
  }

  function saveEdit() {
    if (editingId === null) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        displayName: editForm.displayName,
        description: editForm.description || null,
        ratePerUnit: editForm.ratePerUnit,
        volumeMin: editForm.volumeMin || null,
        volumeMax: editForm.volumeMax || null,
      },
    });
  }

  function handleAdd() {
    const existingInGroup = groupedRates[addProducerType] || [];
    const maxSort = existingInGroup.length > 0 ? Math.max(...existingInGroup.map(r => r.sortOrder)) : 0;
    const rateKey = `beer_custom_${Date.now()}`;

    addMutation.mutate({
      beverageType: "beer",
      rateKey,
      displayName: addForm.displayName,
      description: addForm.description || null,
      ratePerUnit: addForm.ratePerUnit,
      rateUnit: "per barrel",
      volumeMin: addForm.volumeMin || null,
      volumeMax: addForm.volumeMax || null,
      volumeUnit: "barrels per calendar year",
      producerType: addProducerType,
      sortOrder: maxSort + 1,
      effectiveDate: "2018-01-01",
    });
  }

  return (
    <Card data-testid="card-beer-rates">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-base" data-testid="text-beer-rates-title">{config.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Rate per Barrel (31 gallons)</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAddDialog(true)}
            data-testid="button-add-beer-rate"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Rate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1.5">
          <p className="font-medium text-foreground text-xs">Select Your Operating Classification</p>
          <p className="text-xs text-muted-foreground">Choose which classification applies to your brewery operation. This determines the tax rates used for reporting.</p>
        </div>

        {producerGroups.map(pt => {
          const ptRates = groupedRates[pt] || [];
          if (ptRates.length === 0) return null;
          const ptConfig = BEER_PRODUCER_TYPES[pt];
          const isSelected = selectedProducerType === pt;

          return (
            <div key={pt} className={`rounded-md border ${isSelected ? "border-primary/50 bg-primary/5" : ""}`} data-testid={`section-beer-${pt}`}>
              <div
                className={`flex items-start gap-3 p-4 cursor-pointer hover-elevate rounded-t-md ${isSelected ? "" : ""}`}
                onClick={() => selectMutation.mutate(pt)}
                data-testid={`button-select-beer-${pt}`}
              >
                <div className="mt-0.5">
                  {isSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{ptConfig?.label || pt}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ptConfig?.description}</p>
                  {isSelected && (
                    <Badge variant="secondary" className="mt-1.5">Currently Selected</Badge>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Classification</TableHead>
                        <TableHead>Volume Tier</TableHead>
                        <TableHead className="text-right">Rate per Barrel</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ptRates.map(rate => (
                        <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                          {editingId === rate.id ? (
                            <>
                              <TableCell>
                                <Input
                                  value={editForm.displayName}
                                  onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                                  className="text-sm"
                                  data-testid={`input-edit-name-${rate.id}`}
                                />
                                <Textarea
                                  value={editForm.description}
                                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                  className="text-xs mt-1.5 min-h-[60px]"
                                  data-testid={`input-edit-desc-${rate.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    value={editForm.volumeMin}
                                    onChange={e => setEditForm(f => ({ ...f, volumeMin: e.target.value }))}
                                    placeholder="Min"
                                    className="text-sm w-24"
                                    data-testid={`input-edit-vol-min-${rate.id}`}
                                  />
                                  <span className="text-muted-foreground text-xs">to</span>
                                  <Input
                                    value={editForm.volumeMax}
                                    onChange={e => setEditForm(f => ({ ...f, volumeMax: e.target.value }))}
                                    placeholder="Max"
                                    className="text-sm w-24"
                                    data-testid={`input-edit-vol-max-${rate.id}`}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-muted-foreground">$</span>
                                  <Input
                                    value={editForm.ratePerUnit}
                                    onChange={e => setEditForm(f => ({ ...f, ratePerUnit: e.target.value }))}
                                    className="text-sm w-24 text-right"
                                    data-testid={`input-edit-rate-${rate.id}`}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={saveEdit}
                                    disabled={updateMutation.isPending}
                                    data-testid={`button-save-rate-${rate.id}`}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setEditingId(null)}
                                    data-testid={`button-cancel-edit-${rate.id}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>
                                <p className="font-medium text-sm">{rate.displayName}</p>
                                {rate.description && <p className="text-xs text-muted-foreground mt-0.5">{rate.description}</p>}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{formatVolume(rate.volumeMin, rate.volumeMax)}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                                  {formatCurrency(rate.ratePerUnit)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => startEdit(rate)}
                                    data-testid={`button-edit-rate-${rate.id}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm("Delete this rate classification?")) {
                                        deleteMutation.mutate(rate.id);
                                      }
                                    }}
                                    data-testid={`button-delete-rate-${rate.id}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Beer Tax Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Classification Group</label>
              <Select value={addProducerType} onValueChange={setAddProducerType}>
                <SelectTrigger data-testid="select-add-producer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Reduced Rate - Small Brewer</SelectItem>
                  <SelectItem value="large">Reduced Rate - Large Brewer</SelectItem>
                  <SelectItem value="general">General Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={addForm.displayName}
                onChange={e => setAddForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="e.g., Small Brewer - First 60,000 Barrels"
                data-testid="input-add-display-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detailed description of this rate classification"
                data-testid="input-add-description"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rate per Barrel ($)</label>
                <Input
                  value={addForm.ratePerUnit}
                  onChange={e => setAddForm(f => ({ ...f, ratePerUnit: e.target.value }))}
                  placeholder="e.g., 3.50"
                  data-testid="input-add-rate"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Volume Min</label>
                <Input
                  value={addForm.volumeMin}
                  onChange={e => setAddForm(f => ({ ...f, volumeMin: e.target.value }))}
                  placeholder="e.g., 0"
                  data-testid="input-add-vol-min"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Volume Max</label>
                <Input
                  value={addForm.volumeMax}
                  onChange={e => setAddForm(f => ({ ...f, volumeMax: e.target.value }))}
                  placeholder="e.g., 60000"
                  data-testid="input-add-vol-max"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!addForm.displayName || !addForm.ratePerUnit || addMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Add Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function WineRatesSection({ baseRates, creditRates }: { baseRates: FederalTaxRate[]; creditRates: FederalTaxRate[] }) {
  const config = BEVERAGE_CONFIG.wine;
  const Icon = config.icon;

  const creditsByParent = creditRates.reduce<Record<string, FederalTaxRate[]>>((acc, rate) => {
    const key = rate.parentRateKey || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(rate);
    return acc;
  }, {});

  return (
    <Card data-testid="card-wine-rates">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <CardTitle className="text-base" data-testid="text-wine-rates-title">{config.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Rate per Wine Gallon</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Tax Class</TableHead>
                <TableHead className="text-right">Base Rate</TableHead>
                <TableHead className="text-right">
                  <div>
                    <span>First 30,000</span>
                    <span className="block text-xs font-normal text-muted-foreground">Wine Gallons</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div>
                    <span>30k - 130k</span>
                    <span className="block text-xs font-normal text-muted-foreground">Wine Gallons</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div>
                    <span>130k - 750k</span>
                    <span className="block text-xs font-normal text-muted-foreground">Wine Gallons</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baseRates.map(rate => {
                const credits = creditsByParent[rate.rateKey] || [];
                const t1 = credits.find(c => c.producerType === 'credit_tier_1');
                const t2 = credits.find(c => c.producerType === 'credit_tier_2');
                const t3 = credits.find(c => c.producerType === 'credit_tier_3');

                return (
                  <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                    <TableCell>
                      <p className="font-medium text-sm">{rate.displayName}</p>
                      {rate.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">{rate.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                        {formatCurrency(rate.ratePerUnit)}/gal
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t1 ? (
                        <div>
                          <span className="text-xs text-muted-foreground">{formatCurrency(t1.creditAmount)} credit</span>
                          <div>
                            <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-effective-${t1.rateKey}`}>
                              {formatCurrency(t1.effectiveRateAfterCredit)}/gal
                            </Badge>
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {t2 ? (
                        <div>
                          <span className="text-xs text-muted-foreground">{formatCurrency(t2.creditAmount)} credit</span>
                          <div>
                            <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-effective-${t2.rateKey}`}>
                              {formatCurrency(t2.effectiveRateAfterCredit)}/gal
                            </Badge>
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {t3 ? (
                        <div>
                          <span className="text-xs text-muted-foreground">{formatCurrency(t3.creditAmount)} credit</span>
                          <div>
                            <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-effective-${t3.rateKey}`}>
                              {formatCurrency(t3.effectiveRateAfterCredit)}/gal
                            </Badge>
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Tax Credits</p>
          <p>Domestic wine producers are entitled to tax credits on wine they produce and may transfer their tax credits to other wineries or to bonded wine cellars that receive their wine in bond.</p>
          <p>Electing U.S. importers may take advantage of tax credits appropriately assigned to them by a foreign winery.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SpiritsRatesSection({ rates }: { rates: FederalTaxRate[] }) {
  const config = BEVERAGE_CONFIG.spirits;
  const Icon = config.icon;
  const reducedRates = rates.filter(r => r.producerType === 'small');
  const generalRates = rates.filter(r => r.producerType === 'general');

  return (
    <Card data-testid="card-spirits-rates">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <CardTitle className="text-base" data-testid="text-spirits-rates-title">{config.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Rate per Proof Gallon</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" defaultValue={["spirits-reduced", "spirits-general"]}>
          <AccordionItem value="spirits-reduced">
            <AccordionTrigger className="text-sm font-medium" data-testid="accordion-spirits-reduced">
              Reduced Rates (DSP Proprietors / Electing Importers)
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">
                Proprietors of domestic distilled spirits plants (DSPs) may take advantage of reduced rates when they remove limited quantities of distilled spirits that they distilled or processed. Electing U.S. importers may take advantage of reduced rates appropriately assigned to them by a foreign distilled spirits operation.
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volume Tier</TableHead>
                      <TableHead className="text-right">Rate per Proof Gallon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reducedRates.map(rate => (
                      <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                        <TableCell>
                          <p className="font-medium text-sm">{rate.displayName}</p>
                          {rate.description && <p className="text-xs text-muted-foreground mt-0.5">{rate.description}</p>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                            {formatCurrency(rate.ratePerUnit)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="spirits-general">
            <AccordionTrigger className="text-sm font-medium" data-testid="accordion-spirits-general">
              General Rate
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">
                Applies to DSP proprietors who remove distilled spirits that they did not distill or process, U.S. importers not assigned a reduced rate, or those who exhausted their reduced rate entitlement.
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volume</TableHead>
                      <TableHead className="text-right">Rate per Proof Gallon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generalRates.map(rate => (
                      <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                        <TableCell>
                          <p className="font-medium text-sm">{rate.displayName}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                            {formatCurrency(rate.ratePerUnit)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
