"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
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
  AlertTriangle,
  Shield,
  User,
  Package,
  Search,
  Trash2,
  Bell,
  Mail,
  MailOpen,
  CheckCheck,
  Warehouse,
  MinusCircle,
  PlusCircle,
  ArrowRight,
  Undo2,
  History,
  Filter,
  X,
  PackagePlus,
  Menu,
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

interface ProblemReportData {
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  reportedAt: string;
}

interface NotificationDetail {
  id: string;
  type: string;
  title: string;
  summary: string;
  date: string;
  emailSentAt: string | null;
  createdAt: string;
  data: NotificationMoveData[] | ProblemReportData;
}

interface ReceivingItem {
  partId: string;
  partName: string;
  category: string;
  locationId: string;
  quantity: number;
  color?: string;
  jobNumber?: string;
  sizeW?: number;
  sizeL?: number;
  thickness?: number;
  brand?: string;
  unit?: string;
  pallet?: string;
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
  const [createPartDialog, setCreatePartDialog] = useState(false);
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
  const [createForm, setCreateForm] = useState({
    partId: "",
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

  // Inventory management state
  const [inventoryDialog, setInventoryDialog] = useState<{
    open: boolean;
    part: PartData | null;
  }>({ open: false, part: null });
  const [inventoryData, setInventoryData] = useState<{
    locationId: string;
    locationType: string | null;
    zone: string | null;
    qty: number;
  }[]>([]);
  const [locations, setLocations] = useState<{
    id: string;
    locationId: string;
    type: string | null;
    zone: string | null;
  }[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    locationId: "",
    deltaQty: "",
    note: "",
  });
  const [adjustingInventory, setAdjustingInventory] = useState(false);

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

  // Material Routing state
  const [moves, setMoves] = useState<any[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(false);
  const [movesFilters, setMovesFilters] = useState({
    partId: "",
    locationId: "",
    userId: "",
    startDate: "",
    endDate: "",
  });
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferForm, setTransferForm] = useState({
    partId: "",
    fromLocationId: "",
    toLocationId: "",
    qty: "",
    note: "",
  });
  const [transferring, setTransferring] = useState(false);

  // Receiving state
  const [receivingCategory, setReceivingCategory] = useState("");
  const [receivingForm, setReceivingForm] = useState({
    partId: "",
    partName: "",
    locationId: "",
    quantity: "",
    color: "",
    jobNumber: "",
    sizeW: "",
    sizeL: "",
    thickness: "",
    brand: "",
    unit: "",
    pallet: "",
  });
  const [receivingQueue, setReceivingQueue] = useState<ReceivingItem[]>([]);
  const [submittingReceiving, setSubmittingReceiving] = useState(false);
  const [receivingLocations, setReceivingLocations] = useState<{
    id: string;
    locationId: string;
    type: string | null;
    zone: string | null;
  }[]>([]);
  const [loadingReceivingLocations, setLoadingReceivingLocations] = useState(false);

  // Navigation state
  const [activeSection, setActiveSection] = useState("users");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items
  const navItems = [
    { id: "users", label: "Users", icon: Users },
    { id: "parts", label: "Parts", icon: Package },
    { id: "routing", label: "Routing", icon: Warehouse },
    { id: "receiving", label: "Receiving", icon: PackagePlus },
    { id: "import", label: "Import", icon: Upload },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { id: "settings", label: "Settings", icon: Settings },
  ];

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

  // Fetch data when section changes
  useEffect(() => {
    if (activeSection === "parts") fetchParts();
    if (activeSection === "routing") fetchMoves();
    if (activeSection === "receiving") fetchReceivingLocations();
    if (activeSection === "notifications") fetchNotifications();
  }, [activeSection]);

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

  // Material Routing functions
  const fetchMoves = useCallback(async () => {
    setLoadingMoves(true);
    try {
      const params = new URLSearchParams();
      if (movesFilters.partId) params.set("partId", movesFilters.partId);
      if (movesFilters.locationId) params.set("locationId", movesFilters.locationId);
      if (movesFilters.userId) params.set("userId", movesFilters.userId);
      if (movesFilters.startDate) params.set("startDate", movesFilters.startDate);
      if (movesFilters.endDate) params.set("endDate", movesFilters.endDate);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/moves?${params}`);
      const data = await res.json();
      if (data.moves) {
        setMoves(data.moves);
      }
    } catch (error) {
      console.error("Failed to fetch moves:", error);
      toast({
        title: "Error",
        description: "Failed to load move history",
        variant: "destructive",
      });
    } finally {
      setLoadingMoves(false);
    }
  }, [movesFilters, toast]);

  const handleTransfer = async () => {
    if (!transferForm.partId || !transferForm.fromLocationId || !transferForm.toLocationId || !transferForm.qty) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const qty = parseInt(transferForm.qty);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be a positive number",
        variant: "destructive",
      });
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch("/api/admin/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: transferForm.partId,
          fromLocationId: transferForm.fromLocationId,
          toLocationId: transferForm.toLocationId,
          qty,
          note: transferForm.note || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      toast({
        title: "Transfer complete",
        description: "Material has been transferred successfully",
        variant: "success",
      });

      setTransferDialog(false);
      setTransferForm({
        partId: "",
        fromLocationId: "",
        toLocationId: "",
        qty: "",
        note: "",
      });
      fetchMoves();
    } catch (error) {
      toast({
        title: "Transfer failed",
        description: error instanceof Error ? error.message : "Failed to transfer material",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const handleUndoMove = async (moveId: string) => {
    if (!confirm("Are you sure you want to undo this move? This will create a compensating move.")) {
      return;
    }

    try {
      const res = await fetch("/api/admin/moves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Undo failed");
      }

      toast({
        title: "Move undone",
        description: "A compensating move has been created",
        variant: "success",
      });

      fetchMoves();
    } catch (error) {
      toast({
        title: "Undo failed",
        description: error instanceof Error ? error.message : "Failed to undo move",
        variant: "destructive",
      });
    }
  };

  // Receiving functions
  const fetchReceivingLocations = async () => {
    if (receivingLocations.length > 0) return;
    setLoadingReceivingLocations(true);
    try {
      const res = await fetch("/api/admin/locations");
      const data = await res.json();
      if (data.locations) {
        setReceivingLocations(data.locations);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoadingReceivingLocations(false);
    }
  };

  const resetReceivingForm = () => {
    setReceivingForm({
      partId: "",
      partName: "",
      locationId: "",
      quantity: "",
      color: "",
      jobNumber: "",
      sizeW: "",
      sizeL: "",
      thickness: "",
      brand: "",
      unit: "",
      pallet: "",
    });
  };

  const handleAddToQueue = () => {
    if (!receivingCategory) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }
    if (!receivingForm.partId.trim()) {
      toast({ title: "Part ID is required", variant: "destructive" });
      return;
    }
    if (!receivingForm.partName.trim()) {
      toast({ title: "Part Name is required", variant: "destructive" });
      return;
    }
    if (!receivingForm.locationId) {
      toast({ title: "Location is required", variant: "destructive" });
      return;
    }
    const qty = parseInt(receivingForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Quantity must be a positive number", variant: "destructive" });
      return;
    }

    const item: ReceivingItem = {
      partId: receivingForm.partId.trim(),
      partName: receivingForm.partName.trim(),
      category: receivingCategory,
      locationId: receivingForm.locationId,
      quantity: qty,
    };

    // Add category-specific fields
    if (receivingCategory === "Extrusion") {
      if (receivingForm.color) item.color = receivingForm.color.trim();
      if (receivingForm.sizeW) item.sizeW = parseFloat(receivingForm.sizeW);
      if (receivingForm.sizeL) item.sizeL = parseFloat(receivingForm.sizeL);
      if (receivingForm.thickness) item.thickness = parseFloat(receivingForm.thickness);
    } else if (["ACM", "SPL", "HPL"].includes(receivingCategory)) {
      if (receivingForm.jobNumber) item.jobNumber = receivingForm.jobNumber.trim();
      if (receivingForm.sizeW) item.sizeW = parseFloat(receivingForm.sizeW);
      if (receivingForm.sizeL) item.sizeL = parseFloat(receivingForm.sizeL);
      if (receivingForm.thickness) item.thickness = parseFloat(receivingForm.thickness);
      if (receivingForm.brand) item.brand = receivingForm.brand.trim();
    } else if (["Rivet", "Misc"].includes(receivingCategory)) {
      if (receivingForm.brand) item.brand = receivingForm.brand.trim();
      if (receivingForm.unit) item.unit = receivingForm.unit.trim();
      if (receivingForm.pallet) item.pallet = receivingForm.pallet.trim();
    }

    setReceivingQueue([...receivingQueue, item]);
    // Only clear part-specific fields, keep location and attributes for faster data entry
    setReceivingForm((prev) => ({
      ...prev,
      partId: "",
      partName: "",
      quantity: "",
    }));
    toast({ title: "Item added to queue", variant: "success" });
  };

  const handleRemoveFromQueue = (index: number) => {
    setReceivingQueue(receivingQueue.filter((_, i) => i !== index));
  };

  const handleClearQueue = () => {
    if (receivingQueue.length === 0) return;
    if (confirm("Clear all items from the queue?")) {
      setReceivingQueue([]);
    }
  };

  const handleSubmitReceiving = async () => {
    if (receivingQueue.length === 0) {
      toast({ title: "Queue is empty", variant: "destructive" });
      return;
    }

    setSubmittingReceiving(true);
    try {
      const res = await fetch("/api/admin/receiving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: receivingQueue }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Receiving failed");
      }

      toast({
        title: "Receiving complete",
        description: `Created ${data.created} parts, updated ${data.updated} inventory records`,
        variant: "success",
      });

      setReceivingQueue([]);
      resetReceivingForm();
    } catch (error) {
      toast({
        title: "Receiving failed",
        description: error instanceof Error ? error.message : "Failed to process receiving",
        variant: "destructive",
      });
    } finally {
      setSubmittingReceiving(false);
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

  const openCreatePart = () => {
    setCreatePartDialog(true);
    setCreateForm({
      partId: "",
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
  };

  const handleCreatePart = async () => {
    if (!createForm.partId.trim()) {
      toast({ title: "Part ID is required", variant: "destructive" });
      return;
    }

    if (!createForm.partName.trim()) {
      toast({ title: "Part name is required", variant: "destructive" });
      return;
    }

    setSavingPart(true);
    try {
      const res = await fetch("/api/admin/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create part");
      }

      toast({ title: "Part created", variant: "success" });
      setCreatePartDialog(false);
      fetchParts(partsPagination?.page || 1);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create part",
        variant: "destructive",
      });
    } finally {
      setSavingPart(false);
    }
  };

  const openInventoryManager = async (part: PartData) => {
    setInventoryDialog({ open: true, part });
    setLoadingInventory(true);
    setAdjustmentForm({ locationId: "", deltaQty: "", note: "" });

    try {
      // Fetch part inventory details
      const [partRes, locationsRes] = await Promise.all([
        fetch(`/api/admin/parts/${part.id}`),
        fetch("/api/admin/locations"),
      ]);

      const partData = await partRes.json();
      const locationsData = await locationsRes.json();

      if (partData.inventory) {
        setInventoryData(partData.inventory);
      }

      if (locationsData.locations) {
        setLocations(locationsData.locations);
      }
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleInventoryAdjustment = async () => {
    if (!inventoryDialog.part) return;

    if (!adjustmentForm.locationId) {
      toast({ title: "Please select a location", variant: "destructive" });
      return;
    }

    const deltaQty = parseInt(adjustmentForm.deltaQty);
    if (isNaN(deltaQty) || deltaQty === 0) {
      toast({
        title: "Please enter a valid quantity adjustment (non-zero)",
        variant: "destructive",
      });
      return;
    }

    setAdjustingInventory(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: inventoryDialog.part.id,
          locationId: adjustmentForm.locationId,
          deltaQty,
          reason: "Admin adjustment",
          note: adjustmentForm.note || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to adjust inventory");
      }

      const result = await res.json();

      toast({
        title: "Inventory adjusted",
        description: `New quantity: ${result.newQty}`,
        variant: "success",
      });

      // Refresh inventory data
      const partRes = await fetch(`/api/admin/parts/${inventoryDialog.part.id}`);
      const partData = await partRes.json();
      if (partData.inventory) {
        setInventoryData(partData.inventory);
      }

      // Reset form
      setAdjustmentForm({ locationId: "", deltaQty: "", note: "" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to adjust inventory",
        variant: "destructive",
      });
    } finally {
      setAdjustingInventory(false);
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
      {/* Mobile Header */}
      <div className="flex items-center justify-between lg:hidden">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Desktop Header - hidden on mobile since we show it above */}
      <h1 className="text-2xl font-bold hidden lg:block">Admin Panel</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium",
                  "transition-colors duration-200",
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Drawer */}
        <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Admin Menu</DrawerTitle>
            </DrawerHeader>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium",
                    "transition-colors duration-200",
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </DrawerContent>
        </Drawer>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Users Section */}
          {activeSection === "users" && (
            <div className="space-y-4">
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
            </div>
          )}

          {/* Parts Section */}
          {activeSection === "parts" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-lg font-semibold">Manage Parts</h2>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
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
              <Button onClick={openCreatePart}>
                <Plus className="w-4 h-4 mr-2" />
                Add Part
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
                            onClick={() => openInventoryManager(part)}
                            title="Adjust Inventory"
                          >
                            <Warehouse className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPart(part)}
                            title="Edit Part"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletePartDialog({ open: true, part })}
                            title="Delete Part"
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
            </div>
          )}

          {/* Import Section */}
          {activeSection === "import" && (
            <div className="space-y-4">
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
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="space-y-4">
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
                          notification.type === "problem_report"
                            ? "text-amber-500"
                            : notification.isRead
                            ? "text-muted-foreground"
                            : "text-primary"
                        }`}
                      >
                        {notification.type === "problem_report" ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : notification.isRead ? (
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
            </div>
          )}

          {/* Routing Section */}
          {activeSection === "routing" && (
            <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Material Routing & Movement</h2>
            <Button onClick={() => setTransferDialog(true)}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Transfer Material
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Move History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMoves ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : moves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No moves found
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="pb-2 pr-4">Date & Time</th>
                          <th className="pb-2 pr-4">Part</th>
                          <th className="pb-2 pr-4">Location</th>
                          <th className="pb-2 pr-4">Qty</th>
                          <th className="pb-2 pr-4">User</th>
                          <th className="pb-2 pr-4">Reason</th>
                          <th className="pb-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moves.map((move) => (
                          <tr key={move.id} className="border-b last:border-0">
                            <td className="py-3 pr-4">
                              <div className="text-xs">
                                {new Date(move.ts).toLocaleDateString()}
                                <br />
                                {new Date(move.ts).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="font-medium">{move.part.partId}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {move.part.name}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="font-medium">{move.location.locationId}</div>
                              {move.location.type && (
                                <div className="text-xs text-muted-foreground">
                                  {move.location.type}
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`font-medium ${
                                  move.deltaQty > 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {move.deltaQty > 0 ? "+" : ""}
                                {move.deltaQty}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <div>{move.user.name}</div>
                              <div className="text-xs text-muted-foreground">{move.user.role}</div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="text-xs">
                                {move.reason || "-"}
                                {move.note && (
                                  <div className="text-muted-foreground mt-0.5">
                                    {move.note}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUndoMove(move.id)}
                                title="Undo this move"
                              >
                                <Undo2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </div>
          )}

          {/* Receiving Section */}
          {activeSection === "receiving" && (
            <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receiving Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Selection */}
              <div>
                <Label htmlFor="receivingCategory">Category</Label>
                <select
                  id="receivingCategory"
                  value={receivingCategory}
                  onChange={(e) => {
                    setReceivingCategory(e.target.value);
                    resetReceivingForm();
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1"
                >
                  <option value="">Select a category...</option>
                  <option value="Extrusion">Extrusion</option>
                  <option value="ACM">ACM</option>
                  <option value="SPL">SPL</option>
                  <option value="HPL">HPL</option>
                  <option value="Rivet">Rivet</option>
                  <option value="Misc">Misc</option>
                </select>
              </div>

              {receivingCategory && (
                <>
                  {/* Common Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="receivingPartId">Part ID *</Label>
                      <Input
                        id="receivingPartId"
                        value={receivingForm.partId}
                        onChange={(e) => setReceivingForm({ ...receivingForm, partId: e.target.value })}
                        placeholder="Enter Part ID"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="receivingPartName">Part Name *</Label>
                      <Input
                        id="receivingPartName"
                        value={receivingForm.partName}
                        onChange={(e) => setReceivingForm({ ...receivingForm, partName: e.target.value })}
                        placeholder="Enter Part Name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="receivingLocation">Location *</Label>
                      <select
                        id="receivingLocation"
                        value={receivingForm.locationId}
                        onChange={(e) => setReceivingForm({ ...receivingForm, locationId: e.target.value })}
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1"
                        disabled={loadingReceivingLocations}
                      >
                        <option value="">Select location...</option>
                        {receivingLocations.map((loc) => (
                          <option key={loc.id} value={loc.locationId}>
                            {loc.locationId} {loc.zone ? `(${loc.zone})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="receivingQty">Quantity *</Label>
                      <Input
                        id="receivingQty"
                        type="number"
                        min="1"
                        value={receivingForm.quantity}
                        onChange={(e) => setReceivingForm({ ...receivingForm, quantity: e.target.value })}
                        placeholder="Enter quantity"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Category-specific fields: Extrusion */}
                  {receivingCategory === "Extrusion" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="receivingColor">Color</Label>
                        <Input
                          id="receivingColor"
                          value={receivingForm.color}
                          onChange={(e) => setReceivingForm({ ...receivingForm, color: e.target.value })}
                          placeholder="Enter color"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingSizeW">Width</Label>
                        <Input
                          id="receivingSizeW"
                          type="number"
                          step="0.01"
                          value={receivingForm.sizeW}
                          onChange={(e) => setReceivingForm({ ...receivingForm, sizeW: e.target.value })}
                          placeholder="Width"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingSizeL">Length</Label>
                        <Input
                          id="receivingSizeL"
                          type="number"
                          step="0.01"
                          value={receivingForm.sizeL}
                          onChange={(e) => setReceivingForm({ ...receivingForm, sizeL: e.target.value })}
                          placeholder="Length"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingThickness">Thickness</Label>
                        <Input
                          id="receivingThickness"
                          type="number"
                          step="0.01"
                          value={receivingForm.thickness}
                          onChange={(e) => setReceivingForm({ ...receivingForm, thickness: e.target.value })}
                          placeholder="Thickness"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Category-specific fields: ACM / SPL / HPL */}
                  {["ACM", "SPL", "HPL"].includes(receivingCategory) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <Label htmlFor="receivingJobNumber">Job Number</Label>
                        <Input
                          id="receivingJobNumber"
                          value={receivingForm.jobNumber}
                          onChange={(e) => setReceivingForm({ ...receivingForm, jobNumber: e.target.value })}
                          placeholder="Job #"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingSizeW2">Width</Label>
                        <Input
                          id="receivingSizeW2"
                          type="number"
                          step="0.01"
                          value={receivingForm.sizeW}
                          onChange={(e) => setReceivingForm({ ...receivingForm, sizeW: e.target.value })}
                          placeholder="Width"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingSizeL2">Length</Label>
                        <Input
                          id="receivingSizeL2"
                          type="number"
                          step="0.01"
                          value={receivingForm.sizeL}
                          onChange={(e) => setReceivingForm({ ...receivingForm, sizeL: e.target.value })}
                          placeholder="Length"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingThickness2">Thickness</Label>
                        <Input
                          id="receivingThickness2"
                          type="number"
                          step="0.01"
                          value={receivingForm.thickness}
                          onChange={(e) => setReceivingForm({ ...receivingForm, thickness: e.target.value })}
                          placeholder="Thickness"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingBrand">Brand</Label>
                        <Input
                          id="receivingBrand"
                          value={receivingForm.brand}
                          onChange={(e) => setReceivingForm({ ...receivingForm, brand: e.target.value })}
                          placeholder="Brand"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Category-specific fields: Rivet / Misc */}
                  {["Rivet", "Misc"].includes(receivingCategory) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="receivingBrand3">Brand</Label>
                        <Input
                          id="receivingBrand3"
                          value={receivingForm.brand}
                          onChange={(e) => setReceivingForm({ ...receivingForm, brand: e.target.value })}
                          placeholder="Brand"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingUnit">Unit</Label>
                        <Input
                          id="receivingUnit"
                          value={receivingForm.unit}
                          onChange={(e) => setReceivingForm({ ...receivingForm, unit: e.target.value })}
                          placeholder="Unit (e.g., box, each)"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivingPallet">Pallet</Label>
                        <Input
                          id="receivingPallet"
                          value={receivingForm.pallet}
                          onChange={(e) => setReceivingForm({ ...receivingForm, pallet: e.target.value })}
                          placeholder="Pallet ID"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Add to Queue Button */}
                  <div className="flex justify-end">
                    <Button onClick={handleAddToQueue}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Queue
                    </Button>
                  </div>
                </>
              )}

              {/* Queue Display */}
              {receivingQueue.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Queue ({receivingQueue.length} items)</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleClearQueue}>
                        Clear
                      </Button>
                      <Button onClick={handleSubmitReceiving} disabled={submittingReceiving}>
                        {submittingReceiving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Submit All
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Part ID</th>
                          <th className="text-left p-2">Part Name</th>
                          <th className="text-left p-2">Category</th>
                          <th className="text-left p-2">Location</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-left p-2">Details</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivingQueue.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 font-mono">{item.partId}</td>
                            <td className="p-2">{item.partName}</td>
                            <td className="p-2">{item.category}</td>
                            <td className="p-2">{item.locationId}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {item.color && `Color: ${item.color}`}
                              {item.jobNumber && `Job: ${item.jobNumber}`}
                              {item.brand && ` Brand: ${item.brand}`}
                              {item.sizeW && ` W: ${item.sizeW}`}
                              {item.sizeL && ` L: ${item.sizeL}`}
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromQueue(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === "settings" && (
            <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="autoLock">Auto-lock timeout (minutes)</Label>
                <Input
                  id="autoLock"
                  type="number"
                  defaultValue={15}
                  min={1}
                  max={60}
                  className="w-32 mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Screen will lock after this many minutes of inactivity
                </p>
              </div>
            </CardContent>
          </Card>
            </div>
          )}
        </main>
      </div>

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
                {notificationDialog.notification.type === "problem_report" ? (
                  // Problem Report Display
                  (() => {
                    const reportData = notificationDialog.notification.data as ProblemReportData;
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-amber-800">Problem Report</div>
                            <div className="text-sm text-amber-700">
                              Submitted on {new Date(reportData.reportedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{reportData.userName}</span>
                            <span className="text-xs px-2 py-0.5 bg-background rounded capitalize">
                              {reportData.userRole}
                            </span>
                          </div>

                          <div className="border rounded-lg p-4">
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              Message
                            </div>
                            <p className="whitespace-pre-wrap">{reportData.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Daily Summary Display (existing code)
                  <>
                    {/* Summary Stats */}
                    {(() => {
                      const moves = notificationDialog.notification.data as NotificationMoveData[];
                      return (
                        <>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                              <div className="text-2xl font-bold text-red-700">
                                {moves.filter((m) => m.deltaQty < 0).length}
                              </div>
                              <div className="text-sm text-muted-foreground">Pulls</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-700">
                                {moves.filter((m) => m.deltaQty > 0).length}
                              </div>
                              <div className="text-sm text-muted-foreground">Returns</div>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                              <div className="text-2xl font-bold">{moves.length}</div>
                              <div className="text-sm text-muted-foreground">Total Moves</div>
                            </div>
                          </div>

                          {/* Moves grouped by user */}
                          {(() => {
                            const movesByUser: Record<string, NotificationMoveData[]> = {};
                            for (const move of moves) {
                              if (!movesByUser[move.userName]) {
                                movesByUser[move.userName] = [];
                              }
                              movesByUser[move.userName].push(move);
                            }

                            return Object.entries(movesByUser).map(([userName, userMoves]) => (
                              <div key={userName} className="space-y-2">
                                <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-t-lg">
                                  <User className="w-4 h-4" />
                                  <span className="font-medium">{userName}</span>
                                  <span className="text-sm text-muted-foreground">
                                    ({userMoves.length} move{userMoves.length !== 1 ? "s" : ""})
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
                                      {userMoves.map((move, idx) => (
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

                          {moves.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              No inventory moves for this day.
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
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

      {/* Create Part Dialog */}
      <Dialog
        open={createPartDialog}
        onOpenChange={(open) => !open && setCreatePartDialog(false)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Part</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="createPartId">Part ID *</Label>
                  <Input
                    id="createPartId"
                    value={createForm.partId}
                    onChange={(e) => setCreateForm({ ...createForm, partId: e.target.value })}
                    placeholder="e.g., PART-001"
                  />
                </div>
                <div>
                  <Label htmlFor="createPartName">Part Name *</Label>
                  <Input
                    id="createPartName"
                    value={createForm.partName}
                    onChange={(e) => setCreateForm({ ...createForm, partName: e.target.value })}
                    placeholder="e.g., Widget A"
                  />
                </div>
                <div>
                  <Label htmlFor="createColor">Color</Label>
                  <Input
                    id="createColor"
                    value={createForm.color}
                    onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="createCategory">Category</Label>
                  <Input
                    id="createCategory"
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Dimensions</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="createSizeW">Width</Label>
                  <Input
                    id="createSizeW"
                    type="number"
                    step="any"
                    value={createForm.sizeW}
                    onChange={(e) => setCreateForm({ ...createForm, sizeW: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="createSizeL">Length</Label>
                  <Input
                    id="createSizeL"
                    type="number"
                    step="any"
                    value={createForm.sizeL}
                    onChange={(e) => setCreateForm({ ...createForm, sizeL: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="createThickness">Thickness</Label>
                  <Input
                    id="createThickness"
                    type="number"
                    step="any"
                    value={createForm.thickness}
                    onChange={(e) => setCreateForm({ ...createForm, thickness: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="createUnit">Unit</Label>
                  <Input
                    id="createUnit"
                    value={createForm.unit}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Other */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Other</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="createJobNumber">Job Number</Label>
                  <Input
                    id="createJobNumber"
                    value={createForm.jobNumber}
                    onChange={(e) => setCreateForm({ ...createForm, jobNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="createBrand">Brand</Label>
                  <Input
                    id="createBrand"
                    value={createForm.brand}
                    onChange={(e) => setCreateForm({ ...createForm, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="createPallet">Pallet</Label>
                  <Input
                    id="createPallet"
                    value={createForm.pallet}
                    onChange={(e) => setCreateForm({ ...createForm, pallet: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePartDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePart} disabled={savingPart}>
              {savingPart && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory Management Dialog */}
      <Dialog
        open={inventoryDialog.open}
        onOpenChange={(open) => !open && setInventoryDialog({ open: false, part: null })}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Manage Inventory: {inventoryDialog.part?.partId}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {inventoryDialog.part?.partName}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {loadingInventory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Current Inventory */}
                <div className="space-y-2">
                  <h3 className="font-medium">Current Inventory by Location</h3>
                  {inventoryData.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Location</th>
                            <th className="px-4 py-2 text-left font-medium">Type</th>
                            <th className="px-4 py-2 text-left font-medium">Zone</th>
                            <th className="px-4 py-2 text-right font-medium">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryData.map((inv, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-4 py-2 font-medium">{inv.locationId}</td>
                              <td className="px-4 py-2">{inv.locationType || "-"}</td>
                              <td className="px-4 py-2">{inv.zone || "-"}</td>
                              <td className="px-4 py-2 text-right font-medium">{inv.qty}</td>
                            </tr>
                          ))}
                          <tr className="border-t bg-muted/50 font-bold">
                            <td colSpan={3} className="px-4 py-2 text-right">Total:</td>
                            <td className="px-4 py-2 text-right">
                              {inventoryData.reduce((sum, inv) => sum + inv.qty, 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                      No inventory found for this part
                    </p>
                  )}
                </div>

                {/* Adjustment Form */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <h3 className="font-medium">Adjust Inventory</h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="adjustLocation">Location *</Label>
                      <select
                        id="adjustLocation"
                        value={adjustmentForm.locationId}
                        onChange={(e) =>
                          setAdjustmentForm({ ...adjustmentForm, locationId: e.target.value })
                        }
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      >
                        <option value="">Select location...</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.locationId} {loc.type && `- ${loc.type}`} {loc.zone && `(${loc.zone})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="adjustQty">Quantity Adjustment *</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = parseInt(adjustmentForm.deltaQty) || 0;
                            setAdjustmentForm({ ...adjustmentForm, deltaQty: String(current - 1) });
                          }}
                        >
                          <MinusCircle className="w-4 h-4" />
                        </Button>
                        <Input
                          id="adjustQty"
                          type="number"
                          value={adjustmentForm.deltaQty}
                          onChange={(e) =>
                            setAdjustmentForm({ ...adjustmentForm, deltaQty: e.target.value })
                          }
                          placeholder="e.g., 10 or -5"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = parseInt(adjustmentForm.deltaQty) || 0;
                            setAdjustmentForm({ ...adjustmentForm, deltaQty: String(current + 1) });
                          }}
                        >
                          <PlusCircle className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use positive numbers to add, negative to subtract
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="adjustNote">Note (optional)</Label>
                      <Input
                        id="adjustNote"
                        value={adjustmentForm.note}
                        onChange={(e) =>
                          setAdjustmentForm({ ...adjustmentForm, note: e.target.value })
                        }
                        placeholder="Reason for adjustment"
                      />
                    </div>

                    <Button
                      onClick={handleInventoryAdjustment}
                      disabled={adjustingInventory}
                      className="w-full"
                    >
                      {adjustingInventory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Apply Adjustment
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInventoryDialog({ open: false, part: null })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Material Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Material Between Locations</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="transferPart">Part ID *</Label>
              <Input
                id="transferPart"
                value={transferForm.partId}
                onChange={(e) => setTransferForm({ ...transferForm, partId: e.target.value })}
                placeholder="Enter part UUID"
              />
            </div>

            <div>
              <Label htmlFor="fromLocation">From Location *</Label>
              <select
                id="fromLocation"
                value={transferForm.fromLocationId}
                onChange={(e) =>
                  setTransferForm({ ...transferForm, fromLocationId: e.target.value })
                }
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select source location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.locationId} {loc.type && `- ${loc.type}`} {loc.zone && `(${loc.zone})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="toLocation">To Location *</Label>
              <select
                id="toLocation"
                value={transferForm.toLocationId}
                onChange={(e) =>
                  setTransferForm({ ...transferForm, toLocationId: e.target.value })
                }
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Select destination location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.locationId} {loc.type && `- ${loc.type}`} {loc.zone && `(${loc.zone})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="transferQty">Quantity *</Label>
              <Input
                id="transferQty"
                type="number"
                min="1"
                value={transferForm.qty}
                onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })}
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <Label htmlFor="transferNote">Note (optional)</Label>
              <Input
                id="transferNote"
                value={transferForm.note}
                onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
                placeholder="Reason for transfer"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={transferring}>
              {transferring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
