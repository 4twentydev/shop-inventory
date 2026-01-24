import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch all parts
    const parts = await db.select().from(schema.parts);

    // Fetch all locations
    const locations = await db.select().from(schema.locations);

    // Fetch all inventory with joins
    const inventoryData = await db
      .select({
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
        locationId: schema.locations.locationId,
        locationType: schema.locations.type,
        locationZone: schema.locations.zone,
        quantity: schema.inventory.qty,
      })
      .from(schema.inventory)
      .innerJoin(schema.parts, eq(schema.inventory.partId, schema.parts.id))
      .innerJoin(schema.locations, eq(schema.inventory.locationId, schema.locations.id));

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add Parts sheet
    const partsSheetData = parts.map((part) => ({
      Part_ID: part.partId,
      Part_Name: part.partName,
      Color: part.color || "",
      Category: part.category || "",
      Job_Number: part.jobNumber || "",
      Size_W: part.sizeW || "",
      Size_L: part.sizeL || "",
      Thickness_mm: part.thickness || "",
      Brand: part.brand || "",
      Pallet: part.pallet || "",
      Unit: part.unit || "",
    }));
    const partsSheet = XLSX.utils.json_to_sheet(partsSheetData);
    XLSX.utils.book_append_sheet(workbook, partsSheet, "Parts");

    // Add Locations sheet
    const locationsSheetData = locations.map((location) => ({
      Location_ID: location.locationId,
      Type: location.type || "",
      Zone: location.zone || "",
    }));
    const locationsSheet = XLSX.utils.json_to_sheet(locationsSheetData);
    XLSX.utils.book_append_sheet(workbook, locationsSheet, "Locations");

    // Add Inventory sheet
    const inventorySheetData = inventoryData.map((item) => ({
      Part_ID: item.partId,
      Part_Name: item.partName,
      Color: item.color || "",
      Category: item.category || "",
      Job_Number: item.jobNumber || "",
      Size_W: item.sizeW || "",
      Size_L: item.sizeL || "",
      Thickness_mm: item.thickness || "",
      Brand: item.brand || "",
      Pallet: item.pallet || "",
      Unit: item.unit || "",
      Location_ID: item.locationId,
      Location_Type: item.locationType || "",
      Location_Zone: item.locationZone || "",
      Quantity: item.quantity,
    }));
    const inventorySheet = XLSX.utils.json_to_sheet(inventorySheetData);
    XLSX.utils.book_append_sheet(workbook, inventorySheet, "Inventory");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventory-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Export error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 }
    );
  }
}
