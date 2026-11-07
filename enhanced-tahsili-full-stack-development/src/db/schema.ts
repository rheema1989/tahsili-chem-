import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"), // 'teacher' | 'student'
  xp: integer("xp").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastPracticeDate: text("last_practice_date"),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
  bestScores: jsonb("best_scores").$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // 'k1' | 'k21' | 'k22' | 'k3'
  code: text("code").notNull(), // '1' | '2-1' | '2-2' | '3'
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  teacherName: text("teacher_name")
    .notNull()
    .default("إعداد المعلم: أ. عبدالرحيم الحجاب"),
  accentColor: text("accent_color").notNull().default("#F4845F"),
  sortOrder: integer("sort_order").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  num: integer("num").notNull(),
  title: text("title").notNull(),
  page: integer("page").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  title: text("title").notNull(),
  page: integer("page").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  questionNumber: integer("question_number").notNull().default(1),
  questionText: text("question_text").notNull(),
  equation: text("equation"),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: text("correct_answer").notNull(), // 'A' | 'B' | 'C' | 'D'
  explanation: text("explanation").notNull(),
  note: text("note"),
  sourceType: text("source_type").notNull().default("T"), // 'T' | 'D'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const booklets = pgTable("booklets", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  courseSlug: text("course_slug").notNull(),
  numberLabel: text("number_label").notNull(),
  title: text("title").notNull(),
  courseTitle: text("course_title").notNull(),
  description: text("description").notNull(),
  pagesCount: integer("pages_count").notNull().default(20),
  questionsCount: integer("questions_count").notNull().default(100),
  teacherName: text("teacher_name")
    .notNull()
    .default("إعداد المعلم: أ. عبدالرحيم الحجاب"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  studentName: text("student_name").notNull(),
  courseSlug: text("course_slug").notNull(),
  quizKey: text("quiz_key").notNull(),
  quizTitle: text("quiz_title").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  percentage: integer("percentage").notNull(),
  bestStreak: integer("best_streak").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Booklet = typeof booklets.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
