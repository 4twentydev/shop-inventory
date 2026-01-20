import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

interface ReceivingItem {
  partId: string;
  partName: string;
  category: string;
  locationId: string;
  quantity: number;
  color?: string;
  jobNumber?: string;
  sizeW?: number;
  sizeL?: number;
  thickness?: number;
  brand?: string;
  unit?: string;
  pallet?: string;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const { items } = body as { items: ReceivingItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        // Validate required fields
        if (!item.partId?.trim()) {
          errors.push(`Missing Part ID for item`);
          continue;
        }
        if (!item.partName?.trim()) {
          errors.push(`Missing Part Name for ${item.partId}`);
          continue;
        }
        if (!item.locationId?.trim()) {
          errors.push(`Missing Location for ${item.partId}`);
          continue;
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Invalid quantity for ${item.partId}`);
          continue;
        }

        // Find or create location
        let locationResult = await db
          .select()
          .from(schema.locations)
          .where(eq(schema.locations.locationId, item.locationId.trim()))
          .limit(1);

        let locationUuid: string;

        if (locationResult.length === 0) {
          // Create location
          const newLocation = await db
            .insert(schema.locations)
            .values({
              locationId: item.locationId.trim(),
              type: item.category,
              zone: null,
            })
            .returning();
          locationUuid = newLocation[0].id;
        } else {
          locationUuid = locationResult[0].id;
        }

        // Find or create part
        let partResult = await db
          .select()
          .from(schema.parts)
          .where(eq(schema.parts.partId, item.partId.trim()))
          .limit(1);

        let partUuid: string;

        if (partResult.length === 0) {
          // Create new part with all fields
          const newPart = await db
            .insert(schema.parts)
            .values({
              partId: item.partId.trim(),
              partName: item.partName.trim(),
              category: item.category || null,
              color: item.color?.trim() || null,
              jobNumber: item.jobNumber?.trim() || null,
              sizeW: item.sizeW || null,
              sizeL: item.sizeL || null,
              thickness: item.thickness || null,
              brand: item.brand?.trim() || null,
              unit: item.unit?.trim() || null,
              pallet: item.pallet?.trim() || null,
            })
            .returning();

          partUuid = newPart[0].id;
          created++;
        } else {
          partUuid = partResult[0].id;
        }

        // Get or create inventory record
        let inventoryResult = await db
          .select()
          .from(schema.inventory)
          .where(
            and(
              eq(schema.inventory.partId, partUuid),
              eq(schema.inventory.locationId, locationUuid)
            )
          )
          .limit(1);

        if (inventoryResult.length === 0) {
          // Create new inventory record
          await db.insert(schema.inventory).values({
            partId: partUuid,
            locationId: locationUuid,
            qty: item.quantity,
          });
        } else {
          // Update existing inventory
          await db
            .update(schema.inventory)
            .set({
              qty: inventoryResult[0].qty + item.quantity,
              updatedAt: new Date(),
            })
            .where(eq(schema.inventory.id, inventoryResult[0].id));
        }

        // Create move record for audit trail
        await db.insert(schema.inventoryMoves).values({
          userId: admin.id,
          partId: partUuid,
          locationId: locationUuid,
          deltaQty: item.quantity,
          reason: "Receiving",
          note: `Received ${item.quantity} units of ${item.partId}`,
        });

        updated++;
      } catch (itemError) {
        errors.push(
          `Error processing ${item.partId}: ${itemError instanceof Error ? itemError.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Receiving error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process receiving" },
      { status: 500 }
    );
  }
}
