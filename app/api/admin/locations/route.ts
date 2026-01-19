import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();

    // Get all locations with inventory count
    const locations = await db
      .select({
        id: schema.locations.id,
        locationId: schema.locations.locationId,
        type: schema.locations.type,
        zone: schema.locations.zone,
        partCount: sql<number>`COUNT(DISTINCT ${schema.inventory.partId})`.as("part_count"),
      })
      .from(schema.locations)
      .leftJoin(schema.inventory, sql`${schema.inventory.locationId} = ${schema.locations.id}`)
      .groupBy(schema.locations.id)
      .orderBy(schema.locations.locationId);

    return NextResponse.json({ locations });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Locations list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
