import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, ilike, or, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const category = searchParams.get("category");
    const location = searchParams.get("location");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build the query with aggregated inventory quantities
    let partsQuery = db
      .select({
        id: schema.parts.id,
        partId: schema.parts.partId,
        partName: schema.parts.partName,
        color: schema.parts.color,
        category: schema.parts.category,
        jobNumber: schema.parts.jobNumber,
        sizeW: schema.parts.sizeW,
        sizeL: schema.parts.sizeL,
        thickness: schema.parts.thickness,
        brand: schema.parts.brand,
        pallet: schema.parts.pallet,
        unit: schema.parts.unit,
        totalQty: sql<number>`COALESCE(SUM(${schema.inventory.qty}), 0)`.as(
          "total_qty"
        ),
      })
      .from(schema.parts)
      .leftJoin(schema.inventory, eq(schema.parts.id, schema.inventory.partId))
      .groupBy(schema.parts.id)
      .limit(limit);

    // Add search filter - searches across all text fields
    if (query) {
      const searchPattern = `%${query}%`;
      partsQuery = partsQuery.where(
        or(
          ilike(schema.parts.partId, searchPattern),
          ilike(schema.parts.partName, searchPattern),
          ilike(schema.parts.color, searchPattern),
          ilike(schema.parts.category, searchPattern),
          ilike(schema.parts.jobNumber, searchPattern),
          ilike(schema.parts.brand, searchPattern),
          ilike(schema.parts.pallet, searchPattern),
          ilike(schema.parts.unit, searchPattern),
          // Cast numeric fields to text for searching (e.g., searching "62" finds 62x196 panels)
          sql`CAST(${schema.parts.sizeW} AS TEXT) ILIKE ${searchPattern}`,
          sql`CAST(${schema.parts.sizeL} AS TEXT) ILIKE ${searchPattern}`,
          sql`CAST(${schema.parts.thickness} AS TEXT) ILIKE ${searchPattern}`
        )
      ) as typeof partsQuery;
    }

    // Add category filter
    if (category) {
      partsQuery = partsQuery.where(
        eq(schema.parts.category, category)
      ) as typeof partsQuery;
    }

    const parts = await partsQuery;

    return NextResponse.json({ parts });
  } catch (error) {
    console.error("Parts search error:", error);
    return NextResponse.json(
      { error: "Failed to search parts" },
      { status: 500 }
    );
  }
}
