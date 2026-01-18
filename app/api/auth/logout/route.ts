import { NextResponse } from "next/server";
import { getSessionToken, clearSessionCookie, deleteSession } from "@/lib/auth";

export async function POST() {
  try {
    const token = await getSessionToken();

    if (token) {
      await deleteSession(token);
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear cookie even if DB deletion fails
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
