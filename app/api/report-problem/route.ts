import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAuth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { message } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #292524;">Problem Report</h2>
        <div style="background-color: #f5f5f4; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #78716c;">From:</p>
          <p style="margin: 0; font-weight: 600;">${user.name} (${user.role})</p>
        </div>
        <div style="background-color: #f5f5f4; padding: 16px; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #78716c;">Message:</p>
          <p style="margin: 0; white-space: pre-wrap;">${message.trim()}</p>
        </div>
        <p style="margin: 24px 0 0 0; font-size: 12px; color: #a8a29e;">
          Sent from Shop Inventory at ${new Date().toLocaleString()}
        </p>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: "Shop Inventory <notifications@resend.dev>",
      to: ["brandon@4twenty.dev"],
      subject: `Problem Report from ${user.name}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Failed to send problem report:", error);
      return NextResponse.json(
        { error: "Failed to send report" },
        { status: 500 }
      );
    }

    // Create admin notification
    await db.insert(schema.adminNotifications).values({
      type: "problem_report",
      title: `Problem Report from ${user.name}`,
      summary: message.trim().slice(0, 200) + (message.length > 200 ? "..." : ""),
      data: JSON.stringify({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        message: message.trim(),
        reportedAt: new Date().toISOString(),
      }),
      date: new Date(),
      emailSentAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Report problem error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
