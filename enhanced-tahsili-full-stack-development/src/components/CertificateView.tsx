"use client";

import React, { useState, useEffect } from "react";
import { Award, Printer, ArrowRight, Sparkles } from "lucide-react";
import { ChemText } from "./ChemText";
import { triggerConfetti } from "./ConfettiCanvas";
import { soundFx, TEACHER_NAME } from "@/lib/chem-utils";

interface CertificateViewProps {
  reason: string;
  courseLabel?: string;
  defaultName: string;
  soundEnabled: boolean;
  onSaveName: (name: string) => void;
  onBack: () => void;
}

export function CertificateView({
  reason,
  courseLabel = "مقررات الكيمياء",
  defaultName,
  soundEnabled,
  onSaveName,
  onBack,
}: CertificateViewProps) {
  const [studentName, setStudentName] = useState(defaultName);
  const [editingName, setEditingName] = useState(!defaultName);

  useEffect(() => {
    soundFx.win(soundEnabled);
    triggerConfetti(180);
  }, [soundEnabled]);

  let dateStr = "";
  try {
    dateStr = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
      dateStyle: "long",
    }).format(new Date());
  } catch {
    dateStr = new Date().toLocaleDateString("ar-SA");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm font-bold hover:border-[var(--turq)] cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          عودة
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingName((v) => !v)}
            className="px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm font-bold hover:border-[var(--turq)] cursor-pointer"
          >
            {editingName ? "إخفاء تعديل الاسم" : "تعديل الاسم على الشهادة"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#F4845F] text-white text-sm font-bold btn-tactile cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            طباعة / حفظ PDF
          </button>
        </div>
      </div>

      {editingName && (
        <div className="no-print rounded-2xl border border-dashed border-[var(--turq)] bg-[var(--chip)] p-4 flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="cert-name-input" className="text-sm font-bold">
            اكتب اسمك كما تحب أن يظهر على شهادة التميّز:
          </label>
          <div className="flex items-center gap-2">
            <input
              id="cert-name-input"
              type="text"
              maxLength={50}
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="مثال: فيصل بن سعد العتيبي"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-[var(--coral)]"
            />
            <button
              type="button"
              onClick={() => {
                if (studentName.trim()) {
                  onSaveName(studentName.trim());
                  setEditingName(false);
                }
              }}
              className="px-4 py-1.5 rounded-xl bg-[#3AAFA9] text-white text-sm font-bold cursor-pointer"
            >
              اعتماد الاسم
            </button>
          </div>
        </div>
      )}

      <div className="cert-frame max-w-3xl mx-auto px-6 py-10 md:px-12 md:py-12 text-center shadow-lg print-only-area">
        <div className="flex items-center justify-center gap-2 text-[#3AAFA9] font-bold text-sm md:text-base">
          <Sparkles className="w-4 h-4" />
          <span>
            مبادرة «تحدّي التحصيلي» · <ChemText text={courseLabel} />
          </span>
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="my-3 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#0B4F6C]/10 flex items-center justify-center text-[#0B4F6C]">
            <Award className="w-10 h-10" />
          </div>
        </div>

        <h2 className="font-display-ar text-4xl md:text-5xl font-extrabold text-[#0B4F6C] my-2">
          شهادة تميّز وتفوّق
        </h2>

        <p className="text-base md:text-lg text-[#16303B]/80 mt-3">
          تُمنح هذه الشهادة بكل فخر وتقدير للطالب / الطالبة
        </p>

        <div className="font-display-ar text-3xl md:text-4xl font-extrabold text-[#C9623F] border-b-2 border-dotted border-[#3AAFA9] inline-block px-8 py-1 my-3">
          {studentName.trim() || "طالب التميّز في الكيمياء"}
        </div>

        <p className="text-base md:text-lg text-[#16303B] mt-2">
          تقديرًا لـ <ChemText text={reason} className="font-bold text-[#0B4F6C]" />
        </p>

        <p className="text-sm md:text-base text-[#5B6C75] mt-2">
          مع أطيب التمنيات بدوام التوفيق والنجاح والدرجات العليا في اختبار التحصيلي
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-10 pt-4 border-t border-[#D6E2E8] text-sm md:text-base font-bold text-[#16303B]">
          <span>التاريخ: {dateStr}</span>
          <span className="text-[#0B4F6C]">المعلم: {TEACHER_NAME}</span>
        </div>
      </div>

      <p className="text-center text-sm text-[var(--muted)] no-print">
        يمكنك طباعة الشهادة أو حفظها كملف PDF أو تصوير الشاشة لمشاركتها مع المعلم {TEACHER_NAME}.
      </p>
    </div>
  );
}
