"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  BookOpen,
  Layers,
  Filter,
  Sparkles,
  FolderPlus,
} from "lucide-react";
import { ChemText } from "./ChemText";
import {
  TEACHER_NAME,
  type CourseWithChapters,
  type QuestionRecord,
} from "@/lib/chem-utils";

interface QuestionBankCrudProps {
  courses: CourseWithChapters[];
  isTeacher: boolean;
  onRefreshCurriculum: () => Promise<void>;
  onNotify: (msg: string) => void;
  onRequestTeacherLogin: () => void;
}

export function QuestionBankCrud({
  courses,
  isTeacher,
  onRefreshCurriculum,
  onNotify,
  onRequestTeacherLogin,
}: QuestionBankCrudProps) {
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [chapterFilter, setChapterFilter] = useState<string>("all");
  const [lessonFilter, setLessonFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Local optimistic overrides
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [updatedMap, setUpdatedMap] = useState<Map<number, QuestionRecord>>(
    new Map()
  );

  // Question Modal State
  const [qModalOpen, setQModalOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<QuestionRecord | null>(null);
  const [fCourseId, setFCourseId] = useState<number>(courses[0]?.id || 1);
  const [fChapterId, setFChapterId] = useState<number>(
    courses[0]?.chapters[0]?.id || 1
  );
  const [fLessonId, setFLessonId] = useState<number>(
    courses[0]?.chapters[0]?.lessons[0]?.id || 1
  );
  const [fQuestionText, setFQuestionText] = useState("");
  const [fEquation, setFEquation] = useState("");
  const [fOptions, setFOptions] = useState(["", "", "", ""]);
  const [fCorrect, setFCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [fExplanation, setFExplanation] = useState("");
  const [fNote, setFNote] = useState("");
  const [fSourceType, setFSourceType] = useState<"T" | "D">("T");
  const [submitting, setSubmitting] = useState(false);

  // Chapter / Lesson Modal State
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [structMode, setStructMode] = useState<"chapter" | "lesson">("chapter");
  const [sCourseId, setSCourseId] = useState<number>(courses[0]?.id || 1);
  const [sChapterId, setSChapterId] = useState<number>(
    courses[0]?.chapters[0]?.id || 1
  );
  const [sCode, setSCode] = useState("");
  const [sTitle, setSTitle] = useState("");
  const [sPage, setSPage] = useState(15);

  // Flatten all questions with metadata
  const allQuestions = useMemo(() => {
    const out: QuestionRecord[] = [];
    for (const c of courses) {
      for (const ch of c.chapters) {
        for (const ls of ch.lessons) {
          for (const q of ls.questions) {
            if (deletedIds.has(q.id)) continue;
            const overridden = updatedMap.get(q.id) || q;
            out.push({
              ...overridden,
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
  }, [courses, deletedIds, updatedMap]);

  const selectedCourseObj = useMemo(
    () => courses.find((c) => c.slug === courseFilter),
    [courses, courseFilter]
  );

  const selectedChapterObj = useMemo(
    () =>
      selectedCourseObj?.chapters.find((ch) => String(ch.id) === chapterFilter),
    [selectedCourseObj, chapterFilter]
  );

  const filteredQuestions = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    return allQuestions.filter((q) => {
      if (courseFilter !== "all" && q.courseSlug !== courseFilter) return false;
      if (chapterFilter !== "all" && String(q.chapterId) !== chapterFilter)
        return false;
      if (lessonFilter !== "all" && String(q.lessonId) !== lessonFilter)
        return false;
      if (sourceFilter !== "all" && q.sourceType !== sourceFilter) return false;
      if (qLower) {
        const hay = `${q.questionText} ${q.explanation} ${q.equation || ""} ${q.options.join(" ")}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [
    allQuestions,
    courseFilter,
    chapterFilter,
    lessonFilter,
    sourceFilter,
    search,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedQuestions = filteredQuestions.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Modal cascading dropdown helpers
  const formCourse = courses.find((c) => c.id === fCourseId) || courses[0];
  const formChapter =
    formCourse?.chapters.find((ch) => ch.id === fChapterId) ||
    formCourse?.chapters[0];

  const openCreateModal = () => {
    const defaultCourse =
      courses.find((c) => c.slug === courseFilter) || courses[0];
    const defaultChapter = defaultCourse?.chapters[0];
    const defaultLesson = defaultChapter?.lessons[0];

    setEditingQ(null);
    setFCourseId(defaultCourse?.id || 1);
    setFChapterId(defaultChapter?.id || 1);
    setFLessonId(defaultLesson?.id || 1);
    setFQuestionText("");
    setFEquation("");
    setFOptions(["", "", "", ""]);
    setFCorrect("A");
    setFExplanation("");
    setFNote("");
    setFSourceType("T");
    setQModalOpen(true);
  };

  const openEditModal = (q: QuestionRecord) => {
    setEditingQ(q);
    setFCourseId(q.courseId);
    setFChapterId(q.chapterId);
    setFLessonId(q.lessonId);
    setFQuestionText(q.questionText);
    setFEquation(q.equation || "");
    setFOptions([...q.options]);
    setFCorrect((q.correctAnswer as "A" | "B" | "C" | "D") || "A");
    setFExplanation(q.explanation);
    setFNote(q.note || "");
    setFSourceType(q.sourceType === "D" ? "D" : "T");
    setQModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fQuestionText.trim() || fOptions.some((o) => !o.trim()) || !fExplanation.trim()) {
      onNotify("يرجى إكمال نص السؤال والخيارات الأربعة والتفسير");
      return;
    }

    setSubmitting(true);
    try {
      if (editingQ) {
        const optimistic: QuestionRecord = {
          ...editingQ,
          courseId: fCourseId,
          chapterId: fChapterId,
          lessonId: fLessonId,
          questionText: fQuestionText.trim(),
          equation: fEquation.trim() || null,
          options: fOptions.map((o) => o.trim()),
          correctAnswer: fCorrect,
          explanation: fExplanation.trim(),
          note: fNote.trim() || null,
          sourceType: fSourceType,
        };
        setUpdatedMap((prev) => new Map(prev).set(editingQ.id, optimistic));
        setQModalOpen(false);
        onNotify("تم حفظ التعديلات على السؤال بنجاح");

        const res = await fetch(`/api/questions/${editingQ.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(optimistic),
        });
        if (res.ok) {
          await onRefreshCurriculum();
          setUpdatedMap(new Map());
        }
      } else {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: fCourseId,
            chapterId: fChapterId,
            lessonId: fLessonId,
            questionText: fQuestionText.trim(),
            equation: fEquation.trim() || null,
            options: fOptions.map((o) => o.trim()),
            correctAnswer: fCorrect,
            explanation: fExplanation.trim(),
            note: fNote.trim() || null,
            sourceType: fSourceType,
          }),
        });
        if (res.ok) {
          setQModalOpen(false);
          onNotify("تم إضافة السؤال الجديد إلى بنك الأسئلة");
          await onRefreshCurriculum();
        } else {
          const err = await res.json();
          onNotify(err.error || "تعذر إضافة السؤال");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (q: QuestionRecord) => {
    setDeletedIds((prev) => new Set(prev).add(q.id));
    onNotify("تم حذف السؤال من بنك الأسئلة");

    const res = await fetch(`/api/questions/${q.id}`, { method: "DELETE" });
    if (res.ok) {
      await onRefreshCurriculum();
      setDeletedIds(new Set());
    } else {
      setDeletedIds((prev) => {
        const copy = new Set(prev);
        copy.delete(q.id);
        return copy;
      });
      onNotify("تعذر حذف السؤال");
    }
  };

  const handleAddStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sTitle.trim()) return;
    setSubmitting(true);
    try {
      if (structMode === "chapter") {
        const res = await fetch("/api/chapters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: sCourseId,
            title: sTitle.trim(),
            page: Number(sPage) || 1,
          }),
        });
        if (res.ok) {
          setStructureModalOpen(false);
          setSTitle("");
          onNotify("تم إضافة الفصل الدراسي الجديد بنجاح");
          await onRefreshCurriculum();
        }
      } else {
        const res = await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: sCourseId,
            chapterId: sChapterId,
            code: sCode.trim() || "1-1",
            title: sTitle.trim(),
            page: Number(sPage) || 1,
          }),
        });
        if (res.ok) {
          setStructureModalOpen(false);
          setSTitle("");
          setSCode("");
          onNotify("تم إضافة الدرس الجديد بنجاح");
          await onRefreshCurriculum();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display-ar text-2xl md:text-3xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
            بنك الأسئلة وإدارة المنهج ({allQuestions.length} سؤال)
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            تصفّح وابحث وأضف وعدّل أسئلة التحصيلي والتدريبات لجميع مقررات الكيمياء ·{" "}
            <span className="font-bold text-[var(--turq)]">{TEACHER_NAME}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isTeacher ? (
            <button
              type="button"
              onClick={onRequestTeacherLogin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B4F6C] text-white text-sm font-bold hover:opacity-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#F4845F]" />
              تسجيل الدخول كمعلم للإضافة والتعديل
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStructMode("chapter");
                  setSCourseId(courses[0]?.id || 1);
                  setSChapterId(courses[0]?.chapters[0]?.id || 1);
                  setSTitle("");
                  setSCode("");
                  setStructureModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm font-bold hover:border-[var(--turq)] cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-[#3AAFA9]" />
                إضافة فصل / درس
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F4845F] text-white text-sm font-bold btn-tactile cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة سؤال جديد
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
          <Filter className="w-3.5 h-3.5" />
          تصفية وبحث متقدم في بنك الأسئلة:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث بنص السؤال أو المعادلة أو التفسير..."
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] pr-9 pl-3 py-2 text-sm focus:outline-none focus:border-[var(--turq)]"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setChapterFilter("all");
              setLessonFilter("all");
              setPage(1);
            }}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
          >
            <option value="all">جميع المقررات (4)</option>
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title} ({c.totalQuestions})
              </option>
            ))}
          </select>

          <select
            value={chapterFilter}
            disabled={!selectedCourseObj}
            onChange={(e) => {
              setChapterFilter(e.target.value);
              setLessonFilter("all");
              setPage(1);
            }}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold disabled:opacity-50"
          >
            <option value="all">جميع الفصول</option>
            {selectedCourseObj?.chapters.map((ch) => (
              <option key={ch.id} value={String(ch.id)}>
                الفصل {ch.num}: {ch.title}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
          >
            <option value="all">كل الأنواع (تحصيلي + تدريب)</option>
            <option value="T">تجميعات التحصيلي فقط (T)</option>
            <option value="D">أسئلة التدريب فقط (D)</option>
          </select>
        </div>

        {selectedChapterObj && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-[var(--muted)] ml-1">
              الدروس:
            </span>
            <button
              type="button"
              onClick={() => {
                setLessonFilter("all");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${
                lessonFilter === "all"
                  ? "bg-[#0B4F6C] text-white border-[#0B4F6C]"
                  : "bg-[var(--chip)] border-[var(--line)]"
              }`}
            >
              الكل
            </button>
            {selectedChapterObj.lessons.map((ls) => (
              <button
                key={ls.id}
                type="button"
                onClick={() => {
                  setLessonFilter(String(ls.id));
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${
                  lessonFilter === String(ls.id)
                    ? "bg-[#3AAFA9] text-white border-[#3AAFA9]"
                    : "bg-[var(--chip)] border-[var(--line)]"
                }`}
              >
                <bdi dir="ltr">{ls.code}</bdi> {ls.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Count & Pagination Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
        <span>
          عرض <b>{paginatedQuestions.length}</b> من أصل{" "}
          <b>{filteredQuestions.length}</b> سؤال مطابق
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40 cursor-pointer"
          >
            السابق
          </button>
          <span className="font-bold text-[var(--ink)]">
            صفحة {safePage} من {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] font-bold disabled:opacity-40 cursor-pointer"
          >
            التالي
          </button>
        </div>
      </div>

      {/* Questions List */}
      {paginatedQuestions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-10 text-center space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-[var(--muted)]" />
          <h3 className="font-display-ar text-xl font-bold">
            لا توجد أسئلة مطابقة للتصفية الحالية
          </h3>
          <p className="text-sm text-[var(--muted)]">
            جرّب تغيير كلمات البحث أو إعادة تعيين الفلاتر، أو أضف سؤالًا جديدًا.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedQuestions.map((q) => {
            const letters = ["A", "B", "C", "D"];
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-3 hover:border-[var(--turq)] transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded-md font-bold text-white ${
                        q.sourceType === "T" ? "bg-[#F4845F]" : "bg-[#3AAFA9]"
                      }`}
                    >
                      {q.sourceType === "T" ? "تحصيلي" : "تدريب"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--chip)] font-bold text-[var(--petrol)] dark:text-[#9EE3DE]">
                      {q.courseTitle}
                    </span>
                    <span className="text-[var(--muted)]">
                      الفصل {q.chapterNum} · الدرس{" "}
                      <bdi dir="ltr">{q.lessonCode}</bdi> ({q.lessonTitle})
                    </span>
                  </div>

                  {isTeacher && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(q)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs font-bold hover:border-[#0B4F6C] text-[#0B4F6C] dark:text-[#7FD3CE] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs font-bold hover:border-[#D24B45] text-[#D24B45] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  )}
                </div>

                <div className="font-bold text-base md:text-lg">
                  <ChemText text={q.questionText} />
                </div>

                {q.equation && (
                  <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] py-1.5 px-3 text-center font-bold text-[#F4845F] text-base">
                    <ChemText text={q.equation} isEquation />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                  {q.options.map((opt, idx) => {
                    const letter = letters[idx];
                    const isAns = letter === q.correctAnswer;
                    return (
                      <div
                        key={letter}
                        className={`rounded-xl border px-3 py-2 flex items-center gap-2 ${
                          isAns
                            ? "bg-[var(--okbg)] border-[#2E9E5B] font-bold"
                            : "bg-[var(--bg)] border-[var(--line)]"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-bold grid place-items-center flex-none ${
                            isAns
                              ? "bg-[#2E9E5B] text-white"
                              : "bg-[var(--surface)] border border-[var(--line)]"
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="truncate">
                          <ChemText text={opt} />
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs md:text-sm text-[var(--muted)] bg-[var(--bg)] rounded-xl p-3 border border-[var(--line)]">
                  <b className="text-[var(--ink)]">التفسير: </b>
                  <ChemText text={q.explanation} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {qModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 className="font-display-ar text-xl md:text-2xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                {editingQ ? "تعديل السؤال" : "إضافة سؤال تحصيلي جديد"}
              </h3>
              <button
                type="button"
                onClick={() => setQModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">المقرر *</label>
                  <select
                    value={fCourseId}
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      setFCourseId(cid);
                      const c = courses.find((x) => x.id === cid);
                      const ch = c?.chapters[0];
                      setFChapterId(ch?.id || 1);
                      setFLessonId(ch?.lessons[0]?.id || 1);
                    }}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">الفصل *</label>
                  <select
                    value={fChapterId}
                    onChange={(e) => {
                      const chid = Number(e.target.value);
                      setFChapterId(chid);
                      const ch = formCourse?.chapters.find(
                        (x) => x.id === chid
                      );
                      setFLessonId(ch?.lessons[0]?.id || 1);
                    }}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
                  >
                    {formCourse?.chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        الفصل {ch.num}: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">الدرس *</label>
                  <select
                    value={fLessonId}
                    onChange={(e) => setFLessonId(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
                  >
                    {formChapter?.lessons.map((ls) => (
                      <option key={ls.id} value={ls.id}>
                        {ls.code} — {ls.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  نص السؤال *{" "}
                  <span className="font-normal text-[var(--muted)]">
                    (استخدم <code>{"O_{3}"}</code> للأرقام السفلية و{" "}
                    <code>{"Ca^{2+}"}</code> للأسس)
                  </span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={fQuestionText}
                  onChange={(e) => setFQuestionText(e.target.value)}
                  placeholder="مثال: عدد جزيئات الأوزون الناتجة عن 12 ذرة أكسجين .."
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm"
                />
                {fQuestionText && (
                  <div className="mt-1 px-3 py-1.5 rounded-lg bg-[var(--chip)] text-xs">
                    <span className="text-[var(--muted)] ml-1">معاينة:</span>
                    <ChemText text={fQuestionText} className="font-bold" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">
                    معادلة كيميائية مرافقة (اختياري)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={fEquation}
                    onChange={(e) => setFEquation(e.target.value)}
                    placeholder="2H_{2} + O_{2} → 2H_{2}O"
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    تصنيف السؤال
                  </label>
                  <select
                    value={fSourceType}
                    onChange={(e) =>
                      setFSourceType(e.target.value as "T" | "D")
                    }
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
                  >
                    <option value="T">تحصيلي (تجميعات)</option>
                    <option value="D">تدريب (مصمم بالنمط)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(["A", "B", "C", "D"] as const).map((letter, idx) => (
                  <div key={letter}>
                    <label className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>الخيار ({letter}) *</span>
                      <label className="inline-flex items-center gap-1 cursor-pointer text-[#2E9E5B]">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={fCorrect === letter}
                          onChange={() => setFCorrect(letter)}
                        />
                        الإجابة الصحيحة
                      </label>
                    </label>
                    <input
                      type="text"
                      required
                      value={fOptions[idx]}
                      onChange={(e) => {
                        const copy = [...fOptions];
                        copy[idx] = e.target.value;
                        setFOptions(copy);
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-sm ${
                        fCorrect === letter
                          ? "border-[#2E9E5B] bg-[var(--okbg)] font-bold"
                          : "border-[var(--line)] bg-[var(--bg)]"
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  التفسير العلمي للإجابة *
                </label>
                <textarea
                  rows={2}
                  required
                  value={fExplanation}
                  onChange={(e) => setFExplanation(e.target.value)}
                  placeholder="اشرح خطوات الحل أو القاعدة العلمية بوضوح..."
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  ملاحظة إضافية (اختياري)
                </label>
                <input
                  type="text"
                  value={fNote}
                  onChange={(e) => setFNote(e.target.value)}
                  placeholder="تلميح سريع للطلاب..."
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setQModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--line)] text-sm font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-[#F4845F] text-white text-sm font-bold btn-tactile cursor-pointer"
                >
                  {submitting
                    ? "جارٍ الحفظ..."
                    : editingQ
                    ? "حفظ التعديلات"
                    : "إضافة السؤال"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Chapter / Lesson Modal */}
      {structureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display-ar text-xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#3AAFA9]" />
                إضافة فصل أو درس للمنهج
              </h3>
              <button
                type="button"
                onClick={() => setStructureModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
              <button
                type="button"
                onClick={() => setStructMode("chapter")}
                className={`py-1.5 rounded-lg text-sm font-bold cursor-pointer ${
                  structMode === "chapter"
                    ? "bg-[#0B4F6C] text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                فصل جديد
              </button>
              <button
                type="button"
                onClick={() => setStructMode("lesson")}
                className={`py-1.5 rounded-lg text-sm font-bold cursor-pointer ${
                  structMode === "lesson"
                    ? "bg-[#0B4F6C] text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                درس جديد
              </button>
            </div>

            <form onSubmit={handleAddStructure} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">المقرر</label>
                <select
                  value={sCourseId}
                  onChange={(e) => {
                    const cid = Number(e.target.value);
                    setSCourseId(cid);
                    const c = courses.find((x) => x.id === cid);
                    setSChapterId(c?.chapters[0]?.id || 1);
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {structMode === "lesson" && (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1">الفصل</label>
                    <select
                      value={sChapterId}
                      onChange={(e) => setSChapterId(Number(e.target.value))}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
                    >
                      {courses
                        .find((c) => c.id === sCourseId)
                        ?.chapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            الفصل {ch.num}: {ch.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">
                      رمز الدرس (مثال: 6-1)
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={sCode}
                      onChange={(e) => setSCode(e.target.value)}
                      placeholder="6-1"
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold mb-1">
                  {structMode === "chapter" ? "عنوان الفصل *" : "عنوان الدرس *"}
                </label>
                <input
                  type="text"
                  required
                  value={sTitle}
                  onChange={(e) => setSTitle(e.target.value)}
                  placeholder={
                    structMode === "chapter"
                      ? "مثال: مراجعة شاملة للتفاعلات"
                      : "مثال: تطبيقات الحسابات الكيميائية"
                  }
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  رقم الصفحة في كتاب الطالب
                </label>
                <input
                  type="number"
                  min={1}
                  value={sPage}
                  onChange={(e) => setSPage(Number(e.target.value))}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStructureModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--line)] text-sm font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#3AAFA9] text-white text-sm font-bold btn-tactile-turq cursor-pointer"
                >
                  {submitting ? "جارٍ الحفظ..." : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
