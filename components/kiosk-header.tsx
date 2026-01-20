"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Lock, User, Settings, MessageSquare, Menu, AlertTriangle, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";

interface CurrentUser {
  id: string;
  name: string;
  role: "admin" | "user";
}

export function KioskHeader() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [autoLockSeconds, setAutoLockSeconds] = useState(900); // 15 minutes
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const router = useRouter();
  const lastActivityRef = useRef(Date.now());
  const { toast } = useToast();

  // Fetch current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Reset idle timer on activity
  const resetIdle = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleSeconds(0);
  }, []);

  // Set up activity listeners
  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, resetIdle, { passive: true });
    });
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetIdle);
      });
    };
  }, [resetIdle]);

  // Idle timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setIdleSeconds(elapsed);

      if (elapsed >= autoLockSeconds) {
        handleLock();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [autoLockSeconds]);

  const handleLock = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/lock");
    router.refresh();
  };

  const handleSubmitReport = async () => {
    if (!reportMessage.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }

    setSubmittingReport(true);
    try {
      const res = await fetch("/api/report-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reportMessage }),
      });

      if (!res.ok) {
        throw new Error("Failed to send report");
      }

      toast({ title: "Report sent", description: "Thank you for your feedback", variant: "success" });
      setReportDrawerOpen(false);
      setReportMessage("");
    } catch {
      toast({ title: "Error", description: "Failed to send report", variant: "destructive" });
    } finally {
      setSubmittingReport(false);
    }
  };

  const remainingSeconds = Math.max(0, autoLockSeconds - idleSeconds);
  const showWarning = remainingSeconds <= 30 && remainingSeconds > 0;

  return (
    <header className="sticky top-0 z-50 bg-card border-b">
      <div className="mx-auto px-6 py-4 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Shop Inventory</h1>
          </div>

          <div className="flex items-center gap-3">
            {showWarning && (
              <span className="text-sm text-warning font-medium">
                Lock in {remainingSeconds}s
              </span>
            )}

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.name}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => router.push("/kiosk")}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Search
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setReportDrawerOpen(true)}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Problem
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLock}>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Now
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Report Problem Drawer */}
      <Drawer open={reportDrawerOpen} onOpenChange={setReportDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2 justify-center sm:justify-start">
                <AlertTriangle className="h-5 w-5" />
                Report a Problem
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <Label htmlFor="reportMessage" className="mb-2 block">
                Describe the issue
              </Label>
              <textarea
                id="reportMessage"
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="What went wrong?"
                className="w-full h-32 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <DrawerFooter>
              <Button onClick={handleSubmitReport} disabled={submittingReport}>
                {submittingReport && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Report
              </Button>
              <Button variant="outline" onClick={() => setReportDrawerOpen(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
