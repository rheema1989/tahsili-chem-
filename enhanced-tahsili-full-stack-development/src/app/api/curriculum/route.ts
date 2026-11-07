import { NextResponse } from "next/server";
import { db } from "@/db";
import { courses, chapters, lessons, questions, booklets } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const includeQuestions = searchParams.get("includeQuestions") !== "false";

    const [allCourses, allChapters, allLessons, allBooklets, allQuestions] =
      await Promise.all([
        db.select().from(courses).orderBy(asc(courses.sortOrder), asc(courses.id)),
        db.select().from(chapters).orderBy(asc(chapters.num), asc(chapters.id)),
        db.select().from(lessons).orderBy(asc(lessons.id)),
        db.select().from(booklets).orderBy(asc(booklets.id)),
        includeQuestions
          ? db
              .select()
              .from(questions)
              .orderBy(asc(questions.questionNumber), asc(questions.id))
          : Promise.resolve([]),
      ]);

    const questionsByLesson = new Map<number, typeof allQuestions>();
    for (const q of allQuestions) {
      const arr = questionsByLesson.get(q.lessonId) ?? [];
      arr.push(q);
      questionsByLesson.set(q.lessonId, arr);
    }

    const lessonsByChapter = new Map<
      number,
      Array<(typeof allLessons)[number] & { questions: typeof allQuestions }>
    >();
    for (const ls of allLessons) {
      const arr = lessonsByChapter.get(ls.chapterId) ?? [];
      arr.push({
        ...ls,
        questions: questionsByLesson.get(ls.id) ?? [],
      });
      lessonsByChapter.set(ls.chapterId, arr);
    }

    const chaptersByCourse = new Map<
      number,
      Array<
        (typeof allChapters)[number] & {
          lessons: Array<(typeof allLessons)[number] & { questions: typeof allQuestions }>;
        }
      >
    >();
    for (const ch of allChapters) {
      const arr = chaptersByCourse.get(ch.courseId) ?? [];
      arr.push({
        ...ch,
        lessons: lessonsByChapter.get(ch.id) ?? [],
      });
      chaptersByCourse.set(ch.courseId, arr);
    }

    const structuredCourses = allCourses.map((c) => {
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

    return NextResponse.json({
      courses: structuredCourses,
      booklets: allBooklets,
    });
  } catch (error) {
    console.error("GET /api/curriculum error:", error);
    return NextResponse.json(
      { error: "تعذر تحميل المنهج الدراسي" },
      { status: 500 }
    );
  }
}
