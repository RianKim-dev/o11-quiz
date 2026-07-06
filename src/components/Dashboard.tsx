"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MANIFEST, countFor } from "@/lib/manifest";
import { BLUEPRINT, CATEGORY_ORDER } from "@/lib/blueprint";
import { latestByQuestion } from "@/lib/storage";
import { loadAnswers, clearAnswers, loadBookmarks } from "@/lib/progress";
import { useAuth } from "@/lib/auth";

interface SubStat {
  answered: number;
  correct: number;
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Record<string, SubStat>>({});
  const [overall, setOverall] = useState({ answered: 0, correct: 0 });
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const { userId } = useAuth();

  const load = async () => {
    const answers = await loadAnswers();
    const latest = latestByQuestion(answers);
    const s: Record<string, SubStat> = {};
    let answered = 0;
    let correct = 0;
    for (const rec of latest.values()) {
      const sub = rec.subtopic;
      if (!sub) continue;
      const cur = (s[sub] ??= { answered: 0, correct: 0 });
      cur.answered += 1;
      answered += 1;
      if (rec.correct) {
        cur.correct += 1;
        correct += 1;
      }
    }
    setStats(s);
    setOverall({ answered, correct });
    const bm = await loadBookmarks();
    setBookmarkCount(bm.size);
  };

  useEffect(() => {
    setMounted(true);
    load();
    // reload when the logged-in user changes (guest <-> account)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const overallPct =
    overall.answered > 0 ? Math.round((overall.correct / overall.answered) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* overall */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold">예상문제집 대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          현재 문제 은행: <b>{MANIFEST.total}</b>문항 · 실제 시험은 50문항(합격 70%)
        </p>
        {mounted && overall.answered > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                overallPct >= 70
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              최근 정답률 {overallPct}%
            </span>
            <span className="text-sm text-slate-500">
              풀어본 문항 {overall.answered} / {MANIFEST.total}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            아직 푼 문제가 없어요. 아래에서 시작해보세요.
          </p>
        )}
      </section>

      {/* actions */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/quiz?mode=mock"
          className="rounded-xl bg-rose-600 p-4 text-white shadow-sm transition-colors hover:bg-rose-700"
        >
          <div className="text-base font-semibold">모의고사</div>
          <div className="mt-1 text-xs text-rose-100">
            시험 비율대로 · 120분 타이머 · 안 푼 문항 우선
          </div>
        </Link>
        <Link
          href="/quiz?mode=practice"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
        >
          <div className="text-base font-semibold">📖 연습 모드</div>
          <div className="mt-1 text-xs text-slate-500">
            한 문제씩 정답·해설 열어보며 · 성적 미반영
          </div>
        </Link>
        <Link
          href="/quiz?mode=all"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
        >
          <div className="text-base font-semibold">전체 연습</div>
          <div className="mt-1 text-xs text-slate-500">타이머 없이 전 문항</div>
        </Link>
        <Link
          href="/quiz?mode=review"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
        >
          <div className="text-base font-semibold">오답 복습</div>
          <div className="mt-1 text-xs text-slate-500">최근에 틀린 문항만</div>
        </Link>
        <Link
          href="/quiz?mode=bookmark"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
        >
          <div className="text-base font-semibold">
            ⭐ 북마크 복습
            {mounted && bookmarkCount > 0 ? (
              <span className="ml-1 text-xs font-normal text-amber-600">
                ({bookmarkCount})
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            퀴즈 중 별표한 “다시 볼” 문항
          </div>
        </Link>
      </section>

      {/* per-topic practice + stats */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">주제별 연습 &amp; 진도</h2>
        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const specs = BLUEPRINT.filter((b) => b.category === cat);
            return (
              <div key={cat}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {cat}
                </div>
                <div className="space-y-1">
                  {specs.map((spec) => {
                    const available = countFor(spec.subtopic);
                    const st = stats[spec.subtopic] ?? { answered: 0, correct: 0 };
                    const pct =
                      st.answered > 0
                        ? Math.round((st.correct / st.answered) * 100)
                        : 0;
                    const disabled = available === 0;
                    return (
                      <div
                        key={spec.subtopic}
                        className="flex items-center gap-3 text-sm"
                      >
                        {disabled ? (
                          <span className="w-52 shrink-0 truncate text-slate-300">
                            {spec.subtopic}
                          </span>
                        ) : (
                          <Link
                            href={`/quiz?mode=topic&subtopic=${encodeURIComponent(
                              spec.subtopic
                            )}`}
                            className="w-52 shrink-0 truncate text-slate-700 underline decoration-slate-300 hover:decoration-rose-500"
                          >
                            {spec.subtopic}
                          </Link>
                        )}
                        <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                          {mounted && st.answered > 0 ? (
                            <div
                              className={`h-full ${
                                pct >= 70 ? "bg-emerald-500" : "bg-rose-400"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          ) : null}
                        </div>
                        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-400">
                          {mounted ? `${st.answered}/${available}문항` : `–/${available}`}
                          {mounted && st.answered > 0 ? ` · ${pct}%` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          숫자는 (풀어본 / 은행에 있는) 문항 수입니다. 회색은 아직 문제가 없는 주제예요.
        </p>
      </section>

      {mounted && overall.answered > 0 ? (
        <div className="text-center">
          <button
            onClick={async () => {
              if (confirm("모든 진도/오답 기록을 지울까요? (북마크는 유지됩니다)")) {
                await clearAnswers();
                load();
              }
            }}
            className="text-xs text-slate-400 underline"
          >
            진도 기록 초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}
