import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Baloo_Bhaijaan_2, Tajawal } from "next/font/google";
import "./globals.css";

const balooBhaijaan = Baloo_Bhaijaan_2({
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تحدّي التحصيلي – الكيمياء | إعداد المعلم: أ. عبدالرحيم الحجاب",
  description:
    "منصة تدريبات تفاعلية بنمط اختبار التحصيلي لمقررات الكيمياء (1، 2-1، 2-2، 3) وكتيبات المراجعة · إعداد المعلم: أ. عبدالرحيم الحجاب",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${balooBhaijaan.variable} ${tajawal.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
