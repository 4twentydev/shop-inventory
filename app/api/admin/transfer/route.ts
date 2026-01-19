import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const user = await requireAdmin();

    const body = await req.json();
    const { partId, fromLocationId, toLocationId, qty, note } = body;

    // Validate input
    if (!partId || !fromLocationId || !toLocationId || !qty) {
      return NextResponse.json(
        { error: "Missing required fields: partId, fromLocationId, toLocationId, qty" },
        { status: 400 }
      );
    }

    if (qty <= 0) {
      return NextResponse.json(
        { error: "Quantity must be positive" },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: "Source and destination locations must be different" },
        { status: 400 }
      );
    }

    // Verify part exists
    const part = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.id, partId))
      .limit(1);

    if (!part.length) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Verify locations exist
    const locations = await db
      .select()
      .from(schema.locations)
      .where(
        sql`${schema.locations.id} IN (${fromLocationId}, ${toLocationId})`
      );

    if (locations.length !== 2) {
      return NextResponse.json(
        { error: "One or both locations not found" },
        { status: 404 }
      );
    }

    // Get source inventory
    const sourceInventory = await db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.partId, partId),
          eq(schema.inventory.locationId, fromLocationId)
        )
      )
      .limit(1);

    if (!sourceInventory.length) {
      return NextResponse.json(
        { error: "No inventory at source location" },
        { status: 400 }
      );
    }

    if (sourceInventory[0].qty < qty) {
      return NextResponse.json(
        {
          error: `Insufficient quantity at source location. Available: ${sourceInventory[0].qty}, requested: ${qty}`,
        },
        { status: 400 }
      );
    }

    // Perform transfer in a transaction-like manner
    // 1. Take from source location
    const newSourceQty = sourceInventory[0].qty - qty;
    await db
      .update(schema.inventory)
      .set({
        qty: newSourceQty,
        updatedAt: new Date(),
      })
      .where(eq(schema.inventory.id, sourceInventory[0].id));

    // Record the take move
    await db.insert(schema.inventoryMoves).values({
      userId: user.id,
      partId,
      locationId: fromLocationId,
      deltaQty: -qty,
      reason: "Admin transfer",
      note: note || `Transferred to ${locations.find((l) => l.id === toLocationId)?.locationId}`,
    });

    // 2. Return to destination location
    const destInventory = await db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.partId, partId),
          eq(schema.inventory.locationId, toLocationId)
        )
      )
      .limit(1);

    let newDestQty: number;

    if (destInventory.length === 0) {
      // Create new inventory record
      const result = await db
        .insert(schema.inventory)
        .values({
          partId,
          locationId: toLocationId,
          qty,
        })
        .returning();
      newDestQty = result[0].qty;
    } else {
      // Update existing inventory
      newDestQty = destInventory[0].qty + qty;
      await db
        .update(schema.inventory)
        .set({
          qty: newDestQty,
          updatedAt: new Date(),
        })
        .where(eq(schema.inventory.id, destInventory[0].id));
    }

    // Record the return move
    await db.insert(schema.inventoryMoves).values({
      userId: user.id,
      partId,
      locationId: toLocationId,
      deltaQty: qty,
      reason: "Admin transfer",
      note: note || `Transferred from ${locations.find((l) => l.id === fromLocationId)?.locationId}`,
    });

    return NextResponse.json({
      success: true,
      sourceQty: newSourceQty,
      destQty: newDestQty,
    });
  } catch (error) {
    console.error("Transfer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
