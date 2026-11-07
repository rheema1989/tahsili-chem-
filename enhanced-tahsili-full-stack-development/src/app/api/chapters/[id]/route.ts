import { NextResponse } from "next/server";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const chapterId = Number(id);
    if (!chapterId) {
      return NextResponse.json({ error: "معرف الفصل غير صالح" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Partial<typeof chapters.$inferInsert> = {};
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (body.num !== undefined) updates.num = Number(body.num);
    if (body.page !== undefined) updates.page = Math.max(1, Number(body.page));

    const [updated] = await db
      .update(chapters)
      .set(updates)
      .where(eq(chapters.id, chapterId))
      .returning();

    return NextResponse.json({ chapter: updated });
  } catch (error) {
    console.error("PATCH /api/chapters/[id] error:", error);
    return NextResponse.json({ error: "تعذر تحديث الفصل" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const chapterId = Number(id);
    if (!chapterId) {
      return NextResponse.json({ error: "معرف الفصل غير صالح" }, { status: 400 });
    }
    await db.delete(chapters).where(eq(chapters.id, chapterId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/chapters/[id] error:", error);
    return NextResponse.json({ error: "تعذر حذف الفصل" }, { status: 500 });
  }
}
