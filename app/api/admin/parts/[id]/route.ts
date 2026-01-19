import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;

    // Get part with inventory breakdown
    const part = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.id, id))
      .limit(1);

    if (part.length === 0) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Get inventory breakdown by location
    const inventoryBreakdown = await db
      .select({
        locationId: schema.locations.locationId,
        locationType: schema.locations.type,
        zone: schema.locations.zone,
        qty: schema.inventory.qty,
      })
      .from(schema.inventory)
      .innerJoin(schema.locations, eq(schema.inventory.locationId, schema.locations.id))
      .where(eq(schema.inventory.partId, id));

    return NextResponse.json({
      part: part[0],
      inventory: inventoryBreakdown,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Part detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch part" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();

    // Verify part exists
    const existing = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Build update object with only provided fields
    const updates: Partial<{
      partName: string;
      color: string | null;
      category: string | null;
      jobNumber: string | null;
      sizeW: number | null;
      sizeL: number | null;
      thickness: number | null;
      brand: string | null;
      pallet: string | null;
      unit: string | null;
    }> = {};

    if (body.partName !== undefined) updates.partName = body.partName;
    if (body.color !== undefined) updates.color = body.color || null;
    if (body.category !== undefined) updates.category = body.category || null;
    if (body.jobNumber !== undefined) updates.jobNumber = body.jobNumber || null;
    if (body.sizeW !== undefined) updates.sizeW = body.sizeW ? parseFloat(body.sizeW) : null;
    if (body.sizeL !== undefined) updates.sizeL = body.sizeL ? parseFloat(body.sizeL) : null;
    if (body.thickness !== undefined) updates.thickness = body.thickness ? parseFloat(body.thickness) : null;
    if (body.brand !== undefined) updates.brand = body.brand || null;
    if (body.pallet !== undefined) updates.pallet = body.pallet || null;
    if (body.unit !== undefined) updates.unit = body.unit || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Validate required fields
    if (updates.partName !== undefined && !updates.partName.trim()) {
      return NextResponse.json({ error: "Part name is required" }, { status: 400 });
    }

    await db
      .update(schema.parts)
      .set(updates)
      .where(eq(schema.parts.id, id));

    // Return updated part
    const updated = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.id, id))
      .limit(1);

    return NextResponse.json({ part: updated[0] });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Part update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update part" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;

    // Verify part exists
    const existing = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Delete part (cascades to inventory and moves due to FK constraints)
    await db.delete(schema.parts).where(eq(schema.parts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Part delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete part" },
      { status: 500 }
    );
  }
}
