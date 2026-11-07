import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const questionId = Number(id);
    if (!questionId) {
      return NextResponse.json({ error: "معرف السؤال غير صالح" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Partial<typeof questions.$inferInsert> = {};

    if (body.courseId) updates.courseId = Number(body.courseId);
    if (body.chapterId) updates.chapterId = Number(body.chapterId);
    if (body.lessonId) updates.lessonId = Number(body.lessonId);
    if (typeof body.questionText === "string" && body.questionText.trim()) {
      updates.questionText = body.questionText.trim();
    }
    if (body.equation !== undefined) {
      updates.equation = body.equation ? String(body.equation).trim() : null;
    }
    if (Array.isArray(body.options) && body.options.length === 4) {
      updates.options = body.options.map((o: unknown) => String(o || "").trim());
    }
    if (
      typeof body.correctAnswer === "string" &&
      ["A", "B", "C", "D"].includes(body.correctAnswer.toUpperCase())
    ) {
      updates.correctAnswer = body.correctAnswer.toUpperCase();
    }
    if (typeof body.explanation === "string" && body.explanation.trim()) {
      updates.explanation = body.explanation.trim();
    }
    if (body.note !== undefined) {
      updates.note = body.note ? String(body.note).trim() : null;
    }
    if (body.sourceType === "T" || body.sourceType === "D") {
      updates.sourceType = body.sourceType;
    }

    const [updated] = await db
      .update(questions)
      .set(updates)
      .where(eq(questions.id, questionId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
    }

    return NextResponse.json({ question: updated });
  } catch (error) {
    console.error("PATCH /api/questions/[id] error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تعديل السؤال" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const questionId = Number(id);
    if (!questionId) {
      return NextResponse.json({ error: "معرف السؤال غير صالح" }, { status: 400 });
    }

    await db.delete(questions).where(eq(questions.id, questionId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/questions/[id] error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف السؤال" },
      { status: 500 }
    );
  }
}
