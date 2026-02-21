import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Edit, Wine, FlaskConical, Beer, Loader2,
  CheckCircle2, AlertCircle, FileText
} from "lucide-react";

const TTB_WINE_CLASSES: Record<string, string> = {
  still_wine_14_or_less: "Still Wine (14% or less)",
  still_wine_14_to_16: "Still Wine (14% to 16%)",
  still_wine_16_to_21: "Still Wine (16% to 21%)",
  still_wine_21_to_24: "Still Wine (21% to 24%)",
  hard_cider: "Hard Cider",
  artificially_carbonated: "Artificially Carbonated Wine",
  sparkling_bottle_fermented: "Sparkling Wine (Bottle Fermented)",
  sparkling_bulk_process: "Sparkling Wine (Bulk Process)",
};

const TTB_SPIRITS_CLASSES: Record<string, string> = {
  whisky_bourbon: "Bourbon Whisky",
  whisky_rye: "Rye Whisky",
  whisky_corn: "Corn Whisky",
  whisky_malt: "Malt Whisky",
  whisky_wheat: "Wheat Whisky",
  whisky_american_single_malt: "American Single Malt Whisky",
  whisky_blended: "Blended Whisky",
  whisky_other: "Other Whisky",
  brandy_grape: "Grape Brandy",
  brandy_fruit: "Fruit Brandy",
  brandy_pomace: "Pomace Brandy",
  brandy_applejack: "Applejack",
  brandy_other: "Other Brandy",
  rum: "Rum",
  gin: "Gin",
  gin_distilled: "Distilled Gin",
  vodka: "Vodka",
  neutral_spirits: "Neutral Spirits",
  cordials_liqueurs: "Cordials & Liqueurs",
  tequila: "Tequila",
  mezcal: "Mezcal",
  flavored_spirits: "Flavored Spirits",
  other_spirits: "Other Spirits",
};

const TTB_BEER_CLASSES: Record<string, string> = {
  beer: "Beer",
  lager: "Lager",
  ale: "Ale",
  porter: "Porter",
  stout: "Stout",
  malt_liquor: "Malt Liquor",
  malt_beverage: "Malt Beverage",
  flavored_malt_beverage: "Flavored Malt Beverage",
  hard_seltzer: "Hard Seltzer",
};

interface StateTaxClassOption {
  id: number;
  classKey: string;
  displayName: string;
  taxRate: string;
  taxUnit: string;
  stateCode: string;
  isActive: boolean;
}

const REPORTING_UOMS: Record<string, string> = {
  wine_gallons: "Wine Gallons",
  proof_gallons: "Proof Gallons",
  barrels: "Barrels (31 gal)",
};

const DIVISIONS = [
  { value: "winery", label: "Winery", icon: Wine },
  { value: "distillery", label: "Distillery", icon: FlaskConical },
  { value: "brewery", label: "Brewery", icon: Beer },
];

interface ClassificationRecord {
  id: number;
  productId: string;
  productName: string;
  productCategory: string;
  productSku: string | null;
  alcoholContent: string | null;
  division: string;
  ttbWineClass: string | null;
  ttbSpiritsClass: string | null;
  ttbBeerClass: string | null;
  maAb1Class: string | null;
  reportingUom: string | null;
  abvPercent: string | null;
  proofGallonFactor: string | null;
  bottleSizeMl: string | null;
  isClassified: boolean;
  notes: string | null;
}

interface UnclassifiedProduct {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  alcoholContent: string | null;
  bottleSize: string | null;
}

export function CellarTraksClassifications() {
  const { toast } = useToast();
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; record: ClassificationRecord | null }>({ isOpen: false, record: null });
  const [addDialog, setAddDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  const [formDivision, setFormDivision] = useState("winery");
  const [formTtbWineClass, setFormTtbWineClass] = useState<string>("");
  const [formTtbSpiritsClass, setFormTtbSpiritsClass] = useState<string>("");
  const [formTtbBeerClass, setFormTtbBeerClass] = useState<string>("");
  const [formMaAb1Class, setFormMaAb1Class] = useState<string>("");
  const [formReportingUom, setFormReportingUom] = useState<string>("");
  const [formAbvPercent, setFormAbvPercent] = useState("");
  const [formBottleSizeMl, setFormBottleSizeMl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const classificationsUrl = divisionFilter === "all"
    ? '/api/cellartraks/product-classifications'
    : `/api/cellartraks/product-classifications?division=${divisionFilter}`;

  const { data: classifications, isLoading } = useQuery<ClassificationRecord[]>({
    queryKey: ['/api/cellartraks/product-classifications', divisionFilter],
    queryFn: async () => {
      const res = await fetch(classificationsUrl, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: unclassifiedProducts } = useQuery<UnclassifiedProduct[]>({
    queryKey: ['/api/cellartraks/products/unclassified'],
  });

  const { data: stats } = useQuery<{
    totalProducts: number;
    classifiedProducts: number;
    byDivision: { division: string; count: number }[];
  }>({
    queryKey: ['/api/cellartraks/classification-stats'],
  });

  const { data: stateTaxClasses } = useQuery<StateTaxClassOption[]>({
    queryKey: ['/api/cellartraks/state-tax-classes'],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return apiRequest('PUT', `/api/cellartraks/product-classifications/${data.id}`, data);
      }
      return apiRequest('POST', '/api/cellartraks/product-classifications', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/cellartraks/');
      }});
      toast({ title: "Classification Saved" });
      setEditDialog({ isOpen: false, record: null });
      setAddDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormDivision("winery");
    setFormTtbWineClass("");
    setFormTtbSpiritsClass("");
    setFormTtbBeerClass("");
    setFormMaAb1Class("");
    setFormReportingUom("");
    setFormAbvPercent("");
    setFormBottleSizeMl("");
    setFormNotes("");
    setSelectedProduct("");
  };

  const openEditDialog = (record: ClassificationRecord) => {
    setFormDivision(record.division);
    setFormTtbWineClass(record.ttbWineClass || "");
    setFormTtbSpiritsClass(record.ttbSpiritsClass || "");
    setFormTtbBeerClass(record.ttbBeerClass || "");
    setFormMaAb1Class(record.maAb1Class || "");
    setFormReportingUom(record.reportingUom || "");
    setFormAbvPercent(record.abvPercent || "");
    setFormBottleSizeMl(record.bottleSizeMl || "");
    setFormNotes(record.notes || "");
    setEditDialog({ isOpen: true, record });
  };

  const handleSave = () => {
    const data: any = {
      division: formDivision,
      ttbWineClass: formTtbWineClass || null,
      ttbSpiritsClass: formTtbSpiritsClass || null,
      ttbBeerClass: formTtbBeerClass || null,
      maAb1Class: formMaAb1Class || null,
      reportingUom: formReportingUom || null,
      abvPercent: formAbvPercent || null,
      proofGallonFactor: formAbvPercent ? (parseFloat(formAbvPercent) * 2 / 100).toFixed(4) : null,
      bottleSizeMl: formBottleSizeMl || null,
      notes: formNotes || null,
    };

    if (editDialog.record) {
      data.id = editDialog.record.id;
      data.productId = editDialog.record.productId;
    } else {
      data.productId = selectedProduct;
    }

    if (!data.productId) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return;
    }

    saveMutation.mutate(data);
  };

  const suggestDivisionFromCategory = (category: string) => {
    if (category === 'wine' || category === 'cider' || category === 'canned_wine') return 'winery';
    if (category === 'spirits' || category === 'canned_cocktail') return 'distillery';
    if (category === 'beer') return 'brewery';
    return 'winery';
  };

  const suggestStateClass = (division: string, ttbClass: string) => {
    if (division === 'brewery') return 'malt_beverages';
    if (division === 'winery') {
      if (ttbClass === 'hard_cider') return 'hard_cider';
      if (ttbClass.includes('sparkling') || ttbClass === 'artificially_carbonated') return 'sparkling_wine';
      if (ttbClass === 'still_wine_21_to_24') return 'distilled_spirits_15_to_50';
      return 'still_wine';
    }
    if (division === 'distillery') return 'distilled_spirits_15_to_50';
    return '';
  };

  const suggestReportingUom = (division: string) => {
    if (division === 'winery') return 'wine_gallons';
    if (division === 'distillery') return 'proof_gallons';
    if (division === 'brewery') return 'barrels';
    return 'wine_gallons';
  };

  const filtered = (classifications || []).filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.productName?.toLowerCase().includes(q) || c.productSku?.toLowerCase().includes(q));
  });

  const getDivisionIcon = (division: string) => {
    const d = DIVISIONS.find(dv => dv.value === division);
    return d ? d.icon : FileText;
  };

  const getDivisionColor = (division: string) => {
    if (division === 'winery') return 'text-rose-600 dark:text-rose-400';
    if (division === 'distillery') return 'text-amber-600 dark:text-amber-400';
    if (division === 'brewery') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  const getFederalClassLabel = (record: ClassificationRecord) => {
    if (record.ttbWineClass) return TTB_WINE_CLASSES[record.ttbWineClass] || record.ttbWineClass;
    if (record.ttbSpiritsClass) return TTB_SPIRITS_CLASSES[record.ttbSpiritsClass] || record.ttbSpiritsClass;
    if (record.ttbBeerClass) return TTB_BEER_CLASSES[record.ttbBeerClass] || record.ttbBeerClass;
    return "Not Set";
  };

  const renderClassificationForm = () => {
    const ttbClasses = formDivision === 'winery' ? TTB_WINE_CLASSES
      : formDivision === 'distillery' ? TTB_SPIRITS_CLASSES
      : TTB_BEER_CLASSES;
    const ttbValue = formDivision === 'winery' ? formTtbWineClass
      : formDivision === 'distillery' ? formTtbSpiritsClass
      : formTtbBeerClass;
    const setTtbValue = (val: string) => {
      if (formDivision === 'winery') { setFormTtbWineClass(val); setFormTtbSpiritsClass(""); setFormTtbBeerClass(""); }
      else if (formDivision === 'distillery') { setFormTtbSpiritsClass(val); setFormTtbWineClass(""); setFormTtbBeerClass(""); }
      else { setFormTtbBeerClass(val); setFormTtbWineClass(""); setFormTtbSpiritsClass(""); }

      const suggestedState = suggestStateClass(formDivision, val);
      if (suggestedState && !formMaAb1Class) setFormMaAb1Class(suggestedState);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Division</Label>
            <Select value={formDivision} onValueChange={(val) => {
              setFormDivision(val);
              setFormTtbWineClass("");
              setFormTtbSpiritsClass("");
              setFormTtbBeerClass("");
              const uom = suggestReportingUom(val);
              setFormReportingUom(uom);
            }}>
              <SelectTrigger data-testid="select-division">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIVISIONS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reporting Unit</Label>
            <Select value={formReportingUom} onValueChange={setFormReportingUom}>
              <SelectTrigger data-testid="select-reporting-uom">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORTING_UOMS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Federal (TTB) Classification</Label>
          <Select value={ttbValue} onValueChange={setTtbValue}>
            <SelectTrigger data-testid="select-ttb-class">
              <SelectValue placeholder="Select federal classification" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {Object.entries(ttbClasses).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formDivision === 'winery' && "TTB Form 5120.17 - Report of Wine Premises Operations"}
            {formDivision === 'distillery' && "TTB Form 5110.40 - Monthly Report of Production Operations"}
            {formDivision === 'brewery' && "TTB Form 5130.9 - Brewer's Report of Operations"}
          </p>
        </div>

        <div className="space-y-2">
          <Label>State Tax Classification</Label>
          <Select value={formMaAb1Class} onValueChange={setFormMaAb1Class}>
            <SelectTrigger data-testid="select-ma-ab1-class">
              <SelectValue placeholder="Select state classification" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {(stateTaxClasses || []).filter(tc => tc.isActive !== false).map(tc => (
                <SelectItem key={tc.classKey} value={tc.classKey}>
                  {tc.displayName} (${parseFloat(tc.taxRate).toFixed(2)}/{tc.taxUnit.replace('per ', '')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            State excise tax classifications. Manage rates in State Tax Rates section.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>ABV %</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. 13.5"
              value={formAbvPercent}
              onChange={e => setFormAbvPercent(e.target.value)}
              data-testid="input-abv-percent"
            />
          </div>
          <div className="space-y-2">
            <Label>Bottle Size (ml)</Label>
            <Input
              type="number"
              step="1"
              placeholder="e.g. 750"
              value={formBottleSizeMl}
              onChange={e => setFormBottleSizeMl(e.target.value)}
              data-testid="input-bottle-size-ml"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            placeholder="Optional notes about this classification..."
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            className="resize-none"
            rows={2}
            data-testid="input-notes"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-classifications-heading">
          Federal & State Classifications
        </h2>
        <p className="text-muted-foreground text-sm">
          Assign TTB federal and Massachusetts AB-1 state tax classifications to products for regulatory reporting.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold" data-testid="text-total-products">{stats.totalProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Classified</p>
              <p className="text-2xl font-bold" data-testid="text-classified-count">
                {stats.classifiedProducts}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {stats.totalProducts}
                </span>
              </p>
            </CardContent>
          </Card>
          {stats.byDivision.map(d => (
            <Card key={d.division}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground capitalize">{d.division}</p>
                <p className="text-2xl font-bold">{d.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-classifications"
          />
        </div>
        <Select value={divisionFilter} onValueChange={setDivisionFilter}>
          <SelectTrigger className="w-40" data-testid="select-division-filter">
            <SelectValue placeholder="All Divisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map(d => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setAddDialog(true); }} data-testid="button-add-classification">
          <Plus className="h-4 w-4 mr-2" />
          Add Classification
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No classifications found</p>
            <p className="text-sm mt-1">Add product classifications to enable regulatory reporting.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Product</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Federal (TTB)</TableHead>
                  <TableHead>State (MA AB-1)</TableHead>
                  <TableHead>ABV</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(record => {
                  const DivIcon = getDivisionIcon(record.division);
                  return (
                    <TableRow key={record.id} data-testid={`row-classification-${record.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{record.productName}</p>
                          {record.productSku && (
                            <p className="text-xs text-muted-foreground">{record.productSku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <DivIcon className={`h-3.5 w-3.5 ${getDivisionColor(record.division)}`} />
                          <span className="text-sm capitalize">{record.division}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getFederalClassLabel(record)}</span>
                      </TableCell>
                      <TableCell>
                        {record.maAb1Class ? (
                          <span className="text-sm">
                            {stateTaxClasses?.find(tc => tc.classKey === record.maAb1Class)?.displayName || record.maAb1Class}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not Set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{record.abvPercent ? `${record.abvPercent}%` : '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{record.reportingUom ? REPORTING_UOMS[record.reportingUom] || record.reportingUom : '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(record)} data-testid={`button-edit-classification-${record.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={editDialog.isOpen} onOpenChange={(open) => { if (!open) setEditDialog({ isOpen: false, record: null }); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-edit-classification">
          <DialogHeader>
            <DialogTitle>Edit Classification</DialogTitle>
            <DialogDescription>
              {editDialog.record?.productName}
            </DialogDescription>
          </DialogHeader>
          {renderClassificationForm()}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditDialog({ isOpen: false, record: null })} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-classification">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialog} onOpenChange={(open) => { if (!open) { setAddDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-add-classification">
          <DialogHeader>
            <DialogTitle>Add Product Classification</DialogTitle>
            <DialogDescription>
              Select a product and assign its federal and state tax classifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={(val) => {
                setSelectedProduct(val);
                const product = unclassifiedProducts?.find(p => p.id === val);
                if (product) {
                  const suggestedDiv = suggestDivisionFromCategory(product.category);
                  setFormDivision(suggestedDiv);
                  setFormReportingUom(suggestReportingUom(suggestedDiv));
                  if (product.alcoholContent) {
                    const abv = parseFloat(product.alcoholContent.replace('%', ''));
                    if (!isNaN(abv)) setFormAbvPercent(abv.toString());
                  }
                  if (product.bottleSize) {
                    const ml = parseFloat(product.bottleSize.replace(/[^0-9.]/g, ''));
                    if (!isNaN(ml)) setFormBottleSizeMl(ml.toString());
                  }
                }
              }}>
                <SelectTrigger data-testid="select-product">
                  <SelectValue placeholder="Select a product to classify" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {(unclassifiedProducts || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{p.category}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unclassifiedProducts && unclassifiedProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">All products have been classified.</p>
              )}
            </div>

            {renderClassificationForm()}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setAddDialog(false); resetForm(); }} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !selectedProduct} data-testid="button-save-new-classification">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Classification
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
