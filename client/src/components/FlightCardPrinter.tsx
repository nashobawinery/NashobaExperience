import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Printer,
  Loader2,
  Search,
  BookmarkPlus,
  Bookmark,
  Trash2,
  ChevronUp,
  ChevronDown,
  Info,
  TriangleAlert,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { FlightCardConfig } from "@shared/schema";
import { TypographyPanel, type TypoElem } from "@/components/TypographyPanel";

const FC_TYPO_ROWS = [
  { key: "header", label: "Header / Title" },
  { key: "name",   label: "Wine Name" },
  { key: "desc",   label: "Description" },
  { key: "meta",   label: "Varietal / Meta" },
];

const DEFAULT_FC_TYPO: Record<string, TypoElem> = {
  header: { font: "Playfair Display", size: 15,  bold: true,  italic: false },
  name:   { font: "Playfair Display", size: 9.5, bold: true,  italic: false },
  desc:   { font: "Playfair Display", size: 7.5, bold: false, italic: false },
  meta:   { font: "Playfair Display", size: 7.5, bold: false, italic: false },
};

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
  alcoholContent: string | null;
  available: boolean;
  staffPick: boolean;
}

const CATEGORIES = [
  { value: "wine", label: "Wine" },
  { value: "spirits", label: "Spirits" },
  { value: "beer", label: "Beer" },
  { value: "cider", label: "Cider" },
  { value: "canned_cocktail", label: "Canned Cocktails" },
  { value: "canned_wine", label: "Canned Wine" },
];

const PAPER_SIZES = [
  { value: "a6",   label: "A6 — 4.13×5.83\" (standard flight card)" },
  { value: "4x6",  label: "4×6\" Postcard" },
  { value: "a5",   label: "A5 — 5.83×8.27\" (6+ selections)" },
  { value: "5x7",  label: "5×7\" Photo Card" },
  { value: "half", label: "Half Sheet — 5.5×8.5\"" },
];

const TEMPLATES = [
  { value: "classic", label: "Classic Winery",   desc: "Cream parchment, burgundy accents, serif" },
  { value: "modern",  label: "Modern Clean",     desc: "White, blue accents, sans-serif" },
  { value: "rustic",  label: "Rustic Craft",     desc: "Kraft paper tones, earthy serif" },
];

// ─── Text Preset Management ──────────────────────────────────────────────────

interface TextPreset {
  id: string;
  text: string;
}

function useTextPresets(storageKey: string) {
  const [presets, setPresets] = useState<TextPreset[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });

  const persist = (next: TextPreset[]) => {
    setPresets(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const addPreset = (text: string) => {
    const t = text.trim();
    if (!t) return;
    persist([...presets, { id: String(Date.now()), text: t }]);
  };

  const editPreset = (id: string, text: string) => {
    persist(presets.map(p => p.id === id ? { ...p, text: text.trim() || p.text } : p));
  };

  const deletePreset = (id: string) => {
    persist(presets.filter(p => p.id !== id));
  };

  return { presets, addPreset, editPreset, deletePreset };
}

function TextPresetPicker({
  label,
  value,
  onChange,
  placeholder,
  storageKey,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  storageKey: string;
  testId: string;
}) {
  const { toast } = useToast();
  const { presets, addPreset, editPreset, deletePreset } = useTextPresets(storageKey);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleApply = (text: string) => {
    onChange(text);
    setOpen(false);
  };

  const handleSaveCurrent = () => {
    if (!value.trim()) {
      toast({ title: "Nothing to save — type some text first", variant: "destructive" });
      return;
    }
    addPreset(value);
    toast({ title: "Saved as preset" });
  };

  const startEdit = (preset: TextPreset) => {
    setEditingId(preset.id);
    setEditValue(preset.text);
  };

  const commitEdit = (id: string) => {
    if (editValue.trim()) editPreset(id, editValue);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const preview = value.trim();
  const saveLabel = preview.length > 28 ? `"${preview.slice(0, 28)}…"` : preview ? `"${preview}"` : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-medium">{label}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
              data-testid={`button-${testId}-presets`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Saved
              {presets.length > 0 && (
                <Badge variant="secondary" className="text-xs no-default-active-elevate">{presets.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-medium text-muted-foreground">Saved {label} Presets</p>
            </div>

            {presets.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-muted-foreground">
                No saved presets yet. Type a {label.toLowerCase()} and click save below.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y">
                {presets.map(preset => (
                  <div key={preset.id} className="px-3 py-2" data-testid={`preset-item-${preset.id}`}>
                    {editingId === preset.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") commitEdit(preset.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          data-testid={`input-preset-edit-${preset.id}`}
                        />
                        <Button size="icon" variant="ghost" onClick={() => commitEdit(preset.id)} data-testid={`button-preset-save-${preset.id}`}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit} data-testid={`button-preset-cancel-${preset.id}`}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="flex-1 text-left text-sm truncate py-0.5 px-1 rounded hover-elevate"
                          onClick={() => handleApply(preset.text)}
                          title={preset.text}
                          data-testid={`button-preset-apply-${preset.id}`}
                        >
                          {preset.text}
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(preset)}
                          data-testid={`button-preset-edit-${preset.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deletePreset(preset.id)}
                          data-testid={`button-preset-delete-${preset.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="px-3 py-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={!value.trim()}
                onClick={handleSaveCurrent}
                data-testid={`button-${testId}-save-preset`}
              >
                <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
                {saveLabel ? `Save ${saveLabel} as preset` : `Type a ${label.toLowerCase()} to save`}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
      />
    </div>
  );
}

// ─── Save Dialog ─────────────────────────────────────────────────────────────

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, showOnStaff: boolean) => void;
  isPending: boolean;
  defaultName?: string;
  defaultStaff?: boolean;
}

function SaveDialog({ open, onClose, onSave, isPending, defaultName = "", defaultStaff = false }: SaveDialogProps) {
  const [name, setName] = useState(defaultName);
  const [staff, setStaff] = useState(defaultStaff);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Flight Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Configuration Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Weekend Red Wine Flight"
              data-testid="input-flight-config-name"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Show on Staff Print Board</Label>
              <p className="text-xs text-muted-foreground">Staff can reprint this flight without re-configuring.</p>
            </div>
            <Switch
              checked={staff}
              onCheckedChange={setStaff}
              data-testid="switch-flight-staff-board"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!name.trim() || isPending}
            onClick={() => onSave(name.trim(), staff)}
            data-testid="button-save-flight-confirm"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookmarkPlus className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FlightCardPrinter() {
  const { toast } = useToast();

  const [template, setTemplate]           = useState("classic");
  const [paperSize, setPaperSize]         = useState("a6");
  const [fontScale, setFontScale]         = useState(100);
  const [header, setHeader]               = useState("");
  const [footer, setFooter]               = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [showPrice, setShowPrice]         = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showVintage, setShowVintage]     = useState(true);
  const [showVarietal, setShowVarietal]   = useState(true);
  const [showAlcohol, setShowAlcohol]     = useState(false);
  const [showTastingLines, setShowTastingLines] = useState(false);
  const [saveOpen, setSaveOpen]           = useState(false);
  const [editingConfig, setEditingConfig] = useState<FlightCardConfig | null>(null);
  const [fcTypo, setFcTypo]               = useState<Record<string, TypoElem>>(DEFAULT_FC_TYPO);

  const handleFcTypoChange = (key: string, field: keyof TypoElem, value: string | number | boolean) => {
    setFcTypo(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: savedConfigs = [], isLoading: configsLoading } = useQuery<FlightCardConfig[]>({
    queryKey: ["/api/media/flight-cards/configs"],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingConfig) {
        const res = await apiRequest("PUT", `/api/media/flight-cards/configs/${editingConfig.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/media/flight-cards/configs", payload);
      return res.json();
    },
    onSuccess: (cfg: FlightCardConfig) => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/flight-cards/configs"] });
      setSaveOpen(false);
      setEditingConfig(null);
      toast({ title: `Flight card "${cfg.name}" saved` });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/media/flight-cards/configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/flight-cards/configs"] });
      toast({ title: "Deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.available);
    if (categoryFilters.length > 0) {
      list = list.filter(p => categoryFilters.includes(p.category));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.varietal && p.varietal.toLowerCase().includes(q)) ||
        (p.type && p.type.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, categoryFilters, searchQuery]);

  const selectedProducts = useMemo(
    () => selectedIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[],
    [selectedIds, products]
  );

  const unselectedFiltered = filteredProducts.filter(p => !selectedIds.includes(p.id));

  const toggleCategory = (cat: string) => {
    setCategoryFilters(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleProduct = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelectedIds(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    setSelectedIds(prev => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const buildPrintUrl = useCallback((tmpl: string) => {
    const base = window.location.origin;
    const p = new URLSearchParams();
    p.set("ids", selectedIds.join(",") || "none");
    p.set("template", tmpl);
    p.set("size", paperSize);
    if (fontScale !== 100) p.set("scale", String(fontScale));
    if (header) p.set("header", header);
    if (footer) p.set("footer", footer);
    if (!showPrice) p.set("showprice", "0");
    if (!showDescription) p.set("showdesc", "0");
    if (!showVintage) p.set("showvintage", "0");
    if (!showVarietal) p.set("showvarietal", "0");
    if (showAlcohol) p.set("showalcohol", "1");
    if (showTastingLines) p.set("showtasting", "1");
    Object.entries(fcTypo).forEach(([k, el]) => {
      p.set(`${k}Font`, el.font);
      p.set(`${k}Sz`, String(el.size));
      if (el.bold) p.set(`${k}Bold`, "1");
      if (el.italic) p.set(`${k}Italic`, "1");
    });
    return `${base}/api/media/flight-cards/print?${p.toString()}`;
  }, [selectedIds, template, paperSize, fontScale, header, footer, showPrice, showDescription, showVintage, showVarietal, showAlcohol, showTastingLines, fcTypo]);

  const handlePrint = (tmpl: string) => {
    const url = buildPrintUrl(tmpl);
    const w = window.open(url, "_blank");
    if (w) {
      w.addEventListener("load", () => setTimeout(() => w.print(), 500));
    }
  };

  const handleSave = (name: string, showOnStaffBoard: boolean) => {
    saveMutation.mutate({
      name,
      header: header || null,
      footer: footer || null,
      productIds: selectedIds.join(","),
      template,
      paperSize,
      showPrice,
      showDescription,
      showVintage,
      showVarietal,
      showAlcohol,
      showTastingLines,
      fontScale,
      showOnStaffBoard,
    });
  };

  const loadConfig = (cfg: FlightCardConfig) => {
    setTemplate(cfg.template || "classic");
    setPaperSize(cfg.paperSize || "a6");
    setFontScale(cfg.fontScale || 100);
    setHeader(cfg.header || "");
    setFooter(cfg.footer || "");
    setShowPrice(cfg.showPrice !== false);
    setShowDescription(cfg.showDescription !== false);
    setShowVintage(cfg.showVintage !== false);
    setShowVarietal(cfg.showVarietal !== false);
    setShowAlcohol(cfg.showAlcohol === true);
    setShowTastingLines(cfg.showTastingLines === true);
    const ids = (cfg.productIds || "").split(",").filter(Boolean);
    setSelectedIds(ids);
    toast({ title: `Loaded "${cfg.name}"` });
  };

  const hasSelection = selectedIds.length > 0;
  const tooMany = selectedIds.length > 8;
  const previewUrl = buildPrintUrl(template);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-flight-card-title">Flight Card Printer</h2>
        <p className="text-sm text-muted-foreground">
          Design and print tasting flight cards. Select 3–6 products from your catalog, choose a template and paper size, then print or save for later.
        </p>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium block">Select Products</span>
                <span className="text-muted-foreground">Filter by category, search by name. Selected products are numbered in the order they'll appear on the card — use the arrows to reorder.</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Printer className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium block">Choose Size &amp; Template</span>
                <span className="text-muted-foreground">A6 fits 3–4 selections nicely. A5 or Half Sheet give more room for 5–6. Add a header (flight name) and optional footer.</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Bookmark className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium block">Save Flights</span>
                <span className="text-muted-foreground">Save a named configuration to reprint quickly. Toggle "Staff Print Board" so staff can reprint without reconfiguring.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {savedConfigs.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Saved Flight Cards</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {savedConfigs.map(cfg => (
              <Card key={cfg.id} className="flex items-center gap-3 p-3" data-testid={`flight-config-${cfg.id}`}>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm block truncate">{cfg.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {(cfg.productIds || "").split(",").filter(Boolean).length} product{(cfg.productIds || "").split(",").filter(Boolean).length !== 1 ? "s" : ""}
                    </span>
                    {cfg.showOnStaffBoard && (
                      <Badge variant="secondary" className="text-xs">Staff Board</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadConfig(cfg)}
                    data-testid={`button-load-flight-${cfg.id}`}
                  >
                    Load
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { if (confirm(`Delete "${cfg.name}"?`)) deleteMutation.mutate(cfg.id); }}
                    data-testid={`button-delete-flight-${cfg.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filter by Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleCategory(c.value)}
                  className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                    categoryFilters.includes(c.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover-elevate"
                  }`}
                  data-testid={`filter-category-${c.value}`}
                >
                  {c.label}
                </button>
              ))}
              {categoryFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategoryFilters([])}
                  className="px-3 py-1 rounded-md text-sm border border-border text-muted-foreground hover-elevate"
                  data-testid="button-clear-category-filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Search Products</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name, varietal, type..."
                className="pl-9"
                data-testid="input-flight-search"
              />
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">Selected for Flight ({selectedIds.length})</Label>
              {tooMany && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                  More than 8 selections may not fit on smaller paper sizes.
                </div>
              )}
              <div className="border rounded-md divide-y" data-testid="flight-selected-list">
                {selectedProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2" data-testid={`flight-selected-${p.id}`}>
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.category?.replace(/_/g, " ")}
                        {p.vintageYear ? ` · ${p.vintageYear}` : ""}
                        {p.varietal ? ` · ${p.varietal}` : ""}
                      </span>
                    </div>
                    <span className="text-sm font-medium shrink-0">${Number(p.price).toFixed(2)}</span>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="p-0.5 rounded hover-elevate disabled:opacity-30"
                        data-testid={`button-flight-up-${p.id}`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(i)}
                        disabled={i === selectedProducts.length - 1}
                        className="p-0.5 rounded hover-elevate disabled:opacity-30"
                        data-testid={`button-flight-down-${p.id}`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleProduct(p.id)}
                      data-testid={`button-flight-remove-${p.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-sm font-medium">
              Add Products {unselectedFiltered.length > 0 && <span className="font-normal text-muted-foreground">({unselectedFiltered.length} available)</span>}
            </Label>
            <div className="border rounded-md max-h-64 overflow-y-auto" data-testid="flight-product-list">
              {unselectedFiltered.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {filteredProducts.length === 0 ? "No products match your filters." : "All matching products are already selected."}
                </div>
              ) : (
                unselectedFiltered.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover-elevate border-b last:border-b-0"
                    data-testid={`flight-product-${p.id}`}
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => toggleProduct(p.id)}
                    />
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground block">
                        {p.category?.replace(/_/g, " ")}
                        {p.vintageYear ? ` · ${p.vintageYear}` : ""}
                        {p.varietal ? ` · ${p.varietal}` : ""}
                      </span>
                    </div>
                    <span className="text-sm font-medium shrink-0">${Number(p.price).toFixed(2)}</span>
                    {p.staffPick && <Badge variant="secondary" className="shrink-0 text-xs">Staff Pick</Badge>}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Paper Size</Label>
              <Select value={paperSize} onValueChange={setPaperSize}>
                <SelectTrigger data-testid="select-flight-paper-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_SIZES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Scale: {fontScale}%</Label>
              <input
                type="range"
                min={70}
                max={130}
                step={5}
                value={fontScale}
                onChange={e => setFontScale(Number(e.target.value))}
                className="w-full accent-primary mt-2"
                data-testid="slider-flight-scale"
              />
            </div>
          </div>

          <TextPresetPicker
            label="Flight Header / Title"
            value={header}
            onChange={setHeader}
            placeholder="e.g. Reserve Red Wine Flight"
            storageKey="flight-header-presets"
            testId="input-flight-header"
          />

          <TextPresetPicker
            label="Footer Text"
            value={footer}
            onChange={setFooter}
            placeholder="e.g. Ask your host about bottle prices"
            storageKey="flight-footer-presets"
            testId="input-flight-footer"
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Fields to Display</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "showPrice",        label: "Bottle Price",    value: showPrice,        set: setShowPrice },
                { key: "showDescription",  label: "Description",     value: showDescription,  set: setShowDescription },
                { key: "showVintage",      label: "Vintage Year",    value: showVintage,      set: setShowVintage },
                { key: "showVarietal",     label: "Varietal / Type", value: showVarietal,     set: setShowVarietal },
                { key: "showAlcohol",      label: "Alcohol Content", value: showAlcohol,      set: setShowAlcohol },
                { key: "showTastingLines", label: "Tasting Note Lines", value: showTastingLines, set: setShowTastingLines },
              ].map(f => (
                <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={f.value}
                    onCheckedChange={v => f.set(Boolean(v))}
                    data-testid={`checkbox-flight-${f.key}`}
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <TypographyPanel
            idPrefix="flight"
            title="Typography"
            rows={FC_TYPO_ROWS}
            values={fcTypo}
            onChange={handleFcTypoChange}
            onReset={() => setFcTypo(DEFAULT_FC_TYPO)}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Template</Label>
            <div className="grid gap-2">
              {TEMPLATES.map(tmpl => (
                <Card
                  key={tmpl.value}
                  className={`cursor-pointer transition-colors ${template === tmpl.value ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setTemplate(tmpl.value)}
                  data-testid={`card-flight-template-${tmpl.value}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <span className="font-medium text-sm">{tmpl.label}</span>
                        <span className="text-xs text-muted-foreground block">{tmpl.desc}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {template === tmpl.value && (
                          <Badge variant="default" className="text-xs">Selected</Badge>
                        )}
                        {hasSelection && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={e => { e.stopPropagation(); handlePrint(tmpl.value); }}
                            data-testid={`button-print-flight-${tmpl.value}`}
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => { setEditingConfig(null); setSaveOpen(true); }}
              variant="outline"
              disabled={!hasSelection}
              data-testid="button-save-flight-open"
            >
              <BookmarkPlus className="w-4 h-4 mr-2" />
              Save Flight Card
            </Button>
            {hasSelection && (
              <Button
                onClick={() => handlePrint(template)}
                data-testid="button-print-flight-active"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasSelection && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
              <span>
                Preview — {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} · {PAPER_SIZES.find(s => s.value === paperSize)?.label.split(" — ")[0] || paperSize}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(template)}
                data-testid="button-open-flight-print"
              >
                <Printer className="w-4 h-4 mr-1" />
                Open &amp; Print
              </Button>
            </div>
            <iframe
              src={previewUrl}
              className="w-full border-0"
              style={{ height: "600px" }}
              title="Flight Card Preview"
              data-testid="iframe-flight-card-preview"
            />
          </CardContent>
        </Card>
      )}

      <SaveDialog
        open={saveOpen}
        onClose={() => { setSaveOpen(false); setEditingConfig(null); }}
        onSave={handleSave}
        isPending={saveMutation.isPending}
        defaultName={editingConfig?.name || ""}
        defaultStaff={editingConfig?.showOnStaffBoard || false}
      />
    </div>
  );
}
