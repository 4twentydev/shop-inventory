import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// PUT /api/admin/quarterly-count/[id]/records - Add a new record to the count
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const { partId, locationId, expectedQty } = body;

    if (!partId || !locationId) {
      return NextResponse.json(
        { error: "Part ID and Location ID are required" },
        { status: 400 }
      );
    }

    // Verify count exists and is in progress
    const [count] = await db
      .select()
      .from(schema.quarterlyCounts)
      .where(eq(schema.quarterlyCounts.id, id));

    if (!count) {
      return NextResponse.json({ error: "Count not found" }, { status: 404 });
    }

    if (count.status !== "in_progress") {
      return NextResponse.json(
        { error: "Cannot add records to completed or cancelled count" },
        { status: 400 }
      );
    }

    // Check if record already exists for this part/location
    const [existing] = await db
      .select()
      .from(schema.quarterlyCountRecords)
      .where(
        and(
          eq(schema.quarterlyCountRecords.countId, id),
          eq(schema.quarterlyCountRecords.partId, partId),
          eq(schema.quarterlyCountRecords.locationId, locationId)
        )
      );

    if (existing) {
      return NextResponse.json(
        { error: "Record already exists for this part and location" },
        { status: 400 }
      );
    }

    // Create the new record
    const [newRecord] = await db
      .insert(schema.quarterlyCountRecords)
      .values({
        countId: id,
        partId,
        locationId,
        expectedQty: expectedQty ?? 0,
        status: "pending",
      })
      .returning();

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Add count record error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add count record",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/quarterly-count/[id]/records - Delete a record from the count
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get("recordId");

    if (!recordId) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    // Verify count exists and is in progress
    const [count] = await db
      .select()
      .from(schema.quarterlyCounts)
      .where(eq(schema.quarterlyCounts.id, id));

    if (!count) {
      return NextResponse.json({ error: "Count not found" }, { status: 404 });
    }

    if (count.status !== "in_progress") {
      return NextResponse.json(
        { error: "Cannot delete records from completed or cancelled count" },
        { status: 400 }
      );
    }

    // Verify record exists and belongs to this count
    const [record] = await db
      .select()
      .from(schema.quarterlyCountRecords)
      .where(
        and(
          eq(schema.quarterlyCountRecords.id, recordId),
          eq(schema.quarterlyCountRecords.countId, id)
        )
      );

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Delete the record
    await db
      .delete(schema.quarterlyCountRecords)
      .where(eq(schema.quarterlyCountRecords.id, recordId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete count record error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete count record",
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/quarterly-count/[id]/records - Update count records
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await req.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Records array is required" }, { status: 400 });
    }

    // Verify count exists and is in progress
    const [count] = await db
      .select()
      .from(schema.quarterlyCounts)
      .where(eq(schema.quarterlyCounts.id, id));

    if (!count) {
      return NextResponse.json({ error: "Count not found" }, { status: 404 });
    }

    if (count.status !== "in_progress") {
      return NextResponse.json(
        { error: "Cannot update records for completed or cancelled count" },
        { status: 400 }
      );
    }

    // Update each record
    const updated = [];
    for (const record of records) {
      const { recordId, countedQty, notes } = record;

      if (!recordId || countedQty === undefined || countedQty === null) {
        continue;
      }

      // Get the record to calculate variance
      const [existing] = await db
        .select()
        .from(schema.quarterlyCountRecords)
        .where(
          and(
            eq(schema.quarterlyCountRecords.id, recordId),
            eq(schema.quarterlyCountRecords.countId, id)
          )
        );

      if (!existing) {
        continue;
      }

      const variance = countedQty - existing.expectedQty;

      const [updatedRecord] = await db
        .update(schema.quarterlyCountRecords)
        .set({
          countedQty,
          variance,
          status: "counted",
          countedBy: user.id,
          countedAt: new Date(),
          notes: notes || null,
        })
        .where(eq(schema.quarterlyCountRecords.id, recordId))
        .returning();

      updated.push(updatedRecord);
    }

    return NextResponse.json({
      success: true,
      updated: updated.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update count records error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update count records",
      },
      { status: 500 }
    );
  }
}
