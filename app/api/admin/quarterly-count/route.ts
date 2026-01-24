import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// GET /api/admin/quarterly-count - List all quarterly counts
export async function GET() {
  try {
    await requireAdmin();

    const counts = await db
      .select({
        id: schema.quarterlyCounts.id,
        name: schema.quarterlyCounts.name,
        description: schema.quarterlyCounts.description,
        status: schema.quarterlyCounts.status,
        createdBy: schema.quarterlyCounts.createdBy,
        createdAt: schema.quarterlyCounts.createdAt,
        completedAt: schema.quarterlyCounts.completedAt,
        creatorName: schema.users.name,
      })
      .from(schema.quarterlyCounts)
      .innerJoin(schema.users, eq(schema.quarterlyCounts.createdBy, schema.users.id))
      .orderBy(desc(schema.quarterlyCounts.createdAt));

    return NextResponse.json(counts);
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get quarterly counts error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get quarterly counts",
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/quarterly-count - Create a new quarterly count
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create the quarterly count
    const [count] = await db
      .insert(schema.quarterlyCounts)
      .values({
        name,
        description: description || null,
        createdBy: user.id,
        status: "in_progress",
      })
      .returning();

    // Get all current inventory to create count records
    const inventoryData = await db
      .select({
        partId: schema.inventory.partId,
        locationId: schema.inventory.locationId,
        expectedQty: schema.inventory.qty,
      })
      .from(schema.inventory);

    // Create count records for all inventory items
    if (inventoryData.length > 0) {
      await db.insert(schema.quarterlyCountRecords).values(
        inventoryData.map((item) => ({
          countId: count.id,
          partId: item.partId,
          locationId: item.locationId,
          expectedQty: item.expectedQty,
          status: "pending" as const,
        }))
      );
    }

    return NextResponse.json(count, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create quarterly count error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create quarterly count",
      },
      { status: 500 }
    );
  }
}
