import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  // Default admin credentials - CHANGE THE PIN AFTER FIRST LOGIN
  const adminName = process.env.ADMIN_NAME || "Admin";
  const adminPin = process.env.ADMIN_PIN || "1234";

  if (!/^\d{4,6}$/.test(adminPin)) {
    console.error("ADMIN_PIN must be 4-6 digits");
    process.exit(1);
  }

  console.log("Seeding admin user...");

  try {
    // Hash the PIN
    const pinHash = await bcrypt.hash(adminPin, 10);

    // Check if admin already exists
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "admin"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Admin user already exists:", existing[0].name);
      console.log("Skipping seed.");
      return;
    }

    // Create admin user
    const result = await db
      .insert(schema.users)
      .values({
        name: adminName,
        pinHash,
        role: "admin",
        isActive: true,
      })
      .returning();

    console.log("Admin user created successfully!");
    console.log("  Name:", result[0].name);
    console.log("  Role:", result[0].role);
    console.log("  PIN:", adminPin, "(change this after first login!)");
  } catch (error) {
    console.error("Failed to seed admin:", error);
    process.exit(1);
  }
}

seedAdmin();
