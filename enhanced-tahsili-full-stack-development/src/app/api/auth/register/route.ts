import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import { createSession, hashPassword, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = body.role === "teacher" ? "teacher" : "student";

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        { error: "يرجى إدخال الاسم والبريد الإلكتروني وكلمة مرور (6 أحرف على الأقل)" },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجل مسبقًا" },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hashPassword(password),
        role,
        xp: 0,
        streakDays: 1,
        lastPracticeDate: new Date().toISOString().slice(0, 10),
        badges: [],
        bestScores: {},
      })
      .returning();

    const token = await createSession(created.id);
    const { passwordHash: _ignored, ...safeUser } = created;

    const response = NextResponse.json({ user: safeUser }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الحساب" },
      { status: 500 }
    );
  }
}
