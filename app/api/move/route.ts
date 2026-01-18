import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      // Create new inventory record (for returns to new locations)
      if (deltaQty < 0) {
        return NextResponse.json(
          { error: "Cannot take from location with no inventory" },
          { status: 400 }
        );
      }

      const newInventory = await db
        .insert(schema.inventory)
        .values({
          partId,
          locationId,
          qty: 0,
        })
        .returning();

      inventoryId = newInventory[0].id;
      currentQty = 0;
    } else {
      inventoryId = inventoryResult[0].id;
      currentQty = inventoryResult[0].qty;
    }

    // Check if taking would result in negative quantity
    const newQty = currentQty + deltaQty;
    if (newQty < 0) {
      return NextResponse.json(
        {
          error: `Insufficient quantity. Current: ${currentQty}, Requested: ${Math.abs(
            deltaQty
          )}`,
        },
        { status: 400 }
      );
    }

    // Perform the transaction: update inventory and create move record
    // Update inventory
    await db
      .update(schema.inventory)
      .set({
        qty: newQty,
        updatedAt: new Date(),
      })
      .where(eq(schema.inventory.id, inventoryId));

    // Create move record
    const moveResult = await db
      .insert(schema.inventoryMoves)
      .values({
        userId: user.id,
        partId,
        locationId,
        deltaQty,
        reason: reason || null,
        note: note || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      move: moveResult[0],
      newQty,
    });
  } catch (error) {
    console.error("Move error:", error);
    return NextResponse.json(
      { error: "Failed to process inventory move" },
      { status: 500 }
    );
  }
}
