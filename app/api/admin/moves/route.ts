import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eq, and, desc, sql, or, gte, lte } from "drizzle-orm";

// GET: Fetch move history with optional filters
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const partId = searchParams.get("partId");
    const locationId = searchParams.get("locationId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query conditions
    const conditions = [];
    if (partId) conditions.push(eq(schema.inventoryMoves.partId, partId));
    if (locationId) conditions.push(eq(schema.inventoryMoves.locationId, locationId));
    if (userId) conditions.push(eq(schema.inventoryMoves.userId, userId));
    if (startDate) conditions.push(gte(schema.inventoryMoves.ts, new Date(startDate)));
    if (endDate) conditions.push(lte(schema.inventoryMoves.ts, new Date(endDate)));

    // Fetch moves with joins
    const moves = await db
      .select({
        id: schema.inventoryMoves.id,
        ts: schema.inventoryMoves.ts,
        deltaQty: schema.inventoryMoves.deltaQty,
        reason: schema.inventoryMoves.reason,
        note: schema.inventoryMoves.note,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          role: schema.users.role,
        },
        part: {
          id: schema.parts.id,
          partId: schema.parts.partId,
          name: schema.parts.partName,
          color: schema.parts.color,
          category: schema.parts.category,
        },
        location: {
          id: schema.locations.id,
          locationId: schema.locations.locationId,
          type: schema.locations.type,
          zone: schema.locations.zone,
        },
      })
      .from(schema.inventoryMoves)
      .innerJoin(schema.users, eq(schema.inventoryMoves.userId, schema.users.id))
      .innerJoin(schema.parts, eq(schema.inventoryMoves.partId, schema.parts.id))
      .innerJoin(schema.locations, eq(schema.inventoryMoves.locationId, schema.locations.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.inventoryMoves.ts))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.inventoryMoves)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      moves,
      total: Number(countResult[0].count),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get moves error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Undo a move (creates a compensating move)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();

    const body = await req.json();
    const { moveId, note } = body;

    if (!moveId) {
      return NextResponse.json(
        { error: "Missing required field: moveId" },
        { status: 400 }
      );
    }

    // Fetch the original move
    const originalMove = await db
      .select()
      .from(schema.inventoryMoves)
      .where(eq(schema.inventoryMoves.id, moveId))
      .limit(1);

    if (!originalMove.length) {
      return NextResponse.json({ error: "Move not found" }, { status: 404 });
    }

    const move = originalMove[0];

    // Get current inventory at the location
    const inventory = await db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.partId, move.partId),
          eq(schema.inventory.locationId, move.locationId)
        )
      )
      .limit(1);

    if (!inventory.length) {
      return NextResponse.json(
        { error: "Inventory record not found" },
        { status: 404 }
      );
    }

    // Calculate compensating quantity (opposite of original)
    const compensatingQty = -move.deltaQty;
    const newQty = inventory[0].qty + compensatingQty;

    // Prevent negative quantities
    if (newQty < 0) {
      return NextResponse.json(
        {
          error: `Cannot undo move: would result in negative quantity. Current: ${inventory[0].qty}, undo would set to: ${newQty}`,
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
      .where(eq(schema.inventory.id, inventory[0].id));

    // Create compensating move
    const undoMove = await db
      .insert(schema.inventoryMoves)
      .values({
        userId: user.id,
        partId: move.partId,
        locationId: move.locationId,
        deltaQty: compensatingQty,
        reason: "Admin undo",
        note: note || `Undoing move from ${new Date(move.ts).toLocaleString()}`,
      })
      .returning();

    return NextResponse.json({
      success: true,
      newQty,
      undoMove: undoMove[0],
    });
  } catch (error) {
    console.error("Undo move error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
