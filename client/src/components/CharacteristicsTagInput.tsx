import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus } from "lucide-react";
import type { Characteristic } from "@shared/schema";

interface CharacteristicsTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CharacteristicsTagInput({ 
  value, 
  onChange, 
  placeholder = "Add characteristics...",
  disabled = false
}: CharacteristicsTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions = [] } = useQuery<Characteristic[]>({
    queryKey: [`/api/characteristics?q=${encodeURIComponent(inputValue)}`],
    enabled: inputValue.length > 0,
  });

  const existingTagsLower = value.map(t => t.toLowerCase());
  const filteredSuggestions = suggestions.filter(
    s => !existingTagsLower.includes(s.name.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    
    const tagLower = trimmed.toLowerCase();
    if (existingTagsLower.includes(tagLower)) return;
    
    onChange([...value, trimmed]);
    setInputValue("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  useEffect(() => {
    if (inputValue.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [inputValue]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {value.map((tag, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="gap-1 pr-1"
            data-testid={`badge-characteristic-${index}`}
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover-elevate active-elevate-2 rounded-full p-0.5"
                data-testid={`button-remove-characteristic-${index}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                data-testid="input-characteristic"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                {filteredSuggestions.length === 0 && inputValue.trim() && (
                  <CommandEmpty>
                    <button
                      type="button"
                      onClick={() => addTag(inputValue)}
                      className="flex items-center gap-2 w-full hover-elevate active-elevate-2 rounded-md p-2"
                      data-testid="button-create-characteristic"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create "{inputValue}"</span>
                    </button>
                  </CommandEmpty>
                )}
                {filteredSuggestions.length > 0 && (
                  <CommandGroup>
                    {filteredSuggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        value={suggestion.name}
                        onSelect={() => addTag(suggestion.name)}
                        data-testid={`item-characteristic-${suggestion.name}`}
                      >
                        <span>{suggestion.name}</span>
                        {suggestion.usageCount > 0 && (
                          <span className="ml-auto text-muted-foreground text-xs">
                            {suggestion.usageCount}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                    {inputValue.trim() && 
                     !filteredSuggestions.some(s => s.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                      <CommandItem
                        value={inputValue}
                        onSelect={() => addTag(inputValue)}
                        className="border-t"
                        data-testid="button-create-characteristic"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span>Create "{inputValue}"</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
