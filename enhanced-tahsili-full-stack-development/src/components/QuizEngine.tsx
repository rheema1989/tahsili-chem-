"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight,
  RotateCcw,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { ChemText } from "./ChemText";
import { BadgeIcon } from "./BadgeIcon";
import { triggerConfetti } from "./ConfettiCanvas";
import {
  BADGES,
  ENCOURAGE_MESSAGES,
  PRAISE_MESSAGES,
  computeLevel,
  computeStars,
  shuffleArray,
  soundFx,
  speakArabic,
  type QuestionRecord,
} from "@/lib/chem-utils";

interface QuizEngineProps {
  questions: QuestionRecord[];
  title: string;
  quizKey: string;
  courseSlug: string;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  timerEnabled: boolean;
  currentXp: number;
  unlockedBadges: string[];
  onQuit: () => void;
  onComplete: (result: {
    score: number;
    totalQuestions: number;
    percentage: number;
    bestStreak: number;
    durationSeconds: number;
    quizKey: string;
    quizTitle: string;
    courseSlug: string;
  }) => Promise<void> | void;
  onOpenCertificate: (reason: string) => void;
}

interface WrongItem {
  question: QuestionRecord;
  selectedKey: string | null;
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export function QuizEngine({
  questions: initialQuestions,
  title,
  quizKey,
  courseSlug,
  soundEnabled,
  voiceEnabled,
  timerEnabled,
  currentXp,
  unlockedBadges,
  onQuit,
  onComplete,
  onOpenCertificate,
}: QuizEngineProps) {
  const [quizList, setQuizList] = useState<QuestionRecord[]>(initialQuestions);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [wrongList, setWrongList] = useState<WrongItem[]>([]);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [streakBanner, setStreakBanner] = useState<string | null>(null);

  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef<boolean>(false);

  const currentQuestion = quizList[index];

  const handleAnswer = useCallback(
    (choice: string | null) => {
      if (answered || !currentQuestion) return;
      setAnswered(true);
      setSelectedKey(choice);
      setTimedOut(choice === null);

      const isCorrect = choice === currentQuestion.correctAnswer;
      if (isCorrect) {
        const nextScore = score + 1;
        const nextStreak = streak + 1;
        setScore(nextScore);
        setStreak(nextStreak);
        setBestStreak((prev) => Math.max(prev, nextStreak));

        const praise =
          PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
        setFeedbackMsg(praise);

        if ([3, 5, 10].includes(nextStreak)) {
          soundFx.fanfare(soundEnabled);
          triggerConfetti(140);
          setStreakBanner(`سلسلة ${nextStreak} إجابات صحيحة متتالية!`);
          setTimeout(() => setStreakBanner(null), 2200);
          speakArabic(`رائع! ${nextStreak} إجابات صحيحة متتالية`, voiceEnabled);
        } else {
          soundFx.ok(soundEnabled);
          triggerConfetti(45);
          speakArabic(praise, voiceEnabled);
        }
      } else {
        setStreak(0);
        const enc =
          choice === null
            ? "انتهى الوقت المحدد للسؤال"
            : ENCOURAGE_MESSAGES[
                Math.floor(Math.random() * ENCOURAGE_MESSAGES.length)
              ];
        setFeedbackMsg(enc);
        setWrongList((prev) => [
          ...prev,
          { question: currentQuestion, selectedKey: choice },
        ]);
        soundFx.bad(soundEnabled);
      }
    },
    [answered, currentQuestion, score, streak, soundEnabled, voiceEnabled]
  );

  // Countdown timer effect
  useEffect(() => {
    if (!timerEnabled || answered || finished) return;
    setTimeLeft(30);
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          handleAnswer(null);
          return 0;
        }
        if (prev - 1 <= 5) {
          soundFx.tick(soundEnabled);
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [index, timerEnabled, answered, finished, soundEnabled, handleAnswer]);

  const handleNext = useCallback(async () => {
    if (index + 1 < quizList.length) {
      setIndex((i) => i + 1);
      setAnswered(false);
      setSelectedKey(null);
      setTimedOut(false);
      setFeedbackMsg("");
    } else {
      setFinished(true);
      const pct = Math.round((score / quizList.length) * 100);
      const stars = computeStars(pct);
      if (stars >= 2) {
        soundFx.win(soundEnabled);
        triggerConfetti(210);
      } else {
        soundFx.ok(soundEnabled);
      }
      speakArabic(
        stars === 3
          ? "أداء مذهل! أنت بطل التحصيلي"
          : stars >= 1
          ? "أحسنت، استمر في التدريب"
          : "لا بأس، راجع الأخطاء وحاول مجددًا",
        voiceEnabled
      );

      if (!submittedRef.current) {
        submittedRef.current = true;
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000)
        );
        await onComplete({
          score,
          totalQuestions: quizList.length,
          percentage: pct,
          bestStreak,
          durationSeconds,
          quizKey,
          quizTitle: title,
          courseSlug,
        });
      }
    }
  }, [
    index,
    quizList.length,
    score,
    soundEnabled,
    voiceEnabled,
    onComplete,
    bestStreak,
    quizKey,
    title,
    courseSlug,
  ]);

  // Keyboard navigation
  useEffect(() => {
    if (finished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const k = e.key.toUpperCase();
      if (!answered) {
        if (k === "1" || k === "A") handleAnswer("A");
        else if (k === "2" || k === "B") handleAnswer("B");
        else if (k === "3" || k === "C") handleAnswer("C");
        else if (k === "4" || k === "D") handleAnswer("D");
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, answered, handleAnswer, handleNext]);

  const handleRetry = () => {
    setQuizList(shuffleArray(initialQuestions));
    setIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSelectedKey(null);
    setAnswered(false);
    setTimedOut(false);
    setFeedbackMsg("");
    setWrongList([]);
    setFinished(false);
    startedAtRef.current = Date.now();
    submittedRef.current = false;
  };

  if (!quizList.length) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center space-y-4">
        <p className="text-lg font-bold">لا توجد أسئلة متاحة في هذا القسم حاليًا.</p>
        <button
          type="button"
          onClick={onQuit}
          className="px-5 py-2.5 rounded-xl bg-[#0B4F6C] text-white font-bold cursor-pointer"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  // ---------- Results Screen
  if (finished) {
    const total = quizList.length;
    const pct = Math.round((score / total) * 100);
    const stars = computeStars(pct);
    const prevLevel = computeLevel(currentXp);
    const newLevel = computeLevel(currentXp + score);

    const newlyEarnedBadges = BADGES.filter((b) => {
      if (unlockedBadges.includes(b.id)) return false;
      if (b.id === "first" && currentXp + score >= 1) return true;
      if (b.id === "s5" && bestStreak >= 5) return true;
      if (b.id === "s10" && bestStreak >= 10) return true;
      if (b.id === "l3" && quizKey.includes(":l") && pct >= 90) return true;
      if (b.id === "ch" && quizKey.includes(":c") && pct >= 70) return true;
      if (b.id === "all90" && (quizKey.includes(":u") || quizKey === "full") && pct >= 90)
        return true;
      if (b.id === "hero" && currentXp + score >= 250) return true;
      return false;
    });

    return (
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8 text-center space-y-5 shadow-sm">
        <h2 className="font-display-ar text-3xl md:text-4xl font-extrabold text-[var(--petrol)] dark:text-[#7FD3CE]">
          {stars === 3
            ? "أداء مذهل وتفوّق باهر!"
            : stars === 2
            ? "أحسنت! نتيجة رائعة"
            : stars === 1
            ? "بداية جيدة، واصل التدريب"
            : "لنراجع الأخطاء معًا"}
        </h2>

        <div
          className="text-4xl md:text-5xl tracking-widest select-none"
          aria-label={`${stars} من 3 نجوم`}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={i < stars ? "text-[#F5B83D]" : "text-[var(--line)]"}
            >
              ★
            </span>
          ))}
        </div>

        <div className="font-display-ar text-5xl md:text-6xl font-extrabold text-[var(--ink)]">
          <bdi dir="ltr">
            {score}/{total}
          </bdi>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-base">
          <span className="px-4 py-1.5 rounded-full bg-[var(--chip)] font-bold">
            النسبة: <b className="text-[var(--coral)]">{pct}%</b>
          </span>
          <span className="px-4 py-1.5 rounded-full bg-[var(--chip)] font-bold">
            أطول سلسلة صحيحة: <b className="text-[var(--turq)]">{bestStreak}</b>
          </span>
          <span className="px-4 py-1.5 rounded-full bg-[var(--chip)] font-bold">
            الرصيد المكتسب: <b>+{score}</b> نقطة
          </span>
        </div>

        <p className="text-sm md:text-base text-[var(--muted)]">
          المستوى الحالي: <b className="text-[var(--ink)]">{newLevel.name}</b>
          {newLevel.index > prevLevel.index && (
            <span className="mr-2 inline-flex items-center gap-1 text-[#2E9E5B] font-bold">
              <Sparkles className="w-4 h-4" />
              ارتقيت لمستوى جديد!
            </span>
          )}
        </p>

        {newlyEarnedBadges.length > 0 && (
          <div className="max-w-xl mx-auto pt-2">
            <h3 className="font-display-ar text-lg font-bold mb-3 text-[#F4845F]">
              إنجازات جديدة حققتها في هذه الجولة:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {newlyEarnedBadges.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-3 flex flex-col items-center gap-1"
                >
                  <BadgeIcon type={b.icon} className="w-11 h-11" />
                  <b className="font-display-ar text-base">{b.title}</b>
                  <small className="text-xs text-[var(--muted)]">{b.desc}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#F4845F] text-white font-bold text-base btn-tactile cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            أعد المحاولة
          </button>

          <button
            type="button"
            onClick={onQuit}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#3AAFA9] text-white font-bold text-base btn-tactile-turq cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للمقرر
          </button>

          {stars === 3 && (
            <button
              type="button"
              onClick={() => onOpenCertificate(`تحقيق ${pct}% في ${title}`)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#F5B83D] text-[#16303B] font-bold text-base btn-tactile-gold cursor-pointer"
            >
              <Award className="w-5 h-5" />
              اعرض شهادتك
            </button>
          )}
        </div>

        {/* Mistake Review */}
        {wrongList.length > 0 && (
          <div className="text-right mt-8 pt-6 border-t border-[var(--line)] space-y-3">
            <h3 className="font-display-ar text-xl font-bold text-[var(--ink)]">
              راجع أخطاءك ({wrongList.length}):
            </h3>
            <div className="space-y-3">
              {wrongList.map(({ question: q, selectedKey: chosen }, idx) => {
                const chosenIdx = chosen ? OPTION_KEYS.indexOf(chosen as "A" | "B" | "C" | "D") : -1;
                const correctIdx = OPTION_KEYS.indexOf(
                  q.correctAnswer as "A" | "B" | "C" | "D"
                );
                return (
                  <div
                    key={`${q.id}-${idx}`}
                    className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 space-y-2"
                  >
                    <div className="font-bold text-base">
                      <span className="text-[var(--coral)] ml-1">{idx + 1}.</span>
                      <ChemText text={q.questionText} />
                    </div>
                    {q.equation && (
                      <div className="text-center font-bold text-[#F4845F] text-base py-1">
                        <ChemText text={q.equation} isEquation />
                      </div>
                    )}
                    <div className="text-sm flex flex-wrap gap-x-4 gap-y-1">
                      {chosen && chosenIdx >= 0 ? (
                        <span>
                          إجابتك:{" "}
                          <span className="font-bold text-[#D24B45]">
                            {chosen}) <ChemText text={q.options[chosenIdx]} />
                          </span>
                        </span>
                      ) : (
                        <span className="font-bold text-[#D24B45]">لم تُجب في الوقت</span>
                      )}
                      <span>
                        الإجابة الصحيحة:{" "}
                        <span className="font-bold text-[#2E9E5B]">
                          {q.correctAnswer}) <ChemText text={q.options[correctIdx]} />
                        </span>
                      </span>
                    </div>
                    <div className="text-sm text-[var(--muted)] bg-[var(--surface)] rounded-lg p-2.5 border border-[var(--line)]">
                      <b className="text-[var(--ink)]">التفسير: </b>
                      <ChemText text={q.explanation} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  // ---------- Active Question View
  const progressPct = Math.round((index / quizList.length) * 100);

  return (
    <div className="space-y-4">
      {streakBanner && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B4F6C] text-white px-5 py-2.5 rounded-full font-display-ar text-lg shadow-xl border-2 border-[#F4845F]">
          {streakBanner}
        </div>
      )}

      {/* Top Progress Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onQuit}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm font-bold hover:border-[var(--coral)] cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          إنهاء والعودة
        </button>

        <div
          className="flex-1 min-w-[160px] h-2.5 rounded-full bg-[var(--line)] overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #3AAFA9, #F4845F)",
            }}
          />
        </div>

        <span className="text-xs md:text-sm bg-[var(--surface)] border border-[var(--line)] rounded-full px-3 py-1 font-medium whitespace-nowrap">
          سؤال <b className="font-display-ar">{index + 1}</b> من {quizList.length}
        </span>

        <span className="text-xs md:text-sm bg-[var(--surface)] border border-[var(--line)] rounded-full px-3 py-1 font-medium whitespace-nowrap">
          النقاط <b className="font-display-ar text-[#2E9E5B]">{score}</b>
        </span>

        <span className="inline-flex items-center gap-1 text-xs md:text-sm bg-[var(--surface)] border border-[var(--line)] rounded-full px-3 py-1 font-medium whitespace-nowrap">
          <Flame className="w-3.5 h-3.5 text-[#F4845F]" />
          سلسلة <b className="font-display-ar">{streak}</b>
        </span>

        {timerEnabled && (
          <span
            className={`inline-flex items-center gap-1 text-xs md:text-sm bg-[var(--surface)] border rounded-full px-3 py-1 font-bold tabular-nums whitespace-nowrap ${
              timeLeft <= 5
                ? "border-[#D24B45] text-[#D24B45] animate-pulse"
                : "border-[var(--line)]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {timeLeft} ث
          </span>
        )}
      </div>

      {/* Focused Question Card */}
      <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 md:p-7 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-[var(--muted)]">
          <span
            className={`text-white rounded-md px-2.5 py-0.5 font-bold text-xs ${
              currentQuestion.sourceType === "T" ? "bg-[#F4845F]" : "bg-[#3AAFA9]"
            }`}
          >
            {currentQuestion.sourceType === "T" ? "تحصيلي" : "تدريب"}
          </span>
          <span className="font-bold text-[var(--ink)]">
            <ChemText text={title} />
          </span>
          {currentQuestion.courseTitle && (
            <span>· {currentQuestion.courseTitle}</span>
          )}
          {currentQuestion.lessonCode && (
            <span className="inline-flex items-center gap-1">
              · الدرس <bdi dir="ltr">{currentQuestion.lessonCode}</bdi>
              {currentQuestion.lessonPage ? ` (ص ${currentQuestion.lessonPage})` : ""}
            </span>
          )}
        </div>

        <div className="text-lg md:text-2xl font-bold leading-relaxed text-[var(--ink)]">
          <ChemText text={currentQuestion.questionText} />
        </div>

        {currentQuestion.equation && (
          <div className="rounded-xl bg-[var(--bg)] border border-[var(--line)] py-2.5 px-4 text-center font-bold text-[#F4845F] text-lg md:text-xl overflow-x-auto">
            <ChemText text={currentQuestion.equation} isEquation />
          </div>
        )}

        {/* 4 Choices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {OPTION_KEYS.map((letter, idx) => {
            const optionText = currentQuestion.options[idx] ?? "";
            const isCorrect = answered && letter === currentQuestion.correctAnswer;
            const isWrongChosen =
              answered && letter === selectedKey && letter !== currentQuestion.correctAnswer;

            let btnClasses =
              "bg-[var(--bg)] border-[var(--line)] hover:border-[var(--turq)]";
            let circleClasses = "bg-[#3AAFA9] text-white";

            if (isCorrect) {
              btnClasses =
                "bg-[var(--okbg)] border-[#2E9E5B] text-[var(--ink)]";
              circleClasses = "bg-[#2E9E5B] text-white";
            } else if (isWrongChosen) {
              btnClasses =
                "bg-[var(--badbg)] border-[#D24B45] text-[var(--ink)] animate-shake";
              circleClasses = "bg-[#D24B45] text-white";
            }

            return (
              <button
                key={letter}
                type="button"
                disabled={answered}
                onClick={() => handleAnswer(letter)}
                className={`text-right flex items-center gap-3 rounded-2xl border-2 p-3.5 text-base md:text-lg font-medium transition-colors min-w-0 ${btnClasses} ${
                  answered ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <span
                  className={`flex-none w-8 h-8 rounded-full grid place-items-center font-bold text-sm font-sans ${circleClasses}`}
                >
                  {letter}
                </span>
                <span className="flex-1 min-w-0 break-words">
                  <ChemText text={optionText} />
                </span>
                {isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-[#2E9E5B] flex-none" />
                )}
                {isWrongChosen && (
                  <XCircle className="w-5 h-5 text-[#D24B45] flex-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Box */}
        {answered && (
          <div
            aria-live="polite"
            className={`rounded-2xl p-4 border-2 space-y-1.5 ${
              selectedKey === currentQuestion.correctAnswer
                ? "bg-[var(--okbg)] border-[#2E9E5B]"
                : "bg-[var(--badbg)] border-[#D24B45]"
            }`}
          >
            <div className="font-display-ar text-xl font-bold">
              {feedbackMsg}
            </div>
            <div className="text-sm md:text-base">
              {selectedKey !== currentQuestion.correctAnswer && (
                <span className="ml-2">
                  الإجابة الصحيحة:{" "}
                  <b className="text-[#2E9E5B]">{currentQuestion.correctAnswer}</b>.{" "}
                </span>
              )}
              <b>التفسير العلمي: </b>
              <ChemText text={currentQuestion.explanation} />
            </div>
            {currentQuestion.note && (
              <div className="text-xs md:text-sm text-[var(--muted)] pt-1 flex items-start gap-1.5">
                <BookOpen className="w-4 h-4 flex-none mt-0.5 text-[var(--petrol)]" />
                <span>
                  <b>ملاحظة: </b>
                  <ChemText text={currentQuestion.note} />
                </span>
              </div>
            )}
            {timedOut && (
              <div className="text-xs text-[#D24B45] font-bold">
                تلميح: يمكنك إيقاف مؤقت الـ 30 ثانية من الشريط العلوي للتدريب الهادئ.
              </div>
            )}
          </div>
        )}

        {/* Next Button */}
        {answered && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleNext}
              className="px-7 py-3 rounded-2xl bg-[#F4845F] text-white font-bold text-base md:text-lg btn-tactile cursor-pointer"
            >
              {index + 1 < quizList.length ? "السؤال التالي ←" : "عرض النتيجة النهائية"}
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
