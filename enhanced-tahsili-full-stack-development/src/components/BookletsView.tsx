"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Printer,
  Eye,
  EyeOff,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  FileText,
  BookMarked,
} from "lucide-react";
import { ChemText } from "./ChemText";
import {
  TEACHER_CREDIT,
  type BookletRecord,
  type CourseWithChapters,
  type QuestionRecord,
} from "@/lib/chem-utils";

interface BookletsViewProps {
  booklets: BookletRecord[];
  courses: CourseWithChapters[];
  initialBookletKey?: string | null;
  isTeacher: boolean;
  onBookletsChange: (next: BookletRecord[]) => void;
  onNotify: (msg: string) => void;
}

export function BookletsView({
  booklets,
  courses,
  initialBookletKey,
  isTeacher,
  onBookletsChange,
  onNotify,
}: BookletsViewProps) {
  const [selectedKey, setSelectedKey] = useState<string>(
    initialBookletKey || booklets[0]?.key || "c1"
  );
  const [readerMode, setReaderMode] = useState<"interactive" | "pages">(
    "interactive"
  );
  const [showAnswers, setShowAnswers] = useState(true);
  const [chapterFilter, setChapterFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [visiblePageCount, setVisiblePageCount] = useState(6);

  // Teacher CRUD Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooklet, setEditingBooklet] = useState<BookletRecord | null>(
    null
  );
  const [formTitle, setFormTitle] = useState("");
  const [formCourseSlug, setFormCourseSlug] = useState("k1");
  const [formNumberLabel, setFormNumberLabel] = useState("1");
  const [formDescription, setFormDescription] = useState("");
  const [formPagesCount, setFormPagesCount] = useState(25);
  const [formQuestionsCount, setFormQuestionsCount] = useState(119);
  const [saving, setSaving] = useState(false);

  const activeBooklet =
    booklets.find((b) => b.key === selectedKey) || booklets[0];

  const matchedCourse = useMemo(() => {
    if (!activeBooklet) return courses[0];
    return (
      courses.find((c) => c.slug === activeBooklet.courseSlug) || courses[0]
    );
  }, [activeBooklet, courses]);

  const filteredChapters = useMemo(() => {
    if (!matchedCourse) return [];
    const qLower = searchTerm.trim().toLowerCase();
    return matchedCourse.chapters
      .filter(
        (ch) => chapterFilter === "all" || String(ch.id) === chapterFilter
      )
      .map((ch) => ({
        ...ch,
        lessons: ch.lessons
          .map((ls) => ({
            ...ls,
            questions: ls.questions.filter(
              (q) =>
                !qLower ||
                q.questionText.toLowerCase().includes(qLower) ||
                q.explanation.toLowerCase().includes(qLower) ||
                (q.equation && q.equation.toLowerCase().includes(qLower))
            ),
          }))
          .filter((ls) => ls.questions.length > 0),
      }))
      .filter((ch) => ch.lessons.length > 0);
  }, [matchedCourse, chapterFilter, searchTerm]);

  // Paginated A4 sheets (6 questions per A4 page, matching the exact booklet print layout)
  const a4QuestionPages = useMemo(() => {
    if (!matchedCourse) return [];
    const flatItems: Array<{
      question: QuestionRecord;
      chapterNum: number;
      chapterTitle: string;
      lessonCode: string;
      lessonTitle: string;
      lessonPage: number;
      globalIndex: number;
    }> = [];

    let counter = 1;
    for (const ch of matchedCourse.chapters) {
      for (const ls of ch.lessons) {
        for (const q of ls.questions) {
          flatItems.push({
            question: q,
            chapterNum: ch.num,
            chapterTitle: ch.title,
            lessonCode: ls.code,
            lessonTitle: ls.title,
            lessonPage: ls.page,
            globalIndex: counter++,
          });
        }
      }
    }

    const pages: Array<typeof flatItems> = [];
    const perPage = 6;
    for (let i = 0; i < flatItems.length; i += perPage) {
      pages.push(flatItems.slice(i, i + perPage));
    }
    return pages;
  }, [matchedCourse]);

  const openCreateModal = () => {
    setEditingBooklet(null);
    setFormTitle("");
    setFormCourseSlug("k1");
    setFormNumberLabel("1");
    setFormDescription(
      "تدريبات بنمط اختبار التحصيلي لمقرر الكيمياء · إعداد المعلم: أ. عبدالرحيم الحجاب"
    );
    setFormPagesCount(25);
    setFormQuestionsCount(100);
    setModalOpen(true);
  };

  const openEditModal = (b: BookletRecord) => {
    setEditingBooklet(b);
    setFormTitle(b.title);
    setFormCourseSlug(b.courseSlug);
    setFormNumberLabel(b.numberLabel);
    setFormDescription(b.description);
    setFormPagesCount(b.pagesCount);
    setFormQuestionsCount(b.questionsCount);
    setModalOpen(true);
  };

  const handleSaveBooklet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSaving(true);
    const targetCourse = courses.find((c) => c.slug === formCourseSlug);

    try {
      if (editingBooklet) {
        const optimistic: BookletRecord = {
          ...editingBooklet,
          title: formTitle.trim(),
          courseSlug: formCourseSlug,
          courseTitle: targetCourse?.title || editingBooklet.courseTitle,
          numberLabel: formNumberLabel.trim(),
          description: formDescription.trim(),
          pagesCount: Number(formPagesCount),
          questionsCount: Number(formQuestionsCount),
        };
        onBookletsChange(
          booklets.map((item) =>
            item.id === editingBooklet.id ? optimistic : item
          )
        );
        setModalOpen(false);
        onNotify("تم تحديث بيانات الكتيب بنجاح");

        const res = await fetch(`/api/booklets/${editingBooklet.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(optimistic),
        });
        if (res.ok) {
          const data = await res.json();
          onBookletsChange(
            booklets.map((item) =>
              item.id === editingBooklet.id ? data.booklet : item
            )
          );
        }
      } else {
        const res = await fetch("/api/booklets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            courseSlug: formCourseSlug,
            courseTitle: targetCourse?.title || "الكيمياء 1",
            numberLabel: formNumberLabel.trim(),
            description: formDescription.trim(),
            pagesCount: Number(formPagesCount),
            questionsCount: Number(formQuestionsCount),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          onBookletsChange([...booklets, data.booklet]);
          setSelectedKey(data.booklet.key);
          setModalOpen(false);
          onNotify("تم إضافة الكتيب الجديد بنجاح");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBooklet = async (b: BookletRecord) => {
    const prev = booklets;
    const next = booklets.filter((item) => item.id !== b.id);
    onBookletsChange(next);
    if (selectedKey === b.key && next[0]) {
      setSelectedKey(next[0].key);
    }
    onNotify("تم حذف الكتيب");

    const res = await fetch(`/api/booklets/${b.id}`, { method: "DELETE" });
    if (!res.ok) {
      onBookletsChange(prev);
      onNotify("تعذر حذف الكتيب");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6 flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h2 className="font-display-ar text-2xl md:text-3xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
            كتيبات «تحدّي التحصيلي»
          </h2>
          <p className="text-sm md:text-base text-[var(--muted)] mt-1">
            مذكرات تدريبية شاملة بنمط اختبار التحصيلي لجميع مقررات الكيمياء ·{" "}
            <span className="font-bold text-[var(--turq)]">{TEACHER_CREDIT}</span>
          </p>
        </div>

        {isTeacher && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B4F6C] text-white text-sm font-bold hover:opacity-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة كتيب جديد
          </button>
        )}
      </div>

      {/* 4 Booklet Cards Grid */}
      {booklets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-10 text-center space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-[var(--muted)]" />
          <h3 className="font-display-ar text-xl font-bold">
            لا توجد كتيبات مضافة حاليًا
          </h3>
          <p className="text-sm text-[var(--muted)]">
            يمكن للمعلم إضافة كتيبات مراجعة وتدريبات تحصيلية من الزر أعلاه.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
          {booklets.map((b) => {
            const isSelected = activeBooklet?.key === b.key;
            return (
              <div
                key={b.id}
                onClick={() => {
                  setSelectedKey(b.key);
                  setChapterFilter("all");
                  setVisiblePageCount(6);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedKey(b.key);
                    setChapterFilter("all");
                  }
                }}
                className={`rounded-2xl border-2 p-4 flex items-center gap-3.5 text-right transition-all cursor-pointer bg-[var(--surface)] relative group ${
                  isSelected
                    ? "border-[#F4845F] shadow-md"
                    : "border-[var(--line)] hover:border-[#3AAFA9]"
                }`}
              >
                <span className="flex-none w-13 h-13 rounded-xl bg-[#0B4F6C] text-white grid place-items-center font-display-ar text-xl font-extrabold">
                  <bdi dir="ltr">{b.numberLabel}</bdi>
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block font-display-ar text-lg leading-snug truncate">
                    كيمياء <bdi dir="ltr">{b.numberLabel}</bdi>
                  </b>
                  <small className="block text-xs text-[var(--muted)]">
                    {b.questionsCount} سؤالًا · {b.pagesCount} صفحة
                  </small>
                </div>

                {isTeacher && (
                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      title="تعديل الكتيب"
                      className="p-1.5 rounded-lg bg-[var(--bg)] hover:text-[#0B4F6C] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBooklet(b)}
                      title="حذف الكتيب"
                      className="p-1.5 rounded-lg bg-[var(--bg)] hover:text-[#D24B45] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Booklet Reader */}
      {activeBooklet && (
        <div className="space-y-4">
          {/* Reader Toolbar */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 flex flex-wrap items-center justify-between gap-3 no-print">
            <div>
              <h3 className="font-display-ar text-xl md:text-2xl font-bold text-[var(--petrol)] dark:text-[#7FD3CE]">
                {activeBooklet.title}
              </h3>
              <p className="text-xs md:text-sm text-[var(--muted)]">
                {activeBooklet.description} · {activeBooklet.pagesCount} صفحة
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--bg)] p-1">
                <button
                  type="button"
                  onClick={() => setReaderMode("interactive")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold cursor-pointer ${
                    readerMode === "interactive"
                      ? "bg-[#0B4F6C] text-white"
                      : "text-[var(--muted)]"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  الكتيب التفاعلي
                </button>
                <button
                  type="button"
                  onClick={() => setReaderMode("pages")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold cursor-pointer ${
                    readerMode === "pages"
                      ? "bg-[#0B4F6C] text-white"
                      : "text-[var(--muted)]"
                  }`}
                >
                  <BookMarked className="w-4 h-4" />
                  صفحات الكتيب (A4)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAnswers((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs md:text-sm font-bold hover:border-[var(--turq)] cursor-pointer"
              >
                {showAnswers ? (
                  <>
                    <EyeOff className="w-4 h-4 text-[#F4845F]" />
                    إخفاء الحلول (للتدريب)
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-[#2E9E5B]" />
                    إظهار الحلول والتفسيرات
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F4845F] text-white text-xs md:text-sm font-bold btn-tactile cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                طباعة / حفظ PDF
              </button>
            </div>
          </div>

          {readerMode === "interactive" ? (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 no-print">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث في أسئلة ومعادلات الكتيب..."
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-[var(--turq)]"
                  />
                </div>

                <select
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--turq)]"
                >
                  <option value="all">جميع الفصول ({matchedCourse?.chapters.length || 0} فصول)</option>
                  {matchedCourse?.chapters.map((ch) => (
                    <option key={ch.id} value={String(ch.id)}>
                      الفصل {ch.num}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Printable Study Booklet Cover Banner */}
              <div className="rounded-2xl border-2 border-[#0B4F6C] bg-[var(--surface)] p-6 text-center space-y-1 print-only-area">
                <div className="text-xs font-bold text-[#3AAFA9]">
                  مبادرة «تحدّي التحصيلي» في الكيمياء
                </div>
                <h2 className="font-display-ar text-2xl md:text-3xl font-extrabold text-[#0B4F6C] dark:text-[#7FD3CE]">
                  {activeBooklet.title} ({activeBooklet.courseTitle})
                </h2>
                <p className="text-sm font-bold text-[#F4845F]">
                  {TEACHER_CREDIT}
                </p>
              </div>

              {/* Chapters & Questions */}
              {filteredChapters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
                  لا توجد أسئلة مطابقة لبحثك في هذا الكتيب.
                </div>
              ) : (
                filteredChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6 space-y-5 print-only-area"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-[#0B4F6C]/20">
                      <h4 className="font-display-ar text-xl font-extrabold text-[#0B4F6C] dark:text-[#7FD3CE]">
                        الفصل {ch.num}: <ChemText text={ch.title} />
                      </h4>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--chip)] text-[var(--muted)]">
                        كتاب الطالب ص {ch.page}
                      </span>
                    </div>

                    {ch.lessons.map((ls) => (
                      <div key={ls.id} className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#3AAFA9]/15 text-[#0B4F6C] dark:text-[#9EE3DE] font-bold text-sm">
                          <span>
                            الدرس <bdi dir="ltr">{ls.code}</bdi>:{" "}
                            <ChemText text={ls.title} />
                          </span>
                          <span className="text-xs opacity-75">
                            (ص {ls.page})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {ls.questions.map((q, qIdx) => {
                            const letters = ["A", "B", "C", "D"];
                            return (
                              <div
                                key={q.id}
                                className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 space-y-2.5 break-inside-avoid"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-bold text-base">
                                    <span className="inline-block ml-1.5 text-[#F4845F]">
                                      {q.questionNumber || qIdx + 1}.
                                    </span>
                                    <ChemText text={q.questionText} />
                                  </div>
                                  <span
                                    className={`flex-none text-[11px] font-bold px-2 py-0.5 rounded text-white ${
                                      q.sourceType === "T"
                                        ? "bg-[#F4845F]"
                                        : "bg-[#3AAFA9]"
                                    }`}
                                  >
                                    {q.sourceType === "T" ? "تحصيلي" : "تدريب"}
                                  </span>
                                </div>

                                {q.equation && (
                                  <div className="text-center font-bold text-[#F4845F] text-base py-1">
                                    <ChemText text={q.equation} isEquation />
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                  {q.options.map((opt, idx) => {
                                    const letter = letters[idx];
                                    const isAns =
                                      showAnswers && letter === q.correctAnswer;
                                    return (
                                      <div
                                        key={letter}
                                        className={`rounded-lg border px-3 py-1.5 flex items-center gap-2 ${
                                          isAns
                                            ? "bg-[var(--okbg)] border-[#2E9E5B] font-bold"
                                            : "bg-[var(--surface)] border-[var(--line)]"
                                        }`}
                                      >
                                        <span
                                          className={`w-6 h-6 rounded-full text-xs font-bold grid place-items-center flex-none ${
                                            isAns
                                              ? "bg-[#2E9E5B] text-white"
                                              : "bg-[var(--chip)]"
                                          }`}
                                        >
                                          {letter}
                                        </span>
                                        <ChemText text={opt} />
                                      </div>
                                    );
                                  })}
                                </div>

                                {showAnswers && (
                                  <div className="text-xs md:text-sm text-[var(--muted)] bg-[var(--surface)] rounded-lg px-3 py-2 border border-[var(--line)]">
                                    <b className="text-[#2E9E5B]">
                                      الإجابة ({q.correctAnswer}):{" "}
                                    </b>
                                    <ChemText text={q.explanation} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Page-by-Page Native A4 Printable Booklet Viewer */
            <div className="space-y-6 flex flex-col items-center">
              <div className="w-full max-w-3xl rounded-xl bg-[var(--chip)] border border-[var(--turq)] p-3 text-center text-sm font-bold text-[var(--ink)] no-print">
                عرض صفحات {activeBooklet.title} ({a4QuestionPages.length + 1}{" "}
                صفحة A4) · {TEACHER_CREDIT}
              </div>

              {/* A4 Cover & Table of Contents Page (Page 1) */}
              <div className="w-full max-w-3xl rounded-xl border border-[#D6E2E8] bg-white text-[#16303B] shadow-md p-6 md:p-10 flex flex-col justify-between min-h-[760px] print-only-area break-after-page">
                <div className="space-y-6">
                  <div className="bg-[#3AAFA9] text-white text-center font-display-ar font-bold text-lg py-2 px-4 rounded-md">
                    مبادرة «تحدّي التحصيلي»
                  </div>

                  <div className="text-center space-y-1.5 pt-2">
                    <h2 className="font-display-ar text-4xl md:text-5xl font-extrabold text-[#0B4F6C]">
                      تدريبات تحصيلية
                    </h2>
                    <div className="font-display-ar text-2xl md:text-3xl font-extrabold text-[#F4845F]">
                      مقرر {activeBooklet.courseTitle}
                    </div>
                    <p className="text-sm text-[#5B6C75]">
                      {matchedCourse?.subtitle ||
                        "التعليم الثانوي – نظام المسارات"}
                    </p>
                    <p className="font-display-ar text-xl font-bold text-[#3AAFA9] pt-1">
                      {TEACHER_CREDIT}
                    </p>
                  </div>

                  {/* Chapters Summary Table */}
                  {matchedCourse && (
                    <div className="overflow-x-auto pt-2">
                      <table className="w-full text-sm border-collapse border border-[#D6E2E8]">
                        <thead>
                          <tr className="bg-[#0B4F6C] text-white font-bold">
                            <th className="py-2.5 px-3 border border-[#0B4F6C] text-center w-14">
                              الفصل
                            </th>
                            <th className="py-2.5 px-3 border border-[#0B4F6C] text-right">
                              العنوان والدروس
                            </th>
                            <th className="py-2.5 px-3 border border-[#0B4F6C] text-center w-20">
                              تحصيلي
                            </th>
                            <th className="py-2.5 px-3 border border-[#0B4F6C] text-center w-20">
                              تدريب
                            </th>
                            <th className="py-2.5 px-3 border border-[#0B4F6C] text-center w-20">
                              المجموع
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchedCourse.chapters.map((ch, idx) => {
                            let chT = 0;
                            let chD = 0;
                            for (const ls of ch.lessons) {
                              for (const q of ls.questions) {
                                if (q.sourceType === "T") chT++;
                                else chD++;
                              }
                            }
                            return (
                              <tr
                                key={ch.id}
                                className={
                                  idx % 2 === 0 ? "bg-[#F8FBFD]" : "bg-white"
                                }
                              >
                                <td className="py-2.5 px-3 border border-[#D6E2E8] text-center font-extrabold text-[#0B4F6C]">
                                  {ch.num}
                                </td>
                                <td className="py-2.5 px-3 border border-[#D6E2E8] text-right">
                                  <div className="font-bold text-[#16303B]">
                                    <ChemText text={ch.title} />
                                  </div>
                                  <div className="text-xs text-[#5B6C75]">
                                    {ch.lessons.map((l) => l.code).join(" ، ")}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 border border-[#D6E2E8] text-center font-bold text-[#F4845F]">
                                  {chT}
                                </td>
                                <td className="py-2.5 px-3 border border-[#D6E2E8] text-center font-bold text-[#3AAFA9]">
                                  {chD}
                                </td>
                                <td className="py-2.5 px-3 border border-[#D6E2E8] text-center font-extrabold text-[#16303B]">
                                  {chT + chD}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-[#E8F3F6] font-extrabold">
                            <td
                              colSpan={2}
                              className="py-2.5 px-3 border border-[#D6E2E8] text-right text-[#0B4F6C]"
                            >
                              المجموع الكلي
                            </td>
                            <td className="py-2.5 px-3 border border-[#D6E2E8] text-center text-[#F4845F]">
                              {matchedCourse.tahsiliCount}
                            </td>
                            <td className="py-2.5 px-3 border border-[#D6E2E8] text-center text-[#3AAFA9]">
                              {matchedCourse.tadreebCount}
                            </td>
                            <td className="py-2.5 px-3 border border-[#D6E2E8] text-center text-[#0B4F6C]">
                              {matchedCourse.totalQuestions}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#5B6C75] pt-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="bg-[#F4845F] text-white px-2 py-0.5 rounded font-bold">
                        تحصيلي
                      </span>
                      سؤال من تجميعات التحصيلي (مع التحقق من مفتاح الإجابة)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="bg-[#3AAFA9] text-white px-2 py-0.5 rounded font-bold">
                        تدريب
                      </span>
                      سؤال مصمم بالنمط نفسه لتغطية الدروس
                    </span>
                  </div>
                </div>

                {/* A4 Page 1 Footer */}
                <div className="pt-4 mt-8 border-t border-[#D6E2E8] text-center text-xs text-[#5B6C75]">
                  مبادرة تحدّي التحصيلي &nbsp;|&nbsp; {TEACHER_CREDIT}{" "}
                  &nbsp;|&nbsp; {activeBooklet.courseTitle} &nbsp;|&nbsp; صفحة 1
                </div>
              </div>

              {/* A4 Question Pages (Page 2+) */}
              {a4QuestionPages
                .slice(0, visiblePageCount)
                .map((pageItems, pageIdx) => {
                  const pageNumber = pageIdx + 2;
                  const totalA4Pages = a4QuestionPages.length + 1;
                  const letters = ["A", "B", "C", "D"];

                  return (
                    <div
                      key={pageNumber}
                      className="w-full max-w-3xl rounded-xl border border-[#D6E2E8] bg-white text-[#16303B] shadow-md p-6 md:p-8 flex flex-col justify-between gap-5 print-only-area break-after-page"
                    >
                      <div className="space-y-4">
                        {pageItems.map((item, idxInPage) => {
                          const prevItem =
                            idxInPage > 0 ? pageItems[idxInPage - 1] : null;
                          const showChapterBanner =
                            !prevItem ||
                            prevItem.chapterNum !== item.chapterNum;
                          const showLessonBanner =
                            !prevItem ||
                            prevItem.lessonCode !== item.lessonCode;
                          const q = item.question;

                          return (
                            <div key={q.id} className="space-y-2.5">
                              {showChapterBanner && (
                                <div className="bg-[#0B4F6C] text-white font-display-ar font-bold text-lg py-1.5 px-4 rounded-md text-center">
                                  الفصل {item.chapterNum}:{" "}
                                  <ChemText text={item.chapterTitle} />
                                </div>
                              )}

                              {showLessonBanner && (
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#F4845F] pb-1 text-sm font-bold text-[#0B4F6C]">
                                  <span>
                                    الدرس <bdi dir="ltr">{item.lessonCode}</bdi>:{" "}
                                    <ChemText text={item.lessonTitle} />
                                  </span>
                                  <span className="text-xs text-[#F4845F]">
                                    كتاب الطالب ص {item.lessonPage}
                                  </span>
                                </div>
                              )}

                              <div className="rounded-lg border border-[#E2ECF0] bg-[#F9FCFD] p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 font-bold text-sm md:text-base">
                                    <span className="flex-none w-7 h-7 rounded bg-[#0B4F6C] text-white text-xs font-bold grid place-items-center">
                                      {item.globalIndex}
                                    </span>
                                    <div>
                                      <span
                                        className={`inline-block ml-1.5 text-[11px] font-bold px-2 py-0.5 rounded text-white ${
                                          q.sourceType === "T"
                                            ? "bg-[#F4845F]"
                                            : "bg-[#3AAFA9]"
                                        }`}
                                      >
                                        {q.sourceType === "T"
                                          ? "تحصيلي"
                                          : "تدريب"}
                                      </span>
                                      <ChemText text={q.questionText} />
                                    </div>
                                  </div>
                                </div>

                                {q.equation && (
                                  <div className="text-center font-bold text-[#F4845F] text-sm py-0.5">
                                    <ChemText text={q.equation} isEquation />
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs md:text-sm pr-9">
                                  {q.options.map((opt, oIdx) => {
                                    const letter = letters[oIdx];
                                    const isAns =
                                      showAnswers && letter === q.correctAnswer;
                                    return (
                                      <div
                                        key={letter}
                                        className={`flex items-center gap-2 px-2.5 py-1 rounded border ${
                                          isAns
                                            ? "bg-[#E3F5EA] border-[#2E9E5B] font-bold"
                                            : "bg-white border-[#E2ECF0]"
                                        }`}
                                      >
                                        <span
                                          className={`w-5 h-5 rounded text-[11px] font-bold grid place-items-center flex-none text-white ${
                                            isAns
                                              ? "bg-[#2E9E5B]"
                                              : "bg-[#3AAFA9]"
                                          }`}
                                        >
                                          {letter}
                                        </span>
                                        <ChemText text={opt} />
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="pr-9 text-xs text-[#5B6C75]">
                                  {showAnswers ? (
                                    <span>
                                      <b className="text-[#2E9E5B]">
                                        الإجابة الصحيحة ({q.correctAnswer}):{" "}
                                      </b>
                                      <ChemText text={q.explanation} />
                                    </span>
                                  ) : (
                                    <span>الإجابة: ........................</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* A4 Page Footer */}
                      <div className="pt-3 border-t border-[#D6E2E8] text-center text-xs text-[#5B6C75]">
                        مبادرة تحدّي التحصيلي &nbsp;|&nbsp; {TEACHER_CREDIT}{" "}
                        &nbsp;|&nbsp; {activeBooklet.courseTitle} &nbsp;|&nbsp;
                        صفحة {pageNumber} من {totalA4Pages}
                      </div>
                    </div>
                  );
                })}

              {visiblePageCount < a4QuestionPages.length && (
                <button
                  type="button"
                  onClick={() =>
                    setVisiblePageCount((prev) =>
                      Math.min(prev + 8, a4QuestionPages.length)
                    )
                  }
                  className="px-6 py-3 rounded-xl bg-[#3AAFA9] text-white font-bold btn-tactile-turq cursor-pointer no-print"
                >
                  عرض المزيد من الصفحات ({visiblePageCount + 1} من{" "}
                  {a4QuestionPages.length + 1})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Teacher CRUD Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display-ar text-xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
                {editingBooklet ? "تعديل بيانات الكتيب" : "إضافة كتيب جديد"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBooklet} className="space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">
                  عنوان الكتيب *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: كتيب المراجعة النهائية – كيمياء 3"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">المقرر</label>
                  <select
                    value={formCourseSlug}
                    onChange={(e) => {
                      const slug = e.target.value;
                      setFormCourseSlug(slug);
                      const c = courses.find((x) => x.slug === slug);
                      if (c) setFormNumberLabel(c.code);
                    }}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  >
                    {courses.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">
                    رمز البطاقة
                  </label>
                  <input
                    type="text"
                    value={formNumberLabel}
                    onChange={(e) => setFormNumberLabel(e.target.value)}
                    placeholder="1 أو 2-1"
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">
                    عدد الصفحات
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formPagesCount}
                    onChange={(e) => setFormPagesCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    عدد الأسئلة
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formQuestionsCount}
                    onChange={(e) =>
                      setFormQuestionsCount(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">الوصف</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--line)] text-sm font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#F4845F] text-white text-sm font-bold btn-tactile cursor-pointer"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ الكتيب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
