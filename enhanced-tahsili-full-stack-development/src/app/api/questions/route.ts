import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions, courses, chapters, lessons } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const courseSlug = searchParams.get("courseSlug");
    const chapterId = searchParams.get("chapterId");
    const lessonId = searchParams.get("lessonId");
    const sourceType = searchParams.get("sourceType");
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") || 20)));

    const conditions = [];

    if (courseSlug && courseSlug !== "all") {
      const foundCourse = await db
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.slug, courseSlug))
        .limit(1);
      if (foundCourse.length > 0) {
        conditions.push(eq(questions.courseId, foundCourse[0].id));
      }
    }

    if (chapterId && chapterId !== "all") {
      conditions.push(eq(questions.chapterId, Number(chapterId)));
    }

    if (lessonId && lessonId !== "all") {
      conditions.push(eq(questions.lessonId, Number(lessonId)));
    }

    if (sourceType && (sourceType === "T" || sourceType === "D")) {
      conditions.push(eq(questions.sourceType, sourceType));
    }

    if (search) {
      conditions.push(
        or(
          ilike(questions.questionText, `%${search}%`),
          ilike(questions.explanation, `%${search}%`),
          ilike(questions.equation, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(questions)
      .where(whereClause);

    const rows = await db
      .select({
        question: questions,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        chapterNum: chapters.num,
        chapterTitle: chapters.title,
        lessonCode: lessons.code,
        lessonTitle: lessons.title,
      })
      .from(questions)
      .innerJoin(courses, eq(questions.courseId, courses.id))
      .innerJoin(chapters, eq(questions.chapterId, chapters.id))
      .innerJoin(lessons, eq(questions.lessonId, lessons.id))
      .where(whereClause)
      .orderBy(desc(questions.id), asc(questions.questionNumber))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows.map((r) => ({
      ...r.question,
      courseTitle: r.courseTitle,
      courseSlug: r.courseSlug,
      chapterNum: r.chapterNum,
      chapterTitle: r.chapterTitle,
      lessonCode: r.lessonCode,
      lessonTitle: r.lessonTitle,
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("GET /api/questions error:", error);
    return NextResponse.json(
      { error: "تعذر تحميل بنك الأسئلة" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();

    const courseId = Number(body.courseId);
    const chapterId = Number(body.chapterId);
    const lessonId = Number(body.lessonId);
    const questionText = String(body.questionText || "").trim();
    const equation = body.equation ? String(body.equation).trim() : null;
    const options = Array.isArray(body.options)
      ? body.options.map((o: unknown) => String(o || "").trim())
      : [];
    const correctAnswer = String(body.correctAnswer || "A").toUpperCase();
    const explanation = String(body.explanation || "").trim();
    const note = body.note ? String(body.note).trim() : null;
    const sourceType = body.sourceType === "D" ? "D" : "T";

    if (
      !courseId ||
      !chapterId ||
      !lessonId ||
      !questionText ||
      options.length !== 4 ||
      options.some((o: string) => !o) ||
      !["A", "B", "C", "D"].includes(correctAnswer) ||
      !explanation
    ) {
      return NextResponse.json(
        { error: "يرجى إكمال جميع الحقول المطلوبة والخيارات الأربعة والتفسير" },
        { status: 400 }
      );
    }

    const [{ maxNum }] = await db
      .select({
        maxNum: sql<number>`coalesce(max(${questions.questionNumber}), 0)::int`,
      })
      .from(questions)
      .where(eq(questions.lessonId, lessonId));

    const [created] = await db
      .insert(questions)
      .values({
        courseId,
        chapterId,
        lessonId,
        questionNumber: maxNum + 1,
        questionText,
        equation,
        options,
        correctAnswer,
        explanation,
        note,
        sourceType,
      })
      .returning();

    return NextResponse.json({ question: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/questions error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة السؤال" },
      { status: 500 }
    );
  }
}
