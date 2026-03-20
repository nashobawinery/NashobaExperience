import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Type, ChevronUp, ChevronDown } from "lucide-react";

export interface TypoElem { font: string; size: number; bold: boolean; italic: boolean; }

export const FONT_GROUPS = [
  { label: "Serif", fonts: [
    { value: "Cinzel", label: "Cinzel" },
    { value: "Cinzel Decorative", label: "Cinzel Decorative" },
    { value: "Cormorant Garamond", label: "Cormorant Garamond" },
    { value: "EB Garamond", label: "EB Garamond" },
    { value: "Lora", label: "Lora" },
    { value: "Libre Baskerville", label: "Libre Baskerville" },
    { value: "Playfair Display", label: "Playfair Display" },
    { value: "Spectral", label: "Spectral" },
  ]},
  { label: "Sans-Serif", fonts: [
    { value: "DM Sans", label: "DM Sans" },
    { value: "Inter", label: "Inter" },
    { value: "Jost", label: "Jost" },
    { value: "Lato", label: "Lato" },
    { value: "Montserrat", label: "Montserrat" },
    { value: "Nunito", label: "Nunito" },
    { value: "Open Sans", label: "Open Sans" },
    { value: "Oswald", label: "Oswald" },
    { value: "Raleway", label: "Raleway" },
  ]},
  { label: "Script", fonts: [
    { value: "Allura", label: "Allura" },
    { value: "Dancing Script", label: "Dancing Script" },
    { value: "Great Vibes", label: "Great Vibes" },
    { value: "Pacifico", label: "Pacifico" },
    { value: "Sacramento", label: "Sacramento" },
  ]},
];

export interface TypoRow { key: string; label: string; }

export interface TypographyPanelProps {
  idPrefix: string;
  title?: string;
  rows: TypoRow[];
  values: Record<string, TypoElem>;
  onChange: (key: string, field: keyof TypoElem, value: string | number | boolean) => void;
  onReset: () => void;
}

export function TypographyPanel({ idPrefix, title = "Typography", rows, values, onChange, onReset }: TypographyPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(prev => !prev)}
          data-testid={`${idPrefix}-button-toggle-typo`}
        >
          {open ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
          {open ? "Hide" : "Customize Fonts"}
        </Button>
      </div>
      {open && (
        <div className="border rounded-md p-4 space-y-3">
          <p className="text-xs text-muted-foreground">Per-element font, size (pt), bold, and italic. Changes reflect instantly in the preview below.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-medium pb-2 pr-3 w-28">Element</th>
                  <th className="text-left font-medium pb-2 pr-3">Font</th>
                  <th className="text-left font-medium pb-2 pr-3 w-16">Size (pt)</th>
                  <th className="text-left font-medium pb-2 w-16">Style</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ key, label }) => {
                  const el = values[key];
                  if (!el) return null;
                  return (
                    <tr key={key}>
                      <td className="py-1.5 pr-3 text-foreground font-medium whitespace-nowrap">{label}</td>
                      <td className="py-1.5 pr-3">
                        <select
                          value={el.font}
                          onChange={(e) => onChange(key, "font", e.target.value)}
                          className="h-8 w-full min-w-[160px] text-xs rounded-md border border-input bg-background px-2 text-foreground"
                          data-testid={`${idPrefix}-select-typo-${key}-font`}
                        >
                          {FONT_GROUPS.map(group => (
                            <optgroup key={group.label} label={group.label}>
                              {group.fonts.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number"
                          min={6}
                          max={120}
                          value={el.size}
                          onChange={(e) => onChange(key, "size", Math.max(6, Math.min(120, Number(e.target.value))))}
                          className="h-8 w-14 text-xs rounded-md border border-input bg-background px-2 text-foreground"
                          data-testid={`${idPrefix}-input-typo-${key}-size`}
                        />
                      </td>
                      <td className="py-1.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => onChange(key, "bold", !el.bold)}
                            className={`h-8 w-8 rounded-md text-sm font-bold border transition-colors ${el.bold ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input text-muted-foreground"}`}
                            data-testid={`${idPrefix}-toggle-typo-${key}-bold`}
                            title="Bold"
                          >B</button>
                          <button
                            type="button"
                            onClick={() => onChange(key, "italic", !el.italic)}
                            className={`h-8 w-8 rounded-md text-sm italic border transition-colors ${el.italic ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input text-muted-foreground"}`}
                            data-testid={`${idPrefix}-toggle-typo-${key}-italic`}
                            title="Italic"
                          >I</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            data-testid={`${idPrefix}-button-reset-typo`}
          >
            Reset to defaults
          </Button>
        </div>
      )}
    </div>
  );
}
