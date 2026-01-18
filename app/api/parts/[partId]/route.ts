import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, sql, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partId } = await params;

    // Get part details
    const partResult = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.id, partId))
      .limit(1);

    if (partResult.length === 0) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const part = partResult[0];

    // Get inventory by location
    const inventoryByLocation = await db
      .select({
        inventoryId: schema.inventory.id,
        locationId: schema.locations.id,
        locationCode: schema.locations.locationId,
        locationType: schema.locations.type,
        zone: schema.locations.zone,
        qty: schema.inventory.qty,
      })
      .from(schema.inventory)
      .innerJoin(
        schema.locations,
        eq(schema.inventory.locationId, schema.locations.id)
      )
      .where(eq(schema.inventory.partId, partId));

    // Get total quantity
    const totalQty = inventoryByLocation.reduce((sum, inv) => sum + inv.qty, 0);

    // Get recent moves for this part
    const recentMoves = await db
      .select({
        id: schema.inventoryMoves.id,
        ts: schema.inventoryMoves.ts,
        deltaQty: schema.inventoryMoves.deltaQty,
        reason: schema.inventoryMoves.reason,
        note: schema.inventoryMoves.note,
        userName: schema.users.name,
        locationCode: schema.locations.locationId,
      })
      .from(schema.inventoryMoves)
      .innerJoin(schema.users, eq(schema.inventoryMoves.userId, schema.users.id))
      .innerJoin(
        schema.locations,
        eq(schema.inventoryMoves.locationId, schema.locations.id)
      )
      .where(eq(schema.inventoryMoves.partId, partId))
      .orderBy(desc(schema.inventoryMoves.ts))
      .limit(10);

    return NextResponse.json({
      part: {
        ...part,
        totalQty,
      },
      inventory: inventoryByLocation,
      recentMoves,
    });
  } catch (error) {
    console.error("Part details error:", error);
    return NextResponse.json(
      { error: "Failed to get part details" },
      { status: 500 }
    );
  }
}
