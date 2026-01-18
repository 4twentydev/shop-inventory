import { Suspense } from "react";
import { ItemClient } from "./item-client";
import { KioskHeader } from "@/components/kiosk-header";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ partId: string }>;
}) {
  const { partId } = await params;

  return (
    <div className="min-h-screen bg-background">
      <KioskHeader />
      <main className="container mx-auto px-4 py-4 max-w-4xl">
        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <ItemClient partId={partId} />
        </Suspense>
      </main>
    </div>
  );
}
