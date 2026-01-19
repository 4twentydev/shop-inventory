import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sql, eq, not, exists } from "drizzle-orm";

export async function POST() {
  try {
    const user = await requireAdmin();

    // Get all unread notification IDs for this user
    const unreadNotifications = await db
      .select({ id: schema.adminNotifications.id })
      .from(schema.adminNotifications)
      .where(
        not(
          exists(
            db
              .select()
              .from(schema.adminNotificationReads)
              .where(
                sql`${schema.adminNotificationReads.notificationId} = ${schema.adminNotifications.id} AND ${schema.adminNotificationReads.userId} = ${user.id}`
              )
          )
        )
      );

    if (unreadNotifications.length === 0) {
      return NextResponse.json({ marked: 0 });
    }

    // Insert read records for all unread notifications
    const readRecords = unreadNotifications.map((n) => ({
      notificationId: n.id,
      userId: user.id,
    }));

    await db.insert(schema.adminNotificationReads).values(readRecords);

    return NextResponse.json({ marked: readRecords.length });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Mark read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
