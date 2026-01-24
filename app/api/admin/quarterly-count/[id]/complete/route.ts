import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// POST /api/admin/quarterly-count/[id]/complete - Complete a count and optionally apply adjustments
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
    const { applyAdjustments } = body;

    // Verify count exists and is in progress
    const [count] = await db
      .select()
      .from(schema.quarterlyCounts)
      .where(eq(schema.quarterlyCounts.id, id));

    if (!count) {
      return NextResponse.json({ error: "Count not found" }, { status: 404 });
    }

    if (count.status !== "in_progress") {
      return NextResponse.json({ error: "Count is not in progress" }, { status: 400 });
    }

    // Get all count records with variances
    const records = await db
      .select()
      .from(schema.quarterlyCountRecords)
      .where(eq(schema.quarterlyCountRecords.countId, id));

    // Check if all records have been counted
    const uncounted = records.filter((r) => r.status === "pending");
    if (uncounted.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot complete count: ${uncounted.length} records not yet counted`,
          uncounted: uncounted.length,
        },
        { status: 400 }
      );
    }

    // If applyAdjustments is true, update actual inventory and create move records
    if (applyAdjustments) {
      for (const record of records) {
        if (record.variance !== 0 && record.countedQty !== null) {
          // Update inventory quantity
          await db
            .update(schema.inventory)
            .set({
              qty: record.countedQty,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.inventory.partId, record.partId),
                eq(schema.inventory.locationId, record.locationId)
              )
            );

          // Create inventory move record for audit trail
          await db.insert(schema.inventoryMoves).values({
            userId: user.id,
            partId: record.partId,
            locationId: record.locationId,
            deltaQty: record.variance,
            reason: "Quarterly Count Adjustment",
            note: `Count: ${count.name}${record.notes ? ` - ${record.notes}` : ""}`,
          });
        }
      }
    }

    // Mark count as completed
    await db
      .update(schema.quarterlyCounts)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(schema.quarterlyCounts.id, id));

    // Calculate summary
    const totalVariance = records.reduce((sum, r) => sum + (r.variance || 0), 0);
    const recordsWithVariance = records.filter((r) => r.variance !== 0).length;

    return NextResponse.json({
      success: true,
      adjustmentsApplied: applyAdjustments,
      summary: {
        totalRecords: records.length,
        recordsWithVariance,
        totalVariance,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Complete count error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to complete count",
      },
      { status: 500 }
    );
  }
}
