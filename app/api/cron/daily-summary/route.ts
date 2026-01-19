import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lt } from "drizzle-orm";
import {
  generateDailySummaryEmail,
  generateNoActivityEmail,
} from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get timezone from env or default to America/New_York
    const timezone = process.env.NOTIFICATION_TIMEZONE || "America/New_York";

    // Calculate today's date range in the configured timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(now);

    // Create start and end of day in the configured timezone
    const startOfDay = new Date(`${todayStr}T00:00:00`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999`);

    // Adjust for timezone offset to get UTC times
    const tzOffset = getTimezoneOffset(timezone, startOfDay);
    const startUTC = new Date(startOfDay.getTime() + tzOffset);
    const endUTC = new Date(endOfDay.getTime() + tzOffset);

    // Fetch all moves for today with related data
    const moves = await db
      .select({
        id: schema.inventoryMoves.id,
        ts: schema.inventoryMoves.ts,
        deltaQty: schema.inventoryMoves.deltaQty,
        reason: schema.inventoryMoves.reason,
        note: schema.inventoryMoves.note,
        userName: schema.users.name,
        partId: schema.parts.partId,
        partName: schema.parts.partName,
        locationId: schema.locations.locationId,
      })
      .from(schema.inventoryMoves)
      .innerJoin(schema.users, eq(schema.inventoryMoves.userId, schema.users.id))
      .innerJoin(schema.parts, eq(schema.inventoryMoves.partId, schema.parts.id))
      .innerJoin(
        schema.locations,
        eq(schema.inventoryMoves.locationId, schema.locations.id)
      )
      .where(
        and(
          gte(schema.inventoryMoves.ts, startUTC),
          lt(schema.inventoryMoves.ts, endUTC)
        )
      )
      .orderBy(schema.inventoryMoves.ts);

    // Calculate totals
    const totalPulls = moves.filter((m) => m.deltaQty < 0).length;
    const totalReturns = moves.filter((m) => m.deltaQty > 0).length;

    // Format date for display
    const displayDate = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now);

    // Generate summary text for notification
    const summary =
      moves.length > 0
        ? `${moves.length} moves: ${totalPulls} pulls, ${totalReturns} returns`
        : "No inventory activity today";

    // Create notification record
    const moveData = moves.map((m) => ({
      userName: m.userName,
      partId: m.partId,
      partName: m.partName,
      locationId: m.locationId,
      deltaQty: m.deltaQty,
      reason: m.reason,
      note: m.note,
      ts: m.ts.toISOString(),
    }));

    const [notification] = await db
      .insert(schema.adminNotifications)
      .values({
        type: "daily_summary",
        title: `Daily Summary - ${displayDate}`,
        summary,
        data: JSON.stringify(moveData),
        date: startUTC,
      })
      .returning();

    // Get admin emails
    const admins = await db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.role, "admin"),
          eq(schema.users.isActive, true)
        )
      );

    // Build recipient list
    const extraEmails = process.env.NOTIFICATION_EXTRA_EMAILS?.split(",")
      .map((e) => e.trim())
      .filter(Boolean) || [];

    // For Resend, we need actual email addresses
    // Since users don't have emails stored, we'll just use the extra emails
    const recipients = [...extraEmails];

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        notificationId: notification.id,
        moves: moves.length,
        emailsSent: 0,
        message: "Notification created but no email recipients configured",
      });
    }

    // Generate email HTML
    const emailHtml =
      moves.length > 0
        ? generateDailySummaryEmail(displayDate, moveData, totalPulls, totalReturns)
        : generateNoActivityEmail(displayDate);

    // Send email
    const { data, error } = await resend.emails.send({
      from: "Shop Inventory <notifications@resend.dev>",
      to: recipients,
      subject: `Daily Inventory Summary - ${displayDate}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Failed to send email:", error);
      return NextResponse.json({
        success: true,
        notificationId: notification.id,
        moves: moves.length,
        emailError: error.message,
      });
    }

    // Update notification with email sent timestamp
    await db
      .update(schema.adminNotifications)
      .set({ emailSentAt: new Date() })
      .where(eq(schema.adminNotifications.id, notification.id));

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      moves: moves.length,
      emailsSent: recipients.length,
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get timezone offset in milliseconds
function getTimezoneOffset(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return utcDate.getTime() - tzDate.getTime();
}
