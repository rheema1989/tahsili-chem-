import { NextResponse } from "next/server";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const courseId = Number(body.courseId);
    const title = String(body.title || "").trim();
    const page = Math.max(1, Number(body.page || 1));

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "يرجى تحديد المقرر وعنوان الفصل" },
        { status: 400 }
      );
    }

    const [{ maxNum }] = await db
      .select({
        maxNum: sql<number>`coalesce(max(${chapters.num}), 0)::int`,
      })
      .from(chapters)
      .where(eq(chapters.courseId, courseId));

    const num = body.num ? Number(body.num) : maxNum + 1;

    const [created] = await db
      .insert(chapters)
      .values({
        courseId,
        num,
        title,
        page,
      })
      .returning();

    return NextResponse.json({ chapter: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chapters error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة الفصل" },
      { status: 500 }
    );
  }
}
