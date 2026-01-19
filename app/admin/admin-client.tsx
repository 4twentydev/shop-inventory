"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Upload,
  Settings,
  Plus,
  Pencil,
  Loader2,
  Check,
  AlertCircle,
  Shield,
  User,
  Package,
  Search,
  Trash2,
  Bell,
  Mail,
  MailOpen,
  CheckCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  name: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
}

interface ImportResult {
  success: boolean;
  report?: {
    parts: { created: number; updated: number; errors: string[] };
    locations: { created: number; updated: number; errors: string[] };
    inventory: { created: number; updated: number; errors: string[] };
    cleared?: boolean;
  };
  error?: string;
}

interface PartData {
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
  createdAt: string;
}

interface PartsPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface NotificationData {
  id: string;
  type: string;
  title: string;
  summary: string;
  date: string;
  emailSentAt: string | null;
  createdAt: string;
  isRead: boolean;
}

interface NotificationMoveData {
  userName: string;
  partId: string;
  partName: string;
  locationId: string;
  deltaQty: number;
  reason: string | null;
  note: string | null;
  ts: string;
}

interface NotificationDetail {
  id: string;
  type: string;
  title: string;
  summary: string;
  date: string;
  emailSentAt: string | null;
  createdAt: string;
  data: NotificationMoveData[];
}

export function AdminClient() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userDialog, setUserDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    user?: UserData;
  } | null>(null);
  const [userName, setUserName] = useState("");
  const [userPin, setUserPin] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "user">("user");
  const [savingUser, setSavingUser] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [clearBeforeImport, setClearBeforeImport] = useState(false);

  // Parts state
  const [parts, setParts] = useState<PartData[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partsPagination, setPartsPagination] = useState<PartsPagination | null>(null);
  const [partsSearch, setPartsSearch] = useState("");
  const [partsCategory, setPartsCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [editPartDialog, setEditPartDialog] = useState<{
    open: boolean;
    part: PartData | null;
  }>({ open: false, part: null });
  const [deletePartDialog, setDeletePartDialog] = useState<{
    open: boolean;
    part: PartData | null;
  }>({ open: false, part: null });
  const [savingPart, setSavingPart] = useState(false);
  const [deletingPart, setDeletingPart] = useState(false);
  const [editForm, setEditForm] = useState({
    partName: "",
    color: "",
    category: "",
    jobNumber: "",
    sizeW: "",
    sizeL: "",
    thickness: "",
    brand: "",
    pallet: "",
    unit: "",
  });

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationDialog, setNotificationDialog] = useState<{
    open: boolean;
    notification: NotificationDetail | null;
  }>({ open: false, notification: null });
  const [loadingNotificationDetail, setLoadingNotificationDetail] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchParts = useCallback(async (page = 1) => {
    setLoadingParts(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (partsSearch) params.set("query", partsSearch);
      if (partsCategory) params.set("category", partsCategory);

      const res = await fetch(`/api/admin/parts?${params}`);
      const data = await res.json();
      if (data.parts) {
        setParts(data.parts);
        setPartsPagination(data.pagination);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch parts:", error);
    } finally {
      setLoadingParts(false);
    }
  }, [partsSearch, partsCategory]);

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  const openNotificationDetail = async (id: string) => {
    setLoadingNotificationDetail(true);
    setNotificationDialog({ open: true, notification: null });
    try {
      const res = await fetch(`/api/admin/notifications/${id}`);
      const data = await res.json();
      if (data.notification) {
        setNotificationDialog({ open: true, notification: data.notification });
        // Update the list to mark this one as read
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to fetch notification detail:", error);
      toast({
        title: "Error",
        description: "Failed to load notification details",
        variant: "destructive",
      });
      setNotificationDialog({ open: false, notification: null });
    } finally {
      setLoadingNotificationDetail(false);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch("/api/admin/notifications/mark-read", {
        method: "POST",
      });
      const data = await res.json();
      if (data.marked !== undefined) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
        toast({
          title: "Notifications marked as read",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Failed to mark all read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const openEditPart = (part: PartData) => {
    setEditPartDialog({ open: true, part });
    setEditForm({
      partName: part.partName || "",
      color: part.color || "",
      category: part.category || "",
      jobNumber: part.jobNumber || "",
      sizeW: part.sizeW?.toString() || "",
      sizeL: part.sizeL?.toString() || "",
      thickness: part.thickness?.toString() || "",
      brand: part.brand || "",
      pallet: part.pallet || "",
      unit: part.unit || "",
    });
  };

  const handleSavePart = async () => {
    if (!editPartDialog.part) return;

    if (!editForm.partName.trim()) {
      toast({ title: "Part name is required", variant: "destructive" });
      return;
    }

    setSavingPart(true);
    try {
      const res = await fetch(`/api/admin/parts/${editPartDialog.part.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save part");
      }

      toast({ title: "Part updated", variant: "success" });
      setEditPartDialog({ open: false, part: null });
      fetchParts(partsPagination?.page || 1);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save part",
        variant: "destructive",
      });
    } finally {
      setSavingPart(false);
    }
  };

  const handleDeletePart = async () => {
    if (!deletePartDialog.part) return;

    setDeletingPart(true);
    try {
      const res = await fetch(`/api/admin/parts/${deletePartDialog.part.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete part");
      }

      toast({ title: "Part deleted", variant: "success" });
      setDeletePartDialog({ open: false, part: null });
      fetchParts(partsPagination?.page || 1);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete part",
        variant: "destructive",
      });
    } finally {
      setDeletingPart(false);
    }
  };

  const openCreateUser = () => {
    setUserDialog({ open: true, mode: "create" });
    setUserName("");
    setUserPin("");
    setUserRole("user");
  };

  const openEditUser = (user: UserData) => {
    setUserDialog({ open: true, mode: "edit", user });
    setUserName(user.name);
    setUserPin("");
    setUserRole(user.role);
  };

  const handleSaveUser = async () => {
    if (!userName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    if (userDialog?.mode === "create" && !userPin) {
      toast({ title: "PIN is required for new users", variant: "destructive" });
      return;
    }

    if (userPin && !/^\d{4,6}$/.test(userPin)) {
      toast({
        title: "PIN must be 4-6 digits",
        variant: "destructive",
      });
      return;
    }

    setSavingUser(true);

    try {
      const isCreate = userDialog?.mode === "create";
      const url = isCreate
        ? "/api/admin/users"
        : `/api/admin/users/${userDialog?.user?.id}`;
      const method = isCreate ? "POST" : "PATCH";

      const body: Record<string, string | boolean> = {
        name: userName.trim(),
        role: userRole,
      };

      if (userPin) {
        body.pin = userPin;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save user");
      }

      toast({
        title: isCreate ? "User created" : "User updated",
        variant: "success",
      });

      setUserDialog(null);
      fetchUsers();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save user",
        variant: "destructive",
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleActive = async (user: UserData) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!res.ok) {
        throw new Error("Failed to update user");
      }

      toast({
        title: user.isActive ? "User disabled" : "User enabled",
        variant: "success",
      });

      fetchUsers();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clearBeforeImport", String(clearBeforeImport));

      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      const result: ImportResult = await res.json();
      setImportResult(result);

      if (result.success) {
        toast({
          title: "Import complete",
          description: "Data has been imported successfully",
          variant: "success",
        });
      } else {
        toast({
          title: "Import failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Import error",
        description: err instanceof Error ? err.message : "Failed to import file",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="parts" className="flex items-center gap-2" onClick={() => fetchParts()}>
            <Package className="w-4 h-4" />
            Parts
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2" onClick={() => fetchNotifications()}>
            <Bell className="w-4 h-4" />
            <span className="flex items-center gap-1">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  {unreadCount}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Manage Users</h2>
            <Button onClick={openCreateUser}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted"
                          }`}
                        >
                          {user.role === "admin" ? (
                            <Shield className="w-5 h-5" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.name}
                            {!user.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {user.role}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditUser(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={user.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Parts Tab */}
        <TabsContent value="parts" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-lg font-semibold">Manage Parts</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts..."
                  value={partsSearch}
                  onChange={(e) => setPartsSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchParts(1)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <select
                value={partsCategory}
                onChange={(e) => {
                  setPartsCategory(e.target.value);
                  fetchParts(1);
                }}
                className="border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <Button onClick={() => fetchParts(1)} variant="outline" size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {loadingParts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {parts.map((part) => (
                  <Card key={part.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{part.partId}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {part.partName}
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {part.category && <span>Category: {part.category}</span>}
                            {part.color && <span>Color: {part.color}</span>}
                            <span>Qty: {part.totalQty}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPart(part)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletePartDialog({ open: true, part })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {parts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No parts found
                  </div>
                )}
              </div>

              {partsPagination && partsPagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={partsPagination.page <= 1}
                    onClick={() => fetchParts(partsPagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Page {partsPagination.page} of {partsPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={partsPagination.page >= partsPagination.totalPages}
                    onClick={() => fetchParts(partsPagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Excel Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Upload an Excel workbook to seed or update inventory data. The
                workbook should contain sheets for Parts, Locations, and
                inventory data.
              </p>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="clearBeforeImport"
                  checked={clearBeforeImport}
                  onChange={(e) => setClearBeforeImport(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="clearBeforeImport" className="cursor-pointer">
                    Clear existing data before import
                  </Label>
                  {clearBeforeImport && (
                    <p className="text-sm text-destructive mt-1">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Warning: This will delete ALL existing parts, locations, inventory, and move history before importing.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {importing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span>Importing...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-lg font-medium">
                        Click to upload Excel file
                      </span>
                      <span className="text-sm text-muted-foreground">
                        .xlsx or .xls
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {importResult && (
                <Card className={importResult.success ? "border-success" : "border-destructive"}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      {importResult.success ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                      <span className="font-medium">
                        {importResult.success ? "Import Successful" : "Import Failed"}
                      </span>
                    </div>

                    {importResult.report && (
                      <div className="space-y-2 text-sm">
                        {importResult.report.cleared && (
                          <div className="text-muted-foreground">
                            Existing data was cleared before import.
                          </div>
                        )}
                        <div>
                          <strong>Parts:</strong>{" "}
                          {importResult.report.parts.created} created,{" "}
                          {importResult.report.parts.updated} updated
                          {importResult.report.parts.errors.length > 0 && (
                            <span className="text-destructive">
                              {" "}
                              ({importResult.report.parts.errors.length} errors)
                            </span>
                          )}
                        </div>
                        <div>
                          <strong>Locations:</strong>{" "}
                          {importResult.report.locations.created} created,{" "}
                          {importResult.report.locations.updated} updated
                          {importResult.report.locations.errors.length > 0 && (
                            <span className="text-destructive">
                              {" "}
                              ({importResult.report.locations.errors.length} errors)
                            </span>
                          )}
                        </div>
                        <div>
                          <strong>Inventory:</strong>{" "}
                          {importResult.report.inventory.created} created,{" "}
                          {importResult.report.inventory.updated} updated
                          {importResult.report.inventory.errors.length > 0 && (
                            <span className="text-destructive">
                              {" "}
                              ({importResult.report.inventory.errors.length} errors)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {importResult.error && (
                      <p className="text-destructive">{importResult.error}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4 mr-2" />
                )}
                Mark all read
              </Button>
            )}
          </div>

          {loadingNotifications ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.isRead ? "border-primary/50 bg-primary/5" : ""
                  }`}
                  onClick={() => openNotificationDetail(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 ${
                          notification.isRead
                            ? "text-muted-foreground"
                            : "text-primary"
                        }`}
                      >
                        {notification.isRead ? (
                          <MailOpen className="w-5 h-5" />
                        ) : (
                          <Mail className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              !notification.isRead ? "text-foreground" : ""
                            }`}
                          >
                            {notification.title}
                          </span>
                          {notification.emailSentAt && (
                            <span className="text-xs text-muted-foreground">
                              (Email sent)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {notification.summary}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="autoLock">Auto-lock timeout (seconds)</Label>
                <Input
                  id="autoLock"
                  type="number"
                  defaultValue={90}
                  min={30}
                  max={600}
                  className="w-32 mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Screen will lock after this many seconds of inactivity
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <Dialog
        open={userDialog?.open ?? false}
        onOpenChange={(open) => !open && setUserDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userDialog?.mode === "create" ? "Create User" : "Edit User"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="userName">Name</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter name"
              />
            </div>

            <div>
              <Label htmlFor="userPin">
                PIN {userDialog?.mode === "edit" && "(leave empty to keep current)"}
              </Label>
              <Input
                id="userPin"
                type="password"
                value={userPin}
                onChange={(e) => setUserPin(e.target.value)}
                placeholder="4-6 digits"
                maxLength={6}
              />
            </div>

            <div>
              <Label>Role</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={userRole === "user" ? "default" : "outline"}
                  onClick={() => setUserRole("user")}
                >
                  <User className="w-4 h-4 mr-2" />
                  User
                </Button>
                <Button
                  type="button"
                  variant={userRole === "admin" ? "default" : "outline"}
                  onClick={() => setUserRole("admin")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={savingUser}>
              {savingUser && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog
        open={editPartDialog.open}
        onOpenChange={(open) => !open && setEditPartDialog({ open: false, part: null })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Part</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Part ID</Label>
                  <Input value={editPartDialog.part?.partId || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="editPartName">Part Name *</Label>
                  <Input
                    id="editPartName"
                    value={editForm.partName}
                    onChange={(e) => setEditForm({ ...editForm, partName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editColor">Color</Label>
                  <Input
                    id="editColor"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editCategory">Category</Label>
                  <Input
                    id="editCategory"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Dimensions</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="editSizeW">Width</Label>
                  <Input
                    id="editSizeW"
                    type="number"
                    step="any"
                    value={editForm.sizeW}
                    onChange={(e) => setEditForm({ ...editForm, sizeW: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editSizeL">Length</Label>
                  <Input
                    id="editSizeL"
                    type="number"
                    step="any"
                    value={editForm.sizeL}
                    onChange={(e) => setEditForm({ ...editForm, sizeL: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editThickness">Thickness</Label>
                  <Input
                    id="editThickness"
                    type="number"
                    step="any"
                    value={editForm.thickness}
                    onChange={(e) => setEditForm({ ...editForm, thickness: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editUnit">Unit</Label>
                  <Input
                    id="editUnit"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Other */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Other</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editJobNumber">Job Number</Label>
                  <Input
                    id="editJobNumber"
                    value={editForm.jobNumber}
                    onChange={(e) => setEditForm({ ...editForm, jobNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editBrand">Brand</Label>
                  <Input
                    id="editBrand"
                    value={editForm.brand}
                    onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editPallet">Pallet</Label>
                  <Input
                    id="editPallet"
                    value={editForm.pallet}
                    onChange={(e) => setEditForm({ ...editForm, pallet: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPartDialog({ open: false, part: null })}>
              Cancel
            </Button>
            <Button onClick={handleSavePart} disabled={savingPart}>
              {savingPart && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Part Confirmation Dialog */}
      <Dialog
        open={deletePartDialog.open}
        onOpenChange={(open) => !open && setDeletePartDialog({ open: false, part: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Part</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p>
              Are you sure you want to delete part{" "}
              <strong>{deletePartDialog.part?.partId}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This will also delete all inventory records and move history for this part.
              This action cannot be undone.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePartDialog({ open: false, part: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePart} disabled={deletingPart}>
              {deletingPart && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Detail Dialog */}
      <Dialog
        open={notificationDialog.open}
        onOpenChange={(open) =>
          !open && setNotificationDialog({ open: false, notification: null })
        }
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {notificationDialog.notification?.title || "Loading..."}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {loadingNotificationDetail ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : notificationDialog.notification ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">
                      {
                        notificationDialog.notification.data.filter(
                          (m) => m.deltaQty < 0
                        ).length
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Pulls</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {
                        notificationDialog.notification.data.filter(
                          (m) => m.deltaQty > 0
                        ).length
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Returns</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {notificationDialog.notification.data.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Moves</div>
                  </div>
                </div>

                {/* Moves grouped by user */}
                {(() => {
                  const movesByUser: Record<string, NotificationMoveData[]> = {};
                  for (const move of notificationDialog.notification.data) {
                    if (!movesByUser[move.userName]) {
                      movesByUser[move.userName] = [];
                    }
                    movesByUser[move.userName].push(move);
                  }

                  return Object.entries(movesByUser).map(([userName, moves]) => (
                    <div key={userName} className="space-y-2">
                      <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-t-lg">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{userName}</span>
                        <span className="text-sm text-muted-foreground">
                          ({moves.length} move{moves.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="border rounded-b-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Time</th>
                              <th className="px-3 py-2 text-left font-medium">Action</th>
                              <th className="px-3 py-2 text-left font-medium">Qty</th>
                              <th className="px-3 py-2 text-left font-medium">Part</th>
                              <th className="px-3 py-2 text-left font-medium">Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {moves.map((move, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="px-3 py-2">
                                  {new Date(move.ts).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      move.deltaQty < 0
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {move.deltaQty < 0 ? "Pull" : "Return"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-medium">
                                  {Math.abs(move.deltaQty)}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="font-medium">{move.partId}</div>
                                  <div className="text-muted-foreground text-xs truncate max-w-[200px]">
                                    {move.partName}
                                  </div>
                                </td>
                                <td className="px-3 py-2">{move.locationId}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ));
                })()}

                {notificationDialog.notification.data.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No inventory moves for this day.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setNotificationDialog({ open: false, notification: null })
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
