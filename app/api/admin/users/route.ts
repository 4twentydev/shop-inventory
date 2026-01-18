import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin, hashPin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const users = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        role: schema.users.role,
        isActive: schema.users.isActive,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .orderBy(schema.users.name);

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to get users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, pin, role } = body;

    if (!name || !pin) {
      return NextResponse.json(
        { error: "Name and PIN are required" },
        { status: 400 }
      );
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be 4-6 digits" },
        { status: 400 }
      );
    }

    if (role && !["admin", "user"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const pinHash = await hashPin(pin);

    const result = await db
      .insert(schema.users)
      .values({
        name,
        pinHash,
        role: role || "user",
      })
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        role: schema.users.role,
        isActive: schema.users.isActive,
        createdAt: schema.users.createdAt,
      });

    return NextResponse.json({ user: result[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
