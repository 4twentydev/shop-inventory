import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/drizzle/schema";

// Lazy initialization to avoid build-time errors
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb() {
   if (!_db) {
      if (!process.env.DATABASE_URL) {
         throw new Error("DATABASE_URL environment variable is not set");
      }
      const sql = neon(process.env.DATABASE_URL);
      _db = drizzle(sql, { schema });
   }
   return _db;
}

// Export a proxy that lazily initializes the db connection
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
   get(_, prop) {
      const database = getDb();
      const value = database[prop as keyof typeof database];
      if (typeof value === "function") {
         return value.bind(database);
      }
      return value;
   },
});

export { schema };
