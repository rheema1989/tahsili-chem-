import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const lessonId = Number(id);
    if (!lessonId) {
      return NextResponse.json({ error: "معرف الدرس غير صالح" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Partial<typeof lessons.$inferInsert> = {};
    if (typeof body.code === "string" && body.code.trim()) {
      updates.code = body.code.trim();
    }
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (body.page !== undefined) updates.page = Math.max(1, Number(body.page));

    const [updated] = await db
      .update(lessons)
      .set(updates)
      .where(eq(lessons.id, lessonId))
      .returning();

    return NextResponse.json({ lesson: updated });
  } catch (error) {
    console.error("PATCH /api/lessons/[id] error:", error);
    return NextResponse.json({ error: "تعذر تعديل الدرس" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const lessonId = Number(id);
    if (!lessonId) {
      return NextResponse.json({ error: "معرف الدرس غير صالح" }, { status: 400 });
    }
    await db.delete(lessons).where(eq(lessons.id, lessonId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/lessons/[id] error:", error);
    return NextResponse.json({ error: "تعذر حذف الدرس" }, { status: 500 });
  }
}
