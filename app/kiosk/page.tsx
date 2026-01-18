import { Suspense } from "react";
import { KioskClient } from "./kiosk-client";
import { KioskHeader } from "@/components/kiosk-header";
import { AIAssistant } from "@/components/ai-assistant";

export default function KioskPage() {
  return (
    <div className="min-h-screen bg-background">
      <KioskHeader />
      <main className="container mx-auto px-4 py-4 max-w-4xl">
        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <KioskClient />
        </Suspense>
      </main>
      <AIAssistant />
    </div>
  );
}
