"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MANIFEST } from "@/lib/manifest";
import { BLUEPRINT, CATEGORY_ORDER } from "@/lib/blueprint";
import { ALL_QUESTIONS } from "@/lib/questions";
import { loadStatuses, clearStatuses, type QStatus } from "@/lib/progress";
import { useAuth } from "@/lib/auth";

interface SubStat {
  known: number;
  review: number;
  total: number;
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Record<string, SubStat>>({});
  const [overall, setOverall] = useState({ known: 0, review: 0, total: 0 });
  const { userId } = useAuth();

  const load = async () => {
    const statuses: Map<string, QStatus> = await loadStatuses();
    const s: Record<string, SubStat> = {};
    let known = 0;
    let review = 0;
    let total = 0;
    for (const q of ALL_QUESTIONS) {
      const cur = (s[q.subtopic] ??= { known: 0, review: 0, total: 0 });
      cur.total += 1;
      total += 1;
      const st = statuses.get(q.id);
      if (st === "known") {
        cur.known += 1;
        known += 1;
      } else if (st === "review") {
        cur.review += 1;
        review += 1;
      }
    }
    setStats(s);
    setOverall({ known, review, total });
  };

  useEffect(() => {
    setMounted(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const knownPct = overall.total > 0 ? Math.round((overall.known / overall.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* overall */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold">예상문제집 대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          현재 문제 은행: <b>{MANIFEST.total}</b>문항 · 실제 시험은 50문항(합격 70%)
        </p>
        {mounted ? (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                아는 문항 <b className="text-emerald-600">{overall.known}</b> / {overall.total}
              </span>
              <span className="text-slate-500">{knownPct}%</span>
            </div>
            <div className="mt-1 flex h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-emerald-500" style={{ width: `${knownPct}%` }} />
              <div
                className="h-full bg-amber-400"
                style={{ width: `${(overall.review / overall.total) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              🟢 알아요 {overall.known} · 🟡 몰라요 {overall.review} · ⚪ 미확인{" "}
              {overall.total - overall.known - overall.review}
            </p>
          </div>
        ) : null}
      </section>

      {/* actions */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/quiz?mode=mock"
          className="rounded-xl bg-rose-600 p-4 text-white shadow-sm transition-colors hover:bg-rose-700"
        >
          <div className="text-base font-semibold">모의고사</div>
          <div className="mt-1 text-xs text-rose-100">
            시험 비율대로 50문항 · 120분 · 아직 모르는 문항 우선
          </div>
        </Link>
        <Link
          href="/quiz?mode=review"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm transition-colors hover:bg-amber-100"
        >
          <div className="text-base font-semibold text-amber-800">
            🔖 다시 볼 목록
            {mounted && overall.review > 0 ? (
              <span className="ml-1 text-sm font-normal text-amber-600">
                {overall.review}개
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-amber-700">'몰라요'로 표시한 문항만 모아 연습</div>
        </Link>
        <Link
          href="/quiz?mode=practice"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
        >
          <div className="text-base font-semibold">📖 전체 연습</div>
          <div className="mt-1 text-xs text-slate-500">
            타이머 없이 · 해설 보며 · 아직 모르는 문항 우선
          </div>
        </Link>
      </section>

      {/* per-subtopic practice */}
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
                    const st = stats[spec.subtopic] ?? { known: 0, review: 0, total: 0 };
                    const disabled = st.total === 0;
                    const kp = st.total ? (st.known / st.total) * 100 : 0;
                    const rp = st.total ? (st.review / st.total) * 100 : 0;
                    return (
                      <div key={spec.subtopic} className="flex items-center gap-3 text-sm">
                        {disabled ? (
                          <span className="w-52 shrink-0 truncate text-slate-300">
                            {spec.subtopic}
                          </span>
                        ) : (
                          <Link
                            href={`/quiz?mode=practice&subtopic=${encodeURIComponent(
                              spec.subtopic
                            )}`}
                            title="연습 모드 (해설 보며, 성적 미반영)"
                            className="w-52 shrink-0 truncate text-slate-700 underline decoration-slate-300 hover:decoration-rose-500"
                          >
                            {spec.subtopic}
                          </Link>
                        )}
                        <div className="flex h-2 flex-1 overflow-hidden rounded bg-slate-100">
                          {mounted ? (
                            <>
                              <div className="h-full bg-emerald-500" style={{ width: `${kp}%` }} />
                              <div className="h-full bg-amber-400" style={{ width: `${rp}%` }} />
                            </>
                          ) : null}
                        </div>
                        <span className="w-28 shrink-0 text-right text-xs tabular-nums text-slate-400">
                          {mounted ? (
                            <>
                              <span className="text-emerald-600">{st.known}</span>/
                              <span className="text-amber-600">{st.review}</span>/{st.total}
                            </>
                          ) : (
                            `–/${st.total}`
                          )}
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
          숫자는 <span className="text-emerald-600">알아요</span>/
          <span className="text-amber-600">몰라요</span>/전체 입니다. 주제 이름을 누르면 연습 모드로 열려요.
        </p>
      </section>

      {mounted && overall.known + overall.review > 0 ? (
        <div className="text-center">
          <button
            onClick={async () => {
              if (!confirm("모든 '알아요/몰라요' 표시를 지울까요? (되돌릴 수 없어요)")) return;
              await clearStatuses();
              load();
            }}
            className="text-xs text-slate-400 underline hover:text-rose-500"
          >
            진도 초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}
