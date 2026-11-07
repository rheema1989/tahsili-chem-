import React from "react";
import { db } from "@/db";
import {
  courses,
  chapters,
  lessons,
  questions,
  booklets,
  quizAttempts,
  users,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";
import { asc, desc } from "drizzle-orm";
import { TahsiliPlatform } from "@/components/TahsiliPlatform";
import type { CourseWithChapters } from "@/lib/chem-utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();

  const [
    currentUser,
    allCourses,
    allChapters,
    allLessons,
    allQuestions,
    allBooklets,
    recentAttempts,
    topUsers,
  ] = await Promise.all([
    getCurrentUser(),
    db.select().from(courses).orderBy(asc(courses.sortOrder), asc(courses.id)),
    db.select().from(chapters).orderBy(asc(chapters.num), asc(chapters.id)),
    db.select().from(lessons).orderBy(asc(lessons.id)),
    db
      .select()
      .from(questions)
      .orderBy(asc(questions.questionNumber), asc(questions.id)),
    db.select().from(booklets).orderBy(asc(booklets.id)),
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

  const questionsByLesson = new Map<number, typeof allQuestions>();
  for (const q of allQuestions) {
    const list = questionsByLesson.get(q.lessonId) ?? [];
    list.push(q);
    questionsByLesson.set(q.lessonId, list);
  }

  const lessonsByChapter = new Map<
    number,
    Array<(typeof allLessons)[number] & { questions: typeof allQuestions }>
  >();
  for (const ls of allLessons) {
    const list = lessonsByChapter.get(ls.chapterId) ?? [];
    list.push({
      ...ls,
      questions: questionsByLesson.get(ls.id) ?? [],
    });
    lessonsByChapter.set(ls.chapterId, list);
  }

  const chaptersByCourse = new Map<
    number,
    Array<
      (typeof allChapters)[number] & {
        lessons: Array<
          (typeof allLessons)[number] & { questions: typeof allQuestions }
        >;
      }
    >
  >();
  for (const ch of allChapters) {
    const list = chaptersByCourse.get(ch.courseId) ?? [];
    list.push({
      ...ch,
      lessons: lessonsByChapter.get(ch.id) ?? [],
    });
    chaptersByCourse.set(ch.courseId, list);
  }

  const structuredCourses: CourseWithChapters[] = allCourses.map((c) => {
    const chs = chaptersByCourse.get(c.id) ?? [];
    let total = 0;
    let tcount = 0;
    let dcount = 0;
    for (const ch of chs) {
      for (const ls of ch.lessons) {
        total += ls.questions.length;
        for (const q of ls.questions) {
          if (q.sourceType === "T") tcount++;
          else dcount++;
        }
      }
    }
    return {
      ...c,
      totalQuestions: total,
      tahsiliCount: tcount,
      tadreebCount: dcount,
      chapters: chs,
    };
  });

  const serializedAttempts = recentAttempts.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <TahsiliPlatform
      initialCourses={structuredCourses}
      initialBooklets={allBooklets}
      initialUser={currentUser}
      initialAttempts={serializedAttempts}
      initialLeaderboard={topUsers}
    />
  );
}
