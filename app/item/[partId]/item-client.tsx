"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Minus,
  Plus,
  Loader2,
  MapPin,
  History,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InventoryLocation {
  inventoryId: string;
  locationId: string;
  locationCode: string;
  locationType: string | null;
  zone: string | null;
  qty: number;
}

interface Move {
  id: string;
  ts: string;
  deltaQty: number;
  reason: string | null;
  note: string | null;
  userName: string;
  locationCode: string;
}

interface Part {
  id: string;
  partId: string;
  partName: string;
  color: string | null;
  category: string | null;
  totalQty: number;
}

interface ItemData {
  part: Part;
  inventory: InventoryLocation[];
  recentMoves: Move[];
}

export function ItemClient({ partId }: { partId: string }) {
  const [data, setData] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean;
    type: "take" | "return";
    locationId: string;
    locationCode: string;
    currentQty: number;
  } | null>(null);
  const [qtyInput, setQtyInput] = useState("");
  const [wholeSkid, setWholeSkid] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [returnLocationId, setReturnLocationId] = useState<string>("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/parts/${partId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Part not found");
        } else {
          setError("Failed to load part details");
        }
        return;
      }

      const itemData = await res.json();
      setData(itemData);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, [partId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTake = (location: InventoryLocation) => {
    setMoveDialog({
      open: true,
      type: "take",
      locationId: location.locationId,
      locationCode: location.locationCode,
      currentQty: location.qty,
    });
    setQtyInput("");
    setWholeSkid(false);
    setNote("");
  };

  const handleReturn = (location: InventoryLocation) => {
    setMoveDialog({
      open: true,
      type: "return",
      locationId: location.locationId,
      locationCode: location.locationCode,
      currentQty: location.qty,
    });
    setQtyInput("");
    setWholeSkid(false);
    setNote("");
    setReturnLocationId(location.locationId);
    setShowLocationPicker(false);
  };

  const handleSubmitMove = async () => {
    if (!moveDialog) return;

    const finalQty =
      moveDialog.type === "take" && wholeSkid
        ? moveDialog.currentQty
        : parseInt(qtyInput, 10);
    if (isNaN(finalQty) || finalQty <= 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }

    if (moveDialog.type === "take" && finalQty > moveDialog.currentQty) {
      toast({
        title: "Not enough stock",
        description: `Only ${moveDialog.currentQty} available`,
        variant: "destructive",
      });
      return;
    }

    // For returns, use the selected return location; for takes, use original
    const targetLocationId =
      moveDialog.type === "return" ? returnLocationId : moveDialog.locationId;
    const targetLocation =
      moveDialog.type === "return"
        ? inventory.find((loc) => loc.locationId === returnLocationId)
        : null;
    const targetLocationCode =
      moveDialog.type === "return" && targetLocation
        ? targetLocation.locationCode
        : moveDialog.locationCode;

    setSubmitting(true);

    try {
      const res = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          locationId: targetLocationId,
          deltaQty: moveDialog.type === "take" ? -finalQty : finalQty,
          note: note || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Move failed");
      }

      toast({
        title: moveDialog.type === "take" ? "Pulled" : "Returned",
        description: `${finalQty} x ${data?.part.partName} ${
          moveDialog.type === "take" ? "pulled from" : "returned to"
        } ${targetLocationCode}`,
        variant: "success",
      });

      setMoveDialog(null);
      fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Move failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push("/kiosk")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Button>
      </div>
    );
  }

  const { part, inventory, recentMoves } = data;

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push("/kiosk")} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Search
      </Button>

      {/* Part Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{part.partName}</CardTitle>
              <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                <span className="font-mono">{part.partId}</span>
                {part.color && (
                  <>
                    <span>•</span>
                    <span>{part.color}</span>
                  </>
                )}
                {part.category && (
                  <>
                    <span>•</span>
                    <span>{part.category}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-4xl font-bold ${
                  part.totalQty === 0
                    ? "text-destructive"
                    : part.totalQty < 5
                    ? "text-warning"
                    : "text-success"
                }`}
              >
                {part.totalQty}
              </div>
              <div className="text-sm text-muted-foreground">total in stock</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Inventory by Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            By Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No inventory found for this part
            </p>
          ) : (
            <div className="space-y-3">
              {inventory.map((loc) => (
                <div
                  key={loc.inventoryId}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg bg-card text-card-foreground border border-border"
                >
                  <div className="flex-1">
                    <div className="font-medium">{loc.locationCode}</div>
                    {(loc.locationType || loc.zone) && (
                      <div className="text-sm text-muted-foreground">
                        {[loc.locationType, loc.zone].filter(Boolean).join(" / ")}
                      </div>
                    )}
                  </div>
                  <div className="text-xl font-bold min-w-[60px] text-right">
                    {loc.qty}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-[#E46F47] text-[#E46F47] hover:bg-[#E46F47]/10"
                      onClick={() => handleTake(loc)}
                      disabled={loc.qty === 0}
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      PULL
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#033F63] text-[#033F63] hover:bg-[#033F63]/10"
                      onClick={() => handleReturn(loc)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      RETURN
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Moves */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentMoves.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No recent activity
            </p>
          ) : (
            <div className="space-y-2">
              {recentMoves.map((move) => (
                <div
                  key={move.id}
                  className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          move.deltaQty < 0 ? "text-destructive" : "text-success"
                        }`}
                      >
                        {move.deltaQty > 0 ? "+" : ""}
                        {move.deltaQty}
                      </span>
                      <span className="text-muted-foreground">@</span>
                      <span>{move.locationCode}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {move.userName} •{" "}
                      {new Date(move.ts).toLocaleDateString()}{" "}
                      {new Date(move.ts).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {move.note && (
                        <span className="ml-2 italic">"{move.note}"</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move Dialog */}
      <Dialog
        open={moveDialog?.open ?? false}
        onOpenChange={(open) => !open && setMoveDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {moveDialog?.type === "take" ? (
                <>
                  <Minus className="w-5 h-5 text-destructive" />
                  Pull from {moveDialog?.locationCode}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-success" />
                  Return to{" "}
                  {inventory.find((loc) => loc.locationId === returnLocationId)
                    ?.locationCode || moveDialog?.locationCode}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Part info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card text-card-foreground border border-border">
              <Package className="w-6 h-6 text-muted-foreground" />
              <div>
                <div className="font-medium">{part.partName}</div>
                <div className="text-sm text-muted-foreground">
                  {moveDialog?.type === "take" ? "Available: " : "Current: "}
                  {moveDialog?.currentQty}
                </div>
              </div>
            </div>

            {/* Location picker for returns */}
            {moveDialog?.type === "return" && inventory.length > 1 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showLocationPicker ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Change location
                </button>
                {showLocationPicker && (
                  <div className="mt-2 space-y-1">
                    {inventory.map((loc) => (
                      <button
                        key={loc.locationId}
                        type="button"
                        onClick={() => {
                          setReturnLocationId(loc.locationId);
                          setShowLocationPicker(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-md text-left text-sm transition-colors ${
                          returnLocationId === loc.locationId
                            ? "bg-primary/10 border border-primary"
                            : "bg-muted hover:bg-muted/80 border border-transparent"
                        }`}
                      >
                        <span className="font-medium">{loc.locationCode}</span>
                        <span className="text-muted-foreground">qty: {loc.qty}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label className="mb-2 block">Quantity</Label>
              <div className="space-y-3">
                <Input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={
                    moveDialog?.type === "take" ? "Enter quantity" : "Required"
                  }
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  className="h-12 text-center text-lg"
                  min={1}
                  max={
                    moveDialog?.type === "take" ? moveDialog.currentQty : undefined
                  }
                  required={moveDialog?.type !== "take" || !wholeSkid}
                  disabled={moveDialog?.type === "take" && wholeSkid}
                />
                {moveDialog?.type === "take" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={wholeSkid}
                      onChange={(e) => setWholeSkid(e.target.checked)}
                    />
                    Whole skid (take all from this location)
                  </label>
                )}
              </div>
            </div>

            {/* Note */}
            <div>
              <Label htmlFor="note" className="mb-2 block">
                Note (optional)
              </Label>
              <Input
                id="note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className={
                moveDialog?.type === "take"
                  ? "bg-[#E46F47] text-white hover:bg-[#E46F47]/90"
                  : "bg-[#033F63] text-white hover:bg-[#033F63]/90"
              }
              onClick={handleSubmitMove}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : moveDialog?.type === "take" ? (
                <Minus className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {moveDialog?.type === "take" ? "Pull" : "Return"}{" "}
              {moveDialog?.type === "take" && wholeSkid
                ? moveDialog.currentQty
                : qtyInput || ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
