import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

// GET /api/admin/quarterly-count/[id]/export?format=xlsx|csv
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";

    if (format !== "xlsx" && format !== "csv") {
      return NextResponse.json({ error: "Invalid format. Use xlsx or csv" }, { status: 400 });
    }

    // Get count details
    const [count] = await db
      .select()
      .from(schema.quarterlyCounts)
      .where(eq(schema.quarterlyCounts.id, id));

    if (!count) {
      return NextResponse.json({ error: "Count not found" }, { status: 404 });
    }

    // Get all count records with part and location details
    const records = await db
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
        expectedQty: schema.quarterlyCountRecords.expectedQty,
        countedQty: schema.quarterlyCountRecords.countedQty,
        variance: schema.quarterlyCountRecords.variance,
        status: schema.quarterlyCountRecords.status,
        notes: schema.quarterlyCountRecords.notes,
      })
      .from(schema.quarterlyCountRecords)
      .innerJoin(schema.parts, eq(schema.quarterlyCountRecords.partId, schema.parts.id))
      .innerJoin(
        schema.locations,
        eq(schema.quarterlyCountRecords.locationId, schema.locations.id)
      )
      .where(eq(schema.quarterlyCountRecords.countId, id));

    // Get all parts (for Parts sheet)
    const parts = await db.select().from(schema.parts);

    // Get all locations (for Locations sheet)
    const locations = await db.select().from(schema.locations);

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

    // Group records by category for inventory sheets (similar to import format)
    const recordsByCategory: Record<string, typeof records> = {
      Extrusion: [],
      ACM: [],
      SPL: [],
      HPL: [],
      Rivet: [],
      Misc: [],
    };

    for (const record of records) {
      const category = record.category || "Misc";
      if (recordsByCategory[category]) {
        recordsByCategory[category].push(record);
      } else {
        recordsByCategory.Misc.push(record);
      }
    }

    // Add inventory sheets for each category
    for (const [category, categoryRecords] of Object.entries(recordsByCategory)) {
      if (categoryRecords.length === 0) continue;

      const sheetData = categoryRecords.map((record) => ({
        Part_ID: record.partId,
        Part_Name: record.partName,
        Color: record.color || "",
        Job_Number: record.jobNumber || "",
        Size_W: record.sizeW || "",
        Size_L: record.sizeL || "",
        Thickness_mm: record.thickness || "",
        Brand: record.brand || "",
        Pallet: record.pallet || "",
        Unit: record.unit || "",
        Location_ID: record.locationId,
        Expected_Quantity: record.expectedQty,
        Counted_Quantity: record.countedQty ?? "",
        Variance: record.variance ?? "",
        Status: record.status,
        Notes: record.notes || "",
      }));

      const sheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, sheet, `${category}_Inventory`);
    }

    // Add Summary sheet
    const summaryData = [
      { Field: "Count Name", Value: count.name },
      { Field: "Description", Value: count.description || "" },
      { Field: "Status", Value: count.status },
      {
        Field: "Created At",
        Value: count.createdAt.toISOString().split("T")[0],
      },
      {
        Field: "Completed At",
        Value: count.completedAt ? count.completedAt.toISOString().split("T")[0] : "",
      },
      { Field: "Total Records", Value: records.length },
      {
        Field: "Counted",
        Value: records.filter((r) => r.status === "counted" || r.status === "verified").length,
      },
      {
        Field: "Pending",
        Value: records.filter((r) => r.status === "pending").length,
      },
      {
        Field: "Records with Variance",
        Value: records.filter((r) => r.variance !== 0).length,
      },
      {
        Field: "Total Variance",
        Value: records.reduce((sum, r) => sum + (r.variance || 0), 0),
      },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Generate file
    const filename = `quarterly-count-${count.name.replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().split("T")[0]}`;

    if (format === "csv") {
      // For CSV, export all inventory records in a single file
      const csvData = records.map((record) => ({
        Part_ID: record.partId,
        Part_Name: record.partName,
        Color: record.color || "",
        Category: record.category || "",
        Job_Number: record.jobNumber || "",
        Size_W: record.sizeW || "",
        Size_L: record.sizeL || "",
        Thickness_mm: record.thickness || "",
        Brand: record.brand || "",
        Pallet: record.pallet || "",
        Unit: record.unit || "",
        Location_ID: record.locationId,
        Location_Type: record.locationType || "",
        Location_Zone: record.locationZone || "",
        Expected_Quantity: record.expectedQty,
        Counted_Quantity: record.countedQty ?? "",
        Variance: record.variance ?? "",
        Status: record.status,
        Notes: record.notes || "",
      }));

      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(csvData));
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // Generate Excel buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Export count error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 }
    );
  }
}
