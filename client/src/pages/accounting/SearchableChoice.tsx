import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Choice = { id: string; label: string };

export function SearchableChoice({
  value,
  fallback,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  onChange,
  disabled,
}: {
  value: string;
  fallback?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  options: Choice[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  const shown = selected?.label || fallback || placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-9 w-full min-w-56 justify-between px-2 text-left font-normal"
        >
          <span className={cn("truncate", !selected && !fallback && "text-muted-foreground")}>{shown}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="clear none"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                —
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={`${option.label} ${option.id}`}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", option.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
