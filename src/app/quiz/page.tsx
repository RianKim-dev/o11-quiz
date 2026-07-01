"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import QuizClient from "@/components/QuizClient";

function QuizInner() {
  const sp = useSearchParams();
  const mode = sp.get("mode") ?? "all";
  const subtopic = sp.get("subtopic") ?? undefined;
  return <QuizClient mode={mode} subtopic={subtopic} />;
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={<p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>}
    >
      <QuizInner />
    </Suspense>
  );
}
