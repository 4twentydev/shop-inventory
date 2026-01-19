import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { config } from "dotenv";
import path from "path";

// Load .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

async function seedDestinations() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  const destinations = [
    { locationId: "SHIPPING", type: "Destination", zone: "Shipping" },
    { locationId: "CNC-1", type: "Destination", zone: "CNC" },
    { locationId: "CNC-2", type: "Destination", zone: "CNC" },
    { locationId: "CNC-3", type: "Destination", zone: "CNC" },
    { locationId: "ELU-1", type: "Destination", zone: "ELU" },
    { locationId: "ELU-2", type: "Destination", zone: "ELU" },
    { locationId: "HOLDING", type: "Destination", zone: "Holding" },
  ];

  console.log("Seeding destination locations...");

  try {
    for (const dest of destinations) {
      // Check if location already exists
      const existing = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.locationId, dest.locationId))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  Location ${dest.locationId} already exists, skipping.`);
        continue;
      }

      // Create location
      await db.insert(schema.locations).values(dest);
      console.log(`  ✓ Created location: ${dest.locationId} (${dest.zone})`);
    }

    console.log("\nDestination locations seeded successfully!");
  } catch (error) {
    console.error("Failed to seed destinations:", error);
    process.exit(1);
  }
}

seedDestinations();
