"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Question } from "@/types/question";
import QuizRunner from "@/components/QuizRunner";
import {
  ALL_QUESTIONS,
  assembleMockFrom,
  getBySubtopic,
  shuffle,
} from "@/lib/questions";
import { loadStatuses } from "@/lib/progress";

interface Props {
  mode: string;
  subtopic?: string;
}

export default function QuizClient({ mode, subtopic }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let qs: Question[] = [];
      let t = "";
      let n = "";
      const statuses = await loadStatuses();
      const known = new Set(
        [...statuses].filter(([, s]) => s === "known").map(([id]) => id)
      );
      const practiceNote =
        "연습 모드는 성적에 반영되지 않아요. '정답 확인'을 열어 해설을 보고, '알아요/몰라요'로 표시해 보세요.";

      if (mode === "mock") {
        // Prefer questions not yet marked "알아요" (focus on what you don't know).
        const { questions: mq, shortfall } = assembleMockFrom(known);
        qs = mq;
        t = "모의고사";
        n =
          shortfall > 0
            ? `실제 시험은 50문항이지만 현재 은행에 문항이 부족해 ${qs.length}문항으로 구성했어요.`
            : "";
      } else if (mode === "review") {
        // The "다시 볼 목록" — questions marked 몰라요.
        qs = shuffle(ALL_QUESTIONS.filter((q) => statuses.get(q.id) === "review"));
        t = "다시 볼 목록";
      } else if (mode === "unknown") {
        // The "미확인 목록" — questions not yet marked either way.
        qs = shuffle(ALL_QUESTIONS.filter((q) => !statuses.get(q.id)));
        t = "미확인 목록";
        n = practiceNote;
      } else if (mode === "practice" && subtopic) {
        qs = shuffle(getBySubtopic(subtopic));
        t = `연습 · ${subtopic}`;
        n = practiceNote;
      } else {
        // 연습 모드 — same 50-question blueprint as the mock, but untimed + with explanations.
        const { questions: mq, shortfall } = assembleMockFrom(known);
        qs = mq;
        t = "연습 모드";
        n =
          shortfall > 0
            ? `현재 은행에 문항이 부족해 ${qs.length}문항으로 구성했어요. ${practiceNote}`
            : practiceNote;
      }
      if (!cancelled) {
        setQuestions(qs);
        setTitle(t);
        setNote(n);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, subtopic]);

  if (!questions) {
    return <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>;
  }

  if (questions.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500">
          {mode === "review"
            ? "다시 볼 문항이 없어요. 문제를 풀며 '몰라요'로 표시하면 여기에 모입니다."
            : mode === "unknown"
              ? "미확인 문항이 없어요. 모든 문항을 '알아요' 또는 '몰라요'로 표시하셨네요! 👏"
              : "이 조건에 해당하는 문항이 아직 없어요."}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
        >
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      {note ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {note}
        </p>
      ) : null}
      <QuizRunner
        questions={questions}
        title={title}
        mode={mode}
        timeLimitSec={mode === "mock" ? 120 * 60 : undefined}
      />
    </div>
  );
}
