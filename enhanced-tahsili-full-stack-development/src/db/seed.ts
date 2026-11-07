import { db } from "./index";
import {
  users,
  courses,
  chapters,
  lessons,
  questions,
  booklets,
  quizAttempts,
} from "./schema";
import { count, sql } from "drizzle-orm";
import seedData from "@/data/tahsili-seed.json";
import { hashPassword } from "@/lib/auth";

let seedPromise: Promise<void> | null = null;

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      xp INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0,
      last_practice_date TEXT,
      badges JSONB NOT NULL DEFAULT '[]'::jsonb,
      best_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      teacher_name TEXT NOT NULL DEFAULT 'إعداد المعلم: أ. عبدالرحيم الحجاب',
      accent_color TEXT NOT NULL DEFAULT '#F4845F',
      sort_order INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chapters (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      num INTEGER NOT NULL,
      title TEXT NOT NULL,
      page INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      page INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      question_number INTEGER NOT NULL DEFAULT 1,
      question_text TEXT NOT NULL,
      equation TEXT,
      options JSONB NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      note TEXT,
      source_type TEXT NOT NULL DEFAULT 'T',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS booklets (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      course_slug TEXT NOT NULL,
      number_label TEXT NOT NULL,
      title TEXT NOT NULL,
      course_title TEXT NOT NULL,
      description TEXT NOT NULL,
      pages_count INTEGER NOT NULL DEFAULT 20,
      questions_count INTEGER NOT NULL DEFAULT 100,
      teacher_name TEXT NOT NULL DEFAULT 'إعداد المعلم: أ. عبدالرحيم الحجاب',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      student_name TEXT NOT NULL,
      course_slug TEXT NOT NULL,
      quiz_key TEXT NOT NULL,
      quiz_title TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      percentage INTEGER NOT NULL,
      best_streak INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

async function runSeed() {
  await ensureTables();

  const [{ value: existingCourses }] = await db
    .select({ value: count() })
    .from(courses);

  if (existingCourses > 0) {
    return;
  }

  const courseColors: Record<string, { code: string; color: string; order: number }> = {
    k1: { code: "1", color: "#F4845F", order: 1 },
    k21: { code: "2-1", color: "#3AAFA9", order: 2 },
    k22: { code: "2-2", color: "#0B4F6C", order: 3 },
    k3: { code: "3", color: "#E07A5F", order: 4 },
  };

  for (const cData of seedData.courses) {
    const cfg = courseColors[cData.slug] ?? {
      code: cData.slug,
      color: "#F4845F",
      order: 1,
    };

    const [insertedCourse] = await db
      .insert(courses)
      .values({
        slug: cData.slug,
        code: cfg.code,
        title: cData.meta.course,
        subtitle: cData.meta.sub,
        teacherName: "إعداد المعلم: أ. عبدالرحيم الحجاب",
        accentColor: cfg.color,
        sortOrder: cfg.order,
      })
      .returning();

    for (const chData of cData.chapters) {
      const [insertedChapter] = await db
        .insert(chapters)
        .values({
          courseId: insertedCourse.id,
          num: chData.num,
          title: chData.title,
          page: chData.page ?? 1,
        })
        .returning();

      for (const lsData of chData.lessons) {
        const [insertedLesson] = await db
          .insert(lessons)
          .values({
            chapterId: insertedChapter.id,
            courseId: insertedCourse.id,
            code: lsData.code,
            title: lsData.title,
            page: lsData.page ?? chData.page ?? 1,
          })
          .returning();

        if (lsData.qs && lsData.qs.length > 0) {
          const rows = lsData.qs.map((qItem: {
            n?: number;
            q: string;
            eq?: string;
            o: string[];
            a: string;
            ex: string;
            note?: string;
            src?: string;
          }, idx: number) => ({
            courseId: insertedCourse.id,
            chapterId: insertedChapter.id,
            lessonId: insertedLesson.id,
            questionNumber: qItem.n ?? idx + 1,
            questionText: qItem.q,
            equation: qItem.eq ?? null,
            options: qItem.o,
            correctAnswer: qItem.a,
            explanation: qItem.ex,
            note: qItem.note ?? null,
            sourceType: qItem.src ?? "T",
          }));

          await db.insert(questions).values(rows);
        }
      }
    }
  }

  // Insert Booklets
  await db.insert(booklets).values(
    seedData.booklets.map((b) => ({
      key: b.key,
      courseSlug: b.courseSlug,
      numberLabel: b.numberLabel,
      title: b.title,
      courseTitle: b.courseTitle,
      description: b.description,
      pagesCount: b.pagesCount,
      questionsCount: b.questionsCount,
      teacherName: "إعداد المعلم: أ. عبدالرحيم الحجاب",
    }))
  );

  // Seed Demo Users
  const todayStr = new Date().toISOString().slice(0, 10);

  const [teacherUser, studentUser, saraUser, omarUser] = await db
    .insert(users)
    .values([
      {
        name: "أ. عبدالرحيم الحجاب",
        email: "teacher@tahsili.edu.sa",
        passwordHash: hashPassword("Teacher@123"),
        role: "teacher",
        xp: 420,
        streakDays: 14,
        lastPracticeDate: todayStr,
        badges: [
          "first",
          "s5",
          "s10",
          "l3",
          "l10",
          "lall",
          "ch",
          "all90",
          "d3",
          "d7",
          "hero",
        ],
        bestScores: {
          "k1:c1": 100,
          "k1:c2": 95,
          "k21:c1": 96,
          "k22:c1": 92,
          "k3:c1": 100,
          full: 97,
        },
      },
      {
        name: "فيصل العتيبي",
        email: "student@tahsili.edu.sa",
        passwordHash: hashPassword("Student@123"),
        role: "student",
        xp: 168,
        streakDays: 6,
        lastPracticeDate: todayStr,
        badges: ["first", "s5", "s10", "l3", "l10", "ch", "d3"],
        bestScores: {
          "k1:l1-1": 100,
          "k1:l1-2": 92,
          "k1:l1-3": 85,
          "k1:l2-1": 90,
          "k1:c1": 92,
          "k21:l1-1": 88,
          "k21:c1": 84,
          "k22:l1-1": 95,
          "k3:l1-1": 90,
        },
      },
      {
        name: "سارة القحطاني",
        email: "sara@tahsili.edu.sa",
        passwordHash: hashPassword("Student@123"),
        role: "student",
        xp: 285,
        streakDays: 9,
        lastPracticeDate: todayStr,
        badges: [
          "first",
          "s5",
          "s10",
          "l3",
          "l10",
          "ch",
          "all90",
          "d3",
          "d7",
          "hero",
        ],
        bestScores: {
          "k1:c1": 96,
          "k1:c2": 94,
          "k21:c1": 91,
          "k22:c4": 95,
          "k3:c2": 93,
          full: 93,
        },
      },
      {
        name: "عمر الشمري",
        email: "omar@tahsili.edu.sa",
        passwordHash: hashPassword("Student@123"),
        role: "student",
        xp: 84,
        streakDays: 3,
        lastPracticeDate: todayStr,
        badges: ["first", "s5", "l3", "d3"],
        bestScores: {
          "k1:l1-1": 90,
          "k1:l1-2": 78,
          "k21:l2-1": 82,
        },
      },
    ])
    .returning();

  // Seed Realistic Quiz Attempts
  await db.insert(quizAttempts).values([
    {
      userId: studentUser.id,
      studentName: "فيصل العتيبي",
      courseSlug: "k1",
      quizKey: "k1:c1",
      quizTitle: "الفصل 1: مقدمة في علم الكيمياء",
      score: 23,
      totalQuestions: 25,
      percentage: 92,
      bestStreak: 11,
      durationSeconds: 310,
    },
    {
      userId: saraUser.id,
      studentName: "سارة القحطاني",
      courseSlug: "k3",
      quizKey: "full",
      quizTitle: "التحدي الكامل لمقررات الكيمياء",
      score: 28,
      totalQuestions: 30,
      percentage: 93,
      bestStreak: 14,
      durationSeconds: 425,
    },
    {
      userId: studentUser.id,
      studentName: "فيصل العتيبي",
      courseSlug: "k21",
      quizKey: "k21:c1",
      quizTitle: "الفصل 1: الإلكترونات في الذرات",
      score: 21,
      totalQuestions: 25,
      percentage: 84,
      bestStreak: 8,
      durationSeconds: 340,
    },
    {
      userId: omarUser.id,
      studentName: "عمر الشمري",
      courseSlug: "k1",
      quizKey: "k1:l1-1",
      quizTitle: "الدرس 1-1: قصة مادتين",
      score: 9,
      totalQuestions: 10,
      percentage: 90,
      bestStreak: 6,
      durationSeconds: 115,
    },
    {
      userId: studentUser.id,
      studentName: "فيصل العتيبي",
      courseSlug: "k22",
      quizKey: "k22:l1-1",
      quizTitle: "الدرس 1-1: الطاقة",
      score: 19,
      totalQuestions: 20,
      percentage: 95,
      bestStreak: 12,
      durationSeconds: 245,
    },
    {
      userId: saraUser.id,
      studentName: "سارة القحطاني",
      courseSlug: "k22",
      quizKey: "k22:c4",
      quizTitle: "الفصل 4: الهيدروكربونات",
      score: 20,
      totalQuestions: 21,
      percentage: 95,
      bestStreak: 15,
      durationSeconds: 290,
    },
    {
      userId: studentUser.id,
      studentName: "فيصل العتيبي",
      courseSlug: "k3",
      quizKey: "k3:l1-1",
      quizTitle: "الدرس 1-1: أنواع المخاليط",
      score: 18,
      totalQuestions: 20,
      percentage: 90,
      bestStreak: 9,
      durationSeconds: 220,
    },
    {
      userId: teacherUser.id,
      studentName: "أ. عبدالرحيم الحجاب",
      courseSlug: "k3",
      quizKey: "full",
      quizTitle: "التحدي الكامل لمقررات الكيمياء",
      score: 29,
      totalQuestions: 30,
      percentage: 97,
      bestStreak: 19,
      durationSeconds: 380,
    },
  ]);
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
