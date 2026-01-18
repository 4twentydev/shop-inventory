import { Suspense } from "react";
import { LockClient } from "./lock-client";
import { Loader2 } from "lucide-react";

function LockFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export default function LockPage() {
  return (
    <Suspense fallback={<LockFallback />}>
      <LockClient />
    </Suspense>
  );
}
