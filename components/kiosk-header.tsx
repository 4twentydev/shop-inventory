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
import { Lock, User, Settings, MessageSquare, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface CurrentUser {
  id: string;
  name: string;
  role: "admin" | "user";
}

export function KioskHeader() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [autoLockSeconds, setAutoLockSeconds] = useState(90);
  const router = useRouter();
  const lastActivityRef = useRef(Date.now());

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

  const remainingSeconds = Math.max(0, autoLockSeconds - idleSeconds);
  const showWarning = remainingSeconds <= 30 && remainingSeconds > 0;

  return (
    <header className="sticky top-0 z-50 bg-card border-b">
      <div className="mx-auto px-6 py-4 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary font-medium">
              Elward Systems
            </p>
            <h1 className="text-lg font-semibold text-foreground">Shop Inventory</h1>
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
    </header>
  );
}
