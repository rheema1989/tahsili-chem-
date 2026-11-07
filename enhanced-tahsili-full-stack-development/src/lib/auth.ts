import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { eq, gt, and } from "drizzle-orm";

export const SESSION_COOKIE = "tahsili_session";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derived, "hex"));
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(sessions).values({
    token,
    userId,
    expiresAt,
  });
  return token;
}

export async function getCurrentUser(): Promise<Omit<User, "passwordHash"> | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const now = new Date();
    const found = await db
      .select({
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
      .limit(1);

    if (!found.length) return null;
    const { passwordHash: _ignored, ...safeUser } = found[0].user;
    return safeUser;
  } catch {
    return null;
  }
}
