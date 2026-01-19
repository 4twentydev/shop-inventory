import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const { partId, locationId, deltaQty, reason, note } = body;

    // Validate required fields
    if (!partId || !locationId || deltaQty === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: partId, locationId, deltaQty" },
        { status: 400 }
      );
    }

    if (typeof deltaQty !== "number" || deltaQty === 0) {
      return NextResponse.json(
        { error: "deltaQty must be a non-zero number" },
        { status: 400 }
      );
    }

    // Verify part exists
    const partResult = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.id, partId))
      .limit(1);

    if (partResult.length === 0) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Verify location exists
    const locationResult = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.id, locationId))
      .limit(1);

    if (locationResult.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Get or create inventory record
    let inventoryResult = await db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.partId, partId),
          eq(schema.inventory.locationId, locationId)
        )
      )
      .limit(1);

    let inventoryId: string;
    let currentQty: number;

    if (inventoryResult.length === 0) {
      // Create new inventory record
      const newInventory = await db
        .insert(schema.inventory)
        .values({
          partId,
          locationId,
          qty: Math.max(0, deltaQty), // For admin adjustments, allow positive deltas to create inventory
        })
        .returning();

      inventoryId = newInventory[0].id;
      currentQty = 0;
    } else {
      inventoryId = inventoryResult[0].id;
      currentQty = inventoryResult[0].qty;
    }

    // Calculate new quantity
    const newQty = currentQty + deltaQty;

    // For admin adjustments, we allow negative adjustments but not negative final quantities
    if (newQty < 0) {
      return NextResponse.json(
        {
          error: `Adjustment would result in negative quantity. Current: ${currentQty}, Adjustment: ${deltaQty}`,
        },
        { status: 400 }
      );
    }

    // Update inventory
    await db
      .update(schema.inventory)
      .set({
        qty: newQty,
        updatedAt: new Date(),
      })
      .where(eq(schema.inventory.id, inventoryId));

    // Create move record for audit trail
    const moveResult = await db
      .insert(schema.inventoryMoves)
      .values({
        userId: admin.id,
        partId,
        locationId,
        deltaQty,
        reason: reason || "Admin adjustment",
        note: note || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      move: moveResult[0],
      newQty,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Inventory adjustment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to adjust inventory" },
      { status: 500 }
    );
  }
}
