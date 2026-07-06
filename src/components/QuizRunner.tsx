"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OptionKey, Question } from "@/types/question";
import { Markdown } from "@/components/Markdown";
import type { AnswerRecord } from "@/lib/storage";
import { saveAnswers, loadBookmarks, setBookmark } from "@/lib/progress";
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
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<Record<string, OptionKey>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);

  const { userId } = useAuth();
  const { lang } = useLang();
  const current = questions[idx];
  const locCurrent = localizeQuestion(current, lang);
  const answeredCount = Object.keys(chosen).length;

  // Load persisted bookmarks (from Supabase if logged in, else localStorage).
  useEffect(() => {
    loadBookmarks().then(setBookmarks);
  }, [userId]);

  const finish = useCallback(async () => {
    const recs: AnswerRecord[] = questions.map((q) => ({
      questionId: q.id,
      chosen: chosen[q.id] ?? "",
      correct: chosen[q.id] === q.answer,
      subtopic: q.subtopic,
      category: q.category,
      mode,
      ts: Date.now(),
    }));
    await saveAnswers(recs);
    setDone(true);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [questions, chosen, mode]);

  // Countdown timer for timed (mock) mode.
  useEffect(() => {
    if (!timeLimitSec || done) return;
    if (timeLeft <= 0) {
      finish();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, done, timeLimitSec, finish]);

  const correctCount = useMemo(
    () => questions.filter((q) => chosen[q.id] === q.answer).length,
    [questions, chosen]
  );

  if (done) {
    return (
      <Results
        questions={questions}
        chosen={chosen}
        correctCount={correctCount}
        title={title}
      />
    );
  }

  const pick = (key: OptionKey) =>
    setChosen((c) => ({ ...c, [current.id]: key }));

  const toggleMark = async () => {
    const on = !bookmarks.has(current.id);
    await setBookmark(current.id, on);
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (on) next.add(current.id);
      else next.delete(current.id);
      return next;
    });
  };

  return (
    <div>
      {/* header row */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-xs text-slate-500">
            {idx + 1} / {questions.length} 문항 · 답변 {answeredCount}개
          </p>
        </div>
        <div className="flex items-center gap-3">
          {timeLimitSec ? (
            <span
              className={`rounded-md px-2 py-1 text-sm font-medium tabular-nums ${
                timeLeft < 60 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              ⏱ {fmtTime(timeLeft)}
            </span>
          ) : null}
          <button
            onClick={toggleMark}
            title="나중에 다시 풀 문항으로 저장 (홈의 '북마크 복습'에서 모아 볼 수 있어요)"
            className={`rounded-md border px-2 py-1 text-sm ${
              bookmarks.has(current.id)
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-slate-300 text-slate-600"
            }`}
          >
            {bookmarks.has(current.id) ? "⭐ 북마크됨" : "☆ 북마크"}
          </button>
        </div>
      </div>

      {/* question palette */}
      <div className="mb-4 flex flex-wrap gap-1">
        {questions.map((q, i) => {
          const isCur = i === idx;
          const isAns = chosen[q.id] !== undefined;
          const isMarked = bookmarks.has(q.id);
          return (
            <button
              key={q.id}
              onClick={() => setIdx(i)}
              title={q.subtopic}
              className={`h-7 w-7 rounded text-xs font-medium ${
                isCur
                  ? "bg-rose-600 text-white"
                  : isMarked
                    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-400"
                    : isAns
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-600"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* question card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
            {current.category}
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
            {current.subtopic}
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">
            {current.difficulty}
          </span>
        </div>

        <div className="text-[15px] font-medium text-slate-900">
          <Markdown>{locCurrent.stem}</Markdown>
        </div>

        {locCurrent.diagram ? (
          <div className="mt-3">
            <Markdown>{locCurrent.diagram}</Markdown>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {locCurrent.options.map((opt) => {
            const selected = chosen[current.id] === opt.key;
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

        {idx < questions.length - 1 ? (
          <button
            onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white"
          >
            다음 →
          </button>
        ) : (
          <button
            onClick={() => {
              if (
                answeredCount < questions.length &&
                !confirm(
                  `아직 ${questions.length - answeredCount}문항이 미답변입니다. 그래도 제출할까요?`
                )
              )
                return;
              finish();
            }}
            className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white"
          >
            제출하고 채점
          </button>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-xs text-slate-400 underline">
          그만두고 홈으로
        </Link>
      </div>
    </div>
  );
}

/* ---------------- Results ---------------- */

function Results({
  questions,
  chosen,
  correctCount,
  title,
}: {
  questions: Question[];
  chosen: Record<string, OptionKey>;
  correctCount: number;
  title: string;
}) {
  const { lang } = useLang();
  const total = questions.length;
  const pct = Math.round((correctCount / total) * 100);
  const passed = pct >= 70;

  // per-subtopic breakdown
  const bySub = new Map<string, { correct: number; total: number }>();
  for (const q of questions) {
    const s = bySub.get(q.subtopic) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (chosen[q.id] === q.answer) s.correct += 1;
    bySub.set(q.subtopic, s);
  }

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-500">{title} · 결과</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">
          {correctCount}
          <span className="text-slate-400"> / {total}</span>
        </p>
        <p
          className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
            passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          }`}
        >
          {pct}% · {passed ? "합격선(70%) 통과 ✓" : "합격선(70%) 미달"}
        </p>
      </div>

      {/* subtopic breakdown */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">주제별 정답률</h2>
        <div className="space-y-2">
          {[...bySub.entries()].map(([sub, s]) => {
            const p = Math.round((s.correct / s.total) * 100);
            return (
              <div key={sub} className="flex items-center gap-3 text-sm">
                <span className="w-56 shrink-0 truncate text-slate-600">{sub}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className={`h-full ${p >= 70 ? "bg-emerald-500" : "bg-rose-400"}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">
                  {s.correct}/{s.total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* per-question review */}
      <h2 className="mt-6 mb-2 text-sm font-semibold">문항별 해설</h2>
      <div className="space-y-3">
        {questions.map((q, i) => {
          const mine = chosen[q.id];
          const ok = mine === q.answer;
          const loc = localizeQuestion(q, lang);
          return (
            <div
              key={q.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                ok ? "border-emerald-200" : "border-rose-200"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Q{i + 1} · {q.subtopic}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    ok ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {ok ? "정답 ✓" : "오답 ✗"}
                </span>
              </div>
              <div className="text-sm font-medium">
                <Markdown>{loc.stem}</Markdown>
              </div>
              {loc.diagram ? (
                <div className="mt-2">
                  <Markdown>{loc.diagram}</Markdown>
                </div>
              ) : null}

              <div className="mt-3 space-y-1 text-sm">
                {loc.options.map((opt) => {
                  const isAnswer = opt.key === q.answer;
                  const isMine = opt.key === mine;
                  return (
                    <div
                      key={opt.key}
                      className={`rounded px-2 py-1 ${
                        isAnswer
                          ? "bg-emerald-50 text-emerald-800"
                          : isMine
                            ? "bg-rose-50 text-rose-800"
                            : "text-slate-600"
                      }`}
                    >
                      <span className="font-semibold">{opt.key}.</span> {opt.text}
                      {isAnswer ? " ← 정답" : isMine ? " ← 내 선택" : ""}
                    </div>
                  );
                })}
                {mine === undefined ? (
                  <div className="text-xs text-slate-400">(미답변)</div>
                ) : null}
              </div>

              <details className="mt-3" open>
                <summary className="cursor-pointer text-sm font-medium text-rose-600">
                  해설
                </summary>
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <Markdown>{q.explanation}</Markdown>
                  {q.distractors ? (
                    <div className="mt-3 border-t border-slate-200 pt-2">
                      <p className="mb-1 text-xs font-semibold text-slate-500">
                        오답 정리
                      </p>
                      {typeof q.distractors === "string" ? (
                        <div className="text-xs text-slate-600">
                          <Markdown>{q.distractors}</Markdown>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {Object.entries(q.distractors).map(([k, v]) => (
                            <li key={k} className="text-xs text-slate-600">
                              <span className="font-semibold">{k}.</span> {v}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-400">출처: {q.source}</p>
                </div>
              </details>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
