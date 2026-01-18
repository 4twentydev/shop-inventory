import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import * as XLSX from "xlsx";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

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
  const name = getRowValue(row, "Name", "name");
  const category = getRowValue(row, "Category", "category");
  const size = getRowValue(row, "Size", "size");

  switch (sheetName) {
    case "ACM_Inventory": {
      const parts = ["ACM", job, sizeW && sizeL ? `${sizeW}x${sizeL}` : null, brand, color].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    case "SPL_inventory": {
      const parts = ["SPL", job, sizeW && sizeL ? `${sizeW}x${sizeL}` : null, color].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    case "HPL_Inventory": {
      const parts = ["HPL", job, sizeW && sizeL ? `${sizeW}x${sizeL}` : null, color].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    case "Rivet_Inventory": {
      const parts = ["RIV", job, color].filter(Boolean);
      return parts.length >= 2 ? parts.join("-") : null;
    }
    case "Misc_Inventory": {
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
      const miscSize = getRowValue(row, "Size", "size");
      if (miscSize && !baseData.sizeW) {
        baseData.brand = miscSize;
      }
      break;
  }

  return { ...baseData, category, partName };
}

async function importExcel(filePath: string) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log(`Reading Excel file: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  console.log(`Found sheets: ${workbook.SheetNames.join(", ")}\n`);

  const report = {
    parts: { created: 0, updated: 0, errors: [] as string[] },
    locations: { created: 0, updated: 0, errors: [] as string[] },
    inventory: { created: 0, updated: 0, errors: [] as string[] },
  };

  // Process Parts sheet
  if (workbook.SheetNames.includes("Parts")) {
    console.log("Processing Parts sheet...");
    const partsSheet = workbook.Sheets["Parts"];
    const partsData = XLSX.utils.sheet_to_json<Record<string, unknown>>(partsSheet);

    for (const row of partsData) {
      try {
        const partId = String(row["Part_ID"] || row["part_id"] || "").trim();
        const partName = String(row["Part_Name"] || row["part_name"] || "").trim();
        const color = row["Color"] || row["color"];
        const category = row["Category"] || row["category"];

        if (!partId || !partName) continue;

        const existing = await db
          .select()
          .from(schema.parts)
          .where(eq(schema.parts.partId, partId))
          .limit(1);

        if (existing.length > 0) {
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
          await db.insert(schema.parts).values({
            partId,
            partName,
            color: color ? String(color) : null,
            category: category ? String(category) : null,
          });
          report.parts.created++;
        }
      } catch (err) {
        report.parts.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    console.log(`  Parts: ${report.parts.created} created, ${report.parts.updated} updated`);
  }

  // Process Locations sheet
  if (workbook.SheetNames.includes("Locations")) {
    console.log("Processing Locations sheet...");
    const locationsSheet = workbook.Sheets["Locations"];
    const locationsData = XLSX.utils.sheet_to_json<Record<string, unknown>>(locationsSheet);

    for (const row of locationsData) {
      try {
        const locationId = String(row["Location_ID"] || row["location_id"] || "").trim();
        const type = row["Type"] || row["type"];
        const zone = row["Zone"] || row["zone"];

        if (!locationId) continue;

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
        report.locations.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    console.log(`  Locations: ${report.locations.created} created, ${report.locations.updated} updated`);
  }

  // Process Inventory sheets
  for (const sheetName of INVENTORY_SHEETS) {
    if (!workbook.SheetNames.includes(sheetName)) continue;

    console.log(`Processing ${sheetName}...`);
    const inventorySheet = workbook.Sheets[sheetName];
    const inventoryData = XLSX.utils.sheet_to_json<Record<string, unknown>>(inventorySheet);
    let sheetCreated = 0, sheetUpdated = 0;

    for (const row of inventoryData) {
      try {
        let partIdStr = getRowValue(row, "Part_ID", "part_id");
        if (!partIdStr) {
          partIdStr = generatePartId(sheetName, row);
        }

        const locationIdStr = getRowValue(row, "Location_ID", "location_id");
        const quantity = getNumericValue(row, "Quantity", "quantity", "Qty") || 0;

        if (!partIdStr || !locationIdStr) continue;

        const partData = extractPartData(sheetName, row);
        const partName = partData.partName || partIdStr;

        // Find or create part
        let partResult = await db
          .select()
          .from(schema.parts)
          .where(eq(schema.parts.partId, partIdStr))
          .limit(1);

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
        }

        // Find or create location
        let locationResult = await db
          .select()
          .from(schema.locations)
          .where(eq(schema.locations.locationId, locationIdStr))
          .limit(1);

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

        if (partResult.length === 0 || locationResult.length === 0) continue;

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
          sheetUpdated++;
        } else {
          await db.insert(schema.inventory).values({
            partId: partUuid,
            locationId: locationUuid,
            qty: Math.max(0, Math.round(quantity)),
          });
          report.inventory.created++;
          sheetCreated++;
        }
      } catch (err) {
        report.inventory.errors.push(`${sheetName}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log(`  ${sheetName}: ${sheetCreated} created, ${sheetUpdated} updated`);
  }

  console.log("\n=== Import Summary ===");
  console.log(`Parts: ${report.parts.created} created, ${report.parts.updated} updated`);
  console.log(`Locations: ${report.locations.created} created, ${report.locations.updated} updated`);
  console.log(`Inventory: ${report.inventory.created} created, ${report.inventory.updated} updated`);

  if (report.parts.errors.length > 0) {
    console.log(`\nPart errors (${report.parts.errors.length}):`);
    report.parts.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
  }
  if (report.inventory.errors.length > 0) {
    console.log(`\nInventory errors (${report.inventory.errors.length}):`);
    report.inventory.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
  }
}

// Get file path from command line or use default
const filePath = process.argv[2] || "data/Elward count inventory v1.16.26.xlsx";
importExcel(filePath);
