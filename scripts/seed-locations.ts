import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../drizzle/schema";

const SAMPLE_LOCATIONS = [
  // Warehouse Zone A - Shelving
  { locationId: "A1", type: "Shelf", zone: "Warehouse A" },
  { locationId: "A2", type: "Shelf", zone: "Warehouse A" },
  { locationId: "A3", type: "Shelf", zone: "Warehouse A" },
  { locationId: "A4", type: "Shelf", zone: "Warehouse A" },
  // Warehouse Zone B - Racks
  { locationId: "B1", type: "Rack", zone: "Warehouse B" },
  { locationId: "B2", type: "Rack", zone: "Warehouse B" },
  { locationId: "B3", type: "Rack", zone: "Warehouse B" },
  { locationId: "B4", type: "Rack", zone: "Warehouse B" },
  // Warehouse Zone C - Pallets
  { locationId: "C1", type: "Pallet", zone: "Warehouse C" },
  { locationId: "C2", type: "Pallet", zone: "Warehouse C" },
  { locationId: "C3", type: "Pallet", zone: "Warehouse C" },
  { locationId: "C4", type: "Pallet", zone: "Warehouse C" },
  // Receiving/Shipping
  { locationId: "REC-1", type: "Staging", zone: "Receiving" },
  { locationId: "REC-2", type: "Staging", zone: "Receiving" },
  { locationId: "SHIP-1", type: "Staging", zone: "Shipping" },
  { locationId: "SHIP-2", type: "Staging", zone: "Shipping" },
  // Shop Floor
  { locationId: "SHOP-1", type: "Workstation", zone: "Shop Floor" },
  { locationId: "SHOP-2", type: "Workstation", zone: "Shop Floor" },
  { locationId: "SHOP-3", type: "Workstation", zone: "Shop Floor" },
];

async function seedLocations() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log("Seeding locations...");

  try {
    // Check existing locations
    const existing = await db.select().from(schema.locations);
    const existingIds = new Set(existing.map((l) => l.locationId));

    // Filter out locations that already exist
    const newLocations = SAMPLE_LOCATIONS.filter(
      (loc) => !existingIds.has(loc.locationId)
    );

    if (newLocations.length === 0) {
      console.log("All sample locations already exist.");
      console.log(`  Total locations: ${existing.length}`);
      return;
    }

    // Insert new locations
    const result = await db
      .insert(schema.locations)
      .values(newLocations)
      .returning();

    console.log(`Successfully seeded ${result.length} locations!`);
    result.forEach((loc) => {
      console.log(`  ${loc.locationId} (${loc.type} - ${loc.zone})`);
    });

    if (existingIds.size > 0) {
      console.log(`  Skipped ${existingIds.size} existing locations.`);
    }
  } catch (error) {
    console.error("Failed to seed locations:", error);
    process.exit(1);
  }
}

seedLocations();
