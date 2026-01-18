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
  };
  error?: string;
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
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
    </div>
  );
}
