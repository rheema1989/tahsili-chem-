export interface QuestionRecord {
  id: number;
  courseId: number;
  chapterId: number;
  lessonId: number;
  questionNumber: number;
  questionText: string;
  equation: string | null;
  options: string[];
  correctAnswer: string;
  explanation: string;
  note: string | null;
  sourceType: string; // 'T' | 'D'
  courseSlug?: string;
  courseCode?: string;
  courseTitle?: string;
  chapterNum?: number;
  chapterTitle?: string;
  lessonCode?: string;
  lessonTitle?: string;
  lessonPage?: number;
}

export interface LessonWithQuestions {
  id: number;
  chapterId: number;
  courseId: number;
  code: string;
  title: string;
  page: number;
  questions: QuestionRecord[];
}

export interface ChapterWithLessons {
  id: number;
  courseId: number;
  num: number;
  title: string;
  page: number;
  lessons: LessonWithQuestions[];
}

export interface CourseWithChapters {
  id: number;
  slug: string;
  code: string;
  title: string;
  subtitle: string;
  teacherName: string;
  accentColor: string;
  sortOrder: number;
  totalQuestions: number;
  tahsiliCount: number;
  tadreebCount: number;
  chapters: ChapterWithLessons[];
}

export interface BookletRecord {
  id: number;
  key: string;
  courseSlug: string;
  numberLabel: string;
  title: string;
  courseTitle: string;
  description: string;
  pagesCount: number;
  questionsCount: number;
  teacherName: string;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: string; // 'teacher' | 'student'
  xp: number;
  streakDays: number;
  lastPracticeDate: string | null;
  badges: string[];
  bestScores: Record<string, number>;
}

export interface AttemptRecord {
  id: number;
  userId: number | null;
  studentName: string;
  courseSlug: string;
  quizKey: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  bestStreak: number;
  durationSeconds: number;
  createdAt: string;
}

export const TEACHER_NAME = "أ. عبدالرحيم الحجاب";
export const TEACHER_CREDIT = "إعداد المعلم: أ. عبدالرحيم الحجاب";

// ---------- Chemical subscript/superscript & bidi isolation
const LTR_PATTERN =
  /[A-Za-z0-9δλνΔ\[(][A-Za-z0-9δλνΔ _^{}()+\-−–×÷=.,/%°→\[\]:·≈]*[A-Za-z0-9)}%°\]+\-−]|[A-Za-z0-9δλνΔ]/g;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };
    return map[c] ?? c;
  });
}

export function formatChemMarkup(s: string): string {
  return escapeHtml(s)
    .replace(/_\{([^}]*)\}/g, "<sub>$1</sub>")
    .replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>");
}

export function renderChemHtml(s: string): string {
  if (!s) return "";
  if (!/[\u0600-\u06FF]/.test(s)) {
    return `<bdi dir="ltr">${formatChemMarkup(s)}</bdi>`;
  }
  let out = "";
  let i = 0;
  let m: RegExpExecArray | null;
  LTR_PATTERN.lastIndex = 0;
  while ((m = LTR_PATTERN.exec(s))) {
    out +=
      formatChemMarkup(s.slice(i, m.index)) +
      `<bdi dir="ltr">${formatChemMarkup(m[0])}</bdi>`;
    i = LTR_PATTERN.lastIndex;
  }
  return out + formatChemMarkup(s.slice(i));
}

// ---------- Levels, Stars, Badges & Motivation
export const LEVELS = [
  { name: "مبتدئ التحصيلي", xp: 0 },
  { name: "مستكشف الكيمياء", xp: 25 },
  { name: "متمكن علميًا", xp: 75 },
  { name: "خبير التفاعلات", xp: 150 },
  { name: "بطل التحصيلي", xp: 250 },
];

export interface BadgeDef {
  id: string;
  icon: "star" | "flame" | "bolt" | "book" | "flask" | "crown" | "cal" | "medal";
  title: string;
  desc: string;
}

export const BADGES: BadgeDef[] = [
  { id: "first", icon: "star", title: "البداية الموفقة", desc: "أول إجابة صحيحة" },
  { id: "s5", icon: "flame", title: "شعلة التميز", desc: "5 إجابات صحيحة متتالية" },
  { id: "s10", icon: "bolt", title: "لا تتوقف", desc: "10 إجابات صحيحة متتالية" },
  { id: "l3", icon: "medal", title: "نجم الدرس", desc: "3 نجوم (90%+) في أي درس" },
  { id: "l10", icon: "book", title: "عشرة دروس", desc: "إتقان 10 دروس بنجاح" },
  { id: "lall", icon: "flask", title: "إتمام المقرر", desc: "إتقان جميع دروس المقرر" },
  { id: "ch", icon: "medal", title: "فصل كامل", desc: "70% فأكثر في اختبار فصل" },
  { id: "all90", icon: "crown", title: "بطل التحدي", desc: "90% فأكثر في التحدي الشامل" },
  { id: "d3", icon: "cal", title: "مثابرة", desc: "تدريب 3 أيام متتالية" },
  { id: "d7", icon: "cal", title: "أسبوع ذهبي", desc: "تدريب 7 أيام متتالية" },
  { id: "hero", icon: "crown", title: "بطل التحصيلي", desc: "الوصول لأعلى مستوى" },
];

export function computeLevel(xp: number) {
  let idx = 0;
  LEVELS.forEach((l, j) => {
    if (xp >= l.xp) idx = j;
  });
  const next = LEVELS[idx + 1] ?? null;
  const pct = next
    ? Math.min(
        100,
        Math.round(((xp - LEVELS[idx].xp) / (next.xp - LEVELS[idx].xp)) * 100)
      )
    : 100;
  return {
    index: idx,
    number: idx + 1,
    name: LEVELS[idx].name,
    next,
    pct,
  };
}

export function computeStars(pct: number | null | undefined): number {
  if (pct == null) return 0;
  if (pct >= 90) return 3;
  if (pct >= 70) return 2;
  if (pct >= 50) return 1;
  return 0;
}

export const PRAISE_MESSAGES = [
  "أحسنت! إجابة دقيقة",
  "رائع جدًا!",
  "ممتاز! استمر",
  "إجابة موفقة!",
  "عبقري كيمياء!",
  "أداء مميز!",
];

export const ENCOURAGE_MESSAGES = [
  "لا بأس، ركّز في التفسير العلمي",
  "حاول مرة أخرى في السؤال القادم",
  "الخطأ خطوة نحو الإتقان",
  "قريب جدًا، راجع القاعدة وتابع",
];

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------- Web Audio API Sound Effects & Arabic Speech Synthesis
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playBeep(
  freq: number,
  dur: number,
  enabled: boolean,
  type: OscillatorType = "sine",
  vol = 0.16,
  when = 0
) {
  if (!enabled) return;
  const a = getAudioContext();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function playNoise(enabled: boolean, dur = 0.6, vol = 0.07, when = 0) {
  if (!enabled) return;
  const a = getAudioContext();
  if (!a) return;
  const t = a.currentTime + when;
  const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const ch = b.getChannelData(0);
  for (let i = 0; i < ch.length; i++) {
    ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  }
  const s = a.createBufferSource();
  s.buffer = b;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1800;
  f.Q.value = 0.6;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t);
}

export const soundFx = {
  ok(enabled: boolean) {
    [523, 659, 784, 1047].forEach((f, i) =>
      playBeep(f, 0.18, enabled, "triangle", 0.15, i * 0.07)
    );
    playNoise(enabled, 0.65, 0.06, 0.2);
  },
  bad(enabled: boolean) {
    playBeep(180, 0.3, enabled, "sawtooth", 0.11, 0);
    playBeep(140, 0.3, enabled, "sawtooth", 0.09, 0.12);
  },
  fanfare(enabled: boolean) {
    [
      [523, 0],
      [659, 0.12],
      [784, 0.24],
      [1047, 0.36],
      [784, 0.52],
      [1047, 0.64],
    ].forEach(([f, w]) => playBeep(f, 0.22, enabled, "square", 0.08, w));
    playNoise(enabled, 0.9, 0.08, 0.4);
  },
  win(enabled: boolean) {
    [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) =>
      playBeep(f, 0.24, enabled, "triangle", 0.14, i * 0.14)
    );
    playNoise(enabled, 1.1, 0.07, 0.85);
  },
  tick(enabled: boolean) {
    playBeep(1200, 0.04, enabled, "square", 0.05, 0);
  },
};

export function speakArabic(text: string, enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore speech errors
  }
}
