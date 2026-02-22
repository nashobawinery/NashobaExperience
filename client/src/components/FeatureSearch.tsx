import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowRight, X, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SearchResult {
  name: string;
  path: string;
  description: string;
}

export default function FeatureSearch() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest("POST", "/api/platform/feature-search", { query: searchQuery });
      const data = await response.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, performSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      navigateToResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const navigateToResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setLocation(result.path);
  };

  const showDropdown = isOpen && (query.trim().length >= 2);

  return (
    <div ref={containerRef} className="relative w-full max-w-md" data-testid="feature-search-container">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search features... (e.g. events, inventory, reports)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8"
          data-testid="input-feature-search"
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            data-testid="button-clear-search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 overflow-hidden shadow-lg" data-testid="feature-search-results">
          <div className="max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 pb-1">
                  <Sparkles className="h-3 w-3" />
                  <span>AI-powered search...</span>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-no-results">
                No features found for "{query}"
              </div>
            ) : (
              <div className="py-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5">
                  <Sparkles className="h-3 w-3" />
                  <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
                </div>
                {results.map((result, index) => (
                  <div
                    key={`${result.path}-${index}`}
                    role="button"
                    tabIndex={0}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-3 cursor-pointer ${
                      index === selectedIndex ? 'bg-accent' : 'hover-elevate'
                    }`}
                    onClick={() => navigateToResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigateToResult(result); }}
                    data-testid={`search-result-${index}`}
                  >
                    <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{result.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{result.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
