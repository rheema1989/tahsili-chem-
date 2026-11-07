"use client";

import React from "react";
import {
  BarChart3,
  Trophy,
  Flame,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  TEACHER_CREDIT,
  type AttemptRecord,
  type CourseWithChapters,
} from "@/lib/chem-utils";

interface LeaderboardEntry {
  id: number;
  name: string;
  role: string;
  xp: number;
  streakDays: number;
  badges: string[];
}

interface AnalyticsDashboardProps {
  courses: CourseWithChapters[];
  attempts: AttemptRecord[];
  leaderboard: LeaderboardEntry[];
  onStartCourseQuiz: (courseSlug: string) => void;
}

export function AnalyticsDashboard({
  courses,
  attempts,
  leaderboard,
  onStartCourseQuiz,
}: AnalyticsDashboardProps) {
  const totalQuestions = courses.reduce((s, c) => s + c.totalQuestions, 0);
  const totalTahsili = courses.reduce((s, c) => s + c.tahsiliCount, 0);
  const avgPercentage =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display-ar text-2xl md:text-3xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE] flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-[#F4845F]" />
              لوحة الإحصائيات ومتابعة الأداء
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              تحليل فوري لمستوى الإنجاز في مقررات الكيمياء الأربعة ·{" "}
              <span className="font-bold text-[var(--turq)]">
                {TEACHER_CREDIT}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 space-y-1">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs font-bold">
            <span>إجمالي أسئلة المنصة</span>
            <BookOpen className="w-4 h-4 text-[#0B4F6C] dark:text-[#7FD3CE]" />
          </div>
          <div className="font-display-ar text-3xl font-extrabold text-[var(--ink)]">
            {totalQuestions}
          </div>
          <p className="text-xs text-[var(--muted)]">
            موزعة على {courses.length} مقررات و{" "}
            {courses.reduce((s, c) => s + c.chapters.length, 0)} فصلًا
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 space-y-1">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs font-bold">
            <span>أسئلة تجميعات التحصيلي</span>
            <Sparkles className="w-4 h-4 text-[#F4845F]" />
          </div>
          <div className="font-display-ar text-3xl font-extrabold text-[#F4845F]">
            {totalTahsili}
          </div>
          <p className="text-xs text-[var(--muted)]">
            بنسبة{" "}
            {totalQuestions > 0
              ? Math.round((totalTahsili / totalQuestions) * 100)
              : 0}
            % من إجمالي البنك
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 space-y-1">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs font-bold">
            <span>متوسط الإتقان العام</span>
            <CheckCircle2 className="w-4 h-4 text-[#2E9E5B]" />
          </div>
          <div className="font-display-ar text-3xl font-extrabold text-[#2E9E5B]">
            {avgPercentage}%
          </div>
          <p className="text-xs text-[var(--muted)]">
            بناءً على {attempts.length} جولة تدريبية مسجلة
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 space-y-1">
          <div className="flex items-center justify-between text-[var(--muted)] text-xs font-bold">
            <span>الطلاب المتفاعلون</span>
            <Trophy className="w-4 h-4 text-[#F5B83D]" />
          </div>
          <div className="font-display-ar text-3xl font-extrabold text-[#3AAFA9]">
            {leaderboard.length}
          </div>
          <p className="text-xs text-[var(--muted)]">
            أعلى رصيد:{" "}
            <b>{leaderboard[0]?.xp ?? 0}</b> إجابة صحيحة
          </p>
        </div>
      </div>

      {/* Course Distribution & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Course Coverage */}
        <div className="lg:col-span-7 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6 space-y-4">
          <h3 className="font-display-ar text-xl font-bold text-[var(--petrol)] dark:text-[#7FD3CE]">
            توزيع الأسئلة حسب المقرر الدراسي
          </h3>

          <div className="space-y-4">
            {courses.map((c) => {
              const tahsiliRatio =
                c.totalQuestions > 0
                  ? Math.round((c.tahsiliCount / c.totalQuestions) * 100)
                  : 0;
              return (
                <div
                  key={c.slug}
                  className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <b className="font-display-ar text-lg">{c.title}</b>
                      <span className="text-xs text-[var(--muted)] mr-2">
                        ({c.chapters.length} فصول · {c.totalQuestions} سؤالًا)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartCourseQuiz(c.slug)}
                      className="px-3.5 py-1 rounded-lg bg-[#3AAFA9] text-white text-xs font-bold hover:opacity-90 cursor-pointer"
                    >
                      تدرّب الآن
                    </button>
                  </div>

                  <div className="h-2.5 rounded-full bg-[var(--line)] overflow-hidden flex">
                    <div
                      style={{
                        width: `${tahsiliRatio}%`,
                        backgroundColor: "#F4845F",
                      }}
                      title={`تحصيلي: ${c.tahsiliCount}`}
                    />
                    <div
                      style={{
                        width: `${100 - tahsiliRatio}%`,
                        backgroundColor: "#3AAFA9",
                      }}
                      title={`تدريب: ${c.tadreebCount}`}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-[var(--muted)]">
                    <span>
                      <b className="text-[#F4845F]">{c.tahsiliCount}</b> تجميعات
                      تحصيلي
                    </span>
                    <span>
                      <b className="text-[#3AAFA9]">{c.tadreebCount}</b> أسئلة
                      تدريب مصممة
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6 space-y-4">
          <h3 className="font-display-ar text-xl font-bold text-[var(--petrol)] dark:text-[#7FD3CE] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#F5B83D]" />
            لوحة الشرف والمتصدرين
          </h3>

          <div className="space-y-2.5">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-full font-display-ar font-extrabold text-sm grid place-items-center flex-none ${
                      idx === 0
                        ? "bg-[#F5B83D] text-[#16303B]"
                        : idx === 1
                        ? "bg-[#CBD5E1] text-[#16303B]"
                        : idx === 2
                        ? "bg-[#F4845F] text-white"
                        : "bg-[var(--chip)] text-[var(--ink)]"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">
                      {entry.name}
                      {entry.role === "teacher" && (
                        <span className="mr-1.5 text-[11px] px-2 py-0.5 rounded-full bg-[#0B4F6C] text-white">
                          المعلم
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted)] flex items-center gap-2">
                      <span className="inline-flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-[#F4845F]" />
                        {entry.streakDays} يوم
                      </span>
                      <span>· {entry.badges?.length ?? 0} إنجازات</span>
                    </div>
                  </div>
                </div>

                <div className="text-left flex-none">
                  <div className="font-display-ar text-lg font-extrabold text-[#2E9E5B]">
                    {entry.xp}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">نقطة</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Quiz Attempts Table */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6 space-y-4">
        <h3 className="font-display-ar text-xl font-bold text-[var(--petrol)] dark:text-[#7FD3CE] flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#3AAFA9]" />
          سجل أحدث المحاولات التدريبية
        </h3>

        {attempts.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-6">
            لا توجد محاولات مسجلة بعد. ابدأ أول تحدٍّ الآن!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)] text-xs">
                  <th className="py-2.5 px-3">الطالب</th>
                  <th className="py-2.5 px-3">الاختبار / الدرس</th>
                  <th className="py-2.5 px-3">النتيجة</th>
                  <th className="py-2.5 px-3">النسبة</th>
                  <th className="py-2.5 px-3">أطول سلسلة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-[var(--bg)]/60">
                    <td className="py-2.5 px-3 font-bold">{a.studentName}</td>
                    <td className="py-2.5 px-3">{a.quizTitle}</td>
                    <td className="py-2.5 px-3 font-bold">
                      <bdi dir="ltr">
                        {a.score}/{a.totalQuestions}
                      </bdi>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          a.percentage >= 90
                            ? "bg-[var(--okbg)] text-[#2E9E5B]"
                            : a.percentage >= 70
                            ? "bg-[var(--chip)] text-[#0B4F6C] dark:text-[#7FD3CE]"
                            : "bg-[var(--badbg)] text-[#D24B45]"
                        }`}
                      >
                        {a.percentage}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--muted)]">
                      {a.bestStreak} متتالية
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
