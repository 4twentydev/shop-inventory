import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ilike, or, eq, sql, count } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const query = url.searchParams.get("query") || "";
    const category = url.searchParams.get("category") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(
        or(
          ilike(schema.parts.partId, searchPattern),
          ilike(schema.parts.partName, searchPattern),
          ilike(schema.parts.color, searchPattern),
          ilike(schema.parts.brand, searchPattern),
          ilike(schema.parts.jobNumber, searchPattern)
        )
      );
    }

    if (category) {
      conditions.push(eq(schema.parts.category, category));
    }

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(schema.parts)
      .where(conditions.length > 0 ? sql`${conditions.reduce((acc, cond, i) => i === 0 ? cond : sql`${acc} AND ${cond}`)}` : undefined);

    const totalCount = countResult[0]?.count || 0;

    // Get parts with total quantity aggregation
    const partsWithQty = await db
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
        createdAt: schema.parts.createdAt,
        totalQty: sql<number>`COALESCE(SUM(${schema.inventory.qty}), 0)`.as("total_qty"),
      })
      .from(schema.parts)
      .leftJoin(schema.inventory, eq(schema.parts.id, schema.inventory.partId))
      .where(conditions.length > 0 ? sql`${conditions.reduce((acc, cond, i) => i === 0 ? cond : sql`${acc} AND ${cond}`)}` : undefined)
      .groupBy(schema.parts.id)
      .orderBy(schema.parts.partId)
      .limit(limit)
      .offset(offset);

    // Get distinct categories for filter dropdown
    const categories = await db
      .selectDistinct({ category: schema.parts.category })
      .from(schema.parts)
      .where(sql`${schema.parts.category} IS NOT NULL`);

    return NextResponse.json({
      parts: partsWithQty,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      categories: categories.map(c => c.category).filter(Boolean),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Parts list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch parts" },
      { status: 500 }
    );
  }
}
