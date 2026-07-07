"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OptionKey, Question } from "@/types/question";
import { Markdown } from "@/components/Markdown";
import { loadStatuses, setStatus as saveStatus, setStatusBulk } from "@/lib/progress";
import type { QStatus } from "@/lib/status";
import { useAuth } from "@/lib/auth";
import { useLang, localizeQuestion } from "@/lib/i18n";

interface Props {
  questions: Question[];
  title: string;
  mode: string;
  timeLimitSec?: number;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuizRunner({ questions, title, mode, timeLimitSec }: Props) {
  const timed = mode === "mock";
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<Record<string, OptionKey>>({});
  const [statusMap, setStatusMap] = useState<Map<string, QStatus>>(new Map());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);

  const { userId } = useAuth();
  const { lang } = useLang();

  useEffect(() => {
    loadStatuses().then(setStatusMap);
  }, [userId]);

  const current = questions[idx];
  const loc = localizeQuestion(current, lang);
  const total = questions.length;
  const answeredCount = Object.keys(chosen).length;
  const correctCount = useMemo(
    () => questions.filter((q) => chosen[q.id] === q.answer).length,
    [questions, chosen]
  );

  const submit = useCallback(() => {
    setSubmitted(true);
    setIdx(0);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  // Countdown (mock only).
  useEffect(() => {
    if (!timeLimitSec || submitted) return;
    if (timeLeft <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted, timeLimitSec, submit]);

  const solving = timed && !submitted; // blind solving phase of a mock
  const isRevealed = (q: Question) => submitted || revealed.has(q.id);
  const reveal = (id: string) => setRevealed((s) => new Set(s).add(id));
  const pick = (key: OptionKey) =>
    setChosen((c) => ({ ...c, [current.id]: key }));

  const mark = async (id: string, s: QStatus) => {
    const next = statusMap.get(id) === s ? null : s; // click again to clear
    setStatusMap((prev) => {
      const m = new Map(prev);
      if (next) m.set(id, next);
      else m.delete(id);
      return m;
    });
    await saveStatus(id, next);
  };

  const bulk = async (kind: "wrongReview" | "correctKnown" | "correctUnseenKnown") => {
    const entries: { id: string; status: QStatus }[] = [];
    for (const q of questions) {
      const ok = chosen[q.id] === q.answer;
      if (kind === "wrongReview" && !ok) entries.push({ id: q.id, status: "review" });
      else if (kind === "correctKnown" && ok) entries.push({ id: q.id, status: "known" });
      else if (kind === "correctUnseenKnown" && ok && !statusMap.has(q.id))
        entries.push({ id: q.id, status: "known" });
    }
    if (!entries.length) return;
    setStatusMap((prev) => {
      const m = new Map(prev);
      for (const e of entries) m.set(e.id, e.status);
      return m;
    });
    await setStatusBulk(entries);
  };

  const pct = total ? Math.round((correctCount / total) * 100) : 0;
  const passed = pct >= 70;
  const revealedNow = isRevealed(current);
  const curStatus = statusMap.get(current.id);

  return (
    <div>
      {/* header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-xs text-slate-500">
            {idx + 1} / {total} 문항
            {solving ? ` · 답변 ${answeredCount}개` : ""}
          </p>
        </div>
        {solving && timeLimitSec ? (
          <span
            className={`rounded-md px-2 py-1 text-sm font-medium tabular-nums ${
              timeLeft < 60 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            ⏱ {fmtTime(timeLeft)}
          </span>
        ) : null}
      </div>

      {/* score + bulk actions (after a mock is submitted) */}
      {submitted ? (
        <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">채점 결과</span>
            <span className="text-sm tabular-nums">
              <b className="text-lg">{correctCount}</b>
              <span className="text-slate-400"> / {total}</span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {pct}% · {passed ? "합격선 통과 ✓" : "합격선 미달"}
              </span>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <span className="self-center text-xs text-slate-400">일괄 표시:</span>
            <button
              onClick={() => bulk("wrongReview")}
              className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100"
            >
              틀린 것 → 몰라요
            </button>
            <button
              onClick={() => bulk("correctKnown")}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
            >
              맞은 것 → 알아요
            </button>
            <button
              onClick={() => bulk("correctUnseenKnown")}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              맞은 미확인만 → 알아요
            </button>
          </div>
        </div>
      ) : null}

      {/* number palette */}
      <div className="mb-4 flex flex-wrap gap-1">
        {questions.map((q, i) => {
          const isCur = i === idx;
          if (solving) {
            const isAns = chosen[q.id] !== undefined;
            return (
              <button
                key={q.id}
                onClick={() => setIdx(i)}
                title={q.subtopic}
                className={`h-7 w-7 rounded text-xs font-medium ${
                  isCur
                    ? "bg-rose-600 text-white"
                    : isAns
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {i + 1}
              </button>
            );
          }
          const st = statusMap.get(q.id);
          const bg =
            st === "known"
              ? "bg-emerald-100 text-emerald-700"
              : st === "review"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-200 text-slate-600";
          const ok = chosen[q.id] === q.answer;
          return (
            <button
              key={q.id}
              onClick={() => setIdx(i)}
              title={`${q.subtopic}${st === "known" ? " · 알아요" : st === "review" ? " · 몰라요" : ""}`}
              className={`relative h-7 w-7 rounded text-xs font-medium ${bg} ${
                isCur ? "ring-2 ring-rose-500" : ""
              }`}
            >
              {i + 1}
              {submitted ? (
                <span
                  className={`absolute -right-1 -top-1.5 text-[10px] ${
                    ok ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {ok ? "✓" : "✗"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* question card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">{current.category}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">{current.subtopic}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">{current.difficulty}</span>
          {submitted ? (
            <span
              className={`rounded px-2 py-0.5 font-semibold ${
                chosen[current.id] === current.answer
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {chosen[current.id] === current.answer ? "정답 ✓" : "오답 ✗"}
            </span>
          ) : null}
        </div>

        <div className="text-[15px] font-medium text-slate-900">
          <Markdown>{loc.stem}</Markdown>
        </div>
        {loc.diagram ? (
          <div className="mt-3">
            <Markdown>{loc.diagram}</Markdown>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {loc.options.map((opt) => {
            const selected = chosen[current.id] === opt.key;
            if (revealedNow) {
              const isAnswer = opt.key === current.answer;
              return (
                <div
                  key={opt.key}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                    isAnswer
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : selected
                        ? "border-rose-300 bg-rose-50 text-rose-900"
                        : "border-slate-200 text-slate-700"
                  }`}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold">
                    {opt.key}
                  </span>
                  <span>
                    {opt.text}
                    {isAnswer ? " ← 정답" : selected ? " ← 내 선택" : ""}
                  </span>
                </div>
              );
            }
            return (
              <button
                key={opt.key}
                onClick={() => pick(opt.key)}
                className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-rose-500 bg-rose-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    selected ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {opt.key}
                </span>
                <span className="text-sm text-slate-800">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* reveal (practice/review only) */}
        {!timed && !revealedNow ? (
          <button
            onClick={() => reveal(current.id)}
            className="mt-4 w-full rounded-lg border border-rose-200 bg-rose-50 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
          >
            정답 확인 · 해설 보기
          </button>
        ) : null}

        {/* explanation + status buttons (when revealed) */}
        {revealedNow ? (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <details open className="rounded-lg bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-rose-600">해설</summary>
              <div className="mt-2 text-sm">
                <Markdown>{current.explanation}</Markdown>
              </div>
            </details>
            <p className="mb-1 mt-3 text-xs text-slate-400">이 문항, 이제 어떤가요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => mark(current.id, "known")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium ${
                  curStatus === "known"
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                알아요 ✓
              </button>
              <button
                onClick={() => mark(current.id, "review")}
                title="'몰라요'로 표시하면 홈의 '다시 볼 목록'에 모입니다"
                className={`flex-1 rounded-lg border py-2 text-sm font-medium ${
                  curStatus === "review"
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-amber-300 text-amber-700 hover:bg-amber-50"
                }`}
              >
                몰라요 🔖
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* nav */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          ← 이전
        </button>

        {idx < total - 1 ? (
          <button
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white"
          >
            다음 →
          </button>
        ) : solving ? (
          <button
            onClick={() => {
              if (
                answeredCount < total &&
                !confirm(`아직 ${total - answeredCount}문항이 미답변입니다. 제출하고 채점할까요?`)
              )
                return;
              submit();
            }}
            className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white"
          >
            제출하고 채점
          </button>
        ) : (
          <Link
            href="/"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white"
          >
            홈으로
          </Link>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-xs text-slate-400 underline">
          {solving ? "그만두고 홈으로" : "홈으로"}
        </Link>
      </div>
    </div>
  );
}
