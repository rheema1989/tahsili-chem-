import { NextResponse } from "next/server";
import { db } from "@/db";
import { booklets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const bookletId = Number(id);
    if (!bookletId) {
      return NextResponse.json({ error: "معرف الكتيب غير صالح" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Partial<typeof booklets.$inferInsert> = {};
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (typeof body.courseTitle === "string" && body.courseTitle.trim()) {
      updates.courseTitle = body.courseTitle.trim();
    }
    if (typeof body.numberLabel === "string" && body.numberLabel.trim()) {
      updates.numberLabel = body.numberLabel.trim();
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim();
    }
    if (body.pagesCount !== undefined) {
      updates.pagesCount = Math.max(1, Number(body.pagesCount));
    }
    if (body.questionsCount !== undefined) {
      updates.questionsCount = Math.max(1, Number(body.questionsCount));
    }

    const [updated] = await db
      .update(booklets)
      .set(updates)
      .where(eq(booklets.id, bookletId))
      .returning();

    return NextResponse.json({ booklet: updated });
  } catch (error) {
    console.error("PATCH /api/booklets/[id] error:", error);
    return NextResponse.json({ error: "تعذر تحديث الكتيب" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const bookletId = Number(id);
    if (!bookletId) {
      return NextResponse.json({ error: "معرف الكتيب غير صالح" }, { status: 400 });
    }
    await db.delete(booklets).where(eq(booklets.id, bookletId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/booklets/[id] error:", error);
    return NextResponse.json({ error: "تعذر حذف الكتيب" }, { status: 500 });
  }
}
