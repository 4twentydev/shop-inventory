import { db, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "shop_session";
const SESSION_DURATION_HOURS = 12;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

  await db.insert(schema.sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function validateSession(token: string): Promise<{
  user: schema.User;
  session: schema.Session;
} | null> {
  const result = await db
    .select()
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.token, token),
        gt(schema.sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const { sessions: session, users: user } = result[0];

  if (!user.isActive) {
    return null;
  }

  return { user, session };
}

export async function getCurrentUser(): Promise<schema.User | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await validateSession(token);
  return session?.user ?? null;
}

export async function requireAuth(): Promise<schema.User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<schema.User> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
}

export async function authenticateByPin(
  pin: string
): Promise<{ user: schema.User; token: string } | null> {
  // Find all active users and check PIN
  const activeUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.isActive, true));

  for (const user of activeUsers) {
    const isValid = await verifyPin(pin, user.pinHash);
    if (isValid) {
      const token = await createSession(user.id);
      return { user, token };
    }
  }

  return null;
}
