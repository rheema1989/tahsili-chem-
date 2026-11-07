import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Partial<typeof users.$inferInsert> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim().slice(0, 60);
    }
    if (typeof body.xp === "number" && body.xp >= 0) {
      updates.xp = Math.max(current.xp, Math.floor(body.xp));
    }
    if (typeof body.streakDays === "number" && body.streakDays >= 0) {
      updates.streakDays = Math.floor(body.streakDays);
    }
    if (typeof body.lastPracticeDate === "string") {
      updates.lastPracticeDate = body.lastPracticeDate;
    }
    if (Array.isArray(body.badges)) {
      const merged = Array.from(new Set([...(current.badges || []), ...body.badges]));
      updates.badges = merged;
    }
    if (body.bestScores && typeof body.bestScores === "object") {
      const mergedScores: Record<string, number> = { ...(current.bestScores || {}) };
      for (const [k, v] of Object.entries(body.bestScores)) {
        if (typeof v === "number") {
          mergedScores[k] = Math.max(mergedScores[k] ?? 0, v);
        }
      }
      updates.bestScores = mergedScores;
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, current.id))
      .returning();

    const { passwordHash: _ignored, ...safeUser } = updated;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json({ error: "تعذر تحديث الملف الشخصي" }, { status: 500 });
  }
}
