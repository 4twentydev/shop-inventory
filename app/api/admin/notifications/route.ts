import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireAdmin();

    // Fetch notifications with read status for current user
    const notifications = await db
      .select({
        id: schema.adminNotifications.id,
        type: schema.adminNotifications.type,
        title: schema.adminNotifications.title,
        summary: schema.adminNotifications.summary,
        date: schema.adminNotifications.date,
        emailSentAt: schema.adminNotifications.emailSentAt,
        createdAt: schema.adminNotifications.createdAt,
        readAt: schema.adminNotificationReads.readAt,
      })
      .from(schema.adminNotifications)
      .leftJoin(
        schema.adminNotificationReads,
        sql`${schema.adminNotificationReads.notificationId} = ${schema.adminNotifications.id} AND ${schema.adminNotificationReads.userId} = ${user.id}`
      )
      .orderBy(desc(schema.adminNotifications.createdAt))
      .limit(50);

    // Count unread
    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        summary: n.summary,
        date: n.date,
        emailSentAt: n.emailSentAt,
        createdAt: n.createdAt,
        isRead: !!n.readAt,
        readAt: n.readAt,
      })),
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Fetch notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
