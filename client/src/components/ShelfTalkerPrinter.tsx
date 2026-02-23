import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Printer, Loader2, ListFilter, Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  type: string | null;
  varietal: string | null;
  vintageYear: string | null;
  price: string;
  imageUrl: string | null;
  description: string;
  tastingNotes: string | null;
  foodPairings: string | null;
  rating: string | null;
  awards: string | null;
  staffPick: boolean;
  available: boolean;
}

const CARD_SIZES = [
  { value: "2.5x3.5", label: "Small Shelf Tag (2.5×3.5\")" },
  { value: "2x3.5", label: "Business Card (2×3.5\")" },
  { value: "3x5", label: "Index Card (3×5\")" },
  { value: "3.5x5", label: "Shelf Tag (3.5×5\")" },
  { value: "4x6", label: "Postcard (4×6\")" },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "wine", label: "Wine" },
  { value: "spirits", label: "Spirits" },
  { value: "beer", label: "Beer" },
  { value: "cider", label: "Cider" },
  { value: "canned_cocktail", label: "Canned Cocktails" },
  { value: "canned_wine", label: "Canned Wine" },
];

const FIELD_OPTIONS = [
  { key: "showImage", label: "Product Image", default: true },
  { key: "showPrice", label: "Price", default: true },
  { key: "showDescription", label: "Description", default: true },
  { key: "showTastingNotes", label: "Tasting Notes", default: true },
  { key: "showPairings", label: "Food Pairings", default: false },
  { key: "showAwards", label: "Awards", default: false },
  { key: "showRating", label: "Rating / Points", default: true },
  { key: "showVarietal", label: "Varietal / Grape", default: true },
  { key: "showRegion", label: "Region", default: false },
  { key: "showAlcohol", label: "Alcohol Content", default: false },
  { key: "showBody", label: "Body", default: false },
  { key: "showSweetness", label: "Sweetness", default: false },
  { key: "showStaffPick", label: "Staff Pick Badge", default: true },
];

export default function ShelfTalkerPrinter() {
  const [template, setTemplate] = useState("classic");
  const [cardSize, setCardSize] = useState("4x6");
  const [scale, setScale] = useState(100);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [fields, setFields] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    FIELD_OPTIONS.forEach(f => { defaults[f.key] = f.default; });
    return defaults;
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.available);
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.varietal && p.varietal.toLowerCase().includes(q)) ||
        (p.type && p.type.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [products, categoryFilter, searchQuery]);

  const effectiveIds = selectAll
    ? filteredProducts.map(p => p.id)
    : selectedIds;

  const toggleProduct = (id: string) => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedIds(filteredProducts.filter(p => p.id !== id).map(p => p.id));
    } else {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedIds([]);
    } else {
      setSelectAll(true);
      setSelectedIds([]);
    }
  };

  const toggleField = (key: string) => {
    setFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getPreviewUrl = (tmpl: string) => {
    const base = window.location.origin;
    const params = new URLSearchParams();
    params.set("template", tmpl);
    params.set("size", cardSize);
    if (scale !== 100) params.set("scale", String(scale));

    if (effectiveIds.length > 0) {
      params.set("ids", effectiveIds.join(","));
    } else {
      params.set("ids", "none");
    }

    Object.entries(fields).forEach(([key, val]) => {
      if (!val) params.set(key, "0");
    });

    return `${base}/api/media/shelf-talker/embed?${params.toString()}`;
  };

  const handlePrint = (tmpl: string) => {
    const url = getPreviewUrl(tmpl);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        setTimeout(() => printWindow.print(), 500);
      });
    }
  };

  const hasSelection = effectiveIds.length > 0;
  const previewUrl = getPreviewUrl(template);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-shelf-talker-title">Shelf Talker Printer</h2>
        <span className="text-sm text-muted-foreground block">
          Print shelf talkers (product cards) for your retail displays. Select products and choose a card size to get started.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Filter by Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger data-testid="select-shelf-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Search Products</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, varietal, type..."
              className="pl-9"
              data-testid="input-shelf-search"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="text-sm font-medium">
            Select Products ({effectiveIds.length} of {filteredProducts.length} selected)
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            data-testid="button-shelf-select-all"
          >
            {selectAll ? "Deselect All" : "Select All"}
          </Button>
        </div>
        <div className="border rounded-md max-h-64 overflow-y-auto" data-testid="shelf-product-list">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No products match your filters.</div>
          ) : (
            filteredProducts.map(p => {
              const isSelected = selectAll || selectedIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover-elevate border-b last:border-b-0"
                  data-testid={`shelf-product-${p.id}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleProduct(p.id)}
                  />
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-8 h-8 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground block">
                      {p.category?.replace(/_/g, " ")} {p.vintageYear ? `· ${p.vintageYear}` : ""} {p.varietal ? `· ${p.varietal}` : ""}
                    </span>
                  </div>
                  <span className="text-sm font-medium shrink-0">${Number(p.price).toFixed(2)}</span>
                  {p.staffPick && <Badge variant="secondary" className="shrink-0 text-xs">Staff Pick</Badge>}
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Template</Label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger data-testid="select-shelf-template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic Elegant</SelectItem>
              <SelectItem value="modern">Modern Clean</SelectItem>
              <SelectItem value="rustic">Rustic Winery</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Card Size</Label>
          <Select value={cardSize} onValueChange={setCardSize}>
            <SelectTrigger data-testid="select-shelf-card-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARD_SIZES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Font Size: {scale}%</Label>
        <span className="text-xs text-muted-foreground block">Adjust text size to fit more or less content on each card.</span>
        <input
          type="range"
          min={60}
          max={140}
          step={5}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="w-full max-w-xs accent-primary"
          data-testid="slider-shelf-scale"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Fields to Include</Label>
        <span className="text-xs text-muted-foreground block">Choose which product information appears on the shelf talker.</span>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {FIELD_OPTIONS.map(f => (
            <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={fields[f.key]}
                onCheckedChange={() => toggleField(f.key)}
                data-testid={`checkbox-shelf-${f.key}`}
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-[#faf8f5] flex flex-col items-center justify-center p-4 text-center">
            <div style={{ fontSize: "6px", color: "#8b6914", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" as const }}>Staff Pick</div>
            <div className="w-10 h-14 rounded bg-[#e8dcc8] my-1" />
            <div style={{ fontSize: "7px", color: "#8b6914", fontWeight: 600 }}>2013</div>
            <div style={{ fontSize: "10px", color: "#2c1810", fontWeight: 700, fontStyle: "italic" }}>Karamazov Brothers</div>
            <div style={{ fontSize: "7px", color: "#2c1810", fontWeight: 700 }}>Pinot Noir</div>
            <div style={{ fontSize: "9px", color: "#8b6914", fontWeight: 700, marginTop: "2px" }}>88 POINTS</div>
            <div style={{ fontSize: "7px", color: "#666", lineHeight: 1.3, marginTop: "2px" }}>A classic example of a Russian River Pinot Noir...</div>
            <div style={{ fontSize: "6px", color: "#999", marginTop: "auto" }}>Wine · Nashoba Valley</div>
          </div>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-sm block">Classic Elegant</span>
                <span className="text-xs text-muted-foreground block">Serif, gold accents, warm</span>
              </div>
              {hasSelection && (
                <Button size="sm" onClick={() => handlePrint("classic")} data-testid="button-print-shelf-classic">
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-white flex flex-col items-center justify-center p-4 text-center">
            <div style={{ fontSize: "6px", color: "#6b46c1", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" as const }}>Staff Pick</div>
            <div className="w-10 h-14 rounded bg-[#f3f0ff] my-1" />
            <div style={{ fontSize: "7px", color: "#6b46c1", fontWeight: 600 }}>2013</div>
            <div style={{ fontSize: "10px", color: "#1a1a1a", fontWeight: 700 }}>Karamazov Brothers</div>
            <div style={{ fontSize: "7px", color: "#1a1a1a", fontWeight: 600 }}>Pinot Noir</div>
            <div style={{ fontSize: "9px", color: "#6b46c1", fontWeight: 700, marginTop: "2px" }}>88 POINTS</div>
            <div style={{ fontSize: "7px", color: "#555", lineHeight: 1.3, marginTop: "2px" }}>A classic example of a Russian River Pinot Noir...</div>
            <div style={{ fontSize: "6px", color: "#999", marginTop: "auto" }}>Wine · Nashoba Valley</div>
          </div>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-sm block">Modern Clean</span>
                <span className="text-xs text-muted-foreground block">Sans-serif, purple, minimal</span>
              </div>
              {hasSelection && (
                <Button size="sm" onClick={() => handlePrint("modern")} data-testid="button-print-shelf-modern">
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-[#f5f0e8] flex flex-col items-center justify-center p-4 text-center">
            <div style={{ fontSize: "6px", color: "#795548", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" as const }}>Staff Pick</div>
            <div className="w-10 h-14 rounded bg-[#d7ccc8] my-1" />
            <div style={{ fontSize: "7px", color: "#795548", fontWeight: 600 }}>2013</div>
            <div style={{ fontSize: "10px", color: "#3e2723", fontWeight: 700 }}>Karamazov Brothers</div>
            <div style={{ fontSize: "7px", color: "#3e2723", fontWeight: 600 }}>Pinot Noir</div>
            <div style={{ fontSize: "9px", color: "#795548", fontWeight: 700, marginTop: "2px" }}>88 POINTS</div>
            <div style={{ fontSize: "7px", color: "#6d4c41", lineHeight: 1.3, marginTop: "2px" }}>A classic example of a Russian River Pinot Noir...</div>
            <div style={{ fontSize: "6px", color: "#999", marginTop: "auto" }}>Wine · Nashoba Valley</div>
          </div>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-sm block">Rustic Winery</span>
                <span className="text-xs text-muted-foreground block">Earthy tones, warm serif</span>
              </div>
              {hasSelection && (
                <Button size="sm" onClick={() => handlePrint("rustic")} data-testid="button-print-shelf-rustic">
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasSelection && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
              <span>Print Preview ({effectiveIds.length} shelf talker{effectiveIds.length !== 1 ? "s" : ""} · {CARD_SIZES.find(s => s.value === cardSize)?.label})</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(template)}
                data-testid="button-open-shelf-print"
              >
                <Printer className="w-4 h-4 mr-1" />
                Open & Print
              </Button>
            </div>
            <iframe
              src={previewUrl}
              className="w-full border-0"
              style={{ height: "700px" }}
              title="Shelf Talker Preview"
              data-testid="iframe-shelf-talker-preview"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
