import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// GET /api/admin/quarterly-count/[id] - Get count details with records grouped by location
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Get count details
    const [count] = await db
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
      .where(eq(schema.quarterlyCounts.id, id));

    if (!count) {
      return NextResponse.json({ error: "Count not found" }, { status: 404 });
    }

    // Get all count records with part and location details
    const records = await db
      .select({
        id: schema.quarterlyCountRecords.id,
        partUuid: schema.parts.id,
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
        locationUuid: schema.locations.id,
        locationId: schema.locations.locationId,
        locationType: schema.locations.type,
        locationZone: schema.locations.zone,
        expectedQty: schema.quarterlyCountRecords.expectedQty,
        countedQty: schema.quarterlyCountRecords.countedQty,
        variance: schema.quarterlyCountRecords.variance,
        status: schema.quarterlyCountRecords.status,
        countedBy: schema.quarterlyCountRecords.countedBy,
        countedAt: schema.quarterlyCountRecords.countedAt,
        notes: schema.quarterlyCountRecords.notes,
        counterName: schema.users.name,
      })
      .from(schema.quarterlyCountRecords)
      .innerJoin(schema.parts, eq(schema.quarterlyCountRecords.partId, schema.parts.id))
      .innerJoin(
        schema.locations,
        eq(schema.quarterlyCountRecords.locationId, schema.locations.id)
      )
      .leftJoin(schema.users, eq(schema.quarterlyCountRecords.countedBy, schema.users.id))
      .where(eq(schema.quarterlyCountRecords.countId, id));

    // Group records by location
    const locationGroups: Record<
      string,
      {
        locationId: string;
        locationUuid: string;
        locationType: string | null;
        locationZone: string | null;
        records: typeof records;
      }
    > = {};

    for (const record of records) {
      if (!locationGroups[record.locationId]) {
        locationGroups[record.locationId] = {
          locationId: record.locationId,
          locationUuid: record.locationUuid,
          locationType: record.locationType,
          locationZone: record.locationZone,
          records: [],
        };
      }
      locationGroups[record.locationId].records.push(record);
    }

    return NextResponse.json({
      count,
      locations: Object.values(locationGroups),
      summary: {
        totalRecords: records.length,
        pending: records.filter((r) => r.status === "pending").length,
        counted: records.filter((r) => r.status === "counted").length,
        verified: records.filter((r) => r.status === "verified").length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get count details error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get count details",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/quarterly-count/[id] - Delete a count (only if in_progress)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if count exists and is in progress
    const [count] = await db
      .select()
      .from(schema.quarterlyCounts)
      .where(eq(schema.quarterlyCounts.id, id));

    if (!count) {
      return NextResponse.json({ error: "Count not found" }, { status: 404 });
    }

    if (count.status !== "in_progress") {
      return NextResponse.json(
        { error: "Cannot delete completed or cancelled count" },
        { status: 400 }
      );
    }

    // Delete the count (records will be cascade deleted)
    await db.delete(schema.quarterlyCounts).where(eq(schema.quarterlyCounts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete count error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete count",
      },
      { status: 500 }
    );
  }
}
