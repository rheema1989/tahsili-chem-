import React from "react";

export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"
      dir="rtl"
    >
      <div className="w-14 h-14 rounded-full border-4 border-[#3AAFA9] border-t-[#F4845F] animate-spin" />
      <div className="font-display-ar text-2xl font-extrabold text-[#0B4F6C]">
        جارٍ تحميل منصة «تحدّي التحصيلي»...
      </div>
      <p className="text-sm text-[#5B6C75]">
        إعداد المعلم: أ. عبدالرحيم الحجاب
      </p>
    </div>
  );
}
