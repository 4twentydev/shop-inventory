import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireAdmin, hashPin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { name, pin, role, isActive } = body;

    // Build update object
    const updates: Partial<{
      name: string;
      pinHash: string;
      role: "admin" | "user";
      isActive: boolean;
    }> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (pin !== undefined && pin !== "") {
      if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json(
          { error: "PIN must be 4-6 digits" },
          { status: 400 }
        );
      }
      updates.pinHash = await hashPin(pin);
    }

    if (role !== undefined) {
      if (!["admin", "user"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updates.role = role;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const result = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, id))
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        role: schema.users.role,
        isActive: schema.users.isActive,
        createdAt: schema.users.createdAt,
      });

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
