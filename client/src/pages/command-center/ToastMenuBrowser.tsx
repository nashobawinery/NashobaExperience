import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ToastSyncDialog } from "@/components/ToastSyncDialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RefreshCw, UtensilsCrossed, Loader2,
  ExternalLink, Eye, EyeOff, ListFilter,
  ArrowLeft, Code, Printer, Copy, Check, Wine,
  BookMarked, Trash2, Pencil, Save, Plus, DollarSign, Sparkles,
  BookOpen, HelpCircle, AlertCircle, Lightbulb, Share2, Monitor, Heading2
} from "lucide-react";
import { TypographyPanel, FONT_GROUPS, type TypoElem } from "@/components/TypographyPanel";

interface BrowserTypoSettings {
  title: TypoElem; subtitle: TypoElem; group: TypoElem; item: TypoElem;
  price: TypoElem; desc: TypoElem; pairing: TypoElem; allergy: TypoElem;
  header: TypoElem; footer: TypoElem; header2: TypoElem; footer2: TypoElem;
}

const DEFAULT_BROWSER_TYPO: BrowserTypoSettings = {
  title:    { font: "Cinzel",   size: 30, bold: false, italic: false },
  subtitle: { font: "Cinzel",   size: 26, bold: false, italic: false },
  group:    { font: "Cinzel",   size: 20, bold: false, italic: false },
  item:     { font: "Cinzel",   size: 17, bold: false, italic: false },
  price:    { font: "Jost",     size: 13, bold: false, italic: false },
  desc:     { font: "Jost",     size: 14, bold: false, italic: false },
  pairing:  { font: "Allura",   size: 16, bold: false, italic: false },
  allergy:  { font: "Jost",     size: 10, bold: false, italic: false },
  header:   { font: "Jost",     size: 14, bold: false, italic: false },
  footer:   { font: "Jost",     size: 12, bold: false, italic: false },
  header2:  { font: "Jost",     size: 14, bold: false, italic: false },
  footer2:  { font: "Jost",     size: 12, bold: false, italic: false },
};

const BROWSER_TYPO_ROWS: { key: string; label: string }[] = [
  { key: "title",    label: "Private Event Title (optional)" },
  { key: "subtitle", label: "Sub-header" },
  { key: "group",    label: "Section header / banner title" },
  { key: "item",     label: "Item name" },
  { key: "price",    label: "Price" },
  { key: "desc",     label: "Description / banner note" },
  { key: "pairing",  label: "Pairings" },
  { key: "allergy",  label: "Allergy text" },
  { key: "header",   label: "Header left (Knoll) / Custom header 1" },
  { key: "header2",  label: "Header right (Knoll) / Custom header 2" },
  { key: "footer",   label: "Footer note (Knoll) / Custom footer 1" },
  { key: "footer2",  label: "Custom footer 2" },
];

const ALL_FONT_OPTIONS = FONT_GROUPS.flatMap((g) => g.fonts.map((f) => f.value));

function buildTypoParams(t: BrowserTypoSettings): string {
  const e = encodeURIComponent;
  return [
    `titleFont=${e(t.title.font)}`,    `titleSz=${t.title.size}`,    t.title.bold    ? "titleBold=1"    : "", t.title.italic    ? "titleItalic=1"    : "",
    `subFont=${e(t.subtitle.font)}`,   `subSz=${t.subtitle.size}`,   t.subtitle.bold ? "subBold=1"      : "", t.subtitle.italic ? "subItalic=1"      : "",
    `groupFont=${e(t.group.font)}`,    `groupSz=${t.group.size}`,    t.group.bold    ? "groupBold=1"    : "", t.group.italic    ? "groupItalic=1"    : "",
    `itemFont=${e(t.item.font)}`,      `itemSz=${t.item.size}`,      t.item.bold     ? "itemBold=1"     : "", t.item.italic     ? "itemItalic=1"     : "",
    `priceFont=${e(t.price.font)}`,    `priceSz=${t.price.size}`,    t.price.bold    ? "priceBold=1"    : "", t.price.italic    ? "priceItalic=1"    : "",
    `descFont=${e(t.desc.font)}`,      `descSz=${t.desc.size}`,      t.desc.bold     ? "descBold=1"     : "", t.desc.italic     ? "descItalic=1"     : "",
    `pairFont=${e(t.pairing.font)}`,   `pairSz=${t.pairing.size}`,   t.pairing.bold  ? "pairBold=1"     : "", t.pairing.italic  ? "pairItalic=1"     : "",
    `allergyFont=${e(t.allergy.font)}`,`allergySz=${t.allergy.size}`,t.allergy.bold  ? "allergyBold=1"  : "", t.allergy.italic  ? "allergyItalic=1"  : "",
    `hdrFont=${e(t.header.font)}`,     `hdrSz=${t.header.size}`,     t.header.bold   ? "hdrBold=1"      : "", t.header.italic   ? "hdrItalic=1"      : "",
    `ftrFont=${e(t.footer.font)}`,     `ftrSz=${t.footer.size}`,     t.footer.bold   ? "ftrBold=1"      : "", t.footer.italic   ? "ftrItalic=1"      : "",
    `hdr2Font=${e(t.header2.font)}`,   `hdr2Sz=${t.header2.size}`,   t.header2.bold  ? "hdr2Bold=1"     : "", t.header2.italic  ? "hdr2Italic=1"     : "",
    `ftr2Font=${e(t.footer2.font)}`,   `ftr2Sz=${t.footer2.size}`,   t.footer2.bold  ? "ftr2Bold=1"     : "", t.footer2.italic  ? "ftr2Italic=1"     : "",
  ].filter(Boolean).join("&");
}

// Inverse of buildTypoParams: restore saved typography (font/size/bold/italic)
// from the stored query-param string back into the editor state.
function parseTypoParams(str?: string | null): BrowserTypoSettings {
  const base: BrowserTypoSettings = JSON.parse(JSON.stringify(DEFAULT_BROWSER_TYPO));
  if (!str) return base;
  const params = new URLSearchParams(str);
  const map: [keyof BrowserTypoSettings, string][] = [
    ["title", "title"], ["subtitle", "sub"], ["group", "group"], ["item", "item"],
    ["price", "price"], ["desc", "desc"], ["pairing", "pair"], ["allergy", "allergy"],
    ["header", "hdr"], ["footer", "ftr"], ["header2", "hdr2"], ["footer2", "ftr2"],
  ];
  for (const [key, prefix] of map) {
    const font = params.get(`${prefix}Font`);
    const sz = params.get(`${prefix}Sz`);
    if (font) base[key].font = font;
    if (sz != null && !isNaN(Number(sz))) base[key].size = Number(sz);
    base[key].bold = params.get(`${prefix}Bold`) === "1";
    base[key].italic = params.get(`${prefix}Italic`) === "1";
  }
  return base;
}

// Per-menu print/typography settings are remembered automatically (per Toast
// menu GUID) so reopening a menu restores its layout, fonts, ornament, page
// breaks, etc. without having to save a named embed config.
const PRINT_SETTINGS_KEY_PREFIX = "toast-menu-print-settings:";
const printSettingsStorageKey = (guid: string) => `${PRINT_SETTINGS_KEY_PREFIX}${guid}`;

const PRINT_ALLERGEN_TAGS = ["GF", "GFO", "V", "VG", "DF", "NF"] as const;
type PrintAllergenTag = (typeof PRINT_ALLERGEN_TAGS)[number];
const PRINT_ALLERGEN_LABELS: Record<PrintAllergenTag, string> = {
  GF: "Gluten Free",
  GFO: "Gluten-Free Option",
  V: "Vegan",
  VG: "Vegetarian",
  DF: "Dairy Free",
  NF: "Nut Free",
};

const KNOLL_HEADER_COLOR_OPTIONS = [
  { value: "pink", label: "Pink", hex: "#ec4899" },
  { value: "black", label: "Black", hex: "#111111" },
  { value: "navy", label: "Navy", hex: "#1e3a5f" },
  { value: "burgundy", label: "Burgundy", hex: "#7f1d1d" },
  { value: "forest", label: "Forest", hex: "#14532d" },
  { value: "teal", label: "Teal", hex: "#0f766e" },
  { value: "charcoal", label: "Charcoal", hex: "#374151" },
  { value: "orange", label: "Orange", hex: "#c2410c" },
  { value: "plum", label: "Plum", hex: "#6b21a8" },
] as const;
const KNOLL_HEADER_COLOR_VALUES = new Set(KNOLL_HEADER_COLOR_OPTIONS.map((c) => c.value));
const KNOLL_DEFAULT_HEADER_LEFT = "Dine in at";
const KNOLL_DEFAULT_HEADER_RIGHT = "Open Daily 11-8";
const KNOLL_DEFAULT_FOOTER_NOTE =
  "We will send a text when your food is ready for pick up at the Snack Shack counter. Please have your order # ready. Drinks will be delivered to your table.";
const KNOLL_DEFAULT_BANNER_TITLE = "LUNCH ON THE KNOLL";
const KNOLL_DEFAULT_BANNER_NOTE =
  "Serving lunch daily 11-4 pm. Please see server for assistance if you have a physical gift card to purchase food or beverage.";

function stripPrintLinePlainText(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isKnollLunchBannerTitleLine(text: string): boolean {
  const t = stripPrintLinePlainText(text).toUpperCase();
  return t.includes("LUNCH ON THE KNOLL");
}

function isKnollLunchBannerNoteLine(text: string): boolean {
  const t = stripPrintLinePlainText(text).toUpperCase();
  return t.includes("SERVING LUNCH DAILY") || t.includes("PHYSICAL GIFT CARD");
}

/** Pull legacy in-column lunch banner lines into the full-width Knoll banner fields. */
function migrateLunchBannerFromCustomLines(
  lines: PrintCustomLine[],
  existingTitle = "",
  existingNote = "",
): {
  lines: PrintCustomLine[];
  title: string;
  note: string;
} {
  let title = existingTitle.trim();
  let note = existingNote.trim();
  const titleNorm = stripPrintLinePlainText(title).toUpperCase();
  const noteNorm = stripPrintLinePlainText(note).toUpperCase();
  const kept: PrintCustomLine[] = [];
  for (const line of lines) {
    const plain = stripPrintLinePlainText(line.text);
    const plainUp = plain.toUpperCase();
    const isTitleKind = line.kind === "banner" || line.kind === "header";
    const isNoteKind = line.kind === "note" || line.kind === "banner";
    const titleLike =
      (isTitleKind && isKnollLunchBannerTitleLine(plain)) ||
      (isTitleKind && !!titleNorm && (plainUp === titleNorm || plainUp.includes(titleNorm)));
    const noteLike =
      (isNoteKind && isKnollLunchBannerNoteLine(plain)) ||
      (isNoteKind && !!noteNorm && (plainUp === noteNorm || plainUp.includes(noteNorm)));
    if (titleLike) {
      if (!title) title = plain;
      continue;
    }
    if (noteLike) {
      if (!note) note = plain;
      continue;
    }
    kept.push(line);
  }
  return { lines: kept, title, note };
}

function normalizeKnollHeaderColor(raw: string | null | undefined): string {
  const key = (raw || "pink").trim().toLowerCase();
  return KNOLL_HEADER_COLOR_VALUES.has(key as typeof KNOLL_HEADER_COLOR_OPTIONS[number]["value"]) ? key : "pink";
}

interface MenuPrintSettings {
  template: string;
  header: string;
  footer: string;
  header2: string;
  footer2: string;
  scale: number;
  groupGuids: string[];
  hideDescriptions: boolean;
  hidePricing: boolean;
  hideWinePairing: boolean;
  showImages: boolean;
  hideAllergyFooter: boolean;
  hideCourseHeadings: boolean;
  knollHeaderColor: string;
  ornament: string;
  ornamentPos: string;
  pages: number;
  pageBreaks: string[];
  customLines: PrintCustomLine[];
  customTitle: string;
  knollBannerTitle: string;
  knollBannerNote: string;
  itemFontScales: Record<string, number>;
  itemAllergens: Record<string, string[]>;
  typography: string;
  additionalMenuGuids: string[];
}

const DEFAULT_PRINT_SETTINGS: MenuPrintSettings = {
  template: "fine-dining",
  header: "",
  footer: "",
  header2: "",
  footer2: "",
  scale: 100,
  groupGuids: [],
  hideDescriptions: false,
  hidePricing: false,
  hideWinePairing: false,
  showImages: false,
  hideAllergyFooter: false,
  hideCourseHeadings: false,
  knollHeaderColor: "pink",
  ornament: "auto",
  ornamentPos: "below-title",
  pages: 0,
  pageBreaks: [],
  customLines: [],
  customTitle: "",
  knollBannerTitle: "",
  knollBannerNote: "",
  itemFontScales: {},
  itemAllergens: {},
  typography: buildTypoParams(DEFAULT_BROWSER_TYPO),
  additionalMenuGuids: [],
};

function readMenuPrintSettings(guid: string): MenuPrintSettings | null {
  try {
    const raw = localStorage.getItem(printSettingsStorageKey(guid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return { ...DEFAULT_PRINT_SETTINGS, ...parsed };
  } catch {
    return null;
  }
}


interface ToastRestaurant {
  guid: string;
  name: string;
  location: string | null;
}

interface ToastMenuData {
  id: number;
  menuGuid: string;
  restaurantGuid: string;
  name: string;
  description: string | null;
  orderable: boolean;
  visibility: string | null;
  syncedAt: string;
}

interface ToastMenuGroupData {
  id: number;
  groupGuid: string;
  menuGuid: string;
  restaurantGuid: string;
  name: string;
  description: string | null;
  displayOrder: number | null;
  visibility: string | null;
  hidden: boolean;
  syncedAt: string;
  items: ToastMenuItemData[];
}

interface ToastMenuItemData {
  id: number;
  itemGuid: string;
  groupGuid: string | null;
  menuGuid: string | null;
  restaurantGuid: string;
  name: string;
  description: string | null;
  price: string | null;
  posName: string | null;
  sku: string | null;
  plu: string | null;
  type: string | null;
  visibility: string | null;
  imageUrl: string | null;
  hidden: boolean | null;
  hidePrice: boolean | null;
  isSpecial: boolean | null;
  sizePrices: string | null;
  suggestedPairing: string | null;
  displayOrder: number | null;
  syncedAt: string;
}

interface MenuDetailData {
  menu: ToastMenuData;
  groups: ToastMenuGroupData[];
  totalItems: number;
}

interface SyncStatus {
  [restaurantGuid: string]: {
    menuCount: number;
    groupCount: number;
    itemCount: number;
    lastSynced: string;
  };
}

type PrintCustomLineKind = "banner" | "header" | "note" | "course" | "course-note";
type PrintCustomLineAlign = "left" | "center" | "right";

interface PrintCustomLine {
  id: string;
  kind: PrintCustomLineKind;
  text: string;
  placement: string;
  align: PrintCustomLineAlign;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
}

const PRINT_LINE_FONT_OPTIONS = ["Montserrat", "Cinzel", "Jost", "Allura", "Georgia", "Arial", "Times New Roman"];
const PRINT_LINE_KINDS: PrintCustomLineKind[] = ["banner", "header", "note", "course", "course-note"];

function formatPrice(price: string | null): string {
  if (!price) return "";
  const num = parseFloat(price);
  if (isNaN(num)) return "";
  return `$${num.toFixed(2)}`;
}

// Parse a human-typed size/price list (e.g. "Cup $6, Bowl $10" or
// "Cup - $6 / Bowl - $10") into the [{name, price}] JSON shape used for
// printing. Returns null when nothing usable was entered.
function parseSizePricesInput(input: string): string | null {
  const text = (input || "").trim();
  if (!text) return null;

  const buildFromEntries = (entries: string[]) => {
    const out: { name: string; price: string }[] = [];
    for (const raw of entries) {
      const entry = raw.trim();
      if (!entry) continue;
      const m = entry.match(/^(.*?)[\s:\-–—]*\$?\s*(\d+(?:\.\d{1,2})?)\s*$/);
      if (!m) continue;
      const name = m[1].replace(/^\s*(?:and|or)\b\s*/i, "").replace(/[\s:\-–—]+$/, "").trim();
      if (!name) continue;
      out.push({ name, price: m[2] });
    }
    return out;
  };

  // Normalize "and" / "&" / middot into commas so "Cup $6 and Bowl $10" works.
  const normalized = text
    .replace(/\s*&\s*/g, ", ")
    .replace(/\s+(?:and|or)\s+/gi, ", ")
    .replace(/\s*·\s*/g, ", ");

  let sizes = buildFromEntries(normalized.split(/[,\n;|\/]+/));

  // Fallback for input with no obvious separators but multiple "$" amounts
  // (e.g. "Cup $6 Bowl $10"): pull out each name + $price pair directly.
  if (sizes.length < 2) {
    const re = /([A-Za-z][A-Za-z0-9 .'’\-]*?)\s*\$\s*(\d+(?:\.\d{1,2})?)/g;
    const out: { name: string; price: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1].replace(/^\s*(?:and|or)\b\s*/i, "").trim();
      if (!name) continue;
      out.push({ name, price: m[2] });
    }
    if (out.length > sizes.length) sizes = out;
  }

  return sizes.length ? JSON.stringify(sizes) : null;
}

// Inverse of parseSizePricesInput: turn stored size-price JSON back into an
// editable "Cup $6.00, Bowl $10.00" string.
function formatSizePricesForEdit(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const sizes: { name: string; price: string }[] = JSON.parse(value);
    if (!Array.isArray(sizes)) return "";
    return sizes
      .filter((s) => s && s.name)
      .map((s) => `${s.name} ${formatPrice(s.price)}`)
      .join(", ");
  } catch {
    return "";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface AvailableMenu {
  guid: string;
  name: string;
  groupCount: number;
  itemCount: number;
}

interface StaffPrintMenuData {
  id: number;
  name: string;
  description: string | null;
  printUrl: string;
  menuGuid: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "list" | "detail" | "embed" | "print" | "staff-board" | "saved-menus" | "docs";

export function ToastMenuBrowser() {
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [printTemplate, setPrintTemplate] = useState("fine-dining");
  const [printScale, setPrintScale] = useState(100);
  const [printPages, setPrintPages] = useState(0);
  const [printFooter, setPrintFooter] = useState("");
  const [printHeader2, setPrintHeader2] = useState("");
  const [printFooter2, setPrintFooter2] = useState("");
  const [printHideDescriptions, setPrintHideDescriptions] = useState(false);
  const [printPageBreaks, setPrintPageBreaks] = useState<string[]>([]);
  const [selectedPrintGroups, setSelectedPrintGroups] = useState<string[]>([]);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [additionalMenuGuids, setAdditionalMenuGuids] = useState<string[]>([]);
  const [printHeader, setPrintHeader] = useState("");
  const [printHidePricing, setPrintHidePricing] = useState(false);
  const [printHideWinePairing, setPrintHideWinePairing] = useState(false);
  const [printShowImages, setPrintShowImages] = useState(false);
  const [printHideAllergyFooter, setPrintHideAllergyFooter] = useState(false);
  const [printHideCourseHeadings, setPrintHideCourseHeadings] = useState(false);
  const [printKnollHeaderColor, setPrintKnollHeaderColor] = useState("pink");
  const [printOrnament, setPrintOrnament] = useState("auto");
  const [printOrnamentPos, setPrintOrnamentPos] = useState("below-title");
  const [printCustomLines, setPrintCustomLines] = useState<PrintCustomLine[]>([]);
  const [printCustomTitle, setPrintCustomTitle] = useState("");
  const [printKnollBannerTitle, setPrintKnollBannerTitle] = useState("");
  const [printKnollBannerNote, setPrintKnollBannerNote] = useState("");
  const [printItemFontScales, setPrintItemFontScales] = useState<Record<string, number>>({});
  const [printItemAllergens, setPrintItemAllergens] = useState<Record<string, string[]>>({});
  const [printTypo, setPrintTypo] = useState<BrowserTypoSettings>(DEFAULT_BROWSER_TYPO);
  // Bumped after a successful save so the server-rendered live print preview
  // iframe reloads and reflects the just-saved item edits (sizes, descriptions, etc.).
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  // Snapshot of all current print/typography settings, used to remember them
  // per menu (see auto-persist effect below).
  const serializePrintSettings = (): MenuPrintSettings => ({
    template: printTemplate,
    header: printHeader,
    footer: printFooter,
    header2: printHeader2,
    footer2: printFooter2,
    scale: printScale,
    groupGuids: selectedPrintGroups,
    hideDescriptions: printHideDescriptions,
    hidePricing: printHidePricing,
    hideWinePairing: printHideWinePairing,
    showImages: printShowImages,
    hideAllergyFooter: printHideAllergyFooter,
    hideCourseHeadings: printHideCourseHeadings,
    knollHeaderColor: printKnollHeaderColor,
    ornament: printOrnament,
    ornamentPos: printOrnamentPos,
    pages: printPages,
    pageBreaks: printPageBreaks,
    customLines: printCustomLines,
    customTitle: printCustomTitle,
    knollBannerTitle: printKnollBannerTitle,
    knollBannerNote: printKnollBannerNote,
    itemFontScales: printItemFontScales,
    itemAllergens: printItemAllergens,
    typography: buildTypoParams(printTypo),
    additionalMenuGuids,
  });

  const applyPrintSettings = (s: MenuPrintSettings) => {
    const template = s.template || "fine-dining";
    setPrintTemplate(template);
    const isKnoll = template === "knoll";
    setPrintHeader(isKnoll ? (s.header?.trim() || KNOLL_DEFAULT_HEADER_LEFT) : (s.header || ""));
    setPrintFooter(isKnoll ? (s.footer?.trim() || KNOLL_DEFAULT_FOOTER_NOTE) : (s.footer || ""));
    setPrintHeader2(isKnoll ? (s.header2?.trim() || KNOLL_DEFAULT_HEADER_RIGHT) : (s.header2 || ""));
    setPrintFooter2(s.footer2 || "");
    setPrintScale(s.scale ?? 100);
    setSelectedPrintGroups(Array.isArray(s.groupGuids) ? s.groupGuids : []);
    setPrintHideDescriptions(!!s.hideDescriptions);
    setPrintHidePricing(!!s.hidePricing);
    setPrintHideWinePairing(!!s.hideWinePairing);
    setPrintShowImages(!!s.showImages);
    setPrintHideAllergyFooter(!!s.hideAllergyFooter);
    setPrintHideCourseHeadings(!!s.hideCourseHeadings);
    setPrintKnollHeaderColor(normalizeKnollHeaderColor(s.knollHeaderColor));
    setPrintOrnament(s.ornament || "auto");
    setPrintOrnamentPos(s.ornamentPos || "below-title");
    setPrintPages(s.pages ?? 0);
    setPrintPageBreaks(Array.isArray(s.pageBreaks) ? s.pageBreaks : []);
    setPrintCustomTitle(s.customTitle || "");
    {
      const rawLines = Array.isArray(s.customLines) ? s.customLines : [];
      let bannerTitle = s.knollBannerTitle || "";
      let bannerNote = s.knollBannerNote || "";
      let lines = rawLines;
      if (isKnoll) {
        const migrated = migrateLunchBannerFromCustomLines(rawLines, bannerTitle, bannerNote);
        lines = migrated.lines;
        bannerTitle = migrated.title;
        bannerNote = migrated.note;
      }
      setPrintCustomLines(lines);
      setPrintKnollBannerTitle(bannerTitle);
      setPrintKnollBannerNote(bannerNote);
    }
    setPrintItemFontScales(s.itemFontScales && typeof s.itemFontScales === "object" ? s.itemFontScales : {});
    setPrintItemAllergens(s.itemAllergens && typeof s.itemAllergens === "object" ? s.itemAllergens : {});
    {
      const typo = s.typography ? parseTypoParams(s.typography) : DEFAULT_BROWSER_TYPO;
      // Older Knoll defaults left the left header italic while the right was not.
      if (isKnoll && typo.header.italic && !typo.header2.italic && typo.header.font === typo.header2.font) {
        typo.header.italic = false;
      }
      setPrintTypo(typo);
    }
    setAdditionalMenuGuids(Array.isArray(s.additionalMenuGuids) ? s.additionalMenuGuids : []);
  };

  // Remember print/typography settings automatically per menu. Any change to a
  // design control is written to localStorage keyed by the menu GUID, so the
  // layout, fonts, ornament, page breaks, etc. are restored next time the menu
  // is opened (see openMenuDetail) without needing a named saved menu.
  useEffect(() => {
    if (!selectedMenu || viewMode !== "detail") return;
    try {
      localStorage.setItem(printSettingsStorageKey(selectedMenu), JSON.stringify(serializePrintSettings()));
    } catch {
      // ignore quota / unavailable storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMenu, viewMode, printTemplate, printHeader, printFooter, printHeader2, printFooter2, printScale,
    selectedPrintGroups, printHideDescriptions, printHidePricing, printHideWinePairing,
    printShowImages, printHideAllergyFooter, printHideCourseHeadings, printKnollHeaderColor, printOrnament,
    printOrnamentPos, printPages, printPageBreaks, printCustomLines, printCustomTitle,
    printKnollBannerTitle, printKnollBannerNote, printItemFontScales, printItemAllergens, printTypo, additionalMenuGuids,
  ]);

  const HEADER_PRESETS_KEY = "toast-menu-header-presets";
  const FOOTER_PRESETS_KEY = "toast-menu-footer-presets";
  const [headerPresets, setHeaderPresets] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HEADER_PRESETS_KEY) || "[]"); } catch { return []; }
  });
  const [footerPresets, setFooterPresets] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FOOTER_PRESETS_KEY) || "[]"); } catch { return []; }
  });
  const savePreset = (storageKey: string, value: string, presets: string[], setPresets: (p: string[]) => void) => {
    if (!value.trim() || presets.includes(value)) return;
    const updated = [...presets, value];
    setPresets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };
  const removePreset = (storageKey: string, value: string, presets: string[], setPresets: (p: string[]) => void) => {
    const updated = presets.filter(p => p !== value);
    setPresets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const [courseAboveDialog, setCourseAboveDialog] = useState<{
    itemGuid: string;
    itemName: string;
    mode: "add" | "edit";
  } | null>(null);
  const [courseAboveTitle, setCourseAboveTitle] = useState("");
  const [courseAboveNote, setCourseAboveNote] = useState("");
  const cleanMenuItemName = (name: string) =>
    name.replace(/\s*\((GF|GFO|V|VG|DF|NF)\)\s*/gi, " ").trim();

  const getCourseLinesForItem = (itemGuid: string, lines: PrintCustomLine[] = printCustomLines) => {
    const placement = `before-item:${itemGuid}`;
    const forItem = lines.filter(
      (line) =>
        (line.kind === "course" || line.kind === "course-note") &&
        line.placement === placement
    );
    return {
      placement,
      course: forItem.find((l) => l.kind === "course") || null,
      note: forItem.find((l) => l.kind === "course-note") || null,
      allIds: forItem.map((l) => l.id),
    };
  };

  const closeCourseAboveDialog = () => {
    setCourseAboveDialog(null);
    setCourseAboveTitle("");
    setCourseAboveNote("");
  };

  const addPrintCustomLine = (preset?: Partial<PrintCustomLine>) => {
    const isKnoll = printTemplate === "knoll" || preset?.kind === "course" || preset?.kind === "course-note";
    const kind = preset?.kind || (isKnoll ? "course" : "banner");
    const defaultsByKind: Record<PrintCustomLineKind, Partial<PrintCustomLine>> = {
      banner: { align: "center", font: "Jost", size: 14, bold: true, italic: false, placement: "after-title" },
      header: { align: "center", font: "Jost", size: 14, bold: true, italic: false, placement: "after-title" },
      note: { align: "left", font: "Jost", size: 11, bold: false, italic: true, placement: "after-title" },
      course: { align: "center", font: "Montserrat", size: 14, bold: true, italic: false, placement: "after-title", text: "" },
      "course-note": { align: "center", font: "Montserrat", size: 10, bold: false, italic: true, placement: "after-title", text: "" },
    };
    const defaults = defaultsByKind[kind];
    setPrintCustomLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length}`,
        kind,
        text: "",
        placement: "after-title",
        align: "center",
        font: isKnoll ? "Montserrat" : "Jost",
        size: 14,
        bold: false,
        italic: false,
        ...defaults,
        ...preset,
      },
    ]);
  };

  const openCourseAboveDialog = (itemGuid: string, itemName: string) => {
    const existing = getCourseLinesForItem(itemGuid);
    const hasExisting = !!existing.course || !!existing.note;
    setCourseAboveDialog({
      itemGuid,
      itemName: cleanMenuItemName(itemName),
      mode: hasExisting ? "edit" : "add",
    });
    setCourseAboveTitle(existing.course?.text || "");
    setCourseAboveNote(existing.note?.text || "");
  };

  /** Upsert a bold course title (+ optional note) above a specific Toast item. Replaces any existing course for that item. */
  const saveCourseAboveItem = (itemGuid: string, itemName: string, titleRaw: string, noteRaw: string, isEdit: boolean) => {
    const title = titleRaw.trim();
    if (!itemGuid) {
      toast({ title: "Pick an item", description: "Choose which menu item the course should appear above.", variant: "destructive" });
      return false;
    }
    if (!title) {
      toast({ title: "Course name required", description: "Enter a course title such as SANDWICHES.", variant: "destructive" });
      return false;
    }
    const placement = `before-item:${itemGuid}`;
    const stamp = Date.now();
    const note = noteRaw.trim();
    const cleanName = cleanMenuItemName(itemName) || "that item";
    const courseSize = Math.min(72, Math.max(11, Math.round((printTypo.item?.size || 14) * 1.18)));
    const noteSize = Math.min(72, Math.max(9, Math.round((printTypo.desc?.size || 12) * 0.95)));
    const courseFont = printTypo.item?.font || "Montserrat";
    const noteFont = printTypo.desc?.font || "Montserrat";
    setPrintCustomLines((prev) => {
      const withoutExisting = prev.filter(
        (line) =>
          !((line.kind === "course" || line.kind === "course-note") && line.placement === placement)
      );
      return [
        ...withoutExisting,
        {
          id: `line-${stamp}-course`,
          kind: "course" as const,
          text: title.toUpperCase(),
          placement,
          align: "center" as const,
          font: courseFont,
          size: courseSize,
          bold: true,
          italic: false,
        },
        ...(note
          ? [{
              id: `line-${stamp}-note`,
              kind: "course-note" as const,
              text: note,
              placement,
              align: "center" as const,
              font: noteFont,
              size: noteSize,
              bold: false,
              italic: true,
            }]
          : []),
      ];
    });
    toast({
      title: isEdit ? "Course updated" : "Course added to print menu",
      description: `"${title}" will print above ${cleanName}.`,
    });
    return true;
  };

  const deleteCourseAboveItem = (itemGuid: string, itemName: string) => {
    const placement = `before-item:${itemGuid}`;
    setPrintCustomLines((prev) =>
      prev.filter(
        (line) =>
          !((line.kind === "course" || line.kind === "course-note") && line.placement === placement)
      )
    );
    toast({
      title: "Course removed",
      description: `Course above ${cleanMenuItemName(itemName) || "item"} was deleted from the print menu.`,
    });
  };

  const confirmCourseAbove = () => {
    if (!courseAboveDialog) return;
    if (saveCourseAboveItem(
      courseAboveDialog.itemGuid,
      courseAboveDialog.itemName,
      courseAboveTitle,
      courseAboveNote,
      courseAboveDialog.mode === "edit"
    )) {
      closeCourseAboveDialog();
    }
  };

  const confirmDeleteCourseAbove = () => {
    if (!courseAboveDialog) return;
    deleteCourseAboveItem(courseAboveDialog.itemGuid, courseAboveDialog.itemName);
    closeCourseAboveDialog();
  };

  const updatePrintCustomLine = (id: string, change: Partial<PrintCustomLine>) => {
    setPrintCustomLines(prev => prev.map(line => line.id === id ? { ...line, ...change } : line));
  };

  const removePrintCustomLine = (id: string) => {
    setPrintCustomLines(prev => prev.filter(line => line.id !== id));
  };

  const serializePrintCustomLines = () => {
    const lines = printCustomLines
      .map(({ kind, text, placement, align, font, size, bold, italic }) => ({
        kind,
        text: text.trim(),
        placement,
        align,
        font,
        size,
        bold,
        italic,
      }))
      .filter(line => line.text && line.placement);
    return lines.length > 0 ? JSON.stringify(lines) : "";
  };

  const parsePrintCustomLines = (value: string | null | undefined): PrintCustomLine[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((line, index) => ({
          id: `line-${Date.now()}-${index}`,
          kind: PRINT_LINE_KINDS.includes(line?.kind) ? line.kind as PrintCustomLineKind : "banner",
          text: typeof line?.text === "string" ? line.text : "",
          placement: typeof line?.placement === "string" ? line.placement : "after-title",
          align: ["left", "center", "right"].includes(line?.align) ? line.align as PrintCustomLineAlign : "center",
          font: typeof line?.font === "string" && line.font.trim() ? line.font : "Jost",
          size: typeof line?.size === "number" ? Math.min(72, Math.max(8, line.size)) : 14,
          bold: !!line?.bold,
          italic: !!line?.italic,
        }))
        .filter(line => line.text.trim());
    } catch {
      return [];
    }
  };

  const setPrintItemFontScale = (itemGuid: string, scale: number) => {
    setPrintItemFontScales(prev => {
      const next = { ...prev };
      if (!itemGuid || scale === 1) {
        delete next[itemGuid];
      } else {
        next[itemGuid] = scale;
      }
      return next;
    });
  };

  const togglePrintItemAllergen = (itemGuid: string, tag: PrintAllergenTag) => {
    if (!itemGuid) return;
    setPrintItemAllergens(prev => {
      const current = prev[itemGuid] || [];
      const nextTags = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      const next = { ...prev };
      if (nextTags.length === 0) delete next[itemGuid];
      else next[itemGuid] = nextTags;
      return next;
    });
  };

  /** Serialize per-item print scale + allergen icons into the existing itemstyles payload. */
  const serializeItemPrintStyles = () => {
    const guids = new Set([
      ...Object.keys(printItemFontScales),
      ...Object.keys(printItemAllergens),
    ]);
    if (guids.size === 0) return "";
    const out: Record<string, number | { scale?: number; allergens: string[] }> = {};
    for (const guid of guids) {
      const scale = printItemFontScales[guid];
      const allergens = printItemAllergens[guid];
      if (allergens?.length) {
        out[guid] = {
          ...(scale && scale !== 1 ? { scale } : {}),
          allergens,
        };
      } else if (scale && scale !== 1) {
        out[guid] = scale;
      }
    }
    return Object.keys(out).length > 0 ? JSON.stringify(out) : "";
  };

  const parseItemPrintMetaClient = (value: string | null | undefined): {
    scales: Record<string, number>;
    allergens: Record<string, string[]>;
  } => {
    const scales: Record<string, number> = {};
    const allergens: Record<string, string[]> = {};
    if (!value) return { scales, allergens };
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { scales, allergens };
      for (const [key, raw] of Object.entries(parsed)) {
        if (!key) continue;
        if (typeof raw === "number" || typeof raw === "string") {
          const scale = Number(raw);
          if (!Number.isNaN(scale) && scale >= 0.7 && scale <= 1.8) scales[key] = scale;
          continue;
        }
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const obj = raw as { scale?: unknown; allergens?: unknown };
        const scale = Number(obj.scale);
        if (!Number.isNaN(scale) && scale >= 0.7 && scale <= 1.8) scales[key] = scale;
        if (Array.isArray(obj.allergens)) {
          const tags = obj.allergens
            .map((t) => String(t || "").toUpperCase().trim())
            .filter((t): t is PrintAllergenTag => (PRINT_ALLERGEN_TAGS as readonly string[]).includes(t));
          if (tags.length > 0) allergens[key] = [...new Set(tags)];
        }
      }
      return { scales, allergens };
    } catch {
      return { scales, allergens };
    }
  };

  const applyItemPrintMeta = (value: string | null | undefined) => {
    const meta = parseItemPrintMetaClient(value);
    setPrintItemFontScales(meta.scales);
    setPrintItemAllergens(meta.allergens);
  };

  const [activeDetailTab, setActiveDetailTab] = useState<"web" | "print">("print");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogTab, setSaveDialogTab] = useState<"update" | "new">("update");
  const [loadedEmbedConfigId, setLoadedEmbedConfigId] = useState<number | null>(null);
  const [loadedEmbedConfigName, setLoadedEmbedConfigName] = useState<string>("");
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveOverwriteId, setSaveOverwriteId] = useState<number | null>(null);
  const [editingBoardItem, setEditingBoardItem] = useState<{id: number; name: string; description: string} | null>(null);

  const [pendingItemChanges, setPendingItemChanges] = useState<Map<number, { hidden?: boolean; hidePrice?: boolean; isSpecial?: boolean; suggestedPairing?: string; description?: string; sizePrices?: string | null }>>(new Map());
  const [pendingGroupChanges, setPendingGroupChanges] = useState<Map<number, { hidden: boolean }>>(new Map());
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const [staticUrlName, setStaticUrlName] = useState("");
  const [copiedStaticId, setCopiedStaticId] = useState<number | null>(null);
  const [editingSavedConfig, setEditingSavedConfig] = useState<{id: number; name: string; description: string} | null>(null);
  const [copiedSavedConfigId, setCopiedSavedConfigId] = useState<number | null>(null);

  const { data: statusData } = useQuery<{
    configured: boolean;
    authenticated: boolean;
    restaurants: ToastRestaurant[];
  }>({
    queryKey: ["/api/toast/status"],
  });

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/toast/menus/sync-status"],
  });

  const restaurants = statusData?.restaurants || [];
  const isConfigured = statusData?.configured && statusData?.authenticated;
  const defaultRestaurant = restaurants.find(r => r.guid === "f6a9a99b-0a3a-4a5b-904f-c8c82a46d793") || restaurants.find(r => r.name.toLowerCase().includes("nashoba valley")) || restaurants[0];
  
  // Force Nashoba Valley Winery GUID as fallback
  const restaurantGuid = selectedRestaurant || defaultRestaurant?.guid || "f6a9a99b-0a3a-4a5b-904f-c8c82a46d793";

  const currentRestaurantStatus = restaurantGuid && syncStatus ? syncStatus[restaurantGuid] : null;

  // Debug logging
  console.log("ToastMenuBrowser Debug:", {
    restaurants: restaurants?.length,
    isConfigured,
    defaultRestaurant: defaultRestaurant?.name,
    restaurantGuid,
    selectedRestaurant
  });

  const { data: menus = [], isLoading: menusLoading } = useQuery<ToastMenuData[]>({
    queryKey: ["/api/toast/menus", { restaurantGuid }],
    enabled: !!restaurantGuid,
  });

  const { data: menuDetail, isLoading: detailLoading } = useQuery<MenuDetailData>({
    queryKey: ["/api/toast/public/menu", selectedMenu],
    queryFn: async () => {
      const res = await fetch(`/api/toast/public/menu/${selectedMenu}?includeHidden=true`);
      if (!res.ok) throw new Error("Failed to load menu detail");
      return res.json();
    },
    enabled: !!selectedMenu,
  });

  const additionalGuidsKey = additionalMenuGuids.join(",");
  const { data: additionalMenuDetailsList = [] } = useQuery<MenuDetailData[]>({
    queryKey: ["/api/toast/public/menus-combined", additionalGuidsKey],
    queryFn: async () => {
      if (!additionalGuidsKey) return [];
      const res = await fetch(`/api/toast/public/menus-combined?guids=${encodeURIComponent(additionalGuidsKey)}&includeHidden=true`);
      if (!res.ok) throw new Error("Failed to load additional menus");
      return res.json();
    },
    enabled: additionalMenuGuids.length > 0,
  });

  const allPrintGroups = useMemo(() => {
    const primary = (menuDetail?.groups || []).map(g => ({ ...g, sourceName: menuDetail?.menu?.name || "" }));
    const additional = additionalMenuDetailsList.flatMap(md =>
      (md.groups || []).map(g => ({ ...g, sourceName: md.menu?.name || "" }))
    );
    return [...primary, ...additional];
  }, [menuDetail, additionalMenuDetailsList]);

  interface EmbedConfig {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    menuGuids: string;
    template: string | null;
    header: string | null;
    footer: string | null;
    header2: string | null;
    footer2: string | null;
    scale: number | null;
    groupGuids: string | null;
    hideDescriptions: boolean | null;
    hidePricing: boolean | null;
    hideWinePairing: boolean | null;
    showImages: boolean | null;
    hideCourseHeadings: boolean | null;
    ornament: string | null;
    ornamentPosition: string | null;
    pages: number | null;
    pageBreaks: string | null;
    printAdditionalMenuGuids: string | null;
    customPrintLines: string | null;
    customTitle: string | null;
    itemPrintStyles: string | null;
    typography: string | null;
    showOnStaffBoard: boolean | null;
    createdAt: string;
    updatedAt: string;
  }

  const { data: embedConfigs = [] } = useQuery<EmbedConfig[]>({
    queryKey: ["/api/toast/embed-configs", selectedMenu],
    queryFn: async () => {
      if (!selectedMenu) return [];
      const res = await fetch(`/api/toast/embed-configs?menuGuid=${encodeURIComponent(selectedMenu)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedMenu,
  });

  const { data: allEmbedConfigs = [], isLoading: allConfigsLoading } = useQuery<EmbedConfig[]>({
    queryKey: ["/api/toast/embed-configs/all"],
    queryFn: async () => {
      const res = await fetch("/api/toast/embed-configs");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const invalidateAllConfigs = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/toast/embed-configs/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/toast/embed-configs", selectedMenu] });
    queryClient.invalidateQueries({ queryKey: ["/api/toast/staff-print-menus"] });
  };

  const getCurrentEmbedPayload = (name: string, description?: string) => ({
    name,
    description: description || null,
    menuGuids: selectedMenu || "",
    printAdditionalMenuGuids: additionalMenuGuids.length > 0 ? additionalMenuGuids.join(",") : null,
    template: printTemplate,
    header: printHeader || null,
    footer: printFooter || null,
    header2: printHeader2 || null,
    footer2: printFooter2 || null,
    scale: printScale,
    groupGuids: selectedPrintGroups.length > 0 ? selectedPrintGroups.join(",") : null,
    hideDescriptions: printHideDescriptions,
    hidePricing: printHidePricing,
    hideWinePairing: printHideWinePairing,
    showImages: printShowImages,
    hideCourseHeadings: printHideCourseHeadings,
    ornament: printOrnament,
    ornamentPosition: printOrnamentPos,
    pages: printPages,
    pageBreaks: printPageBreaks.length > 0 ? printPageBreaks.join(",") : null,
    customPrintLines: serializePrintCustomLines() || null,
    customTitle: printCustomTitle.trim() || null,
    itemPrintStyles: serializeItemPrintStyles() || null,
    typography: (() => {
      const typo = buildTypoParams(printTypo);
      const knollExtras = printTemplate === "knoll"
        ? [
            `headercolor=${encodeURIComponent(printKnollHeaderColor || "pink")}`,
            printKnollBannerTitle.trim() ? `banner=${encodeURIComponent(printKnollBannerTitle.trim())}` : "",
            printKnollBannerNote.trim() ? `bannernote=${encodeURIComponent(printKnollBannerNote.trim())}` : "",
          ].filter(Boolean).join("&")
        : "";
      return [typo, knollExtras].filter(Boolean).join("&") || null;
    })(),
  });

  const createEmbedConfigMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/toast/embed-configs", getCurrentEmbedPayload(name, description));
      return res.json();
    },
    onSuccess: () => {
      invalidateAllConfigs();
      setShowSaveDialog(false);
      setSaveName("");
      setSaveDescription("");
      setSaveOverwriteId(null);
      toast({ title: "Menu saved", description: "Find it in Saved Menus to edit, print, or share." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save menu.", variant: "destructive" }),
  });

  const updateEmbedConfigMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description?: string }) => {
      const res = await apiRequest("PUT", `/api/toast/embed-configs/${id}`, getCurrentEmbedPayload(name, description));
      return res.json();
    },
    onSuccess: () => {
      invalidateAllConfigs();
      setShowSaveDialog(false);
      setSaveName("");
      setSaveDescription("");
      setSaveOverwriteId(null);
      toast({ title: "Menu updated", description: "Your changes have been saved." });
    },
    onError: () => toast({ title: "Error", description: "Failed to update saved menu.", variant: "destructive" }),
  });

  const duplicateEmbedConfigMutation = useMutation({
    mutationFn: async (config: EmbedConfig) => {
      const res = await apiRequest("POST", "/api/toast/embed-configs", {
        name: `${config.name} Copy`,
        description: config.description,
        menuGuids: config.menuGuids,
        printAdditionalMenuGuids: config.printAdditionalMenuGuids,
        template: config.template,
        header: config.header,
        footer: config.footer,
        header2: config.header2,
        footer2: config.footer2,
        scale: config.scale,
        groupGuids: config.groupGuids,
        hideDescriptions: config.hideDescriptions,
        hidePricing: config.hidePricing,
        hideWinePairing: config.hideWinePairing,
        showImages: config.showImages,
        hideCourseHeadings: config.hideCourseHeadings,
        ornament: config.ornament,
        ornamentPosition: config.ornamentPosition,
        pages: config.pages,
        pageBreaks: config.pageBreaks,
        customPrintLines: config.customPrintLines,
        customTitle: config.customTitle,
        itemPrintStyles: config.itemPrintStyles,
        typography: config.typography,
        showOnStaffBoard: false,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidateAllConfigs();
      toast({ title: "Saved menu duplicated", description: "Rename the copy for the private event." });
    },
    onError: () => toast({ title: "Error", description: "Failed to duplicate saved menu.", variant: "destructive" }),
  });

  const patchEmbedConfigMutation = useMutation({
    mutationFn: async ({ id, ...fields }: { id: number; name?: string; description?: string; showOnStaffBoard?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/toast/embed-configs/${id}`, fields);
      return res.json();
    },
    onSuccess: () => {
      invalidateAllConfigs();
    },
    onError: () => toast({ title: "Error", description: "Failed to update saved menu.", variant: "destructive" }),
  });

  const deleteEmbedConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/toast/embed-configs/${id}`);
    },
    onSuccess: () => {
      invalidateAllConfigs();
      toast({ title: "Saved menu deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete saved menu.", variant: "destructive" }),
  });

  const handleOpenSyncDialog = () => {
    setShowSyncDialog(true);
  };

  const updateItemOverride = useMutation({
    mutationFn: async ({ itemId, ...data }: { itemId: number; hidden?: boolean; hidePrice?: boolean; isSpecial?: boolean; suggestedPairing?: string; description?: string; sizePrices?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/toast/menu-items/${itemId}/overrides`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith?.("/api/toast/");
      }});
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const updateGroupOverride = useMutation({
    mutationFn: async ({ groupId, hidden }: { groupId: number; hidden: boolean }) => {
      const res = await apiRequest("PATCH", `/api/toast/menu-groups/${groupId}/overrides`, { hidden });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith?.("/api/toast/");
      }});
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const hasPendingChanges = pendingItemChanges.size > 0 || pendingGroupChanges.size > 0;

  const applyItemChange = useCallback((itemId: number, change: { hidden?: boolean; hidePrice?: boolean; isSpecial?: boolean; suggestedPairing?: string; description?: string; sizePrices?: string | null }) => {
    setPendingItemChanges(prev => {
      const next = new Map(prev);
      next.set(itemId, { ...(next.get(itemId) || {}), ...change });
      return next;
    });
  }, []);

  const applyGroupChange = useCallback((groupId: number, hidden: boolean) => {
    setPendingGroupChanges(prev => {
      const next = new Map(prev);
      next.set(groupId, { hidden });
      return next;
    });
  }, []);

  const getEffectiveItem = useCallback((item: ToastMenuItemData): ToastMenuItemData => {
    const pending = pendingItemChanges.get(item.id);
    if (!pending) return item;
    return { ...item, ...pending };
  }, [pendingItemChanges]);

  const getEffectiveGroup = useCallback((group: ToastMenuGroupData): ToastMenuGroupData => {
    const pendingGroup = pendingGroupChanges.get(group.id);
    return {
      ...group,
      hidden: pendingGroup !== undefined ? pendingGroup.hidden : group.hidden,
      items: group.items.map(getEffectiveItem),
    };
  }, [pendingGroupChanges, getEffectiveItem]);

  const clearPendingChanges = useCallback(() => {
    setPendingItemChanges(new Map());
    setPendingGroupChanges(new Map());
  }, []);

  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      const itemPromises = Array.from(pendingItemChanges.entries()).map(([itemId, changes]) =>
        apiRequest("PATCH", `/api/toast/menu-items/${itemId}/overrides`, changes).then(r => r.json())
      );
      const groupPromises = Array.from(pendingGroupChanges.entries()).map(([groupId, changes]) =>
        apiRequest("PATCH", `/api/toast/menu-groups/${groupId}/overrides`, changes).then(r => r.json())
      );
      await Promise.all([...itemPromises, ...groupPromises]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith?.("/api/toast/");
      }});
      clearPendingChanges();
      setPreviewRefreshKey((k) => k + 1);
      toast({ title: "Changes saved" });
      if (pendingNavAction) {
        pendingNavAction();
        setPendingNavAction(null);
        setShowUnsavedWarning(false);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const navigateWithCheck = useCallback((action: () => void) => {
    if (pendingItemChanges.size > 0 || pendingGroupChanges.size > 0) {
      setPendingNavAction(() => action);
      setShowUnsavedWarning(true);
    } else {
      action();
    }
  }, [pendingItemChanges, pendingGroupChanges]);

  const { data: staffPrintMenuList = [] } = useQuery<StaffPrintMenuData[]>({
    queryKey: ["/api/toast/staff-print-menus"],
  });


  const deleteStaffPrintMenu = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/toast/staff-print-menus/${id}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toast/staff-print-menus"] });
      toast({ title: "Removed from Staff Board" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStaffPrintMenuMeta = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description: string }) => {
      const res = await apiRequest("PATCH", `/api/toast/staff-print-menus/${id}`, { name, description });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toast/staff-print-menus"] });
      setEditingBoardItem(null);
      toast({ title: "Updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const getEmbedUrl = (menuGuid: string, template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean, header?: string, hidePricing?: boolean, hideWinePairing?: boolean, showImages?: boolean, hideAllergyFooter?: boolean) => {
    const base = window.location.origin;
    let url = `${base}/api/toast/public/menu/${encodeURIComponent(menuGuid)}/embed?template=${template}`;
    if (groupGuids && groupGuids.length > 0) url += `&groupGuid=${encodeURIComponent(groupGuids.join(","))}`;
    if (scale && scale !== 100) url += `&scale=${scale}`;
    if (pages && pages !== 0) url += `&pages=${pages}`;
    if (footer) url += `&footer=${encodeURIComponent(footer)}`;
    if (pageBreaks && pageBreaks.length > 0) url += `&pagebreaks=${encodeURIComponent(pageBreaks.join(","))}`;
    if (hideDescriptions) url += `&hidedesc=1`;
    if (hidePricing) url += `&hideprice=1`;
    if (hideWinePairing) url += `&hidepairing=1`;
    if (showImages) url += `&showimages=1`;
    if (hideAllergyFooter) url += `&hideAllergyFooter=1`;
    if (printHideCourseHeadings) url += `&hidegroups=1`;
    if (template === "knoll") {
      url += `&headercolor=${encodeURIComponent(printKnollHeaderColor || "pink")}`;
      const left = (header ?? printHeader).trim() || KNOLL_DEFAULT_HEADER_LEFT;
      const right = printHeader2.trim() || KNOLL_DEFAULT_HEADER_RIGHT;
      url += `&header=${encodeURIComponent(left)}`;
      url += `&header2=${encodeURIComponent(right)}`;
      if (printKnollBannerTitle.trim()) url += `&banner=${encodeURIComponent(printKnollBannerTitle.trim())}`;
      if (printKnollBannerNote.trim()) url += `&bannernote=${encodeURIComponent(printKnollBannerNote.trim())}`;
    } else {
      if (header) url += `&header=${encodeURIComponent(header)}`;
      if (printHeader2.trim()) url += `&header2=${encodeURIComponent(printHeader2.trim())}`;
    }
    if (printOrnament && printOrnament !== "auto") url += `&ornament=${encodeURIComponent(printOrnament)}`;
    if (printOrnamentPos && printOrnamentPos !== "below-title") url += `&ornamentpos=${encodeURIComponent(printOrnamentPos)}`;
    if (printFooter2.trim()) url += `&footer2=${encodeURIComponent(printFooter2.trim())}`;
    if (printCustomTitle.trim()) url += `&title=${encodeURIComponent(printCustomTitle.trim())}`;
    const itemStyles = serializeItemPrintStyles();
    if (itemStyles) url += `&itemstyles=${encodeURIComponent(itemStyles)}`;
    return url;
  };

  const getMultiMenuEmbedUrl = (menuGuids: string[], template: string, groupGuids?: string[], scale?: number, pages?: number, footer?: string, pageBreaks?: string[], hideDescriptions?: boolean, header?: string, hidePricing?: boolean, hideWinePairing?: boolean, showImages?: boolean, hideAllergyFooter?: boolean) => {
    const base = window.location.origin;
    let url = `${base}/api/toast/public/menus/embed?menus=${encodeURIComponent(menuGuids.join(","))}&template=${template}`;
    if (groupGuids && groupGuids.length > 0) url += `&groupGuid=${encodeURIComponent(groupGuids.join(","))}`;
    if (scale && scale !== 100) url += `&scale=${scale}`;
    if (pages && pages > 0) url += `&pages=${pages}`;
    if (footer && footer.trim()) url += `&footer=${encodeURIComponent(footer.trim())}`;
    if (pageBreaks && pageBreaks.length > 0) url += `&pagebreaks=${encodeURIComponent(pageBreaks.join(","))}`;
    if (hideDescriptions) url += `&hidedesc=1`;
    if (template === "knoll") {
      const left = (header ?? printHeader).trim() || KNOLL_DEFAULT_HEADER_LEFT;
      const right = printHeader2.trim() || KNOLL_DEFAULT_HEADER_RIGHT;
      url += `&header=${encodeURIComponent(left)}`;
      url += `&header2=${encodeURIComponent(right)}`;
      url += `&headercolor=${encodeURIComponent(printKnollHeaderColor || "pink")}`;
      if (printKnollBannerTitle.trim()) url += `&banner=${encodeURIComponent(printKnollBannerTitle.trim())}`;
      if (printKnollBannerNote.trim()) url += `&bannernote=${encodeURIComponent(printKnollBannerNote.trim())}`;
    } else {
      if (header && header.trim()) url += `&header=${encodeURIComponent(header.trim())}`;
      if (printHeader2.trim()) url += `&header2=${encodeURIComponent(printHeader2.trim())}`;
    }
    if (printFooter2.trim()) url += `&footer2=${encodeURIComponent(printFooter2.trim())}`;
    if (hidePricing) url += `&hideprice=1`;
    if (hideWinePairing) url += `&hidepairing=1`;
    if (showImages) url += `&showimages=1`;
    if (hideAllergyFooter) url += `&hideAllergyFooter=1`;
    if (printHideCourseHeadings) url += `&hidegroups=1`;
    if (printOrnament && printOrnament !== "auto") url += `&ornament=${encodeURIComponent(printOrnament)}`;
    if (printOrnamentPos && printOrnamentPos !== "below-title") url += `&ornamentpos=${encodeURIComponent(printOrnamentPos)}`;
    if (printCustomTitle.trim()) url += `&title=${encodeURIComponent(printCustomTitle.trim())}`;
    const itemStyles = serializeItemPrintStyles();
    if (itemStyles) url += `&itemstyles=${encodeURIComponent(itemStyles)}`;
    return url;
  };

  const buildPrintUrl = (template: string) => {
    const printGroups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
    const typoStr = buildTypoParams(printTypo);
    let url: string;
    if (additionalMenuGuids.length > 0 && selectedMenu) {
      url = getMultiMenuEmbedUrl([selectedMenu, ...additionalMenuGuids], template, printGroups, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printShowImages, printHideAllergyFooter);
    } else {
      url = getEmbedUrl(selectedMenu!, template, printGroups, printScale, printPages, printFooter, printPageBreaks, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printShowImages, printHideAllergyFooter);
    }
    const customLines = serializePrintCustomLines();
    if (customLines) url += `&customlines=${encodeURIComponent(customLines)}`;
    return typoStr ? `${url}&${typoStr}` : url;
  };

  const getEmbedCode = (menuGuid: string, template: string, groupGuids?: string[], footer?: string, hideDescriptions?: boolean, header?: string, hidePricing?: boolean, hideWinePairing?: boolean, showImages?: boolean) => {
    const url = getEmbedUrl(menuGuid, template, groupGuids, undefined, undefined, footer, undefined, hideDescriptions, header, hidePricing, hideWinePairing, showImages);
    return `<iframe src="${url}" width="100%" height="800" frameborder="0" style="border:none; max-width:900px; margin:0 auto; display:block;"></iframe>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const openPrintView = (url: string) => {
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        setTimeout(() => printWindow.print(), 500);
      });
    }
  };

  const loadFromBoardItem = (item: StaffPrintMenuData) => {
    try {
      const fullUrl = new URL(item.printUrl, window.location.origin);
      const params = fullUrl.searchParams;

      const menusParam = params.get("menus");
      let primaryMenuGuid: string | null = null;
      let extraMenuGuids: string[] = [];

      if (menusParam) {
        const guids = menusParam.split(",").map(g => g.trim()).filter(Boolean);
        primaryMenuGuid = guids[0] || null;
        extraMenuGuids = guids.slice(1);
      } else {
        const pathMatch = fullUrl.pathname.match(/\/menu\/([^/]+)\/embed/);
        primaryMenuGuid = pathMatch ? pathMatch[1] : (item.menuGuid || null);
      }

      if (!primaryMenuGuid) {
        toast({ title: "Cannot load settings", description: "Menu GUID not found in saved URL.", variant: "destructive" });
        return;
      }

      const loadedTemplate = params.get("template") || "fine-dining";
      const loadedIsKnoll = loadedTemplate === "knoll";
      setPrintTemplate(loadedTemplate);
      setSelectedPrintGroups(params.get("groupGuid") ? params.get("groupGuid")!.split(",").map(g => g.trim()).filter(Boolean) : []);
      setPrintHeader(loadedIsKnoll ? (params.get("header")?.trim() || KNOLL_DEFAULT_HEADER_LEFT) : (params.get("header") || ""));
      setPrintFooter(loadedIsKnoll ? (params.get("footer")?.trim() || KNOLL_DEFAULT_FOOTER_NOTE) : (params.get("footer") || ""));
      setPrintHeader2(loadedIsKnoll ? (params.get("header2")?.trim() || KNOLL_DEFAULT_HEADER_RIGHT) : (params.get("header2") || ""));
      setPrintFooter2(params.get("footer2") || "");
      setPrintScale(parseFloat(params.get("scale") || "100") || 100);
      setPrintHideDescriptions(params.get("hidedesc") === "1");
      setPrintHidePricing(params.get("hideprice") === "1");
      setPrintHideWinePairing(params.get("hidepairing") === "1");
      setPrintShowImages(params.get("showimages") === "1");
      setPrintHideCourseHeadings(params.get("hidegroups") === "1");
      setPrintKnollHeaderColor(normalizeKnollHeaderColor(params.get("headercolor")));
      setPrintOrnament(params.get("ornament") || "auto");
      setPrintOrnamentPos(params.get("ornamentpos") || "below-title");
      setPrintPages(parseInt(params.get("pages") || "0") || 0);
      setPrintPageBreaks(params.get("pagebreaks") ? params.get("pagebreaks")!.split(",").map(g => g.trim()).filter(Boolean) : []);
      setPrintCustomLines(parsePrintCustomLines(params.get("customlines")));
      setPrintCustomTitle(params.get("title") || "");
      setPrintKnollBannerTitle(params.get("banner") || "");
      setPrintKnollBannerNote(params.get("bannernote") || "");
      applyItemPrintMeta(params.get("itemstyles"));
      setAdditionalMenuGuids(extraMenuGuids);

      clearPendingChanges();
      setSelectedMenu(primaryMenuGuid);
      setViewMode("detail");
      toast({ title: `"${item.name}" loaded`, description: "All settings restored. Edit above, then resave to the Staff Print Board." });
    } catch {
      toast({ title: "Failed to load settings", description: "Could not parse the saved menu URL.", variant: "destructive" });
    }
  };

  const loadFromEmbedConfig = (config: EmbedConfig) => {
    const primaryGuid = config.menuGuids?.trim() || null;
    if (!primaryGuid) {
      toast({ title: "Cannot load", description: "No menu GUID found in saved config.", variant: "destructive" });
      return;
    }
    clearPendingChanges();
    const loadedTemplate = config.template || "fine-dining";
    const loadedIsKnoll = loadedTemplate === "knoll";
    setPrintTemplate(loadedTemplate);
    setPrintHeader(loadedIsKnoll ? (config.header?.trim() || KNOLL_DEFAULT_HEADER_LEFT) : (config.header || ""));
    setPrintFooter(loadedIsKnoll ? (config.footer?.trim() || KNOLL_DEFAULT_FOOTER_NOTE) : (config.footer || ""));
    setPrintHeader2(loadedIsKnoll ? (config.header2?.trim() || KNOLL_DEFAULT_HEADER_RIGHT) : (config.header2 || ""));
    setPrintFooter2(config.footer2 || "");
    setPrintScale(config.scale || 100);
    setPrintHideDescriptions(config.hideDescriptions || false);
    setPrintHidePricing(config.hidePricing || false);
    setPrintHideWinePairing(config.hideWinePairing || false);
    setPrintShowImages(config.showImages || false);
    setPrintHideCourseHeadings(config.hideCourseHeadings || false);
    {
      const typoParams = new URLSearchParams(config.typography || "");
      setPrintKnollHeaderColor(normalizeKnollHeaderColor(typoParams.get("headercolor")));
      let bannerTitle = typoParams.get("banner") || "";
      let bannerNote = typoParams.get("bannernote") || "";
      let lines = parsePrintCustomLines(config.customPrintLines);
      if (loadedIsKnoll) {
        const migrated = migrateLunchBannerFromCustomLines(lines, bannerTitle, bannerNote);
        lines = migrated.lines;
        bannerTitle = migrated.title;
        bannerNote = migrated.note;
      }
      setPrintKnollBannerTitle(bannerTitle);
      setPrintKnollBannerNote(bannerNote);
      setPrintCustomLines(lines);
    }
    setPrintOrnament(config.ornament || "auto");
    setPrintOrnamentPos(config.ornamentPosition || "below-title");
    setPrintPages(config.pages || 0);
    setPrintPageBreaks(config.pageBreaks ? config.pageBreaks.split(",").filter(Boolean) : []);
    setPrintCustomTitle(config.customTitle || "");
    applyItemPrintMeta(config.itemPrintStyles);
    {
      const typo = parseTypoParams(config.typography);
      if (loadedIsKnoll && typo.header.italic && !typo.header2.italic && typo.header.font === typo.header2.font) {
        typo.header.italic = false;
      }
      setPrintTypo(typo);
    }
    setSelectedPrintGroups(config.groupGuids ? config.groupGuids.split(",").filter(Boolean) : []);
    // Use dedicated print additional guids if available, otherwise fall back to legacy multi-guid format
    if (config.printAdditionalMenuGuids) {
      setAdditionalMenuGuids(config.printAdditionalMenuGuids.split(",").filter(Boolean));
    } else {
      const allGuids = config.menuGuids.split(",").map(g => g.trim()).filter(Boolean);
      setAdditionalMenuGuids(allGuids.slice(1));
    }
    setSaveName(config.name);
    setSaveDescription(config.description || "");
    setSaveOverwriteId(config.id);
    setLoadedEmbedConfigId(config.id);
    setLoadedEmbedConfigName(config.name);
    setActiveDetailTab("print");
    setSelectedMenu(primaryGuid);
    setViewMode("detail");
    toast({ title: `"${config.name}" loaded`, description: "All settings restored. Edit, then resave." });
  };

  const openMenuDetail = (menuGuid: string) => {
    const doOpen = () => {
      clearPendingChanges();
      setSelectedMenu(menuGuid);
      setViewMode("detail");
      // Restore this menu's remembered print/typography settings (or fall back
      // to defaults for a menu that's never been customized).
      applyPrintSettings(readMenuPrintSettings(menuGuid) ?? DEFAULT_PRINT_SETTINGS);
      setLoadedEmbedConfigId(null);
      setLoadedEmbedConfigName("");
      setSaveName("");
      setSaveDescription("");
      setSaveOverwriteId(null);
    };
    if (viewMode === "detail" && selectedMenu !== menuGuid) {
      navigateWithCheck(doOpen);
    } else {
      doOpen();
    }
  };

  const goBack = () => {
    navigateWithCheck(() => {
      clearPendingChanges();
      setSelectedMenu(null);
      setViewMode("list");
    });
  };

  if (!isConfigured) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold" data-testid="text-toast-menus-title">Toast Menu Items</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              Toast API is not configured. Please set up your Toast integration in Settings to sync menu items.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderMenuList = () => (
    <>
      <div className="rounded-md border bg-muted/30 px-4 py-3 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <UtensilsCrossed className="w-5 h-5 text-muted-foreground shrink-0 hidden sm:block mt-0.5" />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Toast Menu Printer</span> syncs your Toast POS menus so you can prepare them for print and the web.
            Sync from Toast, open a menu, select which courses to include, then save a named configuration.
            Saved menus can be printed instantly, shared via a permanent link, or pinned to the Staff Print Board for front-of-house staff.{" "}
            <button
              onClick={() => setViewMode("docs")}
              className="text-primary underline font-medium"
              data-testid="link-view-docs-inline"
            >
              Click here for more information.
            </button>
          </div>
        </div>
        <div className="border-t pt-2.5 flex flex-col sm:flex-row sm:items-start gap-2">
          <p className="text-xs font-medium text-foreground shrink-0">Dietary badges:</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Add a code in parentheses to an item's name in Toast POS, or toggle print icons on any item below (print-only; not written back to Toast).
            Supported:{" "}
            <span className="font-medium text-foreground">(GF)</span> Gluten Free &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(GFO)</span> Gluten-Free Option &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(V)</span> Vegan &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(VG)</span> Vegetarian &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(DF)</span> Dairy Free &nbsp;&middot;&nbsp;
            <span className="font-medium text-foreground">(NF)</span> Nut Free.
            Toast name codes are stripped from the printed item name automatically.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold" data-testid="text-toast-menus-title">Toast Menu Items</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {restaurants.length > 1 && (
            <Select
              value={restaurantGuid}
              onValueChange={(v) => {
                setSelectedRestaurant(v);
                setSelectedMenu(null);
              }}
            >
              <SelectTrigger className="w-48" data-testid="select-restaurant">
                <SelectValue placeholder="Select restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.guid} value={r.guid}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={() => setViewMode("saved-menus")}
            data-testid="button-saved-menus"
          >
            <Save className="w-4 h-4 mr-2" />
            Saved Menus
            {allEmbedConfigs.length > 0 && (
              <Badge variant="secondary" className="ml-2 no-default-active-elevate">{allEmbedConfigs.length}</Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewMode("staff-board")}
            data-testid="button-staff-board"
          >
            <BookMarked className="w-4 h-4 mr-2" />
            Staff Board
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewMode("docs")}
            data-testid="button-docs"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            How It Works
          </Button>
          <Button
            onClick={handleOpenSyncDialog}
            disabled={!restaurantGuid}
            data-testid="button-sync-menus"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Menus from Toast
          </Button>
        </div>
      </div>

      {currentRestaurantStatus && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span>Last synced: {formatDate(currentRestaurantStatus.lastSynced)}</span>
          <Badge variant="secondary">{currentRestaurantStatus.menuCount} menus</Badge>
          <Badge variant="secondary">{currentRestaurantStatus.groupCount} groups</Badge>
          <Badge variant="secondary">{currentRestaurantStatus.itemCount} items</Badge>
        </div>
      )}

      {menusLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
            <p className="font-medium mb-1">Loading menus...</p>
          </CardContent>
        </Card>
      ) : menus.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">No menu items synced yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Sync Menus from Toast" to pull in your menu items.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Card
              key={menu.id}
              className="cursor-pointer hover-elevate transition-all"
              onClick={() => openMenuDetail(menu.menuGuid)}
              data-testid={`card-menu-${menu.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate" data-testid={`text-menu-name-${menu.id}`}>{menu.name}</h3>
                    {menu.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{menu.description}</p>
                    )}
                  </div>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0 mt-1" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Synced {formatDate(menu.syncedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderMenuDetail = () => {
    if (!selectedMenu) return null;
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
    if (!menuDetail) return null;

    const handlePrint = (template: string) => openPrintView(buildPrintUrl(template));

    // Web share URL — no page breaks, no columns
    const sharedGroups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
    const sharedUrl = (() => { const u = getEmbedUrl(selectedMenu, printTemplate, sharedGroups, undefined, undefined, printFooter, undefined, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printShowImages); const tp = buildTypoParams(printTypo); return tp ? `${u}&${tp}` : u; })();
    const sharedEmbedCode = getEmbedCode(selectedMenu, printTemplate, sharedGroups, printFooter, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printShowImages);
    const livePreviewUrl = `${buildPrintUrl(printTemplate)}&preview=print&_r=${previewRefreshKey}`;

    // Merge menus helpers for Print tab
    const primaryMenuName = menuDetail?.menu?.name || "";
    const baseMenuName = primaryMenuName.replace(/\s*\(copy\)(\s+\d+)?$/i, "").trim();
    const otherMenus = menus.filter(m => m.menuGuid !== selectedMenu);
    const suggestedMenus = otherMenus.filter(m => baseMenuName && m.name.toLowerCase().includes(baseMenuName.toLowerCase()));
    const restMenus = otherMenus.filter(m => !suggestedMenus.includes(m));
    const sortedOtherMenus = [...suggestedMenus, ...restMenus];

    const { menu, groups, totalItems } = menuDetail;
    const filteredGroups = selectedPrintGroups.length > 0
      ? groups.filter(g => selectedPrintGroups.includes(g.groupGuid))
      : groups;
    const effectiveGroups = filteredGroups.map(getEffectiveGroup);

    return (
      <>
        <Card className="bg-muted/40">
          <CardContent className="p-3">
            <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Monitor className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Web tab</p>
                  <p>Customize how the menu looks as a shareable link or embedded widget — template, fonts, header/footer text, and item display options.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Printer className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Print tab</p>
                  <p>Merge menus, set item-level page breaks, adjust print scale, then choose a template to open a print-ready page in a new tab.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BookMarked className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Saving</p>
                  <p>Click <span className="font-medium text-foreground">Save Menu</span> to store all current settings as a named configuration. Saved menus can be reloaded and pinned to the Staff Print Board.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={goBack} data-testid="button-back-menus">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" data-testid="text-menu-detail-name">{menu.name}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedPrintGroups.length > 0
                ? `Showing ${filteredGroups.length} of ${groups.length} courses`
                : `${groups.length} courses, ${totalItems} items`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasPendingChanges && (
              <Button
                onClick={() => saveChangesMutation.mutate()}
                disabled={saveChangesMutation.isPending}
                data-testid="button-save-changes"
              >
                {saveChangesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (loadedEmbedConfigId) {
                  setSaveDialogTab("update");
                } else {
                  setSaveName(menu.name || "");
                  setSaveDescription("");
                  setSaveOverwriteId(null);
                }
                setShowSaveDialog(true);
              }}
              data-testid="button-save-menu"
            >
              <BookMarked className="w-4 h-4 mr-2" />
              Save Menu
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(sharedUrl, "_blank")}
              data-testid="button-preview-menu"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Web
            </Button>
          </div>
        </div>

        {hasPendingChanges && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                You have unsaved changes. Click "Save Changes" to keep them.
              </p>
              <Button
                size="sm"
                onClick={() => saveChangesMutation.mutate()}
                disabled={saveChangesMutation.isPending}
                data-testid="button-save-changes-banner"
              >
                {saveChangesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-1 border-b pb-1">
          <Button
            variant={activeDetailTab === "print" ? "default" : "ghost"}
            onClick={() => setActiveDetailTab("print")}
            className="flex items-center gap-2"
            data-testid="button-tab-print"
          >
            <Printer className="w-4 h-4" />
            Design &amp; Print
          </Button>
          <Button
            variant={activeDetailTab === "web" ? "default" : "ghost"}
            onClick={() => setActiveDetailTab("web")}
            className="flex items-center gap-2"
            data-testid="button-tab-web"
          >
            <Monitor className="w-4 h-4" />
            Web / Share Link
          </Button>
        </div>

        {activeDetailTab === "print" && (
        <>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Design &amp; Display Options</p>
              <p className="text-xs text-muted-foreground mt-0.5">These settings control how the menu looks on print and on the web share link. The live print preview at the bottom updates as you change them.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Private Event Title (optional)</label>
                <p className="text-xs text-muted-foreground">
                  {printTemplate === "knoll"
                    ? 'Shows centered in the black header bar. For The Knoll menu, use "THE KNOLL". Leave blank to use the Toast menu name.'
                    : `Replaces the Toast menu name at the top of web and print menus. Leave blank to use "${menuDetail?.menu?.name || "Toast menu title"}".`}
                </p>
                <input
                  type="text"
                  value={printCustomTitle}
                  onChange={(e) => setPrintCustomTitle(e.target.value)}
                  placeholder={printTemplate === "knoll" ? "THE KNOLL" : "e.g., Carolin's Bridal Shower"}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-custom-menu-title"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Template Style</label>
                <Select
                  value={printTemplate}
                  onValueChange={(v) => {
                    setPrintTemplate(v);
                    if (v === "knoll") {
                      setPrintHeader((h) => h.trim() || KNOLL_DEFAULT_HEADER_LEFT);
                      setPrintHeader2((h) => h.trim() || KNOLL_DEFAULT_HEADER_RIGHT);
                      setPrintFooter((f) => f.trim() || KNOLL_DEFAULT_FOOTER_NOTE);
                      // Keep header sides visually matched (same default style, no surprise italic).
                      setPrintTypo((prev) => ({
                        ...prev,
                        header: { ...prev.header, italic: false },
                        header2: { ...prev.header2, italic: false },
                      }));
                      // Promote any leftover in-column lunch banner into the full-width fields.
                      setPrintCustomLines((prev) => {
                        const migrated = migrateLunchBannerFromCustomLines(
                          prev,
                          printKnollBannerTitle,
                          printKnollBannerNote,
                        );
                        if (migrated.title || migrated.note) {
                          setPrintKnollBannerTitle(migrated.title);
                          setPrintKnollBannerNote(migrated.note);
                        }
                        return migrated.lines;
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-detail-template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fine-dining">Fine Dining (Dark &amp; Elegant)</SelectItem>
                    <SelectItem value="modern">Modern (Clean &amp; Minimal)</SelectItem>
                    <SelectItem value="beverage">Beverage Menu</SelectItem>
                    <SelectItem value="knoll">Knoll (Letter, 2-column)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {printTemplate === "knoll" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Header Color</label>
                  <p className="text-xs text-muted-foreground">Color of the THE KNOLL header bar.</p>
                  <Select value={normalizeKnollHeaderColor(printKnollHeaderColor)} onValueChange={setPrintKnollHeaderColor}>
                    <SelectTrigger data-testid="select-knoll-header-color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KNOLL_HEADER_COLOR_OPTIONS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block w-3.5 h-3.5 rounded-sm border border-black/20 shrink-0"
                              style={{ backgroundColor: color.hex }}
                              aria-hidden
                            />
                            {color.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {printTemplate === "knoll" && (
                <div className="space-y-3 sm:col-span-2 rounded-md border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-semibold">Header bar text (editable)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Left and right text in the colored header bar, with their own font and size.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Left side</label>
                      <Input
                        value={printHeader}
                        onChange={(e) => setPrintHeader(e.target.value)}
                        placeholder={KNOLL_DEFAULT_HEADER_LEFT}
                        className="text-sm"
                        data-testid="input-knoll-header-left"
                      />
                      <div className="flex gap-2 flex-wrap items-center">
                        <Select
                          value={printTypo.header.font}
                          onValueChange={(v) => setPrintTypo((prev) => ({ ...prev, header: { ...prev.header, font: v } }))}
                        >
                          <SelectTrigger className="h-8 text-xs w-36" data-testid="select-knoll-header-left-font">
                            <SelectValue placeholder="Font" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_FONT_OPTIONS.map((font) => (
                              <SelectItem key={font} value={font}>{font}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={8}
                          max={48}
                          value={printTypo.header.size}
                          onChange={(e) => setPrintTypo((prev) => ({
                            ...prev,
                            header: { ...prev.header, size: Math.min(48, Math.max(8, Number(e.target.value) || 10)) },
                          }))}
                          className="h-8 w-16 text-xs"
                          title="Font size (pt)"
                          data-testid="input-knoll-header-left-size"
                        />
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={printTypo.header.italic}
                            onCheckedChange={(checked) => setPrintTypo((prev) => ({
                              ...prev,
                              header: { ...prev.header, italic: !!checked },
                            }))}
                            data-testid="checkbox-knoll-header-left-italic"
                          />
                          Italic
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={printTypo.header.bold}
                            onCheckedChange={(checked) => setPrintTypo((prev) => ({
                              ...prev,
                              header: { ...prev.header, bold: !!checked },
                            }))}
                            data-testid="checkbox-knoll-header-left-bold"
                          />
                          Bold
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Right side</label>
                      <Input
                        value={printHeader2}
                        onChange={(e) => setPrintHeader2(e.target.value)}
                        placeholder={KNOLL_DEFAULT_HEADER_RIGHT}
                        className="text-sm"
                        data-testid="input-knoll-header-right"
                      />
                      <div className="flex gap-2 flex-wrap items-center">
                        <Select
                          value={printTypo.header2.font}
                          onValueChange={(v) => setPrintTypo((prev) => ({ ...prev, header2: { ...prev.header2, font: v } }))}
                        >
                          <SelectTrigger className="h-8 text-xs w-36" data-testid="select-knoll-header-right-font">
                            <SelectValue placeholder="Font" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_FONT_OPTIONS.map((font) => (
                              <SelectItem key={font} value={font}>{font}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={8}
                          max={48}
                          value={printTypo.header2.size}
                          onChange={(e) => setPrintTypo((prev) => ({
                            ...prev,
                            header2: { ...prev.header2, size: Math.min(48, Math.max(8, Number(e.target.value) || 10)) },
                          }))}
                          className="h-8 w-16 text-xs"
                          title="Font size (pt)"
                          data-testid="input-knoll-header-right-size"
                        />
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={printTypo.header2.italic}
                            onCheckedChange={(checked) => setPrintTypo((prev) => ({
                              ...prev,
                              header2: { ...prev.header2, italic: !!checked },
                            }))}
                            data-testid="checkbox-knoll-header-right-italic"
                          />
                          Italic
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={printTypo.header2.bold}
                            onCheckedChange={(checked) => setPrintTypo((prev) => ({
                              ...prev,
                              header2: { ...prev.header2, bold: !!checked },
                            }))}
                            data-testid="checkbox-knoll-header-right-bold"
                          />
                          Bold
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {printTemplate === "knoll" && (
                <div className="space-y-3 sm:col-span-2 rounded-md border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-semibold">Full-width intro banner</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Prints across the full page width under the header (not inside a column). Leave blank to hide.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Banner title</label>
                    <Input
                      value={printKnollBannerTitle}
                      onChange={(e) => setPrintKnollBannerTitle(e.target.value)}
                      placeholder={KNOLL_DEFAULT_BANNER_TITLE}
                      className="text-sm font-semibold uppercase"
                      data-testid="input-knoll-banner-title"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Banner detail</label>
                    <Textarea
                      value={printKnollBannerNote}
                      onChange={(e) => setPrintKnollBannerNote(e.target.value)}
                      placeholder={KNOLL_DEFAULT_BANNER_NOTE}
                      rows={2}
                      className="text-sm"
                      data-testid="textarea-knoll-banner-note"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPrintKnollBannerTitle(KNOLL_DEFAULT_BANNER_TITLE);
                      setPrintKnollBannerNote(KNOLL_DEFAULT_BANNER_NOTE);
                      // Remove any leftover in-column lunch banner so it only prints full-width.
                      setPrintCustomLines((prev) =>
                        migrateLunchBannerFromCustomLines(
                          prev,
                          KNOLL_DEFAULT_BANNER_TITLE,
                          KNOLL_DEFAULT_BANNER_NOTE,
                        ).lines,
                      );
                    }}
                    data-testid="button-fill-knoll-banner-defaults"
                  >
                    Use lunch banner defaults
                  </Button>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium">Courses / Groups</label>
                <p className="text-xs text-muted-foreground">
                  {printTemplate === "knoll"
                    ? "Choose which Toast courses appear. Section titles print unless you turn them off below."
                    : "Limit which groups are included in the print."}
                </p>
                {renderGroupMultiSelect(selectedPrintGroups, setSelectedPrintGroups, "select-detail-group", menuDetail?.groups || [])}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {printTemplate !== "knoll" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-sm font-medium">Custom Header</label>
                  <div className="flex items-center gap-1">
                    {headerPresets.length > 0 && (
                      <Select
                        onValueChange={(v) => {
                          if (v === "__remove__" && printHeader) {
                            removePreset(HEADER_PRESETS_KEY, printHeader, headerPresets, setHeaderPresets);
                          } else if (v !== "__remove__") {
                            setPrintHeader(v);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-36" data-testid="select-header-presets">
                          <SelectValue placeholder="Saved presets" />
                        </SelectTrigger>
                        <SelectContent>
                          {headerPresets.map((p, i) => (
                            <SelectItem key={i} value={p} data-testid={`option-header-preset-${i}`}>
                              {p.length > 38 ? p.slice(0, 38) + "…" : p}
                            </SelectItem>
                          ))}
                          {headerPresets.includes(printHeader) && (
                            <SelectItem value="__remove__" className="text-destructive">
                              Remove current from saved
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      onClick={() => savePreset(HEADER_PRESETS_KEY, printHeader, headerPresets, setHeaderPresets)}
                      disabled={!printHeader.trim() || headerPresets.includes(printHeader)}
                      title="Save current value as a preset"
                      data-testid="button-save-header-preset"
                    >
                      <BookMarked className="w-3 h-3 mr-1" />Save
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  <>Appears below the menu title. Supports HTML (e.g., <code className="text-xs">&lt;br&gt;</code>, <code className="text-xs">&lt;b&gt;</code>, <code className="text-xs">&lt;i&gt;</code>).</>
                </p>
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    value={printHeader}
                    onChange={(e) => setPrintHeader(e.target.value)}
                    placeholder="e.g., Spring 2026 Season"
                    className="flex-1 min-w-0 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    data-testid="input-detail-header"
                  />
                </div>
              </div>
              )}
              <div className={`space-y-1 ${printTemplate === "knoll" ? "sm:col-span-2" : ""}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-sm font-medium">
                    {printTemplate === "knoll" ? "Full-width footer note (editable)" : "Custom Footer"}
                  </label>
                  {printTemplate !== "knoll" && (
                  <div className="flex items-center gap-1">
                    {footerPresets.length > 0 && (
                      <Select
                        onValueChange={(v) => {
                          if (v === "__remove__" && printFooter) {
                            removePreset(FOOTER_PRESETS_KEY, printFooter, footerPresets, setFooterPresets);
                          } else if (v !== "__remove__") {
                            setPrintFooter(v);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-36" data-testid="select-footer-presets">
                          <SelectValue placeholder="Saved presets" />
                        </SelectTrigger>
                        <SelectContent>
                          {footerPresets.map((p, i) => (
                            <SelectItem key={i} value={p} data-testid={`option-footer-preset-${i}`}>
                              {p.length > 38 ? p.slice(0, 38) + "…" : p}
                            </SelectItem>
                          ))}
                          {footerPresets.includes(printFooter) && (
                            <SelectItem value="__remove__" className="text-destructive">
                              Remove current from saved
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      onClick={() => savePreset(FOOTER_PRESETS_KEY, printFooter, footerPresets, setFooterPresets)}
                      disabled={!printFooter.trim() || footerPresets.includes(printFooter)}
                      title="Save current value as a preset"
                      data-testid="button-save-footer-preset"
                    >
                      <BookMarked className="w-3 h-3 mr-1" />Save
                    </Button>
                  </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {printTemplate === "knoll"
                    ? "Black note bar at the bottom of the menu, full page width. Edit the text, font, and size anytime."
                    : "Message at the bottom (e.g., website, phone)."}
                </p>
                {printTemplate === "knoll" ? (
                  <>
                    <Textarea
                      value={printFooter}
                      onChange={(e) => setPrintFooter(e.target.value)}
                      placeholder={KNOLL_DEFAULT_FOOTER_NOTE}
                      rows={3}
                      className="text-sm"
                      data-testid="input-detail-footer"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Select
                        value={printTypo.footer.font}
                        onValueChange={(v) => setPrintTypo((prev) => ({ ...prev, footer: { ...prev.footer, font: v } }))}
                      >
                        <SelectTrigger className="h-8 w-44 text-xs" data-testid="select-knoll-footer-font">
                          <SelectValue placeholder="Font" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_FONT_OPTIONS.map((font) => (
                            <SelectItem key={font} value={font}>{font}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={8}
                        max={48}
                        value={printTypo.footer.size}
                        onChange={(e) => setPrintTypo((prev) => ({
                          ...prev,
                          footer: { ...prev.footer, size: Math.min(48, Math.max(8, Number(e.target.value) || 9)) },
                        }))}
                        className="h-8 w-20 text-xs"
                        title="Font size (pt)"
                        data-testid="input-knoll-footer-size"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      value={printFooter}
                      onChange={(e) => setPrintFooter(e.target.value)}
                      placeholder="e.g., nashobawinery.com · (978) 779-5521"
                      className="flex-1 min-w-0 px-3 py-2 rounded-md border border-input bg-background text-sm"
                      data-testid="input-detail-footer"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {printTemplate !== "knoll" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Custom Header 2</label>
                <p className="text-xs text-muted-foreground">
                  A second header line below Header 1. Set its own font under Typography → "Custom header 2". Supports HTML.
                </p>
                <input
                  type="text"
                  value={printHeader2}
                  onChange={(e) => setPrintHeader2(e.target.value)}
                  placeholder="e.g., Truffle fries +5 · GF bread +2"
                  className="w-full min-w-0 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-detail-header2"
                />
              </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium">Custom Footer 2</label>
                <p className="text-xs text-muted-foreground">A second footer line below Footer 1. Set its own font under Typography → "Custom footer 2".</p>
                <input
                  type="text"
                  value={printFooter2}
                  onChange={(e) => setPrintFooter2(e.target.value)}
                  placeholder="e.g., Reservations recommended"
                  className="w-full min-w-0 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-detail-footer2"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printHidePricing}
                  onCheckedChange={(checked) => setPrintHidePricing(!!checked)}
                  data-testid="checkbox-detail-hide-pricing"
                />
                <span className="font-medium">Hide Pricing</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printHideDescriptions}
                  onCheckedChange={(checked) => setPrintHideDescriptions(!!checked)}
                  data-testid="checkbox-detail-hide-descriptions"
                />
                <span className="font-medium">Hide Descriptions</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printHideWinePairing}
                  onCheckedChange={(checked) => setPrintHideWinePairing(!!checked)}
                  data-testid="checkbox-detail-hide-wine-pairing"
                />
                <span className="font-medium">Hide Wine Pairings</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printShowImages}
                  onCheckedChange={(checked) => setPrintShowImages(!!checked)}
                  data-testid="checkbox-detail-show-images"
                />
                <span className="font-medium">Show Images</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={printHideAllergyFooter}
                  onCheckedChange={(checked) => setPrintHideAllergyFooter(!!checked)}
                  data-testid="checkbox-detail-hide-allergy-footer"
                />
                <span className="font-medium">Hide Allergy Footer</span>
              </label>
              {printTemplate === "knoll" ? (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={!printHideCourseHeadings}
                    onCheckedChange={(checked) => setPrintHideCourseHeadings(!checked)}
                    data-testid="checkbox-detail-show-course-headings"
                  />
                  <span className="font-medium">Show Courses / Groups</span>
                  <span className="text-xs text-muted-foreground">Section titles like BOARDS &amp; SHAREABLES, SANDWICHES</span>
                </label>
              ) : (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={printHideCourseHeadings}
                    onCheckedChange={(checked) => setPrintHideCourseHeadings(!!checked)}
                    data-testid="checkbox-detail-hide-course-headings"
                  />
                  <span className="font-medium">Hide Courses / Groups</span>
                </label>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Header Scroll / Divider</label>
                <p className="text-xs text-muted-foreground">Decorative flourish shown with the title. Choose "None" to remove the line under the Private Event Title.</p>
                <Select value={printOrnament} onValueChange={setPrintOrnament}>
                  <SelectTrigger data-testid="select-detail-ornament"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Default (line on Fine Dining)</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="line">Simple line —</SelectItem>
                    <SelectItem value="floral">Floral ❦</SelectItem>
                    <SelectItem value="floral-trio">Floral trio ❧ ❦ ❧</SelectItem>
                    <SelectItem value="swirl">Scroll swirl ❞ ❦ ❟</SelectItem>
                    <SelectItem value="fleur">Fleur-de-lis ⚜</SelectItem>
                    <SelectItem value="stars">Stars ✦ ✦ ✦</SelectItem>
                    <SelectItem value="diamonds">Diamonds ❖ ❖ ❖</SelectItem>
                    <SelectItem value="wave">Wave 〜〜〜</SelectItem>
                    <SelectItem value="svg-scroll">Engraved: Scroll flourish</SelectItem>
                    <SelectItem value="svg-filigree">Engraved: Filigree</SelectItem>
                    <SelectItem value="svg-leaf">Engraved: Vine &amp; leaves</SelectItem>
                    <SelectItem value="svg-deco">Engraved: Deco rule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Scroll Position</label>
                <p className="text-xs text-muted-foreground">Where the scroll appears relative to the title and header text.</p>
                <Select value={printOrnamentPos} onValueChange={setPrintOrnamentPos}>
                  <SelectTrigger data-testid="select-detail-ornament-pos"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above-title">Above title</SelectItem>
                    <SelectItem value="below-title">Below title</SelectItem>
                    <SelectItem value="below-header">Below header text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <TypographyPanel
              idPrefix="browser"
              title="Typography"
              rows={BROWSER_TYPO_ROWS}
              values={printTypo as unknown as Record<string, TypoElem>}
              onChange={(key, field, value) => setPrintTypo(prev => ({ ...prev, [key]: { ...prev[key as keyof BrowserTypoSettings], [field]: value } }))}
              onReset={() => setPrintTypo(DEFAULT_BROWSER_TYPO)}
            />
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">HTML Formatting Guide for Descriptions</p>
            <p className="text-xs text-muted-foreground">You can use these codes in the description fields below to control how text appears on printed and embedded menus:</p>
            <div className="grid gap-1 text-xs font-mono">
              <div className="flex items-baseline gap-3 flex-wrap">
                <code className="bg-background px-2 py-0.5 rounded border text-xs whitespace-nowrap">&lt;br&gt;</code>
                <span className="text-muted-foreground font-sans">Line break — starts a new line</span>
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <code className="bg-background px-2 py-0.5 rounded border text-xs whitespace-nowrap">&lt;br&gt;&lt;br&gt;</code>
                <span className="text-muted-foreground font-sans">Double line break — adds a blank line between text</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">Example: Roasted chicken with herbs&lt;br&gt;Served with seasonal vegetables</p>
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">How to add a course above an item</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              <li>On an item below, click the <span className="font-medium text-foreground">heading</span> icon (left column with eye / $ / special).</li>
              <li>Enter the course name (e.g. <span className="font-medium text-foreground">SANDWICHES</span>) and optional detail.</li>
              <li>Save — the course appears above that item here and on the printed menu. Click it again to edit or delete.</li>
            </ol>
          </CardContent>
        </Card>

        {effectiveGroups.map((group) => (
          <div key={group.id} className={`space-y-1 ${group.hidden ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between gap-2 pt-2 border-b pb-1">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => applyGroupChange(group.id, !group.hidden)}
                  data-testid={`button-toggle-group-visibility-${group.id}`}
                  title={group.hidden ? "Show group" : "Hide group"}
                >
                  {group.hidden ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4" />}
                </Button>
                <h3 className={`font-semibold text-base ${group.hidden ? "line-through text-muted-foreground" : ""}`} data-testid={`text-group-name-${group.id}`}>
                  {group.name}
                </h3>
              </div>
              <Badge variant="secondary" className="no-default-active-elevate">
                {group.hidden ? "hidden" : `${group.items.filter(i => !i.hidden).length}/${group.items.length} visible`}
              </Badge>
            </div>
            {group.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No items in this group</p>
            ) : (
              <div className="space-y-0">
                {group.items.map((item) => {
                  const courseAbove = getCourseLinesForItem(item.itemGuid);
                  const hasCourseAbove = !!courseAbove.course || !!courseAbove.note;
                  return (
                  <div
                    key={item.id}
                    className={`py-2 border-b border-muted/50 last:border-0 ${item.hidden ? "opacity-40" : ""}`}
                    data-testid={`row-item-${item.id}`}
                  >
                    {hasCourseAbove && (
                      <button
                        type="button"
                        onClick={() => openCourseAboveDialog(item.itemGuid, item.name)}
                        className="w-full mb-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-center hover-elevate"
                        data-testid={`preview-course-above-${item.id}`}
                        title="Click to edit or delete this course"
                      >
                        {courseAbove.course?.text && (
                          <p className="text-sm font-bold uppercase tracking-wide underline underline-offset-2">
                            {courseAbove.course.text}
                          </p>
                        )}
                        {courseAbove.note?.text && (
                          <p className="text-xs italic text-muted-foreground mt-0.5 leading-snug whitespace-pre-line">
                            {courseAbove.note.text.replace(/<br\s*\/?>/gi, "\n")}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">Print course · click to edit</p>
                      </button>
                    )}
                    <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => applyItemChange(item.id, { hidden: !item.hidden })}
                        data-testid={`button-toggle-visibility-${item.id}`}
                        title={item.hidden ? "Show item" : "Hide item"}
                      >
                        {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      {item.price && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => applyItemChange(item.id, { hidePrice: !item.hidePrice })}
                          data-testid={`button-toggle-price-${item.id}`}
                          title={item.hidePrice ? "Show price" : "Hide price"}
                          className={item.hidePrice ? "toggle-elevate toggle-elevated" : "toggle-elevate"}
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => applyItemChange(item.id, { isSpecial: !item.isSpecial })}
                        data-testid={`button-toggle-special-${item.id}`}
                        title={item.isSpecial ? "Remove special designation" : "Mark as today's special"}
                        className={item.isSpecial ? "toggle-elevate toggle-elevated text-amber-600" : "toggle-elevate"}
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openCourseAboveDialog(item.itemGuid, item.name)}
                        data-testid={`button-add-course-above-${item.id}`}
                        title={hasCourseAbove ? "Edit or delete course above this item" : "Add course name & detail above this item"}
                        className={hasCourseAbove ? "toggle-elevate toggle-elevated text-primary" : "toggle-elevate"}
                      >
                        <Heading2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${item.hidden ? "line-through" : ""}`}>
                          {item.name}
                          {item.isSpecial && (
                            <Badge variant="outline" className="ml-2 text-amber-600 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-[10px] py-0 px-1.5 font-semibold tracking-wide uppercase no-default-active-elevate" style={{verticalAlign: "middle"}}>
                              Special
                            </Badge>
                          )}
                        </span>
                        {item.sizePrices ? (() => {
                          try {
                            const sizes: { name: string; price: string }[] = JSON.parse(item.sizePrices);
                            if (sizes.length > 1) {
                              return (
                                <span className={`text-xs text-muted-foreground whitespace-nowrap ${item.hidePrice ? "line-through opacity-50" : ""}`}>
                                  {sizes.map(s => `${s.name} ${formatPrice(s.price)}`).join(" · ")}
                                </span>
                              );
                            }
                          } catch {}
                          return null;
                        })() : item.price ? (
                          <span className={`text-sm font-medium whitespace-nowrap ${item.hidePrice ? "line-through text-muted-foreground" : ""}`}>
                            {formatPrice(item.price)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] font-medium text-muted-foreground">Print line size</span>
                        <Select
                          value={String(printItemFontScales[item.itemGuid] || 1)}
                          onValueChange={(value) => setPrintItemFontScale(item.itemGuid, Number(value))}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs" data-testid={`select-print-font-scale-${item.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.8">Smaller</SelectItem>
                            <SelectItem value="0.9">Slightly smaller</SelectItem>
                            <SelectItem value="1">Normal</SelectItem>
                            <SelectItem value="1.15">Larger</SelectItem>
                            <SelectItem value="1.3">Very large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-muted-foreground mr-0.5">Print icons</span>
                        {PRINT_ALLERGEN_TAGS.map((tag) => {
                          const active = (printItemAllergens[item.itemGuid] || []).includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => togglePrintItemAllergen(item.itemGuid, tag)}
                              title={`${active ? "Remove" : "Add"} ${PRINT_ALLERGEN_LABELS[tag]} icon (print only)`}
                              data-testid={`button-print-allergen-${tag}-${item.id}`}
                              className={`h-6 min-w-6 px-1.5 rounded-full text-[10px] font-bold border transition-colors ${
                                active
                                  ? "bg-foreground text-background border-foreground"
                                  : "bg-background text-muted-foreground border-border hover:border-foreground/50"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-1">
                        <Textarea
                          key={`desc-${item.id}-${item.description || ""}`}
                          placeholder="Item description (use <br> for line breaks)..."
                          defaultValue={item.description || ""}
                          className="text-xs resize-none"
                          rows={2}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (item.description || "")) {
                              applyItemChange(item.id, { description: val });
                            }
                          }}
                          data-testid={`input-description-${item.id}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Wine className="w-3 h-3 text-muted-foreground shrink-0" />
                        <Input
                          key={`pairing-${item.id}-${item.suggestedPairing || ""}`}
                          placeholder="Suggested wine pairing..."
                          defaultValue={item.suggestedPairing || ""}
                          className="h-7 text-xs"
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (item.suggestedPairing || "")) {
                              applyItemChange(item.id, { suggestedPairing: val });
                            }
                          }}
                          data-testid={`input-pairing-${item.id}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground shrink-0" />
                        <Input
                          key={`sizes-${item.id}-${item.sizePrices || ""}`}
                          placeholder="Sizes & prices, e.g. Cup $6, Bowl $10 (leave blank for single price)"
                          defaultValue={formatSizePricesForEdit(item.sizePrices)}
                          className="h-7 text-xs"
                          onBlur={(e) => {
                            const parsed = parseSizePricesInput(e.target.value);
                            if ((parsed || "") !== (item.sizePrices || "")) {
                              applyItemChange(item.id, { sizePrices: parsed });
                            }
                          }}
                          data-testid={`input-sizes-${item.id}`}
                        />
                      </div>
                    </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        </>
        )}

        {activeDetailTab === "web" && (
        <>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold">Web Share Link</p>
              <p className="text-xs text-muted-foreground mt-0.5">Share this URL to let anyone view this menu in a browser. It does not include print page breaks.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                readOnly
                value={sharedUrl}
                className="flex-1 min-w-0 px-3 py-2 rounded-md border border-input bg-muted/30 text-xs font-mono"
                data-testid="input-web-share-url"
              />
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(sharedUrl)} data-testid="button-copy-web-url">
                {copiedEmbed ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copiedEmbed ? "Copied" : "Copy URL"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(sharedUrl, "_blank")} data-testid="button-open-web-url">
                <ExternalLink className="w-4 h-4 mr-1" />
                Open
              </Button>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Embed Code (iframe)</p>
              <div className="flex items-start gap-2">
                <Textarea
                  readOnly
                  value={sharedEmbedCode}
                  className="flex-1 font-mono text-xs resize-none"
                  rows={2}
                  data-testid="textarea-embed-code"
                />
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(sharedEmbedCode)} data-testid="button-copy-embed">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
        )}

        {activeDetailTab === "print" && (
          <>
            {sortedOtherMenus.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Merge Groups From Another Menu</label>
                <p className="text-xs text-muted-foreground">
                  Include groups from additional menus in this print job. Useful when related groups were imported as separate menus in Toast.
                </p>
                <div className="border rounded-md p-3 space-y-1 max-h-48 overflow-y-auto">
                  {suggestedMenus.length > 0 && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">Related menus</p>
                  )}
                  {suggestedMenus.map(m => (
                    <label key={m.menuGuid} className="flex items-center gap-2 px-1 py-1.5 rounded-md cursor-pointer hover-elevate" data-testid={`checkbox-merge-menu-${m.menuGuid}`}>
                      <Checkbox
                        checked={additionalMenuGuids.includes(m.menuGuid)}
                        onCheckedChange={(checked) => {
                          setAdditionalMenuGuids(prev =>
                            checked ? [...prev, m.menuGuid] : prev.filter(g => g !== m.menuGuid)
                          );
                        }}
                      />
                      <p className="text-sm font-medium">{m.name}</p>
                    </label>
                  ))}
                  {restMenus.length > 0 && suggestedMenus.length > 0 && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 pb-1">Other menus</p>
                  )}
                  {restMenus.map(m => (
                    <label key={m.menuGuid} className="flex items-center gap-2 px-1 py-1.5 rounded-md cursor-pointer hover-elevate" data-testid={`checkbox-merge-menu-${m.menuGuid}`}>
                      <Checkbox
                        checked={additionalMenuGuids.includes(m.menuGuid)}
                        onCheckedChange={(checked) => {
                          setAdditionalMenuGuids(prev =>
                            checked ? [...prev, m.menuGuid] : prev.filter(g => g !== m.menuGuid)
                          );
                        }}
                      />
                      <p className="text-sm">{m.name}</p>
                    </label>
                  ))}
                </div>
                {additionalMenuGuids.length > 0 && (
                  <p className="text-xs text-primary font-medium">
                    {additionalMenuGuids.length} additional menu{additionalMenuGuids.length > 1 ? "s" : ""} merged — {allPrintGroups.length} total groups available
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Print Scale</label>
                <p className="text-xs text-muted-foreground">Overall size of text on the printed page.</p>
                <Select value={String(printScale)} onValueChange={(v) => setPrintScale(Number(v))}>
                  <SelectTrigger data-testid="select-print-scale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="70">70% — Very Small</SelectItem>
                    <SelectItem value="80">80% — Small</SelectItem>
                    <SelectItem value="90">90% — Slightly Small</SelectItem>
                    <SelectItem value="100">100% — Normal</SelectItem>
                    <SelectItem value="110">110% — Large</SelectItem>
                    <SelectItem value="120">120% — Very Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Columns on Page</label>
                <p className="text-xs text-muted-foreground">
                  {printTemplate === "knoll"
                    ? "Knoll defaults to 2 columns with a vertical center line (Letter size). Choose Auto or 2 columns for the cafe layout."
                    : "Choose how many columns the menu body should flow into on one printed page."}
                </p>
                <Select value={String(printPages)} onValueChange={(v) => setPrintPages(Number(v))}>
                  <SelectTrigger data-testid="select-print-pages">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{printTemplate === "knoll" ? "Auto (2 columns + center line)" : "1 column (default)"}</SelectItem>
                    <SelectItem value="1">1 column</SelectItem>
                    <SelectItem value="2">2 columns{printTemplate === "knoll" ? " + center line" : ""}</SelectItem>
                    <SelectItem value="3">3 columns</SelectItem>
                    <SelectItem value="4">4 columns</SelectItem>
                    <SelectItem value="5">5 columns</SelectItem>
                    <SelectItem value="6">6 columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold">Other print lines (optional)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      For banners/notes that are not course headers. Add courses with the heading icon on each menu item above.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addPrintCustomLine({ kind: "banner" })} data-testid="button-add-print-line">
                    <Plus className="w-4 h-4 mr-1" />
                    Add banner / note
                  </Button>
                </div>

                {printCustomLines.filter((l) => l.kind !== "course" && l.kind !== "course-note").length === 0 ? (
                  <p className="text-xs text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
                    No extra print lines. Course headers are managed on each item.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {printCustomLines.filter((l) => l.kind !== "course" && l.kind !== "course-note").map((line, index) => (
                      <div key={line.id} className="border rounded-md p-3 space-y-3" data-testid={`print-line-${index}`}>
                        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Line Style</label>
                            <Select value={line.kind} onValueChange={(v) => updatePrintCustomLine(line.id, { kind: v as PrintCustomLineKind })}>
                              <SelectTrigger data-testid={`select-print-line-kind-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="course">Course Header</SelectItem>
                                <SelectItem value="course-note">Course Note</SelectItem>
                                <SelectItem value="banner">Banner</SelectItem>
                                <SelectItem value="header">Header</SelectItem>
                                <SelectItem value="note">Notation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Placement</label>
                            <Select value={line.placement} onValueChange={(v) => updatePrintCustomLine(line.id, { placement: v })}>
                              <SelectTrigger data-testid={`select-print-line-placement-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="after-title">After menu title/header</SelectItem>
                                {allPrintGroups.map((group) => (
                                  <SelectItem key={`before-${group.groupGuid}`} value={`before-group:${group.groupGuid}`}>
                                    Before group: {group.name}{group.sourceName ? ` (${group.sourceName})` : ""}
                                  </SelectItem>
                                ))}
                                {allPrintGroups.flatMap((group) =>
                                  (group.items || []).filter((item: ToastMenuItemData) => !item.hidden).flatMap((item: ToastMenuItemData) => {
                                    const clean = item.name.replace(/\s*\((GF|GFO|V|VG|DF|NF)\)\s*/gi, " ").trim();
                                    return [
                                      <SelectItem key={`before-${item.itemGuid}`} value={`before-item:${item.itemGuid}`}>
                                        Before {clean}
                                      </SelectItem>,
                                      <SelectItem key={`after-${item.itemGuid}`} value={`after-item:${item.itemGuid}`}>
                                        After {clean}
                                      </SelectItem>,
                                    ];
                                  })
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removePrintCustomLine(line.id)}
                            data-testid={`button-remove-print-line-${index}`}
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-5">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Justification</label>
                            <Select value={line.align} onValueChange={(v) => updatePrintCustomLine(line.id, { align: v as PrintCustomLineAlign })}>
                              <SelectTrigger data-testid={`select-print-line-align-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Font</label>
                            <Select value={line.font} onValueChange={(v) => updatePrintCustomLine(line.id, { font: v })}>
                              <SelectTrigger data-testid={`select-print-line-font-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRINT_LINE_FONT_OPTIONS.map(font => (
                                  <SelectItem key={font} value={font}>{font}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Font Size</label>
                            <input
                              type="number"
                              min={8}
                              max={72}
                              value={line.size}
                              onChange={(e) => updatePrintCustomLine(line.id, { size: Number(e.target.value) || 14 })}
                              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                              data-testid={`input-print-line-size-${index}`}
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm cursor-pointer pt-6">
                            <Checkbox
                              checked={line.bold}
                              onCheckedChange={(checked) => updatePrintCustomLine(line.id, { bold: !!checked })}
                              data-testid={`checkbox-print-line-bold-${index}`}
                            />
                            <span className="font-medium">Bold</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer pt-6">
                            <Checkbox
                              checked={line.italic}
                              onCheckedChange={(checked) => updatePrintCustomLine(line.id, { italic: !!checked })}
                              data-testid={`checkbox-print-line-italic-${index}`}
                            />
                            <span className="font-medium">Italic</span>
                          </label>
                        </div>
                        <Textarea
                          value={line.text}
                          onChange={(e) => updatePrintCustomLine(line.id, { text: e.target.value })}
                          placeholder={
                            line.kind === "course"
                              ? "e.g., BOARDS & SHAREABLES"
                              : line.kind === "course-note"
                                ? "e.g., Served with hand cut Russet potato chips / Gluten Free bread upon request +2"
                                : "e.g., Chef's Specials<br>Available after 5pm"
                          }
                          rows={2}
                          className="text-sm"
                          data-testid={`textarea-print-line-text-${index}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {allPrintGroups.length > 0 && (
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium">Page Breaks</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mark where the printer should start a new page. You can break before a course or after any item.
                  </p>
                </div>
                <div className="border rounded-md overflow-y-auto max-h-72">
                  {allPrintGroups.map((g, gIdx) => {
                    const groupItems = (g.items || []).filter((item: ToastMenuItemData) => !item.hidden);
                    return (
                      <div key={g.groupGuid} className="border-b last:border-b-0">
                        {gIdx > 0 && (
                          <label className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 cursor-pointer hover-elevate" data-testid={`checkbox-pagebreak-before-${g.groupGuid}`}>
                            <Checkbox
                              checked={printPageBreaks.includes(g.groupGuid)}
                              onCheckedChange={(checked) => {
                                setPrintPageBreaks(prev =>
                                  checked ? [...prev, g.groupGuid] : prev.filter(id => id !== g.groupGuid)
                                );
                              }}
                            />
                            <span className="text-xs text-primary font-medium">Break before "{g.name}"</span>
                          </label>
                        )}
                        <div className="px-3 py-1 bg-muted/30">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.name}</span>
                          {gIdx === 0 && <span className="text-xs text-muted-foreground ml-2">(first course — no break before)</span>}
                        </div>
                        {groupItems.map((item: ToastMenuItemData) => (
                          <label
                            key={item.itemGuid}
                            className="flex items-center gap-2 px-3 py-1.5 border-t border-border/30 cursor-pointer hover-elevate"
                            data-testid={`checkbox-pagebreak-after-${item.itemGuid}`}
                          >
                            <Checkbox
                              checked={printPageBreaks.includes(item.itemGuid)}
                              onCheckedChange={(checked) => {
                                setPrintPageBreaks(prev =>
                                  checked ? [...prev, item.itemGuid] : prev.filter(id => id !== item.itemGuid)
                                );
                              }}
                            />
                            <span className="text-sm truncate flex-1">{item.name.replace(/\s*\((GF|GFO|V|VG|DF|NF)\)\s*/gi, " ").trim()}</span>
                            {printPageBreaks.includes(item.itemGuid) && (
                              <span className="text-xs text-primary shrink-0">break after</span>
                            )}
                          </label>
                        ))}
                        {groupItems.length === 0 && (
                          <p className="px-3 py-1.5 text-xs text-muted-foreground italic">No visible items</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {printPageBreaks.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-primary font-medium">
                      {printPageBreaks.length} page break{printPageBreaks.length > 1 ? "s" : ""} set
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => setPrintPageBreaks([])} className="text-xs h-7 px-2" data-testid="button-clear-pagebreaks">
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-1">Choose a template and print</p>
              <p className="text-xs text-muted-foreground mb-3">Each template opens a print-ready page in a new tab and triggers your browser's print dialog.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="overflow-hidden">
                  <div className="aspect-[3/4] bg-[#1a1a18] flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-[#d4b896] font-serif text-xl tracking-widest uppercase mb-2">Fine Dining</p>
                    <div className="w-8 h-px bg-[#a08c6e] mb-3" />
                    <p className="text-[#e8dcc8] font-serif text-sm uppercase tracking-wider mb-1">Starters</p>
                    <p className="text-[#b8a890] text-xs italic">Elegant serif typography</p>
                    <p className="text-[#b8a890] text-xs italic">Dark background, gold accents</p>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">Fine Dining</p>
                        <p className="text-xs text-muted-foreground">Dark, elegant, serif</p>
                      </div>
                      <Button size="sm" onClick={() => handlePrint("fine-dining")} data-testid="button-print-fine-dining">
                        <Printer className="w-4 h-4 mr-1" />Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <div className="aspect-[3/4] bg-[#fafaf9] flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-[#1c1917] font-sans text-xl font-semibold mb-2">Modern Clean</p>
                    <div className="w-full h-px bg-[#e7e5e4] mb-3" />
                    <p className="text-[#44403c] font-sans text-sm font-semibold uppercase tracking-wider mb-1">Starters</p>
                    <p className="text-[#78716c] text-xs">Clean sans-serif typography</p>
                    <p className="text-[#78716c] text-xs">Light background, minimal</p>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">Modern Clean</p>
                        <p className="text-xs text-muted-foreground">Light, minimal, sans-serif</p>
                      </div>
                      <Button size="sm" onClick={() => handlePrint("modern")} data-testid="button-print-modern">
                        <Printer className="w-4 h-4 mr-1" />Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <div className="aspect-[3/4] bg-white flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-[#1c1917] font-sans text-lg font-bold uppercase tracking-wider mb-3">Beverage</p>
                    <div className="w-full text-left space-y-1 px-2">
                      <p className="text-[#1c1917] font-sans text-xs font-bold underline">Wine</p>
                      <div className="flex justify-between text-[10px] text-[#44403c]"><span>Chardonnay</span><span>$12</span></div>
                      <div className="flex justify-between text-[10px] text-[#44403c]"><span>Pinot Noir</span><span>$14</span></div>
                    </div>
                    <p className="text-[#78716c] text-xs mt-3 italic">Compact list, no descriptions</p>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">Beverage</p>
                        <p className="text-xs text-muted-foreground">Compact list, names + prices</p>
                      </div>
                      <Button size="sm" onClick={() => handlePrint("beverage")} data-testid="button-print-beverage">
                        <Printer className="w-4 h-4 mr-1" />Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <div className="aspect-[3/4] bg-white flex flex-col items-stretch justify-start p-0 text-center overflow-hidden">
                    <div className="bg-[#ec4899] text-white py-2 px-2 grid grid-cols-3 items-center gap-1">
                      <span className="text-[7px] text-left opacity-90 truncate">{printHeader.trim() || KNOLL_DEFAULT_HEADER_LEFT}</span>
                      <span className="font-sans text-[11px] font-bold tracking-widest uppercase">The Knoll</span>
                      <span className="text-[7px] text-right opacity-90 truncate">{printHeader2.trim() || KNOLL_DEFAULT_HEADER_RIGHT}</span>
                    </div>
                    <div className="flex flex-1 gap-2 px-3 py-3 text-left">
                      <div className="flex-1 space-y-1 border-r border-black/80 pr-2">
                        <p className="text-[9px] font-bold uppercase underline">Boards</p>
                        <div className="flex text-[8px] gap-1"><span className="uppercase font-semibold">Cheese</span><span className="flex-1 border-b border-dotted border-neutral-400 mb-1" /><span>23</span></div>
                        <div className="flex text-[8px] gap-1"><span className="uppercase font-semibold">Falafel</span><span className="flex-1 border-b border-dotted border-neutral-400 mb-1" /><span>20</span></div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-[9px] font-bold uppercase underline">Sandwiches</p>
                        <div className="flex text-[8px] gap-1"><span className="uppercase font-semibold">Club</span><span className="flex-1 border-b border-dotted border-neutral-400 mb-1" /><span>16</span></div>
                        <div className="flex text-[8px] gap-1"><span className="uppercase font-semibold">Italian</span><span className="flex-1 border-b border-dotted border-neutral-400 mb-1" /><span>17</span></div>
                      </div>
                    </div>
                    <p className="text-[#78716c] text-[10px] pb-3 italic">Pink header · courses · letter</p>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">Knoll</p>
                        <p className="text-xs text-muted-foreground">Letter, 2-column cafe menu</p>
                      </div>
                      <Button size="sm" onClick={() => handlePrint("knoll")} data-testid="button-print-knoll">
                        <Printer className="w-4 h-4 mr-1" />Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardContent className="p-0 overflow-hidden rounded-md">
                <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
                  <span>Live Print Preview — shows the actual printed result and updates as you edit</span>
                  <Button size="sm" variant="outline" onClick={() => handlePrint(printTemplate)} data-testid="button-print-current">
                    <Printer className="w-4 h-4 mr-1" />Print This
                  </Button>
                </div>
                <div className="bg-neutral-300 dark:bg-neutral-800 p-4 overflow-x-auto">
                  <div className="mx-auto" style={{ width: "8.5in", minWidth: "8.5in" }}>
                    <iframe
                      key={livePreviewUrl}
                      src={livePreviewUrl}
                      className="bg-white shadow-lg border-0 block"
                      style={{ width: "8.5in", minWidth: "8.5in", height: "720px" }}
                      title="Live Print Preview"
                      data-testid="iframe-live-print-preview"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </>
    );
  };

  const toggleGroupSelection = (guid: string, selected: string[], setSelected: (v: string[]) => void) => {
    setSelected(selected.includes(guid) ? selected.filter(g => g !== guid) : [...selected, guid]);
  };

  const getGroupLabel = (selected: string[], groups: { groupGuid: string; name: string }[]) => {
    if (selected.length === 0) return "All courses (full menu)";
    if (!groups.length) return `${selected.length} selected`;
    const names = selected.map(g => groups.find(gr => gr.groupGuid === g)?.name).filter(Boolean);
    if (names.length <= 2) return names.join(", ");
    return `${names.length} courses selected`;
  };

  const renderGroupMultiSelect = (selected: string[], setSelected: (v: string[]) => void, testIdPrefix: string, groups: { groupGuid: string; name: string; sourceName?: string }[]) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between text-left font-normal" data-testid={`${testIdPrefix}-trigger`}>
          <span className="truncate">{getGroupLabel(selected, groups)}</span>
          <ListFilter className="w-4 h-4 ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-1">
          <Button
            variant={selected.length === 0 ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start"
            onClick={() => setSelected([])}
            data-testid={`${testIdPrefix}-all`}
          >
            All courses (full menu)
          </Button>
          {groups.map((g) => (
            <label
              key={g.groupGuid}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate"
              data-testid={`${testIdPrefix}-${g.groupGuid}`}
            >
              <Checkbox
                checked={selected.includes(g.groupGuid)}
                onCheckedChange={() => toggleGroupSelection(g.groupGuid, selected, setSelected)}
              />
              <div className="min-w-0">
                <span className="text-sm">{g.name}</span>
                {g.sourceName && <p className="text-xs text-muted-foreground truncate">{g.sourceName}</p>}
              </div>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderEmbedView = () => {
    if (!selectedMenu) return null;
    const sharedGroups = selectedPrintGroups.length > 0 ? selectedPrintGroups : undefined;
    const sharedUrl = (() => { const u = getEmbedUrl(selectedMenu, printTemplate, sharedGroups, undefined, undefined, printFooter, undefined, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printShowImages); const tp = buildTypoParams(printTypo); return tp ? `${u}&${tp}` : u; })();
    const sharedEmbedCode = getEmbedCode(selectedMenu, printTemplate, sharedGroups, printFooter, printHideDescriptions, printHeader, printHidePricing, printHideWinePairing, printShowImages);

    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("detail")} data-testid="button-back-detail">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-embed-title">Get Website Link / Embed Code</h2>
            <p className="text-sm text-muted-foreground">
              Template, groups, and display options are set in the menu editor. Go back to change them.
            </p>
          </div>
        </div>

        {printTemplate === "knoll" ? (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={!printHideCourseHeadings}
              onCheckedChange={(checked) => setPrintHideCourseHeadings(!checked)}
              data-testid="checkbox-print-show-course-headings"
            />
            <span className="font-medium">Show Courses / Groups</span>
            <span className="text-xs text-muted-foreground">Print section titles like BOARDS &amp; SHAREABLES, SANDWICHES, DESSERTS.</span>
          </label>
        ) : (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={printHideCourseHeadings}
              onCheckedChange={(checked) => setPrintHideCourseHeadings(!!checked)}
              data-testid="checkbox-print-hide-course-headings"
            />
            <span className="font-medium">Hide Courses / Groups</span>
            <span className="text-xs text-muted-foreground">Keep the menu items, but do not print the Toast course/group titles.</span>
          </label>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-medium text-sm">Embed Code (iframe)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(sharedEmbedCode)}
                data-testid="button-copy-embed"
              >
                {copiedEmbed ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copiedEmbed ? "Copied" : "Copy Code"}
              </Button>
            </div>
            <Textarea
              readOnly
              value={sharedEmbedCode}
              className="font-mono text-xs resize-none"
              rows={3}
              data-testid="textarea-embed-code"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-medium text-sm">Direct Link</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(sharedUrl)}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy URL
              </Button>
            </div>
            <Input
              readOnly
              value={sharedUrl}
              className="font-mono text-xs"
              data-testid="input-embed-url"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1">
                <h3 className="font-medium text-sm">Static Links</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save current settings as a permanent URL. To edit a saved link: click <strong>Load</strong> to restore its settings, make changes above, then click <strong>Sync</strong> to save — the URL stays the same.
                </p>
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <Input
                placeholder="Link name (e.g. Main Website Menu)"
                value={staticUrlName}
                onChange={e => setStaticUrlName(e.target.value)}
                className="flex-1 text-sm"
                data-testid="input-static-url-name"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!staticUrlName.trim() || createEmbedConfigMutation.isPending}
                onClick={() => createEmbedConfigMutation.mutate({ name: staticUrlName.trim() })}
                data-testid="button-save-static-url"
              >
                {createEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Save as Static Link
              </Button>
            </div>

            {embedConfigs.length > 0 && (
              <div className="space-y-2 pt-1">
                {embedConfigs.map(cfg => {
                  const staticUrl = `${window.location.origin}/api/toast/public/embed-config/${cfg.slug}`;
                  const isCopied = copiedStaticId === cfg.id;
                  return (
                    <div key={cfg.id} className="rounded-md border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium">{cfg.name}</span>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Load this config's settings into the editor above"
                            onClick={() => {
                              setPrintTemplate(cfg.template || "fine-dining");
                              setPrintHeader(cfg.header || "");
                              setPrintFooter(cfg.footer || "");
                              setPrintHeader2(cfg.header2 || "");
                              setPrintFooter2(cfg.footer2 || "");
                              setPrintScale(cfg.scale ?? 100);
                              setPrintHideDescriptions(cfg.hideDescriptions ?? false);
                              setPrintHidePricing(cfg.hidePricing ?? false);
                              setPrintHideWinePairing(cfg.hideWinePairing ?? false);
                              setPrintShowImages(cfg.showImages ?? false);
                              setPrintPages(cfg.pages ?? 0);
                              setPrintPageBreaks(cfg.pageBreaks ? cfg.pageBreaks.split(",").map(s => s.trim()).filter(Boolean) : []);
                              setSelectedPrintGroups(cfg.groupGuids ? cfg.groupGuids.split(",").map(s => s.trim()).filter(Boolean) : []);
                              const allGuids = cfg.menuGuids ? cfg.menuGuids.split(",").map(s => s.trim()).filter(Boolean) : [];
                              if (allGuids.length > 1) {
                                setAdditionalMenuGuids(allGuids.slice(1));
                              } else {
                                setAdditionalMenuGuids([]);
                              }
                              toast({ title: `"${cfg.name}" loaded`, description: "Settings restored. Edit above, then click Sync to save changes." });
                            }}
                            data-testid={`button-load-static-${cfg.id}`}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Sync current settings to this link"
                            disabled={updateEmbedConfigMutation.isPending}
                            onClick={() => updateEmbedConfigMutation.mutate({ id: cfg.id, name: cfg.name })}
                            data-testid={`button-update-static-${cfg.id}`}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Sync
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(staticUrl);
                              setCopiedStaticId(cfg.id);
                              setTimeout(() => setCopiedStaticId(null), 2000);
                            }}
                            data-testid={`button-copy-static-${cfg.id}`}
                          >
                            {isCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            {isCopied ? "Copied" : "Copy"}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="Delete this static link"
                            disabled={deleteEmbedConfigMutation.isPending}
                            onClick={() => deleteEmbedConfigMutation.mutate(cfg.id)}
                            data-testid={`button-delete-static-${cfg.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        readOnly
                        value={staticUrl}
                        className="font-mono text-xs"
                        data-testid={`input-static-url-${cfg.id}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.open(sharedUrl, "_blank")}
            data-testid="button-preview-embed"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview in New Tab
          </Button>
        </div>

        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
              Live Preview
            </div>
            <iframe
              src={sharedUrl}
              className="w-full border-0"
              style={{ height: "500px" }}
              title="Menu Preview"
              data-testid="iframe-embed-preview"
            />
          </CardContent>
        </Card>
      </>
    );
  };

  const renderPrintView = () => {
    if (!selectedMenu) return null;

    const handlePrint = (template: string) => {
      openPrintView(buildPrintUrl(template));
    };

    const getPrintPreviewUrl = () => `${buildPrintUrl(printTemplate)}&preview=print`;

    const primaryMenuName = menuDetail?.menu?.name || "";
    const baseMenuName = primaryMenuName.replace(/\s*\(copy\)(\s+\d+)?$/i, "").trim();
    const otherMenus = menus.filter(m => m.menuGuid !== selectedMenu);
    const suggestedMenus = otherMenus.filter(m =>
      baseMenuName && m.name.toLowerCase().includes(baseMenuName.toLowerCase())
    );
    const restMenus = otherMenus.filter(m => !suggestedMenus.includes(m));
    const sortedOtherMenus = [...suggestedMenus, ...restMenus];

    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("detail")} data-testid="button-back-detail-print">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-print-title">Print Menu</h2>
            <p className="text-sm text-muted-foreground">
              Template, groups, and display options are set in the menu editor. Configure print-specific options below.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-2">
            <label className="text-sm font-semibold">Top Menu Title</label>
            <p className="text-xs text-muted-foreground">
              This replaces the Toast title at the very top of the printed menu. Leave blank to use "{menuDetail?.menu?.name || "Toast menu title"}".
            </p>
            <input
              type="text"
              value={printCustomTitle}
              onChange={(e) => setPrintCustomTitle(e.target.value)}
              placeholder="e.g., Caroline's Bridal Shower"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              data-testid="input-print-custom-menu-title"
            />
          </CardContent>
        </Card>

        {sortedOtherMenus.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Merge Groups From Another Menu</label>
            <p className="text-xs text-muted-foreground">
              Include groups from additional menus in this print job. Useful when related groups were imported as separate menus in Toast.
            </p>
            <div className="border rounded-md p-3 space-y-1 max-h-48 overflow-y-auto">
              {suggestedMenus.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">Related menus</p>
              )}
              {suggestedMenus.map(m => (
                <label key={m.menuGuid} className="flex items-center gap-2 px-1 py-1.5 rounded-md cursor-pointer hover-elevate" data-testid={`checkbox-merge-menu-${m.menuGuid}`}>
                  <Checkbox
                    checked={additionalMenuGuids.includes(m.menuGuid)}
                    onCheckedChange={(checked) => {
                      setAdditionalMenuGuids(prev =>
                        checked ? [...prev, m.menuGuid] : prev.filter(g => g !== m.menuGuid)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                  </div>
                </label>
              ))}
              {restMenus.length > 0 && suggestedMenus.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 pb-1">Other menus</p>
              )}
              {restMenus.map(m => (
                <label key={m.menuGuid} className="flex items-center gap-2 px-1 py-1.5 rounded-md cursor-pointer hover-elevate" data-testid={`checkbox-merge-menu-${m.menuGuid}`}>
                  <Checkbox
                    checked={additionalMenuGuids.includes(m.menuGuid)}
                    onCheckedChange={(checked) => {
                      setAdditionalMenuGuids(prev =>
                        checked ? [...prev, m.menuGuid] : prev.filter(g => g !== m.menuGuid)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm">{m.name}</p>
                  </div>
                </label>
              ))}
            </div>
            {additionalMenuGuids.length > 0 && (
              <p className="text-xs text-primary font-medium">
                {additionalMenuGuids.length} additional menu{additionalMenuGuids.length > 1 ? "s" : ""} merged — {allPrintGroups.length} total groups available
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Size: {printScale}%</label>
            <p className="text-xs text-muted-foreground">Reduce to fit more content per page. Try 85-90% if items spill onto an extra page.</p>
            <input
              type="range"
              min={60}
              max={120}
              step={5}
              value={printScale}
              onChange={(e) => setPrintScale(Number(e.target.value))}
              className="w-full max-w-xs accent-primary"
              data-testid="slider-print-scale"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Columns on Page: {printPages === 0 ? "1" : printPages}</label>
            <p className="text-xs text-muted-foreground">Set how many columns the menu body should flow into on one printed page.</p>
            <Select value={String(printPages)} onValueChange={(v) => setPrintPages(Number(v))}>
              <SelectTrigger data-testid="select-print-pages">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">1 column (default)</SelectItem>
                <SelectItem value="1">1 column</SelectItem>
                <SelectItem value="2">2 columns</SelectItem>
                <SelectItem value="3">3 columns</SelectItem>
                <SelectItem value="4">4 columns</SelectItem>
                <SelectItem value="5">5 columns</SelectItem>
                <SelectItem value="6">6 columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <TypographyPanel
              idPrefix="browser-print"
              title="Typography"
              rows={BROWSER_TYPO_ROWS}
              values={printTypo as unknown as Record<string, TypoElem>}
              onChange={(key, field, value) => setPrintTypo(prev => ({ ...prev, [key]: { ...prev[key as keyof BrowserTypoSettings], [field]: value } }))}
              onReset={() => setPrintTypo(DEFAULT_BROWSER_TYPO)}
            />
          </CardContent>
        </Card>

        {allPrintGroups.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Page Breaks</label>
            <p className="text-xs text-muted-foreground">Force a page break before specific courses so each starts on a new page when printing.</p>
            <div className="flex flex-wrap gap-3">
              {allPrintGroups.map((g, idx) => {
                if (idx === 0) return null;
                const isChecked = printPageBreaks.includes(g.groupGuid);
                return (
                  <label key={g.groupGuid} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setPrintPageBreaks(prev =>
                          checked ? [...prev, g.groupGuid] : prev.filter(id => id !== g.groupGuid)
                        );
                      }}
                      data-testid={`checkbox-pagebreak-${g.groupGuid}`}
                    />
                    <span>Before "{g.name}"</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-[#1a1a18] flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[#d4b896] font-serif text-xl tracking-widest uppercase mb-2">Fine Dining</p>
              <div className="w-8 h-px bg-[#a08c6e] mb-3" />
              <p className="text-[#e8dcc8] font-serif text-sm uppercase tracking-wider mb-1">Starters</p>
              <p className="text-[#b8a890] text-xs italic">Elegant serif typography</p>
              <p className="text-[#b8a890] text-xs italic">Dark background, gold accents</p>
              <p className="text-[#b8a890] text-xs italic">Centered layout</p>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">Fine Dining</p>
                  <p className="text-xs text-muted-foreground">Dark, elegant, serif fonts</p>
                </div>
                <Button size="sm" onClick={() => handlePrint("fine-dining")} data-testid="button-print-fine-dining">
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-[#fafaf9] flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[#1c1917] font-sans text-xl font-semibold mb-2">Modern Clean</p>
              <div className="w-full h-px bg-[#e7e5e4] mb-3" />
              <p className="text-[#44403c] font-sans text-sm font-semibold uppercase tracking-wider mb-1">Starters</p>
              <p className="text-[#78716c] text-xs">Clean sans-serif typography</p>
              <p className="text-[#78716c] text-xs">Light background, minimal</p>
              <p className="text-[#78716c] text-xs">Left-aligned with prices</p>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">Modern Clean</p>
                  <p className="text-xs text-muted-foreground">Light, minimal, sans-serif</p>
                </div>
                <Button size="sm" onClick={() => handlePrint("modern")} data-testid="button-print-modern">
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-white flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[#1c1917] font-sans text-lg font-bold uppercase tracking-wider mb-3">Beverage Menu</p>
              <div className="w-full text-left space-y-1 px-2">
                <p className="text-[#1c1917] font-sans text-xs font-bold underline">Wine</p>
                <div className="flex justify-between text-[10px] text-[#44403c]"><span>Chardonnay</span><span>$12</span></div>
                <div className="flex justify-between text-[10px] text-[#44403c]"><span>Pinot Noir</span><span>$14</span></div>
                <p className="text-[#1c1917] font-sans text-xs font-bold underline mt-2">Beer</p>
                <div className="flex justify-between text-[10px] text-[#44403c]"><span>IPA</span><span>$8</span></div>
                <div className="flex justify-between text-[10px] text-[#44403c]"><span>Lager</span><span>$7</span></div>
              </div>
              <p className="text-[#78716c] text-xs mt-3 italic">Compact list, no descriptions</p>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">Beverage Menu</p>
                  <p className="text-xs text-muted-foreground">Compact list, names + prices</p>
                </div>
                <Button size="sm" onClick={() => handlePrint("beverage")} data-testid="button-print-beverage">
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-white flex flex-col items-stretch justify-start p-0 text-center overflow-hidden">
              <div className="bg-[#ec4899] text-white py-2 px-2 grid grid-cols-3 items-center gap-1">
                <span className="text-[7px] text-left opacity-90 truncate">{printHeader.trim() || KNOLL_DEFAULT_HEADER_LEFT}</span>
                <span className="font-sans text-[11px] font-bold tracking-widest uppercase">The Knoll</span>
                <span className="text-[7px] text-right opacity-90 truncate">{printHeader2.trim() || KNOLL_DEFAULT_HEADER_RIGHT}</span>
              </div>
              <div className="flex flex-1 gap-2 px-3 py-3 text-left">
                <div className="flex-1 space-y-1 border-r border-black/80 pr-2">
                  <p className="text-[9px] font-bold uppercase underline">Boards</p>
                  <div className="flex text-[8px] gap-1"><span className="uppercase font-semibold">Cheese</span><span className="flex-1 border-b border-dotted border-neutral-400 mb-1" /><span>23</span></div>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[9px] font-bold uppercase underline">Sandwiches</p>
                  <div className="flex text-[8px] gap-1"><span className="uppercase font-semibold">Club</span><span className="flex-1 border-b border-dotted border-neutral-400 mb-1" /><span>16</span></div>
                </div>
              </div>
              <p className="text-[#78716c] text-[10px] pb-3 italic">Pink header · courses · letter</p>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">Knoll</p>
                  <p className="text-xs text-muted-foreground">Letter, 2-column cafe menu</p>
                </div>
                <Button size="sm" onClick={() => handlePrint("knoll")} data-testid="button-print-knoll">
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Save Menu</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Save this menu configuration to your Saved Menus library. You can edit, print, share, or toggle staff board visibility from there.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Menu Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={`e.g., ${menuDetail?.menu?.name || "Evening Menu"} — No Pricing`}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-save-name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Description (optional)</label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g., For dining room staff"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-save-description"
                />
              </div>
            </div>
            {allEmbedConfigs.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Overwrite existing saved menu (optional)</label>
                <Select
                  value={saveOverwriteId ? String(saveOverwriteId) : "new"}
                  onValueChange={(v) => setSaveOverwriteId(v === "new" ? null : Number(v))}
                >
                  <SelectTrigger data-testid="select-overwrite-menu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Save as new entry</SelectItem>
                    {allEmbedConfigs.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                disabled={!saveName.trim() || createEmbedConfigMutation.isPending || updateEmbedConfigMutation.isPending}
                onClick={() => {
                  if (saveOverwriteId) {
                    updateEmbedConfigMutation.mutate({ id: saveOverwriteId, name: saveName.trim(), description: saveDescription.trim() });
                  } else {
                    createEmbedConfigMutation.mutate({ name: saveName.trim(), description: saveDescription.trim() });
                  }
                }}
                data-testid="button-save-menu"
              >
                {(createEmbedConfigMutation.isPending || updateEmbedConfigMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {saveOverwriteId ? "Update Saved Menu" : "Save Menu"}
              </Button>
              {(saveName.trim() || saveOverwriteId) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSaveName(""); setSaveDescription(""); setSaveOverwriteId(null); }}
                  data-testid="button-clear-save"
                >
                  Clear
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewMode("saved-menus")}
                data-testid="button-go-saved-menus"
              >
                <BookMarked className="w-4 h-4 mr-1" />
                View Saved Menus
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
              <span>Print Preview</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(printTemplate)}
                data-testid="button-open-print"
              >
                <Printer className="w-4 h-4 mr-1" />
                Open & Print
              </Button>
            </div>
            <div className="bg-neutral-300 dark:bg-neutral-800 p-4 overflow-x-auto">
              <div className="mx-auto" style={{ width: "8.5in", minWidth: "8.5in" }}>
                <iframe
                  src={getPrintPreviewUrl()}
                  className="bg-white shadow-lg border-0 block"
                  style={{ width: "8.5in", minWidth: "8.5in", height: "720px" }}
                  title="Print Preview"
                  data-testid="iframe-print-preview"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const TEMPLATE_LABELS: Record<string, string> = {
    "fine-dining": "Fine Dining",
    "beverage": "Beverage",
    "modern": "Modern",
    "knoll": "Knoll",
  };

  const getConfigPrintUrl = (config: EmbedConfig) => {
    const origin = window.location.origin;
    return `${origin}/api/toast/public/embed-config/${config.slug}`;
  };

  const renderSavedMenusView = () => {
    const staffVisible = allEmbedConfigs.filter(c => c.showOnStaffBoard);
    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("list")} data-testid="button-back-saved-menus">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Saved Menus</h2>
            <p className="text-sm text-muted-foreground">
              {allEmbedConfigs.length} saved {allEmbedConfigs.length === 1 ? "menu" : "menus"} — {staffVisible.length} visible on Staff Board
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("staff-board")}
            data-testid="button-view-staff-board"
          >
            <BookMarked className="w-4 h-4 mr-2" />
            Staff Board
            {staffVisible.length > 0 && (
              <Badge variant="secondary" className="ml-2 no-default-active-elevate">{staffVisible.length}</Badge>
            )}
          </Button>
        </div>

        {allConfigsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Loading saved menus...</span>
          </div>
        ) : allEmbedConfigs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Save className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">No saved menus yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Open a menu, configure it in the Print view, then use the Save Menu section to store it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allEmbedConfigs.map((config) => (
              <Card key={config.id} data-testid={`card-saved-menu-${config.id}`}>
                <CardContent className="p-4">
                  {editingSavedConfig?.id === config.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Name</label>
                          <input
                            type="text"
                            value={editingSavedConfig.name}
                            onChange={(e) => setEditingSavedConfig({ ...editingSavedConfig, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                            data-testid={`input-edit-config-name-${config.id}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Description</label>
                          <input
                            type="text"
                            value={editingSavedConfig.description}
                            onChange={(e) => setEditingSavedConfig({ ...editingSavedConfig, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                            data-testid={`input-edit-config-desc-${config.id}`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={patchEmbedConfigMutation.isPending}
                          onClick={() => patchEmbedConfigMutation.mutate(
                            { id: config.id, name: editingSavedConfig.name, description: editingSavedConfig.description },
                            { onSuccess: () => setEditingSavedConfig(null) }
                          )}
                          data-testid={`button-save-config-edit-${config.id}`}
                        >
                          {patchEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                          Save Name
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSavedConfig(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm" data-testid={`text-saved-menu-name-${config.id}`}>{config.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {TEMPLATE_LABELS[config.template || "fine-dining"] || config.template}
                          </Badge>
                          {config.showOnStaffBoard && (
                            <Badge variant="secondary" className="text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Staff Board
                            </Badge>
                          )}
                        </div>
                        {config.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.menuGuids.split(",").filter(Boolean).length} menu{config.menuGuids.split(",").filter(Boolean).length !== 1 ? "s" : ""}
                          {config.groupGuids ? ` · ${config.groupGuids.split(",").filter(Boolean).length} groups` : ""}
                          {" · "}Saved {new Date(config.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadFromEmbedConfig(config)}
                          data-testid={`button-load-config-${config.id}`}
                          title="Load this saved menu into the editor to edit and resave"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPrintView(getConfigPrintUrl(config))}
                          data-testid={`button-print-config-${config.id}`}
                        >
                          <Printer className="w-4 h-4 mr-1" />
                          Print
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Copy permanent URL"
                          onClick={() => {
                            navigator.clipboard.writeText(getConfigPrintUrl(config));
                            setCopiedSavedConfigId(config.id);
                            setTimeout(() => setCopiedSavedConfigId(null), 2000);
                            toast({ title: "URL copied" });
                          }}
                          data-testid={`button-copy-url-config-${config.id}`}
                        >
                          {copiedSavedConfigId === config.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={config.showOnStaffBoard ? "Remove from Staff Board" : "Show on Staff Board"}
                          className={config.showOnStaffBoard ? "text-primary" : ""}
                          onClick={() => patchEmbedConfigMutation.mutate({ id: config.id, showOnStaffBoard: !config.showOnStaffBoard })}
                          data-testid={`button-toggle-staff-${config.id}`}
                        >
                          {config.showOnStaffBoard ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Duplicate"
                          disabled={duplicateEmbedConfigMutation.isPending}
                          onClick={() => duplicateEmbedConfigMutation.mutate(config)}
                          data-testid={`button-duplicate-config-${config.id}`}
                        >
                          {duplicateEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Rename"
                          onClick={() => setEditingSavedConfig({ id: config.id, name: config.name, description: config.description || "" })}
                          data-testid={`button-rename-config-${config.id}`}
                        >
                          <BookMarked className="w-4 h-4 mr-1" />
                          Rename
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { if (confirm(`Delete "${config.name}"? This cannot be undone.`)) deleteEmbedConfigMutation.mutate(config.id); }}
                          data-testid={`button-delete-config-${config.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderStaffBoardView = () => {
    const staffConfigs = allEmbedConfigs.filter(c => c.showOnStaffBoard);
    return (
      <>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("saved-menus")} data-testid="button-back-staff-board">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Staff Print Board</h2>
            <p className="text-sm text-muted-foreground">
              These menus appear in the Staff Portal for one-click printing. Toggle visibility from Saved Menus.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setViewMode("saved-menus")} data-testid="button-manage-saved">
            <Save className="w-4 h-4 mr-2" />
            Manage Saved Menus
          </Button>
        </div>

        {staffConfigs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookMarked className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">No menus on the Staff Board yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Go to Saved Menus and toggle the eye icon to make a menu visible on the Staff Board.
              </p>
              <Button className="mt-4" variant="outline" size="sm" onClick={() => setViewMode("saved-menus")}>
                <Save className="w-4 h-4 mr-2" />
                Go to Saved Menus
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {staffConfigs.map((config) => (
              <Card key={config.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" data-testid={`text-staff-config-name-${config.id}`}>{config.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {TEMPLATE_LABELS[config.template || "fine-dining"] || config.template}
                        </Badge>
                      </div>
                      {config.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.menuGuids.split(",").filter(Boolean).length} menu{config.menuGuids.split(",").filter(Boolean).length !== 1 ? "s" : ""}
                        {" · "}Updated {new Date(config.updatedAt).toLocaleDateString('en-US')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadFromEmbedConfig(config)}
                        data-testid={`button-load-staff-config-${config.id}`}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPrintView(getConfigPrintUrl(config))}
                        data-testid={`button-print-staff-config-${config.id}`}
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Print
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Remove from Staff Board"
                        onClick={() => patchEmbedConfigMutation.mutate({ id: config.id, showOnStaffBoard: false })}
                        data-testid={`button-remove-staff-${config.id}`}
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="p-6 space-y-4">
        {/* Test render to verify component is mounting */}
        <div className="text-sm text-muted-foreground">
          ToastMenuBrowser mounted - ViewMode: {viewMode}, IsConfigured: {isConfigured ? "true" : "false"}
        </div>
        {viewMode === "list" && renderMenuList()}
        {viewMode === "detail" && renderMenuDetail()}
        {viewMode === "embed" && renderEmbedView()}
        {viewMode === "print" && renderPrintView()}
        {viewMode === "saved-menus" && renderSavedMenusView()}
        {viewMode === "staff-board" && renderStaffBoardView()}
      </div>

      <ToastSyncDialog
        restaurantGuid={restaurantGuid}
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        testIdPrefix="toast-browser"
      />

      <Dialog open={showUnsavedWarning} onOpenChange={(open) => { if (!open) { setShowUnsavedWarning(false); setPendingNavAction(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your changes will be lost if you navigate away without saving. What would you like to do?
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => saveChangesMutation.mutate()}
              disabled={saveChangesMutation.isPending}
              data-testid="button-unsaved-save-continue"
            >
              {saveChangesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes &amp; Continue
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearPendingChanges();
                setShowUnsavedWarning(false);
                if (pendingNavAction) {
                  pendingNavAction();
                  setPendingNavAction(null);
                }
              }}
              data-testid="button-unsaved-discard"
            >
              Discard Changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setShowUnsavedWarning(false); setPendingNavAction(null); }}
              data-testid="button-unsaved-cancel"
            >
              Cancel — Stay on Page
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!courseAboveDialog}
        onOpenChange={(open) => {
          if (!open) closeCourseAboveDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {courseAboveDialog?.mode === "edit" ? "Edit course above item" : "Add course above item"}
            </DialogTitle>
            <DialogDescription>
              {courseAboveDialog
                ? courseAboveDialog.mode === "edit"
                  ? <>Update or delete the course that prints above <span className="font-medium text-foreground">{courseAboveDialog.itemName}</span>.</>
                  : <>Prints a bold course title and optional note above <span className="font-medium text-foreground">{courseAboveDialog.itemName}</span>. Not written back to Toast.</>
                : "Add a print-only course header above a menu item."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Course title</label>
              <Input
                value={courseAboveTitle}
                onChange={(e) => setCourseAboveTitle(e.target.value)}
                placeholder={courseAboveDialog?.mode === "edit" ? "Course title" : "e.g. SANDWICHES"}
                className="text-sm font-semibold uppercase"
                autoFocus
                data-testid="input-course-above-title"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmCourseAbove();
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Course note <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={courseAboveNote}
                onChange={(e) => setCourseAboveNote(e.target.value)}
                placeholder={
                  courseAboveDialog?.mode === "edit"
                    ? "Course detail note"
                    : "Served with Hand cut Russet potato chips.<br>Gluten Free Bread upon request — Add $2.00"
                }
                rows={3}
                className="text-sm"
                data-testid="textarea-course-above-note"
              />
              <p className="text-[11px] text-muted-foreground">
                Use <code className="text-[10px]">&lt;br&gt;</code> for a line break. Prints in smaller italic text under the course title.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <Button onClick={confirmCourseAbove} disabled={!courseAboveTitle.trim()} data-testid="button-confirm-course-above">
                {courseAboveDialog?.mode === "edit" ? (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Course
                  </>
                )}
              </Button>
              {courseAboveDialog?.mode === "edit" && (
                <Button
                  variant="destructive"
                  onClick={confirmDeleteCourseAbove}
                  data-testid="button-delete-course-above"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Course
                </Button>
              )}
              <Button
                variant="outline"
                onClick={closeCourseAboveDialog}
                data-testid="button-cancel-course-above"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDialog} onOpenChange={(open) => { if (!open) { setShowSaveDialog(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Menu</DialogTitle>
            <DialogDescription>
              {loadedEmbedConfigId
                ? `You're working from "${loadedEmbedConfigName}". Update it or save as a new menu.`
                : "Save the current menu configuration to your Saved Menus library."}
            </DialogDescription>
          </DialogHeader>

          {loadedEmbedConfigId ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={saveDialogTab === "update" ? "default" : "outline"}
                  onClick={() => { setSaveDialogTab("update"); setSaveOverwriteId(loadedEmbedConfigId); }}
                  data-testid="button-save-tab-update"
                >
                  Update "{loadedEmbedConfigName}"
                </Button>
                <Button
                  size="sm"
                  variant={saveDialogTab === "new" ? "default" : "outline"}
                  onClick={() => { setSaveDialogTab("new"); setSaveOverwriteId(null); setSaveName(""); setSaveDescription(""); }}
                  data-testid="button-save-tab-new"
                >
                  Save as New
                </Button>
              </div>

              {saveDialogTab === "update" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Overwrites <span className="font-medium text-foreground">"{loadedEmbedConfigName}"</span> with your current selections and settings.
                  </p>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="e.g., For dining room staff, no pricing"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      data-testid="input-save-description-update"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      disabled={updateEmbedConfigMutation.isPending}
                      onClick={() => updateEmbedConfigMutation.mutate({ id: loadedEmbedConfigId, name: loadedEmbedConfigName, description: saveDescription.trim() })}
                      data-testid="button-save-dialog-update"
                    >
                      {updateEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Update
                    </Button>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)} data-testid="button-save-dialog-cancel">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">New Menu Name</label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder={menuDetail?.menu?.name || "e.g., Easter Brunch — No Pricing"}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      data-testid="input-save-name-new"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="e.g., For dining room staff, no pricing"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      data-testid="input-save-description-new"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      disabled={!saveName.trim() || createEmbedConfigMutation.isPending}
                      onClick={() => createEmbedConfigMutation.mutate({ name: saveName.trim(), description: saveDescription.trim() })}
                      data-testid="button-save-dialog-new"
                    >
                      {createEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save as New
                    </Button>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)} data-testid="button-save-dialog-cancel-new">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="text-sm font-medium">Menu Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={menuDetail?.menu?.name || "e.g., Easter Brunch Menu"}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-save-name-dialog"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g., For dining room staff, no pricing"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="input-save-description-dialog"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  disabled={!saveName.trim() || createEmbedConfigMutation.isPending}
                  onClick={() => createEmbedConfigMutation.mutate({ name: saveName.trim(), description: saveDescription.trim() })}
                  data-testid="button-save-dialog-confirm"
                >
                  {createEmbedConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Menu
                </Button>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)} data-testid="button-save-dialog-cancel">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
