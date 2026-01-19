import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;

    // Fetch the notification
    const [notification] = await db
      .select()
      .from(schema.adminNotifications)
      .where(eq(schema.adminNotifications.id, id))
      .limit(1);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Mark as read if not already
    const [existingRead] = await db
      .select()
      .from(schema.adminNotificationReads)
      .where(
        and(
          eq(schema.adminNotificationReads.notificationId, id),
          eq(schema.adminNotificationReads.userId, user.id)
        )
      )
      .limit(1);

    if (!existingRead) {
      await db.insert(schema.adminNotificationReads).values({
        notificationId: id,
        userId: user.id,
      });
    }

    // Parse the JSON data
    let data = [];
    try {
      data = JSON.parse(notification.data);
    } catch {
      // Data parsing failed, return empty array
    }

    return NextResponse.json({
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        summary: notification.summary,
        date: notification.date,
        emailSentAt: notification.emailSentAt,
        createdAt: notification.createdAt,
        data,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Fetch notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
