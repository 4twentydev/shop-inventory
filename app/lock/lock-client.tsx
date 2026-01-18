"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Delete, Loader2 } from "lucide-react";

export function LockClient() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/kiosk";

  const handleDigit = useCallback((digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError("");
    }
  }, [pin.length]);

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  const handleClear = useCallback(() => {
    setPin("");
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setPin("");
        return;
      }

      // Hard redirect to ensure session cookie is picked up
      window.location.href = redirect;
    } catch {
      setError("Connection error. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [pin, redirect, router]);

  // Auto-submit when PIN is 4+ digits
  useEffect(() => {
    if (pin.length >= 4 && !loading) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pin, loading, handleSubmit]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;

      if (/^\d$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape") {
        handleClear();
      } else if (e.key === "Enter" && pin.length >= 4) {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, pin.length, handleDigit, handleDelete, handleClear, handleSubmit]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Shop Inventory</CardTitle>
          <p className="text-muted-foreground mt-2">Enter your PIN to continue</p>
        </CardHeader>
        <CardContent>
          {/* PIN Display */}
          <div className="flex justify-center gap-3 mb-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  i < pin.length
                    ? "bg-primary border-primary"
                    : "border-border"
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-center text-destructive text-sm mb-4">
              {error}
            </div>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                size="xl"
                className="text-2xl font-semibold h-16"
                onClick={() => handleDigit(digit)}
                disabled={loading}
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              size="xl"
              className="h-16 text-muted-foreground"
              onClick={handleClear}
              disabled={loading}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="text-2xl font-semibold h-16"
              onClick={() => handleDigit("0")}
              disabled={loading}
            >
              0
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="h-16"
              onClick={handleDelete}
              disabled={loading}
            >
              <Delete className="w-6 h-6" />
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full mt-4 h-14 text-lg"
            onClick={handleSubmit}
            disabled={pin.length < 4 || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Unlocking...
              </>
            ) : (
              "Unlock"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
