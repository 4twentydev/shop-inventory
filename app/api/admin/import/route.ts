import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";

interface ImportReport {
  parts: { created: number; updated: number; errors: string[] };
  locations: { created: number; updated: number; errors: string[] };
  inventory: { created: number; updated: number; errors: string[] };
}

const INVENTORY_SHEETS = [
  "Extrusion_Inventory",
  "ACM_Inventory",
  "SPL_inventory",
  "HPL_Inventory",
  "Rivet_Inventory",
  "Misc_Inventory",
];

// Helper to get value from row with flexible column naming
function getRowValue(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return String(row[key]).trim();
    }
  }
  return null;
}

function getNumericValue(row: Record<string, unknown>, ...keys: string[]): number | null {
  const val = getRowValue(row, ...keys);
  if (val === null) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

// Generate Part_ID for sheets without one
function generatePartId(sheetName: string, row: Record<string, unknown>): string | null {
  const job = getRowValue(row, "Job_Number", "job_number", "Job");
  const color = getRowValue(row, "Color", "color");
  const sizeW = getRowValue(row, "Size_W", "size_w", "Width");
  const sizeL = getRowValue(row, "Size_L", "size_l", "Length");
  const brand = getRowValue(row, "Brand", "brand");
  const pallet = getRowValue(row, "Pallet", "pallet");
  const name = getRowValue(row, "Name", "name");
  const category = getRowValue(row, "Category", "category");
  const size = getRowValue(row, "Size", "size");

  switch (sheetName) {
    case "ACM_Inventory": {
      // ACM-{Job}-{SizeWxSizeL}-{Brand}-{Color}
      const parts = ["ACM", job, sizeW && sizeL ? `${sizeW}x${sizeL}` : null, brand, color].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    case "SPL_inventory": {
      // SPL-{Job}-{SizeWxSizeL}-{Color}
      const parts = ["SPL", job, sizeW && sizeL ? `${sizeW}x${sizeL}` : null, color].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    case "HPL_Inventory": {
      // HPL-{Job}-{SizeWxSizeL}-{Color}
      const parts = ["HPL", job, sizeW && sizeL ? `${sizeW}x${sizeL}` : null, color].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    case "Rivet_Inventory": {
      // RIV-{Job}-{Color} or RIV-{Color} if no job
      const parts = ["RIV", job, color].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    case "Misc_Inventory": {
      // MISC-{Category}-{Name}-{Size}
      const parts = ["MISC", category, name, size].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    default:
      return null;
  }
}

// Extract part data from row based on sheet type
function extractPartData(sheetName: string, row: Record<string, unknown>) {
  const baseData = {
    color: getRowValue(row, "Color", "color"),
    jobNumber: getRowValue(row, "Job_Number", "job_number", "Job"),
    sizeW: getNumericValue(row, "Size_W", "size_w", "Width"),
    sizeL: getNumericValue(row, "Size_L", "size_l", "Length"),
    thickness: getNumericValue(row, "Thickness_mm", "thickness_mm", "Thickness"),
    brand: getRowValue(row, "Brand", "brand"),
    pallet: getRowValue(row, "Pallet", "pallet"),
    unit: getRowValue(row, "Unit", "unit"),
  };

  // Set category based on sheet name
  let category: string | null = null;
  let partName: string | null = null;

  switch (sheetName) {
    case "Extrusion_Inventory":
      category = getRowValue(row, "Category", "category") || "Extrusion";
      partName = getRowValue(row, "Part_Name", "part_name");
      break;
    case "ACM_Inventory":
      category = "ACM";
      partName = baseData.brand ? `${baseData.brand} ${baseData.color || ""}`.trim() : baseData.color;
      break;
    case "SPL_inventory":
      category = "SPL";
      partName = baseData.color || "SPL Panel";
      break;
    case "HPL_Inventory":
      category = "HPL";
      partName = baseData.color || "HPL Panel";
      break;
    case "Rivet_Inventory":
      category = "Rivet";
      partName = baseData.color ? `${baseData.color} Rivet` : "Rivet";
      break;
    case "Misc_Inventory":
      category = getRowValue(row, "Category", "category") || "Misc";
      partName = getRowValue(row, "Name", "name");
      // For Misc, Size field maps to a general size description
      const miscSize = getRowValue(row, "Size", "size");
      if (miscSize && !baseData.sizeW) {
        // Store misc size as text in brand field if no dimensions
        baseData.brand = miscSize;
      }
      break;
  }

  return { ...baseData, category, partName };
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const clearBeforeImport = formData.get("clearBeforeImport") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const report: ImportReport & { cleared?: boolean } = {
      parts: { created: 0, updated: 0, errors: [] },
      locations: { created: 0, updated: 0, errors: [] },
      inventory: { created: 0, updated: 0, errors: [] },
    };

    // Clear all existing data if requested (order matters due to FK constraints)
    if (clearBeforeImport) {
      await db.delete(schema.inventoryMoves);
      await db.delete(schema.inventory);
      await db.delete(schema.parts);
      await db.delete(schema.locations);
      report.cleared = true;
    }

    // Process Parts sheet
    if (workbook.SheetNames.includes("Parts")) {
      const partsSheet = workbook.Sheets["Parts"];
      const partsData = XLSX.utils.sheet_to_json<Record<string, unknown>>(partsSheet);

      for (const row of partsData) {
        try {
          const partId = String(row["Part_ID"] || row["part_id"] || "").trim();
          const partName = String(row["Part_Name"] || row["part_name"] || "").trim();
          const color = row["Color"] || row["color"];
          const category = row["Category"] || row["category"];

          if (!partId || !partName) {
            report.parts.errors.push(`Missing Part_ID or Part_Name in row`);
            continue;
          }

          // Check if part exists
          const existing = await db
            .select()
            .from(schema.parts)
            .where(eq(schema.parts.partId, partId))
            .limit(1);

          if (existing.length > 0) {
            // Update
            await db
              .update(schema.parts)
              .set({
                partName,
                color: color ? String(color) : null,
                category: category ? String(category) : null,
              })
              .where(eq(schema.parts.partId, partId));
            report.parts.updated++;
          } else {
            // Create
            await db.insert(schema.parts).values({
              partId,
              partName,
              color: color ? String(color) : null,
              category: category ? String(category) : null,
            });
            report.parts.created++;
          }
        } catch (err) {
          report.parts.errors.push(
            `Error processing part: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    // Process Locations sheet
    if (workbook.SheetNames.includes("Locations")) {
      const locationsSheet = workbook.Sheets["Locations"];
      const locationsData = XLSX.utils.sheet_to_json<Record<string, unknown>>(locationsSheet);

      for (const row of locationsData) {
        try {
          const locationId = String(row["Location_ID"] || row["location_id"] || "").trim();
          const type = row["Type"] || row["type"];
          const zone = row["Zone"] || row["zone"];

          if (!locationId) {
            report.locations.errors.push(`Missing Location_ID in row`);
            continue;
          }

          const existing = await db
            .select()
            .from(schema.locations)
            .where(eq(schema.locations.locationId, locationId))
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(schema.locations)
              .set({
                type: type ? String(type) : null,
                zone: zone ? String(zone) : null,
              })
              .where(eq(schema.locations.locationId, locationId));
            report.locations.updated++;
          } else {
            await db.insert(schema.locations).values({
              locationId,
              type: type ? String(type) : null,
              zone: zone ? String(zone) : null,
            });
            report.locations.created++;
          }
        } catch (err) {
          report.locations.errors.push(
            `Error processing location: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    // Process Inventory sheets
    for (const sheetName of INVENTORY_SHEETS) {
      if (!workbook.SheetNames.includes(sheetName)) continue;

      const inventorySheet = workbook.Sheets[sheetName];
      const inventoryData = XLSX.utils.sheet_to_json<Record<string, unknown>>(inventorySheet);

      for (const row of inventoryData) {
        try {
          // Get Part_ID - either from row or auto-generate
          let partIdStr = getRowValue(row, "Part_ID", "part_id");
          if (!partIdStr) {
            partIdStr = generatePartId(sheetName, row);
          }

          const locationIdStr = getRowValue(row, "Location_ID", "location_id");
          const quantity = getNumericValue(row, "Quantity", "quantity", "Qty") || 0;

          if (!partIdStr || !locationIdStr) {
            continue; // Skip rows without both IDs
          }

          // Extract all part data from row
          const partData = extractPartData(sheetName, row);
          const partName = partData.partName || partIdStr;

          // Look up part UUID
          let partResult = await db
            .select()
            .from(schema.parts)
            .where(eq(schema.parts.partId, partIdStr))
            .limit(1);

          // If part doesn't exist, create it with all extracted data
          if (partResult.length === 0) {
            await db.insert(schema.parts).values({
              partId: partIdStr,
              partName,
              color: partData.color,
              category: partData.category,
              jobNumber: partData.jobNumber,
              sizeW: partData.sizeW,
              sizeL: partData.sizeL,
              thickness: partData.thickness,
              brand: partData.brand,
              pallet: partData.pallet,
              unit: partData.unit,
            });
            report.parts.created++;

            partResult = await db
              .select()
              .from(schema.parts)
              .where(eq(schema.parts.partId, partIdStr))
              .limit(1);
          } else {
            // Update existing part with new data if fields are empty
            const existing = partResult[0];
            const updates: Partial<typeof partData & { partName: string }> = {};

            if (!existing.jobNumber && partData.jobNumber) updates.jobNumber = partData.jobNumber;
            if (!existing.sizeW && partData.sizeW) updates.sizeW = partData.sizeW;
            if (!existing.sizeL && partData.sizeL) updates.sizeL = partData.sizeL;
            if (!existing.thickness && partData.thickness) updates.thickness = partData.thickness;
            if (!existing.brand && partData.brand) updates.brand = partData.brand;
            if (!existing.pallet && partData.pallet) updates.pallet = partData.pallet;
            if (!existing.unit && partData.unit) updates.unit = partData.unit;
            if (!existing.category && partData.category) updates.category = partData.category;
            if (!existing.color && partData.color) updates.color = partData.color;

            if (Object.keys(updates).length > 0) {
              await db
                .update(schema.parts)
                .set(updates)
                .where(eq(schema.parts.partId, partIdStr));
              report.parts.updated++;
            }
          }

          // Look up location UUID
          let locationResult = await db
            .select()
            .from(schema.locations)
            .where(eq(schema.locations.locationId, locationIdStr))
            .limit(1);

          // If location doesn't exist, create it
          if (locationResult.length === 0) {
            await db.insert(schema.locations).values({
              locationId: locationIdStr,
              type: null,
              zone: null,
            });
            report.locations.created++;

            locationResult = await db
              .select()
              .from(schema.locations)
              .where(eq(schema.locations.locationId, locationIdStr))
              .limit(1);
          }

          if (partResult.length === 0 || locationResult.length === 0) {
            report.inventory.errors.push(
              `Could not find/create part "${partIdStr}" or location "${locationIdStr}"`
            );
            continue;
          }

          const partUuid = partResult[0].id;
          const locationUuid = locationResult[0].id;

          // Upsert inventory
          const existingInventory = await db
            .select()
            .from(schema.inventory)
            .where(
              and(
                eq(schema.inventory.partId, partUuid),
                eq(schema.inventory.locationId, locationUuid)
              )
            )
            .limit(1);

          if (existingInventory.length > 0) {
            await db
              .update(schema.inventory)
              .set({
                qty: Math.max(0, Math.round(quantity)),
                updatedAt: new Date(),
              })
              .where(eq(schema.inventory.id, existingInventory[0].id));
            report.inventory.updated++;
          } else {
            await db.insert(schema.inventory).values({
              partId: partUuid,
              locationId: locationUuid,
              qty: Math.max(0, Math.round(quantity)),
            });
            report.inventory.created++;
          }
        } catch (err) {
          report.inventory.errors.push(
            `Error in ${sheetName}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 }
    );
  }
}
