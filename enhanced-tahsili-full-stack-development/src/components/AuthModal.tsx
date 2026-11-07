"use client";

import React, { useState } from "react";
import { X, LogIn, UserPlus, GraduationCap, ShieldCheck } from "lucide-react";
import { TEACHER_NAME, type SafeUser } from "@/lib/chem-utils";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: SafeUser) => void;
}

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submitLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر تسجيل الدخول");
        return;
      }
      onAuthenticated(data.user);
      onClose();
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await submitLogin(email, password);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر إنشاء الحساب");
        return;
      }
      onAuthenticated(data.user);
      onClose();
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h3 className="font-display-ar text-2xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
              {mode === "login" ? "تسجيل الدخول للمنصة" : "إنشاء حساب جديد"}
            </h3>
            <p className="text-xs text-[var(--muted)]">
              منصة تحدّي التحصيلي – إعداد المعلم: {TEACHER_NAME}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Access */}
        <div className="rounded-xl bg-[var(--chip)] border border-[var(--turq)] p-3.5 space-y-2">
          <div className="text-xs font-bold text-[var(--petrol)] dark:text-[#9EE3DE]">
            دخول سريع بحسابات تجريبية جاهزة:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => submitLogin("teacher@tahsili.edu.sa", "Teacher@123")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B4F6C] text-white text-xs font-bold hover:opacity-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#F4845F]" />
              المعلم {TEACHER_NAME}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => submitLogin("student@tahsili.edu.sa", "Student@123")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#3AAFA9] text-white text-xs font-bold hover:opacity-95 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              طالب (فيصل العتيبي)
            </button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "login"
                ? "bg-[#F4845F] text-white"
                : "text-[var(--muted)]"
            }`}
          >
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "register"
                ? "bg-[#F4845F] text-white"
                : "text-[var(--muted)]"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            حساب جديد
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-bold mb-1">
                  الاسم الكامل (يظهر في الشهادات) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: عبدالله بن محمد السبيعي"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">نوع الحساب</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      role === "student"
                        ? "border-[#3AAFA9] bg-[#3AAFA9]/15 text-[#0B4F6C] dark:text-[#9EE3DE]"
                        : "border-[var(--line)] bg-[var(--bg)]"
                    }`}
                  >
                    حساب طالب / طالبة
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("teacher")}
                    className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      role === "teacher"
                        ? "border-[#0B4F6C] bg-[#0B4F6C]/15 text-[#0B4F6C] dark:text-[#9EE3DE]"
                        : "border-[var(--line)] bg-[var(--bg)]"
                    }`}
                  >
                    حساب معلم / مشرف
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">
              البريد الإلكتروني *
            </label>
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@tahsili.edu.sa"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">كلمة المرور *</label>
            <input
              type="password"
              required
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-[var(--badbg)] border border-[#D24B45] px-3.5 py-2 text-xs font-bold text-[#D24B45]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#F4845F] text-white font-bold text-sm btn-tactile cursor-pointer"
          >
            {loading
              ? "جارٍ المعالجة..."
              : mode === "login"
              ? "دخول"
              : "إنشاء الحساب والمتابعة"}
          </button>
        </form>
      </div>
    </div>
  );
}
