"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package, Loader2 } from "lucide-react";

interface Part {
  id: string;
  partId: string;
  partName: string;
  color: string | null;
  category: string | null;
  jobNumber: string | null;
  sizeW: number | null;
  sizeL: number | null;
  thickness: number | null;
  brand: string | null;
  pallet: string | null;
  unit: string | null;
  totalQty: number;
}

export function KioskClient() {
  const [query, setQuery] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  const partsByCategory = useMemo(() => {
    const groups = new Map<string, Part[]>();
    for (const part of parts) {
      const key = part.category?.trim() || "Uncategorized";
      const group = groups.get(key);
      if (group) {
        group.push(part);
      } else {
        groups.set(key, [part]);
      }
    }
    return groups;
  }, [parts]);

  const categoryKeys = useMemo(() => {
    return Array.from(partsByCategory.keys()).sort((a, b) => a.localeCompare(b));
  }, [partsByCategory]);

  const hasMultipleCategories = categoryKeys.length > 1;

  const searchParts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setParts([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/parts?query=${encodeURIComponent(searchQuery)}&limit=50`
      );
      const data = await res.json();

      if (data.parts) {
        setParts(data.parts);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchParts(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchParts]);

  const handlePartClick = (partId: string) => {
    router.push(`/item/${partId}`);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, ID, color, job, size, brand..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 h-16 text-lg rounded-xl shadow-sm bg-card text-foreground placeholder:text-muted-foreground border-border"
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      {!searched && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Start typing to search inventory</p>
        </div>
      )}

      {searched && !loading && parts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No parts found for "{query}"</p>
        </div>
      )}

      {parts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground px-1">
            {parts.length} result{parts.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {hasMultipleCategories ? (
              <div className="space-y-4">
                {categoryKeys.map((category) => {
                  const categoryParts = partsByCategory.get(category) || [];
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-baseline justify-between px-1">
                        <p className="text-sm font-semibold text-foreground bg-muted/60 px-2 py-1 rounded-md">
                          {category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {categoryParts.length} result
                          {categoryParts.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {categoryParts.map((part) => (
                          <Card
                            key={part.id}
                            className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] bg-card text-card-foreground border-border"
                            onClick={() => handlePartClick(part.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg truncate">
                                      {part.partName}
                                    </h3>
                                    {part.color && (
                                      <span className="text-sm px-2 py-0.5 bg-muted text-foreground/80 rounded-full truncate">
                                        {part.color}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-foreground/70 flex-wrap">
                                    <span className="font-mono">
                                      {part.partId}
                                    </span>
                                    {part.category && (
                                      <>
                                        <span>•</span>
                                        <span>{part.category}</span>
                                      </>
                                    )}
                                    {part.jobNumber && (
                                      <>
                                        <span>•</span>
                                        <span>Job {part.jobNumber}</span>
                                      </>
                                    )}
                                    {part.sizeW && part.sizeL && (
                                      <>
                                        <span>•</span>
                                        <span>
                                          {part.sizeW}×{part.sizeL}
                                        </span>
                                      </>
                                    )}
                                    {part.brand && (
                                      <>
                                        <span>•</span>
                                        <span>{part.brand}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div
                                    className={`text-2xl font-bold ${
                                      part.totalQty === 0
                                        ? "text-destructive"
                                        : part.totalQty < 5
                                        ? "text-warning"
                                        : "text-success"
                                    }`}
                                  >
                                    {part.totalQty}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    in stock
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              parts.map((part) => (
                <Card
                  key={part.id}
                  className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] bg-card text-card-foreground border-border"
                  onClick={() => handlePartClick(part.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg truncate">
                            {part.partName}
                          </h3>
                          {part.color && (
                            <span className="text-sm px-2 py-0.5 bg-muted text-foreground/80 rounded-full truncate">
                              {part.color}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-foreground/70 flex-wrap">
                          <span className="font-mono">{part.partId}</span>
                          {part.category && (
                            <>
                              <span>•</span>
                              <span>{part.category}</span>
                            </>
                          )}
                          {part.jobNumber && (
                            <>
                              <span>•</span>
                              <span>Job {part.jobNumber}</span>
                            </>
                          )}
                          {part.sizeW && part.sizeL && (
                            <>
                              <span>•</span>
                              <span>{part.sizeW}×{part.sizeL}</span>
                            </>
                          )}
                          {part.brand && (
                            <>
                              <span>•</span>
                              <span>{part.brand}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-2xl font-bold ${
                            part.totalQty === 0
                              ? "text-destructive"
                              : part.totalQty < 5
                              ? "text-warning"
                              : "text-success"
                          }`}
                        >
                          {part.totalQty}
                        </div>
                        <div className="text-xs text-muted-foreground">in stock</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
