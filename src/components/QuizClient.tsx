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
import { wrongIdsFrom } from "@/lib/storage";
import { loadAnswers, loadBookmarks } from "@/lib/progress";

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
      if (mode === "mock" || mode === "practice") {
        // Prefer questions the user hasn't answered yet (blueprint ratio kept).
        const answered = new Set((await loadAnswers()).map((r) => r.questionId));
        const { questions: mq, shortfall } = assembleMockFrom(answered);
        qs = mq;
        t = mode === "practice" ? "연습 모드" : "모의고사";
        n =
          shortfall > 0
            ? `실제 시험은 50문항이지만 현재 은행에 문항이 부족해 ${qs.length}문항으로 구성했어요.`
            : mode === "practice"
              ? "연습 모드는 성적에 반영되지 않아요. 각 문항의 '정답 확인'을 열어 해설을 보며 풀어보세요."
              : "";
      } else if (mode === "topic" && subtopic) {
        qs = shuffle(getBySubtopic(subtopic));
        t = subtopic;
      } else if (mode === "review") {
        const wrong = wrongIdsFrom(await loadAnswers());
        qs = shuffle(ALL_QUESTIONS.filter((q) => wrong.has(q.id)));
        t = "오답 복습";
      } else if (mode === "bookmark") {
        const marks = await loadBookmarks();
        qs = shuffle(ALL_QUESTIONS.filter((q) => marks.has(q.id)));
        t = "북마크 복습";
      } else {
        qs = shuffle(ALL_QUESTIONS);
        t = "전체 연습";
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
            ? "복습할 오답이 없어요. 먼저 문제를 풀어보세요!"
            : mode === "bookmark"
              ? "북마크한 문항이 없어요. 퀴즈 중 ☆ 북마크를 눌러 저장해보세요."
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
