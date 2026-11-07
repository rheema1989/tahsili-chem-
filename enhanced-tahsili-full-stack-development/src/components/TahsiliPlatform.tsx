"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FlaskConical,
  BookOpen,
  Database,
  BarChart3,
  Award,
  Settings,
  Volume2,
  VolumeX,
  Mic,
  Timer,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Menu,
  X,
  Sparkles,
  Flame,
  Star,
  ChevronLeft,
  UserCheck,
} from "lucide-react";
import { ChemText } from "./ChemText";
import { BadgeIcon } from "./BadgeIcon";
import { QuizEngine } from "./QuizEngine";
import { BookletsView } from "./BookletsView";
import { QuestionBankCrud } from "./QuestionBankCrud";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { CertificateView } from "./CertificateView";
import { AuthModal } from "./AuthModal";
import { ConfettiCanvas, triggerConfetti } from "./ConfettiCanvas";
import {
  BADGES,
  LEVELS,
  TEACHER_CREDIT,
  TEACHER_NAME,
  computeLevel,
  computeStars,
  shuffleArray,
  soundFx,
  type AttemptRecord,
  type BookletRecord,
  type CourseWithChapters,
  type QuestionRecord,
  type SafeUser,
} from "@/lib/chem-utils";

type NavTab =
  | "challenges"
  | "booklets"
  | "bank"
  | "analytics"
  | "badges"
  | "settings";

interface ActiveQuizState {
  questions: QuestionRecord[];
  title: string;
  quizKey: string;
  courseSlug: string;
}

interface TahsiliPlatformProps {
  initialCourses: CourseWithChapters[];
  initialBooklets: BookletRecord[];
  initialUser: SafeUser | null;
  initialAttempts: AttemptRecord[];
  initialLeaderboard: Array<{
    id: number;
    name: string;
    role: string;
    xp: number;
    streakDays: number;
    badges: string[];
  }>;
}

export function TahsiliPlatform({
  initialCourses,
  initialBooklets,
  initialUser,
  initialAttempts,
  initialLeaderboard,
}: TahsiliPlatformProps) {
  const [courses, setCourses] = useState<CourseWithChapters[]>(initialCourses);
  const [booklets, setBooklets] = useState<BookletRecord[]>(initialBooklets);
  const [user, setUser] = useState<SafeUser | null>(initialUser);
  const [attempts, setAttempts] = useState<AttemptRecord[]>(initialAttempts);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<NavTab>("challenges");
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(
    null
  );
  const [selectedBookletKey, setSelectedBookletKey] = useState<string | null>(
    null
  );
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizState | null>(null);
  const [certificateInfo, setCertificateInfo] = useState<{
    reason: string;
    courseLabel: string;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Interactive Preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Guest / Local Progress Fallback
  const [guestName, setGuestName] = useState("");
  const [guestXp, setGuestXp] = useState(0);
  const [guestStreakDays, setGuestStreakDays] = useState(1);
  const [guestBadges, setGuestBadges] = useState<string[]>([]);
  const [guestBestScores, setGuestBestScores] = useState<
    Record<string, number>
  >({});
  const [selectedChaptersByCourse, setSelectedChaptersByCourse] = useState<
    Record<string, number[]>
  >({});

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  // Load saved local preferences
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("tahsili_theme");
      if (savedTheme === "dark") {
        setDarkMode(true);
        document.documentElement.setAttribute("data-theme", "dark");
      }
      const savedSound = localStorage.getItem("tahsili_sound");
      if (savedSound !== null) setSoundEnabled(JSON.parse(savedSound));
      const savedVoice = localStorage.getItem("tahsili_voice");
      if (savedVoice !== null) setVoiceEnabled(JSON.parse(savedVoice));
      const savedTimer = localStorage.getItem("tahsili_timer");
      if (savedTimer !== null) setTimerEnabled(JSON.parse(savedTimer));

      const savedGuest = localStorage.getItem("tahsili_guest_prof");
      if (savedGuest) {
        const p = JSON.parse(savedGuest);
        if (p.name) setGuestName(p.name);
        if (typeof p.xp === "number") setGuestXp(p.xp);
        if (typeof p.streakDays === "number") setGuestStreakDays(p.streakDays);
        if (Array.isArray(p.badges)) setGuestBadges(p.badges);
        if (p.bestScores) setGuestBestScores(p.bestScores);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light"
    );
    try {
      localStorage.setItem("tahsili_theme", next ? "dark" : "light");
    } catch {}
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) soundFx.ok(true);
    try {
      localStorage.setItem("tahsili_sound", JSON.stringify(next));
    } catch {}
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    try {
      localStorage.setItem("tahsili_voice", JSON.stringify(next));
    } catch {}
  };

  const toggleTimer = () => {
    const next = !timerEnabled;
    setTimerEnabled(next);
    try {
      localStorage.setItem("tahsili_timer", JSON.stringify(next));
    } catch {}
  };

  // Effective profile values (DB user when signed in, localStorage for guest)
  const effectiveName = user ? user.name : guestName;
  const effectiveXp = user ? user.xp : guestXp;
  const effectiveStreak = user ? user.streakDays : guestStreakDays;
  const effectiveBadges = user ? user.badges || [] : guestBadges;
  const effectiveBestScores = user ? user.bestScores || {} : guestBestScores;
  const isTeacher = user?.role === "teacher";

  const refreshCurriculum = useCallback(async () => {
    const res = await fetch("/api/curriculum");
    if (res.ok) {
      const data = await res.json();
      setCourses(data.courses);
      setBooklets(data.booklets);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    const res = await fetch("/api/attempts");
    if (res.ok) {
      const data = await res.json();
      setAttempts(data.attempts);
      setLeaderboard(data.leaderboard);
    }
  }, []);

  // Flatten all questions across all 4 courses for the 30-question Comprehensive Challenge
  const allFourCoursesQuestions = useMemo(() => {
    const out: QuestionRecord[] = [];
    for (const c of courses) {
      for (const ch of c.chapters) {
        for (const ls of ch.lessons) {
          for (const q of ls.questions) {
            out.push({
              ...q,
              courseSlug: c.slug,
              courseCode: c.code,
              courseTitle: c.title,
              chapterNum: ch.num,
              chapterTitle: ch.title,
              lessonCode: ls.code,
              lessonTitle: ls.title,
              lessonPage: ls.page,
            });
          }
        }
      }
    }
    return out;
  }, [courses]);

  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === selectedCourseSlug) || null,
    [courses, selectedCourseSlug]
  );

  // Selected chapters for the current course
  const currentSelectedChapters = useMemo(() => {
    if (!activeCourse) return [];
    const saved = selectedChaptersByCourse[activeCourse.slug];
    if (saved && saved.length > 0) return saved;
    return activeCourse.chapters[0] ? [activeCourse.chapters[0].num] : [];
  }, [activeCourse, selectedChaptersByCourse]);

  const toggleChapterSelection = (courseSlug: string, chapterNum: number) => {
    setSelectedChaptersByCourse((prev) => {
      const current = prev[courseSlug] || [chapterNum];
      const next = current.includes(chapterNum)
        ? current.filter((n) => n !== chapterNum)
        : [...current, chapterNum].sort((a, b) => a - b);
      return {
        ...prev,
        [courseSlug]: next.length > 0 ? next : [chapterNum],
      };
    });
  };

  // Start Quiz helper
  const launchQuiz = (
    rawQuestions: QuestionRecord[],
    title: string,
    quizKey: string,
    courseSlug: string
  ) => {
    if (!rawQuestions.length) {
      notify("لا توجد أسئلة متاحة في هذا القسم حاليًا");
      return;
    }
    setCertificateInfo(null);
    setActiveQuiz({
      questions: shuffleArray(rawQuestions),
      title,
      quizKey,
      courseSlug,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle Quiz Completion (persists to PostgreSQL & updates state)
  const handleQuizComplete = async (result: {
    score: number;
    totalQuestions: number;
    percentage: number;
    bestStreak: number;
    durationSeconds: number;
    quizKey: string;
    quizTitle: string;
    courseSlug: string;
  }) => {
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...result,
          studentName: effectiveName || "طالب زائر",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
        await refreshAnalytics();
      }
    } catch {
      // fallback local update
    }

    if (!user) {
      const nextXp = guestXp + result.score;
      const nextBest = {
        ...guestBestScores,
        [result.quizKey]: Math.max(
          guestBestScores[result.quizKey] ?? 0,
          result.percentage
        ),
      };
      const nextBadges = new Set(guestBadges);
      if (nextXp >= 1) nextBadges.add("first");
      if (result.bestStreak >= 5) nextBadges.add("s5");
      if (result.bestStreak >= 10) nextBadges.add("s10");
      if (result.quizKey.includes(":l") && result.percentage >= 90)
        nextBadges.add("l3");
      if (result.quizKey.includes(":c") && result.percentage >= 70)
        nextBadges.add("ch");
      if (
        (result.quizKey.includes(":u") || result.quizKey === "full") &&
        result.percentage >= 90
      ) {
        nextBadges.add("all90");
      }
      if (nextXp >= 250) nextBadges.add("hero");

      const badgeArr = Array.from(nextBadges);
      setGuestXp(nextXp);
      setGuestBestScores(nextBest);
      setGuestBadges(badgeArr);
      try {
        localStorage.setItem(
          "tahsili_guest_prof",
          JSON.stringify({
            name: guestName,
            xp: nextXp,
            streakDays: guestStreakDays,
            badges: badgeArr,
            bestScores: nextBest,
          })
        );
      } catch {}
    }
  };

  const handleSaveStudentName = async (newName: string) => {
    if (user) {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } else {
      setGuestName(newName);
      try {
        localStorage.setItem(
          "tahsili_guest_prof",
          JSON.stringify({
            name: newName,
            xp: guestXp,
            streakDays: guestStreakDays,
            badges: guestBadges,
            bestScores: guestBestScores,
          })
        );
      } catch {}
    }
    notify("تم حفظ الاسم بنجاح");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    notify("تم تسجيل الخروج بنجاح");
  };

  const levelInfo = computeLevel(effectiveXp);

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: "challenges", label: "مواقع التحدي", icon: FlaskConical },
    {
      id: "booklets",
      label: "الكتيبات والمذكرات",
      icon: BookOpen,
      badge: String(booklets.length),
    },
    {
      id: "bank",
      label: "بنك الأسئلة والإدارة",
      icon: Database,
      badge: String(allFourCoursesQuestions.length),
    },
    { id: "analytics", label: "لوحة الإحصائيات", icon: BarChart3 },
    {
      id: "badges",
      label: "إنجازاتي والشهادات",
      icon: Award,
      badge: `${effectiveBadges.length}/${BADGES.length}`,
    },
    { id: "settings", label: "الحساب والإعدادات", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <ConfettiCanvas />

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B4F6C] text-white px-5 py-2.5 rounded-full font-display-ar text-base md:text-lg shadow-xl border-2 border-[#3AAFA9]">
          {toastMsg}
        </div>
      )}

      {/* Petrol Lab-Bench Top Header */}
      <header
        className="bg-[var(--head)] text-[var(--headInk)] border-b-[5px] border-[#F4845F] sticky top-0 z-30 shadow-md no-print"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-4 py-3.5 md:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="القائمة الجانبية"
              className="lg:hidden p-2 rounded-xl border border-white/25 hover:bg-white/10 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("challenges");
                setSelectedCourseSlug(null);
                setActiveQuiz(null);
                setCertificateInfo(null);
              }}
              className="text-right cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="inline-block bg-[#3AAFA9] text-white rounded-full px-3 py-0.5 text-xs font-bold">
                  مبادرة تعليمية
                </span>
                {activeCourse && activeTab === "challenges" && (
                  <span className="text-xs font-bold text-[#9EE3DE]">
                    · {activeCourse.title}
                  </span>
                )}
              </div>
              <h1 className="font-display-ar font-extrabold text-2xl sm:text-3xl md:text-4xl leading-tight group-hover:text-[#9EE3DE] transition-colors">
                «تحدّي التحصيلي»
              </h1>
              <p className="text-xs sm:text-sm opacity-90">
                تدريبات بنمط اختبار التحصيلي لمقررات الكيمياء ·{" "}
                <span className="font-bold text-[#9EE3DE]">
                  {TEACHER_CREDIT}
                </span>
              </p>
            </button>
          </div>

          {/* Quick Controls & Course Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Quick Course Pills */}
            <div className="hidden xl:flex items-center gap-1.5 ml-2">
              {courses.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    setActiveTab("challenges");
                    setSelectedCourseSlug(c.slug);
                    setActiveQuiz(null);
                    setCertificateInfo(null);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === "challenges" && selectedCourseSlug === c.slug
                      ? "bg-[#F4845F] text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  كيمياء <bdi dir="ltr">{c.code}</bdi>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundEnabled}
              title="المؤثرات الصوتية"
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                soundEnabled
                  ? "bg-[#3AAFA9] border-[#3AAFA9] text-white"
                  : "border-white/35 text-white/85 hover:bg-white/10"
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">الأصوات</span>
            </button>

            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={voiceEnabled}
              title="التشجيع الصوتي باللغة العربية"
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                voiceEnabled
                  ? "bg-[#3AAFA9] border-[#3AAFA9] text-white"
                  : "border-white/35 text-white/85 hover:bg-white/10"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">صوت التشجيع</span>
            </button>

            <button
              type="button"
              onClick={toggleTimer}
              aria-pressed={timerEnabled}
              title="مؤقت 30 ثانية لكل سؤال"
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                timerEnabled
                  ? "bg-[#F4845F] border-[#F4845F] text-white"
                  : "border-white/35 text-white/85 hover:bg-white/10"
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مؤقت 30 ث</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="تبديل المظهر الليلي"
              className="p-1.5 rounded-full border border-white/35 text-white hover:bg-white/10 cursor-pointer"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-[#F5B83D]" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full pr-3 pl-1.5 py-1">
                <span className="text-xs font-bold text-[#9EE3DE] max-w-[120px] truncate">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="p-1 rounded-full bg-white/15 hover:bg-[#D24B45] text-white cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F4845F] text-white text-xs font-bold hover:opacity-95 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout with Sidebar Navigation */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-none no-print">
          <div className="sticky top-28 space-y-4">
            {/* Level Summary Card */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full grid place-items-center flex-none"
                  style={{
                    background: `conic-gradient(#F4845F ${levelInfo.pct}%, var(--line) 0)`,
                  }}
                >
                  <span className="w-9 h-9 rounded-full bg-[var(--surface)] grid place-items-center font-display-ar text-base font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                    {levelInfo.number}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-display-ar font-bold text-base truncate">
                    {effectiveName || "متدرب الكيمياء"}
                  </div>
                  <div className="text-xs text-[var(--turq)] font-bold">
                    {levelInfo.name}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="rounded-xl bg-[var(--bg)] p-2">
                  <div className="font-display-ar text-lg font-extrabold text-[#2E9E5B]">
                    {effectiveXp}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    إجابة صحيحة
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--bg)] p-2">
                  <div className="font-display-ar text-lg font-extrabold text-[#F4845F] flex items-center justify-center gap-0.5">
                    <Flame className="w-4 h-4" />
                    {effectiveStreak}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    أيام متتالية
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Links */}
            <nav
              aria-label="التنقل الرئيسي"
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 space-y-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setActiveQuiz(null);
                      setCertificateInfo(null);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                      active
                        ? "bg-[#0B4F6C] text-white"
                        : "text-[var(--ink)] hover:bg-[var(--chip)]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? "text-[#9EE3DE]" : "text-[#3AAFA9]"
                        }`}
                      />
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-[var(--bg)] text-[var(--muted)]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Teacher Attribution Box */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--chip)] p-4 text-center space-y-1">
              <div className="text-xs font-bold text-[var(--petrol)] dark:text-[#9EE3DE]">
                إشراف وإعداد
              </div>
              <div className="font-display-ar text-lg font-extrabold text-[#F4845F]">
                {TEACHER_NAME}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                مقررات الكيمياء – نظام المسارات
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden bg-black/50 backdrop-blur-xs flex">
            <div className="w-72 max-w-[85vw] bg-[var(--surface)] h-full p-5 space-y-4 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <span className="font-display-ar text-xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                  «تحدّي التحصيلي»
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setActiveQuiz(null);
                        setCertificateInfo(null);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold ${
                        active
                          ? "bg-[#0B4F6C] text-white"
                          : "text-[var(--ink)] hover:bg-[var(--chip)]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="text-xs opacity-80">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-[var(--line)] text-center text-xs text-[var(--muted)]">
                {TEACHER_CREDIT}
              </div>
            </div>
            <div
              className="flex-1"
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>
        )}

        {/* Main Content Workspace */}
        <main className="flex-1 min-w-0">
          {/* Active Certificate Screen */}
          {certificateInfo ? (
            <CertificateView
              reason={certificateInfo.reason}
              courseLabel={certificateInfo.courseLabel}
              defaultName={effectiveName}
              soundEnabled={soundEnabled}
              onSaveName={handleSaveStudentName}
              onBack={() => setCertificateInfo(null)}
            />
          ) : activeQuiz ? (
            /* Active Interactive Quiz Engine */
            <QuizEngine
              questions={activeQuiz.questions}
              title={activeQuiz.title}
              quizKey={activeQuiz.quizKey}
              courseSlug={activeQuiz.courseSlug}
              soundEnabled={soundEnabled}
              voiceEnabled={voiceEnabled}
              timerEnabled={timerEnabled}
              currentXp={effectiveXp}
              unlockedBadges={effectiveBadges}
              onQuit={() => setActiveQuiz(null)}
              onComplete={handleQuizComplete}
              onOpenCertificate={(reason) =>
                setCertificateInfo({
                  reason,
                  courseLabel: activeQuiz.title,
                })
              }
            />
          ) : activeTab === "booklets" ? (
            /* Booklets Reader & CRUD */
            <BookletsView
              booklets={booklets}
              courses={courses}
              initialBookletKey={selectedBookletKey}
              isTeacher={isTeacher}
              onBookletsChange={setBooklets}
              onNotify={notify}
            />
          ) : activeTab === "bank" ? (
            /* Question Bank & Curriculum CRUD */
            <QuestionBankCrud
              courses={courses}
              isTeacher={isTeacher}
              onRefreshCurriculum={refreshCurriculum}
              onNotify={notify}
              onRequestTeacherLogin={() => setAuthModalOpen(true)}
            />
          ) : activeTab === "analytics" ? (
            /* Analytics & Leaderboard Dashboard */
            <AnalyticsDashboard
              courses={courses}
              attempts={attempts}
              leaderboard={leaderboard}
              onStartCourseQuiz={(slug) => {
                setActiveTab("challenges");
                setSelectedCourseSlug(slug);
              }}
            />
          ) : activeTab === "badges" ? (
            /* Badges & Certificates View */
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full grid place-items-center flex-none"
                    style={{
                      background: `conic-gradient(#F4845F ${levelInfo.pct}%, var(--line) 0)`,
                    }}
                  >
                    <span className="w-12 h-12 rounded-full bg-[var(--surface)] grid place-items-center font-display-ar text-xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                      {levelInfo.number}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-display-ar text-2xl font-extrabold">
                      {effectiveName ? `${effectiveName} · ` : ""}
                      {levelInfo.name}
                    </h2>
                    <p className="text-sm text-[var(--muted)]">
                      {levelInfo.next
                        ? `باقي ${
                            levelInfo.next.xp - effectiveXp
                          } إجابة صحيحة للوصول إلى «${levelInfo.next.name}»`
                        : "وصلت لأعلى مستوى في المنصة!"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCertificateInfo({
                      reason: `الاجتهاد والتميّز برصيد ${effectiveXp} إجابة صحيحة في تدريبات الكيمياء`,
                      courseLabel: "مقررات الكيمياء",
                    })
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F5B83D] text-[#16303B] font-bold text-sm btn-tactile-gold cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  استخراج شهادة تقدير
                </button>
              </div>

              <div>
                <h3 className="font-display-ar text-xl font-bold mb-3">
                  إنجازاتي وأوسمتي ({effectiveBadges.length} من {BADGES.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {BADGES.map((b) => {
                    const unlocked = effectiveBadges.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-center flex flex-col items-center gap-1.5 transition-opacity ${
                          unlocked ? "" : "opacity-45 grayscale"
                        }`}
                      >
                        <BadgeIcon type={b.icon} className="w-13 h-13" />
                        <b className="font-display-ar text-base">{b.title}</b>
                        <small className="text-xs text-[var(--muted)]">
                          {b.desc}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3">
                <h3 className="font-display-ar text-xl font-bold">
                  شهاداتي المكتسبة (90% فأكثر)
                </h3>
                {Object.entries(effectiveBestScores).filter(([, pct]) => pct >= 90)
                  .length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    احصل على 90% فأكثر في أي درس أو فصل أو تحدٍّ شامل لتظهر
                    شهادتك الرسمية هنا بتوقيع {TEACHER_NAME}.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(effectiveBestScores)
                      .filter(([, pct]) => pct >= 90)
                      .map(([k, pct]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() =>
                            setCertificateInfo({
                              reason: `تحقيق نسبة ${pct}% في (${k})`,
                              courseLabel: "مقررات الكيمياء",
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--chip)] border border-[var(--turq)] text-sm font-bold hover:bg-[#3AAFA9] hover:text-white transition-colors cursor-pointer"
                        >
                          <Award className="w-4 h-4 text-[#F4845F]" />
                          شهادة تفوّق ({pct}%) — {k}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "settings" ? (
            /* Account & Settings View */
            <div className="space-y-5 max-w-2xl">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4">
                <h2 className="font-display-ar text-2xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                  الحساب وإعدادات التدريب
                </h2>

                {user ? (
                  <div className="rounded-xl bg-[var(--chip)] border border-[var(--turq)] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-6 h-6 text-[#0B4F6C] dark:text-[#9EE3DE]" />
                      <div>
                        <div className="font-bold text-base">{user.name}</div>
                        <div className="text-xs text-[var(--muted)]" dir="ltr">
                          {user.email} ·{" "}
                          {user.role === "teacher" ? "حساب معلم" : "حساب طالب"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl bg-[#D24B45] text-white text-xs font-bold cursor-pointer"
                    >
                      تسجيل الخروج
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[var(--chip)] border border-[var(--turq)] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm">
                        أنت تتدرب حاليًا بوضع الزائر
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        سجّل الدخول لحفظ تقدمك ونقاطك في قاعدة البيانات والوصول
                        من أي جهاز.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#0B4F6C] text-white text-xs font-bold cursor-pointer"
                    >
                      تسجيل الدخول / إنشاء حساب
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-bold">
                    الاسم الظاهر في الشهادات ولوحة الشرف:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={effectiveName}
                      id="settings-name-input"
                      placeholder="اكتب اسمك الثلاثي..."
                      className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(
                          "settings-name-input"
                        ) as HTMLInputElement | null;
                        if (el && el.value.trim()) {
                          handleSaveStudentName(el.value.trim());
                        }
                      }}
                      className="px-5 py-2 rounded-xl bg-[#3AAFA9] text-white text-sm font-bold cursor-pointer"
                    >
                      حفظ
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--line)] space-y-2.5">
                  <div className="text-sm font-bold">تفضيلات الاختبار:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={toggleSound}
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-sm font-bold cursor-pointer"
                    >
                      <span>المؤثرات الصوتية</span>
                      <span
                        className={
                          soundEnabled ? "text-[#2E9E5B]" : "text-[var(--muted)]"
                        }
                      >
                        {soundEnabled ? "مفعّلة" : "متوقفة"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleVoice}
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-sm font-bold cursor-pointer"
                    >
                      <span>النطق الصوتي للتشجيع</span>
                      <span
                        className={
                          voiceEnabled ? "text-[#2E9E5B]" : "text-[var(--muted)]"
                        }
                      >
                        {voiceEnabled ? "مفعّل" : "متوقف"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleTimer}
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-sm font-bold cursor-pointer"
                    >
                      <span>مؤقت 30 ثانية لكل سؤال</span>
                      <span
                        className={
                          timerEnabled ? "text-[#F4845F]" : "text-[var(--muted)]"
                        }
                      >
                        {timerEnabled ? "مفعّل" : "متوقف"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-sm font-bold cursor-pointer"
                    >
                      <span>المظهر الليلي (Dark Mode)</span>
                      <span className="text-[#3AAFA9]">
                        {darkMode ? "داكن" : "فاتح"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : !activeCourse ? (
            /* =========================================================
               LANDING HUB — Tahsili Chemistry Platform
               إعداد المعلم: أ. عبدالرحيم الحجاب
               ========================================================= */
            <div className="space-y-8 max-w-4xl mx-auto">
              {/* Student Profile & Quick Progress Strip */}
              <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-14 h-14 rounded-full grid place-items-center flex-none"
                    style={{
                      background: `conic-gradient(#F4845F ${levelInfo.pct}%, var(--line) 0)`,
                    }}
                  >
                    <span className="w-11 h-11 rounded-full bg-[var(--surface)] grid place-items-center font-display-ar text-xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                      {levelInfo.number}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-display-ar text-xl md:text-2xl font-extrabold">
                      {effectiveName ? `${effectiveName} · ` : ""}
                      {levelInfo.name}
                    </h2>
                    <p className="text-xs md:text-sm text-[var(--muted)]">
                      {effectiveXp} إجابة صحيحة · {effectiveStreak} أيام متتالية
                      · {effectiveBadges.length} إنجازات
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("badges")}
                    className="px-4 py-2 rounded-xl bg-[#3AAFA9] text-white text-sm font-bold btn-tactile-turq cursor-pointer"
                  >
                    إنجازاتي وشهاداتي
                  </button>
                  {!user && (
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm font-bold hover:border-[#F4845F] cursor-pointer"
                    >
                      تسجيل الدخول
                    </button>
                  )}
                </div>
              </section>

              {/* Section 1: مواقع التحدي (Exact Coral 2x2 Grid from original site) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display-ar text-2xl md:text-3xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                    مواقع التحدي
                  </h2>
                  <span className="text-xs md:text-sm text-[var(--muted)] font-bold">
                    {allFourCoursesQuestions.length} سؤالًا تفاعليًا
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {courses.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setSelectedCourseSlug(c.slug)}
                      className="rounded-2xl bg-[#F4845F] hover:bg-[#eb754f] text-white font-display-ar font-extrabold text-2xl py-6 px-5 text-center shadow-sm btn-tactile transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>
                        كيمياء <bdi dir="ltr">{c.code}</bdi>
                      </span>
                      <span className="font-sans text-xs font-medium text-white/90">
                        {c.chapters.length} فصول · {c.totalQuestions} سؤالًا (
                        {c.tahsiliCount} تحصيلي)
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Section 2: الكتيبات (Exact Turquoise 2x2 Grid from original site) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display-ar text-2xl md:text-3xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                    الكتيبات
                  </h2>
                  <span className="text-xs md:text-sm text-[var(--muted)] font-bold">
                    تصفح وطباعة PDF
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {booklets.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => {
                        setSelectedBookletKey(b.key);
                        setActiveTab("booklets");
                      }}
                      className="rounded-2xl bg-[#3AAFA9] hover:bg-[#319b95] text-white font-display-ar font-extrabold text-2xl py-6 px-5 text-center shadow-sm btn-tactile-turq transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>
                        كيمياء <bdi dir="ltr">{b.numberLabel}</bdi>
                      </span>
                      <span className="font-sans text-xs font-medium text-white/90">
                        {b.questionsCount} سؤالًا · {b.pagesCount} صفحة
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Section 3: التحدي الكامل لمقررات الكيمياء الأربعة */}
              <section className="rounded-2xl border-2 border-[#F4845F] bg-[var(--surface)] p-5 md:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F4845F]">
                    <Sparkles className="w-4 h-4" />
                    محاكاة اختبار التحصيلي الفعلي
                  </div>
                  <h3 className="font-display-ar text-2xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                    التحدي الكامل – مقررات الكيمياء الأربعة
                  </h3>
                  <p className="text-sm text-[var(--muted)]">
                    30 سؤالًا عشوائيًا من مقررات الكيمياء الأربعة (كيمياء{" "}
                    <bdi dir="ltr">1</bdi> و<bdi dir="ltr">2-1</bdi> و
                    <bdi dir="ltr">2-2</bdi> و<bdi dir="ltr">3</bdi>)، كأنك في
                    قاعة اختبار التحصيلي.
                  </p>
                  {effectiveBestScores.full != null && (
                    <div className="text-xs font-bold text-[#3AAFA9]">
                      أفضل نتيجة لك: {effectiveBestScores.full}%
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    launchQuiz(
                      shuffleArray(allFourCoursesQuestions).slice(0, 30),
                      "التحدي الكامل لمقررات الكيمياء",
                      "full",
                      "all"
                    )
                  }
                  className="px-6 py-3.5 rounded-2xl bg-[#F4845F] text-white font-bold text-base btn-tactile cursor-pointer"
                >
                  ابدأ التحدي الكامل (30 سؤالًا)
                </button>
              </section>
            </div>
          ) : (
            /* =========================================================
               PER-COURSE ARENA — Exact Match to k1/, k21/, k22/, k3/
               ========================================================= */
            <div className="space-y-6">
              {/* Breadcrumb Back Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCourseSlug(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm font-bold hover:border-[#3AAFA9] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                  جميع المقررات
                </button>

                <div className="flex flex-wrap items-center gap-1.5">
                  {courses.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setSelectedCourseSlug(c.slug)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                        c.slug === activeCourse.slug
                          ? "bg-[#F4845F] border-[#F4845F] text-white"
                          : "bg-[var(--surface)] border-[var(--line)] hover:border-[#3AAFA9]"
                      }`}
                    >
                      كيمياء <bdi dir="ltr">{c.code}</bdi>
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Suggested Lesson Nudge */}
              {(() => {
                const courseLessons = activeCourse.chapters.flatMap(
                  (ch) => ch.lessons
                );
                const nextLesson = courseLessons.find(
                  (ls) =>
                    effectiveBestScores[`${activeCourse.slug}:l${ls.code}`] ==
                    null
                );
                if (!nextLesson) return null;
                return (
                  <div className="rounded-2xl border border-dashed border-[#3AAFA9] bg-[var(--chip)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm">
                      درس واحد اليوم يكفي، 5 دقائق فقط. اقتراحنا:{" "}
                      <b>
                        الدرس <bdi dir="ltr">{nextLesson.code}</bdi>{" "}
                        <ChemText text={nextLesson.title} />
                      </b>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        launchQuiz(
                          nextLesson.questions.map((q) => ({
                            ...q,
                            courseTitle: activeCourse.title,
                            lessonCode: nextLesson.code,
                            lessonPage: nextLesson.page,
                          })),
                          `الدرس ${nextLesson.code}: ${nextLesson.title}`,
                          `${activeCourse.slug}:l${nextLesson.code}`,
                          activeCourse.slug
                        )
                      }
                      className="px-4 py-1.5 rounded-xl bg-[#F4845F] text-white text-sm font-bold btn-tactile cursor-pointer"
                    >
                      ابدأ الآن
                    </button>
                  </div>
                );
              })()}

              {/* Hero 1: تحدّي الفصول التي درستها */}
              <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="space-y-2 min-w-0">
                  <h2 className="font-display-ar text-2xl md:text-3xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                    تحدّي الفصول التي درستها – {activeCourse.title}
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    اختر الفصول التي أنهيتها، وسيأتيك 20 سؤالًا عشوائيًا منها
                    فقط.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeCourse.chapters.map((ch) => {
                      const active = currentSelectedChapters.includes(ch.num);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() =>
                            toggleChapterSelection(activeCourse.slug, ch.num)
                          }
                          aria-pressed={active}
                          className={`px-3.5 py-1 rounded-full text-xs md:text-sm font-bold border transition-colors cursor-pointer ${
                            active
                              ? "bg-[#0B4F6C] text-white border-[#0B4F6C]"
                              : "bg-[var(--chip)] text-[var(--ink)] border-[var(--line)] hover:border-[#3AAFA9]"
                          }`}
                        >
                          الفصل {ch.num}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1 text-sm text-[var(--muted)]">
                    <span>
                      <b className="font-display-ar text-xl text-[var(--ink)]">
                        {activeCourse.totalQuestions}
                      </b>{" "}
                      سؤالًا في المقرر
                    </span>
                    <span>
                      <b className="font-display-ar text-xl text-[#F4845F]">
                        {activeCourse.tahsiliCount}
                      </b>{" "}
                      من تجميعات التحصيلي
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const pool = activeCourse.chapters
                      .filter((ch) => currentSelectedChapters.includes(ch.num))
                      .flatMap((ch) =>
                        ch.lessons.flatMap((ls) =>
                          ls.questions.map((q) => ({
                            ...q,
                            courseTitle: activeCourse.title,
                            lessonCode: ls.code,
                            lessonPage: ls.page,
                          }))
                        )
                      );
                    const title =
                      currentSelectedChapters.length ===
                      activeCourse.chapters.length
                        ? `التحدي الشامل – ${activeCourse.title}`
                        : `تحدّي الفصول ${currentSelectedChapters.join("، ")} – ${
                            activeCourse.title
                          }`;
                    launchQuiz(
                      shuffleArray(pool).slice(0, 20),
                      title,
                      `${activeCourse.slug}:u${currentSelectedChapters.join("-")}`,
                      activeCourse.slug
                    );
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-[#F4845F] text-white font-bold text-base btn-tactile cursor-pointer whitespace-nowrap"
                >
                  ابدأ التحدي (20 سؤالًا)
                </button>
              </section>

              {/* Hero 2: التحدي الكامل – طلاب الثالث */}
              <section className="rounded-2xl border-2 border-[#F4845F] bg-[var(--surface)] p-5 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="space-y-1">
                  <h2 className="font-display-ar text-2xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                    التحدي الكامل – لطلاب الثالث
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    30 سؤالًا عشوائيًا من مقررات الكيمياء الأربعة (كيمياء{" "}
                    <bdi dir="ltr">1</bdi> و<bdi dir="ltr">2-1</bdi> و
                    <bdi dir="ltr">2-2</bdi> و<bdi dir="ltr">3</bdi>)، كأنك في
                    اختبار التحصيلي.
                  </p>
                  {effectiveBestScores.full != null && (
                    <div className="text-xs font-bold text-[#3AAFA9]">
                      أفضل نتيجة لك: {effectiveBestScores.full}%
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    launchQuiz(
                      shuffleArray(allFourCoursesQuestions).slice(0, 30),
                      "التحدي الكامل لمقررات الكيمياء",
                      "full",
                      "all"
                    )
                  }
                  className="px-6 py-3 rounded-2xl bg-[#F4845F] text-white font-bold text-base btn-tactile cursor-pointer whitespace-nowrap"
                >
                  ابدأ التحدي الكامل
                </button>
              </section>

              {/* Chapter Cards Grid + Tahsili-Only Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCourse.chapters.map((ch) => {
                  const chQuestions = ch.lessons.flatMap((ls) =>
                    ls.questions.map((q) => ({
                      ...q,
                      courseTitle: activeCourse.title,
                      lessonCode: ls.code,
                      lessonPage: ls.page,
                    }))
                  );
                  const chBest =
                    effectiveBestScores[`${activeCourse.slug}:c${ch.num}`];

                  return (
                    <article
                      key={ch.id}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 flex flex-col justify-between gap-3.5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="w-11 h-11 rounded-full grid place-items-center bg-[#0B4F6C] text-white font-display-ar text-xl font-extrabold flex-none">
                            {ch.num}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-display-ar text-lg font-extrabold leading-snug">
                              <ChemText text={ch.title} />
                            </h3>
                            <div className="text-xs text-[var(--muted)]">
                              {chQuestions.length} سؤالًا · كتاب الطالب ص{" "}
                              {ch.page}
                            </div>
                          </div>
                        </div>

                        {/* Lesson Chips with Star Ratings */}
                        <div className="flex flex-wrap gap-1.5">
                          {ch.lessons.map((ls) => {
                            const lBest =
                              effectiveBestScores[
                                `${activeCourse.slug}:l${ls.code}`
                              ];
                            const stars = computeStars(lBest);
                            return (
                              <button
                                key={ls.id}
                                type="button"
                                title={ls.title}
                                onClick={() =>
                                  launchQuiz(
                                    ls.questions.map((q) => ({
                                      ...q,
                                      courseTitle: activeCourse.title,
                                      lessonCode: ls.code,
                                      lessonPage: ls.page,
                                    })),
                                    `الدرس ${ls.code}: ${ls.title}`,
                                    `${activeCourse.slug}:l${ls.code}`,
                                    activeCourse.slug
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--chip)] border border-[var(--line)] hover:border-[#3AAFA9] transition-colors cursor-pointer"
                              >
                                <span>
                                  الدرس <bdi dir="ltr">{ls.code}</bdi>
                                </span>
                                <span
                                  className="text-[11px] tracking-tight"
                                  aria-label={`${stars} نجوم`}
                                >
                                  {[0, 1, 2].map((i) => (
                                    <span
                                      key={i}
                                      className={
                                        i < stars
                                          ? "text-[#F5B83D]"
                                          : "text-[var(--line)]"
                                      }
                                    >
                                      ★
                                    </span>
                                  ))}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        {chBest != null && (
                          <div className="text-xs font-bold text-[#3AAFA9]">
                            أفضل نتيجة في الفصل: {chBest}%
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            launchQuiz(
                              chQuestions,
                              `الفصل ${ch.num}: ${ch.title}`,
                              `${activeCourse.slug}:c${ch.num}`,
                              activeCourse.slug
                            )
                          }
                          className="px-4 py-2 rounded-xl bg-[#3AAFA9] text-white text-sm font-bold btn-tactile-turq cursor-pointer"
                        >
                          اختبر الفصل كاملًا
                        </button>
                      </div>
                    </article>
                  );
                })}

                {/* Tahsili-Only Card (T) */}
                <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 flex flex-col justify-between gap-3.5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-full grid place-items-center bg-[#F4845F] text-white font-display-ar text-xl font-extrabold flex-none">
                        T
                      </span>
                      <div>
                        <h3 className="font-display-ar text-lg font-extrabold leading-snug">
                          أسئلة التحصيلي فقط
                        </h3>
                        <div className="text-xs text-[var(--muted)]">
                          30 سؤالًا عشوائيًا من تجميعات التحصيلي، من الفصول التي
                          اخترتها في الأعلى
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const pool = activeCourse.chapters
                          .filter((ch) =>
                            currentSelectedChapters.includes(ch.num)
                          )
                          .flatMap((ch) =>
                            ch.lessons.flatMap((ls) =>
                              ls.questions
                                .filter((q) => q.sourceType === "T")
                                .map((q) => ({
                                  ...q,
                                  courseTitle: activeCourse.title,
                                  lessonCode: ls.code,
                                  lessonPage: ls.page,
                                }))
                            )
                          );
                        launchQuiz(
                          shuffleArray(pool).slice(0, 30),
                          `أسئلة التحصيلي – ${activeCourse.title}`,
                          `${activeCourse.slug}:t${currentSelectedChapters.join("-")}`,
                          activeCourse.slug
                        );
                      }}
                      className="px-5 py-2 rounded-xl bg-[#F4845F] text-white text-sm font-bold btn-tactile cursor-pointer"
                    >
                      ابدأ أسئلة التحصيلي
                    </button>
                  </div>
                </article>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer matching original color key & updated teacher attribution */}
      <footer
        className="border-t border-[var(--line)] bg-[var(--surface)]/70 py-4 px-4 text-center text-xs md:text-sm text-[var(--muted)] no-print"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>
            مفتاح الألوان:{" "}
            <span className="inline-block bg-[#F4845F] text-white rounded px-2 py-0.5 text-xs font-bold">
              تحصيلي
            </span>{" "}
            من تجميعات التحصيلي ·{" "}
            <span className="inline-block bg-[#3AAFA9] text-white rounded px-2 py-0.5 text-xs font-bold">
              تدريب
            </span>{" "}
            سؤال مصمم بالنمط نفسه
          </span>
          <span>·</span>
          <span className="font-bold text-[var(--petrol)] dark:text-[#9EE3DE]">
            «تحدّي التحصيلي» · {TEACHER_CREDIT}
          </span>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(loggedUser) => {
          setUser(loggedUser);
          notify(`مرحبًا بك، ${loggedUser.name}`);
        }}
      />
    </div>
  );
}
