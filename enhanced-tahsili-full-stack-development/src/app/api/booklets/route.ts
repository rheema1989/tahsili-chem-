import { NextResponse } from "next/server";
import { db } from "@/db";
import { booklets } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const list = await db.select().from(booklets).orderBy(asc(booklets.id));
    return NextResponse.json({ booklets: list });
  } catch (error) {
    console.error("GET /api/booklets error:", error);
    return NextResponse.json({ error: "تعذر تحميل الكتيبات" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const key = String(body.key || `b-${Date.now()}`).trim();
    const courseSlug = String(body.courseSlug || "k1").trim();
    const numberLabel = String(body.numberLabel || "1").trim();
    const title = String(body.title || "").trim();
    const courseTitle = String(body.courseTitle || "الكيمياء 1").trim();
    const description = String(
      body.description || "تدريبات تحصيلية شاملة من إعداد أ. عبدالرحيم الحجاب"
    ).trim();
    const pagesCount = Math.max(1, Number(body.pagesCount || 20));
    const questionsCount = Math.max(1, Number(body.questionsCount || 100));

    if (!title) {
      return NextResponse.json(
        { error: "يرجى إدخال عنوان الكتيب" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(booklets)
      .values({
        key,
        courseSlug,
        numberLabel,
        title,
        courseTitle,
        description,
        pagesCount,
        questionsCount,
        teacherName: "إعداد المعلم: أ. عبدالرحيم الحجاب",
      })
      .returning();

    return NextResponse.json({ booklet: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/booklets error:", error);
    return NextResponse.json({ error: "تعذر إضافة الكتيب" }, { status: 500 });
  }
}
