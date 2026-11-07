import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const courseId = Number(body.courseId);
    const chapterId = Number(body.chapterId);
    const code = String(body.code || "").trim();
    const title = String(body.title || "").trim();
    const page = Math.max(1, Number(body.page || 1));

    if (!courseId || !chapterId || !code || !title) {
      return NextResponse.json(
        { error: "يرجى إدخال رمز الدرس وعنوانه" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(lessons)
      .values({
        courseId,
        chapterId,
        code,
        title,
        page,
      })
      .returning();

    return NextResponse.json({ lesson: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/lessons error:", error);
    return NextResponse.json({ error: "تعذر إضافة الدرس" }, { status: 500 });
  }
}
