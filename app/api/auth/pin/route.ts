import { NextResponse } from "next/server";
import { authenticateByPin, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "PIN is required" },
        { status: 400 }
      );
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be 4-6 digits" },
        { status: 400 }
      );
    }

    const result = await authenticateByPin(pin);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 }
      );
    }

    await setSessionCookie(result.token);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
      },
    });
  } catch (error) {
    console.error("PIN auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
