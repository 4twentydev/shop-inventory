"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface QuarterlyCount {
  id: string;
  name: string;
  description: string | null;
  status: "in_progress" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  creatorName: string;
}

interface CountRecord {
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
  locationId: string;
  locationType: string | null;
  locationZone: string | null;
  expectedQty: number;
  countedQty: number | null;
  variance: number | null;
  status: "pending" | "counted" | "verified";
  countedBy: string | null;
  countedAt: string | null;
  notes: string | null;
  counterName: string | null;
}

interface LocationGroup {
  locationId: string;
  locationType: string | null;
  locationZone: string | null;
  records: CountRecord[];
}

interface CountDetails {
  count: QuarterlyCount;
  locations: LocationGroup[];
  summary: {
    totalRecords: number;
    pending: number;
    counted: number;
    verified: number;
  };
}

export function QuarterlyInventorySection() {
  const [counts, setCounts] = useState<QuarterlyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [countName, setCountName] = useState("");
  const [countDescription, setCountDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeCount, setActiveCount] = useState<CountDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [countRecords, setCountRecords] = useState<Record<string, string>>({});
  const [savingRecords, setSavingRecords] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [applyAdjustments, setApplyAdjustments] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quarterly-count");
      if (!res.ok) throw new Error("Failed to fetch counts");
      const data = await res.json();
      setCounts(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load counts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCount = async () => {
    if (!countName.trim()) {
      toast({
        title: "Error",
        description: "Count name is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/quarterly-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: countName,
          description: countDescription || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create count");

      toast({
        title: "Success",
        description: "Quarterly count created successfully",
      });

      setCountName("");
      setCountDescription("");
      setCreateDialog(false);
      fetchCounts();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create count",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const loadCountDetails = async (countId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/quarterly-count/${countId}`);
      if (!res.ok) throw new Error("Failed to load count details");
      const data = await res.json();
      setActiveCount(data);
      setCountRecords({});
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load count details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const saveLocationRecords = async (locationId: string) => {
    if (!activeCount) return;

    const location = activeCount.locations.find((l) => l.locationId === locationId);
    if (!location) return;

    const recordsToUpdate = location.records
      .filter((r) => countRecords[r.id] !== undefined && countRecords[r.id] !== "")
      .map((r) => ({
        recordId: r.id,
        countedQty: parseInt(countRecords[r.id]),
        notes: null,
      }));

    if (recordsToUpdate.length === 0) {
      toast({
        title: "No Changes",
        description: "No counts entered for this location",
      });
      return;
    }

    setSavingRecords(true);
    try {
      const res = await fetch(`/api/admin/quarterly-count/${activeCount.count.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: recordsToUpdate }),
      });

      if (!res.ok) throw new Error("Failed to save counts");

      toast({
        title: "Success",
        description: `Saved ${recordsToUpdate.length} count(s) for ${locationId}`,
      });

      loadCountDetails(activeCount.count.id);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save counts",
        variant: "destructive",
      });
    } finally {
      setSavingRecords(false);
    }
  };

  const completeCount = async () => {
    if (!activeCount) return;

    if (activeCount.summary.pending > 0) {
      toast({
        title: "Cannot Complete",
        description: `${activeCount.summary.pending} records still pending. Count all items before completing.`,
        variant: "destructive",
      });
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch(`/api/admin/quarterly-count/${activeCount.count.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyAdjustments }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete count");
      }

      const result = await res.json();

      toast({
        title: "Success",
        description: applyAdjustments
          ? `Count completed and ${result.summary.recordsWithVariance} adjustments applied`
          : "Count completed without applying adjustments",
      });

      setCompleteDialog(false);
      setActiveCount(null);
      fetchCounts();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete count",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  const deleteCount = async (countId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/quarterly-count/${countId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete count");
      }

      toast({
        title: "Success",
        description: "Count deleted successfully",
      });

      setDeleteDialog(null);
      if (activeCount?.count.id === countId) {
        setActiveCount(null);
      }
      fetchCounts();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete count",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const exportCount = async (countId: string, format: "xlsx" | "csv") => {
    try {
      const res = await fetch(`/api/admin/quarterly-count/${countId}/export?format=${format}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quarterly-count-${countId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Count exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Export failed",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-orange-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-orange-100 text-orange-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={variants[status as keyof typeof variants] || ""}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (loadingDetails && activeCount === null) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (activeCount) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setActiveCount(null)}>
                ← Back
              </Button>
              <h2 className="text-2xl font-bold">{activeCount.count.name}</h2>
              {getStatusBadge(activeCount.count.status)}
            </div>
            {activeCount.count.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {activeCount.count.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {activeCount.count.status === "in_progress" && (
              <Button onClick={() => setCompleteDialog(true)}>Complete Count</Button>
            )}
            <Button variant="outline" onClick={() => exportCount(activeCount.count.id, "xlsx")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportCount(activeCount.count.id, "csv")}>
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Records</div>
                <div className="text-2xl font-bold">{activeCount.summary.totalRecords}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pending</div>
                <div className="text-2xl font-bold text-orange-600">
                  {activeCount.summary.pending}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Counted</div>
                <div className="text-2xl font-bold text-green-600">
                  {activeCount.summary.counted}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Verified</div>
                <div className="text-2xl font-bold text-blue-600">
                  {activeCount.summary.verified}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {activeCount.locations.map((location) => {
            const allCounted = location.records.every((r) => r.status !== "pending");
            const hasPending = location.records.some((r) => r.status === "pending");

            return (
              <Card key={location.locationId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{location.locationId}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {location.locationType} {location.locationZone && `• ${location.locationZone}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {allCounted && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                      {hasPending && (
                        <Badge className="bg-orange-100 text-orange-800">
                          {location.records.filter((r) => r.status === "pending").length} Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2">Part ID</th>
                            <th className="text-left p-2">Part Name</th>
                            <th className="text-left p-2">Category</th>
                            <th className="text-right p-2">Expected</th>
                            <th className="text-right p-2">Counted</th>
                            <th className="text-right p-2">Variance</th>
                            <th className="text-center p-2">Status</th>
                            {activeCount.count.status === "in_progress" && (
                              <th className="text-center p-2 w-32">Count</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {location.records.map((record) => (
                            <tr key={record.id} className="border-t">
                              <td className="p-2 font-mono text-xs">{record.partId}</td>
                              <td className="p-2">{record.partName}</td>
                              <td className="p-2">{record.category || "-"}</td>
                              <td className="p-2 text-right">{record.expectedQty}</td>
                              <td className="p-2 text-right">
                                {record.countedQty !== null ? record.countedQty : "-"}
                              </td>
                              <td
                                className={`p-2 text-right font-medium ${
                                  record.variance
                                    ? record.variance > 0
                                      ? "text-green-600"
                                      : record.variance < 0
                                        ? "text-red-600"
                                        : ""
                                    : ""
                                }`}
                              >
                                {record.variance !== null
                                  ? record.variance > 0
                                    ? `+${record.variance}`
                                    : record.variance
                                  : "-"}
                              </td>
                              <td className="p-2 text-center">
                                {record.status === "counted" && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    Counted
                                  </Badge>
                                )}
                                {record.status === "verified" && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    Verified
                                  </Badge>
                                )}
                                {record.status === "pending" && (
                                  <Badge className="bg-orange-100 text-orange-800 text-xs">
                                    Pending
                                  </Badge>
                                )}
                              </td>
                              {activeCount.count.status === "in_progress" && (
                                <td className="p-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder={record.expectedQty.toString()}
                                    value={countRecords[record.id] || ""}
                                    onChange={(e) =>
                                      setCountRecords({
                                        ...countRecords,
                                        [record.id]: e.target.value,
                                      })
                                    }
                                    disabled={record.status !== "pending"}
                                    className="h-8 text-sm"
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {activeCount.count.status === "in_progress" && hasPending && (
                      <Button
                        onClick={() => saveLocationRecords(location.locationId)}
                        disabled={savingRecords}
                        className="w-full"
                      >
                        {savingRecords ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Save Counts for {location.locationId}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={completeDialog} onOpenChange={setCompleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Count</DialogTitle>
              <DialogDescription>
                Are you sure you want to complete this count? This will finalize all counted
                quantities.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="applyAdjustments"
                  checked={applyAdjustments}
                  onChange={(e) => setApplyAdjustments(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="applyAdjustments" className="font-medium">
                    Apply inventory adjustments
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Update actual inventory quantities to match counted values and create adjustment
                    records
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={completeCount} disabled={completing}>
                {completing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Complete Count
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quarterly Inventory</h2>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Count
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        </div>
      ) : counts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No quarterly counts yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {counts.map((count) => (
            <Card key={count.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(count.status)}
                      <CardTitle>{count.name}</CardTitle>
                      {getStatusBadge(count.status)}
                    </div>
                    {count.description && (
                      <p className="text-sm text-muted-foreground mt-2">{count.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Created by {count.creatorName}</span>
                      <span>
                        {new Date(count.createdAt).toLocaleDateString()} at{" "}
                        {new Date(count.createdAt).toLocaleTimeString()}
                      </span>
                      {count.completedAt && (
                        <span>
                          Completed {new Date(count.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {count.status === "in_progress" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadCountDetails(count.id)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Count
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDialog(count.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {count.status === "completed" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadCountDetails(count.id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportCount(count.id, "xlsx")}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportCount(count.id, "csv")}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Quarterly Count</DialogTitle>
            <DialogDescription>
              This will create a new count session with all current inventory items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="countName">Count Name *</Label>
              <Input
                id="countName"
                placeholder="Q1 2024 Inventory Count"
                value={countName}
                onChange={(e) => setCountName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="countDescription">Description (Optional)</Label>
              <Textarea
                id="countDescription"
                placeholder="Quarterly inventory count for Q1 2024"
                value={countDescription}
                onChange={(e) => setCountDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createCount} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog !== null} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Count</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this count? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog && deleteCount(deleteDialog)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
