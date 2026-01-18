import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminClient } from "./admin-client";
import { KioskHeader } from "@/components/kiosk-header";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/lock?redirect=/admin");
  }

  if (user.role !== "admin") {
    redirect("/kiosk");
  }

  return (
    <div className="min-h-screen bg-background">
      <KioskHeader />
      <main className="container mx-auto px-4 py-4 max-w-4xl">
        <AdminClient />
      </main>
    </div>
  );
}
