import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizAttempts, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const [recentAttempts, topStudents] = await Promise.all([
      db
        .select()
        .from(quizAttempts)
        .orderBy(desc(quizAttempts.createdAt), desc(quizAttempts.id))
        .limit(20),
      db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          xp: users.xp,
          streakDays: users.streakDays,
          badges: users.badges,
        })
        .from(users)
        .orderBy(desc(users.xp))
        .limit(10),
    ]);

    return NextResponse.json({
      attempts: recentAttempts,
      leaderboard: topStudents,
    });
  } catch (error) {
    console.error("GET /api/attempts error:", error);
    return NextResponse.json(
      { error: "تعذر تحميل سجل المحاولات" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const current = await getCurrentUser();
    const body = await request.json();

    const studentName = String(
      body.studentName || current?.name || "طالب زائر"
    ).trim();
    const courseSlug = String(body.courseSlug || "k1").trim();
    const quizKey = String(body.quizKey || "general").trim();
    const quizTitle = String(body.quizTitle || "تحدّي التحصيلي").trim();
    const score = Math.max(0, Number(body.score || 0));
    const totalQuestions = Math.max(1, Number(body.totalQuestions || 1));
    const percentage = Math.round((score / totalQuestions) * 100);
    const bestStreak = Math.max(0, Number(body.bestStreak || 0));
    const durationSeconds = Math.max(0, Number(body.durationSeconds || 0));

    const [created] = await db
      .insert(quizAttempts)
      .values({
        userId: current?.id ?? null,
        studentName,
        courseSlug,
        quizKey,
        quizTitle,
        score,
        totalQuestions,
        percentage,
        bestStreak,
        durationSeconds,
      })
      .returning();

    let updatedUser = current;
    if (current) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const yStr = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      let nextStreak = current.streakDays;
      if (current.lastPracticeDate !== todayStr) {
        nextStreak = current.lastPracticeDate === yStr ? current.streakDays + 1 : 1;
      }

      const mergedScores: Record<string, number> = {
        ...(current.bestScores || {}),
      };
      mergedScores[quizKey] = Math.max(mergedScores[quizKey] ?? 0, percentage);

      const newBadges = new Set<string>(current.badges || []);
      const nextXp = current.xp + score;
      if (nextXp >= 1) newBadges.add("first");
      if (bestStreak >= 5) newBadges.add("s5");
      if (bestStreak >= 10) newBadges.add("s10");
      if (quizKey.includes(":l") && percentage >= 90) newBadges.add("l3");
      if (quizKey.includes(":c") && percentage >= 70) newBadges.add("ch");
      if ((quizKey.includes(":u") || quizKey === "full") && percentage >= 90) {
        newBadges.add("all90");
      }
      if (nextStreak >= 3) newBadges.add("d3");
      if (nextStreak >= 7) newBadges.add("d7");
      if (nextXp >= 250) newBadges.add("hero");

      const [savedUser] = await db
        .update(users)
        .set({
          xp: nextXp,
          streakDays: nextStreak,
          lastPracticeDate: todayStr,
          badges: Array.from(newBadges),
          bestScores: mergedScores,
        })
        .where(eq(users.id, current.id))
        .returning();

      const { passwordHash: _ignored, ...safeUser } = savedUser;
      updatedUser = safeUser;
    }

    return NextResponse.json({
      attempt: created,
      user: updatedUser,
    });
  } catch (error) {
    console.error("POST /api/attempts error:", error);
    return NextResponse.json(
      { error: "تعذر حفظ نتيجة الاختبار" },
      { status: 500 }
    );
  }
}
