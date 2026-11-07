import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import { createSession, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" },
        { status: 400 }
      );
    }

    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!found.length || !verifyPassword(password, found[0].passwordHash)) {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const user = found[0];
    const token = await createSession(user.id);
    const { passwordHash: _ignored, ...safeUser } = user;

    const response = NextResponse.json({ user: safeUser });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}
